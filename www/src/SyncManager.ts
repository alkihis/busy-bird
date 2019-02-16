import { FormSave } from "./form_schema";
import { Logger } from "./logger";
import localforage from 'localforage';
import { API_URL } from "./main";
import { readFile } from "./helpers";
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
                                        });
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

    public sync() : Promise<any> {
        if (this.in_sync) {
            return Promise.reject({code: 1});
        }

        Logger.info("Synchronisation démarrée");

        this.in_sync = true;

        return new Promise((resolve, reject) => {
            const promises = [];

            this.list.listSaved()
                .then(entries => {
                    this.in_sync = false;
                    
                    for (const id of entries) {
                        // Pour chaque clé disponible
                        promises.push(new Promise((res, rej) => {
                            this.list.get(id)
                                .then(value => {
                                    return this.sendForm(id, value);
                                })
                                .then(sended => {
                                    res();
                                })
                                .catch(reject);
                        }));
                    }

                    Promise.all(promises)
                        .then(v => {
                            this.list.clear();
                            this.in_sync = false;
                            Logger.info("Synchronisation réussie");
                            resolve();
                        })
                        .catch(r => {
                            this.in_sync = false;
                            Logger.info("Synchronisation échouée:", r);
                            reject();
                        });
                })
                .catch(reject);
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
