import { getDir, formatDate, rmrfPromise, removeFilePromise, displayErrorMessage, displayInformalMessage, askModal, convertHTMLToElement, showToast, askModalList, removeContentOfDirectory, unclosableBottomModal, SMALL_PRELOADER } from "./helpers";
import { FormSave, Forms } from "./form_schema";
import { PageManager, AppPageName } from "./PageManager";
import { SyncManager } from "./SyncManager";
import { Logger } from "./logger";
import { getSdCardDir, getSdCardFile } from "./sdcard_file";

enum SaveState {
    saved, waiting, error
};

function editAForm(form: FormSave, name: string) {
    // Vérifie que le formulaire est d'un type disponible
    if (form.type === null || !Forms.formExists(form.type)) {
        showToast("Impossible de charger ce fichier.\nLe type de formulaire enregistré est indisponible.\nVérifiez que vous avez souscrit à ce type de formulaire: '" + form.type+ "'.", 10000);
        return;
    }

    const current_form = Forms.getForm(form.type);
    
    PageManager.pushPage(AppPageName.form, "Modifier", {form: current_form, name, save: form});
}

async function deleteAll() : Promise<any> {
    const instance = unclosableBottomModal(`
        ${SMALL_PRELOADER}
        <p class="flow-text">Suppression en cours</p>
    `);

    PageManager.lock_return_button = true;

    try {
        // On veut supprimer tous les fichiers
        await removeContentOfDirectory('forms');
        await removeContentOfDirectory('form_data');

        if (device.platform === "Android") {
            const sddir = await getSdCardDir("forms");

            if (sddir) {
                await new Promise((resolve, reject) => {
                    sddir.removeRecursively(resolve, reject);
                }).catch(() => {});

                // Recrée le répertoire
                await getSdCardDir("forms");
            }
            
            
            const sddir2 = await getSdCardDir("form_data");

            if (sddir2) {
                await new Promise((resolve, reject) => {
                    sddir2.removeRecursively(resolve, reject);
                }).catch(() => {});

                // Recrée le répertoire
                await getSdCardDir("form_data");
            }
        }

        await SyncManager.clear();

        showToast("Fichiers supprimés avec succès");

        PageManager.lock_return_button = false;
        instance.close();

        PageManager.reload();
    } catch (e) {
        PageManager.lock_return_button = false;
        instance.close();
        throw e;
    }
}

async function appendFileEntry(json: [File, FormSave], ph: HTMLElement) {
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

    if (save.type !== null && Forms.formExists(save.type)) {
        const form = Forms.getForm(save.type);
        type = form.name;

        if (form.id_field) {
            // Si un champ existe pour ce formulaire
            id = (save.fields[form.id_field] as string) || json[0].name;
        }
    }

    // Recherche si il y a déjà eu synchronisation
    try {
        const present = await SyncManager.has(id_without_json);

        if (present) {
            state = SaveState.waiting;
        }
        else {
            state = SaveState.saved;
        }
    } catch (e) { state = SaveState.error; }

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

    const sync_btn = convertHTMLToElement(
        `<a href="#!" class="sync-icon">${sync_str}</a>`
    ) as HTMLAnchorElement;

    container.innerHTML = "";
    container.appendChild(sync_btn);

    // Ajoute le texte de l'élément
    container.insertAdjacentHTML('beforeend', `
        <div class="left">
            [${type}] ${id} <br> 
            Modifié le ${formatDate(new Date(json[0].lastModified), true)}
        </div>`);

    // Ajout des actions de l'élément
    //// ACTION 1: Modifier
    const modify_element = () => {
        editAForm(json[1], json[0].name.split(/\.json$/)[0]);
    };

    const delete_element = () => {
        modalDeleteForm(json[0].name);
    }

    // Définit l'événement de clic sur le formulaire
    selector.addEventListener('click', function() {
        const list = ["Modifier"];

        list.push((container.dataset.synced === "true" ? "Res" : "S") + "ynchroniser");
        list.push("Supprimer");

        askModalList(list)
            .then(index => {
                if (index === 0) {
                    modify_element();
                }
                else if (index === 1) {
                    SyncManager.inlineSync([id_without_json]);
                }
                else {
                    delete_element();
                }
            })
            .catch(() => { /** Refus de l'utilisateur (fermeture du modal) */ });
    });

    // Clear le float
    container.insertAdjacentHTML('beforeend', "<div class='clearb'></div>");

    // Ajoute les éléments dans le conteneur final
    selector.appendChild(container);
    ph.appendChild(selector);
}

function readAllFilesOfDirectory(dirName: string) : Promise<Promise<[File, FormSave]>[]> {
    const dirreader = new Promise(function(resolve, reject) {
        getDir(function(dirEntry) {
            // Lecture de tous les fichiers du répertoire
            const reader = dirEntry.createReader();
            reader.readEntries(function (entries) {
                const promises: Promise<[File, FormSave]>[] = [];

                for (const entry of entries) {
                    promises.push(
                        new Promise(function(resolve, reject) {
                            (entry as FileEntry).file(function (file) {
                                const reader = new FileReader();
                                // console.log(file);
                        
                                reader.onloadend = function() {
                                    try {
                                        resolve([file, JSON.parse(this.result as string)]);
                                    } catch (e) {
                                        console.log("JSON mal formé:", this.result);
                                        resolve([file, { fields: {}, type: "", location: "", owner: "", metadata: {} }])
                                    }
                                };

                                reader.onerror = function(err) {
                                    reject(err);
                                }
                        
                                reader.readAsText(file);
                            }, function(err) {
                                reject(err);
                            });
                        })
                    );
                }

                // Renvoie le tableau de promesses lancées
                resolve(promises);
            },function (err) {
                reject(err);
                console.log(err);
            });
        }, 
        dirName,
        function(err) {
            reject(err);
        });
    }); 

    // @ts-ignore
    return dirreader;
}

