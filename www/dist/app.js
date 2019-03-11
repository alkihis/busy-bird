"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define("audio_listener", ["require", "exports", "helpers", "logger", "main"], function (require, exports, helpers_1, logger_1, main_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function newModalRecord(button, input, ele) {
        let recorder = null;
        const modal = helpers_1.getModal();
        const instance = helpers_1.initModal({}, helpers_1.getModalPreloader("Chargement", ''));
        instance.open();
        let audioContent = null;
        let blobSize = 0;
        modal.innerHTML = `
    <div class="modal-content">
        <h5 style="margin-top: 0;">${ele.label}</h5>
        <p style="margin-top: 0; margin-bottom: 25px;">Approchez votre micro de la source, puis appuyez sur enregistrer.</p>
        <a href="#!" class="btn col s12 orange" id="__media_record_record">Enregistrer</a>
        <a href="#!" class="btn hide col s12 red" id="__media_record_stop">Arrêter</a>
        <div class=clearb></div>
        <div id="__media_record_player" class="modal-record-audio-player">${input.value ? `
            <figure>
                <figcaption>Enregistrement</figcaption>
                <audio controls src="${input.value}"></audio>
            </figure>
        ` : ''}</div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat green-text right ${input.value ? "" : "hide"}" id="__media_record_save">Sauvegarder</a>
        <a href="#!" class="btn-flat red-text left" id="__media_record_cancel">Annuler</a>
        <div class="clearb"></div>
    </div>
    `;
        const btn_start = document.getElementById('__media_record_record');
        const btn_stop = document.getElementById('__media_record_stop');
        const btn_confirm = document.getElementById('__media_record_save');
        const btn_cancel = document.getElementById('__media_record_cancel');
        const player = document.getElementById('__media_record_player');
        //add events to those 2 buttons
        btn_start.addEventListener("click", startRecording);
        btn_stop.addEventListener("click", stopRecording);
        btn_confirm.onclick = function () {
            if (audioContent) {
                input.value = audioContent;
                input.dataset.duration = ((blobSize / (main_1.MP3_BITRATE * 1000)) * 8).toString();
                // Met à jour le bouton
                const duration = (blobSize / (main_1.MP3_BITRATE * 1000)) * 8;
                button.innerText = "Enregistrement (" + duration.toFixed(0) + "s" + ")";
                button.classList.remove('blue');
                button.classList.add('green');
            }
            instance.close();
            // Clean le modal et donc les variables associées
            modal.innerHTML = "";
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
        };
        function startRecording() {
            btn_start.classList.add('hide');
            player.innerHTML = `<p class='flow-text center'>
            Initialisation...
        </p>`;
            // @ts-ignore MicRecorder, credit to https://github.com/closeio/mic-recorder-to-mp3
            recorder = new MicRecorder({
                bitRate: main_1.MP3_BITRATE
            });
            recorder.start().then(function () {
                player.innerHTML = `<p class='flow-text center'>
                <i class='material-icons blink fast v-bottom red-text'>mic</i><br>
                Enregistrement en cours
            </p>`;
                btn_stop.classList.remove('hide');
            }).catch((e) => {
                logger_1.Logger.error("Impossible de lancer l'écoute.", e);
                player.innerHTML = "<p class='flow-text center red-text bold-text'>Impossible de lancer l'écoute.</p>";
            });
        }
        function stopRecording() {
            // Once you are done singing your best song, stop and get the mp3.
            btn_stop.classList.add('hide');
            player.innerHTML = "<p class='flow-text center'>Conversion en cours...</p>";
            recorder
                .stop()
                .getMp3()
                .then(([buffer, blob]) => {
                blobSize = blob.size;
                return helpers_1.blobToBase64(blob);
            })
                .then((base64) => {
                audioContent = base64;
                btn_confirm.classList.remove('hide');
                player.innerHTML = `<figure>
                    <figcaption>Enregistrement</figcaption>
                    <audio controls src="${base64}"></audio>
                </figure>`;
                btn_start.classList.remove('hide');
            })
                .catch((e) => {
                M.toast({ html: 'Impossible de lire votre enregistrement' });
                logger_1.Logger.error("Enregistrement échoué:", e.message);
            });
        }
    }
    exports.newModalRecord = newModalRecord;
});
define("vocal_recognition", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // options de la reconnaissance vocale
    const options = {
        language: "fr-FR",
        prompt: "Parlez maintenant"
    };
    /**
     * Récupère le texte dicté par l'utilisateur
     * @param prompt_text Message affiché à l'utilisateur expliquant ce qu'il est censé dire
     * @param as_array Au lieu de renvoyer la phrase la plus probable dite par l'utilisateur, renvoie toutes les possibilités
     * @returns Promesse résolue contenant le texte dicté si réussi. Dans tous les autres cas, promesse rompue.
     */
    function prompt(prompt_text = "Parlez maintenant", as_array = false) {
        return new Promise(function (resolve, reject) {
            options.prompt = prompt_text;
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
                }, options);
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
define("user_manager", ["require", "exports", "main", "helpers", "form_schema"], function (require, exports, main_2, helpers_2, form_schema_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UserManager = new class {
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
        login(username, password) {
            return new Promise((resolve, reject) => {
                let data = new FormData();
                data.append("username", username);
                data.append('password', password);
                fetch(main_2.API_URL + "users/login.json", { body: data, method: 'POST' })
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
                    form_schema_1.Forms.schemas = json.subscriptions;
                    resolve();
                })
                    .catch((error) => {
                    reject(error);
                });
            });
        }
        logSomeone(username, token) {
            this._token = token;
            this._username = username;
            localStorage.setItem('__username_manager', username);
            localStorage.setItem('__token_manager', token);
        }
        unlog() {
            localStorage.removeItem('__username_manager');
            localStorage.removeItem('__token_manager');
            this._username = null;
            this._token = null;
        }
        get logged() {
            return this._username !== null;
        }
        createUser(username, password, admin_password) {
            const data = new FormData();
            data.append("username", username);
            data.append("password", password);
            data.append("admin_password", admin_password);
            return new Promise((resolve, reject) => {
                fetch(main_2.API_URL + "users/create.json", {
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
    };
    function createNewUser() {
        const modal = helpers_2.getModal();
        const instance = helpers_2.initModal({ dismissible: false });
        modal.classList.add('modal-fixed-footer');
        modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">Créer un utilisateur</h5>
        <form class="row" id="__modal_form_new_user">
            <div class="row col s12 input-field">
                <label for="__user_new">Nom d'utilisateur</label>
                <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw">Mot de passe</label>
                <input type="password" class="validate" required id="__user_psw" name="user_psw">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_r">Mot de passe (confirmation)</label>
                <input type="password" class="validate" required id="__user_psw_r" name="user_psw_r">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_a">Mot de passe administrateur</label>
                <input type="password" class="validate" required id="__user_psw_a" name="user_psw_a">
            </div>
        </form>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat red-text left modal-close">Annuler</a>
        <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Créer utilisateur</a>
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
                helpers_2.showToast("Le nom ne peut pas être vide.");
                helpers_2.showToast("Le nom ne peut pas être vide.");
                return;
            }
            if (!psw) {
                helpers_2.showToast("Le mot de passe ne peut pas être vide.");
                return;
            }
            if (psw !== psw_r) {
                helpers_2.showToast("Mot de passe et confirmation doivent correspondre.");
                return;
            }
            if (!psw_a) {
                helpers_2.showToast("Le mot de passe administrateur est nécessaire.");
                return;
            }
            modal_save = document.createDocumentFragment();
            let child;
            while (child = modal.firstChild) {
                modal_save.appendChild(child);
            }
            modal.innerHTML = helpers_2.getModalPreloader("Création de l'utilisateur...");
            exports.UserManager.createUser(name, psw, psw_a)
                .then(function () {
                helpers_2.showToast("Utilisateur créé avec succès.");
                instance.close();
            }).catch(function (error) {
                console.log(error);
                if (typeof error === 'number') {
                    if (error === 6) {
                        helpers_2.showToast("Le mot de passe administrateur est invalide.");
                    }
                    else if (error === 12) {
                        helpers_2.showToast("Cet utilisateur existe déjà.");
                    }
                    else {
                        helpers_2.showToast("Une erreur inconnue est survenue.");
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
            const modal = helpers_2.getModal();
            const instance = helpers_2.initModal({ dismissible: false });
            modal.innerHTML = `
        <div class="modal-content">
            <h5 class="no-margin-top">Connexion</h5>
            <form class="row" id="__modal_form_new_user">
                <div class="row col s12 input-field">
                    <label for="__user_new">Nom d'utilisateur</label>
                    <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
                </div>
                <div class="row col s12 input-field">
                    <label for="__user_psw">Mot de passe</label>
                    <input type="password" autocomplete="off" class="validate" required id="__user_psw" name="user_psw">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <a href="#!" id="__modal_cancel_user" class="btn-flat red-text left">Annuler</a>
            <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Connexion</a>
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
                    helpers_2.showToast("Le nom ne peut pas être vide.");
                    return;
                }
                if (!psw) {
                    helpers_2.showToast("Le mot de passe ne peut pas être vide.");
                    return;
                }
                modal_save = document.createDocumentFragment();
                let child;
                while (child = modal.firstChild) {
                    modal_save.appendChild(child);
                }
                modal.innerHTML = helpers_2.getModalPreloader("Connexion");
                exports.UserManager.login(name, psw)
                    .then(function () {
                    helpers_2.showToast("Vous avez été connecté-e avec succès.");
                    instance.close();
                    // RESOLUTION DE LA PROMESSE
                    resolve();
                }).catch(function (error) {
                    if (typeof error === 'number') {
                        if (error === 10) {
                            helpers_2.showToast("Cet utilisateur n'existe pas.");
                        }
                        else if (error === 11) {
                            helpers_2.showToast("Votre mot de passe est invalide.");
                        }
                        else {
                            helpers_2.showToast("Une erreur inconnue est survenue.");
                        }
                    }
                    else {
                        helpers_2.showToast(error.message || JSON.stringify(error));
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
/**
 *
 * const data = new FormData();
        data.append("username", username);
        data.append("password", password);
 * return new Promise((resolve, reject) => {
            fetch(API_URL + "/users/login.json", {
                method: "POST",
                body: data
            }).then((response) => {
                return response.json();
            }).then((json) => {
                this._token = json.access_token;
                this._username = username;

                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
 */ 
define("fetch_timeout", ["require", "exports"], function (require, exports) {
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
define("Settings", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Settings = new class {
        constructor() {
            this._sync_freq = 30; /** En minutes */
            this._sync_bg = true; /** Activer la sync en arrière plan */
            if (localStorage.getItem('_settings_sync_freq')) {
                this._sync_freq = Number(localStorage.getItem('_settings_sync_freq'));
            }
            if (localStorage.getItem('_settings_sync_bg')) {
                this._sync_bg = localStorage.getItem('_settings_sync_bg') === 'true';
            }
        }
        set sync_bg(val) {
            this._sync_bg = val;
            localStorage.setItem('_settings_sync_bg', String(val));
        }
        get sync_bg() {
            return this._sync_bg;
        }
        set sync_freq(val) {
            this._sync_freq = val;
            localStorage.setItem('_settings_sync_freq', String(val));
        }
        get sync_freq() {
            return this._sync_freq;
        }
    };
    exports.BackgroundSync = new class {
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
    };
});
define("file_helper", ["require", "exports"], function (require, exports) {
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
    })(FileHelperReadMode = exports.FileHelperReadMode || (exports.FileHelperReadMode = {}));
    /**
     * Simplify file access and directory navigation with native Promise support
     */
    class FileHelper {
        /**
         * Create a new FileHelper object using a root path.
         * Root are automatically setted to cordova.file.externalDataDirectory || cordova.file.dataDirectory on mobile devices,
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
                if (step.trim() === ".") {
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
            let file = await this.getFileOfEntry(typeof path === 'string' ? await this.get(path) : path);
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
         * Get an existing file or directory using an absolute path
         * @param path Complete path
         */
        absoluteGet(path) {
            return new Promise((resolve, reject) => {
                window.resolveLocalFileSystemURL(path, resolve, reject);
            });
        }
        /**
         * Get an entry from a path.
         * If you want to read a file, use read() instead.
         * @param path Path to file or directory
         */
        get(path = "") {
            return this.absoluteGet(this.pwd() + "/" + path);
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
         * @param option_string Options. Can be e, l, d, r or f. See docs. Warning: recursive can be very slow.
         */
        async ls(path = "", option_string = "") {
            const entry = await this.get(path);
            if (entry.isFile) {
                return [path];
            }
            const e = option_string.includes("e");
            const l = option_string.includes("l");
            const f = option_string.includes("f");
            const d = option_string.includes("d");
            const r = option_string.includes("r");
            // Enlève le slash terminal et le slash initial (les chemins ne doivent jamais commencer par /)
            path = path.replace(/\/$/, '');
            path = path.replace(/^\//, '');
            let entries = await new Promise((resolve, reject) => {
                const reader = entry.createReader();
                reader.readEntries(resolve, reject);
            });
            let obj_entries = { [path]: entries };
            if (r) {
                for (const e of entries) {
                    if (e.isDirectory) {
                        obj_entries = Object.assign({}, obj_entries, await this.ls(path + "/" + e.name, "re"));
                    }
                }
            }
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
            if (e) {
                return obj_entries;
            }
            if (l) {
                const paths = [];
                for (const rel_path in obj_entries) {
                    for (const e of obj_entries[rel_path]) {
                        if (e.isDirectory) {
                            paths.push({
                                name: (rel_path ? rel_path + "/" : "") + e.name,
                                mdate: undefined,
                                mtime: undefined,
                                size: 4096
                            });
                        }
                        else {
                            const entry = await this.getFileOfEntry(e);
                            const stats = this.getStatsFromFile(entry);
                            stats.name = (rel_path ? rel_path + "/" : "") + stats.name;
                            paths.push(stats);
                        }
                    }
                }
                return paths;
            }
            else {
                const paths = [];
                for (const rel_path in obj_entries) {
                    for (const e of obj_entries[rel_path]) {
                        paths.push((rel_path ? rel_path + "/" : "") + e.name);
                    }
                }
                return paths;
            }
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
         * @param path Path of the directory
         * @param r Make empty recursive.
         * If r = false and path contains a directory that is not empty, empty will fail
         */
        async empty(path, r = false) {
            const entries = await this.ls(path);
            for (const e of entries) {
                const entry = await this.get(e);
                if (entry.isDirectory && r) {
                    await new Promise((resolve, reject) => {
                        entry.removeRecursively(resolve, reject);
                    });
                }
                else {
                    await new Promise((resolve, reject) => {
                        entry.remove(resolve, reject);
                    });
                }
            }
        }
        /**
         * Get information about a file
         * @param path Path to a file
         */
        async stats(path) {
            const entry = await this.getFileOfEntry(await this.get(path));
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
            // Teste si le chemin est valide (échouera sinon)
            const new_root = await (relative ? this.get(path) : this.absoluteGet(path));
            if (new_root.isFile) {
                throw new Error("New root can't be a file !");
            }
            this.root = new_root.toInternalURL().replace(/\/$/, '');
        }
        /**
         * Find files into a directory using a glob bash pattern.
         * (** is not supported, use recursive = true and match like *.json to find all json files into all subdirectories)
         * @param pattern
         * @param recursive
         * @param regex_flags Add additionnal flags to regex pattern matching
         */
        async glob(pattern, recursive = false, regex_flags = "") {
            const entries = await this.ls(undefined, "e" + (recursive ? "r" : ""));
            const matched = [];
            const regex = glob_to_regex(pattern, regex_flags);
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
         * see pwd()
         */
        toString() {
            return this.pwd();
        }
        /* FUNCTIONS WITH DIRECTORY ENTRIES, FILE ENTRIES */
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
         * Get a File object from a FileEntry
         * @param file FileEntry
         */
        getFileOfEntry(file) {
            return new Promise((resolve, reject) => {
                file.file(resolve, reject);
            });
        }
        /**
         * Read a file object as selected mode
         * @param file File obj
         * @param mode Mode
         */
        readFileAs(file, mode = FileHelperReadMode.text) {
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
                name: entry.name
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
            else if (typeof s === 'string' || s instanceof ArrayBuffer) {
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
    ////// GLOB TO REGEX
    /**
     * Glob to regex function.
     * Credit to [Nick Fitzgerald](https://github.com/fitzgen/glob-to-regexp).
     *
     * COPYRIGHT NOTICE
     * see above function
     *
     * @param glob
     * @param flags
     */
    const glob_to_regex = function (glob, flags = "") {
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
    };
});
/**
    Copyright notice for GLOB_TO_REGEX
    All rights reserved.

    Redistribution and use in source and binary forms, with or without modification,
    are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice,
    this list of conditions and the following disclaimer.

    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
    the following disclaimer in the documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
    THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
    IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
    INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (
        INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
        LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION
    )
    HOWEVER CAUSED
    AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
    EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
define("SyncManager", ["require", "exports", "logger", "localforage", "main", "helpers", "user_manager", "fetch_timeout", "Settings", "file_helper"], function (require, exports, logger_2, localforage_1, main_3, helpers_3, user_manager_1, fetch_timeout_1, Settings_1, file_helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    localforage_1 = __importDefault(localforage_1);
    fetch_timeout_1 = __importDefault(fetch_timeout_1);
    // en millisecondes
    const MAX_TIMEOUT_FOR_FORM = 20000; /** Pour le fichier .json de l'entrée */
    const MAX_TIMEOUT_FOR_METADATA = 180000; /** Pour chaque fichier "métadonnée" (img, audio, ...) */
    // Nombre de formulaires à envoyer en même temps
    // Attention, 1 formulaire correspond au JSON + ses possibles fichiers attachés.
    const PROMISE_BY_SYNC_STEP = 10;
    const SyncList = new class {
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
    };
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
    exports.SyncManager = new class {
        constructor() {
            this.in_sync = false;
            this.list = SyncList;
            this.last_bgsync = Date.now();
            this.running_fetchs = [];
        }
        init() {
            this.list.init();
            this.initBackgroundSync();
        }
        initBackgroundSync(interval = Settings_1.Settings.sync_freq) {
            const success_fn = () => {
                logger_2.Logger.info("Il s'est écoulé " + ((Date.now() - this.last_bgsync) / 1000) + " secondes depuis la dernière synchronisation.");
                this.last_bgsync = Date.now();
                this.launchBackgroundSync()
                    .then(() => {
                    logger_2.Logger.info(`La synchronisation d'arrière-plan s'est bien déroulée et a duré ${((Date.now() - this.last_bgsync) / 1000)} secondes.`);
                    Settings_1.BackgroundSync.finish();
                })
                    .catch(e => {
                    logger_2.Logger.error("Impossible de synchroniser en arrière plan.", e);
                    Settings_1.BackgroundSync.finish();
                });
            };
            const failure_fn = () => {
                console.log("La synchronisation n'a pas pu se lancer.");
                const checkbox_setting_bgsync = document.getElementById('__sync_bg_checkbox_settings');
                if (checkbox_setting_bgsync) {
                    helpers_3.showToast("Impossible de lancer la synchronisation");
                    checkbox_setting_bgsync.checked = false;
                }
            };
            if (Settings_1.Settings.sync_bg) {
                // Initialise la synchronisation en arrière plan uniquement si elle est demandée
                if (Settings_1.BackgroundSync.isInit()) {
                    Settings_1.BackgroundSync.initBgSync(success_fn, failure_fn, interval);
                }
                else {
                    Settings_1.BackgroundSync.init(success_fn, failure_fn, interval);
                }
            }
        }
        changeBackgroundSyncInterval(interval) {
            if (Settings_1.BackgroundSync.isInit()) {
                Settings_1.BackgroundSync.changeBgSyncInterval(interval);
            }
            else {
                this.initBackgroundSync(interval);
            }
        }
        startBackgroundSync() {
            if (Settings_1.BackgroundSync.isInit()) {
                Settings_1.BackgroundSync.start();
            }
            else {
                this.initBackgroundSync();
            }
        }
        stopBackgroundSync() {
            if (Settings_1.BackgroundSync.isInit()) {
                Settings_1.BackgroundSync.stop();
            }
        }
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
        remove(id) {
            return this.list.remove(id);
        }
        async sendForm(id, data) {
            // Renvoie une promise réussie si l'envoi du formulaire 
            // et de ses métadonnées a réussi.
            let content;
            try {
                content = await main_3.FILE_HELPER.read('forms/' + id + ".json");
            }
            catch (error) {
                logger_2.Logger.info("Impossible de lire le fichier", error.message);
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
                const response = await fetch_timeout_1.default(main_3.API_URL + "forms/send.json", {
                    method: "POST",
                    body: d,
                    signal,
                    headers: new Headers({ "Authorization": "Bearer " + user_manager_1.UserManager.token })
                }, MAX_TIMEOUT_FOR_FORM);
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
                const base_path = "form_data/" + id + "/";
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
                        base64 = await main_3.FILE_HELPER.read(file, file_helper_1.FileHelperReadMode.url);
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
                        const resp = await fetch_timeout_1.default(main_3.API_URL + "forms/metadata_send.json", {
                            method: "POST",
                            body: md,
                            signal,
                            headers: new Headers({ "Authorization": "Bearer " + user_manager_1.UserManager.token })
                        }, MAX_TIMEOUT_FOR_METADATA);
                        const json = await resp.json();
                        if (json.error_code) {
                            throw { code: "metadata_treatement", error_code: json.error_code, "message": json.message };
                        }
                        // Envoi réussi si ce bout de code est atteint ! On passe au fichier suivant
                    }
                    catch (error) {
                        helpers_3.showToast("Impossible d'envoyer " + basename + ".");
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
            const entries = await main_3.FILE_HELPER.ls('forms', "e");
            const filename = id + ".json";
            for (const entry of entries) {
                if (entry.name === filename) {
                    const json = JSON.parse(await main_3.FILE_HELPER.read(entry));
                    return { type: json.type, metadata: json.metadata };
                }
            }
            // On a pas trouvé, on rejette
            throw "";
        }
        /**
         * Obtient tous les fichiers JSON disponibles sur l'appareil
         */
        async getAllCurrentFiles() {
            const entries = await main_3.FILE_HELPER.ls("forms", "e");
            const promises = [];
            // On ajoute chaque entrée
            for (const entry of entries) {
                promises.push(new Promise(async (resolve) => {
                    const json = JSON.parse(await main_3.FILE_HELPER.read(entry));
                    resolve([entry.name.split('.json')[0], { type: json.type, metadata: json.metadata }]);
                }));
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
            const modal = helpers_3.getModal();
            const instance = helpers_3.initModal({ dismissible: false }, helpers_3.getModalPreloader("Initialisation...", `<div class="modal-footer">
                    <a href="#!" class="red-text btn-flat left" id="__sync_modal_cancel">Annuler</a>
                    <div class="clearb"></div>
                </div>`));
            instance.open();
            let cancel_clicked = false;
            const text = document.getElementById(helpers_3.MODAL_PRELOADER_TEXT_ID);
            const modal_cancel = document.getElementById('__sync_modal_cancel');
            modal_cancel.onclick = () => {
                cancel_clicked = true;
                this.cancelSync();
                if (text)
                    text.insertAdjacentHTML("afterend", `<p class='flow-text center red-text'>Annulation en cours...</p>`);
            };
            const receiver = new SyncEvent;
            // Actualise le texte avec des events
            receiver.addEventListener('begin', () => {
                text.innerText = "Lecture des données à synchroniser";
            });
            receiver.addEventListener('send', (event) => {
                const detail = event.detail;
                text.innerHTML = `Envoi des données au serveur\n(Entrée ${detail.number}/${detail.total})`;
            });
            return this.sync(force_all, clear_cache, undefined, receiver)
                .then(data => {
                helpers_3.showToast("Synchronisation réussie");
                instance.close();
                return data;
            })
                .catch(reason => {
                if (cancel_clicked) {
                    instance.close();
                }
                else if (reason && typeof reason === 'object') {
                    logger_2.Logger.error("Sync fail:", reason);
                    // Si jamais la syncho a été refusée parce qu'une est déjà en cours
                    if (reason.code === "already") {
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="red-text no-margin-top">Une synchronisation est déjà en cours.</h5>
                            <p class="flow-text">Veuillez réessayer ultérieurement.</p>
                            <div class="center">
                                <a href="#!" id="__ask_sync_cancel" class="green-text btn-flat center">Demander l'annulation</a>
                            </div>
                            <div class="clearb"></div>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" class="red-text btn-flat left modal-close">Fermer</a>
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
                                            text.innerText = "Synchronisation annulée.";
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
                                case "aborted": return "La synchonisation a été annulée.";
                                case "json_send": return "Une entrée n'a pas pu être envoyé.";
                                case "metadata_send": return "Un fichier associé à une entrée n'a pas pu être envoyé.";
                                case "file_read": return "Un fichier à envoyer n'a pas pu être lu.";
                                case "id_getter": return "Impossible de communiquer avec la base de données interne gérant la synchronisation.";
                                default: return "Erreur inconnue.";
                            }
                        })(reason.code);
                        // Modifie le texte du modal
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="red-text no-margin-top">Impossible de synchroniser</h5>
                            <p class="flow-text">
                                ${cause}<br>
                                Veuillez réessayer ultérieurement.
                            </p>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" class="red-text btn-flat right modal-close">Fermer</a>
                            <div class="clearb"></div>
                        </div>
                        `;
                    }
                }
                else {
                    // Modifie le texte du modal
                    modal.innerHTML = `
                    <div class="modal-content">
                        <h5 class="red-text no-margin-top">Impossible de synchroniser</h5>
                        <p class="flow-text">
                            Une erreur inconnue est survenue.<br>
                            Veuillez réessayer ultérieurement.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <a href="#!" class="red-text btn-flat right modal-close">Fermer</a>
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
                helpers_3.showToast("Synchronisation réussie");
                return data;
            }
            catch (reason) {
                if (reason && typeof reason === 'object') {
                    logger_2.Logger.error("Sync fail:", reason);
                    // Si jamais la syncho a été refusée parce qu'une est déjà en cours
                    if (reason.code === "already") {
                        helpers_3.showToast('Une synchronisation est déjà en cours.');
                    }
                    else if (typeof reason.code === "string") {
                        let cause = (function (reason_1) {
                            switch (reason_1) {
                                case "aborted": return "La synchonisation a été annulée.";
                                case "json_send": return "Une entrée n'a pas pu être envoyé.";
                                case "metadata_send": return "Un fichier associé à une entrée n'a pas pu être envoyé.";
                                case "file_read": return "Un fichier à envoyer n'a pas pu être lu.";
                                case "id_getter": return "Impossible de communiquer avec la base de données interne gérant la synchronisation.";
                                default: return "Erreur inconnue.";
                            }
                        })(reason.code);
                        // Modifie le texte du modal
                        helpers_3.showToast("Impossible de synchroniser: " + cause);
                    }
                }
                else {
                    helpers_3.showToast("Une erreur est survenue lors de la synchronisation");
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
            for (let position = 0; position < entries.length; position += PROMISE_BY_SYNC_STEP) {
                // Itère par groupe de formulaire. Group de taille PROMISE_BY_SYNC_STEP
                const subset = entries.slice(position, PROMISE_BY_SYNC_STEP + position);
                const promises = [];
                receiver.dispatchEvent(eventCreator("groupsend", subset));
                let i = 1;
                let error_id;
                for (const id of subset) {
                    // Pour chaque clé disponible
                    promises.push(id_getter(id)
                        .catch(error => {
                        error_id = id;
                        return Promise.reject({ code: "id_getter", error });
                    })
                        .then(value => {
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
            if (helpers_3.hasGoodConnection()) {
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
                    logger_2.Logger.info("Synchronisation échouée:", r);
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
        clear() {
            return this.list.clear();
        }
        remainingToSync() {
            return this.list.getRemainingToSync();
        }
        has(id) {
            return this.list.has(id);
        }
    };
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
define("test_vocal_reco", ["require", "exports", "vocal_recognition"], function (require, exports, vocal_recognition_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /// FICHIER DE TEST DE LA RECONNAISSANCE VOCALE
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
            vocal_recognition_1.prompt(actual_question, true)
                .then(values => {
                message_block.classList.remove('blue-text', 'red-text');
                if (parseAnswer(values)) {
                    // Trouvé !
                    const response = list_question_rep[actual_question];
                    const rep = (typeof response === 'string' ? response : response.join('/'));
                    const spoken = if_good_answer[Math.floor(Math.random() * if_good_answer.length)];
                    talk(spoken.replace('*', rep));
                    message_block.classList.add('blue-text');
                    message_block.innerText = "Bravo, vous avez trouvé la bonne réponse : " + rep + " !";
                }
                else {
                    talk(if_bad_answer[Math.floor(Math.random() * if_bad_answer.length)]);
                    message_block.classList.add('red-text');
                    message_block.innerText = "Mauvaise réponse !";
                }
            })
                .catch(() => {
                talk("Veuillez répéter");
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
            talk(actual_question);
        }
        newQuestion();
    }
    exports.launchQuizz = launchQuizz;
});
define("main", ["require", "exports", "PageManager", "helpers", "logger", "audio_listener", "form_schema", "vocal_recognition", "user_manager", "SyncManager", "test_vocal_reco", "file_helper"], function (require, exports, PageManager_1, helpers_4, logger_3, audio_listener_1, form_schema_2, vocal_recognition_2, user_manager_2, SyncManager_1, test_vocal_reco_1, file_helper_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MAX_LIEUX_AFFICHES = 20; /** Maximum de lieux affichés dans le modal de sélection de lieu */
    exports.API_URL = "https://projet.alkihis.fr/"; /** MUST HAVE TRAILING SLASH */
    exports.ENABLE_FORM_DOWNLOAD = true; /** Active le téléchargement automatique des schémas de formulaire au démarrage */
    exports.ID_COMPLEXITY = 20; /** Nombre de caractères aléatoires dans un ID automatique */
    exports.APP_VERSION = 0.6;
    exports.MP3_BITRATE = 256; /** En kb/s */
    exports.SYNC_FREQUENCY_POSSIBILITIES = [15, 30, 60, 120, 240, 480, 1440]; /** En minutes */
    exports.SDCARD_PATH = null;
    exports.SD_FILE_HELPER = null;
    exports.FILE_HELPER = new file_helper_2.FileHelper;
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
        helpers_4.changeDir();
        await exports.FILE_HELPER.waitInit();
        // @ts-ignore Force à demander la permission pour enregistrer du son
        const permissions = cordova.plugins.permissions;
        await new Promise((resolve) => {
            permissions.requestPermission(permissions.RECORD_AUDIO, (status) => {
                resolve(status);
            }, e => { console.log(e); resolve(); });
        });
        // Force à demander la permission pour accéder à la SD
        const permission_write = await new Promise((resolve) => {
            permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, (status) => {
                resolve(status);
            }, e => { console.log(e); resolve(undefined); });
        });
        try {
            if (permission_write && permission_write.hasPermission) {
                const folders = await helpers_4.getSdCardFolder();
                for (const f of folders) {
                    if (f.canWrite) {
                        exports.SDCARD_PATH = f.filePath;
                        exports.SD_FILE_HELPER = new file_helper_2.FileHelper(f.filePath);
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
        logger_3.Logger.init();
        form_schema_2.Forms.init();
        SyncManager_1.SyncManager.init();
        // @ts-ignore Désactive le dézoom automatique sur Android quand l'utilisateur a choisi une petite police
        if (window.MobileAccessibility) {
            // @ts-ignore
            window.MobileAccessibility.usePreferredTextZoom(false);
        }
        // Initialise le bouton retour
        document.addEventListener("backbutton", function () {
            PageManager_1.PageManager.goBack();
        }, false);
        exports.app.initialize();
        initDebug();
        helpers_4.initModal();
        // Check si on est à une page spéciale
        let href = "";
        if (window.location) {
            const tmp = location.href.split('#')[0].split('?');
            // Récupère la partie de l'URL après la query string et avant le #
            href = tmp[tmp.length - 1];
        }
        // Quand les forms sont prêts, on affiche l'app !
        form_schema_2.Forms.onReady(function () {
            let prom;
            if (href && PageManager_1.PageManager.pageExists(href)) {
                prom = PageManager_1.PageManager.changePage(href);
            }
            else {
                prom = PageManager_1.PageManager.changePage(PageManager_1.AppPageName.home);
            }
            prom
                .then(() => {
                // On montre l'écran quand tout est chargé
                navigator.splashscreen.hide();
            })
                .catch(err => {
                // On montre l'écran et on affiche l'erreur
                navigator.splashscreen.hide();
                // Bloque le sidenav pour empêcher de naviguer
                try {
                    PageManager_1.SIDENAV_OBJ.destroy();
                }
                catch (e) { }
                helpers_4.getBase().innerHTML = helpers_4.displayErrorMessage("Impossible d'initialiser l'application", "Erreur: " + err.stack);
            });
        });
    }
    function initDebug() {
        window["DEBUG"] = {
            launchQuizz: test_vocal_reco_1.launchQuizz,
            PageManager: PageManager_1.PageManager,
            saveDefaultForm: helpers_4.saveDefaultForm,
            getLocation: helpers_4.getLocation,
            testDistance: helpers_4.testDistance,
            Logger: logger_3.Logger,
            Forms: form_schema_2.Forms,
            SyncEvent: SyncManager_1.SyncEvent,
            askModalList: helpers_4.askModalList,
            FileHelper: file_helper_2.FileHelper,
            FileHelperReadMode: file_helper_2.FileHelperReadMode,
            createRandomForms: helpers_4.createRandomForms,
            recorder: function () {
                audio_listener_1.newModalRecord(document.createElement('button'), document.createElement('input'), {
                    name: "__test__",
                    label: "Test",
                    type: form_schema_2.FormEntityType.audio
                });
            },
            dateFormatter: helpers_4.dateFormatter,
            prompt: vocal_recognition_2.prompt,
            createNewUser: user_manager_2.createNewUser,
            UserManager: user_manager_2.UserManager,
            SyncManager: SyncManager_1.SyncManager
        };
    }
    document.addEventListener('deviceready', initApp, false);
});
define("logger", ["require", "exports", "main"], function (require, exports, main_4) {
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
    exports.Logger = new class {
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
            main_4.FILE_HELPER.touch("log.txt")
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
                console.error("Impossible d'écrire: ", error.message);
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
    };
});
define("form_schema", ["require", "exports", "helpers", "user_manager", "main", "fetch_timeout", "file_helper"], function (require, exports, helpers_5, user_manager_3, main_5, fetch_timeout_2, file_helper_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    fetch_timeout_2 = __importDefault(fetch_timeout_2);
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
    })(FormEntityType = exports.FormEntityType || (exports.FormEntityType = {}));
    // Classe contenant le formulaire JSON chargé et parsé
    exports.Forms = new class {
        constructor() {
            this.form_ready = false;
            this.waiting_callee = [];
            this.current = null;
            this._current_key = null;
            this._default_form_key = null;
            this.DEAD_FORM_SCHEMA = { name: null, fields: [], locations: {} };
            this.FORM_LOCATION = 'loaded_forms.json';
            if (localStorage.getItem('default_form_key')) {
                this._default_form_key = localStorage.getItem('default_form_key');
            }
            // Sauvegarde dans le localStorage quoiqu'il arrive
            this.default_form_key = this._default_form_key;
            /** call init() after constructor() ! */
        }
        saveForms() {
            if (this.available_forms) {
                main_5.FILE_HELPER.write(this.FORM_LOCATION, this.available_forms);
            }
        }
        /**
         * Initialise les formulaires disponible via un fichier JSON.
         * Si un connexion Internet est disponible, télécharge les derniers formulaires depuis le serveur.
         * Charge automatiquement un formulaire par défaut: la clé du formulaire par défaut est contenu dans "default_form_name"
         * @param crash_if_not_form_download Rejette la promesse si le téléchargement des formulaires
         */
        init(crash_if_not_form_download = false) {
            const loadJSONInObject = (json, save = false) => {
                // Le JSON est reçu, on l'enregistre dans available_forms
                this.available_forms = json;
                // On met le form à ready
                this.form_ready = true;
                // On enregistre le formulaire par défaut (si la clé définie existe)
                if (this._default_form_key in this.available_forms) {
                    this.current = this.available_forms[this._default_form_key];
                    this._current_key = this._default_form_key;
                }
                else {
                    this.current = this.DEAD_FORM_SCHEMA;
                }
                // On sauvegarde les formulaires dans loaded_forms.json
                // uniquement si demandé
                if (save) {
                    this.saveForms();
                }
                // On exécute les fonctions en attente
                let func;
                while (func = this.waiting_callee.pop()) {
                    func(this.available_forms, this.current);
                }
            };
            const readStandardForm = () => {
                // On vérifie si le fichier loaded_forms.json existe
                main_5.FILE_HELPER.read(this.FORM_LOCATION)
                    .then((string) => {
                    loadJSONInObject(JSON.parse(string));
                })
                    .catch(() => {
                    // Il n'existe pas, on doit le charger depuis les sources de l'application
                    $.get('assets/form.json', {}, (json) => {
                        loadJSONInObject(json, true);
                    }, 'json')
                        .fail(async function () {
                        // Essaie de lire le fichier sur le périphérique
                        const application = new file_helper_3.FileHelper(cordova.file.applicationDirectory + 'www/');
                        await application.waitInit();
                        application.read('assets/form.json')
                            .then(string => {
                            loadJSONInObject(JSON.parse(string));
                        })
                            .catch(() => {
                            helpers_5.showToast("Impossible de charger les schémas." + " " + cordova.file.applicationDirectory + 'www/assets/form.json');
                        });
                    });
                });
            };
            const init_text = document.getElementById('__init_text_center');
            if (init_text) {
                init_text.innerText = "Mise à jour des schémas de formulaire";
            }
            // noinspection OverlyComplexBooleanExpressionJS
            if ((main_5.ENABLE_FORM_DOWNLOAD || crash_if_not_form_download) && helpers_5.hasConnection() && user_manager_3.UserManager.logged) {
                // On tente d'actualiser les formulaires disponibles
                // On attend au max 20 secondes
                return fetch_timeout_2.default(main_5.API_URL + "schemas/subscribed.json", {
                    headers: new Headers({ "Authorization": "Bearer " + user_manager_3.UserManager.token }),
                    method: "GET"
                }, crash_if_not_form_download ? 30000 : 5000)
                    .then(response => response.json())
                    .then(json => {
                    if (json.error_code)
                        throw json.error_code;
                    loadJSONInObject(json, true);
                })
                    .catch(error => {
                    console.log("Timeout/fail for forms");
                    // Impossible de charger le JSON depuis le serveur
                    if (crash_if_not_form_download) {
                        return Promise.reject(error);
                    }
                    readStandardForm();
                });
            }
            else {
                if (crash_if_not_form_download) {
                    return Promise.reject();
                }
                readStandardForm();
            }
        }
        /**
         * Exécute callback quand l'objet est prêt.
         * @param callback Fonction à appeler quand le formulaire est prêt
         */
        onReady(callback) {
            if (this.form_ready) {
                callback(this.available_forms, this.current);
            }
            else {
                this.waiting_callee.push(callback);
            }
        }
        /**
         * Renvoie vrai si le formulaire existe. Renvoie également vrai pour null.
         * @param name Clé du formulaire
         */
        formExists(name) {
            return name === null || name in this.available_forms;
        }
        /**
         * Change le formulaire courant renvoyé par onReady
         * @param name clé d'accès au formulaire
         * @param make_default enregistre le nouveau formulaire comme clé par défaut
         */
        changeForm(name, make_default = false) {
            if (name === null) {
                // On supprime le formulaire chargé
                this.current = this.DEAD_FORM_SCHEMA;
                this._current_key = null;
                if (make_default) {
                    this.default_form_key = null;
                }
                return;
            }
            if (this.formExists(name)) {
                this.current = this.available_forms[name];
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
        getForm(name) {
            if (this.formExists(name)) {
                return this.available_forms[name];
            }
            else {
                throw new Error("Form does not exists");
            }
        }
        deleteForm(name) {
            if (this.formExists(name) && name !== null) {
                delete this.available_forms[name];
                if (this._current_key === name) {
                    this._current_key = null;
                }
            }
        }
        /**
         * Retourne un tableau de tuples contenant en
         * première position la clé d'accès au formulaire,
         * et en seconde position son nom textuel à présenter à l'utilisateur
         * @returns [string, string][]
         */
        getAvailableForms() {
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
            this.saveForms();
        }
    };
});
define("helpers", ["require", "exports", "PageManager", "form_schema", "SyncManager", "main"], function (require, exports, PageManager_2, form_schema_3, SyncManager_2, main_6) {
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
                PageManager_2.PageManager.goBack();
            };
            back_btn.classList.remove('hide');
        }
        else if (device.platform === "iOS") {
            FOLDER = cordova.file.dataDirectory;
        }
    }
    exports.changeDir = changeDir;
    let DIR_ENTRY = null;
    /**
     * Lit un fichier et passe son résultat sous forme de texte ou base64 à callback
     * @param fileName Nom du fichier
     * @param callback Fonction appelée si réussie
     * @param callbackIfFailed Fonction appelée en cas d'échec
     * @param asBase64 true si le fichier doit être passé encodé en base64
     */
    function __readFromFile(fileName, callback, callbackIfFailed, asBase64 = false) {
        const pathToFile = FOLDER + fileName;
        window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
            fileEntry.file(function (file) {
                const reader = new FileReader();
                reader.onloadend = function () {
                    callback(this.result);
                };
                if (asBase64) {
                    reader.readAsDataURL(file);
                }
                else {
                    reader.readAsText(file);
                }
            }, function () {
                if (callbackIfFailed) {
                    callbackIfFailed();
                }
                else {
                    console.log("not readable");
                }
            });
        }, function () {
            if (callbackIfFailed) {
                callbackIfFailed();
            }
            else {
                console.log("not found");
            }
        });
    }
    exports.__readFromFile = __readFromFile;
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
    function __readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = function () {
                resolve(this.result);
            };
            r.onerror = function (error) {
                // Erreur de lecture du fichier => on rejette
                reject(error);
            };
            r.readAsArrayBuffer(file);
        });
    }
    exports.__readFileAsArrayBuffer = __readFileAsArrayBuffer;
    /**
     * Lit un fichier fileName en tant que texte ou base64, et passe le résultat ou l'échec sous forme de Promise
     * @param fileName Nom du fichier
     * @param asBase64 true si fichier passé en base64 dans la promesse
     * @param forceBaseDir Forcer un répertoire d'origine pour le nom du fichier. (défaut: dossier de stockage de données)
     */
    function __readFile(fileName, asBase64 = false, forceBaseDir = FOLDER) {
        const pathToFile = forceBaseDir + fileName;
        return new Promise(function (resolve, reject) {
            window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
                fileEntry.file(function (file) {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        resolve(this.result);
                    };
                    if (asBase64) {
                        reader.readAsDataURL(file);
                    }
                    else {
                        reader.readAsText(file);
                    }
                }, reject);
            }, function (err) {
                reject(err);
            });
        });
    }
    exports.__readFile = __readFile;
    /**
     * Lit un fichier en texte ou base64 depuis son FileEntry et envoie son résultat dans une Promise
     * @param fileEntry FileEntry
     * @param asBase64 true si fichier passé en base64 à la Promise
     */
    function __readFileFromEntry(fileEntry, asBase64 = false) {
        return new Promise(function (resolve, reject) {
            fileEntry.file(function (file) {
                const reader = new FileReader();
                reader.onloadend = function () {
                    resolve(this.result);
                };
                if (asBase64) {
                    reader.readAsDataURL(file);
                }
                else {
                    reader.readAsText(file);
                }
            }, reject);
        });
    }
    exports.__readFileFromEntry = __readFileFromEntry;
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
        const file = await main_6.FILE_HELPER.get(path);
        element.src = file.toURL();
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
    function informalBottomModal(title, info, text_close = "Fermer") {
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
    function askModal(title, question, text_yes = "Oui", text_no = "Non", checkbox) {
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
            PageManager_2.PageManager.lock_return_button = true;
            document.getElementById('__question_yes').addEventListener('click', () => {
                PageManager_2.PageManager.lock_return_button = false;
                if (chk) {
                    resolve(chk.checked);
                }
                else {
                    resolve();
                }
            });
            document.getElementById('__question_no').addEventListener('click', () => {
                PageManager_2.PageManager.lock_return_button = false;
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
    function convertHTMLToElement(htmlString) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        return tempDiv.firstElementChild;
    }
    exports.convertHTMLToElement = convertHTMLToElement;
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
    function convertMinutesToText(min) {
        if (min < 60) {
            return `${min} minutes`;
        }
        else {
            const hours = Math.trunc(min / 60);
            const minutes = Math.trunc(min % 60);
            return `${hours} heure${hours > 1 ? 's' : ''} ${minutes || ""}`;
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
    async function createRandomForms(count) {
        if (form_schema_3.Forms.current_key === null) {
            throw "Impossible de créer une entrée sans base";
        }
        const current = form_schema_3.Forms.getForm(form_schema_3.Forms.current_key);
        const promises = [];
        for (let i = 0; i < count; i++) {
            const save = {
                fields: {},
                location: "",
                type: form_schema_3.Forms.current_key,
                owner: "randomizer",
                metadata: {}
            };
            for (const field of current.fields) {
                switch (field.type) {
                    case form_schema_3.FormEntityType.bigstring:
                    case form_schema_3.FormEntityType.string:
                    case form_schema_3.FormEntityType.datetime:
                    case form_schema_3.FormEntityType.select:
                    case form_schema_3.FormEntityType.slider:
                        save.fields[field.name] = generateId(25);
                        break;
                    case form_schema_3.FormEntityType.integer:
                        save.fields[field.name] = Math.trunc(Math.random() * 1000);
                        break;
                    case form_schema_3.FormEntityType.float:
                        save.fields[field.name] = Math.random();
                        break;
                    case form_schema_3.FormEntityType.file:
                    case form_schema_3.FormEntityType.audio:
                        save.fields[field.name] = null;
                        break;
                    case form_schema_3.FormEntityType.checkbox:
                        save.fields[field.name] = Math.random() > 0.5;
                        break;
                }
            }
            // Sauvegarde du formulaire
            const id = generateId(20);
            promises.push(main_6.FILE_HELPER.write("forms/" + id + ".json", save)
                .then(() => {
                return SyncManager_2.SyncManager.add(id, save);
            }));
            if (main_6.SD_FILE_HELPER) {
                main_6.SD_FILE_HELPER.write("forms/" + id + ".json", save).catch(error => console.log(error));
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
define("location", ["require", "exports", "helpers"], function (require, exports, helpers_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UNKNOWN_NAME = "__unknown__";
    const UNKNOWN_LABEL = "Lieu inconnu";
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
        label.textContent = "Lieu";
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
                    helpers_6.showToast("Ce lieu n'existe pas.");
                }
            }
        });
        return labels_to_name;
    }
    exports.createLocationInputSelector = createLocationInputSelector;
});
define("form", ["require", "exports", "vocal_recognition", "form_schema", "helpers", "main", "PageManager", "logger", "audio_listener", "user_manager", "SyncManager", "location", "file_helper"], function (require, exports, vocal_recognition_3, form_schema_4, helpers_7, main_7, PageManager_3, logger_4, audio_listener_2, user_manager_4, SyncManager_3, location_1, file_helper_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function createInputWrapper() {
        const e = document.createElement('div');
        e.classList.add("row", "input-field", "col", "s12");
        return e;
    }
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
    function showHideTip(current, show) {
        if (current.nextElementSibling && current.nextElementSibling.classList.contains("invalid-tip")) {
            // Si il y a un tip, on le fait appraître
            if (show)
                $(current.nextElementSibling).slideDown(200);
            else
                $(current.nextElementSibling).slideUp(200);
        }
    }
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
    function constructForm(placeh, current_form, filled_form) {
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
                    helpers_7.showToast("Attention: La localisation de cette entrée n'existe plus dans le schéma du formulaire.");
                }
            }
            loc_wrapper.appendChild(location);
            const loc_title = document.createElement('h4');
            loc_title.innerText = "Lieu";
            placeh.appendChild(loc_title);
            placeh.appendChild(loc_wrapper);
            // Fin champ de lieu, itération sur champs
        }
        for (const ele of current_form.fields) {
            let element_to_add = null;
            if (ele.type === form_schema_4.FormEntityType.divider) {
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
            else if (ele.type === form_schema_4.FormEntityType.integer || ele.type === form_schema_4.FormEntityType.float) {
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
                if (ele.type === form_schema_4.FormEntityType.float && ele.float_precision) {
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
                        else if (ele.type === form_schema_4.FormEntityType.float) {
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
                        vocal_recognition_3.prompt().then(function (value) {
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
                                M.toast({ html: "Nombre incorrect reconnu." });
                            }
                        });
                    });
                    real_wrapper.appendChild(mic_btn);
                }
                element_to_add = real_wrapper;
            }
            else if (ele.type === form_schema_4.FormEntityType.string || ele.type === form_schema_4.FormEntityType.bigstring) {
                const real_wrapper = document.createElement('div');
                const wrapper = createInputWrapper();
                let htmle;
                if (ele.type === form_schema_4.FormEntityType.string) {
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
                    let timer;
                    const gestion_click = function (erase = true) {
                        vocal_recognition_3.prompt().then(function (value) {
                            let val = value;
                            if (ele.remove_whitespaces) {
                                val = val.replace(/ /g, '').replace(/à/iug, 'a');
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
            else if (ele.type === form_schema_4.FormEntityType.select) {
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
                        vocal_recognition_3.prompt("Parlez maintenant", true).then(function (value) {
                            let val;
                            if (htmle.multiple)
                                val = vocal_recognition_3.testMultipleOptionsVesusExpected(sel_opt, value);
                            else
                                val = vocal_recognition_3.testOptionsVersusExpected(sel_opt, value);
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
                                M.toast({ html: "Aucune option ne correspond à votre demande" });
                            }
                        });
                    });
                    real_wrapper.appendChild(mic_btn);
                }
                htmle.dataset.e_constraints = ele.external_constraints || "";
                htmle.dataset.invalid_tip = ele.tip_on_invalid || "";
                // Évènement pour le select: contraintes externes ou si select multiple.required
                if (htmle.multiple || ele.external_constraints) {
                    // Création du tip
                    createTip(wrapper, ele);
                    htmle.addEventListener('change', function () {
                        let valid = true;
                        if (this.multiple && this.required && $(this).val().length === 0) {
                            valid = false;
                        }
                        else if (this.value && ele.external_constraints) {
                            valid = validConstraints(ele.external_constraints, this);
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
            else if (ele.type === form_schema_4.FormEntityType.checkbox) {
                const wrapper = document.createElement('p');
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = "checkbox";
                const span = document.createElement('span');
                fillStandardInputValues(input, ele, span);
                wrapper.classList.add('row', 'col', 's12', 'input-checkbox', 'flex-center-aligner');
                input.classList.add('filled-in', 'input-form-element');
                if (filled_form && ele.name in filled_form.fields) {
                    input.checked = filled_form.fields[ele.name];
                }
                wrapper.appendChild(label);
                label.appendChild(input);
                label.appendChild(span);
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_4.FormEntityType.datetime) {
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
            else if (ele.type === form_schema_4.FormEntityType.date) {
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
                    input.value = helpers_7.dateFormatter("Y-m-d");
                }
                wrapper.appendChild(label);
                wrapper.appendChild(input);
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_4.FormEntityType.time) {
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
                    input.value = helpers_7.dateFormatter("H:i");
                }
                wrapper.appendChild(label);
                wrapper.appendChild(input);
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_4.FormEntityType.file) {
                //// Attention ////
                // L'input de type file pour les images, sur android,
                // ne propose pas le choix entre prendre une nouvelle photo
                // et choisir une image enregistrée. Le choix est FORCÉMENT
                // de choisir une image enregistrée. 
                // Le problème peut être contourné en créant un input personnalisé
                // avec choix en utilisant navigator.camera et le plugin cordova camera.
                if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                    // L'input file est déjà présent dans le formulaire
                    // on affiche une miniature
                    const img_miniature = document.createElement('div');
                    img_miniature.classList.add('image-form-wrapper');
                    const img_balise = document.createElement('img');
                    img_balise.classList.add('img-form-element');
                    helpers_7.createImgSrc(filled_form.fields[ele.name], img_balise);
                    img_miniature.appendChild(img_balise);
                    placeh.appendChild(img_miniature);
                }
                // Input de type file
                const wrapper = document.createElement('div');
                wrapper.classList.add('file-field', 'input-field', 'row', 'col', 's12');
                const divbtn = document.createElement('div');
                divbtn.classList.add('btn');
                const span = document.createElement('span');
                span.innerText = "Fichier";
                const input = document.createElement('input');
                input.type = "file";
                input.id = "id_" + ele.name;
                input.name = ele.name;
                input.required = ele.required;
                input.accept = ele.file_type || "";
                input.classList.add('input-image-element');
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
                placeh.appendChild(wrapper);
                // Sépare les champ input file
                placeh.insertAdjacentHTML('beforeend', "<div class='clearb'></div><div class='divider divider-margin'></div>");
            }
            else if (ele.type === form_schema_4.FormEntityType.audio) {
                // Création d'un bouton pour enregistrer du son
                const wrapper = document.createElement('div');
                wrapper.classList.add('input-field', 'row', 'col', 's12', 'no-margin-top');
                const label = document.createElement('p');
                label.classList.add('no-margin-top', 'form-audio-label');
                label.innerText = ele.label;
                wrapper.appendChild(label);
                const button = document.createElement('button');
                button.classList.add('btn', 'blue', 'col', 's12', 'btn-perso');
                button.innerText = "Enregistrement audio";
                button.type = "button";
                const real_input = document.createElement('input');
                real_input.type = "hidden";
                real_input.classList.add('input-audio-element');
                // Construit le label à retenir pour pouvoir afficher son titre dans le modal de confirmation
                real_input.dataset.label = ele.label;
                // Création d'un label vide pour l'input
                const hidden_label = document.createElement('label');
                fillStandardInputValues(real_input, ele, hidden_label);
                hidden_label.classList.add('hide');
                wrapper.appendChild(hidden_label);
                ////// Définition si un fichier son existe déjà
                if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                    main_7.FILE_HELPER.read(filled_form.fields[ele.name], file_helper_4.FileHelperReadMode.url)
                        .then(base64 => {
                        button.classList.remove('blue');
                        button.classList.add('green');
                        real_input.value = base64;
                        const duration = ((base64.length * 0.7) / (main_7.MP3_BITRATE * 1000)) * 8;
                        button.innerText = "Enregistrement (" + duration.toFixed(0) + "s" + ")";
                    })
                        .catch(err => {
                        logger_4.Logger.warn("Impossible de charger le fichier", err);
                    });
                }
                ////// Fin
                button.addEventListener('click', function () {
                    // Crée un modal qui sert à enregistrer de l'audio
                    audio_listener_2.newModalRecord(button, real_input, ele);
                });
                wrapper.appendChild(button);
                wrapper.appendChild(real_input);
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_4.FormEntityType.slider) {
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
     * Lance la vérification des champs pour ensuite sauvegarder le formulaire
     * @param type Type de formulaire (ex: cincle_plongeur)
     * @param current_form
     * @param force_name? Force un identifiant pour le form à enregistrer
     * @param form_save? Précédente sauvegarde du formulaire
     */
    async function beginFormSave(type, current_form, force_name, form_save) {
        // Ouverture du modal de verification
        const modal = helpers_7.getModal();
        const instance = helpers_7.initModal({ dismissible: false, outDuration: 100 }, helpers_7.getModalPreloader("Vérification du formulaire en cours", `<div class="modal-footer">
            <a href="#!" class="btn-flat red-text modal-close">Annuler</a>
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
                elements_warn.push(["Lieu", "Aucun lieu n'a été précisé.", location_element]);
            else
                elements_failed.push(["Lieu", "Aucun lieu n'a été précisé.", location_element]);
        }
        if (location_str === location_1.UNKNOWN_NAME) {
            elements_warn.push(["Lieu", "Le lieu choisi est un lieu inexistant.", undefined]);
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
            // Valide des contraintes externes si jamais l'élément a une valeur
            if (element.value && element.dataset.e_constraints && !validConstraints(element.dataset.e_constraints, element)) {
                const str = element.dataset.invalid_tip || "Les contraintes externes du champ ne sont pas remplies.";
                if (element.required) {
                    elements_failed.push([name, str, element]);
                }
                else {
                    elements_warn.push([name, str, element]);
                }
            }
            else if (element.required && !element.value) {
                if (element.tagName !== "SELECT" || (element.multiple && $(element).val().length === 0)) {
                    elements_failed.push([name, "Champ requis", element]);
                }
            }
            else {
                let str = "";
                // Si le champ est requis et a une valeur, on recherche ses contraintes
                if (Object.keys(contraintes).length > 0 || element.type === "number") {
                    if (element.type === "text" || element.tagName === "textarea") {
                        if (typeof contraintes.min !== 'undefined' && element.value.length < contraintes.min) {
                            str += "La taille du texte doit être égale ou supérieure à " + contraintes.min + " caractères. ";
                        }
                        if (typeof contraintes.max !== 'undefined' && element.value.length > contraintes.max) {
                            str += "La taille du texte doit être égale ou inférieure à " + contraintes.max + " caractères. ";
                        }
                    }
                    else if (element.type === "number" && element.value !== "") {
                        if (element.validity.rangeUnderflow) {
                            str += "Le nombre doit être égal ou supérieur à " + element.min + ". ";
                        }
                        if (element.validity.rangeOverflow) {
                            str += "Le nombre doit être égal ou inférieur à " + element.max + ". ";
                        }
                        // Vérification de la précision
                        if (element.step) {
                            if (element.validity.stepMismatch) {
                                str += "Le nombre doit avoir une précision de " + element.step + ". ";
                            }
                            else if (element.value.indexOf('.') === -1) {
                                str += "Le nombre doit être à virgule. ";
                            }
                        }
                    }
                }
                // On vérifie que le champ n'a pas un "suggested_not_blank"
                // Le warning ne peut pas s'afficher pour les éléments non requis: de toute façon, si ils
                // sont vides, la vérification lève une erreur fatale.
                if (contraintes.suggest && !element.required && element.value === "") {
                    str += "Cet élément ne devrait pas être vide. ";
                }
                if (str) {
                    if (element.required) {
                        elements_failed.push([name, str, element]);
                    }
                    else {
                        elements_warn.push([name, str, element]);
                    }
                }
                // Si c'est autre chose, l'élément est forcément valide
            }
        }
        // Éléments FILE (ici, possiblement que des images)
        for (const e of document.querySelectorAll('.input-image-element[required]')) {
            const filei = e;
            if (filei.files.length === 0) {
                const label = document.querySelector(`input[data-for="${filei.id}"]`);
                let name = filei.name;
                if (label) {
                    name = label.dataset.label;
                }
                elements_failed.push([name, "Fichier requis", filei]);
            }
        }
        // Éléments AUDIO (avec le modal permettant d'enregistrer du son)
        for (const e of document.querySelectorAll('.input-audio-element[required]')) {
            const hiddeni = e;
            if (!hiddeni.value) {
                elements_failed.push([hiddeni.dataset.label, "Enregistrement audio requis", hiddeni]);
            }
        }
        // Construit les éléments dans le modal
        const container = document.createElement('div');
        container.classList.add('modal-content');
        if (elements_warn.length > 0 || elements_failed.length > 0) {
            const par = document.createElement('p');
            par.classList.add('flow-text', 'no-margin-top');
            par.innerText = "Des erreurs " + (!elements_failed.length ? 'potentielles' : '') + " ont été détectées.";
            container.appendChild(par);
            if (!elements_failed.length) {
                const tinypar = document.createElement('p');
                tinypar.style.marginTop = "-15px";
                tinypar.innerText = "Veuillez vérifier votre saisie avant de continuer.";
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
                list.appendChild(li);
            }
            for (const warning of elements_warn) {
                const li = document.createElement('li');
                li.classList.add("collection-item");
                li.innerHTML = `
                <span class="bold">${warning[0]}</span>: 
                <span>${warning[1]}</span>
            `;
                list.appendChild(li);
            }
            container.appendChild(list);
        }
        else {
            // On affiche un message de succès
            const title = document.createElement('h5');
            title.classList.add('no-margin-top');
            title.innerText = "Résumé";
            container.appendChild(title);
            const par = document.createElement('p');
            par.classList.add('flow-text');
            par.innerText = "Votre saisie ne contient aucune erreur. Vous pouvez désormais enregistrer cette entrée.";
            container.appendChild(par);
        }
        // Footer
        const footer = document.createElement('div');
        footer.classList.add('modal-footer');
        const cancel_btn = document.createElement('a');
        cancel_btn.href = "#!";
        cancel_btn.classList.add('btn-flat', 'left', 'modal-close', 'red-text');
        cancel_btn.innerText = "Corriger";
        footer.appendChild(cancel_btn);
        // Si aucun élément requis n'est oublié ou invalide, alors on autorise la sauvegarde
        if (elements_failed.length === 0) {
            const save_btn = document.createElement('a');
            save_btn.href = "#!";
            save_btn.classList.add('btn-flat', 'right', 'green-text');
            save_btn.innerText = "Sauvegarder";
            save_btn.onclick = function () {
                modal.innerHTML = helpers_7.getModalPreloader("Sauvegarde en cours");
                modal.classList.remove('modal-fixed-footer');
                const unique_id = force_name || helpers_7.generateId(main_7.ID_COMPLEXITY);
                PageManager_3.PageManager.lock_return_button = true;
                saveForm(type, unique_id, location_str, form_save)
                    .then((form_values) => {
                    SyncManager_3.SyncManager.add(unique_id, form_values);
                    if (form_save) {
                        instance.close();
                        helpers_7.showToast("Écriture de l'entrée et de ses données réussie.");
                        // On vient de la page d'édition de formulaire déjà créés
                        PageManager_3.PageManager.popPage();
                        // PageManager.reload(); la page se recharge toute seule au pop
                    }
                    else {
                        // On demande si on veut faire une nouvelle entrée
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="no-margin-top">Entrée enregistrée avec succès</h5>
                            <p class="flow-text">
                                Voulez-vous saisir une nouvelle entrée ?
                            </p>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" id="__after_save_entries" class="modal-close btn-flat blue-text left">Non</a>
                            <a href="#!" id="__after_save_new" class="modal-close btn-flat green-text right">Oui</a>
                            <div class="clearb"></div>
                        </div>
                        `;
                        document.getElementById('__after_save_entries').onclick = function () {
                            PageManager_3.PageManager.changePage(PageManager_3.AppPageName.saved, false);
                        };
                        document.getElementById('__after_save_new').onclick = function () {
                            setTimeout(() => {
                                PageManager_3.PageManager.reload(undefined, true);
                            }, 150);
                        };
                    }
                })
                    .catch((error) => {
                    modal.innerHTML = `
                    <div class="modal-content">
                        <h5 class="no-margin-top red-text">Erreur</h5>
                        <p class="flow-text">
                            Impossible d'enregistrer cette entrée.
                            Veuillez réessayer.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <a href="#!" class="btn-flat right red-text modal-close">Fermer</a>
                        <div class="clearb"></div>
                    </div>
                    `;
                    PageManager_3.PageManager.lock_return_button = false;
                    logger_4.Logger.error(error, error.message, error.stack);
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
    /**
     * Sauvegarde le formulaire actuel dans un fichier .json
     * @param type
     * @param name
     * @param location
     * @param form_save
     */
    function saveForm(type, name, location, form_save) {
        const form_values = {
            fields: {},
            type,
            location,
            owner: (form_save ? form_save.owner : user_manager_4.UserManager.username),
            metadata: {}
        };
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
                    form_values.fields[i.name] = i.checked;
                }
            }
            else if (i.type === "number") {
                form_values.fields[i.name] = i.value === "" ? null : Number(i.value);
            }
            else {
                form_values.fields[i.name] = i.value;
            }
        }
        return writeDataThenForm(name, form_values, form_save);
    }
    exports.saveForm = saveForm;
    /**
     * Ecrit les fichiers présents dans le formulaire dans un dossier spécifique,
     * puis crée le formulaire
     * @param name Nom du formulaire (sans le .json)
     * @param form_values
     * @param older_save
     */
    async function writeDataThenForm(name, form_values, older_save) {
        function saveBlobToFile(filename, input_name, blob) {
            const full_path = 'form_data/' + name + '/' + filename;
            return main_7.FILE_HELPER.write(full_path, blob)
                .then(() => {
                if (device.platform === 'Android' && main_7.SD_FILE_HELPER) {
                    return main_7.SD_FILE_HELPER.write(full_path, blob).catch(e => console.log(e));
                }
            })
                .then(() => {
                // Enregistre le nom du fichier sauvegardé dans le formulaire,
                // dans la valeur du champ field
                form_values.fields[input_name] = full_path;
                form_values.metadata[input_name] = filename;
                if (older_save && input_name in older_save.fields && older_save.fields[input_name] !== null) {
                    // Si une image était déjà présente
                    if (older_save.fields[input_name] !== form_values.fields[input_name]) {
                        // Si le fichier enregistré est différent du fichier actuel
                        // Suppression de l'ancienne image
                        if (main_7.SD_FILE_HELPER) {
                            main_7.SD_FILE_HELPER.rm(older_save.fields[input_name]);
                        }
                        main_7.FILE_HELPER.rm(older_save.fields[input_name]);
                    }
                }
            })
                .catch((error) => {
                helpers_7.showToast("Un fichier n'a pas pu être sauvegardé. Vérifiez votre espace de stockage.");
                return Promise.reject(error);
            });
        }
        // Récupère les images du formulaire
        const images_from_form = document.getElementsByClassName('input-image-element');
        // Sauvegarde les images !
        const promises = [];
        for (const img of images_from_form) {
            const file = img.files[0];
            const input_name = img.name;
            if (file) {
                const filename = file.name;
                promises.push(saveBlobToFile(filename, input_name, file));
            }
            else {
                if (older_save && input_name in older_save.fields) {
                    form_values.fields[input_name] = older_save.fields[input_name];
                    if (typeof older_save.fields[input_name] === 'string') {
                        const parts = older_save.fields[input_name].split('/');
                        form_values.metadata[input_name] = parts[parts.length - 1];
                    }
                    else {
                        form_values.metadata[input_name] = null;
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
                const filename = helpers_7.generateId(main_7.ID_COMPLEXITY) + '.mp3';
                promises.push(helpers_7.urlToBlob(file).then(function (blob) {
                    return saveBlobToFile(filename, input_name, blob);
                }));
            }
            else {
                if (older_save && input_name in older_save.fields) {
                    form_values.fields[input_name] = older_save.fields[input_name];
                    if (typeof older_save.fields[input_name] === 'string') {
                        const parts = older_save.fields[input_name].split('/');
                        form_values.metadata[input_name] = parts[parts.length - 1];
                    }
                    else {
                        form_values.metadata[input_name] = null;
                    }
                }
                else {
                    form_values.fields[input_name] = null;
                    form_values.metadata[input_name] = null;
                }
            }
        }
        await Promise.all(promises);
        // On supprime les metadonnées vides du form
        for (const n in form_values.metadata) {
            if (form_values.metadata[n] === null) {
                delete form_values.metadata[n];
            }
        }
        await main_7.FILE_HELPER.write('forms/' + name + '.json', form_values);
        if (device.platform === 'Android' && main_7.SD_FILE_HELPER) {
            main_7.SD_FILE_HELPER.write('forms/' + name + '.json', form_values).catch((e) => console.log(e));
        }
        console.log(form_values);
        return form_values;
    }
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
            form_schema_4.Forms.onReady(function (_, current) {
                if (form_schema_4.Forms.current_key === null) {
                    // Aucun formulaire n'est chargé !
                    base.innerHTML = helpers_7.displayErrorMessage("Aucun schéma n'est chargé.", "Sélectionnez le schéma de formulaire à utiliser dans les paramètres.");
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
        if (!edition_mode && !user_manager_4.UserManager.logged) {
            // Si on est en mode création et qu'on est pas connecté
            base.innerHTML = base.innerHTML = helpers_7.displayErrorMessage("Vous devez vous connecter pour saisir une nouvelle entrée.", "Connectez-vous dans les paramètres.");
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
            constructForm(placeh, current_form, edition_mode.save);
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
        btn.innerText = "Enregistrer";
        const current_form_key = form_schema_4.Forms.current_key;
        btn.addEventListener('click', function () {
            if (edition_mode) {
                beginFormSave(edition_mode.save.type, current_form, edition_mode.name, edition_mode.save);
            }
            else {
                try {
                    beginFormSave(current_form_key, current_form);
                }
                catch (e) {
                    logger_4.Logger.error(JSON.stringify(e));
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
            PageManager_3.PageManager.goBack();
        }
        helpers_7.getModalInstance().close();
        helpers_7.getModal().classList.remove('modal-fixed-footer');
    }
    /**
     * Charge le sélecteur de localisation depuis un schéma de formulaire
     * @param current_form Schéma de formulaire chargé
     */
    function callLocationSelector(current_form) {
        // Obtient l'élément HTML du modal
        const modal = helpers_7.getModal();
        const instance = helpers_7.initModal({
            dismissible: false, preventScrolling: true
        });
        // Ouvre le modal et insère un chargeur
        instance.open();
        modal.innerHTML = helpers_7.getModalPreloader("Recherche de votre position...\nCeci peut prendre jusqu'à 30 secondes.", `<div class="modal-footer">
            <a href="#!" id="dontloc-footer-geoloc" class="btn-flat blue-text left">Saisie manuelle</a>
            <a href="#!" id="close-footer-geoloc" class="btn-flat red-text">Annuler</a>
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
        helpers_7.getLocation(function (coords) {
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
        title.innerText = "Sélection manuelle";
        content.appendChild(title);
        // Vide le modal actuel et le remplace par le contenu et footer créés
        modal.innerHTML = "";
        modal.appendChild(content);
        const labels_to_name = location_1.createLocationInputSelector(content, input, locations, undefined, true);
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
                    distance: helpers_7.calculateDistance(current_location.coords, locations[lieu])
                });
            }
            lieux_dispo = lieux_dispo.sort((a, b) => a.distance - b.distance);
            // Titre
            const title = document.createElement('h5');
            title.innerText = "Lieux proches";
            content.appendChild(title);
            // Construction de la liste des lieux proches
            const collection = document.createElement('div');
            collection.classList.add('collection');
            for (let i = 0; i < lieux_dispo.length && i < main_7.MAX_LIEUX_AFFICHES; i++) {
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
            error.innerText = "Impossible de vous géolocaliser.";
            const subtext = document.createElement('div');
            subtext.classList.add('red-text', 'flow-text');
            subtext.innerText = "Choisissez un lieu manuellement.";
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
                helpers_7.showToast("Vous devez préciser un lieu.");
            }
            else if (input.value in labels_to_name) {
                const loc_input = document.getElementById('__location__id');
                loc_input.value = input.value;
                // On stocke la clé de la localisation dans reallocation
                loc_input.dataset.reallocation = labels_to_name[input.value][0];
                helpers_7.getModalInstance().close();
                modal.classList.remove('modal-fixed-footer');
            }
            else {
                helpers_7.showToast("Le lieu entré n'a aucune correspondance dans la base de données.");
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
define("home", ["require", "exports", "user_manager", "SyncManager", "helpers", "main", "form_schema", "location", "test_vocal_reco"], function (require, exports, user_manager_5, SyncManager_4, helpers_8, main_8, form_schema_5, location_2, test_vocal_reco_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.APP_NAME = "Busy Bird";
    async function initHomePage(base) {
        base.innerHTML = `
    <div class="flex-center-aligner home-top-element">
        <img id="__home_logo_clicker" src="img/logo.png" class="home-logo">
    </div>
    <div class="container relative-container">
        <span class="very-tiny-text version-text">Version ${main_8.APP_VERSION}</span>
        <p class="flow-text center">
            Bienvenue dans ${exports.APP_NAME}, l'application qui facilite le suivi d'espèces 
            sur le terrain !
        </p>
        <p class="flow-text red-text">
            ${!user_manager_5.UserManager.logged ? `
                Vous n'êtes pas connecté dans l'application. Vous ne serez pas en mesure de
                saisir de nouvelles entrées sans être authentifié. Veuillez vous connecter via
                les paramètres de l'application.
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
            if (helpers_8.hasGoodConnection()) {
                if (remaining_count > 15) {
                    home_container.innerHTML = createCardPanel(`<span class="blue-text text-darken-2">Vous avez beaucoup d'éléments à synchroniser (${remaining_count} entrées).</span><br>
                    <span class="blue-text text-darken-2">Rendez-vous dans les entrées pour lancer la synchronisation.</span>`, "Synchronisation");
                }
                else if (remaining_count > 0) {
                    home_container.innerHTML = createCardPanel(`<span class="blue-text text-darken-2">
                        Vous avez ${remaining_count} entrée${remaining_count > 1 ? 's' : ''} en attente de synchronisation.
                    </span>`);
                }
            }
            else if (remaining_count > 0) {
                home_container.innerHTML = createCardPanel(`
                <span class="blue-text text-darken-2">Vous avez des éléments en attente de synchronisation.</span><br>
                <span class="red-text text-darken-2">Lorsque vous retrouverez une bonne connexion Internet,</span>
                <span class="blue-text text-darken-2">lancez une synchronisation dans les paramètres.</span>`);
            }
        }
        catch (e) {
            home_container.innerHTML = createCardPanel(`<span class="red-text text-darken-2">Impossible de relever les entrées disponibles.</span><br>
            <span class="red-text text-darken-2">Cette erreur est possiblement grave. 
            Nous vous conseillons de ne pas enregistrer d'entrée.</span>`, "Erreur");
        }
        // Montre l'utilisateur connecté
        if (user_manager_5.UserManager.logged) {
            home_container.insertAdjacentHTML('beforeend', createCardPanel(`<span class="grey-text text-darken-1">${user_manager_5.UserManager.username}</span>
            <span class="blue-text text-darken-2">est connecté-e.</span>`));
        }
        // Nombre de formulaires enregistrés sur l'appareil
        try {
            let nb_files;
            try {
                nb_files = (await main_8.FILE_HELPER.ls('forms')).length;
            }
            catch (e) {
                nb_files = 0;
                await main_8.FILE_HELPER.mkdir('forms');
            }
            home_container.insertAdjacentHTML('beforeend', createCardPanel(`<span class="blue-text text-darken-2">${nb_files === 0 ? 'Aucune' : nb_files} entrée${nb_files > 1 ? 's' : ''} 
            ${nb_files > 1 ? 'sont' : 'est'} stockée${nb_files > 1 ? 's' : ''} sur cet appareil.</span>`));
        }
        catch (e) {
            // Impossible d'obtenir les fichiers
            home_container.insertAdjacentHTML('beforeend', createCardPanel(`<span class="red-text text-darken-2">Impossible d'obtenir la liste des fichiers présents sur l'appareil.</span><br>
            <span class="red-text text-darken-2">Cette erreur est probablement grave. 
            Nous vous conseillons de ne pas tenter d'enregistrer d'entrée et de vérifier votre stockage interne.</span>`));
        }
        form_schema_5.Forms.onReady(function (available, current) {
            if (form_schema_5.Forms.current_key === null) {
                return;
            }
            const locations = current.locations;
            // Navigation vers nichoir
            home_container.insertAdjacentHTML('beforeend', `<div class="divider divider-margin big"></div>
            <h6 style="margin-left: 10px; font-size: 1.25rem">Naviguer vers un habitat de ${current.name.toLowerCase()}</h6>`);
            location_2.createLocationInputSelector(home_container, document.createElement('input'), locations, true);
        });
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
                test_vocal_reco_2.launchQuizz(helpers_8.getBase());
            }
        };
    }
});
// ////// DEPRECATED
// /**
//  * Initie la sauvegarde: présente et vérifie les champs
//  *  @param type
//  */
// function initFormSave(type: string, force_name?: string, form_save?: FormSave): any {
//     console.log("Demarrage initFormSave")
//     // Ouverture du modal de verification
//     const modal = getModal();
//     const instance = initModal({ dismissible: true }, getModalPreloader(
//         "La vérification a probablement planté.<br>Merci de patienter quand même, on sait jamais.",
//         `<div class="modal-footer">
//             <a href="#!" id="cancel_verif" class="btn-flat red-text">Annuler</a>
//         </div>`
//     ));
//     modal.classList.add('modal-fixed-footer');
//     // Ouverture du premiere modal de chargement
//     instance.open();
//     // creation de la liste d'erreurs
//     let list_erreur = document.createElement("div");
//     list_erreur.classList.add("modal-content");
//     let element_erreur = document.createElement("ul");
//     element_erreur.classList.add("collection")
//     list_erreur.appendChild(element_erreur);
//     //Ajouter verification avant d'ajouter bouton valider
//     let erreur_critique: boolean = false;
//     //Parcours tous les elements remplits ou non
//     for (const input of document.getElementsByClassName('input-form-element')) {
//         //Attribution du label plutot que son nom interne
//         const i = input as HTMLInputElement;
//         const label = document.querySelector(`label[for="${i.id}"]`);
//         let name = i.name;
//         if (label) {
//             name = label.textContent;
//         };
//         const contraintes: any = {};
//         if (i.dataset.constraints) {
//             i.dataset.constraints.split(';').map((e: string) => {
//                 const [name, value] = e.split('=');
//                 contraintes[name] = value;
//             });
//         }
//         //Si l'attribut est obligatoirement requis et qu'il est vide -> erreur critique impossible de sauvegarder
//         if (i.required && !i.value) {
//             let erreur = document.createElement("li");
//             erreur.classList.add("collection-item");
//             erreur.innerHTML = "<strong style='color: red;' >" + name + "</strong> : Champ requis";
//             element_erreur.insertBefore(erreur, element_erreur.firstChild);
//             erreur_critique = true;
//             continue;
//         }
//         if (input.tagName === "SELECT" && (input as HTMLSelectElement).multiple) {
//             const selected = [...(input as HTMLSelectElement).options].filter(option => option.selected).map(option => option.value);
//             if (selected.length == 0) {
//                 let erreur = document.createElement("li");
//                 erreur.classList.add("collection-item");
//                 erreur.innerHTML = "<strong>" + name + "</strong> : Non renseigné";
//                 element_erreur.appendChild(erreur);
//             }
//         }
//         else if (i.type !== "checkbox") {
//             if (!i.value) {
//                 let erreur = document.createElement("li");
//                 erreur.classList.add("collection-item");
//                 erreur.innerHTML = "<strong>" + name + "</strong> : Non renseigné";
//                 element_erreur.appendChild(erreur);
//             }
//             else if (i.type === "number") {
//                 if (contraintes) {
//                     if ((Number(i.value) <= Number(contraintes['min'])) || (Number(i.value) >= Number(contraintes['max']))) {
//                         let erreur = document.createElement("li");
//                         erreur.classList.add("collection-item");
//                         erreur.innerHTML = "<strong>" + name + "</strong> : Intervale non respecté";
//                         element_erreur.appendChild(erreur);
//                     }
//                     // ajouter precision else if ()
//                 }
//             }
//             else if (i.type === "text") {
//                 if (contraintes) {
//                     if ((i.value.length < Number(contraintes['min'])) || (i.value.length > Number(contraintes['max']))) {
//                         let erreur = document.createElement("li");
//                         erreur.classList.add("collection-item");
//                         erreur.innerHTML = "<strong>" + name + "</strong> : Taille non respecté";
//                         element_erreur.appendChild(erreur);
//                     };
//                 }
//             }
//         }
//     }
//     modal.innerHTML = "";
//     modal.appendChild(list_erreur);
//     let footer = document.createElement("div");
//     footer.classList.add("modal-footer");
//     if (erreur_critique) {
//         footer.innerHTML = `<a href="#!" id="cancel_verif" class="btn-flat red-text">Corriger</a>
//         </div>`;
//     }
//     else {
//         footer.innerHTML = `<a href="#!" id="cancel_verif" class="btn-flat red-text">Corriger</a><a href="#!" id="valid_verif" class="btn-flat green-text">Valider</a>
//         </div>`;
//     }
//     modal.appendChild(footer);
//     document.getElementById("cancel_verif").onclick = function() {
//         getModalInstance().close();
//     };
//     if (!erreur_critique) {
//         document.getElementById("valid_verif").onclick = function() {
//             getModalInstance().close();
//             saveForm(type, force_name, form_save);
//         }
//     };
//     // Si champ invalide suggéré (dépassement de range, notamment) ou champ vide, message d'alerte, mais
// }
define("settings_page", ["require", "exports", "user_manager", "form_schema", "helpers", "SyncManager", "PageManager", "fetch_timeout", "main", "home", "Settings"], function (require, exports, user_manager_6, form_schema_6, helpers_9, SyncManager_5, PageManager_4, fetch_timeout_3, main_9, home_1, Settings_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    fetch_timeout_3 = __importDefault(fetch_timeout_3);
    function headerText() {
        return `${user_manager_6.UserManager.logged ?
            "Vous êtes connecté-e en tant que <span class='orange-text text-darken-2'>" + user_manager_6.UserManager.username + "</span>"
            : "Vous n'êtes pas connecté-e"}.`;
    }
    function formActualisationModal() {
        const instance = helpers_9.initModal({ dismissible: false }, helpers_9.getModalPreloader("Actualisation..."));
        instance.open();
        form_schema_6.Forms.init(true)
            .then(() => {
            helpers_9.showToast("Actualisation terminée.");
            instance.close();
            PageManager_4.PageManager.reload();
        })
            .catch(() => {
            helpers_9.showToast("Impossible d'actualiser les schémas.");
            instance.close();
        });
    }
    function initSettingsPage(base) {
        const connecte = user_manager_6.UserManager.logged;
        base.innerHTML = `
    <div class="container row" id="main_settings_container">
        <h4>Utilisateur</h4>
        <p class="flow-text no-margin-bottom">${headerText()}</p>
    </div>
    `;
        ////// DEFINITION DU BOUTON DE CONNEXION
        const container = document.getElementById('main_settings_container');
        const button = document.createElement('button');
        container.appendChild(button);
        if (connecte) {
            button.type = "button";
            button.innerHTML = "Déconnexion";
            button.classList.remove('blue');
            button.classList.add('col', 's12', 'red', 'btn', 'btn-perso', 'btn-margins');
            button.onclick = function () {
                helpers_9.askModal("Se déconnecter ?", "Vous ne pourrez pas saisir une entrée de formulaire tant que vous ne serez pas reconnecté-e.")
                    .then(function () {
                    // L'utilisateur veut se déconnecter
                    user_manager_6.UserManager.unlog();
                    PageManager_4.PageManager.reload();
                })
                    .catch(function () {
                    // L'utilisateur ne se déconnecte pas, finalement
                });
            };
        }
        else {
            button.type = "button";
            button.innerHTML = "Se connecter";
            button.classList.remove('red');
            button.classList.add('col', 's12', 'blue', 'btn', 'btn-perso', 'btn-margins', 'white-text');
            button.onclick = function () {
                user_manager_6.loginUser().then(function () {
                    PageManager_4.PageManager.reload();
                }).catch(() => { });
            };
        }
        // Si l'utilisateur n'est pas connecté, on propose de créer un compte
        if (!connecte) {
            const createaccbtn = document.createElement('button');
            createaccbtn.classList.add('col', 's12', 'blue-grey', 'btn', 'btn-perso', 'btn-small-margins');
            createaccbtn.innerHTML = "Créer un compte";
            createaccbtn.style.marginTop = "-5px";
            createaccbtn.onclick = user_manager_6.createNewUser;
            container.appendChild(createaccbtn);
        }
        /////// PARTIE DEUX: FORMULAIRES
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Formulaires</h4>
    <h5>Schéma actif</h5>
    <p class="flow-text">
        Ce schéma d'entrée correspond à celui proposé dans la page "Nouvelle entrée".
    </p>
    `);
        // Choix du formulaire actif
        const select = document.createElement('select');
        select.classList.add('material-select');
        container.appendChild(select);
        form_schema_6.Forms.onReady(function () {
            const available = [["", "Aucun"], ...form_schema_6.Forms.getAvailableForms()];
            for (const option of available) {
                const o = document.createElement('option');
                o.value = option[0];
                o.innerText = option[1];
                if (option[0] === form_schema_6.Forms.current_key || (option[0] === "" && form_schema_6.Forms.current_key === null)) {
                    o.selected = true;
                }
                select.appendChild(o);
            }
            M.FormSelect.init(select);
        });
        select.addEventListener('change', function () {
            const value = select.value || null;
            if (form_schema_6.Forms.formExists(value)) {
                form_schema_6.Forms.changeForm(value, true);
            }
        });
        // Bouton pour accéder aux souscriptions
        container.insertAdjacentHTML('beforeend', `
    <h5>Souscriptions aux schémas</h5>
    <p class="flow-text">
        Les schémas de formulaires sont les types de formulaires vous étant proposés à la saisie dans ${home_1.APP_NAME}.
        ${user_manager_6.UserManager.logged ? `
            Consultez et modifiez ici les différents schémas auquel l'application autorise "${user_manager_6.UserManager.username}" à remplir.
        ` : ''}
    </p>
    `);
        const subs_btn = document.createElement('button');
        subs_btn.classList.add('col', 's12', 'purple', 'btn', 'btn-perso', 'btn-small-margins');
        subs_btn.innerHTML = "Gérer souscriptions";
        subs_btn.onclick = function () {
            if (user_manager_6.UserManager.logged) {
                subscriptionsModal();
            }
            else {
                helpers_9.informalBottomModal("Connectez-vous", "La gestion des souscriptions à des schémas est uniquement possible en étant connecté.");
            }
        };
        container.appendChild(subs_btn);
        // Bouton pour actualiser les schémas
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <h5>Actualiser les schémas</h5>
    <p class="flow-text">
        Une actualisation automatique est faite à chaque démarrage de l'application.
        Si vous pensez que les schémas auquel vous avez souscrit ont changé depuis le dernier
        démarrage, vous pouvez les actualiser.
    </p>
    `);
        const formbtn = document.createElement('button');
        formbtn.classList.add('col', 's12', 'green', 'btn', 'btn-perso', 'btn-small-margins');
        formbtn.innerHTML = "Actualiser schémas formulaire";
        formbtn.onclick = function () {
            if (user_manager_6.UserManager.logged) {
                helpers_9.askModal("Actualiser les schémas ?", "L'actualisation des schémas de formulaire récupèrera les schémas à jour depuis le serveur du LBBE.").then(() => {
                    // L'utilisateur a dit oui
                    formActualisationModal();
                });
            }
            else {
                helpers_9.informalBottomModal("Connectez-vous", "L'actualisation des schémas est uniquement possible en étant connecté.");
            }
        };
        container.appendChild(formbtn);
        //// PARTIE TROIS: SYNCHRONISATION
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Synchronisation</h4>
    <h5>Arrière-plan</h5>
    <p class="flow-text">
        L'application tente de synchroniser régulièrement les entrées 
        si une connexion à Internet est disponible.
    </p>
    `);
        // Select pour choisir la fréquence de synchro
        const select_field = helpers_9.convertHTMLToElement('<div class="input-field col s12"></div>');
        const select_input = document.createElement('select');
        for (const minutes of main_9.SYNC_FREQUENCY_POSSIBILITIES) {
            const opt = document.createElement('option');
            opt.value = String(minutes);
            opt.innerText = helpers_9.convertMinutesToText(minutes);
            opt.selected = minutes === Settings_2.Settings.sync_freq;
            select_input.appendChild(opt);
        }
        select_input.onchange = function () {
            Settings_2.Settings.sync_freq = Number(this.value);
            SyncManager_5.SyncManager.changeBackgroundSyncInterval(Settings_2.Settings.sync_freq);
        };
        const select_label = document.createElement('label');
        select_label.innerText = "Fréquence de synchronisation";
        select_field.appendChild(select_input);
        select_field.appendChild(select_label);
        container.appendChild(select_field);
        // Initialisation du select materialize
        M.FormSelect.init(select_input);
        // Checkbox pour activer sync en arrière plan
        container.insertAdjacentHTML('beforeend', `
        <p style="margin-bottom: 20px">
            <label>
                <input type="checkbox" id="__sync_bg_checkbox_settings" ${Settings_2.Settings.sync_bg ? 'checked' : ''}>
                <span>Activer la synchronisation en arrière-plan</span>
            </label>
        </p>`);
        document.getElementById('__sync_bg_checkbox_settings').onchange = function () {
            Settings_2.Settings.sync_bg = this.checked;
            if (Settings_2.Settings.sync_bg) {
                SyncManager_5.SyncManager.startBackgroundSync();
            }
            else {
                SyncManager_5.SyncManager.stopBackgroundSync();
            }
        };
        // Bouton pour forcer sync
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <h5>Forcer synchronisation</h5>
    <p class="flow-text">
        La synchronisation standard se trouve dans la page des entrées.
        Vous pouvez forcer le renvoi complet des données vers le serveur,
        y compris celles déjà synchronisées, ici. 
    </p>
    `);
        const syncbtn = document.createElement('button');
        syncbtn.classList.add('col', 's12', 'orange', 'btn', 'btn-perso', 'btn-small-margins');
        syncbtn.innerHTML = "Tout resynchroniser";
        syncbtn.onclick = function () {
            if (user_manager_6.UserManager.logged) {
                helpers_9.askModal("Tout synchroniser ?", "Veillez à disposer d'une bonne connexion à Internet.\
                Vider le cache obligera à resynchroniser tout l'appareil, même si vous annulez la synchronisation.", "Oui", "Non", "Vider cache de synchronisation").then(checked_val => {
                    // L'utilisateur a dit oui
                    SyncManager_5.SyncManager.graphicalSync(true, checked_val);
                });
            }
            else {
                helpers_9.informalBottomModal("Connectez-vous", "Vous devez vous connecter pour effectuer cette action.");
            }
        };
        container.appendChild(syncbtn);
    }
    exports.initSettingsPage = initSettingsPage;
    async function getSubscriptions() {
        return fetch_timeout_3.default(main_9.API_URL + "schemas/available.json", {
            headers: new Headers({ "Authorization": "Bearer " + user_manager_6.UserManager.token }),
            method: "GET",
            mode: "cors"
        }, 30000)
            .then(response => response.json());
    }
    async function subscribe(ids, fetch_subs) {
        const form_data = new FormData();
        form_data.append('ids', ids.join(','));
        if (!fetch_subs) {
            form_data.append('trim_subs', 'true');
        }
        return fetch_timeout_3.default(main_9.API_URL + "schemas/subscribe.json", {
            headers: new Headers({ "Authorization": "Bearer " + user_manager_6.UserManager.token }),
            method: "POST",
            mode: "cors",
            body: form_data
        }, 60000)
            .then(response => response.json());
    }
    async function unsubscribe(ids, fetch_subs) {
        const form_data = new FormData();
        form_data.append('ids', ids.join(','));
        if (!fetch_subs) {
            form_data.append('trim_subs', 'true');
        }
        return fetch_timeout_3.default(main_9.API_URL + "schemas/unsubscribe.json", {
            headers: new Headers({ "Authorization": "Bearer " + user_manager_6.UserManager.token }),
            method: "POST",
            mode: "cors",
            body: form_data
        }, 60000)
            .then(response => response.json());
    }
    async function subscriptionsModal() {
        const modal = helpers_9.getModal();
        const instance = helpers_9.initModal({ inDuration: 200, outDuration: 150 }, helpers_9.getModalPreloader("Récupération des souscriptions", `<div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Annuler</a></div>`));
        instance.open();
        const content = document.createElement('div');
        content.classList.add('modal-content');
        let subscriptions;
        try {
            subscriptions = await getSubscriptions();
        }
        catch (e) {
            modal.innerHTML = `
        <div class="modal-content">
            <h5 class="red-text no-margin-top">Erreur</h5>
            <p class="flow-text">Impossible d'obtenir les souscriptions.</p>
        </div>
        <div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Fermer</a></div>
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
        content.insertAdjacentHTML('beforeend', `<h5 class="no-margin-top">Souscriptions</h5>`);
        content.insertAdjacentHTML('beforeend', `
        <p class="flow-text">
            Gérez vos souscriptions et abonnez-vous à des nouveaux schémas de formulaire ici.
            Cochez pour vous abonner.
        </p>
    `);
        const row = document.createElement('div');
        row.classList.add('row');
        content.appendChild(row);
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
        const footer = document.createElement('div');
        footer.classList.add('modal-footer');
        footer.insertAdjacentHTML('beforeend', `<a href="#!" class="btn-flat left red-text modal-close">Annuler</a>`);
        const valid_btn = document.createElement('a');
        valid_btn.classList.add('btn-flat', 'right', 'green-text');
        valid_btn.href = "#!";
        valid_btn.innerText = "Enregistrer";
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
            modal.innerHTML = helpers_9.getModalPreloader("Mise à jour des souscriptions<br>Veuillez ne pas fermer cette fenêtre");
            modal.classList.remove('modal-fixed-footer');
            try {
                // Appel à unsubscribe
                if (to_uncheck.length > 0) {
                    await unsubscribe(to_uncheck, false);
                    // Suppression des formulaires demandés à être unsub
                    for (const f of to_uncheck) {
                        form_schema_6.Forms.deleteForm(f);
                    }
                    form_schema_6.Forms.saveForms();
                }
                let subs = undefined;
                // Appel à subscribe
                if (to_check.length > 0) {
                    subs = await subscribe(to_check, true);
                }
                helpers_9.showToast("Mise à jour des souscriptions réussie");
                instance.close();
                // Met à jour les formulaires si ils ont changé (appel à subscribe ou unsubscribe)
                if (subs) {
                    form_schema_6.Forms.schemas = subs;
                }
            }
            catch (e) {
                helpers_9.showToast("Impossible de mettre à jour les souscriptions.\nVérifiez votre connexion à Internet.");
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
define("saved_forms", ["require", "exports", "helpers", "form_schema", "PageManager", "SyncManager", "logger", "main"], function (require, exports, helpers_10, form_schema_7, PageManager_5, SyncManager_6, logger_5, main_10) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var SaveState;
    (function (SaveState) {
        SaveState[SaveState["saved"] = 0] = "saved";
        SaveState[SaveState["waiting"] = 1] = "waiting";
        SaveState[SaveState["error"] = 2] = "error";
    })(SaveState || (SaveState = {}));
    ;
    function editAForm(form, name) {
        // Vérifie que le formulaire est d'un type disponible
        if (form.type === null || !form_schema_7.Forms.formExists(form.type)) {
            helpers_10.showToast("Impossible de charger ce fichier.\nLe type de cette entrée est indisponible.\nVérifiez que vous avez souscrit à ce schéma de formulaire: \"" + form.type + "\".", 10000);
            return;
        }
        const current_form = form_schema_7.Forms.getForm(form.type);
        PageManager_5.PageManager.pushPage(PageManager_5.AppPageName.form, "Modifier", { form: current_form, name, save: form });
    }
    async function deleteAll() {
        const instance = helpers_10.unclosableBottomModal(`
        ${helpers_10.SMALL_PRELOADER}
        <p class="flow-text">Suppression en cours</p>
    `);
        PageManager_5.PageManager.lock_return_button = true;
        try {
            // On veut supprimer tous les fichiers
            await main_10.FILE_HELPER.empty('forms', true);
            if (await main_10.FILE_HELPER.exists('form_data')) {
                await main_10.FILE_HELPER.empty('form_data', true);
            }
            if (device.platform === "Android" && main_10.SD_FILE_HELPER) {
                try {
                    await main_10.SD_FILE_HELPER.empty('forms', true);
                    await main_10.SD_FILE_HELPER.empty('form_data', true);
                }
                catch (e) {
                    // Tant pis, ça ne marche pas
                }
            }
            await SyncManager_6.SyncManager.clear();
            helpers_10.showToast("Fichiers supprimés avec succès");
            PageManager_5.PageManager.lock_return_button = false;
            instance.close();
            PageManager_5.PageManager.reload();
        }
        catch (e) {
            PageManager_5.PageManager.lock_return_button = false;
            instance.close();
            logger_5.Logger.error("Unable to delete", e);
            throw e;
        }
    }
    async function appendFileEntry(json, ph) {
        const save = json[1];
        const selector = document.createElement('li');
        selector.classList.add('collection-item');
        const container = document.createElement('div');
        container.classList.add('saved-form-item');
        let id = json[0].name;
        let id_without_json = id.split('.json')[0];
        container.dataset.formid = id_without_json;
        let state = SaveState.error;
        let type = "Type inconnu";
        if (save.type !== null && form_schema_7.Forms.formExists(save.type)) {
            const form = form_schema_7.Forms.getForm(save.type);
            type = form.name;
            if (form.id_field) {
                // Si un champ existe pour ce formulaire
                id = save.fields[form.id_field] || json[0].name;
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
        const sync_btn = helpers_10.convertHTMLToElement(`<a href="#!" class="sync-icon">${sync_str}</a>`);
        container.innerHTML = "";
        container.appendChild(sync_btn);
        // Ajoute le texte de l'élément
        container.insertAdjacentHTML('beforeend', `
        <div class="left">
            [${type}] ${id} <br> 
            Modifié le ${helpers_10.formatDate(new Date(json[0].lastModified), true)}
        </div>`);
        // Ajout des actions de l'élément
        //// ACTION 1: Modifier
        const modify_element = () => {
            editAForm(json[1], json[0].name.split(/\.json$/)[0]);
        };
        const delete_element = () => {
            modalDeleteForm(json[0].name);
        };
        // Définit l'événement de clic sur le formulaire
        selector.addEventListener('click', function () {
            const list = ["Modifier"];
            list.push((container.dataset.synced === "true" ? "Res" : "S") + "ynchroniser");
            list.push("Supprimer");
            helpers_10.askModalList(list)
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
    async function readAllFilesOfDirectory(dirName) {
        const entries = await main_10.FILE_HELPER.ls(dirName, "e");
        const data = [];
        for (const entry of entries) {
            const file = await main_10.FILE_HELPER.getFileOfEntry(entry);
            const content = JSON.parse(await main_10.FILE_HELPER.readFileAs(file));
            data.push([file, content]);
        }
        return data;
    }
    function modalDeleteForm(id) {
        helpers_10.askModal("Supprimer cette entrée ?", "Vous ne pourrez pas la restaurer ultérieurement.", "Supprimer", "Annuler")
            .then(() => {
            // L'utilisateur demande la suppression
            deleteForm(id)
                .then(function () {
                helpers_10.showToast("Entrée supprimée.");
                PageManager_5.PageManager.reload();
            })
                .catch(function (err) {
                helpers_10.showToast("Impossible de supprimer: " + err);
            });
        })
            .catch(() => {
            // Annulation
        });
    }
    async function deleteForm(id) {
        if (id.match(/\.json$/)) {
            id = id.substring(0, id.length - 5);
        }
        SyncManager_6.SyncManager.remove(id);
        if (device.platform === 'Android' && main_10.SD_FILE_HELPER) {
            // Tente de supprimer depuis la carte SD
            try {
                await main_10.SD_FILE_HELPER.rm("form_data/" + id, true);
                await main_10.SD_FILE_HELPER.rm("forms/" + id + '.json');
            }
            catch (e) { }
        }
        return new Promise(async function (resolve, reject) {
            if (id) {
                // Supprime toutes les données (images, sons...) liées au formulaire
                await main_10.FILE_HELPER.rm('form_data/' + id, true).catch(err => err);
                await main_10.FILE_HELPER.rm("forms/" + id + ".json").catch(err => err);
                resolve();
            }
            else {
                reject("ID invalide");
            }
        });
    }
    async function initSavedForm(base) {
        const placeholder = document.createElement('ul');
        placeholder.classList.add('collection', 'no-margin-top');
        try {
            await main_10.FILE_HELPER.mkdir('forms');
        }
        catch (err) {
            logger_5.Logger.error("Impossible de créer le dossier d'entrées", err.message, err.stack);
            base.innerHTML = helpers_10.displayErrorMessage("Erreur", "Impossible de charger les fichiers. (" + err.message + ")");
            return;
        }
        form_schema_7.Forms.onReady(function () {
            readAllFilesOfDirectory('forms').then(all_promises => Promise.all(all_promises)
                .then(async function (files) {
                // Tri des fichiers; le plus récent en premier
                files = files.sort((a, b) => b[0].lastModified - a[0].lastModified);
                for (const f of files) {
                    await appendFileEntry(f, placeholder);
                }
                base.innerHTML = "";
                base.appendChild(placeholder);
                /// Insère un div avec une margin pour forcer de la
                /// place en bas, pour les boutons
                base.insertAdjacentHTML('beforeend', "<div class='saver-collection-margin'></div>");
                if (files.length === 0) {
                    base.innerHTML = helpers_10.displayInformalMessage("Vous n'avez aucune entrée sauvegardée.");
                }
                else {
                    //// Bouton de synchronisation
                    const syncbtn = helpers_10.convertHTMLToElement(`
                            <div class="fixed-action-btn" style="margin-right: 50px;">
                                <a class="btn-floating waves-effect waves-light green">
                                    <i class="material-icons">sync</i>
                                </a>
                            </div>`);
                    syncbtn.onclick = function () {
                        helpers_10.askModal("Synchroniser ?", "Voulez-vous lancer la synchronisation des entrées maintenant ?")
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
                    const delete_btn = helpers_10.convertHTMLToElement(`
                            <div class="fixed-action-btn">
                                <a class="btn-floating waves-effect waves-light red">
                                    <i class="material-icons">delete_sweep</i>
                                </a>
                            </div>`);
                    delete_btn.addEventListener('click', () => {
                        helpers_10.askModal("Tout supprimer ?", "Toutes les entrées enregistrés, même possiblement non synchronisés, seront supprimés.")
                            .then(() => {
                            setTimeout(function () {
                                // Attend que le modal précédent se ferme
                                helpers_10.askModal("Êtes-vous sûr-e ?", "La suppression est irréversible.", "Annuler", "Supprimer")
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
            })).catch(function (err) {
                logger_5.Logger.error("Impossible de charger les fichiers", err.message, err.stack);
                base.innerHTML = helpers_10.displayErrorMessage("Erreur", "Impossible de charger les fichiers. (" + err.message + ")");
            });
        });
    }
    exports.initSavedForm = initSavedForm;
});
define("PageManager", ["require", "exports", "helpers", "form", "settings_page", "saved_forms", "home", "logger"], function (require, exports, helpers_11, form_1, settings_page_1, saved_forms_1, home_2, logger_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SIDENAV_OBJ = null;
    var AppPageName;
    (function (AppPageName) {
        AppPageName["form"] = "form";
        AppPageName["settings"] = "settings";
        AppPageName["saved"] = "saved";
        AppPageName["home"] = "home";
    })(AppPageName = exports.AppPageName || (exports.AppPageName = {}));
    exports.PageManager = new class {
        constructor() {
            this.lock_return_button = false;
            /**
             * Déclaration des pages possibles
             * Chaque clé de AppPages doit être une possibilité de AppPageName
             */
            this.AppPages = {
                home: {
                    name: "Tableau de bord",
                    callback: home_2.initHomePage,
                    reload_on_restore: true
                },
                form: {
                    name: "Nouvelle entrée",
                    callback: form_1.initFormPage,
                    ask_change: true,
                    reload_on_restore: false
                },
                saved: {
                    name: "Entrées",
                    callback: saved_forms_1.initSavedForm,
                    reload_on_restore: true
                },
                settings: {
                    name: "Paramètres",
                    callback: settings_page_1.initSettingsPage,
                    reload_on_restore: false
                }
            };
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
            for (const page in this.AppPages) {
                const li = document.createElement('li');
                li.id = "__sidenav_base_element_" + page;
                li.onclick = () => {
                    exports.PageManager.pushPage(this.AppPages[page]);
                };
                const link = document.createElement('a');
                link.href = "#!";
                link.innerText = this.AppPages[page].name;
                li.appendChild(link);
                sidenav.appendChild(li);
            }
            // Initialise le sidenav
            const elem = document.querySelector('.sidenav');
            exports.SIDENAV_OBJ = M.Sidenav.init(elem, {});
        }
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
            this.changePage(this.actual_page, false, document.getElementById('nav_title').innerText, additionnals, reset_scroll);
        }
        /**
         * Change l'affichage et charge la page "page" dans le bloc principal
         * @param page Page à charger
         * @param delete_paused Supprime les pages chargées dans la pile
         * @param force_name Forcer un nom pour la navbar
         * @param additionnals Variable à passer en paramètre au callback de page
         * @param reset_scroll Réinitiliser le scroll de la page en haut
         */
        changePage(page, delete_paused = true, force_name, additionnals, reset_scroll = true) {
            // Tente de charger la page
            try {
                let pagename = "";
                if (typeof page === 'string') {
                    // AppPageName
                    if (!this.pageExists(page)) {
                        throw new ReferenceError("Page does not exists");
                    }
                    pagename = page;
                    page = this.AppPages[page];
                }
                else {
                    // Recherche de la clé correspondante
                    for (const k in this.AppPages) {
                        if (this.AppPages[k] === page) {
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
                const base = helpers_11.getBase();
                base.innerHTML = helpers_11.getPreloader("Chargement");
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
                logger_6.Logger.error("Erreur lors du changement de page", e);
                return Promise.reject(e);
            }
        }
        cleanWaitingPages() {
            while (this.pages_holder.length >= 10) {
                this.pages_holder.shift();
            }
        }
        /**
         * Pousse une nouvelle page dans la pile de page
         * @param page Page à pousser
         * @param force_name Nom à mettre dans la navbar
         * @param additionnals Variable à passer au callback de la page à charger
         */
        pushPage(page, force_name, additionnals) {
            if (typeof page === 'string' && !this.pageExists(page)) {
                throw new ReferenceError("Page does not exists");
            }
            // Si il y a plus de 10 pages dans la pile, clean
            this.cleanWaitingPages();
            // Récupère le contenu actuel du bloc mère
            const actual_base = helpers_11.getBase();
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
            return this.changePage(page, false, force_name, additionnals);
        }
        /**
         * Revient à la page précédente.
         * Charge la page d'accueil si aucune page disponible
         */
        popPage() {
            if (this.pages_holder.length === 0) {
                this.changePage(AppPageName.home);
                return;
            }
            // Récupère la dernière page poussée dans le tableau
            const last_page = this.pages_holder.pop();
            // Supprime le main actuel
            const main = helpers_11.getBase();
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
                    this.changePage(this.actual_page, false, undefined, undefined, false);
                }
                else {
                    this.actual_page.reload_on_restore();
                }
            }
            this.updateReturnBtn();
        }
        /**
         * Retourne à la page précédente, et demande si à confirmer si la page a le flag "should_wait".
         */
        goBack(force_asking = false) {
            if (this.lock_return_button) {
                return;
            }
            const stepBack = () => {
                // Ferme le modal possiblement ouvert
                try {
                    helpers_11.getModalInstance().close();
                }
                catch (e) { }
                try {
                    helpers_11.getBottomModalInstance().close();
                }
                catch (e) { }
                if (this.isPageWaiting()) {
                    this.popPage();
                }
                else {
                    // @ts-ignore this.changePage(AppPageName.home);
                    navigator.app.exitApp();
                }
            };
            if (this.should_wait || force_asking) {
                helpers_11.askModal("Aller à la page précédente ?", "Les modifications sur la page actuelle seront perdues.", "Page précédente", "Annuler")
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
        pageExists(name) {
            return name in this.AppPages;
        }
        isPageWaiting() {
            return this.pages_holder.length > 0;
        }
    };
    function cleanElement(e) {
        let n;
        while (n = e.firstChild) {
            e.removeChild(n);
        }
    }
});
// Lance main.ts
require(['main']);
