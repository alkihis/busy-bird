import { Settings } from "../utils/Settings";
import { UserManager } from "./UserManager";
import { sleep } from "../utils/helpers";
import { FILE_HELPER, MAX_TIMEOUT_FOR_METADATA, MAX_LENGTH_CHUNK, MAX_CONCURRENT_PARTS } from "../main";
import { FileHelperReadMode } from "./FileHelper";

export enum APIResp {
    JSON, text, blob
};

interface ErrorObject {
    error_code: number;
    message: string;
}

const AUTO_CHUNK_MODE_THRESHOLD = 1024 * 1024; // Envoi automatique en chunk à partir d'un 1 Mo

class _APIHandler {
    protected controllers = new Map<Promise<any>, AbortController>();

    request(url: string, params: {[name: string]: any} = {}, method = "GET", resp_type = APIResp.JSON, signed = true, timeout = 120000) : Promise<any> {
        // Construction des paramètres
        method = method.toUpperCase();

        const req_p: RequestInit = {};

        if (method === "GET" || method === "DELETE") {
            if (url.includes('?')) {
                let url_params: string;
                [url, url_params] = url.split('?', 2);

                for (const [key, value] of url_params.split('&').map(keyval => keyval.split('=', 2))) {
                    params[key] = value;
                }
            }

            if (Object.keys(params).length) {
                url += "?";
                const elements = [];
                for (const element in params) {
                    elements.push(encodeURIComponent(element) + "=" + encodeURIComponent(params[element]));
                }
                url += elements.join("&");
            }
        } 
        else {
            // With a body
            const fd = new FormData;
            for (const element in params) {
                fd.append(element, params[element]);
            }

            req_p.body = fd;
        }

        req_p.method = method;

        return this.req(url, req_p, resp_type, signed, timeout);
    }

