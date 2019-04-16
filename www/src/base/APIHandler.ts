import { Settings } from "../utils/Settings";
import { UserManager } from "./UserManager";
import { sleep } from "../utils/helpers";

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
}

export const APIHandler = new _APIHandler;
