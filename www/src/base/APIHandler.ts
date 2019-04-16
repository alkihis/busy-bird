import { Settings } from "../utils/Settings";
import { UserManager } from "./UserManager";
import { sleep, showToast } from "../utils/helpers";
import { FILE_HELPER, MAX_TIMEOUT_FOR_METADATA } from "../main";
import { FileHelperReadMode } from "./FileHelper";

export enum APIResp {
    JSON, text
};

interface ErrorObject {
    error_code: number;
    message: string;
}

class _APIHandler {
    protected controllers = new Map<Promise<any>, AbortController>();

    req(url: string, options: RequestInit = {}, resp_type = APIResp.JSON, signed = true, timeout = 120000) : Promise<any> {
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

    protected async sendFileBasic(file: string, form_id: string, form_type: string, running_fetchs: AbortController[]) {
        const basename = file.split('/').pop();

        let base64: string;
        try {
            base64 = await FILE_HELPER.read(file, FileHelperReadMode.url) as string;
        } catch (e) {
            // Le fichier n'existe pas en local. On passe.
            return;
        }

        // On récupère la partie base64 qui nous intéresse
        base64 = base64.split(',')[1];

        // On construit le formdata à envoyer
        const md = new FormData();
        md.append("id", form_id);
        md.append("type", form_type);
        md.append("filename", basename);
        md.append("data", base64);
        
        const req = APIHandler.req(
            "forms/metadata_send.json", 
            { method: "POST", body: md }, 
            APIResp.JSON, 
            true, 
            MAX_TIMEOUT_FOR_METADATA
        );

        // Ajoute le controlleur abort dans la liste
        if (this.getControl(req))
            running_fetchs.push(APIHandler.getControl(req));

        await req; // On attend que le fichier s'envoie

        // Envoi réussi si ce bout de code est atteint ! On passe au fichier suivant
    }

    protected async sendFileChunked(file: string, form_id: string, form_type: string, running_fetchs: AbortController[]) {
        const basename = file.split('/').pop();

        // On a besoin de passer par des chunks, on va plutôt utiliser fileReader personnellement
        let file_entry: File; 

        try {
            file_entry = await FILE_HELPER.read(file, FileHelperReadMode.fileobj) as File;
        } catch (e) {
            // Le fichier n'existe pas en local. On passe.
            return;
        }

        const file_size = file_entry.size;
        let offset = 0;

        function nextChunk(file: File, size = 1024 * 1024) {
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
        const md = new FormData();
        md.append("id", form_id);
        md.append("type", form_type);
        md.append("filename", basename);
        md.append("size", file_size.toString());
        md.append("command", "INIT");
        
        const req = this.req(
            "forms/metadata_chunk_send.json", 
            { method: "POST", body: md }, 
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
        while (offset < file_size) {
            //// COMMAND APPEND
            // On construit le formdata à envoyer
            const md = new FormData();
            md.append("media_id", media_id);
            md.append("segment_index", segment_index.toString());
            md.append("data", await nextChunk(file_entry));
            md.append("command", "APPEND");
            
            const req = this.req(
                "forms/metadata_chunk_send.json", 
                { method: "POST", body: md }, 
                APIResp.JSON, 
                true, 
                MAX_TIMEOUT_FOR_METADATA
            );

            // Ajoute le controlleur abort dans la liste
            if (this.getControl(req))
                running_fetchs.push(this.getControl(req));

            await req; // On attend que la requête soit finie

            segment_index++;
        }

        //// COMMAND FINALIZE
        // On construit le formdata à envoyer
        const md_fini = new FormData();
        md_fini.append("media_id", media_id);
        md_fini.append("command", "FINALIZE");
        
        const req2 = this.req(
            "forms/metadata_chunk_send.json", 
            { method: "POST", body: md }, 
            APIResp.JSON, 
            true, 
            MAX_TIMEOUT_FOR_METADATA
        );

        // Ajoute le controlleur abort dans la liste
        if (this.getControl(req2))
            running_fetchs.push(this.getControl(req2));

        await req2; // On attend que la requête renvoie quelque chose
    }

    sendFile(path: string, form_id: string, form_type: string, mode: string = "basic", running_fetchs: AbortController[] = []) {
        if (mode === "chunked") {
            return this.sendFileChunked(path, form_id, form_type, running_fetchs);
        }
        else {
            return this.sendFileBasic(path, form_id, form_type, running_fetchs);
        }
    }
}

export const APIHandler = new _APIHandler;