    req(url: string, options: RequestInit = {}, resp_type = APIResp.JSON, signed = true, timeout = 120000) : Promise<any> {
        if (!Settings.api_url) {
            const e = { error_code: -1, message: "API URL is not set" };

            switch (resp_type) {
                case APIResp.JSON:
                    return Promise.reject(e);
                case APIResp.blob:
                    return Promise.reject(new Blob([JSON.stringify(e)]));
                case APIResp.text:
                    return Promise.reject(JSON.stringify(e));
            }
            return Promise.reject("No API URL is set");
        }

        let controller: AbortController;

        if ("AbortController" in window) {
            controller = new AbortController();
        }
        
        let signal = controller ? controller.signal : undefined;

        url = Settings.api_url + url;

        options.signal = signal;
        
        if (signed) {
            options.headers = new Headers({"Authorization": "Bearer " + UserManager.token});
        }

        const resp = Promise.race([
            fetch(url, options),
            sleep(timeout).then(() => { if (controller) controller.abort(); return Promise.reject(new Error("Timeout")); })
        ]) as Promise<Response>;

        let resp_promise: Promise<any>;

        if (resp_type === APIResp.JSON) {
            resp_promise = resp.then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d)));
        }
        else if (resp_type === APIResp.blob) {
            resp_promise = resp.then(r => r.ok ? r.blob() : r.blob().then(d => Promise.reject(d)));
        }
        else {
            resp_promise = resp.then(r => r.ok ? r.text() : r.text().then(d => Promise.reject(d)));
        }

        if (controller) {
            this.controllers.set(resp_promise, controller);
            setTimeout(() => { this.controllers.delete(resp_promise) }, timeout);
        }

        return resp_promise;
    }

    getControl(promise: Promise<any>) : AbortController {
        if (this.controllers.has(promise)) {
            return this.controllers.get(promise);
        }

        return undefined;
    }

    clear() : void {
        this.controllers.clear();
    }

    /**
     * Affiche un message d'erreur relatif à une erreur renvoyée par l'API.
     * Un message additionnel peut être joint (il sera affiché au début de l'erreur).
     * 
     * @param error Objet représentant l'erreur
     * @param additionnal_message Message à afficher (facultatif)
     */
    errFormat(error: ErrorObject, additionnal_message?: string) : string {
        return (additionnal_message ? `
            <p class="flow-text no-margin-bottom">${additionnal_message}</p>
        ` : '') + `
            <p class="flow-text error-message ${additionnal_message ? "no-margin-top" : ""}">${this.errMessage(error.error_code)}.</p>
            <p class="error-details grey-text no-margin-top">
                <span class="bold">[${error.error_code}]</span> <span class="italic">${error.message}</span>
            </p>
        `;
    }

    errMessage(error_code: number) : string {
        switch (error_code) {
            case -1: 
                return "API URL is not set";
            case 1:
            case 3:
                return "Internal server error";
            case 2:
                return "Page not found. Check if server version is compatible with this version of the application";
            case 4:
            case 5:
                return "Server and application might not be compatible. Check for updates";
            case 6:
                return "Specified administrator password is invalid";
            case 7:
                return "One of the submitted field must be alphanumerical only";
            case 8:
                return "Server can't log you in. Check your credentials";
            case 9:
                return "You try to submit a file related to a entry that does not exists";
            case 10:
            case 16:
                return "User does not exists";
            case 11:
                return "Invalid credentials";
            case 12:
                return "User already exists";
            case 13:
                return "Password can't be empty";
            case 14:
                return "Submitted entry is unwell-formed";
            case 15:
                return "Stored app token and server token mismatched";
            case 17:
                return "You're not allowed to do that";
            default:
                return "Unknown error";
        }
    }

    protected async sendFileBasic(file: File, form_id: string, form_type: string, running_fetchs: AbortController[]) {
        const basename = file.name;

        let base64: string;
        try {
            base64 = await FILE_HELPER.readFileAs(file, FileHelperReadMode.url) as string;
        } catch (e) {
            // Le fichier n'existe pas en local. On passe.
            return;
        }

        // On récupère la partie base64 qui nous intéresse
        base64 = base64.split(',')[1];

        const req = this.request(
            "forms/metadata_send.json", 
            { id: form_id, type: form_type, filename: basename, data: base64 },
            "POST", 
            APIResp.text, 
            true, 
            MAX_TIMEOUT_FOR_METADATA
        );

        // Ajoute le controlleur abort dans la liste
        if (this.getControl(req))
            running_fetchs.push(APIHandler.getControl(req));

        await req; // On attend que le fichier s'envoie

        // Envoi réussi si ce bout de code est atteint ! On passe au fichier suivant
    }

    protected async sendFileChunked(file: File, form_id: string, form_type: string, running_fetchs: AbortController[]) {
        const basename = file.name;

        // On a besoin de passer par des chunks, on va plutôt utiliser l'objet File personnellement
        const file_entry = file;

        const file_size = file_entry.size;
        let offset = 0;

        function nextChunk(file: File, size = MAX_LENGTH_CHUNK * 1024) {
            return new Promise((resolve, reject) => {
                const r = new FileReader;
                const current_chunk = file.slice(offset, offset + size);

                function onload() {
                    offset += size;

                    // On récupère la partie base64 qui nous intéresse
                    const base64 = (r.result as string).split(',')[1];
                    resolve(base64);
                }

                r.onload = onload;
                r.onerror = reject;
                r.readAsDataURL(current_chunk);
            }) as Promise<string>;
        }

        //// COMMAND INIT
        // On construit le formdata à envoyer        
        const req = this.request(
            "forms/metadata_chunk_send.json", 
            { id: form_id, type: form_type, filename: basename, size: file_size, command: "INIT" },
            "POST",
            APIResp.JSON, 
            true, 
            MAX_TIMEOUT_FOR_METADATA
        );

        // Ajoute le controlleur abort dans la liste
        if (this.getControl(req))
            running_fetchs.push(this.getControl(req));

        const response = await req; // On attend que la requête renvoie quelque chose

        let media_id: string = response.media_id_str;

        let segment_index = 0;

        //// COMMAND APPEND
        while (offset < file_size) {
            const promises: Promise<any>[] = [];

            for (let seg = 0; seg < MAX_CONCURRENT_PARTS && offset < file_size; seg++) {
                // On construit le formdata à envoyer               
                const req = this.request(
                    "forms/metadata_chunk_send.json", 
                    { media_id, segment_index, data: await nextChunk(file_entry), command: "APPEND" },
                    "POST", 
                    APIResp.text, 
                    true, 
                    MAX_TIMEOUT_FOR_METADATA
                );

                // Ajoute le controlleur abort dans la liste
                if (this.getControl(req))
                    running_fetchs.push(this.getControl(req));

                promises.push(req);

                segment_index++;
            }

            await Promise.all(promises); // On attend que la(les) requête(s) soit(soient) finie(s)
        }

        //// COMMAND FINALIZE
        // On construit le formdata à envoyer
        const req2 = this.request(
            "forms/metadata_chunk_send.json", 
            { media_id, command: "FINALIZE" },
            "POST", 
            APIResp.text, 
            true, 
            MAX_TIMEOUT_FOR_METADATA
        );

        // Ajoute le controlleur abort dans la liste
        if (this.getControl(req2))
            running_fetchs.push(this.getControl(req2));

        await req2; // On attend que la requête renvoie quelque chose
    }

    async sendFile(path: string, form_id: string, form_type: string, mode: string = "basic", running_fetchs: AbortController[] = []) {
        const file = await FILE_HELPER.getFile(path);

        if (mode === "chunked" || (mode === "auto" && file.size > AUTO_CHUNK_MODE_THRESHOLD)) {
            return this.sendFileChunked(file, form_id, form_type, running_fetchs);
        }
        else {
            return this.sendFileBasic(file, form_id, form_type, running_fetchs);
        }
    }
}

export const APIHandler = new _APIHandler;
