"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// Lance main.ts
require(['main']);
define("utils/Settings", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Représente les paramètres globaux de l'application.
     * Ils sont stockés dans le localStorage.
     */
    class AppSettings {
        constructor() {
            this.initDefaults();
            if (localStorage.getItem('_settings_sync_freq')) {
                this._sync_freq = Number(localStorage.getItem('_settings_sync_freq'));
            }
            if (localStorage.getItem('_settings_sync_bg')) {
                this._sync_bg = localStorage.getItem('_settings_sync_bg') === 'true';
            }
            if (localStorage.getItem('_settings_api_url')) {
                this._api_url = localStorage.getItem('_settings_api_url');
            }
            if (localStorage.getItem('_settings_voice_lang')) {
                this._voice_lang = localStorage.getItem('_settings_voice_lang');
                ;
            }
        }
        initDefaults() {
            this._sync_bg = true;
            this._sync_freq = 30;
            this._api_url = "https://projet.alkihis.fr/";
            this._voice_lang = "fr-FR";
        }
        set sync_bg(val) {
            this._sync_bg = val;
            localStorage.setItem('_settings_sync_bg', String(val));
        }
        get sync_bg() {
            return this._sync_bg;
        }
        set api_url(val) {
            if (!validURL(val)) {
                throw new Error("Must be an url");
            }
            val = val.replace(/\/$/, '') + '/';
            this._api_url = val;
            localStorage.setItem('_settings_api_url', val);
        }
        get voice_lang() {
            return this._voice_lang;
        }
        set voice_lang(lang) {
            if (lang in lang_possibilities) {
                this._voice_lang = lang_possibilities[lang];
                localStorage.setItem('_settings_voice_lang', lang_possibilities[lang]);
            }
        }
        get api_url() {
            return this._api_url;
        }
        set sync_freq(val) {
            this._sync_freq = val;
            localStorage.setItem('_settings_sync_freq', String(val));
        }
        get sync_freq() {
            return this._sync_freq;
        }
        /**
         * Remet à zéro les paramètres
         */
        reset() {
            this.initDefaults();
            this.sync_bg = this._sync_bg;
            this.sync_freq = this._sync_freq;
            this.api_url = this._api_url;
            this.voice_lang = this._voice_lang;
        }
    }
    const lang_possibilities = {
        "Français": "fr-FR",
        "English (US)": "en-US",
        "English (UK)": "en-GB",
        "Français (canadien)": "fr-CA",
        "Français (belge)": "fr-BE",
        "Français (suisse)": "fr-CH",
        "Deutsch": "de-DE",
        "Japanese": "ja-JP",
        "Italiano": "it-IT",
        "Espanõl": "es-ES"
    };
    /// INFORMAL
    /* Supported languages (à remplir l'objet si dessus si vous avez plus la foi que moi)
    ["nl-NL","vi-VN","ca-ES","es-CL","ko-KR",
      "ro-RO","en-PH","en-SG","en-IN","en-NZ","it-CH","da-DK",
      "de-AT","pt-BR","sv-SE","ar-SA","hu-HU","fi-FI","tr-TR","nb-NO","en-ID","en-SA",
      "pl-PL","id-ID","ms-MY",
      "el-GR","cs-CZ","hr-HR","en-AE","he-IL","ru-RU","de-CH","en-AU","nl-BE",
      "th-TH","pt-PT","sk-SK","en-IE","es-CO","uk-UA","es-US"];
    */
    function getAvailableLanguages() {
        return Object.keys(lang_possibilities);
    }
    exports.getAvailableLanguages = getAvailableLanguages;
    function validURL(str) {
        var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
        return !!pattern.test(str);
    }
    exports.Settings = new AppSettings;
    /**
     * Permet de sauvegarder en arrière-plan.
     * Cette classe ne doit pas être utilisée seule. SyncManager s'en occupe.
     */
    class BgSyncObj {
        constructor() {
            //// credit to https://github.com/transistorsoft/cordova-plugin-background-fetch
            this.background_sync = null;
            this.fetchCb = null;
            this.failCb = null;
        }
        isInit() {
            return this.background_sync !== null;
        }
        /**
         * Initialise le module de background sync. Cette fonction ne doit être appelée qu'une seule fois !
         * @param fetchCb Fonction à appeler lors du fetch
         * @param failCb Fonction à appeler si échec
         * @param interval Intervalle entre deux synchronisations (en minutes)
         */
        init(fetchCb, failCb, interval = exports.Settings.sync_freq) {
            this.background_sync = ("BackgroundFetch" in window) ? window["BackgroundFetch"] : null;
            return this.initBgSync(fetchCb, failCb, interval);
        }
        /**
         * Modifie le module de background sync en cours d'exécution
         * @param fetchCb Fonction à appeler lors du fetch
         * @param failCb Fonction à appeler si échec
         * @param interval Intervalle entre deux synchronisations (en minutes)
         */
        initBgSync(fetchCb, failCb, interval = exports.Settings.sync_freq) {
            if (this.background_sync) {
                this.stop();
                console.log("Starting sync with interval: " + interval);
                this.failCb = failCb;
                this.fetchCb = fetchCb;
                this.background_sync.configure(fetchCb, () => {
                    // Désinitialise l'objet
                    exports.Settings.sync_bg = false;
                    this.background_sync = null;
                    failCb();
                }, {
                    minimumFetchInterval: interval,
                    stopOnTerminate: false // <-- Android only
                });
                return true;
            }
            else {
                return false;
            }
        }
        finish() {
            if (this.background_sync) {
                this.background_sync.finish();
            }
        }
        /**
         * Change la fréquence de synchronisation
         * @param interval Intervalle entre deux synchronisations (en minutes)
         */
        changeBgSyncInterval(interval) {
            if (this.background_sync) {
                return this.initBgSync(this.fetchCb, this.failCb, interval);
            }
            return false;
        }
        start() {
            if (this.background_sync) {
                this.background_sync.start(() => {
                    console.log("Starting fetch");
                }, () => {
                    console.log("Failed to start fetch");
                });
            }
        }
        stop() {
            try {
                if (this.background_sync) {
                    this.background_sync.stop(() => {
                        console.log("Stopping sync");
                    }, () => {
                        console.log("Failed to stop sync");
                    });
                }
            }
            catch (e) { /** Ne fait rien si échoue à stopper (ce n'était pas lancé) */ }
        }
    }
    exports.BackgroundSync = new BgSyncObj;
});
define("base/UserManager", ["require", "exports", "utils/helpers", "base/FormSchema", "utils/Settings"], function (require, exports, helpers_1, FormSchema_1, Settings_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Permet de gérer l'utilisateur connecté, ou la création d'un nouvel utilisateur.
     * Cette classe doit être instanciée qu'une seule fois.
     */
    class _UserManager {
        /**
         * Initialise l'utilisateur connecté depuis les données sauvegardées.
         */
        constructor() {
            this._username = null;
            this._token = null;
            const usr = localStorage.getItem('__username_manager');
            const tkn = localStorage.getItem('__token_manager');
            if (usr && tkn) {
                this._username = usr;
                this._token = tkn;
            }
        }
        get username() {
            return this._username;
        }
        get token() {
            return this._token;
        }
        /**
         * Connecte un utilisateur par son nom d'utilisateur et mot de passe.
         * Renvoie une promesse résolue si connexion réussie, rompue si échec.
         * @param username
         * @param password
         */
        login(username, password) {
            return new Promise((resolve, reject) => {
                let data = new FormData();
                data.append("username", username);
                data.append('password', password);
                fetch(Settings_1.Settings.api_url + "users/login.json", { body: data, method: 'POST' })
                    .then((response) => {
                    return response.json();
                })
                    .then((json) => {
                    if (json.error_code)
                        throw json.error_code;
                    this.logSomeone(username, json.access_token);
                    // On sauvegarde les schémas envoyés
                    if (Array.isArray(json.subscriptions)) {
                        json.subscriptions = {};
                    }
                    FormSchema_1.Schemas.schemas = json.subscriptions;
                    resolve();
                })
                    .catch((error) => {
                    reject(error);
                });
            });
        }
        /**
         * Connecte un utilisateur en interne sans faire d'appel à l'API.
         * @param username
         * @param token
         */
        logSomeone(username, token) {
            this._token = token;
            this._username = username;
            localStorage.setItem('__username_manager', username);
            localStorage.setItem('__token_manager', token);
        }
        /**
         * Déconnecte l'utilisateur connecté dans l'objet.
         */
        unlog() {
            localStorage.removeItem('__username_manager');
            localStorage.removeItem('__token_manager');
            this._username = null;
            this._token = null;
        }
        get logged() {
            return this._username !== null;
        }
        /**
         * Demande à créer un nouvel utilisateur au serveur.
         * @param username
         * @param password
         * @param admin_password
         */
        createUser(username, password, admin_password) {
            const data = new FormData();
            data.append("username", username);
            data.append("password", password);
            data.append("admin_password", admin_password);
            return new Promise((resolve, reject) => {
                fetch(Settings_1.Settings.api_url + "users/create.json", {
                    method: "POST",
                    body: data
                }).then((response) => {
                    return response.json();
                }).then((json) => {
                    if (json.error_code)
                        throw json.error_code;
                    this.logSomeone(username, json.access_token);
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            });
        }
    }
    exports.UserManager = new _UserManager;
    function createNewUser() {
        const modal = helpers_1.getModal();
        const instance = helpers_1.initModal({ dismissible: false });
        modal.classList.add('modal-fixed-footer');
        modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">Create new user</h5>
        <form class="row" id="__modal_form_new_user">
            <div class="row col s12 input-field">
                <label for="__user_new">Username</label>
                <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw">Password</label>
                <input type="password" class="validate" required id="__user_psw" name="user_psw">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_r">Password (confirmation)</label>
                <input type="password" class="validate" required id="__user_psw_r" name="user_psw_r">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_a">Administrator password</label>
                <input type="password" class="validate" required id="__user_psw_a" name="user_psw_a">
            </div>
        </form>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat red-text left modal-close">Cancel</a>
        <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Create an user</a>
        <div class="clearb"></div>
    </div>
    `;
        instance.open();
        const orig_psw = document.getElementById('__user_psw');
        document.getElementById('__user_psw_r').onchange = function () {
            const e = this;
            if (e.value !== orig_psw.value) {
                e.classList.add('invalid');
                e.classList.remove('valid');
            }
            else {
                e.classList.add('valid');
                e.classList.remove('invalid');
            }
        };
        let modal_save = null;
        document.getElementById('__modal_create_new_user').onclick = function () {
            const form = document.getElementById('__modal_form_new_user');
            const name = form.user_new.value.trim();
            const psw = form.user_psw.value.trim();
            const psw_r = form.user_psw_r.value.trim();
            const psw_a = form.user_psw_a.value.trim();
            if (!name) {
                helpers_1.showToast("Name cannot be empty.");
                return;
            }
            if (!psw) {
                helpers_1.showToast("Password cannot be empty.");
                return;
            }
            if (psw !== psw_r) {
                helpers_1.showToast("Password and confirmation should be equal.");
                return;
            }
            if (!psw_a) {
                helpers_1.showToast("Administrator password is needed.");
                return;
            }
            modal_save = document.createDocumentFragment();
            let child;
            while (child = modal.firstChild) {
                modal_save.appendChild(child);
            }
            modal.innerHTML = helpers_1.getModalPreloader("Creating user...");
            exports.UserManager.createUser(name, psw, psw_a)
                .then(function () {
                helpers_1.showToast("User has been created successfully.");
                instance.close();
            }).catch(function (error) {
                console.log(error);
                if (typeof error === 'number') {
                    if (error === 6) {
                        helpers_1.showToast("Administrator password is invalid.");
                    }
                    else if (error === 12) {
                        helpers_1.showToast("This user already exists.");
                    }
                    else {
                        helpers_1.showToast("An unknown error occurred.");
                    }
                }
                modal.innerHTML = "";
                let e;
                while (e = modal_save.firstChild) {
                    modal.appendChild(e);
                }
            });
        };
    }
    exports.createNewUser = createNewUser;
    function loginUser() {
        return new Promise(function (resolve, reject) {
            const modal = helpers_1.getModal();
            const instance = helpers_1.initModal({ dismissible: false });
            modal.innerHTML = `
        <div class="modal-content">
            <h5 class="no-margin-top">Login</h5>
            <form class="row" id="__modal_form_new_user">
                <div class="row col s12 input-field">
                    <label for="__user_new">Username</label>
                    <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
                </div>
                <div class="row col s12 input-field">
                    <label for="__user_psw">Password</label>
                    <input type="password" autocomplete="off" class="validate" required id="__user_psw" name="user_psw">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <a href="#!" id="__modal_cancel_user" class="btn-flat red-text left">Cancel</a>
            <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Login</a>
            <div class="clearb"></div>
        </div>
        `;
            instance.open();
            let modal_save = null;
            document.getElementById('__modal_cancel_user').onclick = function () {
                instance.close();
                reject();
            };
            document.getElementById('__modal_create_new_user').onclick = function () {
                const form = document.getElementById('__modal_form_new_user');
                const name = form.user_new.value.trim();
                const psw = form.user_psw.value.trim();
                if (!name) {
                    helpers_1.showToast("Name cannot be empty.");
                    return;
                }
                if (!psw) {
                    helpers_1.showToast("Password cannot be empty.");
                    return;
                }
                modal_save = document.createDocumentFragment();
                let child;
                while (child = modal.firstChild) {
                    modal_save.appendChild(child);
                }
                modal.innerHTML = helpers_1.getModalPreloader("Login in...");
                exports.UserManager.login(name, psw)
                    .then(function () {
                    helpers_1.showToast("You have been logged in successfully.");
                    instance.close();
                    // RESOLUTION DE LA PROMESSE
                    resolve();
                }).catch(function (error) {
                    if (typeof error === 'number') {
                        if (error === 10) {
                            helpers_1.showToast("This user does not exists.");
                        }
                        else if (error === 11) {
                            helpers_1.showToast("Password is invalid.");
                        }
                        else {
                            helpers_1.showToast("An unknown error occurred.");
                        }
                    }
                    else {
                        helpers_1.showToast(error.message || JSON.stringify(error));
                    }
                    modal.innerHTML = "";
                    let e;
                    while (e = modal_save.firstChild) {
                        modal.appendChild(e);
                    }
                });
            };
        });
    }
    exports.loginUser = loginUser;
});
define("utils/fetch_timeout", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function default_1(url, options, timeout = 10000) {
        let controller;
        if ("AbortController" in window) {
            controller = new AbortController();
        }
        let signal = controller ? controller.signal : undefined;
        return Promise.race([
            fetch(url, Object.assign({ signal }, options)),
            new Promise((_, reject) => setTimeout(() => {
                if (controller)
                    controller.abort();
                reject(new Error('timeout'));
            }, timeout))
        ]);
    }
    exports.default = default_1;
});
define("base/FileHelper", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var FileHelperReadMode;
    (function (FileHelperReadMode) {
        FileHelperReadMode[FileHelperReadMode["text"] = 0] = "text";
        FileHelperReadMode[FileHelperReadMode["array"] = 1] = "array";
        FileHelperReadMode[FileHelperReadMode["url"] = 2] = "url";
        FileHelperReadMode[FileHelperReadMode["binarystr"] = 3] = "binarystr";
        FileHelperReadMode[FileHelperReadMode["json"] = 4] = "json";
        FileHelperReadMode[FileHelperReadMode["internalURL"] = 5] = "internalURL";
        FileHelperReadMode[FileHelperReadMode["fileobj"] = 6] = "fileobj";
    })(FileHelperReadMode = exports.FileHelperReadMode || (exports.FileHelperReadMode = {}));
    /**
     * Normalize a path. Credit to [markmarijnissen](https://github.com/markmarijnissen/cordova-promise-fs).
     * @param str
     */
    function normalize(str) {
        str = str || '';
        if (str[0] === '/')
            str = str.substr(1);
        let tokens = str.split('/'), last = tokens[0];
        // check tokens for instances of .. and .
        for (let i = 1; i < tokens.length; i++) {
            last = tokens[i];
            if (tokens[i] === '..') {
                // remove the .. and the previous token
                tokens.splice(i - 1, 2);
                // rewind 'cursor' 2 tokens
                i = i - 2;
            }
            else if (tokens[i] === '.') {
                // remove the .. and the previous token
                tokens.splice(i, 1);
                // rewind 'cursor' 1 token
                i--;
            }
        }
        str = tokens.join('/');
        if (str === './') {
            str = '';
        }
        else if (last && last.indexOf('.') < 0 && str[str.length - 1] != '/') {
            str += '/';
        }
        return str;
    }
    /**
     * Glob to regex function.
     * Credit to [Nick Fitzgerald](https://github.com/fitzgen/glob-to-regexp).
     * NOT used as package to limit dependencies
     *
     * COPYRIGHT NOTICE
     * see above function
     *
     * @param glob
     * @param flags
     */
    function globToRegex(glob, flags = "") {
        /*
        *  Copyright notice for globToRegex
        *   All rights reserved.
        *
        *   Redistribution and use in source and binary forms, with or without modification,
        *   are permitted provided that the following conditions are met:
        *
        *   Redistributions of source code must retain the above copyright notice,
        *   this list of conditions and the following disclaimer.
        *
        *   Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
        *   the following disclaimer in the documentation and/or other materials provided with the distribution.
        *
        *   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
        *   AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
        *   THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
        *   IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
        *   INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
        *   (
        *       INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
        *       LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION
        *   )
        *   HOWEVER CAUSED
        *   AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
        *   (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
        *   EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
        */
        let str = glob;
        // The regexp we are building, as a string.
        let reStr = "";
        // Whether we are matching so called "extended" globs (like bash) and should
        // support single character matching, matching ranges of characters, group
        // matching, etc.
        const extended = true;
        const globstar = true;
        // If we are doing extended matching, this boolean is true when we are inside
        // a group (eg {*.html,*.js}), and false otherwise.
        let inGroup = false;
        let c;
        for (let i = 0, len = str.length; i < len; i++) {
            c = str[i];
            switch (c) {
                case "/":
                case "$":
                case "^":
                case "+":
                case ".":
                case "(":
                case ")":
                case "=":
                case "!":
                case "|":
                    reStr += "\\" + c;
                    break;
                case "?":
                    if (extended) {
                        reStr += ".";
                        break;
                    }
                case "[":
                case "]":
                    if (extended) {
                        reStr += c;
                        break;
                    }
                case "{":
                    if (extended) {
                        inGroup = true;
                        reStr += "(";
                        break;
                    }
                case "}":
                    if (extended) {
                        inGroup = false;
                        reStr += ")";
                        break;
                    }
                case ",":
                    if (inGroup) {
                        reStr += "|";
                        break;
                    }
                    reStr += "\\" + c;
                    break;
                case "*":
                    // Move over all consecutive "*"'s.
                    // Also store the previous and next characters
                    const prevChar = str[i - 1];
                    let starCount = 1;
                    while (str[i + 1] === "*") {
                        starCount++;
                        i++;
                    }
                    const nextChar = str[i + 1];
                    if (!globstar) {
                        // globstar is disabled, so treat any number of "*" as one
                        reStr += ".*";
                    }
                    else {
                        // globstar is enabled, so determine if this is a globstar segment
                        const isGlobstar = starCount > 1 // multiple "*"'s
                            && (prevChar === "/" || prevChar === undefined) // from the start of the segment
                            && (nextChar === "/" || nextChar === undefined); // to the end of the segment
                        if (isGlobstar) {
                            // it's a globstar, so match zero or more path segments
                            reStr += "((?:[^/]*(?:\/|$))*)";
                            i++; // move over the "/"
                        }
                        else {
                            // it's not a globstar, so only match one path segment
                            reStr += "([^/]*)";
                        }
                    }
                    break;
                default:
                    reStr += c;
            }
        }
        // When regexp 'g' flag is specified don't
        // constrain the regular expression with ^ & $
        if (!flags || !~flags.indexOf('g')) {
            reStr = "^" + reStr + "$";
        }
        return new RegExp(reStr, flags);
    }
    /**
     * Simplify file access and directory navigation with native Promise support
     */
    class FileHelper {
        /**
         * Create a new FileHelper object using a root path.
         * Root is automatically set to cordova.file.externalDataDirectory || cordova.file.dataDirectory on mobile devices,
         * and to "cdvfile://localhost/temporary/" on browser.
         *
         * You can create a new FileHelper instance using a FileHelper instance, working directory will be used as root.
         *
         * You can also create a new FileHelper instance using a DirectoryEntry,
         * returned by cordova-plugin-file's callbacks or by FileHelper.mkdir().
         * DirectoryEntry's URL will be used as root.
         *
         * @param root Root directory of the new instance
         */
        constructor(root = "") {
            this.ready = null;
            this.root = null;
            /** CHECK IF FH IS READY WITH waitInit(). */
            this.ready = new Promise((resolve, reject) => {
                document.addEventListener('deviceready', async () => {
                    if (root instanceof FileHelper) {
                        root = root.pwd();
                    }
                    else if (typeof root.isDirectory !== 'undefined') {
                        // C'est une DirectoryEntry
                        root = root.toInternalURL();
                    }
                    try {
                        await this.cd(root, false);
                        resolve();
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
        }
        /**
         * Returns a resolved promise when FileHelper is ready.
         */
        waitInit() {
            if (this.ready === null) {
                return Promise.reject(new Error("File Helper constructor not called"));
            }
            else {
                return this.ready;
            }
        }
        /**
         * Return parent directory of current path. Must NOT have trailing slash !
         * @param path
         */
        getDirUrlOfPath(path) {
            const a = path.split('/');
            a.pop();
            return a.join('/');
        }
        /**
         * Return basename (filename or foldername) of current path. Must NOT have trailing slash !
         */
        getBasenameOfPath(path) {
            const basename = path.split('/').pop();
            if (basename === undefined) {
                return path;
            }
            else {
                return basename;
            }
        }
        /**
         * Check if path exists (either a file or a directory)
         * @param path
         */
        exists(path) {
            return this.get(path)
                .then(() => true)
                .catch(() => false);
        }
        /**
         * Check if path exists and is a file
         * @param path
         */
        async isFile(path) {
            return this.get(path)
                .then(e => e.isFile)
                .catch(() => false);
        }
        /**
         * Check if path exists and is a directory
         * @param path
         */
        async isDir(path) {
            return this.get(path)
                .then(e => e.isDirectory)
                .catch(() => false);
        }
        /**
         * Rename entry / Move file or directory to another directory.
         *
         * @param path Path of the actual entry
         * @param dest Destination directory. Keep it undefined if you want to keep the same directory.
         * Can be a string-path, a FileHelper instance, or a DirectoryEntry
         *
         * @param new_name New name of the entry. Keep it undefined if you want to keep the same name
         */
        async mv(path, dest, new_name) {
            const entry = await this.get(path);
            path = entry.isDirectory ? path.replace(/\/$/, '') : path;
            let dir_dest = dest;
            if (typeof dest === 'string') {
                dir_dest = await this.mkdir(dest);
            }
            else if (dest instanceof FileHelper) {
                dir_dest = await this.absoluteGet(dest.pwd());
            }
            else if (dest === undefined) {
                dir_dest = await this.get(this.getDirUrlOfPath(path));
            }
            // Sinon, c'est bien un DirectoryEntry
            entry.moveTo(dir_dest, new_name || this.getBasenameOfPath(path));
        }
        /**
         * Copy file or directory to another directory.
         *
         * @param path Path of the actual entry
         * @param dest Destination directory. Keep it undefined if you want to keep the same directory.
         * Can be a string-path, a FileHelper instance, or a DirectoryEntry
         *
         * @param new_name New name, after copy, of the entry. Keep it undefined if you want to keep the same name
         */
        async cp(path, dest, new_name) {
            const entry = await this.get(path);
            path = entry.isDirectory ? path.replace(/\/$/, '') : path;
            let dir_dest = dest;
            if (typeof dest === 'string') {
                dir_dest = await this.mkdir(dest);
            }
            else if (dest instanceof FileHelper) {
                dir_dest = await this.absoluteGet(dest.pwd());
            }
            else if (dest === undefined) {
                dir_dest = await this.get(this.getDirUrlOfPath(path));
            }
            // Sinon, c'est bien un DirectoryEntry
            entry.copyTo(dir_dest, new_name || this.getBasenameOfPath(path));
        }
        /**
         * Create a directory. Automatically create all the parent directories needed.
         * @param path Path to the new directory
         */
        async mkdir(path) {
            const steps = path.split('/');
            let cur_entry = await this.get();
            for (const step of steps) {
                if (step.trim() === "." || step.trim() === "") {
                    continue;
                }
                cur_entry = await new Promise((resolve, reject) => {
                    cur_entry.getDirectory(step, {
                        create: true,
                        exclusive: false
                    }, resolve, reject);
                });
            }
            return cur_entry;
        }
        /**
         * Write a file containing content.
         * File and containing folder(s) are created automatically.
         * If file already exists, by default, file content are truncated and replaced by content.
         *
         * @param path Path of the file relative to working directory
         * @param content Content of the file. Can be a string, File instance, Blob or ArrayBuffer.
         * Other types will be serialized automatically using JSON.stringify()
         *
         * @param append Determine that the function should write at the end of the file.
         */
        async write(path, content, append = false) {
            content = this.toBlob(content);
            let entry = path;
            if (typeof path === 'string') {
                const dirname = this.getDirUrlOfPath(path);
                const filename = this.getBasenameOfPath(path);
                entry = await this.getFileEntryOfDirEntry(dirname ? await this.mkdir(dirname) : await this.get(), filename);
            }
            return new Promise((resolve, reject) => {
                // Fonction pour écrire le fichier après vidage
                const finally_write = () => {
                    entry.createWriter((fileWriter) => {
                        fileWriter.onerror = function (e) {
                            reject(e);
                        };
                        if (append) {
                            fileWriter.seek(fileWriter.length);
                        }
                        // @ts-ignore
                        fileWriter.onwriteend = null;
                        fileWriter.write(content);
                        fileWriter.onwriteend = () => {
                            resolve(entry);
                        };
                    });
                };
                if (append) {
                    finally_write();
                }
                else {
                    // Vide le fichier
                    entry.createWriter((fileWriter) => {
                        fileWriter.onerror = function (e) {
                            reject(e);
                        };
                        // Vide le fichier
                        fileWriter.truncate(0);
                        // Quand le fichier est vidé, on écrit finalement dedans
                        fileWriter.onwriteend = finally_write;
                    });
                }
            });
        }
        /**
         * Read a existing file located in path
         * @param path Path to the file or file via FileEntry
         * @param mode Read mode. Should be a FileHelperReadMode instance. By default, read as classic text.
         */
        async read(path, mode = FileHelperReadMode.text) {
            if (mode === FileHelperReadMode.internalURL) {
                return (typeof path === 'string' ?
                    (await this.get(path)).toInternalURL() :
                    path.toInternalURL());
            }
            let file = await this.getFile(path);
            return this.readFileAs(file, mode);
        }
        /**
         * Read a file and parse content as JSON
         * @param path
         */
        readJSON(path) {
            return this.read(path, FileHelperReadMode.json);
        }
        /**
         * Returns internal URL (absolute file path to the file/dir)
         * @param path
         */
        toInternalURL(path) {
            return this.read(path, FileHelperReadMode.internalURL);
        }
        /**
         * Read file content as base64 data URL (url that begin with data:xxx/xxxx;base64,)
         * @param path
         */
        readDataURL(path) {
            return this.read(path, FileHelperReadMode.url);
        }
        /**
         * Read all files of a directory with a specific mode.
         * Existing directories inside the directory will be ignored.
         *
         * @param path Path to directory
         * @param mode Read mode
         */
        async readAll(path = "", mode = FileHelperReadMode.text) {
            const entries = await this.entriesOf(path);
            const files = [];
            for (const e of entries) {
                if (e.isFile) {
                    files.push(await this.read(e, mode));
                }
            }
            return files;
        }
        /**
         * Get an existing file or directory using an absolute path
         * @param path Complete path
         */
        absoluteGet(path) {
            // Rajoute un / final (ne gène en rien)
            path = path.replace(/\/$/, '') + "/";
            return new Promise((resolve, reject) => {
                window.resolveLocalFileSystemURL(path, resolve, err => {
                    if (err.code === FileError.NOT_FOUND_ERR || err.code === FileError.SYNTAX_ERR) {
                        reject(new Error("File not found: " + path));
                    }
                    reject(err);
                });
            });
        }
        /**
         * Get an entry from a path.
         * If you want to read a file, use read() instead.
         * @param path Path to file or directory
         */
        get(path = "") {
            if (path === "/") {
                path = "";
            }
            return this.absoluteGet(this.pwd() + path);
        }
        /**
         * Create / get a file and return FileEntry of it. Autocreate need parent directories.
         * @param path Path to file
         */
        async touch(path) {
            const dirname = this.getDirUrlOfPath(path);
            const filename = this.getBasenameOfPath(path);
            const dir = dirname ? await this.mkdir(dirname) : await this.get();
            return this.getFileEntryOfDirEntry(dir, filename);
        }
        /**
         * Get content of a directory.
         *
         * @param path Path of thing to explore
         *
         * @param option_string Options, in a string. Can be e, l, d, p or f.
         * Options letters can be combined.
         * - "e": Return a `EntryObject` instead of returning file names.
         * - "l": Return an array of `FileStats` instead of returning file names.
         * - "d": Return only directories.
         * - "f": Return only files.
         * - "p": Disable directory prefixing.
         *  Remove autoprefixed names if you use a non-empty path parameter.
         *  Does not work if max_depth is not equal to 0.
         *
         * @param max_depth Recursive mode. For unlimited depth, use a negative value. Recursive exploration can be very slow.
         * max_depth mean maximum depth UNDER specified directory. 0 = Non-recursive, 1 = Current dir + one nested level, ...
         */
        async ls(path = "", option_string = "", max_depth = 0) {
            if (typeof path !== 'string') {
                const new_instance = new FileHelper(path);
                await new_instance.waitInit();
                return new_instance.ls(undefined, option_string, max_depth);
            }
            // Enlève le slash terminal et le slash initial (les chemins ne doivent jamais commencer par /)
            path = path.replace(/\/$/, '').replace(/^\//, '');
            const entry = await this.get(path);
            const [e, l, f, d, p, old_recursive] = [
                option_string.includes("e"), option_string.includes("l"), option_string.includes("f"),
                option_string.includes("d"), option_string.includes("p"), option_string.includes("r")
            ];
            if (old_recursive) {
                max_depth = -1;
            }
            if (entry.isFile) {
                if (e) {
                    const dir = this.getDirUrlOfPath(path);
                    return {
                        [dir ? dir : ""]: [entry]
                    };
                }
                else if (l) {
                    return [this.getStatsFromFile(await this.getFile(entry))];
                }
                return [path];
            }
            // Si jamais on veut chercher récursivement les entrées, avec un path non vide
            // et qu'on veut en plus supprimer les préfixes
            if (p && e && max_depth && path) {
                const new_root = new FileHelper(this.pwd() + path);
                await new_root.waitInit();
                return new_root.ls(undefined, "pe", max_depth);
            }
            let entries = await this.entriesOf(entry);
            let obj_entries = { [path]: entries };
            if (max_depth) {
                // Si la func est récursive, on recherche dans tous les dossiers
                // L'appel sera fait récursivement dans les nouveaux ls
                for (const e of entries) {
                    if (e.isDirectory) {
                        obj_entries = Object.assign({}, obj_entries, await this.ls(path + "/" + e.name, "e", max_depth - 1));
                    }
                }
            }
            // On filtre en fonction de directory/file only ou non
            for (const rel_path in obj_entries) {
                obj_entries[rel_path] = obj_entries[rel_path].filter(ele => {
                    if (f) {
                        return ele.isFile;
                    }
                    else if (d) {
                        return ele.isDirectory;
                    }
                    return true;
                });
            }
            // On a demandé les entrées
            if (e) {
                return obj_entries;
            }
            const paths = [];
            for (const rel_path in obj_entries) {
                for (const e of obj_entries[rel_path]) {
                    // Demande les stats du fichier
                    if (l) {
                        if (e.isDirectory) {
                            paths.push({
                                // p n'est pas activable si r est activé
                                name: (rel_path && (!p || max_depth) ? rel_path + "/" : "") + e.name,
                                mdate: undefined,
                                mtime: undefined,
                                size: 4096,
                                type: "directory"
                            });
                        }
                        else {
                            const entry = await this.getFile(e);
                            const stats = this.getStatsFromFile(entry);
                            stats.name = (rel_path && (!p || max_depth) ? rel_path + "/" : "") + stats.name;
                            paths.push(stats);
                        }
                    }
                    else {
                        // Sinon, on traite les entrées comme un string[]
                        // Enregistrement du bon nom
                        paths.push((rel_path && (!p || max_depth) ? rel_path + "/" : "") + e.name);
                    }
                }
            }
            return paths;
        }
        /**
         * Get a tree to see files below a certain directory
         * @param path Base path for tree
         * @param mime_type Get MIME type of files instead of null
         * @param max_depth See ls() max_depth parameter
         */
        async tree(path = "", mime_type = false, max_depth = -1) {
            const flat_tree = await this.ls(path, "pe", max_depth);
            // Désaplatissement de l'arbre
            const tree = {};
            for (const p in flat_tree) {
                let current_tree = tree;
                // Si ce n'est pas la racine
                if (p !== "") {
                    const steps = p.split('/');
                    for (const step of steps) {
                        // Construction des dossiers dans l'arbre
                        if (!(step in current_tree)) {
                            current_tree[step] = {};
                        }
                        current_tree = current_tree[step];
                    }
                }
                for (const entry of flat_tree[p]) {
                    // On ajoute les entrées dans current_tree
                    if (entry.isFile) {
                        if (mime_type) {
                            current_tree[entry.name] = (await this.getFile(entry)).type;
                        }
                        else {
                            current_tree[entry.name] = null;
                        }
                    }
                }
            }
            return tree;
        }
        /**
         * Remove a file or a directory.
         * @param path Path of the file to remove. Do **NOT** remove root, use empty() !
         * @param r Make rm recursive.
         * If r = false and path contains a directory that is not empty, remove will fail
         */
        async rm(path, r = false) {
            const entry = await this.get(path);
            if (entry.toInternalURL().replace(/\/$/, '') === this.pwd()) {
                return Promise.reject(new Error("Can't remove root directory !"));
            }
            if (entry.isDirectory && r) {
                return new Promise((resolve, reject) => {
                    entry.removeRecursively(resolve, reject);
                });
            }
            else {
                return new Promise((resolve, reject) => {
                    entry.remove(resolve, reject);
                });
            }
        }
        /**
         * Remove all content of a directory.
         * If path is a file, truncate file data to empty.
         *
         * @param path Path or Entry
         * @param r Make empty recursive. (if path is a directory)
         * If r = false and path contains a directory that is not empty, empty will fail
         */
        async empty(path, r = false) {
            let entry = path;
            // Si jamais le chemin est une string, on obtient son entry associée
            if (typeof path === 'string') {
                entry = await this.get(path);
            }
            // Si c'est un fichier, alors on le vide. Sinon, on va vider le répertoire
            if (entry.isFile) {
                // Vide le fichier
                await this.write(entry, new Blob);
                return;
            }
            const entries = await this.entriesOf(entry);
            for (const e of entries) {
                if (e.isDirectory && r) {
                    await new Promise((resolve, reject) => {
                        e.removeRecursively(resolve, reject);
                    });
                }
                else {
                    await new Promise((resolve, reject) => {
                        e.remove(resolve, reject);
                    });
                }
            }
        }
        /**
         * Get information about a file
         * @param path Path to a file
         */
        async stats(path) {
            const entry = await this.getFile(path);
            return this.getStatsFromFile(entry);
        }
        /**
         * Change current instance root to another directory
         * @param path **DIRECTORY** path (must NOT be a file)
         * @param relative Specify if path is relative to current directory
         */
        async cd(path, relative = true) {
            if (!path) {
                if (device.platform === "browser") {
                    path = "cdvfile://localhost/temporary/";
                }
                else {
                    path = cordova.file.externalDataDirectory || cordova.file.dataDirectory;
                }
            }
            path = normalize(relative ? this.pwd() + path : path).replace(/\/$/, '');
            // Teste si le chemin est valide (échouera sinon)
            const new_root = await this.absoluteGet(path);
            if (new_root.isFile) {
                throw new Error("New root can't be a file !");
            }
            this.root = new_root.toInternalURL().replace(/\/$/, '') + "/";
        }
        /**
         * Create a new FileHelper instance from a relative path of this current instance,
         * ensure that new path exists and return the FileHelper instance when its ready.
         *
         * @param relative_path Relative path from where creating the new instance
         */
        async newFromCd(relative_path) {
            const instance = new FileHelper(normalize(this.pwd() + relative_path));
            await instance.waitInit();
            return instance;
        }
        /**
         * Find files into a directory using a glob bash pattern.
         * @param pattern
         * @param recursive Make glob function recursive. To use ** pattern, you MUST use recursive mode.
         * @param regex_flags Add additionnal flags to regex pattern matching
         */
        async glob(pattern, recursive = false, regex_flags = "") {
            const entries = await this.ls(undefined, "e", recursive ? -1 : 0);
            const matched = [];
            const regex = globToRegex(pattern, regex_flags);
            for (const path in entries) {
                for (const e of entries[path]) {
                    const real_name = (path ? path + "/" : "") + e.name;
                    if (real_name.match(regex)) {
                        matched.push(real_name);
                    }
                }
            }
            return matched;
        }
        /**
         * Get current root directory of this instance
         */
        pwd() {
            if (this.root === null) {
                throw new Error("Object is not initialized");
            }
            return this.root;
        }
        /**
         * Alias for pwd()
         */
        toString() {
            return this.pwd();
        }
        /* FUNCTIONS WITH DIRECTORY ENTRIES, FILE ENTRIES */
        /**
         * Get entries presents in a directory via a DirectoryEntry or via directory path.
         * @param entry
         */
        async entriesOf(entry) {
            if (typeof entry === 'string') {
                entry = await this.get(entry);
                if (!entry.isDirectory) {
                    throw new Error("Path is not a directory path");
                }
            }
            return new Promise((resolve, reject) => {
                const reader = entry.createReader();
                reader.readEntries(resolve, reject);
            });
        }
        /**
         * Get entries from numerous paths
         * @param paths Array of string paths
         */
        entries(...paths) {
            const e = [];
            for (const p of paths) {
                e.push(this.get(p));
            }
            return Promise.all(e);
        }
        /**
         * Get a FileEntry from a DirectoryEntry. File will be created if "filename" does not exists in DirectoryEntry
         * @param dir DirectoryEntry
         * @param filename Name a the file to get
         */
        getFileEntryOfDirEntry(dir, filename) {
            return new Promise((resolve, reject) => {
                dir.getFile(filename, { create: true, exclusive: false }, resolve, reject);
            });
        }
        /**
         * Get a File object from a path or a FileEntry
         * @param path String path or a FileEntry
         */
        async getFile(path) {
            if (typeof path === 'string') {
                path = await this.get(path);
            }
            return new Promise((resolve, reject) => {
                path.file(resolve, reject);
            });
        }
        /**
         * Read a file object as selected mode
         * @param file File obj
         * @param mode Mode
         */
        readFileAs(file, mode = FileHelperReadMode.text) {
            if (mode === FileHelperReadMode.fileobj) {
                return Promise.resolve(file);
            }
            return new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = function () {
                    if (mode === FileHelperReadMode.array) {
                        resolve(this.result);
                    }
                    if (mode === FileHelperReadMode.json) {
                        try {
                            resolve(JSON.parse(this.result));
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                    else {
                        resolve(this.result);
                    }
                };
                r.onerror = function (error) {
                    // Erreur de lecture du fichier => on rejette
                    reject(error);
                };
                if (mode === FileHelperReadMode.array) {
                    r.readAsArrayBuffer(file);
                }
                else if (mode === FileHelperReadMode.text || mode === FileHelperReadMode.json) {
                    r.readAsText(file);
                }
                else if (mode === FileHelperReadMode.url) {
                    r.readAsDataURL(file);
                }
                else if (mode === FileHelperReadMode.binarystr) {
                    r.readAsBinaryString(file);
                }
                else {
                    throw new Error("Mode not found");
                }
            });
        }
        /**
         * Get informations about a single file using a File instance
         * @param entry File
         */
        getStatsFromFile(entry) {
            return {
                mtime: entry.lastModified,
                mdate: new Date(entry.lastModified),
                size: entry.size,
                name: entry.name,
                type: entry.type
            };
        }
        /* HELPERS */
        /**
         * Convert string, ArrayBuffer, File, classic objects to a Blob instance
         * @param s
         */
        toBlob(s) {
            if (s instanceof Blob || s instanceof File) {
                return s;
            }
            else if (typeof s === 'string' || s instanceof ArrayBuffer || ArrayBuffer.isView(s)) {
                return new Blob([s]);
            }
            else if (typeof s === "object") {
                return this.toBlob(JSON.stringify(s));
            }
            else {
                return this.toBlob(String(s));
            }
        }
    }
    exports.FileHelper = FileHelper;
});
define("base/FormSchema", ["require", "exports", "utils/helpers", "base/UserManager", "main", "utils/fetch_timeout", "base/FileHelper", "utils/Settings"], function (require, exports, helpers_2, UserManager_1, main_1, fetch_timeout_1, FileHelper_1, Settings_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    fetch_timeout_1 = __importDefault(fetch_timeout_1);
    /**
     * Type à préciser dans le JSON, clé "type"
     * Le type à préciser est la chaîne de caractères
     */
    var FormEntityType;
    (function (FormEntityType) {
        FormEntityType["integer"] = "integer";
        FormEntityType["float"] = "float";
        FormEntityType["select"] = "select";
        FormEntityType["string"] = "string";
        FormEntityType["bigstring"] = "textarea";
        FormEntityType["checkbox"] = "checkbox";
        FormEntityType["file"] = "file";
        FormEntityType["slider"] = "slider";
        FormEntityType["datetime"] = "datetime";
        FormEntityType["divider"] = "divider";
        FormEntityType["audio"] = "audio";
        FormEntityType["date"] = "date";
        FormEntityType["time"] = "time";
        FormEntityType["image"] = "image";
    })(FormEntityType = exports.FormEntityType || (exports.FormEntityType = {}));
    /**
     * Contient les différents schémas de formulaire,
     * le schéma actuellement chargé,
     * et charge automatiquement au démarrage, depuis le serveur
     * ou depuis le stockage interne, les schémas disponibles.
     *
     * Après création de l'objet, lancez l'initialisation avec init()
     * puis attendez la fin de l'initialisation avec onReady().
     */
    class FormSchemas {
        constructor() {
            this._current_key = null;
            this._default_form_key = null;
            this.on_ready = null;
            this.FORM_LOCATION = 'loaded_forms.json';
            this.DEAD_FORM_SCHEMA = { name: null, fields: [], locations: {} };
            if (localStorage.getItem('default_form_key')) {
                this._default_form_key = localStorage.getItem('default_form_key');
            }
            // Sauvegarde dans le localStorage quoiqu'il arrive
            this.default_form_key = this._default_form_key;
            /** call init() after constructor() ! */
        }
        /**
         * Sauvegarde les schémas actuellement chargés dans cet objet sur le stockage interne de l'appareil.
         * Retourne une promesse qui contient le FileEntry du fichier écrit.
         *
         * Si aucun schéma n'est disponible (available_forms = null), la promesse est rejectée.
         *
         * @throws {Error} Si aucun schéma n'est disponible => message:"Forms are not available."
         * @throws {FileError} Erreur d'écriture du fichier
         */
        save() {
            if (this.available_forms) {
                return main_1.FILE_HELPER.write(this.FORM_LOCATION, this.available_forms);
            }
            return Promise.reject(new Error("Forms are not available."));
        }
        /**
         * Initialise les formulaires disponible via un fichier JSON.
         * Si un connexion Internet est disponible, télécharge les derniers formulaires depuis le serveur.
         * Charge automatiquement un formulaire par défaut: la clé du formulaire par défaut est contenu dans "default_form_name"
         * N'appelez PAS deux fois cette fonction !
         */
        init() {
            return this.on_ready = this._init();
        }
        /**
         * Fonction fantôme de init(). Permet de glisser cette fonction dans on_ready.
         * Voir init().
         */
        async _init() {
            const init_text = document.getElementById('__init_text_center');
            if (init_text) {
                init_text.innerText = "Updating form models";
            }
            if (main_1.ENABLE_FORM_DOWNLOAD && helpers_2.hasConnection() && UserManager_1.UserManager.logged) {
                return this.downloadSchemaFromServer();
            }
            else {
                return this.readSchemaJSONFromFile();
            }
        }
        /**
         * Télécharge les schémas à jour depuis un serveur distant.
         * @param timeout Temps avant d'annuler le chargement
         * @param reject_on_fetch_fail Rejeter la promesse si le téléchargement échoue.
         * Sinon, les schémas par défaut présents sur l'appareil seront chargés.
         */
        async downloadSchemaFromServer(timeout = 5000, reject_on_fetch_fail = false) {
            // On tente d'actualiser les formulaires disponibles
            // On attend au max 20 secondes
            try {
                const response = await fetch_timeout_1.default(Settings_2.Settings.api_url + "schemas/subscribed.json", {
                    headers: new Headers({ "Authorization": "Bearer " + UserManager_1.UserManager.token }),
                    method: "GET"
                }, timeout);
                const json_2 = await response.json();
                if (json_2.error_code)
                    throw json_2.error_code;
                this.loadFormSchemaInClass(json_2, true);
            }
            catch (error) {
                console.log("Timeout/fail for forms");
                // Impossible de charger le JSON depuis le serveur
                if (reject_on_fetch_fail) {
                    return Promise.reject(error);
                }
                return this.readSchemaJSONFromFile();
            }
        }
        /**
         * Force le téléchargement des nouveaux schémas depuis un serveur distant.
         * Si le téléchargement échoue, la promesse est rejetée.
         */
        forceSchemaDownloadFromServer() {
            if (helpers_2.hasConnection() && UserManager_1.UserManager.logged) {
                return this.downloadSchemaFromServer(30000, true);
            }
            else {
                return Promise.reject();
            }
        }
        /**
         * Lit les schémas depuis le système de fichiers.
         * Essaie d'abord le local, puis, si il n'existe pas, celui du package de l'app
         */
        async readSchemaJSONFromFile() {
            // On vérifie si le fichier loaded_forms.json existe
            try {
                const string = await main_1.FILE_HELPER.read(this.FORM_LOCATION);
                this.loadFormSchemaInClass(JSON.parse(string));
            }
            catch (e) {
                // Il n'existe pas, on doit le charger depuis les sources de l'application
                try {
                    const parsed = await (await fetch_timeout_1.default('assets/form.json', {})).json();
                    this.loadFormSchemaInClass(parsed, true);
                }
                catch (e2) {
                    // Essaie de lire le fichier sur le périphérique
                    const application = new FileHelper_1.FileHelper(cordova.file.applicationDirectory + 'www/');
                    await application.waitInit();
                    await application.read('assets/form.json')
                        .then(string_1 => {
                        this.loadFormSchemaInClass(JSON.parse(string_1));
                    })
                        .catch(() => {
                        helpers_2.showToast("Unable to load form models." + " "
                            + cordova.file.applicationDirectory + 'www/assets/form.json');
                    });
                }
            }
        }
        /**
         * Charge un FormSchema dans la classe et initialise les pointeurs sur schéma en cours dans l'objet.
         *
         * @param schema
         * @param save Sauvegarder dans le JSON local les schémas de FormSchema
         */
        loadFormSchemaInClass(schema, save = false) {
            // Le JSON est reçu, on l'enregistre dans available_forms
            this.available_forms = schema;
            // On enregistre le formulaire par défaut (si la clé définie existe)
            if (this._default_form_key in this.available_forms) {
                this._current_key = this._default_form_key;
            }
            // On sauvegarde les formulaires dans loaded_forms.json
            // uniquement si demandé
            if (save) {
                this.save();
            }
        }
        /**
         * Exécute callback quand l'objet est prêt.
         * @param callback Fonction à appeler quand le formulaire est prêt
         */
        onReady(callback) {
            if (callback) {
                this.on_ready.then(() => {
                    callback(this.available_forms, this.current);
                });
            }
            return this.on_ready;
        }
        /**
         * Renvoie vrai si le formulaire existe. Renvoie également vrai pour null.
         * @param name Clé du formulaire
         */
        exists(name) {
            return name === null || name in this.available_forms;
        }
        /**
         * Change le formulaire courant renvoyé par onReady
         * @param name clé d'accès au formulaire
         * @param make_default enregistre le nouveau formulaire comme clé par défaut
         */
        change(name, make_default = false) {
            if (name === null) {
                // On supprime le formulaire chargé
                this._current_key = null;
                if (make_default) {
                    this.default_form_key = null;
                }
                return;
            }
            if (this.exists(name)) {
                this._current_key = name;
                if (make_default) {
                    this.default_form_key = name;
                }
            }
            else {
                throw new Error("Form does not exists");
            }
        }
        /**
         * Renvoie un formulaire, sans modifier le courant
         * @param name clé d'accès au formulaire
         */
        get(name) {
            if (this.exists(name)) {
                return this.available_forms[name];
            }
            else {
                throw new Error("Form does not exists");
            }
        }
        /**
         * Supprime un schéma existant
         * @param name
         * @param will_save Sauvegarder les forms après suppression
         */
        delete(name, will_save = false) {
            if (this.exists(name) && name !== null) {
                delete this.available_forms[name];
                if (this._current_key === name) {
                    this._current_key = null;
                }
                if (will_save) {
                    this.save();
                }
            }
        }
        /**
         * Retourne un tableau de tuples contenant en
         * première position la clé d'accès au formulaire,
         * et en seconde position son nom textuel à présenter à l'utilisateur
         * @returns [string, string][]
         */
        available() {
            const keys = Object.keys(this.available_forms);
            const tuples = [];
            for (const key of keys) {
                tuples.push([key, this.available_forms[key].name]);
            }
            return tuples;
        }
        get current_key() {
            return this._current_key;
        }
        get current() {
            if (this.current_key === null || !this.exists(this.current_key)) {
                return this.DEAD_FORM_SCHEMA;
            }
            else {
                return this.get(this.current_key);
            }
        }
        get default_form_key() {
            return this._default_form_key;
        }
        set default_form_key(v) {
            this._default_form_key = v;
            if (v === null) {
                localStorage.removeItem('default_form_key');
            }
            else {
                localStorage.setItem('default_form_key', v);
            }
        }
        set schemas(schema) {
            this.available_forms = schema;
            if (!(this._current_key in this.available_forms)) {
                this._current_key = null;
            }
            this.save();
        }
    }
    exports.Schemas = new FormSchemas;
});
define("utils/logger", ["require", "exports", "main"], function (require, exports, main_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Objet Logger
    // Sert à écrire dans un fichier de log formaté
    // à la racine du système de fichiers
    var LogLevel;
    (function (LogLevel) {
        LogLevel["debug"] = "debug";
        LogLevel["info"] = "info";
        LogLevel["warn"] = "warn";
        LogLevel["error"] = "error";
    })(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
    /**
     * Logger
     * Permet de logger dans un fichier texte des messages.
     */
    class _Logger {
        constructor() {
            this._onWrite = false;
            this.delayed = [];
            this.waiting_callee = [];
            this.init_done = false;
            this.init_waiting_callee = [];
            this.tries = 5;
        }
        /**
         * Initialise le logger. Doit être réalisé après app.init() et changeDir().
         * Pour vérifier si le logger est initialisé, utilisez onReady().
         */
        init() {
            this.init_done = false;
            if (this.tries === 0) {
                console.error("Too many init tries. Logger stays uninitialized.");
                return;
            }
            this.tries--;
            main_2.FILE_HELPER.touch("log.txt")
                .then(entry => {
                this.fileEntry = entry;
                this.init_done = true;
                this.onWrite = false;
                this.tries = 5;
                let func;
                while (func = this.init_waiting_callee.pop()) {
                    func();
                }
            })
                .catch(err => {
                console.log("Unable to create file log.", err);
            });
        }
        /**
         * Vrai si le logger est prêt à écrire / lire dans le fichier de log.
         */
        isInit() {
            return this.init_done;
        }
        /**
         * Si aucun callback n'est précisé, renvoie une Promise qui se résout quand
         * le logger est prêt à recevoir des instructions.
         * @param callback? Function Si précisé, la fonction ne renvoie rien et le callback sera exécuté quand le logger est prêt
         */
        onReady(callback) {
            const oninit = new Promise((resolve) => {
                if (this.isInit()) {
                    resolve();
                }
                else {
                    this.init_waiting_callee.push(resolve);
                }
            });
            if (callback) {
                oninit.then(callback);
            }
            else {
                return oninit;
            }
        }
        get onWrite() {
            return this._onWrite;
        }
        set onWrite(value) {
            this._onWrite = value;
            if (!value && this.delayed.length) {
                // On lance une tâche "delayed" avec le premier élément de la liste (le premier inséré)
                this.write(...this.delayed.shift());
            }
            else if (!value && this.waiting_callee.length) {
                // Si il n'y a aucune tâche en attente, on peut lancer les waiting function
                let func;
                while (func = this.waiting_callee.pop()) {
                    func();
                }
            }
        }
        /**
         * Écrit dans le fichier de log le contenu de text avec le niveau level.
         * Ajoute automatique date et heure au message ainsi qu'un saut de ligne à la fin.
         * Si level vaut debug, rien ne sera affiché dans la console.
         * @param data
         * @param level Niveau de log
         */
        write(data, level = LogLevel.warn) {
            if (!Array.isArray(data)) {
                data = [data];
            }
            if (!this.isInit()) {
                this.delayWrite(data, level);
                return;
            }
            // En debug, on écrit dans dans le fichier
            if (level === LogLevel.debug) {
                console.log(...data);
                return;
            }
            // Create a FileWriter object for our FileEntry (log.txt).
            this.fileEntry.createWriter((fileWriter) => {
                fileWriter.onwriteend = () => {
                    this.onWrite = false;
                };
                fileWriter.onerror = (e) => {
                    console.log("Logger: Failed file write: " + e.toString());
                    this.onWrite = false;
                };
                // Append to file
                try {
                    fileWriter.seek(fileWriter.length);
                }
                catch (e) {
                    console.log("Logger: File doesn't exist!", e);
                    return;
                }
                if (!this.onWrite) {
                    if (level === LogLevel.info) {
                        console.log(...data);
                    }
                    else if (level === LogLevel.warn) {
                        console.warn(...data);
                    }
                    else if (level === LogLevel.error) {
                        console.error(...data);
                    }
                    let final = this.createDateHeader(level) + " ";
                    for (const e of data) {
                        final += (typeof e === 'string' ? e : JSON.stringify(e)) + "\n";
                    }
                    this.onWrite = true;
                    fileWriter.write(new Blob([final]));
                }
                else {
                    this.delayWrite(data, level);
                }
            }, (error) => {
                console.error("Impossible d'écrire: ", error.code);
                this.delayWrite(data, level);
                this.init();
            });
        }
        /**
         * Crée une date formatée
         * @param level
         */
        createDateHeader(level) {
            const date = new Date();
            const m = ((date.getMonth() + 1) < 10 ? "0" : "") + String(date.getMonth() + 1);
            const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
            const hour = ((date.getHours()) < 10 ? "0" : "") + String(date.getHours());
            const min = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
            const sec = ((date.getSeconds()) < 10 ? "0" : "") + String(date.getSeconds());
            return `[${level}] [${d}/${m}/${date.getFullYear()} ${hour}:${min}:${sec}]`;
        }
        delayWrite(data, level) {
            this.delayed.push([data, level]);
        }
        /**
         * Si aucun callback n'est précisé, renvoie une Promise qui se résout quand
         * le logger a fini toutes ses opérations d'écriture.
         * @param callbackSuccess? Function Si précisé, la fonction ne renvoie rien et le callback sera exécuté quand toutes les opérations d'écriture sont terminées.
         */
        onWriteEnd(callbackSuccess) {
            const onwriteend = new Promise((resolve) => {
                if (!this.onWrite && this.isInit()) {
                    resolve();
                }
                else {
                    this.waiting_callee.push(resolve);
                }
            });
            if (callbackSuccess) {
                onwriteend.then(callbackSuccess);
            }
            else {
                return onwriteend;
            }
        }
        /**
         * Vide le fichier de log.
         * @returns Promise La promesse est résolue quand le fichier est vidé, rompue si échec
         */
        clearLog() {
            return new Promise((resolve, reject) => {
                if (!this.isInit()) {
                    reject("Logger must be initialized");
                }
                this.fileEntry.createWriter((fileWriter) => {
                    fileWriter.onwriteend = () => {
                        this.onWrite = false;
                        resolve();
                    };
                    fileWriter.onerror = () => {
                        console.log("Logger: Failed to truncate.");
                        this.onWrite = false;
                        reject();
                    };
                    if (!this.onWrite) {
                        fileWriter.truncate(0);
                    }
                    else {
                        console.log("Please call this function when log is not writing.");
                        reject();
                    }
                });
            });
        }
        /**
         * Affiche tout le contenu du fichier de log dans la console via console.log()
         * @returns Promise La promesse est résolue avec le contenu du fichier si lecture réussie, rompue si échec
         */
        consoleLogLog() {
            return new Promise((resolve, reject) => {
                if (!this.isInit()) {
                    reject("Logger must be initialized");
                }
                this.fileEntry.file(function (file) {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        console.log(this.result);
                        resolve(this.result);
                    };
                    reader.readAsText(file);
                }, () => {
                    console.log("Logger: Unable to open file.");
                    this.init();
                    reject();
                });
            });
        }
        /// Méthodes d'accès rapide
        debug(...data) {
            this.write(data, LogLevel.debug);
        }
        info(...data) {
            this.write(data, LogLevel.info);
        }
        warn(...data) {
            this.write(data, LogLevel.warn);
        }
        error(...data) {
            this.write(data, LogLevel.error);
        }
    }
    exports.Logger = new _Logger;
});
define("base/FormSaves", ["require", "exports", "main", "base/FileHelper", "base/SyncManager", "utils/helpers"], function (require, exports, main_3, FileHelper_2, SyncManager_1, helpers_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ENTRIES_DIR = "forms/";
    exports.METADATA_DIR = "form_data/";
    // Les classes anonymes font foirer la doc. Les classes ont donc des noms génériques
    /**
     * Gérer les sauvegardes d'entrée actuellement présentes sur l'appareil
     */
    class _FormSaves {
        /**
         * Obtenir une sauvegarde
         * @param id Identifiant de la sauvegarde
         */
        get(id) {
            return main_3.FILE_HELPER.readJSON(exports.ENTRIES_DIR + id + ".json");
        }
        /**
         * Obtenir les fichiers associés à un formulaire sauvegardé
         * @param id Identifiant de l'entrée
         */
        async getMetadata(id) {
            const save = await main_3.FILE_HELPER.readJSON(exports.ENTRIES_DIR + id + ".json");
            const files = {};
            for (const field in save.metadata) {
                files[field] = [
                    save.metadata[field],
                    await main_3.FILE_HELPER.read(exports.METADATA_DIR + id + "/" + save.metadata[field], FileHelper_2.FileHelperReadMode.fileobj)
                ];
            }
            return files;
        }
        /**
         * Liste toutes les sauvegardes disponibles (par identifiant)
         */
        async list() {
            const files = await main_3.FILE_HELPER.entriesOf(exports.ENTRIES_DIR);
            const ids = [];
            for (const f of files) {
                if (f.isFile) {
                    ids.push(f.name.split('.json')[0]);
                }
            }
            return ids;
        }
        listAsFormSave() {
            return main_3.FILE_HELPER.readAll(exports.ENTRIES_DIR, FileHelper_2.FileHelperReadMode.json);
        }
        /**
         * Supprimer tous les formulaires sauvegardés
         */
        async clear() {
            // On veut supprimer tous les fichiers
            await main_3.FILE_HELPER.empty(exports.ENTRIES_DIR, true);
            if (await main_3.FILE_HELPER.exists(exports.METADATA_DIR)) {
                await main_3.FILE_HELPER.empty(exports.METADATA_DIR, true);
            }
            if (device.platform === "Android" && main_3.SD_FILE_HELPER) {
                try {
                    await main_3.SD_FILE_HELPER.empty(exports.ENTRIES_DIR, true);
                    await main_3.SD_FILE_HELPER.empty(exports.METADATA_DIR, true);
                }
                catch (e) {
                    // Tant pis, ça ne marche pas
                }
            }
            await SyncManager_1.SyncManager.clear();
        }
        /**
         * Supprimer une seule entrée
         * @param id Identifiant de l'entrée
         */
        async rm(id) {
            await main_3.FILE_HELPER.rm(exports.ENTRIES_DIR + id + ".json");
            if (await main_3.FILE_HELPER.exists(exports.METADATA_DIR + id)) {
                await main_3.FILE_HELPER.rm(exports.METADATA_DIR + id, true);
            }
            if (device.platform === 'Android' && main_3.SD_FILE_HELPER) {
                // Tente de supprimer depuis la carte SD
                try {
                    await main_3.SD_FILE_HELPER.rm(exports.METADATA_DIR + id, true);
                    await main_3.SD_FILE_HELPER.rm(exports.ENTRIES_DIR + id + '.json');
                }
                catch (e) { }
            }
            await SyncManager_1.SyncManager.remove(id);
        }
        /**
         * Ecrit les fichiers présents dans le formulaire dans un dossier spécifique,
         * puis crée le formulaire.
         * Lit les fichiers depuis les input, doit donc être forcément
         * appelé depuis la page de création d'entrée !
         *
         * @param identifier ID du formulaire (sans le .json)
         * @param form_values Valeurs à sauvegarder
         * @param older_save Anciennes valeurs (si mode édition)
         */
        async save(identifier, form_values, older_save) {
            async function deleteOlderFile(input_name) {
                if (main_3.SD_FILE_HELPER) {
                    main_3.SD_FILE_HELPER.rm(exports.METADATA_DIR + identifier + "/" + older_save.fields[input_name]);
                }
                return main_3.FILE_HELPER.rm(exports.METADATA_DIR + identifier + "/" + older_save.fields[input_name]);
            }
            async function saveBlobToFile(filename, input_name, blob) {
                const full_path = exports.METADATA_DIR + identifier + '/' + filename;
                try {
                    await main_3.FILE_HELPER.write(full_path, blob);
                    if (device.platform === 'Android' && main_3.SD_FILE_HELPER) {
                        main_3.SD_FILE_HELPER.write(full_path, blob).then(() => { }).catch(e => console.log(e));
                    }
                    // Enregistre le nom du fichier sauvegardé dans le formulaire,
                    // dans la valeur du champ field
                    form_values.fields[input_name] = form_values.metadata[input_name] = filename;
                    if (older_save && input_name in older_save.fields && older_save.fields[input_name] !== null) {
                        // Si une image était déjà présente
                        if (older_save.fields[input_name] !== form_values.fields[input_name]) {
                            // Si le fichier enregistré est différent du fichier actuel
                            // Suppression de l'ancien fichier
                            deleteOlderFile(input_name);
                        }
                    }
                }
                catch (error) {
                    helpers_3.showToast("A file couldn't be saved. Check your storage capacity.");
                    return Promise.reject(error);
                }
            }
            // Récupère les images et les fichiers du formulaire
            const files_and_images_from_form = document.querySelectorAll('.input-image-element, .input-fileitem-element');
            // Sauvegarde les images !
            const promises = [];
            for (const item of files_and_images_from_form) {
                const file = item.files[0];
                const input_name = item.name;
                if (file) {
                    const filename = file.name;
                    promises.push(saveBlobToFile(filename, input_name, file));
                }
                else {
                    // Si il n'y a aucun fichier
                    if (older_save && input_name in older_save.fields) {
                        // Si il a une sauvegarde précédente
                        form_values.fields[input_name] = older_save.fields[input_name];
                        form_values.metadata[input_name] = null;
                        if (typeof older_save.fields[input_name] === 'string') {
                            // Si le fichier doit être supprimé
                            if (item.dataset.toremove === "true") {
                                form_values.fields[input_name] = null;
                                // Suppression du fichier en question
                                deleteOlderFile(input_name);
                            }
                            else {
                                const parts = older_save.fields[input_name].split('/');
                                form_values.metadata[input_name] = parts[parts.length - 1];
                            }
                        }
                    }
                    else {
                        form_values.fields[input_name] = null;
                        form_values.metadata[input_name] = null;
                    }
                }
            }
            // Récupère les données audio du formulaire
            const audio_from_form = document.getElementsByClassName('input-audio-element');
            for (const audio of audio_from_form) {
                const file = audio.value;
                const input_name = audio.name;
                if (file) {
                    const filename = helpers_3.generateId(main_3.ID_COMPLEXITY) + '.mp3';
                    promises.push(helpers_3.urlToBlob(file).then(function (blob) {
                        return saveBlobToFile(filename, input_name, blob);
                    }));
                }
                else {
                    if (older_save && input_name in older_save.fields) {
                        form_values.fields[input_name] = older_save.fields[input_name];
                        form_values.metadata[input_name] = null;
                        if (typeof older_save.fields[input_name] === 'string') {
                            if (audio.dataset.toremove === "true") {
                                form_values.fields[input_name] = null;
                                // Suppression du fichier en question
                                deleteOlderFile(input_name);
                            }
                            else {
                                const parts = older_save.fields[input_name].split('/');
                                form_values.metadata[input_name] = parts[parts.length - 1];
                            }
                        }
                    }
                    else {
                        form_values.fields[input_name] = null;
                        form_values.metadata[input_name] = null;
                    }
                }
            }
            // Attend que les sauvegardes soient terminées
            await Promise.all(promises);
            // On supprime les metadonnées vides du form
            for (const n in form_values.metadata) {
                if (form_values.metadata[n] === null) {
                    delete form_values.metadata[n];
                }
            }
            await main_3.FILE_HELPER.write(exports.ENTRIES_DIR + identifier + '.json', form_values);
            if (device.platform === 'Android' && main_3.SD_FILE_HELPER) {
                main_3.SD_FILE_HELPER.write(exports.ENTRIES_DIR + identifier + '.json', form_values).catch((e) => console.log(e));
            }
            console.log(form_values);
            return form_values;
        }
    }
    exports.FormSaves = new _FormSaves;
});
define("base/SyncManager", ["require", "exports", "utils/logger", "localforage", "main", "utils/helpers", "base/UserManager", "utils/fetch_timeout", "utils/Settings", "base/FileHelper", "base/FormSaves"], function (require, exports, logger_1, localforage_1, main_4, helpers_4, UserManager_2, fetch_timeout_2, Settings_3, FileHelper_3, FormSaves_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    localforage_1 = __importDefault(localforage_1);
    fetch_timeout_2 = __importDefault(fetch_timeout_2);
    class _SyncList {
        init() {
            localforage_1.default.config({
                driver: [localforage_1.default.INDEXEDDB,
                    localforage_1.default.WEBSQL,
                    localforage_1.default.LOCALSTORAGE],
                name: 'forms',
                version: 1.0,
                storeName: 'keyvaluepairs',
                description: 'Enregistre les formulaires liés par ID => {type, metadata}'
            });
        }
        add(id, value) {
            return localforage_1.default.setItem(id, value);
        }
        get(id) {
            return localforage_1.default.getItem(id);
        }
        remove(id) {
            return localforage_1.default.removeItem(id);
        }
        listSaved() {
            return localforage_1.default.keys();
        }
        getRemainingToSync() {
            return localforage_1.default.length();
        }
        clear() {
            return localforage_1.default.clear();
        }
        has(id) {
            return this.get(id)
                .then(item => {
                return !!item;
            });
        }
    }
    const SyncList = new _SyncList;
    ////// Polyfill si l'application est portée sur iOS: Safari ne supporte pas le constructeur EventTarget()
    class SyncEvent extends EventTarget {
        constructor() {
            try {
                super();
            }
            catch (e) {
                return document.createTextNode("");
            }
        }
    }
    exports.SyncEvent = SyncEvent;
    ////// Fin polyfill
    class _SyncManager {
        constructor() {
            this.in_sync = false;
            this.list = SyncList;
            this.last_bgsync = Date.now();
            this.running_fetchs = [];
        }
        /**
         * Initilise l'objet SyncManager
         */
        init() {
            this.list.init();
            this.initBackgroundSync();
        }
        /**
         * Initialise la synchronisation d'arrière plan avec l'intervalle interval
         * @param interval
         */
        initBackgroundSync(interval = Settings_3.Settings.sync_freq) {
            const success_fn = () => {
                logger_1.Logger.info(((Date.now() - this.last_bgsync) / 1000) + " seconds since last bg sync.");
                this.last_bgsync = Date.now();
                this.launchBackgroundSync()
                    .then(() => {
                    logger_1.Logger.info(`Banckground sync has been completed successfully and last ${((Date.now() - this.last_bgsync) / 1000)} seconds.`);
                    Settings_3.BackgroundSync.finish();
                })
                    .catch(e => {
                    logger_1.Logger.error("Unable to do background sync.", e);
                    Settings_3.BackgroundSync.finish();
                });
            };
            const failure_fn = () => {
                console.log("Sync could not be started");
                const checkbox_setting_bgsync = document.getElementById('__sync_bg_checkbox_settings');
                if (checkbox_setting_bgsync) {
                    helpers_4.showToast("Unable to start background synchronisation");
                    checkbox_setting_bgsync.checked = false;
                }
            };
            if (Settings_3.Settings.sync_bg) {
                // Initialise la synchronisation en arrière plan uniquement si elle est demandée
                if (Settings_3.BackgroundSync.isInit()) {
                    Settings_3.BackgroundSync.initBgSync(success_fn, failure_fn, interval);
                }
                else {
                    Settings_3.BackgroundSync.init(success_fn, failure_fn, interval);
                }
            }
        }
        changeBackgroundSyncInterval(interval) {
            if (Settings_3.BackgroundSync.isInit()) {
                Settings_3.BackgroundSync.changeBgSyncInterval(interval);
            }
            else {
                this.initBackgroundSync(interval);
            }
        }
        /**
         * Démarre la synchronisation d'arrière-plan
         */
        startBackgroundSync() {
            if (Settings_3.BackgroundSync.isInit()) {
                Settings_3.BackgroundSync.start();
            }
            else {
                this.initBackgroundSync();
            }
        }
        /**
         * Arrête la synchro d'arrière plan
         */
        stopBackgroundSync() {
            if (Settings_3.BackgroundSync.isInit()) {
                Settings_3.BackgroundSync.stop();
            }
        }
        /**
         * Ajoute une entrée dans la liste d'attente de synchronisation
         * @param id Identifiant du formulaire
         * @param data Sauvegarde de formulaire
         */
        add(id, data) {
            const saveItem = (id, type, metadata) => {
                return this.list.add(id, { type, metadata });
            };
            return this.list.get(id)
                .then(value => {
                if (value === null) {
                    // La valeur n'est pas stockée
                    return saveItem(id, data.type, data.metadata);
                }
                else {
                    // Vérification si les métadonnées sont différentes
                    let diff = false;
                    for (const k in value.metadata) {
                        if (!(k in data.metadata) || data.metadata[k] !== value.metadata[k]) {
                            diff = true;
                            break;
                        }
                    }
                    if (diff) {
                        return saveItem(id, data.type, data.metadata);
                    }
                    else {
                        return { type: data.type, metadata: data.metadata };
                    }
                }
            });
        }
        /**
         * Supprime une entrée id de la liste d'attente de synchro
         * @param id
         */
        remove(id) {
            return this.list.remove(id);
        }
        /**
         * Envoie un formulaire id vers le serveur Busy Bird
         * @param id identifiant du formulaire
         * @param data SList correpondant au formulaire
         */
        async sendForm(id, data) {
            // Renvoie une promise réussie si l'envoi du formulaire 
            // et de ses métadonnées a réussi.
            let content;
            try {
                content = await main_4.FILE_HELPER.read(FormSaves_1.ENTRIES_DIR + id + ".json");
            }
            catch (error) {
                logger_1.Logger.info("Unable to read file", error.message);
                throw { code: "file_read", error };
            }
            if (!this.in_sync) {
                throw { code: "aborted" };
            }
            const d = new FormData();
            d.append("id", id);
            d.append("form", content);
            let json;
            try {
                // Contrôleur pour arrêter les fetch si abort
                let controller;
                if ("AbortController" in window) {
                    controller = new AbortController();
                    this.running_fetchs.push(controller);
                }
                let signal = controller ? controller.signal : undefined;
                const response = await fetch_timeout_2.default(Settings_3.Settings.api_url + "forms/send.json", {
                    method: "POST",
                    body: d,
                    signal,
                    headers: new Headers({ "Authorization": "Bearer " + UserManager_2.UserManager.token })
                }, main_4.MAX_TIMEOUT_FOR_FORM);
                json = await response.json();
            }
            catch (error) {
                throw { code: "json_send", error };
            }
            if (json.error_code) {
                throw { code: "json_treatement", error_code: json.error_code, "message": json.message };
            }
            // On peut envoyer les métadonnées du json !
            if (!this.in_sync) {
                throw { code: "aborted" };
            }
            // Le JSON du form est envoyé !
            if (json.status && json.send_metadata) {
                // Si on doit envoyer les fichiers en plus
                const base_path = FormSaves_1.METADATA_DIR + id + "/";
                // json.send_metadata est un tableau de fichiers à envoyer
                for (const metadata in data.metadata) {
                    if (json.send_metadata.indexOf(metadata) === -1) {
                        // La donnée actuelle n'est pas demandée par le serveur
                        continue;
                    }
                    const file = base_path + data.metadata[metadata];
                    const basename = data.metadata[metadata];
                    // Envoi de tous les fichiers associés un à un
                    // Pour des raisons de charge réseau, on envoie les fichiers un par un.
                    let base64;
                    try {
                        base64 = await main_4.FILE_HELPER.read(file, FileHelper_3.FileHelperReadMode.url);
                    }
                    catch (e) {
                        // Le fichier n'existe pas en local. On passe.
                        continue;
                    }
                    // On récupère la partie base64 qui nous intéresse
                    base64 = base64.split(',')[1];
                    // On construit le formdata à envoyer
                    const md = new FormData();
                    md.append("id", id);
                    md.append("type", data.type);
                    md.append("filename", basename);
                    md.append("data", base64);
                    try {
                        // Contrôleur pour arrêter les fetch si abort
                        let controller;
                        if ("AbortController" in window) {
                            controller = new AbortController();
                            this.running_fetchs.push(controller);
                        }
                        let signal = controller ? controller.signal : undefined;
                        const resp = await fetch_timeout_2.default(Settings_3.Settings.api_url + "forms/metadata_send.json", {
                            method: "POST",
                            body: md,
                            signal,
                            headers: new Headers({ "Authorization": "Bearer " + UserManager_2.UserManager.token })
                        }, main_4.MAX_TIMEOUT_FOR_METADATA);
                        const json = await resp.json();
                        if (json.error_code) {
                            throw { code: "metadata_treatement", error_code: json.error_code, "message": json.message };
                        }
                        // Envoi réussi si ce bout de code est atteint ! On passe au fichier suivant
                    }
                    catch (error) {
                        helpers_4.showToast("Impossible d'envoyer " + basename + ".");
                        throw { code: "metadata_send", error };
                    }
                } // end for in
            }
            this.list.remove(id);
        }
        available() {
            return this.list.listSaved();
        }
        async getSpecificFile(id) {
            const entries = await main_4.FILE_HELPER.ls(FormSaves_1.ENTRIES_DIR, "e");
            const filename = id + ".json";
            for (const d in entries) {
                for (const entry of entries[d]) {
                    if (entry.name === filename) {
                        const json = JSON.parse(await main_4.FILE_HELPER.read(entry));
                        return { type: json.type, metadata: json.metadata };
                    }
                }
            }
            // On a pas trouvé, on rejette
            throw "";
        }
        /**
         * Obtient tous les fichiers JSON disponibles sur l'appareil
         */
        async getAllCurrentFiles() {
            const entries = await main_4.FILE_HELPER.ls(FormSaves_1.ENTRIES_DIR, "e");
            const promises = [];
            // On ajoute chaque entrée
            for (const d in entries) {
                for (const entry of entries[d]) {
                    promises.push(new Promise(async (resolve) => {
                        const json = JSON.parse(await main_4.FILE_HELPER.read(entry));
                        resolve([entry.name.split('.json')[0], { type: json.type, metadata: json.metadata }]);
                    }));
                }
            }
            // On attend que tout soit OK
            return Promise.all(promises);
        }
        /**
         * Supprime le cache de sauvegarde et ajoute tous les fichiers JSON disponibles dans celui-ci
         */
        addAllFiles() {
            // On obtient tous les fichiers disponibles
            return this.getAllCurrentFiles()
                .then(forms => {
                // On vide le cache actuel
                return this.list.clear()
                    .then(() => {
                    return forms;
                });
            })
                .then((forms) => {
                const promises = [];
                // Pour chaque form dispo, on l'ajoute dans le cache à sauvegarder
                for (const form of forms) {
                    promises.push(this.list.add(form[0], form[1]));
                }
                return Promise.all(promises)
                    .then(() => {
                    return;
                });
            });
        }
        /**
         * Lance la synchronisation et affiche son état dans un modal
         * @param force_all Forcer l'envoi de tous les formulaires
         * @param clear_cache Supprimer le cache actuel d'envoi et forcer tout l'envoi (ne fonctionne qu'avec force_all)
         */
        graphicalSync(force_all = false, clear_cache = false) {
            const modal = helpers_4.getModal();
            const instance = helpers_4.initModal({ dismissible: false }, helpers_4.getModalPreloader("Please wait...", `<div class="modal-footer">
                    <a href="#!" class="red-text btn-flat left" id="__sync_modal_cancel">Cancel</a>
                    <div class="clearb"></div>
                </div>`));
            instance.open();
            let cancel_clicked = false;
            const text = document.getElementById(helpers_4.MODAL_PRELOADER_TEXT_ID);
            const modal_cancel = document.getElementById('__sync_modal_cancel');
            modal_cancel.onclick = () => {
                cancel_clicked = true;
                this.cancelSync();
                if (text)
                    text.insertAdjacentHTML("afterend", `<p class='flow-text center red-text'>Cancelling...</p>`);
            };
            const receiver = new SyncEvent;
            // Actualise le texte avec des events
            receiver.addEventListener('begin', () => {
                text.innerText = "Reading files to synchronize";
            });
            receiver.addEventListener('send', (event) => {
                const detail = event.detail;
                text.innerHTML = `Sending data\n(Entry ${detail.number} of ${detail.total})`;
            });
            return this.sync(force_all, clear_cache, undefined, receiver)
                .then(data => {
                helpers_4.showToast("Synchronisation completed");
                instance.close();
                return data;
            })
                .catch(reason => {
                if (cancel_clicked) {
                    instance.close();
                }
                else if (reason && typeof reason === 'object') {
                    logger_1.Logger.error("Sync fail:", reason);
                    // Si jamais la syncho a été refusée parce qu'une est déjà en cours
                    if (reason.code === "already") {
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="red-text no-margin-top">One synchronisation is already running.</h5>
                            <p class="flow-text">Try later.</p>
                            <div class="center">
                                <a href="#!" id="__ask_sync_cancel" class="green-text btn-flat center">Ask for cancel</a>
                            </div>
                            <div class="clearb"></div>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" class="red-text btn-flat left modal-close">Close</a>
                            <div class="clearb"></div>
                        </div>
                        `;
                        const that = this;
                        document.getElementById('__ask_sync_cancel').onclick = function () {
                            const text = document.createElement('p');
                            text.classList.add('center', 'flow-text');
                            this.insertAdjacentElement('afterend', text);
                            that.cancelSync();
                            const a_element = this;
                            a_element.style.display = "none";
                            function launch_timeout() {
                                setTimeout(() => {
                                    if (!a_element)
                                        return;
                                    if (that.in_sync) {
                                        launch_timeout();
                                    }
                                    else {
                                        if (text) {
                                            text.classList.add('red-text');
                                            text.innerText = "Sync cancelled.";
                                        }
                                    }
                                }, 500);
                            }
                            launch_timeout();
                        };
                    }
                    else if (typeof reason.code === "string") {
                        let cause = (function (reason) {
                            switch (reason) {
                                case "aborted": return "Synchonisation has beed cancelled.";
                                case "json_send": return "One entry could not be sent.";
                                case "metadata_send": return "File linked to an entry could not be sent.";
                                case "file_read": return "A file cound not be read.";
                                case "id_getter": return "Unable to dialog with internal database.";
                                default: return "Unknown error.";
                            }
                        })(reason.code);
                        // Modifie le texte du modal
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="red-text no-margin-top">Unable to synchronize</h5>
                            <p class="flow-text">
                                ${cause}<br>
                                Please try again later.
                            </p>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" class="red-text btn-flat right modal-close">Close</a>
                            <div class="clearb"></div>
                        </div>
                        `;
                    }
                }
                else {
                    // Modifie le texte du modal
                    modal.innerHTML = `
                    <div class="modal-content">
                        <h5 class="red-text no-margin-top">Unable to synchronize</h5>
                        <p class="flow-text">
                            An unknown error occurred.<br>
                            Please try again later.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <a href="#!" class="red-text btn-flat right modal-close">Close</a>
                        <div class="clearb"></div>
                    </div>
                    `;
                }
                return Promise.reject(reason);
            });
        }
        /**
         * Lance un synchronisation silencieuse, mais qui fait tourner des spinners sur la page des entrées
         * @param force_specific_elements Forcer la synchronisation d'éléments spécifiques
         */
        async inlineSync(force_specific_elements = undefined) {
            const receiver = new SyncEvent;
            // Définit les évènements qui vont se passer lors d'une synchro
            receiver.addEventListener('send', (event) => {
                const id = event.detail.id; /** detail: { id, data: value, number: i+position, total: entries.length } */
                changeInlineSyncStatus([id], "running");
            });
            receiver.addEventListener('sended', (event) => {
                const id = event.detail; /** detail: string */
                changeInlineSyncStatus([id], "synced");
            });
            receiver.addEventListener('groupsenderror', (event) => {
                const subset = event.detail; /** detail: string[] */
                changeInlineSyncStatus(subset, "unsynced");
            });
            receiver.addEventListener('senderrorfailer', (event) => {
                const id = event.detail; /** detail: string */
                changeInlineSyncStatus([id], "error");
            });
            try {
                const data = await this.sync(undefined, undefined, force_specific_elements, receiver);
                helpers_4.showToast("Synchronisation réussie");
                return data;
            }
            catch (reason) {
                if (reason && typeof reason === 'object') {
                    logger_1.Logger.error("Sync fail:", reason);
                    // Si jamais la syncho a été refusée parce qu'une est déjà en cours
                    if (reason.code === "already") {
                        helpers_4.showToast('One synchronisation is already running.');
                    }
                    else if (typeof reason.code === "string") {
                        let cause = (function (reason) {
                            switch (reason) {
                                case "aborted": return "Synchonisation has beed cancelled.";
                                case "json_send": return "One entry could not be sent.";
                                case "metadata_send": return "File linked to an entry could not be sent.";
                                case "file_read": return "A file cound not be read.";
                                case "id_getter": return "Unable to dialog with internal database.";
                                default: return "Unknown error.";
                            }
                        })(reason.code);
                        // Modifie le texte du modal
                        helpers_4.showToast("Unable to synchronize: " + cause);
                    }
                }
                else {
                    helpers_4.showToast("An error occurred during synchronisation process.");
                }
                throw reason;
            }
        }
        /**
         * Divise le nombre d'éléments à envoyer par requête.
         * @param id_getter Fonction pour récupérer un ID depuis la BDD
         * @param entries Tableau des IDs à envoyer
         * @param receiver Récepteur aux événements lancés par la synchro
         */
        async subSyncDivider(id_getter, entries, receiver) {
            for (let position = 0; position < entries.length; position += main_4.MAX_CONCURRENT_SYNC_ENTRIES) {
                // Itère par groupe de formulaire. Groupe de taille MAX_CONCURRENT_SYNC_ENTRIES
                const subset = entries.slice(position, main_4.MAX_CONCURRENT_SYNC_ENTRIES + position);
                const promises = [];
                receiver.dispatchEvent(eventCreator("groupsend", subset));
                let i = 1;
                let error_id;
                for (const id of subset) {
                    // Pour chaque clé disponible
                    promises.push(id_getter(id)
                        .catch((error) => {
                        error_id = id;
                        return Promise.reject({ code: "id_getter", error });
                    })
                        .then((value) => {
                        receiver.dispatchEvent(eventCreator("send", { id, data: value, number: i + position, total: entries.length }));
                        i++;
                        return this.sendForm(id, value)
                            .then(() => {
                            receiver.dispatchEvent(eventCreator("sended", id));
                        })
                            .catch(error => {
                            error_id = id;
                            return Promise.reject(error);
                        });
                    }));
                }
                await Promise.all(promises)
                    .then(val => {
                    receiver.dispatchEvent(eventCreator("groupsended", subset));
                    return val;
                })
                    .catch(error => {
                    receiver.dispatchEvent(eventCreator("groupsenderror", subset));
                    receiver.dispatchEvent(eventCreator("senderrorfailer", error_id));
                    return Promise.reject(error);
                });
            }
        }
        /**
         * Lance la synchronisation en arrière plan
         */
        launchBackgroundSync() {
            if (helpers_4.hasGoodConnection()) {
                return this.sync();
            }
            return Promise.reject({ code: "no_good_connection" });
        }
        /**
         * Synchronise les formulaires courants avec la BDD distante
         * @param force_all Forcer l'envoi de tous les formulaires
         * @param clear_cache Supprimer le cache actuel d'envoi et forcer tout l'envoi (ne fonctionne qu'avec force_all)
         * @param force_specific_elements Tableau d'identifiants de formulaire (string[]) à utiliser pour la synchronisation
         * @param receiver SyncEvent qui recevra les événements lancés par la synchronisation
         */
        sync(force_all = false, clear_cache = false, force_specific_elements, receiver = new SyncEvent) {
            if (this.in_sync) {
                receiver.dispatchEvent(eventCreator("error", { code: 'already' }));
                return Promise.reject({ code: 'already' });
            }
            this.in_sync = true;
            let data_cache = {};
            let use_cache = false;
            return new Promise((resolve, reject) => {
                receiver.dispatchEvent(eventCreator("begin"));
                let entries_promise;
                if (force_all) {
                    if (clear_cache) {
                        entries_promise = this.addAllFiles().then(() => {
                            return this.list.listSaved();
                        });
                    }
                    else {
                        use_cache = true;
                        entries_promise = this.getAllCurrentFiles().then((forms) => {
                            // Ne récupère que les ID (en première position du tuple)
                            // On sauvegarde le SList qui sera injecté
                            forms.forEach(e => { data_cache[e[0]] = e[1]; });
                            return forms.map(e => e[0]);
                        });
                    }
                }
                else if (force_specific_elements) {
                    entries_promise = Promise.resolve(force_specific_elements);
                }
                else {
                    entries_promise = this.list.listSaved();
                }
                // Utilisé pour soit lire depuis le cache, soit lire depuis this.list
                const id_getter = (id) => {
                    if (use_cache) {
                        return Promise.resolve(data_cache[id]);
                    }
                    else {
                        return this.list.get(id)
                            .then(value => {
                            if (value === null) {
                                // Si la valeur n'existe pas, il faut chercher le fichier id.
                                // Si le fichier est inexistant, cela lancera une exception,
                                // donc une promesse rejetée
                                return this.getSpecificFile(id);
                            }
                            else {
                                return value;
                            }
                        });
                    }
                };
                entries_promise
                    .then(entries => {
                    if (!this.in_sync) {
                        receiver.dispatchEvent(eventCreator("abort"));
                        reject({ code: "aborted" });
                        return;
                    }
                    receiver.dispatchEvent(eventCreator("beforesend", entries));
                    return this.subSyncDivider(id_getter, entries, receiver)
                        .then(() => {
                        if (!force_specific_elements)
                            this.list.clear();
                        this.in_sync = false;
                        this.running_fetchs = [];
                        // La synchro a réussi !
                        receiver.dispatchEvent(eventCreator("complete"));
                        resolve();
                    });
                })
                    .catch(r => {
                    receiver.dispatchEvent(eventCreator("error", r));
                    this.in_sync = false;
                    logger_1.Logger.info("Failed to sync:", r);
                    reject(r);
                });
            });
        }
        cancelSync() {
            this.in_sync = false;
            for (const ctl of this.running_fetchs) {
                ctl.abort();
            }
            this.running_fetchs = [];
        }
        /**
         * Efface la liste d'entrées attendant d'être envoyées
         */
        clear() {
            return this.list.clear();
        }
        /**
         * Retourne le nombre d'entrées attendant d'être envoyées
         */
        remainingToSync() {
            return this.list.getRemainingToSync();
        }
        /**
         * Teste if id attend d'être envoyé
         * @param id string
         */
        has(id) {
            return this.list.has(id);
        }
    }
    exports.SyncManager = new _SyncManager;
    /**
     * Crée un événement personnalisé
     * @param type Type de l'événement
     * @param detail Données à ajouter
     */
    function eventCreator(type, detail) {
        return new CustomEvent(type, { detail });
    }
    /**
     * Changer l'état des spinners sur la page des entrées
     * @param entries ID des entrées à actualiser
     * @param status Status à donner à ces entrées
     */
    function changeInlineSyncStatus(entries, status = "running") {
        for (const e of entries) {
            // On fait tourner le bouton
            const sync_icon = document.querySelector(`div[data-formid="${e}"] .sync-icon i`);
            if (sync_icon) {
                const container = sync_icon.parentElement.parentElement;
                if (status === "running") {
                    sync_icon.innerText = "sync";
                    sync_icon.className = "material-icons grey-text turn-anim";
                }
                else if (status === "synced") {
                    sync_icon.className = "material-icons green-text";
                    container.dataset.synced = "true";
                }
                else if (status === "error") {
                    sync_icon.className = "material-icons red-text";
                    sync_icon.innerText = "sync_problem";
                    container.dataset.synced = "false";
                }
                else {
                    // Unsynced
                    sync_icon.className = "material-icons grey-text";
                    sync_icon.innerText = "sync_disabled";
                    container.dataset.synced = "false";
                }
            }
        }
    }
});
define("utils/helpers", ["require", "exports", "base/PageManager", "base/FormSchema", "base/SyncManager", "main", "base/FormSaves"], function (require, exports, PageManager_1, FormSchema_2, SyncManager_2, main_5, FormSaves_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // PRELOADERS: spinners for waiting time
    exports.PRELOADER_BASE = `
<div class="spinner-layer spinner-blue-only">
    <div class="circle-clipper left">
        <div class="circle"></div>
    </div><div class="gap-patch">
        <div class="circle"></div>
    </div><div class="circle-clipper right">
        <div class="circle"></div>
    </div>
</div>`;
    exports.PRELOADER = `
<div class="preloader-wrapper active">
    ${exports.PRELOADER_BASE}
</div>`;
    exports.SMALL_PRELOADER = `
<div class="preloader-wrapper small active">
    ${exports.PRELOADER_BASE}
</div>`;
    exports.MODAL_PRELOADER_TEXT_ID = "__classic_preloader_text";
    /**
     * @returns HTMLElement Élément HTML dans lequel écrire pour modifier la page active
     */
    function getBase() {
        return document.getElementById('main_block');
    }
    exports.getBase = getBase;
    /**
     * Initialise le modal simple avec les options données (voir doc.)
     * et insère de l'HTML dedans avec content
     * @returns M.Modal Instance du modal instancié avec Materialize
     */
    function initModal(options = {}, content) {
        const modal = getModal();
        modal.classList.remove('modal-fixed-footer');
        if (content)
            modal.innerHTML = content;
        return M.Modal.init(modal, options);
    }
    exports.initModal = initModal;
    /**
     * Initialise le modal collé en bas avec les options données (voir doc.)
     * et insère de l'HTML dedans avec content
     * @returns M.Modal Instance du modal instancié avec Materialize
     */
    function initBottomModal(options = {}, content) {
        const modal = getBottomModal();
        modal.classList.remove('unlimited');
        if (content)
            modal.innerHTML = content;
        return M.Modal.init(modal, options);
    }
    exports.initBottomModal = initBottomModal;
    /**
     * @returns HTMLElement Élément HTML racine du modal
     */
    function getModal() {
        return document.getElementById('modal_placeholder');
    }
    exports.getModal = getModal;
    /**
     * @returns HTMLElement Élément HTML racine du modal fixé en bas
     */
    function getBottomModal() {
        return document.getElementById('bottom_modal_placeholder');
    }
    exports.getBottomModal = getBottomModal;
    /**
     * @returns M.Modal Instance du modal (doit être initialisé)
     */
    function getModalInstance() {
        return M.Modal.getInstance(getModal());
    }
    exports.getModalInstance = getModalInstance;
    /**
     * @returns M.Modal Instance du modal fixé en bas (doit être initialisé)
     */
    function getBottomModalInstance() {
        return M.Modal.getInstance(getBottomModal());
    }
    exports.getBottomModalInstance = getBottomModalInstance;
    /**
     * Génère un spinner centré sur l'écran avec un message d'attente
     * @param text Texte à insérer comme message de chargement
     * @returns string HTML à insérer
     */
    function getPreloader(text) {
        return `
    <div style="margin-top: 35vh; text-align: center;">
        ${exports.PRELOADER}
    </div>
    <div class="flow-text" style="margin-top: 10px; text-align: center;">${text}</div>
    `;
    }
    exports.getPreloader = getPreloader;
    /**
     * Génère un spinner adapté à un modal avec un message d'attente
     * @param text Texte à insérer comme message de chargement
     * @param footer HTML du footer à injecter (doit contenir le tag .modal-footer)
     * @returns string HTML à insérer dans la racine d'un modal
     */
    function getModalPreloader(text, footer = "") {
        return `<div class="modal-content">
    <div style="text-align: center;">
        ${exports.SMALL_PRELOADER}
    </div>
    <div class="flow-text pre-wrapper" id="${exports.MODAL_PRELOADER_TEXT_ID}" style="margin-top: 10px; text-align: center;">${text}</div>
    </div>
    ${footer}
    `;
    }
    exports.getModalPreloader = getModalPreloader;
    // dec2hex :: Integer -> String
    function dec2hex(dec) {
        return ('0' + dec.toString(16)).substr(-2);
    }
    /**
     * Génère un identifiant aléatoire
     * @param len Longueur de l'ID
     */
    function generateId(len) {
        const arr = new Uint8Array((len || 40) / 2);
        window.crypto.getRandomValues(arr);
        return Array.from(arr, dec2hex).join('');
    }
    exports.generateId = generateId;
    // USELESS
    function saveDefaultForm() {
        // writeFile('schemas/', 'default.json', new Blob([JSON.stringify(current_form)], {type: "application/json"}));
    }
    exports.saveDefaultForm = saveDefaultForm;
    // Met le bon répertoire dans FOLDER. Si le stockage interne/sd n'est pas monté,
    // utilise le répertoire data (partition /data) de Android
    let FOLDER = cordova.file.externalDataDirectory || cordova.file.dataDirectory;
    /**
     * Change le répertoire actif en fonction de la plateforme et l'insère dans FOLDER.
     * Fonction appelée automatiquement au démarrage de l'application dans main.initApp()
     */
    function changeDir() {
        if (device.platform === "browser") {
            FOLDER = "cdvfile://localhost/temporary/";
            // Permet le bouton retour sur navigateur
            const back_btn = document.getElementById('__nav_back_button');
            back_btn.onclick = function () {
                PageManager_1.PageManager.back();
            };
            back_btn.classList.remove('hide');
        }
        else if (device.platform === "iOS") {
            FOLDER = cordova.file.dataDirectory;
        }
    }
    exports.changeDir = changeDir;
    /**
     * Renvoie un début d'URL valide pour charger des fichiers internes à l'application sur tous les périphériques.
     */
    function toValidUrl() {
        if (device.platform === "browser") {
            return '';
        }
        return cordova.file.applicationDirectory + 'www/';
    }
    exports.toValidUrl = toValidUrl;
    function sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }
    exports.sleep = sleep;
    /**
     * Fonction de test.
     * Écrit l'objet obj sérialisé en JSON à la fin de l'élément HTML ele.
     * @param ele HTMLElement
     * @param obj any
     */
    function printObj(ele, obj) {
        ele.insertAdjacentText('beforeend', JSON.stringify(obj, null, 2));
    }
    exports.printObj = printObj;
    /**
     * Obtient la localisation de l'utilisation.
     * Si réussi, onSuccess est appelée avec en paramètre un objet de type Position
     * @param onSuccess Function(coords: Position) => void
     * @param onFailed Function(error) => void
     */
    function getLocation(onSuccess, onFailed) {
        navigator.geolocation.getCurrentPosition(onSuccess, onFailed, { timeout: 30 * 1000, maximumAge: 5 * 60 * 1000 });
    }
    exports.getLocation = getLocation;
    /**
     * Calcule la distance en mètres entre deux coordonnées GPS.
     * Les deux objets passés doivent implémenter l'interface CoordsLike
     * @param coords1 CoordsLike
     * @param coords2 CoordsLike
     * @returns number Nombre de mètres entre les deux coordonnées
     */
    function calculateDistance(coords1, coords2) {
        return geolib.getDistance({ latitude: String(coords1.latitude), longitude: String(coords1.longitude) }, { latitude: String(coords2.latitude), longitude: String(coords2.longitude) });
    }
    exports.calculateDistance = calculateDistance;
    /**
     * Fonction de test pour tester la géolocalisation.
     * @param latitude
     * @param longitude
     */
    function testDistance(latitude = 45.353421, longitude = 5.836441) {
        getLocation(function (res) {
            console.log(calculateDistance(res.coords, { latitude, longitude }));
        }, function (error) {
            console.log(error);
        });
    }
    exports.testDistance = testDistance;
    /**
     * Formate un objet Date en chaîne de caractères potable.
     * @param date Date
     * @param withTime boolean Détermine si la chaîne de caractères contient l'heure et les minutes
     * @returns string La châine formatée
     */
    function formatDate(date, withTime = false) {
        const m = ((date.getMonth() + 1) < 10 ? "0" : "") + String(date.getMonth() + 1);
        const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
        const min = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
        return `${d}/${m}/${date.getFullYear()}` + (withTime ? ` ${date.getHours()}h${min}` : "");
    }
    exports.formatDate = formatDate;
    /**
     * Formate un objet Date en chaîne de caractères potable.
     * Pour comprendre les significations des lettres du schéma, se référer à : http://php.net/manual/fr/function.date.php
     * @param schema string Schéma de la chaîne. Supporte Y, m, d, g, H, i, s, n, N, v, z, w
     * @param date Date Date depuis laquelle effectuer le formatage
     * @returns string La châine formatée
     */
    function dateFormatter(schema, date = new Date()) {
        function getDayOfTheYear(now) {
            const start = new Date(now.getFullYear(), 0, 0);
            const diff = now.getTime() - start.getTime();
            const oneDay = 1000 * 60 * 60 * 24;
            const day = Math.floor(diff / oneDay);
            return day - 1; // Retourne de 0 à 364/365
        }
        const Y = date.getFullYear();
        const N = date.getDay() === 0 ? 7 : date.getDay();
        const n = date.getMonth() + 1;
        const m = (n < 10 ? "0" : "") + String(n);
        const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
        const L = Y % 4 == 0 ? 1 : 0;
        const i = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
        const H = ((date.getHours()) < 10 ? "0" : "") + String(date.getHours());
        const g = date.getHours();
        const s = ((date.getSeconds()) < 10 ? "0" : "") + String(date.getSeconds());
        const replacements = {
            Y, m, d, i, H, g, s, n, N, L, v: date.getMilliseconds(), z: getDayOfTheYear, w: date.getDay()
        };
        let str = "";
        // Construit la chaîne de caractères
        for (const char of schema) {
            if (char in replacements) {
                if (typeof replacements[char] === 'string') {
                    str += replacements[char];
                }
                else if (typeof replacements[char] === 'number') {
                    str += String(replacements[char]);
                }
                else {
                    str += String(replacements[char](date));
                }
            }
            else {
                str += char;
            }
        }
        return str;
    }
    exports.dateFormatter = dateFormatter;
    /**
     * Assigne la balise src de l'image element au contenu de l'image située dans path.
     * @param path string
     * @param element HTMLImageElement
     */
    async function createImgSrc(path, element) {
        const file = await main_5.FILE_HELPER.get(path);
        element.src = file.toURL();
        element.dataset.original = path;
    }
    exports.createImgSrc = createImgSrc;
    /**
     * Convertit un Blob en chaîne base64.
     * @param blob Blob Données binaires à convertir en base64
     */
    function blobToBase64(blob) {
        const reader = new FileReader();
        return new Promise(function (resolve, reject) {
            reader.onload = function () {
                resolve(reader.result);
            };
            reader.onerror = function (e) {
                reject(e);
            };
            reader.readAsDataURL(blob);
        });
    }
    exports.blobToBase64 = blobToBase64;
    /**
     * Convertit une URL (distante, locale, data:base64...) en objet binaire Blob
     * @param str string URL
     */
    function urlToBlob(str) {
        return fetch(str).then(res => res.blob());
    }
    exports.urlToBlob = urlToBlob;
    /**
     * Ouvre un modal informant l'utilisateur
     * @param title string Titre affiché sur le modal
     * @param info string Information
     * @param text_close string Texte affiché sur le bouton de fermeture
     */
    function informalBottomModal(title, info, text_close = "Close") {
        const modal = getBottomModal();
        const instance = initBottomModal();
        modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">${title}</h5>
        <p class="flow-text">${info}</p>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat blue-text modal-close right">${text_close}</a>
        <div class="clearb"></div>
    </div>
    `;
        instance.open();
    }
    exports.informalBottomModal = informalBottomModal;
    /**
     * Ouvre un modal informant l'utilisateur, mais sans possiblité de le fermer. Il devra être fermé via JS
     * @param content Texte affiché
     * @returns {M.Modal} Instance du modal généré
     */
    function unclosableBottomModal(content) {
        const modal = getBottomModal();
        const instance = initBottomModal({ dismissible: false });
        modal.innerHTML = `
    <div class="modal-content">
        ${content}
    </div>
    `;
        instance.open();
        return instance;
    }
    exports.unclosableBottomModal = unclosableBottomModal;
    /**
     * Ouvre un modal demandant à l'utilisateur de cliquer sur oui ou non
     * @param title string Titre affiché sur le modal
     * @param question string Question complète / détails sur l'action qui sera réalisée
     * @param text_yes string Texte affiché sur le bouton de validation
     * @param text_no string Texte affiché sur le bouton d'annulation
     * @param checkbox Texte d'une checkbox
     * @returns {Promise<void | boolean>} Promesse se résolvant quand l'utilisateur approuve, se rompant si l'utilisateur refuse.
     * Si il y a une checkbox, la promesse résolue / rompue reçoit en valeur l'attribut checked de la checkbox
     */
    function askModal(title, question, text_yes = "Yes", text_no = "No", checkbox) {
        const modal = getBottomModal();
        const instance = initBottomModal({ dismissible: false });
        modal.classList.add('unlimited');
        modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">${title}</h5>
        <p class="flow-text">${question}</p>

        ${typeof checkbox !== 'undefined' ? `
            <p class="no-margin-bottom">
                <label>
                    <input type="checkbox" id="__question_checkbox" />
                    <span>${checkbox}</span>
                </label>
            </p>
        ` : ''}
    </div>
    <div class="modal-footer">
        <a href="#!" id="__question_no" class="btn-flat green-text modal-close left">${text_no}</a>
        <a href="#!" id="__question_yes" class="btn-flat red-text modal-close right">${text_yes}</a>
        <div class="clearb"></div>
    </div>
    `;
        instance.open();
        const chk = document.getElementById("__question_checkbox");
        return new Promise(function (resolve, reject) {
            PageManager_1.PageManager.lock_return_button = true;
            document.getElementById('__question_yes').addEventListener('click', () => {
                PageManager_1.PageManager.lock_return_button = false;
                if (chk) {
                    resolve(chk.checked);
                }
                else {
                    resolve();
                }
            });
            document.getElementById('__question_no').addEventListener('click', () => {
                PageManager_1.PageManager.lock_return_button = false;
                if (chk) {
                    reject(chk.checked);
                }
                else {
                    reject();
                }
            });
        });
    }
    exports.askModal = askModal;
    /**
     * Échappe les caractères HTML de la chaîne text
     * @param text string
     */
    function escapeHTML(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    exports.escapeHTML = escapeHTML;
    /**
     * Renvoie une chaîne contenant de l'HTML représentant un message d'information
     * @param title Titre du message
     * @param message Message complémentaire
     */
    function displayInformalMessage(title, message = "") {
        return `
        <div class="absolute-container">
            <div class="absolute-center-container">
                <p class="flow-text grey-text text-lighten-1">
                    ${escapeHTML(title)}
                </p>
                <p class="flow-text">
                    ${escapeHTML(message)}
                </p>
            </div>
        </div>
    `;
    }
    exports.displayInformalMessage = displayInformalMessage;
    /**
     * Renvoie une chaîne contenant de l'HTML représentant un message d'erreur
     * @param title Titre a afficher (sera en rouge)
     * @param message Message complémentaire
     */
    function displayErrorMessage(title, message = "") {
        return `
        <div class="absolute-container">
            <div class="absolute-center-container">
                <p class="rotate-90 big-text smiley grey-text text-lighten-1">:(</p>
                <p class="flow-text red-text text-lighten-1">
                    ${escapeHTML(title)}
                </p>
                <p class="flow-text">
                    ${escapeHTML(message)}
                </p>
            </div>
        </div>
    `;
    }
    exports.displayErrorMessage = displayErrorMessage;
    /**
     * Renvoie vrai si l'utilisateur est en ligne et a une connexion potable.
     */
    function hasGoodConnection() {
        const networkState = navigator.connection.type;
        return networkState !== Connection.NONE && networkState !== Connection.CELL && networkState !== Connection.CELL_2G;
    }
    exports.hasGoodConnection = hasGoodConnection;
    /**
     * Renvoie vrai si l'utilisateur est en ligne.
     */
    function hasConnection() {
        return navigator.connection.type !== Connection.NONE;
    }
    exports.hasConnection = hasConnection;
    /**
     * Convertit une chaîne contenant de l'HTML en un élément.
     * La chaîne ne doit contenir qu'un seul élément à sa racine !
     *
     * @param htmlString
     */
    function convertHTMLToElement(htmlString) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        return tempDiv.firstElementChild;
    }
    exports.convertHTMLToElement = convertHTMLToElement;
    /**
     * Affiche un toast (bulle) native au système d'exploitation
     * @param message
     * @param duration Usually, Android ignores it.
     */
    function showToast(message, duration = 4000) {
        if (device.platform === "browser") {
            M.toast({ html: message, displayLength: duration });
        }
        else {
            // @ts-ignore
            window.plugins.toast.showWithOptions({
                message,
                duration,
                position: "bottom",
                addPixelsY: -250 // (optional) added a negative value to move it up a bit (default 0)
            });
        }
    }
    exports.showToast = showToast;
    /**
     * Convertit les minutes en texte compréhensible
     * @param min
     */
    function convertMinutesToText(min) {
        if (min < 60) {
            return `${min} min`;
        }
        else {
            const hours = Math.trunc(min / 60);
            const minutes = Math.trunc(min % 60);
            return `${hours}h ${minutes || ""}`;
        }
    }
    exports.convertMinutesToText = convertMinutesToText;
    /**
     * Demande à l'utilisateur de choisir parmi une liste
     * @param items Choix possibles. L'insertion d'HTML est autorisé et sera parsé.
     * @returns Index du choix choisi par l'utilisateur
     */
    function askModalList(items) {
        const modal = getBottomModal();
        modal.innerHTML = "";
        const content = document.createElement('div');
        content.classList.add('modal-list');
        modal.appendChild(content);
        return new Promise((resolve, reject) => {
            let resolved = false;
            const instance = initBottomModal({
                onCloseEnd: () => {
                    if (!resolved)
                        reject();
                }
            });
            modal.classList.add('unlimited');
            for (let i = 0; i < items.length; i++) {
                const link = document.createElement('a');
                link.classList.add('modal-list-item', 'flow-text', 'waves-effect');
                link.innerHTML = items[i];
                link.href = "#!";
                link.onclick = () => {
                    resolve(i);
                    resolved = true;
                    instance.close();
                };
                content.appendChild(link);
            }
            instance.open();
        });
    }
    exports.askModalList = askModalList;
    /**
     * Fonction de test: Crée des formulaires automatiques
     * @param count Nombre de formulaires à créer
     */
    async function createRandomForms(count = 50) {
        if (FormSchema_2.Schemas.current_key === null) {
            throw "Unable to create entries without form model";
        }
        const current = FormSchema_2.Schemas.get(FormSchema_2.Schemas.current_key);
        const promises = [];
        for (let i = 0; i < count; i++) {
            const save = {
                fields: {},
                location: "",
                type: FormSchema_2.Schemas.current_key,
                owner: "randomizer",
                metadata: {}
            };
            for (const field of current.fields) {
                switch (field.type) {
                    case FormSchema_2.FormEntityType.bigstring:
                    case FormSchema_2.FormEntityType.string:
                    case FormSchema_2.FormEntityType.datetime:
                    case FormSchema_2.FormEntityType.select:
                    case FormSchema_2.FormEntityType.slider:
                        save.fields[field.name] = generateId(25);
                        break;
                    case FormSchema_2.FormEntityType.integer:
                        save.fields[field.name] = Math.trunc(Math.random() * 1000);
                        break;
                    case FormSchema_2.FormEntityType.float:
                        save.fields[field.name] = Math.random();
                        break;
                    case FormSchema_2.FormEntityType.file:
                    case FormSchema_2.FormEntityType.audio:
                        save.fields[field.name] = null;
                        break;
                    case FormSchema_2.FormEntityType.checkbox:
                        save.fields[field.name] = Math.random() > 0.5;
                        break;
                }
            }
            // Sauvegarde du formulaire
            const id = generateId(20);
            promises.push(main_5.FILE_HELPER.write(FormSaves_2.ENTRIES_DIR + id + ".json", save)
                .then(() => {
                return SyncManager_2.SyncManager.add(id, save);
            }));
            if (main_5.SD_FILE_HELPER) {
                main_5.SD_FILE_HELPER.write(FormSaves_2.ENTRIES_DIR + id + ".json", save).catch(error => console.log(error));
            }
        }
        await Promise.all(promises);
    }
    exports.createRandomForms = createRandomForms;
    /**
     * Obtient les répertoires sur cartes SD montés.
     * Attention, depuis KitKat, la racine de la carte SD n'est PAS accessible en écriture !
     */
    function getSdCardFolder() {
        return new Promise((resolve, reject) => {
            // @ts-ignore
            cordova.plugins.diagnostic.external_storage.getExternalSdCardDetails(resolve, reject);
        });
    }
    exports.getSdCardFolder = getSdCardFolder;
});
define("utils/vocal_recognition", ["require", "exports", "utils/Settings"], function (require, exports, Settings_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // options de la reconnaissance vocale
    let vocal_recognition_options = {
        language: "",
        prompt: "Talk now"
    };
    function talk(sentence) {
        const u = new SpeechSynthesisUtterance();
        u.text = sentence;
        u.lang = 'fr-FR';
        return new Promise((resolve) => {
            u.onend = () => { resolve(); };
            speechSynthesis.speak(u);
        });
    }
    exports.talk = talk;
    /**
     * Récupère le texte dicté par l'utilisateur
     * @param prompt_text Message affiché à l'utilisateur expliquant ce qu'il est censé dire
     * @param as_array Au lieu de renvoyer la phrase la plus probable dite par l'utilisateur, renvoie toutes les possibilités
     * @returns Promesse résolue contenant le texte dicté si réussi. Dans tous les autres cas, promesse rompue.
     */
    function prompt(prompt_text = "Talk now", as_array = false) {
        return new Promise(function (resolve, reject) {
            vocal_recognition_options = {
                language: Settings_4.Settings.voice_lang,
                prompt: prompt_text
            };
            // @ts-ignore
            if (window.plugins && window.plugins.speechRecognition) {
                // @ts-ignore
                window.plugins.speechRecognition.startListening(function (matches) {
                    // Le premier match est toujours le meilleur
                    if (matches.length > 0) {
                        if (as_array) {
                            resolve(matches);
                            return;
                        }
                        resolve(matches[0]);
                    }
                    else {
                        // La reconnaissance a échoué
                        reject();
                    }
                }, function () {
                    // Polyfill pour le navigateur web
                    if (device.platform === "browser") {
                        // @ts-ignore
                        const speech_reco = window.webkitSpeechRecognition || window.SpeechRecognition;
                        const recognition = new speech_reco();
                        recognition.onresult = (event) => {
                            if (event.results && event.results.length > 0) {
                                if (as_array) {
                                    const array = [];
                                    for (const r of event.results) {
                                        for (const e of r) {
                                            array.push(e.transcript);
                                        }
                                    }
                                    resolve(array);
                                    return;
                                }
                                const speechToText = event.results[0][0].transcript;
                                recognition.stop();
                                resolve(speechToText);
                            }
                            else {
                                reject();
                            }
                        };
                        recognition.onerror = reject;
                        recognition.start();
                        M.toast({ html: prompt_text });
                    }
                    else {
                        reject();
                    }
                }, vocal_recognition_options);
            }
            else {
                reject();
            }
        });
    }
    exports.prompt = prompt;
    function testOptionsVersusExpected(options, dicted, match_all = false) {
        const matches = [];
        // Conversion des choses dictées et corrections mineures (genre le a toujours détecté en à)
        dicted = dicted.map(match => match.toLowerCase().replace(/à/g, 'a').replace(/ /g, ''));
        for (const opt of options) {
            const cur_val = opt[0].toLowerCase().replace(/à/g, 'a').replace(/ /g, '');
            for (const match of dicted) {
                // Si les valeurs sans espace sont identiques
                if (cur_val === match) {
                    if (match_all) {
                        matches.push(opt[1]);
                    }
                    else {
                        return opt[1];
                    }
                }
            }
        }
        if (matches.length > 0) {
            return matches;
        }
        return null;
    }
    exports.testOptionsVersusExpected = testOptionsVersusExpected;
    function testMultipleOptionsVesusExpected(options, dicted, keyword = "stop") {
        // Explose en fonction du keyword
        const possibilities = dicted.map(match => match.toLowerCase().split(new RegExp('\\b' + keyword + '\\b', 'i')));
        const finded_possibilities = [];
        for (const p of possibilities) {
            // On va de la plus probable à la moins probable
            const vals = testOptionsVersusExpected(options, p, true);
            if (vals) {
                finded_possibilities.push(vals);
            }
        }
        if (finded_possibilities.length > 0) {
            // Tri en fonction de la taille du tableau (plus grand en premier) et récupère celui qui a le plus de match
            return finded_possibilities.sort((a, b) => b.length - a.length)[0];
        }
        return null;
    }
    exports.testMultipleOptionsVesusExpected = testMultipleOptionsVesusExpected;
});
define("utils/audio_listener", ["require", "exports", "utils/helpers", "utils/logger", "main"], function (require, exports, helpers_5, logger_2, main_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Crée un modal pour enregistrer du son.
     * Retourne une promesse réussie avec RecordResult si un nouvel enregistrement est généré.
     * Si aucun changement n'est fait ou annulation, rejette la promesse.
     *
     * @param title Titre à donner au modal
     * @param default_value Fichier base64 pour faire écouter un enregistrement effectuée précédemment
     */
    function newModalRecord(title, default_value) {
        let recorder = null;
        const modal = helpers_5.getModal();
        const instance = helpers_5.initModal({}, helpers_5.getModalPreloader("Loading"));
        instance.open();
        let audioContent = null;
        let blobSize = 0;
        modal.innerHTML = `
    <div class="modal-content">
        <h5 style="margin-top: 0;">${title}</h5>
        <p style="margin-top: 0; margin-bottom: 25px;">Approach your microphone from the source, then tap record.</p>
        <a href="#!" class="btn col s12 orange" id="__media_record_record">Record</a>
        <a href="#!" class="btn hide col s12 red" id="__media_record_stop">Stop</a>
        <div class=clearb></div>
        <div id="__media_record_player" class="modal-record-audio-player">${default_value ? `
            <figure>
                <figcaption>Record</figcaption>
                <audio controls src="${default_value}"></audio>
            </figure>
        ` : ''}</div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat green-text right ${default_value ? "" : "hide"}" id="__media_record_save">Save</a>
        <a href="#!" class="btn-flat red-text left" id="__media_record_cancel">Cancel</a>
        <div class="clearb"></div>
    </div>
    `;
        const btn_start = document.getElementById('__media_record_record');
        const btn_stop = document.getElementById('__media_record_stop');
        const btn_confirm = document.getElementById('__media_record_save');
        const btn_cancel = document.getElementById('__media_record_cancel');
        const player = document.getElementById('__media_record_player');
        function startRecording() {
            btn_start.classList.add('hide');
            player.innerHTML = `<p class='flow-text center'>
            Loading...
        </p>`;
            // @ts-ignore MicRecorder, credit to https://github.com/closeio/mic-recorder-to-mp3
            recorder = new MicRecorder({
                bitRate: main_6.MP3_BITRATE
            });
            recorder.start().then(function () {
                player.innerHTML = `<p class='flow-text center'>
                <i class='material-icons blink fast v-bottom red-text'>mic</i><br>
                Recording
            </p>`;
                btn_stop.classList.remove('hide');
            }).catch((e) => {
                logger_2.Logger.error("Unable to start record.", e);
                player.innerHTML = "<p class='flow-text center red-text bold-text'>Unable to start record.</p>";
            });
        }
        function stopRecording() {
            // Once you are done singing your best song, stop and get the mp3.
            btn_stop.classList.add('hide');
            player.innerHTML = "<p class='flow-text center'>Conversion in progress...</p>";
            recorder
                .stop()
                .getMp3()
                .then(([, blob]) => {
                blobSize = blob.size;
                return helpers_5.blobToBase64(blob);
            })
                .then((base64) => {
                audioContent = base64;
                btn_confirm.classList.remove('hide');
                player.innerHTML = `<figure>
                    <figcaption>Record</figcaption>
                    <audio controls src="${base64}"></audio>
                </figure>`;
                btn_start.classList.remove('hide');
            })
                .catch((e) => {
                M.toast({ html: 'Unable to read your record' });
                logger_2.Logger.error("Failed to record:", e.message);
            });
        }
        //add events to those 2 buttons
        btn_start.addEventListener("click", startRecording);
        btn_stop.addEventListener("click", stopRecording);
        return new Promise((resolve, reject) => {
            btn_confirm.onclick = function () {
                instance.close();
                // Clean le modal et donc les variables associées
                modal.innerHTML = "";
                if (audioContent) {
                    const duration = (blobSize / (main_6.MP3_BITRATE * 1000)) * 8;
                    resolve({
                        content: audioContent,
                        duration
                    });
                }
                // Rien n'a changé.
                reject();
            };
            btn_cancel.onclick = function () {
                instance.close();
                // Clean le modal et donc les variables associées
                modal.innerHTML = "";
                try {
                    if (recorder)
                        recorder.stop();
                }
                catch (e) { }
                reject();
            };
        });
    }
    exports.newModalRecord = newModalRecord;
});
define("utils/location", ["require", "exports", "utils/helpers"], function (require, exports, helpers_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UNKNOWN_NAME = "__unknown__";
    const UNKNOWN_LABEL = "Lieu inconnu";
    /**
     * Crée le sélecteur de localisation
     *
     * @param container Conteneur (usuellement, .modal-content)
     * @param input Champ sur lequel on va choisir (usuellement, un document.createElement('input') suffit)
     * @param locations Localisations possibles
     * @param open_on_complete Ouvrir Google Maps quand l'utilisateur clique sur une suggestion
     * @param with_unknown Ajouter un champ "\_\_unknown\_\_"
     */
    function createLocationInputSelector(container, input, locations, open_on_complete = false, with_unknown = false) {
        const row = document.createElement('div');
        row.classList.add('row');
        container.appendChild(row);
        input.autocomplete = "off";
        const input_f = document.createElement('div');
        input_f.classList.add('input-field', 'col', 's12');
        row.appendChild(input_f);
        // Champ input réel et son label
        const label = document.createElement('label');
        input.type = "text";
        input.id = "autocomplete_field_id";
        label.htmlFor = "autocomplete_field_id";
        label.textContent = "Place";
        input.classList.add('autocomplete');
        input_f.appendChild(input);
        input_f.appendChild(label);
        // Initialisation de l'autocomplétion
        const auto_complete_data = {};
        for (const lieu in locations) {
            let key = lieu + " - " + locations[lieu].label;
            auto_complete_data[key] = null;
        }
        if (with_unknown) {
            auto_complete_data[exports.UNKNOWN_NAME + " - " + UNKNOWN_LABEL] = null;
        }
        // Création d'un objet clé => [nom, "latitude,longitude"]
        const labels_to_name = {};
        for (const lieu in locations) {
            let key = lieu + " - " + locations[lieu].label;
            labels_to_name[key] = [lieu, String(locations[lieu].latitude) + "," + String(locations[lieu].longitude)];
        }
        if (with_unknown) {
            labels_to_name[exports.UNKNOWN_NAME + " - " + UNKNOWN_LABEL] = [exports.UNKNOWN_NAME, ""];
        }
        // Lance l'autocomplétion materialize
        M.Autocomplete.init(input, {
            data: auto_complete_data,
            limit: 5,
            onAutocomplete: function () {
                // Remplacement du label par le nom réel
                const location = input.value;
                // Recherche le label sélectionné dans l'objet les contenants
                if (location in labels_to_name) {
                    if (open_on_complete) {
                        window.open("geo:" + labels_to_name[location][1] +
                            "?q=" + labels_to_name[location][1] + "&z=zoom&mode=w", '_system');
                        // Clean de l'input
                        input.value = "";
                    }
                }
                else {
                    helpers_6.showToast("This place does not exists.");
                }
            }
        });
        return labels_to_name;
    }
    exports.createLocationInputSelector = createLocationInputSelector;
});
define("utils/save_a_form", ["require", "exports", "main", "utils/helpers", "base/UserManager", "base/PageManager", "utils/logger", "base/SyncManager", "utils/location", "base/FormSaves"], function (require, exports, main_7, helpers_7, UserManager_3, PageManager_2, Logger_1, SyncManager_3, location_1, FormSaves_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function scrollToAnElementOnClick(element_base, element_related, modal, center = false) {
        element_base.onclick = () => {
            const element_middle = element_related.clientHeight;
            $([document.documentElement, document.body]).animate({
                scrollTop: ($(element_related).offset().top) - (center ? (window.innerHeight / 2) - (element_middle / 2) : 20)
            }, 500, function () {
                $(element_related).fadeOut(300, function () {
                    $(this).fadeIn(200);
                });
            });
            modal.close();
        };
    }
    /**
     * Lance la vérification des champs pour ensuite sauvegarder le formulaire
     * @param type Type de formulaire (ex: cincle_plongeur)
     * @param current_form
     * @param force_name? Force un identifiant pour le form à enregistrer
     * @param form_save? Précédente sauvegarde du formulaire
     */
    async function beginFormSave(type, current_form, force_name, form_save) {
        // Ouverture du modal de verification
        const modal = helpers_7.getModal();
        const instance = helpers_7.initModal({ dismissible: false, outDuration: 100 }, helpers_7.getModalPreloader("Checking form...", `<div class="modal-footer">
            <a href="#!" class="btn-flat red-text modal-close">Cancel</a>
        </div>`));
        instance.open();
        // Attend que le modal s'ouvre proprement (ralentissements sinon)
        await helpers_7.sleep(300);
        modal.classList.add('modal-fixed-footer');
        // Recherche des éléments à vérifier
        const elements_failed = [];
        const elements_warn = [];
        const location_element = document.getElementById('__location__id');
        let location_str = null;
        if (location_element) {
            location_str = location_element.dataset.reallocation;
        }
        // Vérifie le lieu si le lieu est défini 
        // (si il n'est pas requis, affiche un warning, sinon une erreur)
        if (!current_form.no_location && !location_str) {
            if (current_form.skip_location)
                elements_warn.push(["Location", "No place has been selected.", location_element.parentElement]);
            else
                elements_failed.push(["Location", "No place has been selected.", location_element.parentElement]);
        }
        if (location_str === location_1.UNKNOWN_NAME) {
            elements_warn.push(["Location", "Choosen place is an inexistant place.", location_element.parentElement]);
        }
        // Input classiques: checkbox/slider, text, textarea, select, number
        for (const e of document.getElementsByClassName('input-form-element')) {
            const element = e;
            const label = document.querySelector(`label[for="${element.id}"]`);
            let name = element.name;
            if (label) {
                name = label.textContent;
            }
            const contraintes = {};
            if (element.dataset.constraints) {
                element.dataset.constraints.split(';').map((e) => {
                    const [name, value] = e.split('=');
                    contraintes[name] = value;
                });
            }
            // Si c'est une checkbox, on regarde si elle est indéterminée
            if (element.tagName === "INPUT" && element.type === "checkbox") {
                if (element.indeterminate) {
                    if (element.required) {
                        elements_failed.push([element.nextElementSibling.innerText, "Required field.", element.parentElement]);
                    }
                    else {
                        elements_warn.push([element.nextElementSibling.innerText, "You have not interacted with this field.", element.parentElement]);
                    }
                }
            }
            // Si l'élément est requis mais qu'il n'a aucune valeur
            else if (element.required && !element.value) {
                if (element.tagName !== "SELECT" || (element.multiple && $(element).val().length === 0)) {
                    elements_failed.push([name, "Required field.", element.parentElement]);
                }
            }
            else {
                let str = "";
                // Si le champ est requis et a une valeur, on recherche ses contraintes
                if (Object.keys(contraintes).length > 0 || element.type === "number") {
                    if (element.type === "text" || element.tagName === "textarea") {
                        if (typeof contraintes.min !== 'undefined' && element.value.length < contraintes.min) {
                            str += "Text length should be equal or greater to " + contraintes.min + " characters. ";
                        }
                        if (typeof contraintes.max !== 'undefined' && element.value.length > contraintes.max) {
                            str += "Text length should be equal or less than " + contraintes.max + " characters. ";
                        }
                    }
                    else if (element.type === "number" && element.value !== "") {
                        if (element.validity.rangeUnderflow) {
                            str += "Number should be equal or greater to " + element.min + ". ";
                        }
                        if (element.validity.rangeOverflow) {
                            str += "Number should be equal or less than " + element.max + ". ";
                        }
                        // Vérification de la précision
                        if (element.step) {
                            if (element.validity.stepMismatch) {
                                str += "Number should have a precision of " + element.step + ". ";
                            }
                            else if (element.value.indexOf('.') === -1) {
                                str += "Number should have floating point. ";
                            }
                        }
                    }
                }
                // On vérifie que le champ n'a pas un "suggested_not_blank"
                // Le warning ne peut pas s'afficher pour les éléments non requis: de toute façon, si ils
                // sont vides, la vérification lève une erreur fatale.
                if (contraintes.suggest && !element.required && element.value === "") {
                    str += "This element should not be empty. ";
                }
                if (str) {
                    if (element.required) {
                        elements_failed.push([name, str, element.parentElement]);
                    }
                    else {
                        elements_warn.push([name, str, element.parentElement]);
                    }
                }
                // Si c'est autre chose, l'élément est forcément valide
            }
        }
        // Éléments IMAGE
        for (const e of document.querySelectorAll('.input-image-element[required]')) {
            const filei = e;
            if (filei.files.length === 0) {
                const label = document.querySelector(`input[data-for="${filei.id}"]`);
                let name = filei.name;
                if (label) {
                    name = label.dataset.label;
                }
                elements_failed.push([name, "Required image", filei.parentElement]);
            }
        }
        // Éléments FILE
        for (const e of document.querySelectorAll('.input-fileitem-element[required]')) {
            const filei = e;
            if (filei.files.length === 0) {
                const label = document.querySelector(`input[data-for="${filei.id}"]`);
                let name = filei.name;
                if (label) {
                    name = label.dataset.label;
                }
                elements_failed.push([name, "Required file", filei.parentElement]);
            }
        }
        // Éléments AUDIO (avec le modal permettant d'enregistrer du son)
        for (const e of document.querySelectorAll('.input-audio-element[required]')) {
            const hiddeni = e;
            if (!hiddeni.value) {
                elements_failed.push([hiddeni.dataset.label, "Required audio record", hiddeni.parentElement]);
            }
        }
        // Construit les éléments dans le modal
        const container = document.createElement('div');
        container.classList.add('modal-content');
        if (elements_warn.length > 0 || elements_failed.length > 0) {
            const par = document.createElement('p');
            par.classList.add('flow-text', 'no-margin-top');
            par.innerText = (!elements_failed.length ? 'Potential e' : 'E') + "rrors has been detected.";
            container.appendChild(par);
            if (!elements_failed.length) {
                const tinypar = document.createElement('p');
                tinypar.style.marginTop = "-15px";
                tinypar.innerText = "Please check your typing.";
                container.appendChild(tinypar);
            }
            const list = document.createElement('ul');
            list.classList.add('collection');
            for (const error of elements_failed) {
                const li = document.createElement('li');
                li.classList.add("collection-item");
                li.innerHTML = `
                <span class="red-text bold">${error[0]}</span>: 
                <span>${error[1]}</span>
            `;
                if (main_7.ENABLE_SCROLL_ON_FORM_VERIFICATION_CLICK) {
                    scrollToAnElementOnClick(li, error[2], instance, main_7.SCROLL_TO_CENTER_ON_FORM_VERIFICATION_CLICK);
                }
                list.appendChild(li);
            }
            for (const warning of elements_warn) {
                const li = document.createElement('li');
                li.classList.add("collection-item");
                li.innerHTML = `
                <span class="bold">${warning[0]}</span>: 
                <span>${warning[1]}</span>
            `;
                if (main_7.ENABLE_SCROLL_ON_FORM_VERIFICATION_CLICK) {
                    scrollToAnElementOnClick(li, warning[2], instance, main_7.SCROLL_TO_CENTER_ON_FORM_VERIFICATION_CLICK);
                }
                list.appendChild(li);
            }
            container.appendChild(list);
        }
        else {
            // On affiche un message de succès
            const title = document.createElement('h5');
            title.classList.add('no-margin-top');
            title.innerText = "Sum up";
            container.appendChild(title);
            const par = document.createElement('p');
            par.classList.add('flow-text');
            par.innerText = "This entry does not contains errors. You could save your work now.";
            container.appendChild(par);
        }
        // Footer
        const footer = document.createElement('div');
        footer.classList.add('modal-footer');
        const cancel_btn = document.createElement('a');
        cancel_btn.href = "#!";
        cancel_btn.classList.add('btn-flat', 'left', 'modal-close', 'red-text');
        cancel_btn.innerText = "Correct";
        footer.appendChild(cancel_btn);
        // Si aucun élément requis n'est oublié ou invalide, alors on autorise la sauvegarde
        if (elements_failed.length === 0) {
            const save_btn = document.createElement('a');
            save_btn.href = "#!";
            save_btn.classList.add('btn-flat', 'right', 'green-text');
            save_btn.innerText = "Save";
            save_btn.onclick = function () {
                modal.innerHTML = helpers_7.getModalPreloader("Save in progress");
                modal.classList.remove('modal-fixed-footer');
                const unique_id = force_name || helpers_7.generateId(main_7.ID_COMPLEXITY);
                PageManager_2.PageManager.lock_return_button = true;
                saveForm(type, unique_id, location_str, form_save)
                    .then((form_values) => {
                    SyncManager_3.SyncManager.add(unique_id, form_values);
                    if (form_save) {
                        instance.close();
                        helpers_7.showToast("Entry has been saved successfully.");
                        // On vient de la page d'édition de formulaire déjà créés
                        PageManager_2.PageManager.pop();
                        // PageManager.reload(); la page se recharge toute seule au pop
                    }
                    else {
                        // On demande si on veut faire une nouvelle entrée
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="no-margin-top">Entry saved successfully</h5>
                            <p class="flow-text">
                                Do you want to begin a new entry ?
                            </p>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" id="__after_save_entries" class="modal-close btn-flat blue-text left">No</a>
                            <a href="#!" id="__after_save_new" class="modal-close btn-flat green-text right">Yes</a>
                            <div class="clearb"></div>
                        </div>
                        `;
                        document.getElementById('__after_save_entries').onclick = function () {
                            PageManager_2.PageManager.change(PageManager_2.AppPages.saved, false);
                        };
                        document.getElementById('__after_save_new').onclick = function () {
                            setTimeout(() => {
                                PageManager_2.PageManager.reload(undefined, true);
                            }, 150);
                        };
                    }
                })
                    .catch((error) => {
                    modal.innerHTML = `
                    <div class="modal-content">
                        <h5 class="no-margin-top red-text">Error</h5>
                        <p class="flow-text">
                            Unable to save this entry.
                            Please try again.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <a href="#!" class="btn-flat right red-text modal-close">Close</a>
                        <div class="clearb"></div>
                    </div>
                    `;
                    PageManager_2.PageManager.lock_return_button = false;
                    Logger_1.Logger.error(error, error.message, error.stack);
                });
            };
            footer.appendChild(save_btn);
        }
        const clearb = document.createElement('div');
        clearb.classList.add('clearb');
        footer.appendChild(clearb);
        modal.innerHTML = "";
        modal.appendChild(container);
        modal.appendChild(footer);
    }
    exports.beginFormSave = beginFormSave;
    /**
     * Sauvegarde le formulaire actuel dans un fichier .json
     * @param type Type du formulaire à sauvegarder
     * @param name ID du formulaire
     * @param location Localisation choisie par l'utilisateur (peut être chaîne vide si non précisée)
     * @param form_save Ancienne sauvegarde (si mode édition)
     */
    function saveForm(type, name, location, form_save) {
        // On construit l'objet représentant une sauvegarde
        const form_values = {
            fields: {},
            type,
            location,
            owner: (form_save ? form_save.owner : UserManager_3.UserManager.username),
            metadata: {}
        };
        // On récupère les valeurs des éléments "classiques" (hors fichiers)
        for (const input of document.getElementsByClassName('input-form-element')) {
            const i = input;
            if (input.tagName === "SELECT" && input.multiple) {
                const selected = [...input.options].filter(option => option.selected).map(option => option.value);
                form_values.fields[i.name] = selected;
            }
            else if (i.type === "checkbox") {
                if (i.classList.contains("input-slider-element")) {
                    // C'est un slider
                    form_values.fields[i.name] = (i.checked ? i.dataset.ifchecked : i.dataset.ifunchecked);
                }
                else {
                    // C'est une checkbox classique
                    if (i.indeterminate) {
                        form_values.fields[i.name] = null;
                    }
                    else {
                        form_values.fields[i.name] = i.checked;
                    }
                }
            }
            else if (i.type === "number") {
                form_values.fields[i.name] = i.value === "" ? null : Number(i.value);
            }
            else {
                form_values.fields[i.name] = i.value;
            }
        }
        return FormSaves_3.FormSaves.save(name, form_values, form_save);
    }
    exports.saveForm = saveForm;
    /**
     * __DEPRECATED__ : cette fonctionnalité a été supprimée.
     * Valide les contraintes externes d'un champ
     * @param constraints
     * @param e
     * @deprecated
     */
    function validConstraints(constraints, e) {
        const cons = constraints.split(';');
        const form = document.getElementById('__main_form__id');
        for (const c of cons) {
            const actual = c.split('=');
            // Supprime le possible ! à la fin de actual[0]
            const name = actual[0].replace(/!$/, '');
            const champ = form.elements[name];
            if (!champ) { // Le champ n'existe pas
                console.log('field does not exists');
                continue;
            }
            if (actual[0][actual[0].length - 1] === '!') {
                // Différent de
                if (actual[1] === '*' && champ.value) {
                    // On veut que champ n'ait aucune valeur
                    return false;
                }
                else if (actual[1] === '^' && champ.value === e.value) {
                    // On veut que champ ait une valeur différente de e
                    return false;
                }
                else if (champ.value === actual[1]) {
                    // On veut que champ ait une valeur différente de actual[1]
                    return false;
                }
            }
            else {
                // Champ name égal à
                if (actual[1] === '*' && !champ.value) {
                    // On veut que champ ait une valeur
                    return false;
                }
                else if (actual[1] === '^' && champ.value !== e.value) {
                    // On veut que champ ait une valeur identique à e
                    return false;
                }
                else if (champ.value !== actual[1]) {
                    // On veut que champ ait une valeur identique à actual[1]
                    return false;
                }
            }
        }
        return true;
    }
    exports.validConstraints = validConstraints;
});
define("pages/form", ["require", "exports", "utils/vocal_recognition", "base/FormSchema", "utils/helpers", "main", "base/PageManager", "utils/logger", "utils/audio_listener", "base/UserManager", "utils/location", "base/FileHelper", "utils/save_a_form", "base/FormSaves"], function (require, exports, vocal_recognition_1, FormSchema_3, helpers_8, main_8, PageManager_3, logger_3, audio_listener_1, UserManager_4, location_2, FileHelper_4, save_a_form_1, FormSaves_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Crée une base classique dans lequel insérer un input texte ou number.
     */
    function createInputWrapper() {
        const e = document.createElement('div');
        e.classList.add("row", "input-field", "col", "s12");
        return e;
    }
    /**
     * Crée automatiquement le tip d'invalidité d'un champ
     * @param wrapper Wrapper dans lequel est l'input
     * @param ele Champ
     */
    function createTip(wrapper, ele) {
        if (ele.tip_on_invalid) {
            const tip = document.createElement('div');
            tip.classList.add('invalid-tip');
            tip.innerText = ele.tip_on_invalid;
            tip.style.display = 'none';
            wrapper.appendChild(tip);
        }
        return wrapper;
    }
    /**
     * Montre ou cache le tip d'invalidité
     * @param current La plupart du temps, l'input. Doit être l'élément **AVANT** le tip dans le DOM.
     * @param show Montrer: oui ou non
     */
    function showHideTip(current, show) {
        if (current.nextElementSibling && current.nextElementSibling.classList.contains("invalid-tip")) {
            // Si il y a un tip, on le fait appraître
            if (show)
                $(current.nextElementSibling).slideDown(200);
            else
                $(current.nextElementSibling).slideUp(200);
        }
    }
    /**
     * Classe le champ comme valide.
     * @param e Element input
     * @param force_element
     */
    function setValid(e, force_element) {
        e.classList.add('valid');
        e.classList.remove('invalid');
        e.dataset.valid = "1";
        showHideTip(force_element || e, false);
    }
    /**
     * Classe le champ comme invalide.
     * @param e Element input
     * @param force_element
     */
    function setInvalid(e, force_element) {
        if (e.value === "" && !e.required) {
            setValid(e);
            return;
        }
        e.classList.add('invalid');
        e.classList.remove('valid');
        e.dataset.valid = "0";
        showHideTip(force_element || e, true);
    }
    /**
     * Remplit les champs standards de l'input (id, name, required)...
     * @param htmle Input / Select dans lequel écrire
     * @param ele Champ de formulaire lié à l'input
     * @param label Label lié à l'input (optionnel)
     */
    function fillStandardInputValues(htmle, ele, label) {
        htmle.id = "id_" + ele.name;
        htmle.name = ele.name;
        htmle.required = ele.required;
        if (htmle.tagName !== "SELECT" && ele.placeholder) {
            htmle.placeholder = ele.placeholder;
        }
        if (label) {
            label.htmlFor = htmle.id;
            label.innerText = ele.label;
        }
        if (htmle.tagName === "INPUT" && htmle.type === "checkbox") {
            htmle.dataset.valid = "1";
            htmle.checked = ele.default_value;
        }
        else {
            htmle.dataset.valid = ele.required ? "0" : "1";
            htmle.value = ele.default_value || "";
        }
        return htmle;
    }
    /**
     * Construit le formulaire automatiquement passé via "current_form"
     * @param placeh Élement HTML dans lequel écrire le formulaire
     * @param current_form Formulaire courant
     * @param filled_form Formulaire déjà rempli (utilisé pour l'édition)
     */
    function constructForm(placeh, current_form, edition_mode) {
        const filled_form = edition_mode ? edition_mode.save : undefined;
        const filled_form_id = edition_mode ? edition_mode.name : undefined;
        // Si le formulaire accepte la localisation
        if (!current_form.no_location) {
            // Crée le champ de lieu
            const loc_wrapper = document.createElement('div');
            loc_wrapper.classList.add('input-field', 'row', 'col', 's12');
            const location = document.createElement('input');
            location.type = "text";
            location.readOnly = true;
            location.name = "__location__";
            location.id = "__location__id";
            location.addEventListener('click', function () {
                this.blur(); // Retire le focus pour éviter de pouvoir écrire dedans
                callLocationSelector(current_form); // Appelle le modal pour changer de lieu
            });
            if (filled_form) {
                location.value = location.dataset.reallocation = filled_form.location || "";
                // Recherche la vraie localisation (textuelle) dans Form.location
                const label_location = (filled_form.location in current_form.locations ?
                    current_form.locations[filled_form.location] :
                    null);
                if (label_location) {
                    location.value = `${filled_form.location} - ${label_location.label}`;
                }
                else if (filled_form.location !== null) {
                    helpers_8.showToast("Warning: Entry location does not exists in form model.");
                }
            }
            loc_wrapper.appendChild(location);
            const loc_title = document.createElement('h4');
            loc_title.innerText = "Place";
            placeh.appendChild(loc_title);
            placeh.appendChild(loc_wrapper);
            // Fin champ de lieu, itération sur champs
        }
        for (const ele of current_form.fields) {
            let element_to_add = null;
            if (ele.type === FormSchema_3.FormEntityType.divider) {
                // C'est un titre
                // On divide
                const clearer = document.createElement('div');
                clearer.classList.add('clearb');
                placeh.appendChild(clearer);
                const htmle = document.createElement('h4');
                htmle.innerText = ele.label;
                htmle.id = "id_" + ele.name;
                placeh.appendChild(htmle);
                continue;
            }
            else if (ele.type === FormSchema_3.FormEntityType.integer || ele.type === FormSchema_3.FormEntityType.float) {
                const real_wrapper = document.createElement('div');
                const wrapper = createInputWrapper();
                if (ele.allow_voice_control) {
                    wrapper.classList.add('s11');
                    wrapper.classList.remove('s12');
                }
                const htmle = document.createElement('input');
                htmle.autocomplete = "off";
                const label = document.createElement('label');
                fillStandardInputValues(htmle, ele, label);
                htmle.type = "number";
                htmle.classList.add('input-form-element');
                if (ele.range) {
                    if (typeof ele.range.min !== 'undefined') {
                        htmle.min = String(ele.range.min);
                    }
                    if (typeof ele.range.max !== 'undefined') {
                        htmle.max = String(ele.range.max);
                    }
                }
                if (ele.type === FormSchema_3.FormEntityType.float && ele.float_precision) {
                    htmle.step = String(ele.float_precision);
                }
                // On vérifie si le champ a un message de suggestion si non rempli
                const contraintes = [];
                if (ele.suggested_not_blank) {
                    contraintes.push(["suggest", "true"]);
                }
                htmle.dataset.constraints = contraintes.map(e => e.join('=')).join(';');
                wrapper.appendChild(label);
                wrapper.appendChild(htmle);
                createTip(wrapper, ele);
                if (filled_form && ele.name in filled_form.fields) {
                    htmle.value = filled_form.fields[ele.name];
                }
                // Attachage de l'évènement de vérification
                const num_verif = function () {
                    let valid = true;
                    let value;
                    try {
                        value = Number(this.value);
                    }
                    catch (e) {
                        valid = false;
                    }
                    if (!this.checkValidity()) {
                        valid = false;
                    }
                    if (typeof value === 'number' && value === value) {
                        if (typeof ele.range.min !== 'undefined' && value < ele.range.min) {
                            valid = false;
                        }
                        else if (typeof ele.range.max !== 'undefined' && value > ele.range.max) {
                            valid = false;
                        }
                        // if différent, il est juste en else if pour éviter de faire les
                        // calculs si le valid est déjà à false
                        else if (ele.type === FormSchema_3.FormEntityType.float) {
                            const floating_point = this.value.split('.');
                            if (floating_point.length === 1) {
                                //Il n'y a pas de . dans le nombre
                                valid = false;
                            }
                        }
                        else if (this.value.indexOf(".") !== -1) {
                            // Ce doit forcément être un entier,
                            // donc si on trouve un point
                            valid = false;
                        }
                    }
                    else {
                        valid = false;
                    }
                    if (valid) {
                        setValid(this);
                    }
                    else {
                        setInvalid(this);
                    }
                };
                htmle.addEventListener('change', num_verif);
                real_wrapper.appendChild(wrapper);
                if (ele.allow_voice_control) {
                    // On ajoute le bouton micro
                    const mic_btn = document.createElement('div');
                    mic_btn.classList.add('col', 's1', 'mic-wrapper');
                    mic_btn.style.paddingRight = "0";
                    mic_btn.innerHTML = `<i class="material-icons red-text">mic</i>`;
                    mic_btn.firstChild.addEventListener('click', function () {
                        vocal_recognition_1.prompt().then(function (value) {
                            const val = value;
                            value = val.replace(/ /g, '').replace(/,/g, '.').replace(/-/g, '.');
                            if (!isNaN(Number(value))) {
                                htmle.value = value;
                                num_verif.call(htmle);
                                M.updateTextFields();
                            }
                            else {
                                // Affichage forcé en toast Materialize:
                                // La reconnaissance vocale ouvre un toast natif qui masquerait celui-ci
                                M.toast({ html: "Unknown number recognized." });
                            }
                        });
                    });
                    real_wrapper.appendChild(mic_btn);
                }
                element_to_add = real_wrapper;
            }
            else if (ele.type === FormSchema_3.FormEntityType.string || ele.type === FormSchema_3.FormEntityType.bigstring) {
                const real_wrapper = document.createElement('div');
                const wrapper = createInputWrapper();
                let htmle;
                if (ele.type === FormSchema_3.FormEntityType.string) {
                    htmle = document.createElement('input');
                    htmle.type = "text";
                    htmle.autocomplete = "off";
                }
                else {
                    htmle = document.createElement('textarea');
                    htmle.classList.add('materialize-textarea');
                }
                if (ele.allow_voice_control) {
                    wrapper.classList.add('s11');
                    wrapper.classList.remove('s12');
                }
                htmle.classList.add('input-form-element');
                const label = document.createElement('label');
                fillStandardInputValues(htmle, ele, label);
                if (filled_form && ele.name in filled_form.fields) {
                    htmle.value = filled_form.fields[ele.name];
                }
                wrapper.appendChild(label);
                wrapper.appendChild(htmle);
                createTip(wrapper, ele);
                // Définition des contraintes
                const contraintes = [];
                if (typeof ele.range !== 'undefined') {
                    if (typeof ele.range.min !== 'undefined') {
                        contraintes.push(["min", ele.range.min]);
                    }
                    if (typeof ele.range.max !== 'undefined') {
                        contraintes.push(["max", ele.range.max]);
                    }
                }
                if (ele.suggested_not_blank) {
                    contraintes.push(["suggest", "true"]);
                }
                htmle.dataset.constraints = contraintes.map(e => e.join('=')).join(';');
                // Attachage de l'évènement de vérification
                const str_verif = function () {
                    let valid = true;
                    let value = this.value;
                    if (typeof value === 'string') {
                        if (typeof ele.range !== 'undefined') {
                            if (typeof ele.range.min !== 'undefined' && value.length < ele.range.min) {
                                valid = false;
                            }
                            else if (typeof ele.range.max !== 'undefined' && value.length > ele.range.max) {
                                valid = false;
                            }
                            if (value.length === 0 && ele.suggested_not_blank) {
                                valid = false;
                            }
                        }
                    }
                    else {
                        valid = false;
                    }
                    if (valid) {
                        setValid(this);
                    }
                    else {
                        setInvalid(this);
                    }
                };
                htmle.addEventListener('change', str_verif);
                real_wrapper.appendChild(wrapper);
                if (ele.allow_voice_control) {
                    // On ajoute le bouton micro
                    const mic_btn = document.createElement('div');
                    mic_btn.classList.add('col', 's1', 'mic-wrapper');
                    mic_btn.style.paddingRight = "0";
                    mic_btn.innerHTML = `<i class="material-icons red-text">mic</i>`;
                    const voice_replacements = ele.voice_control_replacements ?
                        ele.voice_control_replacements :
                        [[' ', ''], ['à', 'a'], ['-', '']];
                    let timer;
                    const gestion_click = function (erase = true) {
                        vocal_recognition_1.prompt().then(function (value) {
                            let val = value;
                            if (ele.remove_whitespaces) {
                                for (const [regex, replacement] of voice_replacements) {
                                    val = val.replace(new RegExp(regex, "iug"), replacement);
                                }
                            }
                            if (erase) {
                                htmle.value = val;
                            }
                            else {
                                htmle.value += val;
                            }
                            str_verif.call(htmle);
                            M.updateTextFields();
                            try {
                                M.textareaAutoResize(htmle);
                            }
                            catch (e) { }
                        });
                        timer = 0;
                    };
                    mic_btn.firstChild.addEventListener('click', function () {
                        if (timer) {
                            clearTimeout(timer);
                            // On a double cliqué
                            gestion_click(false);
                            return;
                        }
                        timer = setTimeout(gestion_click, 400);
                    });
                    real_wrapper.appendChild(mic_btn);
                }
                element_to_add = real_wrapper;
            }
            else if (ele.type === FormSchema_3.FormEntityType.select) {
                const real_wrapper = document.createElement('div');
                const wrapper = createInputWrapper();
                const htmle = document.createElement('select');
                const label = document.createElement('label');
                htmle.classList.add('input-form-element');
                fillStandardInputValues(htmle, ele, label);
                // Création des options
                htmle.multiple = ele.select_options.multiple;
                if (!htmle.multiple) {
                    htmle.dataset.valid = "1";
                }
                for (const opt of ele.select_options.options) {
                    const htmlopt = document.createElement('option');
                    htmlopt.selected = opt.selected;
                    htmlopt.value = opt.value;
                    htmlopt.innerText = opt.label;
                    htmle.appendChild(htmlopt);
                }
                if (htmle.multiple && ele.required) {
                    // On doit mettre un évènement pour vérifier si le select est vide
                    // Attachage de l'évènement de vérification
                    const select_verif = function () {
                        let value = this.value;
                        if (value) {
                            setValid(this);
                        }
                        else {
                            setInvalid(this);
                        }
                    };
                    htmle.addEventListener('change', select_verif);
                }
                if (filled_form && ele.name in filled_form.fields) {
                    if (ele.select_options.multiple) {
                        $(htmle).val(filled_form.fields[ele.name]);
                    }
                    else {
                        htmle.value = filled_form.fields[ele.name];
                    }
                }
                wrapper.appendChild(htmle);
                wrapper.appendChild(label);
                /// Gestion du voice control
                real_wrapper.appendChild(wrapper);
                if (ele.allow_voice_control) {
                    wrapper.classList.add('s11');
                    wrapper.classList.remove('s12');
                    const mic_btn = document.createElement('div');
                    mic_btn.classList.add('col', 's1', 'mic-wrapper');
                    mic_btn.style.paddingRight = "0";
                    mic_btn.innerHTML = `<i class="material-icons red-text">mic</i>`;
                    const sel_opt = Array.from(htmle.options).map(e => [e.label, e.value]);
                    mic_btn.firstChild.addEventListener('click', function () {
                        vocal_recognition_1.prompt("Speak now", true).then(function (value) {
                            let val;
                            if (htmle.multiple)
                                val = vocal_recognition_1.testMultipleOptionsVesusExpected(sel_opt, value);
                            else
                                val = vocal_recognition_1.testOptionsVersusExpected(sel_opt, value);
                            if (val) {
                                $(htmle).val(val);
                                // On réinitialise le select
                                const instance = M.FormSelect.getInstance(htmle);
                                if (instance) {
                                    instance.destroy();
                                }
                                M.FormSelect.init(htmle);
                            }
                            else {
                                // Force M.toast: Les toasts natifs ne s'affichent pas à cause du toast affiché par Google
                                M.toast({ html: "Any option has matched your speech" });
                            }
                        });
                    });
                    real_wrapper.appendChild(mic_btn);
                }
                htmle.dataset.invalid_tip = ele.tip_on_invalid || "";
                // Évènement pour le select: si select multiple.required
                if (htmle.multiple) {
                    // Création du tip
                    createTip(wrapper, ele);
                    htmle.addEventListener('change', function () {
                        let valid = true;
                        if (this.multiple && this.required && $(this).val().length === 0) {
                            valid = false;
                        }
                        if (valid) {
                            setValid(this, label);
                        }
                        else {
                            setInvalid(this, label);
                        }
                    });
                }
                element_to_add = real_wrapper;
            }
            else if (ele.type === FormSchema_3.FormEntityType.checkbox) {
                const wrapper = document.createElement('p');
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = "checkbox";
                const span = document.createElement('span');
                fillStandardInputValues(input, ele, span);
                wrapper.classList.add('row', 'col', 's12', 'input-checkbox', 'flex-center-aligner');
                input.classList.add('input-form-element');
                if (filled_form && ele.name in filled_form.fields && typeof filled_form.fields[ele.name] === 'boolean') {
                    input.checked = filled_form.fields[ele.name];
                }
                else if (ele.indeterminate) {
                    input.indeterminate = true;
                }
                wrapper.appendChild(label);
                label.appendChild(input);
                label.appendChild(span);
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            else if (ele.type === FormSchema_3.FormEntityType.datetime) {
                const wrapper = createInputWrapper();
                const input = document.createElement('input');
                const label = document.createElement('label');
                // Pour que le label ne recouvre pas le texte du champ
                label.classList.add('active');
                input.type = "datetime-local";
                input.classList.add('input-form-element');
                fillStandardInputValues(input, ele, label);
                // les datetime sont TOUJOURS valides, si ils sont pleins
                input.dataset.valid = "1";
                if (filled_form && ele.name in filled_form.fields) {
                    input.value = filled_form.fields[ele.name];
                }
                else {
                    // Problème: la date à entrer dans l'input est la date UTC
                    // On "corrige" ça par manipulation de la date (on rajoute l'offset)
                    let date_plus_timezone = new Date();
                    date_plus_timezone.setTime(date_plus_timezone.getTime() + (-date_plus_timezone.getTimezoneOffset() * 60 * 1000));
                    const date_str = date_plus_timezone.toISOString();
                    input.value = date_str.substring(0, date_str.length - 8);
                }
                wrapper.appendChild(label);
                wrapper.appendChild(input);
                element_to_add = wrapper;
            }
            else if (ele.type === FormSchema_3.FormEntityType.date) {
                const wrapper = createInputWrapper();
                const input = document.createElement('input');
                const label = document.createElement('label');
                // Pour que le label ne recouvre pas le texte du champ
                label.classList.add('active');
                input.type = "date";
                input.classList.add('input-form-element');
                fillStandardInputValues(input, ele, label);
                // les date sont TOUJOURS valides, si ils sont pleins
                input.dataset.valid = "1";
                if (filled_form && ele.name in filled_form.fields) {
                    input.value = filled_form.fields[ele.name];
                }
                else {
                    // Définition de la valeur par défaut = date actuelle
                    input.value = helpers_8.dateFormatter("Y-m-d");
                }
                wrapper.appendChild(label);
                wrapper.appendChild(input);
                element_to_add = wrapper;
            }
            else if (ele.type === FormSchema_3.FormEntityType.time) {
                const wrapper = createInputWrapper();
                const input = document.createElement('input');
                const label = document.createElement('label');
                // Pour que le label ne recouvre pas le texte du champ
                label.classList.add('active');
                input.type = "time";
                input.classList.add('input-form-element');
                fillStandardInputValues(input, ele, label);
                // les date sont TOUJOURS valides, si ils sont pleins
                input.dataset.valid = "1";
                if (filled_form && ele.name in filled_form.fields) {
                    input.value = filled_form.fields[ele.name];
                }
                else {
                    // Définition de la valeur par défaut = date actuelle
                    input.value = helpers_8.dateFormatter("H:i");
                }
                wrapper.appendChild(label);
                wrapper.appendChild(input);
                element_to_add = wrapper;
            }
            else if (ele.type === FormSchema_3.FormEntityType.image || ele.type === FormSchema_3.FormEntityType.file) {
                //// Attention ////
                // L'input de type file pour les images, sur android,
                // ne propose pas le choix entre prendre une nouvelle photo
                // et choisir une image enregistrée. Le choix est FORCÉMENT
                // de choisir une image enregistrée. 
                // Le problème peut être contourné en créant un input personnalisé
                // avec choix en utilisant navigator.camera et le plugin cordova camera.
                const is_image = FormSchema_3.FormEntityType.image === ele.type || ele.file_type === "image/*";
                let delete_file_btn = null;
                const input = document.createElement('input');
                const real_wrapper = document.createElement('div');
                real_wrapper.className = "row col s12 no-margin-bottom";
                if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                    if (is_image) {
                        // L'input file est déjà présent dans le formulaire
                        // on affiche une miniature
                        const img_miniature = document.createElement('div');
                        img_miniature.classList.add('image-form-wrapper', 'relative-container');
                        const img_balise = document.createElement('img');
                        img_balise.classList.add('img-form-element');
                        helpers_8.createImgSrc(FormSaves_4.METADATA_DIR + filled_form_id + "/" + filled_form.fields[ele.name], img_balise);
                        img_miniature.appendChild(img_balise);
                        placeh.appendChild(img_miniature);
                        // On crée un bouton "supprimer ce fichier"
                        delete_file_btn = document.createElement('div');
                        delete_file_btn.className = "remove-img-btn";
                        delete_file_btn.innerHTML = "<i class='material-icons'>close</i>";
                        delete_file_btn.onclick = () => {
                            helpers_8.askModal("Remove this file ?", "")
                                .then(() => {
                                // On set un flag qui permettra, à la sauvegarde, de supprimer l'ancien fichier
                                input.dataset.toremove = "true";
                                img_miniature.remove();
                            })
                                .catch(() => { });
                        };
                        img_miniature.appendChild(delete_file_btn);
                    }
                    else {
                        const description = document.createElement('p');
                        description.className = "flow-text col s12";
                        description.innerText = "File " + filled_form.fields[ele.name] + " is saved.";
                        placeh.appendChild(description);
                        delete_file_btn = document.createElement('div');
                        delete_file_btn.className = "btn-flat col s12 red-text btn-small-margins center";
                        delete_file_btn.innerText = "Delete this file";
                        delete_file_btn.onclick = () => {
                            helpers_8.askModal("Delete this file ?", "")
                                .then(() => {
                                // On set un flag qui permettra, à la sauvegarde, de supprimer l'ancien fichier
                                input.dataset.toremove = "true";
                                input.value = "";
                                delete_file_btn.remove();
                                description.remove();
                            })
                                .catch(() => { });
                        };
                    }
                }
                // Input de type file
                const wrapper = document.createElement('div');
                wrapper.classList.add('file-field', 'input-field');
                const divbtn = document.createElement('div');
                divbtn.classList.add('btn');
                const span = document.createElement('span');
                input.type = "file";
                input.id = "id_" + ele.name;
                input.name = ele.name;
                input.required = ele.required;
                input.accept = ele.file_type || "";
                if (is_image) {
                    input.classList.add('input-image-element');
                    span.innerText = "Image";
                }
                else {
                    input.classList.add('input-fileitem-element');
                    span.innerText = "File";
                }
                divbtn.appendChild(span);
                divbtn.appendChild(input);
                wrapper.appendChild(divbtn);
                const fwrapper = document.createElement('div');
                fwrapper.classList.add('file-path-wrapper');
                const f_input = document.createElement('input');
                f_input.type = "text";
                f_input.classList.add('file-path', 'validate');
                f_input.value = ele.label;
                // Construit le label à retenir pour pouvoir afficher son titre dans le modal de confirmation
                f_input.dataset.label = ele.label;
                f_input.dataset.for = input.id;
                fwrapper.appendChild(f_input);
                wrapper.appendChild(fwrapper);
                real_wrapper.appendChild(wrapper);
                placeh.appendChild(real_wrapper);
                // Sépare les champ input file
                placeh.insertAdjacentHTML('beforeend', "<div class='clearb'></div><div class='divider divider-margin'></div>");
            }
            else if (ele.type === FormSchema_3.FormEntityType.audio) {
                // Création d'un bouton pour enregistrer du son
                const wrapper = document.createElement('div');
                wrapper.classList.add('input-field', 'row', 'col', 's12', 'no-margin-top');
                const label = document.createElement('p');
                label.classList.add('no-margin-top', 'form-audio-label');
                label.innerText = ele.label;
                wrapper.appendChild(label);
                const button = document.createElement('button');
                button.classList.add('btn', 'blue', 'col', 's12', 'btn-perso');
                button.innerText = "Audio record";
                button.type = "button";
                const real_input = document.createElement('input');
                real_input.type = "hidden";
                real_input.classList.add('input-audio-element');
                // Construit le label à retenir pour pouvoir afficher son titre dans le modal de confirmation
                real_input.dataset.label = ele.label;
                // Création d'un label vide pour l'input
                const hidden_label = document.createElement('label');
                let delete_file_btn = null;
                fillStandardInputValues(real_input, ele, hidden_label);
                hidden_label.classList.add('hide');
                wrapper.appendChild(hidden_label);
                ////// Définition si un fichier son existe déjà
                if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                    main_8.FILE_HELPER.read(FormSaves_4.METADATA_DIR + filled_form_id + "/" + filled_form.fields[ele.name], FileHelper_4.FileHelperReadMode.url)
                        .then(base64 => {
                        button.classList.remove('blue');
                        button.classList.add('green');
                        real_input.value = base64;
                        const duration = ((base64.length * 0.7) / (main_8.MP3_BITRATE * 1000)) * 8;
                        button.innerText = "Record (" + duration.toFixed(0) + "s" + ")";
                    })
                        .catch(err => {
                        logger_3.Logger.warn("Unable to load file", err);
                    });
                    // On crée un bouton "supprimer ce fichier"
                    // pour supprimer l'entrée existante
                    delete_file_btn = document.createElement('div');
                    delete_file_btn.className = "btn-flat col s12 red-text btn-small-margins center";
                    delete_file_btn.innerText = "Delete this file";
                    delete_file_btn.onclick = () => {
                        helpers_8.askModal("Delete this file ?", "")
                            .then(() => {
                            // On set un flag qui permettra, à la sauvegarde, de supprimer l'ancien fichier
                            real_input.dataset.toremove = "true";
                            real_input.value = "";
                            delete_file_btn.remove();
                            button.className = 'btn blue col s12 btn-perso';
                            button.innerText = "Audio record";
                        })
                            .catch(() => { });
                    };
                }
                ////// Fin
                button.addEventListener('click', function () {
                    // Crée un modal qui sert à enregistrer de l'audio
                    audio_listener_1.newModalRecord(ele.label, real_input.value)
                        .then(recres => {
                        real_input.value = recres.content;
                        real_input.dataset.duration = recres.duration.toString();
                        // Met à jour le bouton
                        button.innerText = "Record (" + recres.duration.toFixed(0) + "s" + ")";
                        button.classList.remove('blue');
                        button.classList.add('green');
                    })
                        .catch(() => { }); // Rien n'a changé
                });
                wrapper.appendChild(button);
                wrapper.appendChild(real_input);
                if (delete_file_btn)
                    wrapper.append(delete_file_btn);
                element_to_add = wrapper;
            }
            else if (ele.type === FormSchema_3.FormEntityType.slider) {
                const real_wrapper = document.createElement('div');
                real_wrapper.classList.add('row', 'col', 's12');
                const text_label = document.createElement('div');
                text_label.classList.add('flow-text', 'col', 's12', 'center');
                text_label.innerText = ele.label;
                real_wrapper.appendChild(text_label);
                const wrapper = document.createElement('div');
                real_wrapper.appendChild(wrapper);
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = "checkbox";
                const span = document.createElement('span');
                fillStandardInputValues(input, ele);
                wrapper.classList.add('input-slider', 'switch', 'flex-center-aligner', 'col', 's12');
                input.classList.add('input-form-element', 'input-slider-element');
                span.classList.add('lever');
                wrapper.appendChild(label);
                // Texte si not checked
                label.insertAdjacentText('afterbegin', ele.slider_options[0].label);
                label.appendChild(input);
                label.appendChild(span);
                // Texte si checked
                label.insertAdjacentText('beforeend', ele.slider_options[1].label);
                // Insertion des deux options dans l'input en data-
                input.dataset.ifunchecked = ele.slider_options[0].name;
                input.dataset.ifchecked = ele.slider_options[1].name;
                if (filled_form && ele.name in filled_form.fields) {
                    input.checked = ele.slider_options[1].name === filled_form.fields[ele.name];
                }
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = real_wrapper;
            }
            if (element_to_add)
                placeh.appendChild(element_to_add);
        }
    }
    exports.constructForm = constructForm;
    /**
     * Fonction qui va faire attendre l'arrivée du formulaire,
     * puis charger la page
     * @param base
     * @param edition_mode
     */
    function initFormPage(base, edition_mode) {
        if (edition_mode) {
            loadFormPage(base, edition_mode.form, edition_mode);
        }
        else {
            FormSchema_3.Schemas.onReady(function (_, current) {
                if (FormSchema_3.Schemas.current_key === null) {
                    // Aucun formulaire n'est chargé !
                    base.innerHTML = helpers_8.displayErrorMessage("No form model is loaded.", "Select model to use in settings.");
                    PageManager_3.PageManager.should_wait = false;
                }
                else {
                    loadFormPage(base, current, edition_mode);
                }
            });
        }
    }
    exports.initFormPage = initFormPage;
    /**
     * Charge la page de formulaire (point d'entrée)
     * @param base Element dans lequel écrire la page
     * @param current_form
     * @param edition_mode
     */
    function loadFormPage(base, current_form, edition_mode) {
        base.innerHTML = "";
        if (!edition_mode && !UserManager_4.UserManager.logged) {
            // Si on est en mode création et qu'on est pas connecté
            base.innerHTML = base.innerHTML = helpers_8.displayErrorMessage("You have to login to register a new entry.", "Login in settings.");
            PageManager_3.PageManager.should_wait = false;
            return;
        }
        const base_block = document.createElement('div');
        base_block.classList.add('row', 'container');
        const placeh = document.createElement('form');
        placeh.classList.add('col', 's12');
        placeh.id = "__main_form__id";
        base_block.appendChild(placeh);
        // Appelle la fonction pour construire
        if (edition_mode) {
            constructForm(placeh, current_form, edition_mode);
        }
        else {
            constructForm(placeh, current_form);
        }
        base.appendChild(base_block);
        M.updateTextFields();
        $('select').formSelect();
        // Lance le sélecteur de localisation uniquement si on est pas en mode édition et si le formulaire autorise les lieux
        if (!edition_mode) {
            if (!(current_form.no_location || current_form.skip_location)) {
                callLocationSelector(current_form);
            }
        }
        // Autoredimensionnement des textaera si valeur par défaut
        const $textarea = $('textarea');
        if ($textarea.length > 0) {
            M.textareaAutoResize($textarea);
        }
        // Création du bouton de sauvegarde
        const btn = document.createElement('div');
        btn.classList.add('btn-flat', 'right', 'red-text');
        btn.innerText = "Complete";
        const current_form_key = FormSchema_3.Schemas.current_key;
        btn.addEventListener('click', function () {
            if (edition_mode) {
                save_a_form_1.beginFormSave(edition_mode.save.type, current_form, edition_mode.name, edition_mode.save);
            }
            else {
                try {
                    save_a_form_1.beginFormSave(current_form_key, current_form);
                }
                catch (e) {
                    logger_3.Logger.error(JSON.stringify(e));
                }
            }
        });
        base_block.appendChild(btn);
    }
    exports.loadFormPage = loadFormPage;
    /**
     * Annule la sélection de lieu
     * @param required true si le lieu est obligatoire. (une suggestion vers page précédente sera présentée si annulation)
     */
    function cancelGeoLocModal(required = true) {
        // On veut fermer; Deux possibilités.
        // Si le champ lieu est déjà défini et rempli, on ferme juste le modal
        if (!required || document.getElementById("__location__id").value.trim() !== "") {
            // On ferme juste le modal
        }
        else {
            // Sinon, on ramène à la page précédente
            PageManager_3.PageManager.back();
        }
        helpers_8.getModalInstance().close();
        helpers_8.getModal().classList.remove('modal-fixed-footer');
    }
    /**
     * Charge le sélecteur de localisation depuis un schéma de formulaire
     * @param current_form Schéma de formulaire chargé
     */
    function callLocationSelector(current_form) {
        // Obtient l'élément HTML du modal
        const modal = helpers_8.getModal();
        const instance = helpers_8.initModal({
            dismissible: false, preventScrolling: true
        });
        // Ouvre le modal et insère un chargeur
        instance.open();
        modal.innerHTML = helpers_8.getModalPreloader("Finding your location...\nThis could take up to 30 seconds", `<div class="modal-footer">
            <a href="#!" id="dontloc-footer-geoloc" class="btn-flat blue-text left">Manual mode</a>
            <a href="#!" id="close-footer-geoloc" class="btn-flat red-text">Cancel</a>
            <div class="clearb"></div>
        </div>`);
        let is_loc_canceled = false;
        document.getElementById("close-footer-geoloc").onclick = function () {
            is_loc_canceled = true;
            cancelGeoLocModal(!current_form.skip_location);
        };
        document.getElementById('dontloc-footer-geoloc').onclick = function () {
            is_loc_canceled = true;
            locationSelector(modal, current_form.locations, false, !current_form.skip_location);
        };
        // Cherche la localisation et remplit le modal
        helpers_8.getLocation(function (coords) {
            if (!is_loc_canceled)
                locationSelector(modal, current_form.locations, coords, !current_form.skip_location);
        }, function () {
            if (!is_loc_canceled)
                locationSelector(modal, current_form.locations, undefined, !current_form.skip_location);
        });
    }
    /**
     * Formate une distance en mètres en texte lisible par un humain.
     * @param distance Distance en mètres
     */
    function textDistance(distance) {
        const unit = (distance >= 1000 ? "km" : "m");
        const str_distance = (distance >= 1000 ? (distance / 1000).toFixed(1) : distance.toString());
        return `${str_distance} ${unit}`;
    }
    /**
     * Charge le sélecteur de lieu dans le modal
     * @param modal Élément modal
     * @param locations Localisations disponibles pour ce formulaire
     * @param current_location Position actuelle. Si échec de localisation, undefined. Si explicitement non donnée, false.
     * @param required true si le lieu est obligatoire. (une suggestion vers page précédente sera présentée si annulation)
     */
    function locationSelector(modal, locations, current_location, required = true) {
        // Met le modal en modal avec footer fixé
        modal.classList.add('modal-fixed-footer');
        // Crée le contenu du modal et son footer
        const content = document.createElement('div');
        content.classList.add('modal-content');
        const footer = document.createElement('div');
        footer.classList.add('modal-footer');
        // Création de l'input qui va contenir le lieu
        const input = document.createElement('input');
        // Sélection manuelle
        const title = document.createElement('h5');
        title.innerText = "Manual select";
        content.appendChild(title);
        // Vide le modal actuel et le remplace par le contenu et footer créés
        modal.innerHTML = "";
        modal.appendChild(content);
        const labels_to_name = location_2.createLocationInputSelector(content, input, locations, undefined, true);
        // Construction de la liste de lieux si la location est trouvée
        if (current_location) {
            // Création de la fonction qui va gérer le cas où l'on appuie sur un lieu
            function clickOnLocation() {
                input.value = this.dataset.name + " - " + this.dataset.label;
                M.updateTextFields();
            }
            // Calcul de la distance entre chaque lieu et le lieu actuel
            let lieux_dispo = [];
            for (const lieu in locations) {
                lieux_dispo.push({
                    name: lieu,
                    label: locations[lieu].label,
                    distance: helpers_8.calculateDistance(current_location.coords, locations[lieu])
                });
            }
            lieux_dispo = lieux_dispo.sort((a, b) => a.distance - b.distance);
            // Titre
            const title = document.createElement('h5');
            title.innerText = "Near locations";
            content.appendChild(title);
            // Construction de la liste des lieux proches
            const collection = document.createElement('div');
            collection.classList.add('collection');
            for (let i = 0; i < lieux_dispo.length && i < main_8.MAX_LIEUX_AFFICHES; i++) {
                const elem = document.createElement('a');
                elem.href = "#!";
                elem.classList.add('collection-item');
                elem.innerHTML = `
                ${lieux_dispo[i].name} - ${lieux_dispo[i].label}
                <span class="right grey-text lighten-1">${textDistance(lieux_dispo[i].distance)}</span>
            `;
                elem.dataset.name = lieux_dispo[i].name;
                elem.dataset.label = lieux_dispo[i].label;
                elem.addEventListener('click', clickOnLocation);
                collection.appendChild(elem);
            }
            content.appendChild(collection);
        }
        else if (current_location === false) {
            // On affiche aucun texte dans ce cas.
            // (écran de sélection manuelle expréssément demandé)
        }
        else {
            // Affichage d'une erreur: géolocalisation impossible
            const error = document.createElement('h6');
            error.classList.add('red-text');
            error.innerText = "Unable to find your location.";
            const subtext = document.createElement('div');
            subtext.classList.add('red-text', 'flow-text');
            subtext.innerText = "Please choose a place.";
            content.appendChild(error);
            content.appendChild(subtext);
        }
        // Création du footer
        const ok = document.createElement('a');
        ok.href = "#!";
        ok.innerText = "Confirmer";
        ok.classList.add("btn-flat", "green-text", "right");
        ok.addEventListener('click', function () {
            if (input.value.trim() === "") {
                helpers_8.showToast("You must specify a place.");
            }
            else if (input.value in labels_to_name) {
                const loc_input = document.getElementById('__location__id');
                loc_input.value = input.value;
                // On stocke la clé de la localisation dans reallocation
                loc_input.dataset.reallocation = labels_to_name[input.value][0];
                helpers_8.getModalInstance().close();
                modal.classList.remove('modal-fixed-footer');
            }
            else {
                helpers_8.showToast("Entered place has no matching correspondance in places database.");
            }
        });
        footer.appendChild(ok);
        // Création du bouton annuler
        const cancel = document.createElement('a');
        cancel.href = "#!";
        cancel.innerText = "Annuler";
        cancel.classList.add("btn-flat", "red-text", "left");
        cancel.addEventListener('click', () => { cancelGeoLocModal(required); });
        footer.appendChild(cancel);
        modal.appendChild(footer);
    }
});
define("utils/test_vocal_reco", ["require", "exports", "utils/vocal_recognition"], function (require, exports, vocal_recognition_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /// FICHIER DE TEST DE LA RECONNAISSANCE VOCALE
    function launchQuizz(base) {
        const if_bad_answer = [
            "Oups, mauvaise réponse",
            "Vous vous êtes planté !"
        ];
        const if_good_answer = [
            "Oui, la bonne réponse était bien * !",
            "Bravo, vous avez trouvé la bonne réponse !",
            "Excellent, vous avez trouvé !"
        ];
        const list_question_rep = {
            "Combien font 4 x 8 ?": "32",
            "Qui est l'actuel premier ministre?": "Édouard Philippe",
            "Quel pays a remporté la coupe du monde de football en 2014?": "Allemagne",
            "Dans quelle ville italienne se situe l'action de Roméo et Juliette?": "Vérone",
            "Comment désigne-t-on une belle-mère cruelle?": "Marâtre",
            "Qui était le dieu de la guerre dans la mythologie grecque?": "Arès",
            "Quel est le plus long fleuve de France?": "Loire",
            "Quel animal est Pan-pan dans Bambi?": "Lapin",
            "Avec la laine de quel animal fait-on du cachemire?": "Chèvre",
            "Quelle est la première ville du monde à s'être dotée d'un métro?": "Londres",
            "Dans quel état des Etats-Unis le Grand Canyon se trouve-t-il?": "Arizona",
            "Combien de paires de côtes possède-t-on?": ["Douze", "12"],
            "En géométrie, quel adjectif qualifie un angle de 180 degrés ?": "plat",
            "En quelle année fut posé le premier pas sur la lune ?": "1969",
            "Quel os du squelette humain est le plus long et le plus solide?": "Fémur",
            "Quel arbre est connu pour être le plus grand au monde?": "Séquoia",
            "Quelle est l'unité de la tension électrique?": "Volt",
            "De quel animal le Sphinx de Gizeh a-t-il le corps?": "Lion",
            "Quel est le premier long métrage d'animation de Disney?": "Blanche-neige",
            "Quelle partie de l'oeil est colorée?": "Iris",
            "Quel pays a décidé de quitter l'Union Européenne en 2016?": ["Angleterre", "Royaume-Uni"],
            "Quelle est la plus grande planète du système solaire?": "Jupiter",
            "Quelle est la plus grande artère du corps?": "Aorte",
            "Quelle est la capitale de l’Inde?": "New Delhi",
            "Quel est le nom du principal indice boursier de la place de Paris ?": "CAC 40",
            "Qu’est-ce qu’un ouistiti ?": "singe",
            "Qui etait le président français en 1995 ?": ["Jacques Chirac", "Chirac"],
            "Quel légume entre dans la composition du tzatziki ?": "concombre",
            "De quel pays, les Beatles sont-ils originaires ?": ["Angleterre", "Royaume-Uni"],
            "Quel acteur français a été l’image de la marque de pâtes Barilla dans les années 90 ?": "Depardieu",
            "Quel animal est l'emblème de la marque automobile Ferrari ?": "cheval",
            "Dans la mythologie grecque qui est le maitre des dieux ?": "Zeus",
            "De quel pays la pizza est elle originaire ?": "Italie",
            "Quel est le dessert préféré d’Homer Simpson ?": "donuts",
            "Que trouve-t-on généralement au fond d'un verre de Martini ?": "Olive",
        };
        base.innerHTML = `
    <div class="container">
    <h4 class="center">RomuQuizz</h4>
    <div class="divider divider-margin"></div>

    <div class="card-panel card-perso flow-text">
        <span class="blue-text text-darken-2">Question:</span>
        <span class="orange-text text-darken-3" id="__question_visual"></span>
    </div>

    <p class="flow-text center" id="__question_tip"></p>

    <div class="center center-block">
        <div class="btn red" id="__question_speak"><i class="material-icons left">mic</i>Parler</div>
    </div>

    <div class="clearb"></div>
    <div class="divider divider-margin"></div>

    <div class="center center-block">
        <div class="btn green" id="__question_other">Autre question !</div>
    </div>
    </div>
    `;
        const question_text = document.getElementById('__question_visual');
        const answer_btn = document.getElementById('__question_speak');
        const message_block = document.getElementById('__question_tip');
        const new_question = document.getElementById('__question_other');
        let actual_question = "";
        answer_btn.onclick = function () {
            vocal_recognition_2.prompt(actual_question, true)
                .then(values => {
                message_block.classList.remove('blue-text', 'red-text');
                if (parseAnswer(values)) {
                    // Trouvé !
                    const response = list_question_rep[actual_question];
                    const rep = (typeof response === 'string' ? response : response.join('/'));
                    const spoken = if_good_answer[Math.floor(Math.random() * if_good_answer.length)];
                    vocal_recognition_2.talk(spoken.replace('*', rep));
                    message_block.classList.add('blue-text');
                    message_block.innerText = "Bravo, vous avez trouvé la bonne réponse : " + rep + " !";
                }
                else {
                    vocal_recognition_2.talk(if_bad_answer[Math.floor(Math.random() * if_bad_answer.length)]);
                    message_block.classList.add('red-text');
                    message_block.innerText = "Mauvaise réponse !";
                }
            })
                .catch(() => {
                vocal_recognition_2.talk("Veuillez répéter");
                message_block.classList.remove('blue-text');
                message_block.classList.add('red-text');
                message_block.innerText = "J'ai eu du mal à vous entendre...";
            });
        };
        new_question.onclick = newQuestion;
        function parseAnswer(possible_responses) {
            console.log(possible_responses);
            const p_r = list_question_rep[actual_question];
            if (typeof p_r === 'string') {
                for (const rep of possible_responses) {
                    if (rep.toLowerCase().includes(p_r.toLowerCase())) {
                        return true;
                    }
                }
            }
            else {
                for (const rep of possible_responses) {
                    for (const answ of p_r) {
                        if (rep.toLowerCase().includes(answ.toLowerCase())) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        function newQuestion() {
            const keys = Object.keys(list_question_rep);
            let position;
            do {
                position = Math.floor(Math.random() * ((keys.length - 1) + 1));
            } while (actual_question === keys[position]);
            actual_question = keys[position];
            question_text.innerText = actual_question;
            message_block.innerText = "";
            vocal_recognition_2.talk(actual_question);
        }
        newQuestion();
    }
    exports.launchQuizz = launchQuizz;
});
define("pages/home", ["require", "exports", "base/UserManager", "base/SyncManager", "utils/helpers", "main", "base/FormSchema", "utils/location", "utils/test_vocal_reco", "base/FormSaves"], function (require, exports, UserManager_5, SyncManager_4, helpers_9, main_9, FormSchema_4, location_3, test_vocal_reco_1, FormSaves_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.APP_NAME = "Busy Bird";
    async function initHomePage(base) {
        base.innerHTML = `
    <div class="flex-center-aligner home-top-element">
        <img id="__home_logo_clicker" src="img/logo.png" class="home-logo">
    </div>
    <div class="container relative-container">
        <span class="very-tiny-text version-text">Version ${main_9.APP_VERSION}</span>
        <p class="flow-text center">
            Welcome to ${exports.APP_NAME}, the application that makes specie tracking easy !
        </p>
        <p class="flow-text red-text">
            ${!UserManager_5.UserManager.logged ? `
                You are not currently logged in. You will not be able to make new entries
                without being authentificated. Please log in into settings.
            ` : ''}
        </p>
        <div id="__home_container"></div>
    </div>
    `;
        //////// TEST ////////
        createTestHome();
        //////// ENDTEST ////////
        const home_container = document.getElementById('__home_container');
        // Calcul du nombre de formulaires en attente de synchronisation
        try {
            const remaining_count = await SyncManager_4.SyncManager.remainingToSync();
            if (helpers_9.hasGoodConnection()) {
                if (remaining_count > 15) {
                    home_container.innerHTML = createCardPanel(`<span class="blue-text text-darken-2">You have many elements to sync (${remaining_count} entries).</span><br>
                    <span class="blue-text text-darken-2">Please go to the entries section to start synchronisation.</span>`, "Synchronisation");
                }
                else if (remaining_count > 0) {
                    home_container.innerHTML = createCardPanel(`<span class="blue-text text-darken-2">
                        You have ${remaining_count} waiting to sync entr${remaining_count > 1 ? 'ies' : 'y'}.
                    </span>`);
                }
            }
            else if (remaining_count > 0) {
                home_container.innerHTML = createCardPanel(`
                <span class="blue-text text-darken-2">You have entries that wait synchronisation.</span><br>
                <span class="red-text text-darken-2">When you'll have a good Internet connection again,</span>
                <span class="blue-text text-darken-2">please start a new synchronisation.</span>`);
            }
        }
        catch (e) {
            home_container.innerHTML = createCardPanel(`<span class="red-text text-darken-2">Unable to fetch waiting to sync entries.</span><br>
            <span class="red-text text-darken-2">This error could be serious.</span>`, "Error");
        }
        // Montre l'utilisateur connecté
        if (UserManager_5.UserManager.logged) {
            home_container.insertAdjacentHTML('beforeend', createCardPanel(`<span class="grey-text text-darken-1">${UserManager_5.UserManager.username}</span>
            <span class="blue-text text-darken-2">is logged in.</span>`));
        }
        // Nombre de formulaires enregistrés sur l'appareil
        try {
            let nb_files;
            try {
                nb_files = (await main_9.FILE_HELPER.ls(FormSaves_5.ENTRIES_DIR)).length;
            }
            catch (e) {
                nb_files = 0;
                await main_9.FILE_HELPER.mkdir(FormSaves_5.ENTRIES_DIR);
            }
            home_container.insertAdjacentHTML('beforeend', createCardPanel(`<span class="blue-text text-darken-2">${nb_files === 0 ? 'No' : nb_files} entr${nb_files > 1 ? 'ies' : 'y'} 
            ${nb_files > 1 ? 'are' : 'is'} stored into this device.</span>`));
        }
        catch (e) {
            // Impossible d'obtenir les fichiers
            home_container.insertAdjacentHTML('beforeend', createCardPanel(`<span class="red-text text-darken-2">Unable to list existing files into this devices.</span><br>
            <span class="red-text text-darken-2">This error could be serious. Please check your internal storage.</span>`));
        }
        if (FormSchema_4.Schemas.current_key !== null) {
            const locations = FormSchema_4.Schemas.current.locations;
            if (Object.keys(locations).length > 0) {
                // Navigation vers nichoir
                home_container.insertAdjacentHTML('beforeend', `<div class="divider divider-margin big"></div>
                <h6 style="margin-left: 10px; font-size: 1.25rem">Navigate to an habitat of ${FormSchema_4.Schemas.current.name.toLowerCase()}</h6>`);
                location_3.createLocationInputSelector(home_container, document.createElement('input'), locations, true);
            }
        }
        // Initialise les champs materialize et le select
        M.updateTextFields();
        $('select').formSelect();
    }
    exports.initHomePage = initHomePage;
    function createCardPanel(html_text, title) {
        return `
        <div class="card-panel card-perso">
            ${title ? `<h6 class="no-margin-top">${title}</h6>` : ''}
            <p class="flow-text no-margin-top no-margin-bottom">${html_text}</p>
        </div>
    `;
    }
    function createTestHome() {
        let click_count = 0;
        let timeout_click;
        let allow_to_click_to_terrain = false;
        document.getElementById('__home_logo_clicker').onclick = function () {
            if (timeout_click)
                clearTimeout(timeout_click);
            timeout_click = 0;
            click_count++;
            if (click_count === 5) {
                timeout_click = setTimeout(function () {
                    allow_to_click_to_terrain = true;
                    setTimeout(function () {
                        allow_to_click_to_terrain = false;
                    }, 20000);
                }, 1500);
            }
            else {
                timeout_click = setTimeout(function () {
                    click_count = 0;
                }, 400);
            }
        };
        const version_t = document.querySelector('.relative-container span.version-text');
        version_t.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (allow_to_click_to_terrain) {
                test_vocal_reco_1.launchQuizz(helpers_9.getBase());
            }
        };
    }
});
define("pages/settings_page", ["require", "exports", "base/UserManager", "base/FormSchema", "utils/helpers", "base/SyncManager", "base/PageManager", "utils/fetch_timeout", "main", "pages/home", "utils/Settings"], function (require, exports, UserManager_6, FormSchema_5, helpers_10, SyncManager_5, PageManager_4, fetch_timeout_3, main_10, home_1, Settings_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    fetch_timeout_3 = __importDefault(fetch_timeout_3);
    let select_for_schema = null;
    /**
     * Lance la mise à jour des schémas via le serveur
     */
    function formActualisationModal() {
        const instance = helpers_10.initModal({ dismissible: false }, helpers_10.getModalPreloader("Updating..."));
        instance.open();
        FormSchema_5.Schemas.forceSchemaDownloadFromServer()
            .then(() => {
            helpers_10.showToast("Update complete.");
            instance.close();
            PageManager_4.PageManager.reload();
        })
            .catch(() => {
            helpers_10.showToast("Unable to update form models.");
            instance.close();
        });
    }
    function constructSelectForSchemas(select) {
        select_for_schema = select;
        select.innerHTML = "";
        const available = [["", "None"], ...FormSchema_5.Schemas.available()];
        for (const option of available) {
            const o = document.createElement('option');
            o.value = option[0];
            o.innerText = option[1];
            if (option[0] === FormSchema_5.Schemas.current_key || (option[0] === "" && FormSchema_5.Schemas.current_key === null)) {
                o.selected = true;
            }
            select.appendChild(o);
        }
        M.FormSelect.init(select);
    }
    /**
     * Base pour la page des paramètres
     * @param base Element dans lequel écrire
     */
    function initSettingsPage(base) {
        const connecte = UserManager_6.UserManager.logged;
        base.innerHTML = `
    <div class="container row" id="main_settings_container">
        <h4>User</h4>
        <p class="flow-text no-margin-bottom">${UserManager_6.UserManager.logged ?
            "You are currently logged as <span class='orange-text text-darken-2'>" + UserManager_6.UserManager.username + "</span>"
            : "You are not logged in"}.</p>
    </div>
    `;
        ////// DEFINITION DU BOUTON DE CONNEXION
        const container = document.getElementById('main_settings_container');
        const button = document.createElement('button');
        container.appendChild(button);
        if (connecte) {
            button.type = "button";
            button.innerHTML = "Log out";
            button.classList.remove('blue');
            button.classList.add('col', 's12', 'red', 'btn', 'btn-perso', 'btn-margins');
            button.onclick = function () {
                helpers_10.askModal("Log out ?", "You can't make new entries until you're logged in again.")
                    .then(function () {
                    // L'utilisateur veut se déconnecter
                    UserManager_6.UserManager.unlog();
                    PageManager_4.PageManager.reload();
                })
                    .catch(function () {
                    // L'utilisateur ne se déconnecte pas, finalement
                });
            };
        }
        else {
            button.type = "button";
            button.innerHTML = "Login";
            button.classList.remove('red');
            button.classList.add('col', 's12', 'blue', 'btn', 'btn-perso', 'btn-margins', 'white-text');
            button.onclick = function () {
                UserManager_6.loginUser().then(function () {
                    PageManager_4.PageManager.reload();
                }).catch(() => { });
            };
        }
        // Si l'utilisateur n'est pas connecté, on propose de créer un compte
        if (!connecte) {
            const createaccbtn = document.createElement('button');
            createaccbtn.classList.add('col', 's12', 'blue-grey', 'btn', 'btn-perso', 'btn-small-margins');
            createaccbtn.innerHTML = "Create an account";
            createaccbtn.style.marginTop = "-5px";
            createaccbtn.onclick = UserManager_6.createNewUser;
            container.appendChild(createaccbtn);
        }
        /////// PARTIE DEUX: FORMULAIRES
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Forms</h4>
    <h5>Active model</h5>
    <p class="flow-text">
        Active model is the model to the proposed one in "new entry" page.
    </p>
    `);
        // Choix du formulaire actif
        const select = document.createElement('select');
        select.classList.add('material-select');
        container.appendChild(select);
        constructSelectForSchemas(select);
        select.addEventListener('change', function () {
            const value = select.value || null;
            if (FormSchema_5.Schemas.exists(value)) {
                FormSchema_5.Schemas.change(value, true);
            }
        });
        // Bouton pour accéder aux souscriptions
        container.insertAdjacentHTML('beforeend', `
    <h5>Model subscriptions</h5>
    <p class="flow-text">
        Form model are the forms eligibles for filling in ${home_1.APP_NAME}.
        ${UserManager_6.UserManager.logged ? `
            Manage the differents models that the application allows "${UserManager_6.UserManager.username}" to fill.
        ` : ''}
    </p>
    `);
        const subs_btn = document.createElement('button');
        subs_btn.classList.add('col', 's12', 'purple', 'btn', 'btn-perso', 'btn-small-margins');
        subs_btn.innerHTML = "Manage subscriptions";
        subs_btn.onclick = function () {
            if (UserManager_6.UserManager.logged) {
                subscriptionsModal();
            }
            else {
                helpers_10.informalBottomModal("Log in", "Subscription management is allowed to logged users only.");
            }
        };
        container.appendChild(subs_btn);
        // Bouton pour actualiser les schémas
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <h5>Update models</h5>
    <p class="flow-text">
        An automatic update is realized at every application startup.
        If you think subscribed models has been changed since the last startup, you could
        update them here.
    </p>
    `);
        const formbtn = document.createElement('button');
        formbtn.classList.add('col', 's12', 'green', 'btn', 'btn-perso', 'btn-small-margins');
        formbtn.innerHTML = "Update models";
        formbtn.onclick = function () {
            if (UserManager_6.UserManager.logged) {
                helpers_10.askModal("Update form models ?", "Form models will be updated from server.")
                    .then(formActualisationModal)
                    .catch(() => { });
            }
            else {
                helpers_10.informalBottomModal("Log in", "Update of form models are only available if you're logged in.");
            }
        };
        container.appendChild(formbtn);
        //// PARTIE TROIS: SYNCHRONISATION
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Synchronisation</h4>
    <h5>Background sync</h5>
    <p class="flow-text">
        ${home_1.APP_NAME} tries to periodically sync entries if a good Internet
        connection is available.
    </p>
    `);
        // Select pour choisir la fréquence de synchro
        const select_field = helpers_10.convertHTMLToElement('<div class="input-field col s12"></div>');
        const select_input = document.createElement('select');
        for (const minutes of main_10.SYNC_FREQUENCY_POSSIBILITIES) {
            const opt = document.createElement('option');
            opt.value = String(minutes);
            opt.innerText = helpers_10.convertMinutesToText(minutes);
            opt.selected = minutes === Settings_5.Settings.sync_freq;
            select_input.appendChild(opt);
        }
        select_input.onchange = function () {
            Settings_5.Settings.sync_freq = Number(this.value);
            SyncManager_5.SyncManager.changeBackgroundSyncInterval(Settings_5.Settings.sync_freq);
        };
        const select_label = document.createElement('label');
        select_label.innerText = "Synchronisation interval";
        select_field.appendChild(select_input);
        select_field.appendChild(select_label);
        container.appendChild(select_field);
        // Initialisation du select materialize
        M.FormSelect.init(select_input);
        // Checkbox pour activer sync en arrière plan
        container.insertAdjacentHTML('beforeend', `
        <p style="margin-bottom: 20px">
            <label>
                <input type="checkbox" id="__sync_bg_checkbox_settings" ${Settings_5.Settings.sync_bg ? 'checked' : ''}>
                <span>Enable background synchronisation</span>
            </label>
        </p>`);
        document.getElementById('__sync_bg_checkbox_settings').onchange = function () {
            Settings_5.Settings.sync_bg = this.checked;
            if (Settings_5.Settings.sync_bg) {
                SyncManager_5.SyncManager.startBackgroundSync();
            }
            else {
                SyncManager_5.SyncManager.stopBackgroundSync();
            }
        };
        // Bouton pour forcer sync
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <h5>Force synchronisation</h5>
    <p class="flow-text">
        Standard sync is located in entries page.
        You could force full entries data send, even for already synced forms, here.
    </p>
    `);
        const syncbtn = document.createElement('button');
        syncbtn.classList.add('col', 's12', 'orange', 'btn', 'btn-perso', 'btn-small-margins');
        syncbtn.innerHTML = "Synchronize all";
        syncbtn.onclick = function () {
            if (UserManager_6.UserManager.logged) {
                helpers_10.askModal("Synchronize all ?", "Take care of having a decent Internet connection.\
                Empty cache force to sync all device's files, even if you cancel sync.", "Yes", "No", "Empty sync cache").then(checked_val => {
                    // L'utilisateur a dit oui
                    SyncManager_5.SyncManager.graphicalSync(true, checked_val);
                });
            }
            else {
                helpers_10.informalBottomModal("Log in", "You should be logged in to perform this action.");
            }
        };
        container.appendChild(syncbtn);
        //// PARTIE QUATRE: URL API
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>${home_1.APP_NAME} server</h4>
    <h5>Server location</h5>
    <p class="flow-text">
        Current location is <span class="blue-text text-darken-2 api-url">${helpers_10.escapeHTML(Settings_5.Settings.api_url)}</span>.
    </p>
    `);
        const changeapibutton = document.createElement('button');
        changeapibutton.className = "teal darken-4 col s12 btn btn-perso btn-small-margins";
        changeapibutton.innerHTML = "Change API URL";
        changeapibutton.onclick = changeURL;
        container.appendChild(changeapibutton);
        //// PARTIE CINQ: VOICE RECO LANG
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Voice recognition language</h4>
    <p class="flow-text">
        Choose language used for voice recognition.
    </p>
    `);
        const changelangselection = document.createElement('select');
        for (const opt of Settings_5.getAvailableLanguages()) {
            const o = document.createElement('option');
            o.value = opt;
            o.innerText = opt;
            if (opt === Settings_5.Settings.voice_lang) {
                o.selected = true;
            }
            changelangselection.appendChild(o);
        }
        changelangselection.onchange = function () {
            Settings_5.Settings.voice_lang = changelangselection.value;
        };
        container.appendChild(changelangselection);
        M.FormSelect.init(changelangselection);
    }
    exports.initSettingsPage = initSettingsPage;
    /**
     * Modal pour changer l'URL du serveur Busy Bird
     */
    function changeURL() {
        const modal = helpers_10.getModal();
        const instance = helpers_10.initModal();
        modal.innerHTML = `
    <div class="modal-content row">
        <h5 class="no-margin-top">API URL</h5>
        <p>
            Make sure you know what you're doing !
            This will change the location where ${home_1.APP_NAME} send forms and download form models.
            <br>
            If you want to build our own ${home_1.APP_NAME} server, please check the docs.
        </p>

        <div class="input-field col s12">
            <input id="__api_url_modifier" type="text">
            <label for="__api_url_modifier">API URL</label>
        </div>
    </div>
    <div class="modal-footer">
        <a class="btn-flat modal-close red-text">Close</a>
        <a class="btn-flat green-text" id="__api_url_save">Save</a>
    </div>
    `;
        const input = document.getElementById("__api_url_modifier");
        input.value = Settings_5.Settings.api_url;
        document.getElementById('__api_url_save').onclick = async () => {
            try {
                if (Settings_5.Settings.api_url !== input.value) {
                    PageManager_4.PageManager.lock_return_button = true;
                    const valid = await verifyServerURL(input.value);
                    PageManager_4.PageManager.lock_return_button = false;
                    if (!valid) {
                        return;
                    }
                }
                Settings_5.Settings.api_url = input.value;
                instance.close();
                modal.innerHTML = "";
                document.querySelector('span.api-url').innerText = Settings_5.Settings.api_url;
            }
            catch (e) {
                helpers_10.showToast("Specified URL is not a valid URL.");
            }
        };
        M.updateTextFields();
        instance.open();
    }
    async function verifyServerURL(url) {
        // Vérifie si le serveur existe
        const f_data = new FormData();
        if (UserManager_6.UserManager.logged) {
            f_data.append("username", UserManager_6.UserManager.username);
            f_data.append("token", UserManager_6.UserManager.token);
        }
        const instance = helpers_10.initBottomModal({ dismissible: false }, helpers_10.getModalPreloader("Just a second..."));
        instance.open();
        try {
            const resp = await fetch_timeout_3.default(url.replace(/\/$/, '') + "/users/validate.json", {
                method: "POST",
                body: f_data
            }, 60000).then(resp => resp.json());
            if (resp.error_code) {
                if (UserManager_6.UserManager.logged) {
                    if (resp.error_code === 16) {
                        helpers_10.showToast("Current logged user does not exists in new source server. You will be unlogged automatically.");
                        UserManager_6.UserManager.unlog();
                        instance.close();
                        return true;
                    }
                    else if (resp.error_code === 15) {
                        helpers_10.showToast("An user does have the same username as yours in new source server, but it don't seems to be you. You will be unlogged.");
                        UserManager_6.UserManager.unlog();
                        instance.close();
                        return true;
                    }
                }
                helpers_10.showToast("An unknown error occurred. (error code " + resp.error_code + ")");
            }
            else {
                if (resp.subscriptions) {
                    // On met à jour les souscriptions
                    // On recharge pas la page... On suppose que c'est les mêmes, tant pis
                    FormSchema_5.Schemas.schemas = resp.subscriptions;
                    constructSelectForSchemas(select_for_schema);
                }
                else {
                    // L'utilisateur n'est pas pas précisé
                }
                instance.close();
                return true;
            }
        }
        catch (e) {
            helpers_10.showToast("Unable to find a " + home_1.APP_NAME + " compatible server at this address.");
        }
        instance.close();
        return false;
    }
    /**
     * Obtient les souscriptions disponibles depuis le serveur
     */
    async function getSubscriptions() {
        return fetch_timeout_3.default(Settings_5.Settings.api_url + "schemas/available.json", {
            headers: new Headers({ "Authorization": "Bearer " + UserManager_6.UserManager.token }),
            method: "GET",
            mode: "cors"
        }, 30000)
            .then(response => response.json());
    }
    /**
     * Procédure d'abonnement à des schémas
     * @param ids Identifiants des schémas auquels s'abonner
     * @param fetch_subs Retourner les schémas après souscription: oui, non
     */
    async function subscribe(ids, fetch_subs) {
        const form_data = new FormData();
        form_data.append('ids', ids.join(','));
        if (!fetch_subs) {
            form_data.append('trim_subs', 'true');
        }
        return fetch_timeout_3.default(Settings_5.Settings.api_url + "schemas/subscribe.json", {
            headers: new Headers({ "Authorization": "Bearer " + UserManager_6.UserManager.token }),
            method: "POST",
            mode: "cors",
            body: form_data
        }, 60000)
            .then(response => response.json());
    }
    /**
     * Procédure de désabonnement à des schémas
     * @param ids Identifiants des schémas auquels se désabonner
     * @param fetch_subs Retourner la liste de schémas actualisée après désincription: oui, non
     */
    async function unsubscribe(ids, fetch_subs) {
        const form_data = new FormData();
        form_data.append('ids', ids.join(','));
        if (!fetch_subs) {
            form_data.append('trim_subs', 'true');
        }
        return fetch_timeout_3.default(Settings_5.Settings.api_url + "schemas/unsubscribe.json", {
            headers: new Headers({ "Authorization": "Bearer " + UserManager_6.UserManager.token }),
            method: "POST",
            mode: "cors",
            body: form_data
        }, 60000)
            .then(response => response.json());
    }
    /**
     * Lance le modal de gestion des souscriptions
     */
    async function subscriptionsModal() {
        // Initialise le modal
        const modal = helpers_10.getModal();
        const instance = helpers_10.initModal({ inDuration: 200, outDuration: 150 }, helpers_10.getModalPreloader("Fetching subscriptions", `<div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Cancel</a></div>`));
        // Ouvre le modal
        instance.open();
        // Obtient les souscriptions disponibles
        const content = document.createElement('div');
        content.classList.add('modal-content');
        let subscriptions;
        try {
            subscriptions = await getSubscriptions();
        }
        catch (e) {
            modal.innerHTML = `
        <div class="modal-content">
            <h5 class="red-text no-margin-top">Error</h5>
            <p class="flow-text">Unable to obtain subscriptions.</p>
        </div>
        <div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Close</a></div>
        `;
            return;
        }
        // Construction du contenu du modal
        // <p>
        //   <label>
        //     <input type="checkbox" />
        //     <span>LABEL</span>
        //   </label>
        // </p>
        // Construit la liste de souscriptions
        content.insertAdjacentHTML('beforeend', `<h5 class="no-margin-top">Subscriptions</h5>`);
        content.insertAdjacentHTML('beforeend', `
        <p class="flow-text">
            Manage your subscriptions and subscribe to new form models here. Check to subscribe.
        </p>
    `);
        const row = document.createElement('div');
        row.classList.add('row');
        content.appendChild(row);
        // Construit les checkboxs et note les éléments qui sont cochés 
        const first_checked = {};
        for (const form_id in subscriptions) {
            const p = document.createElement('p');
            const label = document.createElement('label');
            p.appendChild(label);
            const checkbox = document.createElement('input');
            checkbox.type = "checkbox";
            checkbox.checked = subscriptions[form_id][1];
            checkbox.classList.add('input-subscription-element');
            checkbox.dataset.id = form_id;
            if (checkbox.checked) {
                first_checked[form_id] = true;
            }
            const span = document.createElement('span');
            span.innerText = subscriptions[form_id][0];
            label.appendChild(checkbox);
            label.appendChild(span);
            row.appendChild(p);
        }
        // Création du footer
        const footer = document.createElement('div');
        footer.classList.add('modal-footer');
        footer.insertAdjacentHTML('beforeend', `<a href="#!" class="btn-flat left red-text modal-close">Cancel</a>`);
        // Bouton d'enregistrement
        const valid_btn = document.createElement('a');
        valid_btn.classList.add('btn-flat', 'right', 'green-text');
        valid_btn.href = "#!";
        valid_btn.innerText = "Save";
        // Si demande d'enregistrement > lance la procédure
        valid_btn.onclick = async function () {
            // Récupération des checkbox; cochées et non cochées
            const checkboxes = document.getElementsByClassName('input-subscription-element');
            const to_check = [];
            const to_uncheck = [];
            for (const c of checkboxes) {
                const ch = c;
                // Si l'élément est coché et il n'est pas présent dans la liste originale d'éléments cochés
                if (ch.checked && !(ch.dataset.id in first_checked)) {
                    to_check.push(ch.dataset.id);
                }
                // Si l'élément est décoché mais il est présent dans la liste originale d'éléments cochés
                else if (!ch.checked && ch.dataset.id in first_checked) {
                    to_uncheck.push(ch.dataset.id);
                }
            }
            modal.innerHTML = helpers_10.getModalPreloader("Updating subscriptions<br>Please do not close this window");
            modal.classList.remove('modal-fixed-footer');
            try {
                // Appel à unsubscribe
                if (to_uncheck.length > 0) {
                    await unsubscribe(to_uncheck, false);
                    // Suppression des formulaires demandés à être unsub
                    for (const f of to_uncheck) {
                        FormSchema_5.Schemas.delete(f, false);
                    }
                    FormSchema_5.Schemas.save();
                }
                let subs = undefined;
                // Appel à subscribe
                if (to_check.length > 0) {
                    subs = await subscribe(to_check, true);
                }
                helpers_10.showToast("Subscription update complete");
                instance.close();
                // Met à jour les formulaires si ils ont changé (appel à subscribe ou unsubscribe)
                if (subs) {
                    FormSchema_5.Schemas.schemas = subs;
                }
            }
            catch (e) {
                helpers_10.showToast("Unable to update subscriptions.\nCheck your Internet connection.");
                instance.close();
            }
            PageManager_4.PageManager.reload();
        };
        footer.appendChild(valid_btn);
        footer.insertAdjacentHTML('beforeend', `<div class="clearb"></div>`);
        modal.classList.add('modal-fixed-footer');
        modal.innerHTML = "";
        modal.appendChild(content);
        modal.appendChild(footer);
    }
});
define("pages/saved_forms", ["require", "exports", "utils/helpers", "base/FormSchema", "base/PageManager", "base/SyncManager", "utils/logger", "main", "base/FileHelper", "base/FormSaves"], function (require, exports, helpers_11, FormSchema_6, PageManager_5, SyncManager_6, logger_4, main_11, FileHelper_5, FormSaves_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** État de sauvegarde d'une entrée */
    var SaveState;
    (function (SaveState) {
        SaveState[SaveState["saved"] = 0] = "saved";
        SaveState[SaveState["waiting"] = 1] = "waiting";
        SaveState[SaveState["error"] = 2] = "error";
    })(SaveState || (SaveState = {}));
    ;
    /**
     * Lance la modification d'une sauvegarde d'une entrée form.
     * @param form Sauvegarde d'une entrée
     * @param name Identifiant du formulaire (sans le .json)
     */
    function editAForm(form, name) {
        // Vérifie que le formulaire est d'un type disponible
        if (form.type === null || !FormSchema_6.Schemas.exists(form.type)) {
            helpers_11.showToast("Unable to load this entry.\nUnknwon type of entry.\nPlease check your subscription of this form model: \"" + form.type + "\".", 10000);
            return;
        }
        const current_form = FormSchema_6.Schemas.get(form.type);
        PageManager_5.PageManager.push(PageManager_5.AppPages.form, "Edit", { form: current_form, name, save: form });
    }
    /**
     * Supprime toutes les entrées sauvegardées sur l'appareil
     */
    async function deleteAll() {
        const instance = helpers_11.unclosableBottomModal(`
        ${helpers_11.SMALL_PRELOADER}
        <p class="flow-text">Removing...</p>
    `);
        PageManager_5.PageManager.lock_return_button = true;
        try {
            await FormSaves_6.FormSaves.clear();
            helpers_11.showToast("Files has been removed successfully.");
            PageManager_5.PageManager.lock_return_button = false;
            instance.close();
            PageManager_5.PageManager.reload();
        }
        catch (e) {
            PageManager_5.PageManager.lock_return_button = false;
            instance.close();
            logger_4.Logger.error("Unable to delete", e);
            throw e;
        }
    }
    /**
     * Construit la card d'entrée sur la page des entrées
     * @param json Fichier JSON contenant l'entrée
     * @param ph Element dans lequel écrire la card
     */
    async function appendFileEntry(json, ph) {
        const save = await main_11.FILE_HELPER.readFileAs(json, FileHelper_5.FileHelperReadMode.json);
        const selector = document.createElement('li');
        selector.classList.add('collection-item');
        const container = document.createElement('div');
        container.classList.add('saved-form-item');
        let id = json.name;
        const id_without_json = id.split('.json')[0];
        container.dataset.formid = id_without_json;
        let state = SaveState.error;
        let type = "Type inconnu";
        if (save.type !== null && FormSchema_6.Schemas.exists(save.type)) {
            const form = FormSchema_6.Schemas.get(save.type);
            type = form.name;
            if (form.id_field) {
                // Si un champ existe pour ce formulaire
                id = save.fields[form.id_field] || json.name;
            }
        }
        // Recherche si il y a déjà eu synchronisation
        try {
            const present = await SyncManager_6.SyncManager.has(id_without_json);
            if (present) {
                state = SaveState.waiting;
            }
            else {
                state = SaveState.saved;
            }
        }
        catch (e) {
            state = SaveState.error;
        }
        // Ajoute de l'icône indiquant si l'élément a été synchronisé
        let sync_str = `<i class="material-icons red-text">sync_problem</i>`;
        container.dataset.synced = "false";
        if (state === SaveState.saved) {
            sync_str = `<i class="material-icons green-text">sync</i>`;
            container.dataset.synced = "true";
        }
        else if (state === SaveState.waiting) {
            sync_str = `<i class="material-icons grey-text">sync_disabled</i>`;
        }
        const sync_btn = helpers_11.convertHTMLToElement(`<a href="#!" class="sync-icon">${sync_str}</a>`);
        container.innerHTML = "";
        container.appendChild(sync_btn);
        // Ajoute le texte de l'élément
        container.insertAdjacentHTML('beforeend', `
        <div class="left">
            [${type}] ${id} <br> 
            Modifié le ${helpers_11.formatDate(new Date(json.lastModified), true)}
        </div>`);
        // Ajout des actions de l'élément
        //// ACTION 1: Modifier
        const modify_element = () => {
            editAForm(save, json.name.split(/\.json$/)[0]);
        };
        const delete_element = () => {
            modalDeleteForm(json.name);
        };
        // Définit l'événement de clic sur le formulaire
        selector.addEventListener('click', function () {
            const list = [
                "Edit",
                (container.dataset.synced === "true" ? "Res" : "S") + "ynchronize",
                "Remove"
            ];
            helpers_11.askModalList(list)
                .then(index => {
                if (index === 0) {
                    modify_element();
                }
                else if (index === 1) {
                    SyncManager_6.SyncManager.inlineSync([id_without_json]);
                }
                else {
                    delete_element();
                }
            })
                .catch(() => { });
        });
        // Clear le float
        container.insertAdjacentHTML('beforeend', "<div class='clearb'></div>");
        // Ajoute les éléments dans le conteneur final
        selector.appendChild(container);
        ph.appendChild(selector);
    }
    /**
     * Lance un modal qui demandera si on veut supprimer une entrée id
     * @param id Identifiant de l'entrée
     */
    function modalDeleteForm(id) {
        helpers_11.askModal("Remove this entry ?", "You will not be able to restore it later.", "Remove", "Cancel")
            .then(() => {
            // L'utilisateur demande la suppression
            deleteForm(id)
                .then(function () {
                helpers_11.showToast("Entry has beed removed successfully.");
                PageManager_5.PageManager.reload();
            })
                .catch(function (err) {
                helpers_11.showToast("Unable to remove: " + err);
            });
        })
            .catch(() => {
            // Annulation
        });
    }
    /**
     * Supprime un formulaire id
     * @param id Identifiant du formulaire
     */
    function deleteForm(id) {
        if (id.match(/\.json$/)) {
            id = id.substring(0, id.length - 5);
        }
        if (id) {
            return FormSaves_6.FormSaves.rm(id);
        }
        else {
            return Promise.reject("Invalid ID");
        }
    }
    /**
     * Point d'entrée de la page de visionnage des formulaires sauvegardés
     * @param base Element dans lequel écrire
     */
    async function initSavedForm(base) {
        const placeholder = document.createElement('ul');
        placeholder.classList.add('collection', 'no-margin-top');
        console.log(await main_11.FILE_HELPER.readAll(FormSaves_6.ENTRIES_DIR, FileHelper_5.FileHelperReadMode.fileobj));
        try {
            await main_11.FILE_HELPER.mkdir(FormSaves_6.ENTRIES_DIR);
        }
        catch (err) {
            logger_4.Logger.error("Unable to create entry directory", err.message, err.stack);
            base.innerHTML = helpers_11.displayErrorMessage("Error", "Unable to load files. (" + err.message + ")");
            return;
        }
        FormSchema_6.Schemas.onReady()
            .then(() => {
            return main_11.FILE_HELPER.readAll(FormSaves_6.ENTRIES_DIR, FileHelper_5.FileHelperReadMode.fileobj);
        })
            .then(async (files) => {
            // Tri des fichiers; le plus récent en premier
            files = files.sort((a, b) => b.lastModified - a.lastModified);
            for (const f of files) {
                await appendFileEntry(f, placeholder);
            }
            base.innerHTML = "";
            base.appendChild(placeholder);
            /// Insère un div avec une margin pour forcer de la
            /// place en bas, pour les boutons
            base.insertAdjacentHTML('beforeend', "<div class='saver-collection-margin'></div>");
            if (files.length === 0) {
                base.innerHTML = helpers_11.displayInformalMessage("You have no saved entries.");
            }
            else {
                //// Bouton de synchronisation
                const syncbtn = helpers_11.convertHTMLToElement(`
                            <div class="fixed-action-btn" style="margin-right: 50px;">
                                <a class="btn-floating waves-effect waves-light green">
                                    <i class="material-icons">sync</i>
                                </a>
                            </div>`);
                syncbtn.onclick = function () {
                    helpers_11.askModal("Synchronize ?", "Do you want to launch entries synchronisation now ?")
                        .then(() => {
                        return SyncManager_6.SyncManager.inlineSync();
                    })
                        .then(() => {
                        // PageManager.reload();
                    })
                        .catch(() => { });
                };
                base.appendChild(syncbtn);
                // Bouton de suppression globale
                const delete_btn = helpers_11.convertHTMLToElement(`
                            <div class="fixed-action-btn">
                                <a class="btn-floating waves-effect waves-light red">
                                    <i class="material-icons">delete_sweep</i>
                                </a>
                            </div>`);
                delete_btn.addEventListener('click', () => {
                    helpers_11.askModal("Delete all ?", "All saved entries, even potentially unsynced, will be removed.")
                        .then(() => {
                        setTimeout(function () {
                            // Attend que le modal précédent se ferme
                            helpers_11.askModal("Are you sure ?", "Deletion is irreversible.", "Cancel", "Delete all")
                                .then(() => {
                                // @ts-ignore bugfix
                                document.body.style.overflow = '';
                                M.Modal._modalsOpen = 0;
                                // Annulation
                            })
                                .catch(() => {
                                // @ts-ignore bugfix
                                document.body.style.overflow = '';
                                M.Modal._modalsOpen = 0;
                                deleteAll();
                            });
                        }, 150);
                    })
                        .catch(() => { });
                });
                base.insertAdjacentElement('beforeend', delete_btn);
            }
        })
            .catch(err => {
            logger_4.Logger.error("Unable to load files", err.message, err.stack);
            base.innerHTML = helpers_11.displayErrorMessage("Error", "Unable to load files. (" + err.message + ")");
        });
    }
    exports.initSavedForm = initSavedForm;
});
define("base/PageManager", ["require", "exports", "utils/helpers", "pages/form", "pages/settings_page", "pages/saved_forms", "pages/home", "utils/logger", "main"], function (require, exports, helpers_12, form_1, settings_page_1, saved_forms_1, home_2, logger_5, main_12) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SIDENAV_OBJ = null;
    /**
     * Déclaration des pages possibles.
     * @readonly
     */
    exports.AppPages = {
        home: {
            name: "Dashboard",
            callback: home_2.initHomePage,
            reload_on_restore: true
        },
        form: {
            name: "New entry",
            callback: form_1.initFormPage,
            ask_change: true,
            reload_on_restore: false
        },
        saved: {
            name: "Entries",
            callback: saved_forms_1.initSavedForm,
            reload_on_restore: true
        },
        settings: {
            name: "Settings",
            callback: settings_page_1.initSettingsPage,
            reload_on_restore: false
        }
    };
    /**
     * Gère les pages de l'application.
     * Utilisée pour gérer le système de pile de pages.
     * Pour pousser une nouvelle page sur les autres, utilisez push().
     * Pour revenir à la page précédente, utilisez back(). Vous pouvez
     * aussi utiliser pop() qui ne fait pas de vérification d'usage lors du dépop.
     * Cette classe ne doit être instanciée qu'une seule fois !
     */
    class _PageManager {
        constructor() {
            this.lock_return_button = false;
            this.pages_holder = [];
            // Génération du sidenav
            const sidenav = document.getElementById('__sidenav_base_menu');
            // Ajout de la bannière
            sidenav.insertAdjacentHTML('beforeend', `<li>
            <div class="user-view">
                <div class="background">
                <img src="img/sidenav_background.jpg">
                </div>
                <a href="#!"><img class="circle" src="img/logo.png"></a>
                <a href="#!"><span class="white-text email">${home_2.APP_NAME}</span></a>
            </div>
        </li>`);
            // Ajoute chaque page au menu
            for (const page in exports.AppPages) {
                const li = document.createElement('li');
                li.id = "__sidenav_base_element_" + page;
                li.onclick = () => {
                    exports.PageManager.push(exports.AppPages[page]);
                };
                const link = document.createElement('a');
                link.href = "#!";
                link.innerText = exports.AppPages[page].name;
                li.appendChild(link);
                sidenav.appendChild(li);
            }
            // Initialise le sidenav
            const elem = document.querySelector('.sidenav');
            exports.SIDENAV_OBJ = M.Sidenav.init(elem, {});
        }
        /**
         * Met à jour le bouton retour sur PC
         */
        updateReturnBtn() {
            if (device.platform === "browser") {
                const back_btn = document.getElementById('__nav_back_button');
                if (this.isPageWaiting()) {
                    back_btn.classList.remove('hide');
                }
                else {
                    back_btn.classList.add('hide');
                }
            }
        }
        /**
         * Recharge la page actuelle. (la vide et réexécute le callback configuré dans la AppPageObj)
         */
        reload(additionnals, reset_scroll = false) {
            this.change(this.actual_page, false, document.getElementById('nav_title').innerText, additionnals, reset_scroll);
        }
        /**
         * Change l'affichage et charge la page "page" dans le bloc principal
         * @param page Page à charger
         * @param delete_paused Supprime les pages chargées dans la pile
         * @param force_name Forcer un nom pour la navbar
         * @param additionnals Variable à passer en paramètre au callback de page
         * @param reset_scroll Réinitiliser le scroll de la page en haut
         */
        change(page, delete_paused = true, force_name, additionnals, reset_scroll = true) {
            // Tente de charger la page
            try {
                let pagename = "";
                if (typeof page === 'string') {
                    // AppPageName
                    if (!this.exists(page)) {
                        throw new ReferenceError("Page does not exists");
                    }
                    pagename = page;
                    page = exports.AppPages[page];
                }
                else {
                    // Recherche de la clé correspondante
                    for (const k in exports.AppPages) {
                        if (exports.AppPages[k] === page) {
                            pagename = k;
                            break;
                        }
                    }
                }
                // Si on veut supprimer les pages en attente, on vide le tableau
                if (delete_paused) {
                    this.pages_holder = [];
                }
                // On écrit le preloader dans la base et on change l'historique
                const base = helpers_12.getBase();
                base.innerHTML = helpers_12.getPreloader("Loading");
                if (window.history) {
                    window.history.pushState({}, "", "?" + pagename);
                }
                //// help linter
                page = page;
                // Si on a demandé à fermer le sidenav, on le ferme
                if (!page.not_sidenav_close) {
                    exports.SIDENAV_OBJ.close();
                }
                this.actual_page = page;
                this._should_wait = page.ask_change;
                this.lock_return_button = false;
                // On met le titre de la page dans la barre de navigation
                document.getElementById('nav_title').innerText = force_name || page.name;
                // On appelle la fonction de création de la page
                const result = page.callback(base, additionnals);
                if (reset_scroll) {
                    // Ramène en haut de la page
                    window.scrollTo(0, 0);
                }
                this.updateReturnBtn();
                if (result instanceof Promise) {
                    return result;
                }
                else {
                    return Promise.resolve(result);
                }
            }
            catch (e) {
                logger_5.Logger.error("Error while changing pages", e);
                return Promise.reject(e);
            }
        }
        /**
         * Supprime des pages sauvegardées si la pile de page dépasse MAX_SLEEPING_PAGES
         */
        clean() {
            while (this.pages_holder.length >= main_12.MAX_SLEEPING_PAGES) {
                this.pages_holder.shift();
            }
        }
        /**
         * Pousse une nouvelle page dans la pile de page
         * @param page Page à pousser
         * @param force_name Nom à mettre dans la navbar
         * @param additionnals Variable à passer au callback de la page à charger
         */
        push(page, force_name, additionnals) {
            if (typeof page === 'string' && !this.exists(page)) {
                throw new ReferenceError("Page does not exists");
            }
            // Si il y a plus de MAX_SLEEPING_PAGES pages dans la pile, clean
            this.clean();
            // Récupère le contenu actuel du bloc mère
            const actual_base = helpers_12.getBase();
            // Sauvegarde de la base actuelle dans le document fragment
            // Cela supprime immédiatement le noeud du DOM
            // const save = new DocumentFragment(); // semble être trop récent
            const save = document.createDocumentFragment();
            actual_base.id = "";
            save.appendChild(actual_base);
            // Insère la sauvegarde dans la pile de page
            this.pages_holder.push({
                save,
                ask: this._should_wait,
                name: document.getElementById('nav_title').innerText,
                page: this.actual_page
            });
            // Crée la nouvelle base mère avec le même ID
            const new_base = document.createElement('div');
            new_base.id = "main_block";
            // Insère la nouvelle base vide à la racine de main
            document.getElementsByTagName('main')[0].appendChild(new_base);
            // Appelle la fonction pour charger la page demandée dans le bloc
            return this.change(page, false, force_name, additionnals);
        }
        /**
         * Revient à la page précédente.
         * Charge la page d'accueil si aucune page disponible
         */
        pop() {
            if (this.pages_holder.length === 0) {
                this.change(main_12.DEFAULT_PAGE);
                return;
            }
            // Récupère la dernière page poussée dans le tableau
            const last_page = this.pages_holder.pop();
            // Supprime le main actuel
            const main = helpers_12.getBase();
            cleanElement(main);
            main.parentElement.removeChild(main);
            const new_main = last_page.save.firstElementChild;
            new_main.id = "main_block";
            // Met le fragment dans le DOM
            document.getElementsByTagName('main')[0].appendChild(new_main);
            // Remet le bon titre
            document.getElementById('nav_title').innerText = last_page.name;
            this.actual_page = last_page.page;
            this._should_wait = last_page.ask;
            this.lock_return_button = false;
            if (this.actual_page.reload_on_restore) {
                if (typeof this.actual_page.reload_on_restore === 'boolean') {
                    this.change(this.actual_page, false, undefined, undefined, false);
                }
                else {
                    this.actual_page.reload_on_restore();
                }
            }
            this.updateReturnBtn();
        }
        /**
         * Retourne à la page précédente, et demande si à confirmer si la page a le flag "should_wait".
         * @param force_asking Oblige à demander si on doit retourner à la page précédente ou non.
         */
        back(force_asking = false) {
            if (this.lock_return_button) {
                return;
            }
            const stepBack = () => {
                // Ferme le modal possiblement ouvert
                try {
                    helpers_12.getModalInstance().close();
                }
                catch (e) { }
                try {
                    helpers_12.getBottomModalInstance().close();
                }
                catch (e) { }
                if (this.isPageWaiting()) {
                    this.pop();
                }
                else {
                    // @ts-ignore this.changePage(AppPageName.home);
                    navigator.app.exitApp();
                }
            };
            if (this.should_wait || force_asking) {
                helpers_12.askModal("Go to previous page ?", "Modifications on this page will be lost.", "Previous page", "Cancel")
                    .then(stepBack)
                    .catch(() => { });
            }
            else {
                stepBack();
            }
        }
        get should_wait() {
            return this._should_wait;
        }
        set should_wait(v) {
            this._should_wait = v;
        }
        exists(name) {
            return name in exports.AppPages;
        }
        isPageWaiting() {
            return this.pages_holder.length > 0;
        }
    }
    exports.PageManager = new _PageManager;
    function cleanElement(e) {
        let n;
        while (n = e.firstChild) {
            e.removeChild(n);
        }
    }
});
define("main", ["require", "exports", "base/PageManager", "utils/helpers", "utils/logger", "utils/audio_listener", "base/FormSchema", "utils/vocal_recognition", "base/UserManager", "base/SyncManager", "utils/test_vocal_reco", "base/FileHelper", "utils/Settings"], function (require, exports, PageManager_6, helpers_13, Logger_2, audio_listener_2, FormSchema_7, vocal_recognition_3, UserManager_7, SyncManager_7, test_vocal_reco_2, FileHelper_6, Settings_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Constantes de l'application
    exports.APP_VERSION = 0.7;
    const FIXED_NAVBAR = true; /** Active la barre de navigation fixe */
    exports.MAX_LIEUX_AFFICHES = 20; /** Maximum de lieux affichés dans le modal de sélection de lieu */
    exports.ENABLE_FORM_DOWNLOAD = true; /** Active le téléchargement automatique des schémas de formulaire au démarrage */
    exports.ID_COMPLEXITY = 20; /** Nombre de caractères aléatoires dans un ID automatique */
    exports.MP3_BITRATE = 256; /** En kb/s */
    exports.DEFAULT_PAGE = PageManager_6.AppPages.home; /** Page chargée par défaut */
    exports.MAX_SLEEPING_PAGES = 20; /** Nombre de pages maximum qui restent en attente en arrière-plan */
    exports.SYNC_FREQUENCY_POSSIBILITIES = [15, 30, 60, 120, 240, 480, 1440]; /** En minutes */
    exports.ENABLE_SCROLL_ON_FORM_VERIFICATION_CLICK = true; /** Active le scroll lorsqu'on clique sur un élément lors du modal de vérification */
    exports.SCROLL_TO_CENTER_ON_FORM_VERIFICATION_CLICK = true;
    exports.MAX_TIMEOUT_FOR_FORM = 20000; /** Timeout pour l'envoi du fichier .json de l'entrée, en millisecondes */
    exports.MAX_TIMEOUT_FOR_METADATA = 180000; /** Timeout pour l'envoi de chaque fichier "métadonnée" (img, audio, ...), en millisecondes */
    exports.MAX_CONCURRENT_SYNC_ENTRIES = 10; /** Nombre d'entrées à envoyer en même temps pendant la synchronisation.
        Attention, 1 entrée correspond au JSON + ses possibles fichiers attachés.
    */
    exports.APP_ID = "com.lbbe.busybird";
    // Variables globales exportées
    exports.SDCARD_PATH = null;
    exports.SD_FILE_HELPER = null;
    exports.FILE_HELPER = new FileHelper_6.FileHelper;
    exports.app = {
        // Application Constructor
        initialize: function () {
            this.bindEvents();
        },
        // Bind Event Listeners
        //
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function () {
            document.addEventListener('deviceready', this.onDeviceReady, false);
        },
        // deviceready Event Handler
        //
        // The scope of 'this' is the event. In order to call the 'receivedEvent'
        // function, we must explicitly call 'app.receivedEvent(...);'
        onDeviceReady: function () {
            // app.receivedEvent('deviceready');
        },
        // Update DOM on a Received Event
        receivedEvent: function () {
            // var parentElement = document.getElementById(id);
            // var listeningElement = parentElement.querySelector('.listening');
            // var receivedElement = parentElement.querySelector('.received');
            // listeningElement.setAttribute('style', 'display:none;');
            // receivedElement.setAttribute('style', 'display:block;');
            // console.log('Received Event: ' + id);
        }
    };
    async function initApp() {
        // Change le répertoire de données
        // Si c'est un navigateur, on est sur cdvfile://localhost/temporary
        // Sinon, si mobile, on passe sur dataDirectory
        helpers_13.changeDir();
        await exports.FILE_HELPER.waitInit();
        // @ts-ignore Force à demander la permission pour enregistrer du son
        const permissions = cordova.plugins.permissions;
        await new Promise((resolve) => {
            permissions.requestPermission(permissions.RECORD_AUDIO, (status) => {
                resolve(status);
            }, (e) => { console.log(e); resolve(); });
        });
        // Force à demander la permission pour accéder à la SD
        const permission_write = await new Promise((resolve) => {
            permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
                resolve(status);
            }, (e) => { console.log(e); resolve(); });
        });
        // Essaie de trouver le chemin de la carte SD
        try {
            if (permission_write && permission_write.hasPermission) {
                const folders = await helpers_13.getSdCardFolder();
                for (const f of folders) {
                    if (f.canWrite) {
                        exports.SDCARD_PATH = f.filePath;
                        // Si on est pas dans Android/com.lbbe.busybird/data/
                        if (!exports.SDCARD_PATH.includes(exports.APP_ID)) {
                            exports.SDCARD_PATH += "/Busy Bird";
                        }
                        exports.SD_FILE_HELPER = new FileHelper_6.FileHelper(exports.SDCARD_PATH);
                        try {
                            await exports.SD_FILE_HELPER.waitInit();
                        }
                        catch (e) {
                            exports.SD_FILE_HELPER = null;
                        }
                        break;
                    }
                }
            }
        }
        catch (e) { }
        // Initialise les blocs principaux du code: L'utilitaire de log, les schémas de form et le gestionnaire de sync
        Logger_2.Logger.init();
        FormSchema_7.Schemas.init();
        SyncManager_7.SyncManager.init();
        // @ts-ignore Désactive le dézoom automatique sur Android quand l'utilisateur a choisi une petite police
        if (window.MobileAccessibility) {
            // @ts-ignore
            window.MobileAccessibility.usePreferredTextZoom(false);
        }
        // Initialise le bouton retour
        document.addEventListener("backbutton", function () {
            PageManager_6.PageManager.back();
        }, false);
        // app.initialize();
        // Initialise le mode de debug
        initDebug();
        helpers_13.initModal();
        if (FIXED_NAVBAR) {
            // Ajoute la classe navbar-fixed au div contenant le nav
            document.getElementsByTagName('nav')[0].parentElement.classList.add('navbar-fixed');
        }
        // Check si on est à une page spéciale
        let href = "";
        if (window.location) {
            const tmp = location.href.split('#')[0].split('?');
            // Récupère la partie de l'URL après la query string et avant le #
            href = tmp[tmp.length - 1];
        }
        // Quand les forms sont prêts, on affiche l'app !
        return FormSchema_7.Schemas.onReady()
            .then(() => {
            // On montre l'écran
            navigator.splashscreen.hide();
            let prom;
            if (href && PageManager_6.PageManager.exists(href)) {
                prom = PageManager_6.PageManager.change(PageManager_6.AppPages[href]);
            }
            else {
                prom = PageManager_6.PageManager.change(exports.DEFAULT_PAGE);
            }
            return prom;
        });
    }
    function appWrapper() {
        initApp().catch(err => {
            // On montre l'écran et on affiche l'erreur
            navigator.splashscreen.hide();
            // Bloque le sidenav pour empêcher de naviguer
            try {
                PageManager_6.SIDENAV_OBJ.destroy();
            }
            catch (e) { }
            helpers_13.getBase().innerHTML = helpers_13.displayErrorMessage("Unable to initialize application", "Error: " + err.stack);
        });
    }
    function initDebug() {
        // @ts-ignore
        window["DEBUG"] = {
            launchQuizz: test_vocal_reco_2.launchQuizz,
            PageManager: PageManager_6.PageManager,
            saveDefaultForm: helpers_13.saveDefaultForm,
            getLocation: helpers_13.getLocation,
            testDistance: helpers_13.testDistance,
            Logger: Logger_2.Logger,
            Schemas: FormSchema_7.Schemas,
            Settings: Settings_6.Settings,
            SyncEvent: SyncManager_7.SyncEvent,
            askModalList: helpers_13.askModalList,
            FileHelper: FileHelper_6.FileHelper,
            FileHelperReadMode: FileHelper_6.FileHelperReadMode,
            createRandomForms: helpers_13.createRandomForms,
            recorder: () => {
                return audio_listener_2.newModalRecord("Test");
            },
            dateFormatter: helpers_13.dateFormatter,
            prompt: vocal_recognition_3.prompt,
            createNewUser: UserManager_7.createNewUser,
            UserManager: UserManager_7.UserManager,
            SyncManager: SyncManager_7.SyncManager,
            api_url: Settings_6.Settings.api_url
        };
    }
    document.addEventListener('deviceready', appWrapper, false);
});
