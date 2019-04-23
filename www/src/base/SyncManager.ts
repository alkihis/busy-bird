import { FormSave } from "./FormSchema";
import { Logger } from "../utils/logger";
import localforage from 'localforage';
import { FILE_HELPER, MAX_TIMEOUT_FOR_FORM, MAX_TIMEOUT_FOR_METADATA, MAX_CONCURRENT_SYNC_ENTRIES } from "../main";
import { getModal, initModal, getModalPreloader, MODAL_PRELOADER_TEXT_ID, hasGoodConnection, showToast, getBase } from "../utils/helpers";
import { BackgroundSync, Settings } from "../utils/Settings";
import { FileHelperReadMode, EntryObject } from "./FileHelper";
import { ENTRIES_DIR, METADATA_DIR } from "./FormSaves";
import { APIHandler, APIResp } from "./APIHandler";

class _SyncList {
    public init() {
        localforage.config({
            driver: [localforage.INDEXEDDB,
                localforage.WEBSQL,
                localforage.LOCALSTORAGE],
            name        : 'forms',
            version     : 1.0,
            storeName   : 'keyvaluepairs', // Should be alphanumeric, with underscores.
            description : 'Enregistre les formulaires liés par ID => {type, metadata}'
        });
    }

    public add(id: string, value: SList) : Promise<SList> {
        return localforage.setItem(id, value);
    }

    public get(id: string) : Promise<SList> {
        return localforage.getItem(id);
    }

    public remove(id: string) : Promise<void> {
        return localforage.removeItem(id);
    }

    public listSaved() : Promise<string[]> {
        return localforage.keys();
    }

    public getRemainingToSync() : Promise<number> {
        return localforage.length();
    }

    public clear() : Promise<void> {
        return localforage.clear();
    }

    public has(id: string) : Promise<boolean> {
        return this.get(id).then(item => !!item);
    }
}

const SyncList = new _SyncList;

////// Polyfill si l'application est portée sur iOS: Safari ne supporte pas le constructeur EventTarget()
export class SyncEvent extends EventTarget {
    constructor() {
        try {
            super();
        } catch (e) {
            return document.createTextNode("");
        }
    }
}
////// Fin polyfill

class _SyncManager {
    protected in_sync = false;
    protected list = SyncList;
    protected last_bgsync = Date.now();
    protected running_fetchs: AbortController[] = [];

    /**
     * Initilise l'objet SyncManager
     */
    public init() {
        this.list.init();
        this.initBackgroundSync();
    }

    /**
     * Initialise la synchronisation d'arrière plan avec l'intervalle interval
     * @param interval 
     */
    public initBackgroundSync(interval: number = Settings.sync_freq) : void {
        const success_fn = () => {
            Logger.info(((Date.now() - this.last_bgsync) / 1000) + " seconds since last bg sync.");
            this.last_bgsync = Date.now();

            this.launchBackgroundSync()
                .then(() => {
                    Logger.info(`Banckground sync has been completed successfully and last ${((Date.now() - this.last_bgsync) / 1000)} seconds.`);
                    BackgroundSync.finish();
                })
                .catch(e => {
                    Logger.error("Unable to do background sync.", e);
                    BackgroundSync.finish();
                });
        };

        const failure_fn = () => {
            console.log("Sync could not be started");

            const checkbox_setting_bgsync = getBase().querySelector('#__sync_bg_checkbox_settings');
            if (checkbox_setting_bgsync) {
                showToast("Unable to start background synchronisation");
                (checkbox_setting_bgsync as HTMLInputElement).checked = false;
            }
        };

        if (Settings.sync_bg) {
            // Initialise la synchronisation en arrière plan uniquement si elle est demandée
            if (BackgroundSync.isInit()) {
                BackgroundSync.initBgSync(success_fn, failure_fn, interval);
            }
            else {
                BackgroundSync.init(success_fn, failure_fn, interval);
            }
            
        }
    }

    public changeBackgroundSyncInterval(interval: number) : void {
        if (BackgroundSync.isInit()) {
            BackgroundSync.changeBgSyncInterval(interval);
        }
        else {
            this.initBackgroundSync(interval);
        }
    }

    /**
     * Démarre la synchronisation d'arrière-plan
     */
    public startBackgroundSync() : void {
        if (BackgroundSync.isInit()) {
            BackgroundSync.start();
        }
        else {
            this.initBackgroundSync();
        }
    }

    /**
     * Arrête la synchro d'arrière plan
     */
    public stopBackgroundSync() : void {
        if (BackgroundSync.isInit()) {
            BackgroundSync.stop();
        }
    }

