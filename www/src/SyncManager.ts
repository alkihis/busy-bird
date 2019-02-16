import { FormSave } from "./form_schema";
import { Logger } from "./logger";
import localforage from 'localforage';
import { API_URL } from "./main";
import { readFile, getDir, getDirP, dirEntries, readFileFromEntry } from "./helpers";
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
                    // Le JSON est envoyé !
                    if (json.status && json.send_metadata) {
                        // Si on doit envoyer les fichiers en plus
                        const base_path = "form_data/" + id + "/";

                        const promises: Promise<any>[] = [];

                        for (const metadata in data.metadata) {
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

    public sync(force_all = false, clear_cache = false) : Promise<any> {
        if (this.in_sync) {
            return Promise.reject({code: 1});
        }

        M.toast({html: "Synchronisation démarrée"});

        this.in_sync = true;
        let data_cache: any = {};
        let use_cache = false;

        return new Promise((resolve, reject) => {
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
                    this.in_sync = false;
                    
                    for (const id of entries) {
                        // Pour chaque clé disponible
                        promises.push(
                            id_getter(id)
                                .then(value => {
                                    return this.sendForm(id, value);
                                })
                        );
                    }

                    Promise.all(promises)
                        .then(v => {
                            this.list.clear();
                            this.in_sync = false;
                            Logger.info("Synchronisation réussie");
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

    public clear() {
        this.list.clear();
    }
};

interface SList {
    type: string;
    metadata: {[fieldName: string]: string};
}
