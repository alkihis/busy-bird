import { formatDate, displayErrorMessage, displayInformalMessage, askModal, convertHTMLToElement, showToast, askModalList, unclosableBottomModal, SMALL_PRELOADER } from "../utils/helpers";
import { FormSave, Schemas } from "../base/FormSchema";
import { PageManager, AppPages } from "../base/PageManager";
import { SyncManager } from "../base/SyncManager";
import { Logger } from "../utils/logger";
import { FILE_HELPER } from "../main";
import { FileHelperReadMode } from "../base/FileHelper";
import { FormSaves, ENTRIES_DIR } from "../base/FormSaves";

/** État de sauvegarde d'une entrée */
enum SaveState {
    saved, waiting, error
};

/**
 * Lance la modification d'une sauvegarde d'une entrée form.
 * @param form Sauvegarde d'une entrée
 * @param name Identifiant du formulaire (sans le .json)
 */
function editAForm(form: FormSave, name: string) {
    // Vérifie que le formulaire est d'un type disponible
    if (form.type === null || !Schemas.exists(form.type)) {
        showToast("Unable to load this entry.\nUnknwon type of entry.\nPlease check your subscription of this form model: \"" + form.type + "\".", 10000);
        return;
    }

    const current_form = Schemas.get(form.type);

    PageManager.push(AppPages.form, "Edit", { form: current_form, name, save: form });
}

/**
 * Supprime toutes les entrées sauvegardées sur l'appareil
 */
async function deleteAll(): Promise<any> {
    const instance = unclosableBottomModal(`
        ${SMALL_PRELOADER}
        <p class="flow-text">Removing...</p>
    `);

    PageManager.lock_return_button = true;

    try {
        await FormSaves.clear();

        showToast("Files has been removed successfully.");

        PageManager.lock_return_button = false;
        instance.close();

        PageManager.reload();
    } catch (e) {
        PageManager.lock_return_button = false;
        instance.close();
        Logger.error("Unable to delete", e);
        throw e;
    }
}

/**
 * Construit la card d'entrée sur la page des entrées
 * @param json Fichier JSON contenant l'entrée
 * @param ph Element dans lequel écrire la card
 */
async function appendFileEntry(json: File, ph: HTMLElement) {
    const save = await FILE_HELPER.readFileAs(json, FileHelperReadMode.json) as FormSave;

    const selector = document.createElement('li');
    selector.classList.add('collection-item');

    const container = document.createElement('div');
    container.classList.add('saved-form-item');
    let id = json.name;
    const id_without_json = id.split('.json')[0];
    container.dataset.formid = id_without_json;
    let state = SaveState.error;
    let type = "Type inconnu";

    if (save.type !== null && Schemas.exists(save.type)) {
        const form = Schemas.get(save.type);
        type = form.name;

        if (form.id_field) {
            // Si un champ existe pour ce formulaire
            id = (save.fields[form.id_field] as string) || json.name;
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
            Modifié le ${formatDate(new Date(json.lastModified), true)}
        </div>`);

    // Ajout des actions de l'élément
    //// ACTION 1: Modifier
    const modify_element = () => {
        editAForm(save, json.name.split(/\.json$/)[0]);
    };

    const delete_element = () => {
        modalDeleteForm(json.name);
    }

    // Définit l'événement de clic sur le formulaire
    selector.addEventListener('click', function () {
        const list = [
            "Edit",
            (container.dataset.synced === "true" ? "Res" : "S") + "ynchronize",
            "Remove"
        ];

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

/**
 * Lance un modal qui demandera si on veut supprimer une entrée id
 * @param id Identifiant de l'entrée
 */
function modalDeleteForm(id: string) {
    askModal("Remove this entry ?", "You will not be able to restore it later.", "Remove", "Cancel")
        .then(() => {
            // L'utilisateur demande la suppression
            deleteForm(id)
                .then(function () {
                    showToast("Entry has beed removed successfully.");
                    PageManager.reload();
                })
                .catch(function (err) {
                    showToast("Unable to remove: " + err);
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
function deleteForm(id: string): Promise<void> {
    if (id.match(/\.json$/)) {
        id = id.substring(0, id.length - 5);
    }

    if (id) {
        return FormSaves.rm(id);
    }
    else {
        return Promise.reject("Invalid ID");
    }
}

/**
 * Point d'entrée de la page de visionnage des formulaires sauvegardés
 * @param base Element dans lequel écrire 
 */
export async function initSavedForm(base: HTMLElement) {
    const placeholder = document.createElement('ul');
    placeholder.classList.add('collection', 'no-margin-top');

    console.log(await FILE_HELPER.readAll(ENTRIES_DIR, FileHelperReadMode.fileobj));

    try {
        await FILE_HELPER.mkdir(ENTRIES_DIR);
    } catch (err) {
        Logger.error("Unable to create entry directory", err.message, err.stack);
        base.innerHTML = displayErrorMessage("Error", "Unable to load files. (" + err.message + ")");
        return;
    }

    Schemas.onReady()
        .then(() => {
            return FILE_HELPER.readAll(ENTRIES_DIR, FileHelperReadMode.fileobj) as Promise<File[]>;
        })
        .then(async (files: File[]) => {
            // Tri des fichiers; le plus récent en premier
            files = files.sort(
                (a, b) => b.lastModified - a.lastModified
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
                base.innerHTML = displayInformalMessage("You have no saved entries.");
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
                syncbtn.onclick = function () {
                    askModal("Synchronize ?", "Do you want to launch entries synchronisation now ?")
                        .then(() => {
                            return SyncManager.inlineSync();
                        })
                        .then(() => {
                            // PageManager.reload();
                        })
                        .catch(() => { });
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
                        "Delete all ?",
                        "All saved entries, even potentially unsynced, will be removed."
                    )
                        .then(() => {
                            setTimeout(function () {
                                // Attend que le modal précédent se ferme
                                askModal(
                                    "Are you sure ?",
                                    "Deletion is irreversible.",
                                    "Cancel",
                                    "Delete all"
                                )
                                    .then(() => {
                                        // @ts-ignore bugfix
                                        document.body.style.overflow = ''; M.Modal._modalsOpen = 0;
                                        // Annulation
                                    })
                                    .catch(() => {
                                        // @ts-ignore bugfix
                                        document.body.style.overflow = ''; M.Modal._modalsOpen = 0;
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
            Logger.error("Unable to load files", err.message, err.stack);
            base.innerHTML = displayErrorMessage("Error", "Unable to load files. (" + err.message + ")");
        });
}
