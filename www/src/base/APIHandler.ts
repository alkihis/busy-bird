import { Settings } from "../utils/Settings";
import fetch from '../utils/fetch_timeout';
import { UserManager } from "./UserManager";

export enum APIResp {
    JSON, text
};

class _APIHandler {
    req(url: string, options: RequestInit = {}, resp_type = APIResp.JSON, signed = true, timeout = 120000) : [Promise<any>, AbortController] {
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

        const resp = fetch(url, options, timeout);

        if (resp_type === APIResp.JSON) {
            return [resp.then(r => r.json()), controller];
        }
        else {
            return [resp.then(r => r.text()), controller];
        }
    }
}

export const APIHandler = new _APIHandler;
