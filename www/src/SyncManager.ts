import { FormSave } from "./form_schema";
import { Logger } from "./logger";
import localforage from 'localforage';
import { API_URL } from "./main";
import { readFile, getDir, getDirP, dirEntries, readFileFromEntry, getModal, initModal, getModalPreloader, MODAL_PRELOADER_TEXT_ID, hasGoodConnection, showToast } from "./helpers";
import { UserManager } from "./user_manager";
import fetch from './fetch_timeout';

// en millisecondes
const MAX_TIMEOUT_FOR_FORM = 20000;
const MAX_TIMEOUT_FOR_METADATA = 180000;

// Nombre de formulaires à envoyer en même temps
// Attention, 1 formulaire correspond au JSON + ses possibles fichiers attachés.
const PROMISE_BY_SYNC_STEP = 10;

const SyncList = new class {
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
        return localforage.keys().then(keys => keys.length);
    }

    public clear() : Promise<void> {
        return localforage.clear();
    }
}

export const SyncManager = new class {
    protected in_sync = false;
    protected list = SyncList;

    public init() {
        this.list.init();
    }

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

    public remove(id: string) : Promise<void> {
        return this.list.remove(id);
    }

    protected sendForm(id: string, data: SList) : Promise<void> {
        // Renvoie une promise réussie si l'envoi du formulaire 
        // et de ses métadonnées a réussi.
        return new Promise((resolve, reject) => {
            // Récupération du fichier
            readFile('forms/' + id + ".json")
                .then(content => {
                    if (!this.in_sync) {
                        reject({code: "aborted"});
                        return;
                    }

                    const d = new FormData();
                    d.append("id", id);
                    d.append("form", content);
                    d.append("access_token", UserManager.token);

                    return fetch(API_URL + "forms/send.json", {
                        method: "POST",
                        body: d
                    }, MAX_TIMEOUT_FOR_FORM)
                    .catch((error): never => {
                        reject({code: "json_send", error});
                        throw '';
                    })
                    .then(response => {
                        return response.json();
                    })
                    .then((json) => {
                        if (json.error_code) throw json.error_code;

                        return json;
                    });
                })
                .then(json => {
                    if (!this.in_sync) {
                        reject({code: "aborted"});
                        return;
                    }

                    // Le JSON est envoyé !
                    if (json.status && json.send_metadata) {
                        // Si on doit envoyer les fichiers en plus
                        const base_path = "form_data/" + id + "/";

                        const promises: Promise<any>[] = [];

                        // json.send_metadata est un tableau de fichiers à envoyer

                        for (const metadata in data.metadata) {
                            if ((json.send_metadata as string[]).indexOf(metadata) === -1) {
                                // La donnée actuelle n'est pas demandée par le serveur
                                continue;
                            }

                            const file = base_path + data.metadata[metadata];
                            const basename = data.metadata[metadata];

                            promises.push(new Promise((res, rej) => {
                                readFile(file, true)
                                    .then(base64 => {
                                        base64 = base64.split(',')[1];
                                        const d = new FormData();
                                        d.append("id", id);
                                        d.append("type", data.type);
                                        d.append("filename", basename);
                                        d.append("data", base64);
                                        d.append("access_token", UserManager.token);
                                        
                                        return fetch(API_URL + "forms/metadata_send.json", {
                                            method: "POST",
                                            body: d
                                        }, MAX_TIMEOUT_FOR_METADATA)
                                        .then((response) => {
                                            return response.json();
                                        })
                                        .then((json) => {
                                            if (json.error_code) rej(json.error_code);
                    
                                            res(json);
                                        })
                                        .catch(error => {
                                            showToast("Impossible d'envoyer " + basename + ".");
                                            rej({code: "metadata_send", error});
                                        })
                                    })
                                    .catch(res);
                            }))
                        }

                        Promise.all(promises)
                            .then(values => {
                                resolve();
                            })
                            .catch(err => {
                                reject(err);
                            })
                    }
                    else {
                        resolve();
                    }
                })
                .catch((error) => {
                    Logger.info("Impossible de lire le fichier", error.message);
                    reject({code: "file_read", error});
                });
        });
    }

    public available() : Promise<string[]> {
        return this.list.listSaved();
    }

    /**
     * Obtient tous les fichiers JSON disponibles sur l'appareil
     */
    protected getAllCurrentFiles() : Promise<[string, SList][]> {
        return getDirP('forms')
            .then(dirEntries)
            .then(entries => {
                // On a les différents JSON situés dans le dossier 'forms', désormais,
                // sous forme de FileEntry
                const promises: Promise<[string, SList]>[] = [];

                // On ajoute chaque entrée
                for (const entry of entries) {
                    promises.push(
                        readFileFromEntry(entry)
                            .then(text => {
                                const json: FormSave = JSON.parse(text);
                                return [
                                    entry.name.split('.json')[0], 
                                    { type: json.type, metadata: json.metadata }
                                ] as [string, SList];
                            })
                    );
                }

                // On attend que tout soit OK
                return Promise.all(promises);
            });
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
                    .then(res => {
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
                "Initialisation...", 
                `<div class="modal-footer">
                    <a href="#!" class="red-text btn-flat left" id="__sync_modal_cancel">Annuler</a>
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
            this.in_sync = false;

            if (text)
                text.insertAdjacentHTML("afterend", `<p class='flow-text center red-text'>Annulation en cours...</p>`);
        }

        return this.sync(force_all, clear_cache, text)
            .then(data => {
                showToast("Synchronisation réussie");

                instance.close();

                return data;
            })
            .catch(reason => {
                if (reason && typeof reason === 'object') {
                    Logger.error("Sync fail:", reason);

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
                                            text.innerText = "Synchronisation annulée.";
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
                                case "aborted": return "La synchonisation a été annulée.";
                                case "json_send": return "Un formulaire n'a pas pu être envoyé.";
                                case "metadata_send": return "Un fichier associé à un formulaire n'a pas pu être envoyé.";
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
                else if (cancel_clicked) {
                    instance.close();
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
     * Divise le nombre d'éléments à envoyer par requête.
     * @param id_getter Fonction pour récupérer un ID depuis la BDD
     * @param entries Tableau des IDs à envoyer
     * @param text_element Élément HTML dans lequel écrire l'avancement de l'envoi
     * @param position Position actuelle dans le tableau d'entrées (utilisation interne)
     */
    protected async subSyncDivider(id_getter: Function, entries: string[], text_element?: HTMLElement) : Promise<void> {    
        for (let position = 0; position < entries.length; position += PROMISE_BY_SYNC_STEP) {
            const subset = entries.slice(position, PROMISE_BY_SYNC_STEP + position);
            const promises: Promise<any>[] = [];
    
            let i = 1;
            for (const id of subset) {
                // Pour chaque clé disponible
                promises.push(
                    id_getter(id)
                        .catch(error => {
                            return Promise.reject({code: "id_getter", error});
                        })
                        .then(value => {
                            if (text_element) {
                                text_element.innerHTML = `Envoi des données au serveur (Formulaire ${i+position}/${entries.length})`;
                            }
                            i++;
    
                            return this.sendForm(id, value);
                        })
                );
            }
    
            await Promise.all(promises);
        }
    }

    /**
     * Lance la synchronisation en arrière plan
     */
    protected launchBackgroundSync() : Promise<any> {
        if (hasGoodConnection()) {
            return this.sync();
        }
    }

    /**
     * Synchronise les formulaires courants avec la BDD distante
     * @param force_all Forcer l'envoi de tous les formulaires
     * @param clear_cache Supprimer le cache actuel d'envoi et forcer tout l'envoi (ne fonctionne qu'avec force_all)
     * @param text_element Élément HTML dans lequel écrire l'avancement
     */
    public sync(force_all = false, clear_cache = false, text_element?: HTMLElement) : Promise<any> {
        if (this.in_sync) {
            return Promise.reject({code: 'already'});
        }

        this.in_sync = true;
        let data_cache: any = {};
        let use_cache = false;

        return new Promise((resolve, reject) => {
            if (text_element) {
                text_element.innerText = "Lecture des données à synchroniser";
            }

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
            else {
                entries_promise = this.list.listSaved();
            }

            // Utilisé pour soit lire depuis le cache, soit lire depuis this.list
            const id_getter = (id) => {
                if (use_cache) {
                    return Promise.resolve(data_cache[id]);
                }
                else {
                    return this.list.get(id);
                }
            };

            entries_promise
                .then(entries => {   
                    if (!this.in_sync) {
                        reject({code: "aborted"});
                        return;
                    }

                    return this.subSyncDivider(id_getter, entries, text_element)
                        .then(v => {
                            this.list.clear();
                            this.in_sync = false;

                            // La synchro a réussi !
                            resolve();
                        });
                })
                .catch(r => {
                    this.in_sync = false;
                    Logger.info("Synchronisation échouée:", r);
                    reject(r);
                });
        });
    }

    protected cancelSync() : void {
        this.in_sync = false;
    }

    public clear() : Promise<void> {
        return this.list.clear();
    }

    public remainingToSync() : Promise<number> {
        return this.list.getRemainingToSync();
    }
};

interface SList {
    type: string;
    metadata: {[fieldName: string]: string};
}