    /**
     * Ajoute une entrée dans la liste d'attente de synchronisation
     * @param id Identifiant du formulaire
     * @param data Sauvegarde de formulaire
     */
    public add(id: string, data: FormSave) : Promise<SList> {
        const saveItem = (id: string, type: string, metadata: {[fieldName: string]: string}) => {
            return this.list.add(id, {type, metadata});
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
                        return {type: data.type, metadata: data.metadata};
                    }
                }
            });
    }

    /**
     * Supprime une entrée id de la liste d'attente de synchro
     * @param id 
     */
    public remove(id: string) : Promise<void> {
        return this.list.remove(id);
    }

    /**
     * Envoie un formulaire id vers le serveur Busy Bird
     * @param id identifiant du formulaire
     * @param data SList correpondant au formulaire
     */
    protected async sendForm(id: string, data: SList) : Promise<void> {
        // Renvoie une promise réussie si l'envoi du formulaire 
        // et de ses métadonnées a réussi.
        let content: string;
        try {
            content = await FILE_HELPER.read(ENTRIES_DIR + id + ".json") as string;
        } catch (error) {
            Logger.info("Unable to read file", error.message);
            throw {code: "file_read", error};
        }

        if (!this.in_sync) {
            throw {code: "aborted"};
        }

        const d = new FormData();
        d.append("id", id);
        d.append("form", content);

        let json: any;
        try {
            const req = APIHandler.req(
                "forms/send.json", 
                { method: "POST", body: d }, 
                APIResp.JSON, 
                true, 
                MAX_TIMEOUT_FOR_FORM
            );

            if (APIHandler.getControl(req))
                this.running_fetchs.push(APIHandler.getControl(req));

            json = await req;
        } catch (error) {
            if (error.error_code)
                throw {code: "json_treatement", error_code: error.error_code, "message": error.message};

            throw {code: "json_send", error};
        }
            
        // On peut envoyer les métadonnées du json !
        if (!this.in_sync) {
            throw {code: "aborted"};
        }

        // Le JSON du form est envoyé !
        if (json.status && json.send_metadata) {
            // Si on doit envoyer les fichiers en plus
            const base_path = METADATA_DIR + id + "/";

            // json.send_metadata est un tableau de fichiers à envoyer

            for (const metadata in data.metadata) {
                if ((json.send_metadata as string[]).indexOf(metadata) === -1) {
                    // La donnée actuelle n'est pas demandée par le serveur
                    continue;
                }

                const file = base_path + data.metadata[metadata];
                const basename = data.metadata[metadata];
                
                try {
                    await APIHandler.sendFile(file, id, data.type, "auto", this.running_fetchs);
                } catch (error) {
                    showToast("Impossible d'envoyer " + basename + ".");
                    if (error.error_code)
                        throw {code: "metadata_treatement", error_code: error.error_code, "message": error.message};

                    throw {code: "metadata_send", error};
                }
            } // end for in
        }

        this.list.remove(id);
    }

    public available() : Promise<string[]> {
        return this.list.listSaved();
    }

    public async getSpecificFile(id: string) : Promise<SList> {
        const entries = await FILE_HELPER.ls(ENTRIES_DIR, "e") as EntryObject;
        
        const filename = id + ".json";

        for (const d in entries) {
            for (const entry of entries[d]) {
                if (entry.name === filename) {
                    const json: FormSave = JSON.parse(await FILE_HELPER.read(entry as FileEntry) as string);

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
    protected async getAllCurrentFiles() : Promise<[string, SList][]> {
        const entries = await FILE_HELPER.ls(ENTRIES_DIR, "e") as EntryObject;
        
        const promises: Promise<[string, SList]>[] = [];

        // On ajoute chaque entrée
        for (const d in entries) {
            for (const entry of entries[d]) {
                promises.push(
                    new Promise(async (resolve) => {
                        const json: FormSave = JSON.parse(await FILE_HELPER.read(entry as FileEntry) as string);

                        resolve([entry.name.split('.json')[0], { type: json.type, metadata: json.metadata }]);
                    })
                );
            }       
        }

        // On attend que tout soit OK
        return Promise.all(promises);
    }

    /**
     * Supprime le cache de sauvegarde et ajoute tous les fichiers JSON disponibles dans celui-ci
     */
    protected addAllFiles() : Promise<void> {
        // On obtient tous les fichiers disponibles
        return this.getAllCurrentFiles()
            .then(forms => {
                // On vide le cache actuel
                return this.list.clear()
                    .then(() => {
                        return forms;
                    });
            })
            .then((forms: [string, SList][]) => {
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
    public graphicalSync(force_all = false, clear_cache = false) : Promise<any> {
        const modal = getModal();
        const instance = initModal(
            {dismissible: false}, 
            getModalPreloader(
                "Please wait...", 
                `<div class="modal-footer">
                    <a href="#!" class="red-text btn-flat left" id="__sync_modal_cancel">Cancel</a>
                    <div class="clearb"></div>
                </div>`
            )
        );
        
        instance.open();

        let cancel_clicked = false;

        const text = document.getElementById(MODAL_PRELOADER_TEXT_ID);
        const modal_cancel = document.getElementById('__sync_modal_cancel');
        modal_cancel.onclick = () => {
            cancel_clicked = true;
            this.cancelSync();

            if (text)
                text.insertAdjacentHTML("afterend", `<p class='flow-text center red-text'>Cancelling...</p>`);
        }

        const receiver = new SyncEvent;

        // Actualise le texte avec des events
        receiver.addEventListener('begin', () => {
            text.innerText = "Reading files to synchronize";
        });

        receiver.addEventListener('send', (event: Event) => {
            const detail = (event as CustomEvent).detail;
            text.innerHTML = `Sending data\n(Entry ${detail.number} of ${detail.total})`;
        });

        return this.sync(force_all, clear_cache, undefined, receiver)
            .then(data => {
                showToast("Synchronisation complete");

                instance.close();

                return data;
            })
            .catch(reason => {
                if (cancel_clicked) {
                    instance.close();
                }
                else if (reason && typeof reason === 'object') {
                    Logger.error("Sync fail:", reason);

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
    
                        document.getElementById('__ask_sync_cancel').onclick = function(this: GlobalEventHandlers) {
                            const text = document.createElement('p');
                            text.classList.add('center', 'flow-text');
                            (this as HTMLElement).insertAdjacentElement('afterend', text);
                            that.cancelSync();
    
                            const a_element = this as HTMLElement;
                            a_element.style.display = "none";
    
                            function launch_timeout() {
                                setTimeout(() => {
                                    if (!a_element) return;
    
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
                        let cause = (function(reason) {
                            switch (reason) {
                                case "aborted": return "Synchonisation has beed cancelled.";
                                case "json_send": return "One entry could not be sent.";
                                case "metadata_send": return "File linked to an entry could not be sent.";
                                case "file_read": return "A file cound not be read.";
                                case "id_getter": return "Unable to dialog with internal database.";
                                default: return "Unknown error.";
                            }
                        })(reason.code);

                        const second_cause = reason.error_code ? APIHandler.errMessage(reason.error_code) + "." : "";

                        // Modifie le texte du modal
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="red-text no-margin-top">Unable to synchronize</h5>
                            <p class="flow-text">
                                ${cause} ${second_cause}<br>
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
    public async inlineSync(force_specific_elements: string[] = undefined) : Promise<any> {
        const receiver = new SyncEvent;

        // Définit les évènements qui vont se passer lors d'une synchro
        receiver.addEventListener('send', (event: Event) => {
            const id = (event as CustomEvent).detail.id; /** detail: { id, data: value, number: i+position, total: entries.length } */
            changeInlineSyncStatus([id], "running");
        });

        receiver.addEventListener('sended', (event: Event) => {
            const id = (event as CustomEvent).detail; /** detail: string */
            changeInlineSyncStatus([id], "synced");
        });

        receiver.addEventListener('groupsenderror', (event: Event) => {
            const subset = (event as CustomEvent).detail; /** detail: string[] */
            changeInlineSyncStatus(subset, "unsynced");
        });

        receiver.addEventListener('senderrorfailer', (event: Event) => {
            const id = (event as CustomEvent).detail; /** detail: string */
            changeInlineSyncStatus([id], "error");
        });

        try {
            const data = await this.sync(undefined, undefined, force_specific_elements, receiver);
            showToast("Synchronisation complete");

            return data;
        }
        catch (reason) {
            if (reason && typeof reason === 'object') {
                Logger.error("Sync fail:", reason);
                // Si jamais la syncho a été refusée parce qu'une est déjà en cours
                if (reason.code === "already") {
                    showToast('One synchronisation is already running.');
                }
                else if (typeof reason.code === "string") {
                    let cause = (function(reason) {
                        switch (reason) {
                            case "aborted": return "Synchonisation has beed cancelled.";
                            case "json_send": return "One entry could not be sent.";
                            case "metadata_send": return "File linked to an entry could not be sent.";
                            case "file_read": return "A file cound not be read.";
                            case "id_getter": return "Unable to dialog with internal database.";
                            default: return "Unknown error.";
                        }
                    })(reason.code);

                    const second_cause = reason.error_code ? APIHandler.errMessage(reason.error_code) + "." : "";
                    // Modifie le texte du modal
                    showToast("Unable to synchronize: " + cause + second_cause);
                }
            }
            else {
                showToast("An error occurred during synchronisation process.");
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
    protected async subSyncDivider(id_getter: Function, entries: string[], receiver: SyncEvent) : Promise<void> {    
        for (let position = 0; position < entries.length; position += MAX_CONCURRENT_SYNC_ENTRIES) {
            // Itère par groupe de formulaire. Groupe de taille MAX_CONCURRENT_SYNC_ENTRIES
            const subset = entries.slice(position, MAX_CONCURRENT_SYNC_ENTRIES + position);
            const promises: Promise<any>[] = [];

            receiver.dispatchEvent(eventCreator("groupsend", subset));
    
            let i = 1;
            let error_id: string;

            for (const id of subset) {
                // Pour chaque clé disponible
                promises.push(
                    id_getter(id)
                        .catch((error: any) => {
                            error_id = id;
                            return Promise.reject({code: "id_getter", error});
                        })
                        .then((value: SList) => {
                            receiver.dispatchEvent(eventCreator("send", { id, data: value, number: i+position, total: entries.length }));
                            i++;
    
                            return this.sendForm(id, value)
                                .then(() => {
                                    receiver.dispatchEvent(eventCreator("sended", id));
                                })
                                .catch(error => {
                                    error_id = id;
                                    return Promise.reject(error);
                                });
                        })
                );
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
    protected launchBackgroundSync() : Promise<any> {
        if (hasGoodConnection()) {
            return this.sync();
        }
        return Promise.reject({code: "no_good_connection"});
    }

    /**
     * Synchronise les formulaires courants avec la BDD distante
     * @param force_all Forcer l'envoi de tous les formulaires
     * @param clear_cache Supprimer le cache actuel d'envoi et forcer tout l'envoi (ne fonctionne qu'avec force_all)
     * @param force_specific_elements Tableau d'identifiants de formulaire (string[]) à utiliser pour la synchronisation
     * @param receiver SyncEvent qui recevra les événements lancés par la synchronisation
     */
    public sync(force_all = false, clear_cache = false, force_specific_elements?: string[], receiver = new SyncEvent) : Promise<any> {
        if (this.in_sync) {
            receiver.dispatchEvent(eventCreator("error", {code: 'already'}));
            return Promise.reject({code: 'already'});
        }

        this.in_sync = true;
        let data_cache: any = {};
        let use_cache = false;

        return new Promise((resolve, reject) => {
            receiver.dispatchEvent(eventCreator("begin"));

            let entries_promise: Promise<string[]>;

            if (force_all) {
                if (clear_cache) {
                    entries_promise = this.addAllFiles().then(() => {
                        return this.list.listSaved();
                    });
                }
                else {
                    use_cache = true;
                    entries_promise = this.getAllCurrentFiles().then((forms: [string, SList][]) => {
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
            const id_getter = (id: string): Promise<SList> => {
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
                        reject({code: "aborted"});
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
                    Logger.info("Failed to sync:", r);
                    reject(r);
                });
        });
    }

    protected cancelSync() : void {
        this.in_sync = false;

        for (const ctl of this.running_fetchs) {
            ctl.abort();
        }

        this.running_fetchs = [];
    }

    /**
     * Efface la liste d'entrées attendant d'être envoyées 
     */
    public clear() : Promise<void> {
        return this.list.clear();
    }

    /**
     * Retourne le nombre d'entrées attendant d'être envoyées
     */
    public remainingToSync() : Promise<number> {
        return this.list.getRemainingToSync();
    }

    /**
     * Teste if id attend d'être envoyé
     * @param id string
     */
    public has(id: string) : Promise<boolean> {
        return this.list.has(id);
    }
}

export const SyncManager = new _SyncManager;

interface SList {
    type: string;
    metadata: {[fieldName: string]: string};
}

/**
 * Crée un événement personnalisé
 * @param type Type de l'événement
 * @param detail Données à ajouter
 */
function eventCreator(type: string, detail?: any) : CustomEvent {
    return new CustomEvent(type, { detail });
}

/**
 * Changer l'état des spinners sur la page des entrées
 * @param entries ID des entrées à actualiser
 * @param status Status à donner à ces entrées
 */
function changeInlineSyncStatus(entries: string[], status = "running") : void {
    for (const e of entries) {
        // On fait tourner le bouton
        const sync_icon = document.querySelector(`div[data-formid="${e}"] .sync-icon i`) as HTMLElement;

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
