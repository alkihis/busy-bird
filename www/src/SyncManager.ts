import { FormSave } from "./form_schema";
import { Logger } from "./logger";
import localforage from 'localforage';
import { API_URL } from "./main";
import { readFile, getDir, getDirP, dirEntries, readFileFromEntry, getModal, initModal, getModalPreloader, MODAL_PRELOADER_TEXT_ID } from "./helpers";
import { UserManager } from "./user_manager";

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
                        reject();
                        return;
                    }

                    const d = new FormData();
                    d.append("id", id);
                    d.append("form", content);
                    d.append("access_token", UserManager.token);

                    return fetch(API_URL + "forms/send.json", {
                        method: "POST",
                        body: d
                    }).then((response) => {
                        return response.json();
                    }).then((json) => {
                        if (json.error_code) throw json.error_code;

                        return json;
                    });
                })
                .then(json => {
                    if (!this.in_sync) {
                        reject();
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
                                        }).then((response) => {
                                            return response.json();
                                        }).then((json) => {
                                            if (json.error_code) rej(json.error_code);
                    
                                            res(json);
                                        }).catch(error => {
                                            M.toast({html: "Impossible d'envoyer " + basename + "."});
                                            rej(error);
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
                                reject();
                            })
                    }
                    else {
                        resolve();
                    }
                })
                .catch(reject);
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
                instance.close();

                return data;
            })
            .catch(reason => {
                if (cancel_clicked) {
                    instance.close();
                }
                else {
                    // Modifie le texte du modal
                    modal.innerHTML = `
                    <div class="modal-content">
                        <h5 class="red-text">Impossible de synchroniser</h5>
                        <p class="flow-text">Veuillez réessayer ultérieurement.</p>
                    </div>
                    <div class="modal-footer">
                        <a href="#!" class="red-text btn-flat left modal-close">Fermer</a>
                        <div class="clearb"></div>
                    </div>
                    `;
                }

                return Promise.reject(reason);
            });
    }

    /**
     * Divise le nombre d'éléments à envoyer par requête.
     * Attention, augmente drastiquement le nombre d'appels de fonctions; et donc l'empreinte mémoire.
     * @param id_getter Fonction pour récupérer un ID depuis la BDD
     * @param entries Tableau des IDs à envoyer
     * @param text_element Élément HTML dans lequel écrire l'avancement de l'envoi
     * @param position Position actuelle dans le tableau d'entrées (utilisation interne)
     */
    protected subSyncDivider(id_getter: Function, entries: string[], text_element?: HTMLElement, position = 0) : Promise<any> {
        const promise_by_step = 10;
        const subset = entries.slice(position, promise_by_step + position);
        const promises: Promise<any>[] = [];

        // Cas d'arrêt
        if (subset.length === 0) {
            return Promise.resolve();
        }

        let i = 1;
        for (const id of subset) {
            // Pour chaque clé disponible
            promises.push(
                id_getter(id)
                    .then(value => {
                        if (text_element) {
                            text_element.innerHTML = `Envoi des données au serveur (Formulaire ${i+position}/${entries.length})`;
                        }
                        i++;

                        return this.sendForm(id, value);
                    })
            );
        }

        return Promise.all(promises)
            .then(() => {
                return this.subSyncDivider(id_getter, entries, text_element, position + promise_by_step);
            })
    }

    /**
     * Synchronise les formulaires courants avec la BDD distante
     * @param force_all Forcer l'envoi de tous les formulaires
     * @param clear_cache Supprimer le cache actuel d'envoi et forcer tout l'envoi (ne fonctionne qu'avec force_all)
     * @param text_element Élément HTML dans lequel écrire l'avancement
     */
    public sync(force_all = false, clear_cache = false, text_element?: HTMLElement) : Promise<any> {
        if (this.in_sync) {
            return Promise.reject({code: 1});
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

            const promises = [];
            entries_promise
                .then(entries => {   
                    if (!this.in_sync) {
                        reject();
                        return;
                    }

                    this.subSyncDivider(id_getter, entries, text_element)
                        .then(v => {
                            this.list.clear();
                            this.in_sync = false;

                            M.toast({html: "Synchronisation réussie"});
                            resolve();
                        })
                        .catch(r => {
                            this.in_sync = false;
                            Logger.info("Synchronisation échouée:", r);
                            M.toast({html: "Synchronisation échouée"});
                            reject();
                        });
                })
                .catch(r => {
                    this.in_sync = false;
                    Logger.info("Synchronisation échouée:", r);
                    M.toast({html: "Synchronisation échouée"});
                    reject();
                });
        });
    }

    protected cancelSync() : void {
        this.in_sync = false;
    }

    public clear() {
        this.list.clear();
    }
};

interface SList {
    type: string;
    metadata: {[fieldName: string]: string};
}
