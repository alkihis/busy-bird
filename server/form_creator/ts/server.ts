import { askModal } from "./helpers.js";
import { loginModal } from "./interface_server.js";

/// Link to the server

export const Settings = new class {
    protected url: string;
    protected server_text = document.getElementById('__settings_html_server') as HTMLElement;

    constructor() {
        if (localStorage.getItem("creator_api_url")) {
            this.api_url = localStorage.getItem('creator_api_url');
        }
        else {
            this.api_url = window.location.origin;
        }
    }

    get api_url() {
        return this.url;
    }

    set api_url(value: string) {
        if (value) {
            this.url = value.replace(/\/$/, '') + "/";
            localStorage.setItem('creator_api_url', this.url);
            this.server_text.innerText = this.url;
        }
        else if (window.location.origin) {
            this.api_url = window.location.origin;
        }
    }
}

class _User {
    protected _name: string;
    protected _token: string;
    protected btn: HTMLElement = (document.getElementById('__login_html_button') as HTMLElement);
    protected text: HTMLElement = (document.getElementById('__login_html_text') as HTMLElement);

    constructor() {
        if (localStorage.getItem('creator_username') && localStorage.getItem('creator_token')) {
            this.name = localStorage.getItem('creator_username');
            this.token = localStorage.getItem('creator_token');
        } 
        else {
            // Déclenche le setter
            this.name = undefined;
        }
    }

    protected get name() {
        return this._name;
    }

    protected set name(v: string) {
        this._name = v;

        localStorage.setItem('creator_username', v);

        if (v) {
            this.btn.innerText = "Logout";
            this.btn.onclick = () => {
                askModal("Log out ?", "You will be unlogged.").then(() => { this.logout(); }).catch(() => {});
            }
            this.text.innerText = "Logged as " + this.name + " · ";
        }
        else {
            this.btn.innerText = "Login";
            this.text.innerText = "";
            this.btn.onclick = loginModal;
            localStorage.removeItem('creator_username');
        }
    }

    protected get token() {
        return this._token;
    }

    protected set token(v: string) {
        this._token = v;

        localStorage.setItem('creator_token', v);

        if (!v) {
            localStorage.removeItem('creator_token');
        }
    }

    get logged() {
        return this.name && this.token;
    }

    async login(username: string, password: string) {
        const resp = await this.req("users/login.json", "POST", { username, password }, false)
            .then(r => r.ok ? r.json() : new Error(r as any));

        if (resp instanceof Error) {
            throw resp;
        }

        if (resp.access_token) {
            this.token = resp.access_token;
            this.name = username;
        }
        else {
            throw new Error;
        }
    }

    logout() {
        this.token = undefined;
        this.name = undefined;
    }

    req(url: string, method = "GET", params: {[element: string]: any} = {}, signed = true, headers = {}) : Promise<Response> {
        method = method.toUpperCase();

        const req_p: RequestInit = {};

        url = Settings.api_url + url;

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
        // Nécessaire pour faire des requêtes sur des serveurs externes
        // req_p.mode = "no-cors";

        if (signed) {
            req_p.headers = new Headers(Object.assign(headers, { "Authorization": "Bearer " + this.token }));
        }

        return fetch(url, req_p);
    }
}

export const User = new _User;
