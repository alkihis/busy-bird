import { getDir, formatDate, rmrfPromise, removeFilePromise, displayErrorMessage, displayInformalMessage, askModal, getDirP, dirEntries, convertHTMLToElement, showToast } from "./helpers";
import { FormSave, Forms } from "./form_schema";
import { PageManager, AppPageName } from "./PageManager";
import { SyncManager } from "./SyncManager";
import { Logger } from "./logger";

function editAForm(form: FormSave, name: string) {
    // Vérifie que le formulaire est d'un type disponible
    if (form.type === null || !Forms.formExists(form.type)) {
        showToast("Impossible de charger ce fichier: Le type de formulaire enregistré est indisponible.");
        return;
    }

    const current_form = Forms.getForm(form.type);
    
    PageManager.pushPage(AppPageName.form, "Modifier", {form: current_form, name, save: form});
}

function deleteAll() : Promise<any> {
    // On veut supprimer tous les fichiers
    // Récupération de tous les fichiers de forms
    return getDirP('forms')
        // Récupère les entries du répertoire
        .then(dirEntries)
        .then(entries => {
            const promises: Promise<any>[] = [];

            for (const e of entries) {
                if (e.isFile) {
                    promises.push(deleteForm(e.name));
                }
            }

            return Promise.all(promises);
        })
        .then(() => {
            return SyncManager.clear();
        })
        .then(() => {
            showToast("Fichiers supprimés avec succès");
            PageManager.reload();
        })
}

function appendFileEntry(json: [File, FormSave], ph: HTMLElement) {
    const save = json[1];
    const selector = document.createElement('li');
    selector.classList.add('collection-item');

    const container = document.createElement('div');
    let id = json[0].name;

    if (save.type !== null && Forms.formExists(save.type)) {
        const id_f = Forms.getForm(save.type).id_field;
        if (id_f) {
            // Si un champ existe pour ce formulaire
            id = (save.fields[id_f] as string) || json[0].name;
        }
    }

    // Ajoute le texte de l'élément
    container.innerHTML = `
        <div class="left">
            ${id} <br> 
            Modifié le ${formatDate(new Date(json[0].lastModified), true)}
        </div>`;

    // Ajoute le bouton de suppression
    const delete_btn = document.createElement('a');
    delete_btn.href = "#!";
    delete_btn.classList.add('secondary-content');
    const im = document.createElement('i');
    im.classList.add('material-icons', 'red-text');
    im.innerText = "delete_forever";

    delete_btn.appendChild(im);
    container.appendChild(delete_btn);
    const file_name = json[0].name;
    delete_btn.addEventListener('click', function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        modalDeleteForm(file_name);
    });

    // Clear le float
    container.insertAdjacentHTML('beforeend', "<div class='clearb'></div>");

    // Définit l'événement d'édition
    selector.addEventListener('click', function() {
        editAForm(json[1], json[0].name.split(/\.json$/)[0]);
    });

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
                            entry.file(function (file) {
                                const reader = new FileReader();
                                console.log(file);
                        
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
            Promise.all(all_promises).then(function(files: [File, FormSave][]) {
                // Tri des fichiers; le plus récent en premier
                files = files.sort(
                    (a, b) => b[0].lastModified - a[0].lastModified
                );

                for (const f of files) {
                    appendFileEntry(f, placeholder);
                }

                base.innerHTML = "";
                base.appendChild(placeholder);
    
                if (files.length === 0) {
                    base.innerHTML = displayInformalMessage("Vous n'avez aucun formulaire sauvegardé.");
                }
                else {
                    // Bouton de suppression globale
                    const delete_btn = convertHTMLToElement(`
                        <div class="fixed-action-btn">
                            <a class="btn-floating btn-large waves-effect waves-light red">
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
                
            }).catch(function(err) {
                throw err;
            })
        ).catch(function(err) {
            Logger.error("Impossible de charger les fichiers", err.message, err.stack);
            base.innerHTML = displayErrorMessage("Erreur", "Impossible de charger les fichiers. ("+err.message+")");
        });
    });
}
