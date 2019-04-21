import { askModal } from "./helpers.js";
import { loginModal } from "./interface_server.js";
/// Link to the server
export const Settings = new class {
    constructor() {
        this.server_text = document.getElementById('__settings_html_server');
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
    set api_url(value) {
        if (value) {
            this.url = value.replace(/\/$/, '') + "/";
            localStorage.setItem('creator_api_url', this.url);
            this.server_text.innerText = this.url;
        }
        else if (window.location.origin) {
            this.api_url = window.location.origin;
        }
    }
};
class _User {
    constructor() {
        this.btn = document.getElementById('__login_html_button');
        this.text = document.getElementById('__login_html_text');
        if (localStorage.getItem('creator_username') && localStorage.getItem('creator_token')) {
            this.name = localStorage.getItem('creator_username');
            this.token = localStorage.getItem('creator_token');
        }
        else {
            // Déclenche le setter
            this.name = undefined;
        }
    }
    get name() {
        return this._name;
    }
    set name(v) {
        this._name = v;
        localStorage.setItem('creator_username', v);
        if (v) {
            this.btn.innerText = "Logout";
            this.btn.onclick = () => {
                askModal("Log out ?", "You will be unlogged.").then(() => { this.logout(); }).catch(() => { });
            };
            this.text.innerText = "Logged as " + this.name + " · ";
        }
        else {
            this.btn.innerText = "Login";
            this.text.innerText = "";
            this.btn.onclick = loginModal;
            localStorage.removeItem('creator_username');
        }
    }
    get token() {
        return this._token;
    }
    set token(v) {
        this._token = v;
        localStorage.setItem('creator_token', v);
        if (!v) {
            localStorage.removeItem('creator_token');
        }
    }
    get logged() {
        return this.name && this.token;
    }
    async login(username, password) {
        const resp = await this.req("users/login.json", "POST", { username, password }, false)
            .then(r => r.ok ? r.json() : new Error(r));
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
    req(url, method = "GET", params = {}, signed = true, headers = {}) {
        method = method.toUpperCase();
        const req_p = {};
        url = Settings.api_url + url;
        if (method === "GET" || method === "DELETE") {
            if (url.includes('?')) {
                let url_params;
                [url, url_params] = url.split('?', 2);
                for (const [key, value] of url_params.split('&').map(keyval => keyval.split('=', 2))) {
                    params[key] = value;
                }
            }
            if (Object.keys(params).length) {
                url += "?";
                for (const element in params) {
                    url += encodeURIComponent(element) + "&" + encodeURIComponent(params[element]);
                }
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