function modalDeleteForm(id: string) {
    askModal("Supprimer ce formulaire ?", "Vous ne pourrez pas le restaurer ultérieurement.", "Supprimer", "Annuler")
        .then(() => {
            // L'utilisateur demande la suppression
            deleteForm(id)
                .then(function() {
                    showToast("Entrée supprimée.");
                    PageManager.reload();
                })
                .catch(function(err) {
                    showToast("Impossible de supprimer: " + err);
                });
        })
        .catch(() => {
            // Annulation
        });
}

function deleteForm(id: string) : Promise<void> {
    if (id.match(/\.json$/)) {
        id = id.substring(0, id.length - 5);
    }

    SyncManager.remove(id);

    if (device.platform === 'Android') {
        // Tente de supprimer depuis la carte SD
        getSdCardDir("form_data/" + id)
            .then(dir => {
                dir.removeRecursively(() => {});
            });

        getSdCardFile("forms/" + id + '.json')
            .then(entry => {
                entry.remove(() => {});
            });
    }

    return new Promise(function(resolve, reject) {
        if (id) {
            // Supprime toutes les données (images, sons...) liées au formulaire
            rmrfPromise('form_data/' + id, true).catch(err => err).then(function() {
                getDir(function(dirEntry) {
                    dirEntry.getFile(id + '.json', { create: false }, function (fileEntry) {
                        removeFilePromise(fileEntry).then(function() {
                            resolve();
                        }).catch(reject);
                    }, function() {
                        console.log("Impossible de supprimer");
                        reject("Impossible de supprimer");
                    });
                }, 'forms', reject);
            });
        }
        else {
            reject("ID invalide");
        }
    });
}

export function initSavedForm(base: HTMLElement) {
    const placeholder = document.createElement('ul');
    placeholder.classList.add('collection', 'no-margin-top');

    Forms.onReady(function() {
        readAllFilesOfDirectory('forms').then(all_promises => 
            Promise.all(all_promises)
                .then(async function(files: [File, FormSave][]) {
                    // Tri des fichiers; le plus récent en premier
                    files = files.sort(
                        (a, b) => b[0].lastModified - a[0].lastModified
                    );

                    for (const f of files) {
                        await appendFileEntry(f, placeholder);
                    }

                    base.innerHTML = "";
                    base.appendChild(placeholder);

                    /// Insère un div avec une margin pour forcer de la
                    /// place en bas, pour les boutons
                    base.insertAdjacentHTML('beforeend', "<div class='saver-collection-margin'></div>");
        
                    if (files.length === 0) {
                        base.innerHTML = displayInformalMessage("Vous n'avez aucun formulaire sauvegardé.");
                    }
                    else {
                        //// Bouton de synchronisation
                        const syncbtn = convertHTMLToElement(`
                            <div class="fixed-action-btn" style="margin-right: 50px;">
                                <a class="btn-floating waves-effect waves-light green">
                                    <i class="material-icons">sync</i>
                                </a>
                            </div>`
                        );
                        syncbtn.onclick = function() {
                            askModal("Synchroniser ?", "Voulez-vous lancer la synchronisation des entrées maintenant ?")
                                .then(() => {
                                    return SyncManager.inlineSync();
                                })
                                .then(() => {
                                    // PageManager.reload();
                                })
                                .catch(() => {});
                        }
                        base.appendChild(syncbtn);

                        // Bouton de suppression globale
                        const delete_btn = convertHTMLToElement(`
                            <div class="fixed-action-btn">
                                <a class="btn-floating waves-effect waves-light red">
                                    <i class="material-icons">delete_sweep</i>
                                </a>
                            </div>`
                        );

                        delete_btn.addEventListener('click', () => {
                            askModal(
                                "Tout supprimer ?", 
                                "Tous les formulaires enregistrés, même possiblement non synchronisés, seront supprimés."
                            )
                            .then(() => {
                                setTimeout(function() {
                                    // Attend que le modal précédent se ferme
                                    askModal(
                                        "Êtes-vous sûr-e ?", 
                                        "La suppression est irréversible.",
                                        "Annuler",
                                        "Supprimer"
                                    )
                                    .then(() => {
                                        // Annulation
                                    })
                                    .catch(() => {
                                        deleteAll();
                                    });
                                }, 150);
                            })
                            .catch(() => {});
                        });

                        base.insertAdjacentElement('beforeend', delete_btn);
                    }
                    
                })
        ).catch(function(err) {
            Logger.error("Impossible de charger les fichiers", err.message, err.stack);
            base.innerHTML = displayErrorMessage("Erreur", "Impossible de charger les fichiers. ("+err.message+")");
        });
    });
}
