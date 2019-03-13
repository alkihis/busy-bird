import { FILE_HELPER, SD_FILE_HELPER, ID_COMPLEXITY, ENABLE_SCROLL_ON_FORM_VERIFICATION_CLICK, SCROLL_TO_CENTER_ON_FORM_VERIFICATION_CLICK } from "./main";
import { urlToBlob, generateId, showToast, getModalPreloader, sleep, initModal, getModal } from "./helpers";
import { FormSave, Form } from "./form_schema";
import { UserManager } from "./user_manager";
import { PageManager, AppPageName } from "./PageManager";
import { Logger } from "./logger";
import { SyncManager } from "./SyncManager";
import { UNKNOWN_NAME } from "./location";

function scrollToAnElementOnClick(element_base: HTMLElement, element_related: HTMLElement, modal: M.Modal, center = false) : void {
    element_base.onclick = () => {
        const element_middle = element_related.clientHeight;

        $([document.documentElement, document.body]).animate({
            scrollTop: ($(element_related).offset().top) - (center ? (window.innerHeight / 2) - (element_middle / 2) : 20)
        }, 500, function() {
            $(element_related).fadeOut(300, function() {
                $(this).fadeIn(200);
            }); 
        });

        modal.close();
    }
}

/**
 * Lance la vérification des champs pour ensuite sauvegarder le formulaire
 * @param type Type de formulaire (ex: cincle_plongeur)
 * @param current_form
 * @param force_name? Force un identifiant pour le form à enregistrer
 * @param form_save? Précédente sauvegarde du formulaire
 */
export async function beginFormSave(type: string, current_form: Form, force_name?: string, form_save?: FormSave) : Promise<void> {
    // Ouverture du modal de verification
    const modal = getModal();
    const instance = initModal({ dismissible: false, outDuration: 100 }, getModalPreloader(
        "Vérification du formulaire en cours",
        `<div class="modal-footer">
            <a href="#!" class="btn-flat red-text modal-close">Annuler</a>
        </div>`
    ));

    instance.open();

    // Attend que le modal s'ouvre proprement (ralentissements sinon)
    await sleep(300);

    modal.classList.add('modal-fixed-footer');

    // [name, reason, element]
    type VerifiedElement = [string, string, HTMLElement];

    // Recherche des éléments à vérifier
    const elements_failed: VerifiedElement[] = [];
    const elements_warn: VerifiedElement[] = [];

    const location_element = document.getElementById('__location__id') as HTMLInputElement;

    let location_str: string | null = null;
    if (location_element) {
        location_str = location_element.dataset.reallocation;
    }

    // Vérifie le lieu si le lieu est défini 
    // (si il n'est pas requis, affiche un warning, sinon une erreur)
    if (!current_form.no_location && !location_str) {
        if (current_form.skip_location)
            elements_warn.push(["Lieu", "Aucun lieu n'a été précisé.", location_element.parentElement]);
        else
            elements_failed.push(["Lieu", "Aucun lieu n'a été précisé.", location_element.parentElement]);
    }
    if (location_str === UNKNOWN_NAME) {
        elements_warn.push(["Lieu", "Le lieu choisi est un lieu inexistant.", location_element.parentElement]);
    }

    // Input classiques: checkbox/slider, text, textarea, select, number
    for (const e of document.getElementsByClassName('input-form-element')) {
        const element = e as HTMLInputElement | HTMLSelectElement;
        const label = document.querySelector(`label[for="${element.id}"]`);
        let name = element.name;
        if (label) {
            name = label.textContent;
        }

        const contraintes: any = {};
        if (element.dataset.constraints) {
            element.dataset.constraints.split(';').map((e: string) => {
                const [name, value] = e.split('=');
                contraintes[name] = value;
            });
        }

        // Valide des contraintes externes si jamais l'élément a une valeur
        if (element.value && element.dataset.e_constraints && !validConstraints(element.dataset.e_constraints, element)) {
            const str = element.dataset.invalid_tip || "Les contraintes externes du champ ne sont pas remplies.";
            if (element.required) {
                elements_failed.push([name, str, element.parentElement]);
            }
            else {
                elements_warn.push([name, str, element.parentElement]);
            }
        }
        else if (element.tagName === "INPUT" && element.type === "checkbox") {
            if ((element as HTMLInputElement).indeterminate) {
                if (element.required) {
                    elements_failed.push([(element.nextElementSibling as HTMLElement).innerText, "Ce champ est requis", element.parentElement]);
                }
                else {
                    elements_warn.push([(element.nextElementSibling as HTMLElement).innerText, "Vous n'avez pas interagi avec ce champ", element.parentElement]);
                }
            }
        }
        else if (element.required && !element.value) {
            if (element.tagName !== "SELECT" || (element.multiple && ($(element).val() as string[]).length === 0)) {
                elements_failed.push([name, "Champ requis", element.parentElement]);
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
                        str += "Le nombre doit être égal ou supérieur à " + (element as HTMLInputElement).min + ". ";
                    }
                    if (element.validity.rangeOverflow) {
                        str += "Le nombre doit être égal ou inférieur à " + (element as HTMLInputElement).max + ". ";
                    }

                    // Vérification de la précision
                    if ((element as HTMLInputElement).step) {
                        if (element.validity.stepMismatch) {
                            str += "Le nombre doit avoir une précision de " + (element as HTMLInputElement).step + ". ";
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
                    elements_failed.push([name, str, element.parentElement]);
                }
                else {
                    elements_warn.push([name, str, element.parentElement]);
                }
            }

            // Si c'est autre chose, l'élément est forcément valide
        }
    }

    // Éléments FILE (ici, possiblement que des images)
    for (const e of document.querySelectorAll('.input-image-element[required]')) {
        const filei = e as HTMLInputElement;

        if (filei.files.length === 0) {
            const label = document.querySelector(`input[data-for="${filei.id}"]`) as HTMLElement;
            let name = filei.name;
            if (label) {
                name = label.dataset.label;
            }

            elements_failed.push([name, "Fichier requis", filei.parentElement]);
        }
    }

    // Éléments AUDIO (avec le modal permettant d'enregistrer du son)
    for (const e of document.querySelectorAll('.input-audio-element[required]')) {
        const hiddeni = e as HTMLInputElement;

        if (!hiddeni.value) {
            elements_failed.push([hiddeni.dataset.label, "Enregistrement audio requis", hiddeni.parentElement]);
        }
    }

    // Construit les éléments dans le modal
    const container = document.createElement('div');
    container.classList.add('modal-content');

    if (elements_warn.length > 0 || elements_failed.length > 0) {
        const par = document.createElement('p');
        par.classList.add('flow-text', 'no-margin-top');
        par.innerText = "Des erreurs "+ (!elements_failed.length ? 'potentielles' : '') +" ont été détectées.";
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

            if (ENABLE_SCROLL_ON_FORM_VERIFICATION_CLICK) {
                scrollToAnElementOnClick(li, error[2], instance, SCROLL_TO_CENTER_ON_FORM_VERIFICATION_CLICK);
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

            if (ENABLE_SCROLL_ON_FORM_VERIFICATION_CLICK) {
                scrollToAnElementOnClick(li, warning[2], instance, SCROLL_TO_CENTER_ON_FORM_VERIFICATION_CLICK);
            }
            
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

        save_btn.onclick = function() {
            modal.innerHTML = getModalPreloader("Sauvegarde en cours");
            modal.classList.remove('modal-fixed-footer');
            const unique_id = force_name || generateId(ID_COMPLEXITY);
            PageManager.lock_return_button = true;

            saveForm(type, unique_id, location_str, form_save)
                .then((form_values) => {
                    SyncManager.add(unique_id, form_values);

                    if (form_save) {
                        instance.close();
                        showToast("Écriture de l'entrée et de ses données réussie.");

                        // On vient de la page d'édition de formulaire déjà créés
                        PageManager.popPage();
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

                        document.getElementById('__after_save_entries').onclick = function() {
                            PageManager.changePage(AppPageName.saved, false);
                        };

                        document.getElementById('__after_save_new').onclick = function() {
                            setTimeout(() => {
                                PageManager.reload(undefined, true);
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

                    PageManager.lock_return_button = false;
                    Logger.error(error, error.message, error.stack);
                })
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
export function saveForm(type: string, name: string, location: string, form_save?: FormSave) : Promise<FormSave> {
    const form_values: FormSave = {
        fields: {},
        type,
        location,
        owner: (form_save ? form_save.owner : UserManager.username),
        metadata: {}
    };

    for (const input of document.getElementsByClassName('input-form-element')) {
        const i = input as HTMLInputElement;
        if (input.tagName === "SELECT" && (input as HTMLSelectElement).multiple) {
            const selected = [...(input as HTMLSelectElement).options].filter(option => option.selected).map(option => option.value);
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

    return writeDataThenForm(name, form_values, form_save);
}

/**
 * Ecrit les fichiers présents dans le formulaire dans un dossier spécifique,
 * puis crée le formulaire
 * @param name Nom du formulaire (sans le .json)
 * @param form_values
 * @param older_save
 */
async function writeDataThenForm(name: string, form_values: FormSave, older_save?: FormSave) : Promise<FormSave> {
    function saveBlobToFile(filename: string, input_name: string, blob: Blob) : Promise<void> {
        const full_path = 'form_data/' + name + '/' + filename;

        return FILE_HELPER.write(full_path, blob)
            .then(() => {
                if (device.platform === 'Android' && SD_FILE_HELPER) {
                    return SD_FILE_HELPER.write(full_path, blob).catch(e => console.log(e));
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
                        if (SD_FILE_HELPER) {
                            SD_FILE_HELPER.rm(older_save.fields[input_name] as string);
                        }
                        FILE_HELPER.rm(older_save.fields[input_name] as string);
                    }
                }
            })
            .catch((error: FileError) => {
                showToast("Un fichier n'a pas pu être sauvegardé. Vérifiez votre espace de stockage.");
                return Promise.reject(error);
            });
    }

    // Récupère les images du formulaire
    const images_from_form = document.getElementsByClassName('input-image-element');

    // Sauvegarde les images !
    const promises = [];

    for (const img of images_from_form) {
        const file = (img as HTMLInputElement).files[0];
        const input_name = (img as HTMLInputElement).name;

        if (file) {
            const filename = file.name;

            promises.push(
                saveBlobToFile(filename, input_name, file)
            );
        }
        else {
            if (older_save && input_name in older_save.fields) {
                form_values.fields[input_name] = older_save.fields[input_name];

                if (typeof older_save.fields[input_name] === 'string') {
                    const parts = (older_save.fields[input_name] as string).split('/');
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
        const file = (audio as HTMLInputElement).value;
        const input_name = (audio as HTMLInputElement).name;

        if (file) {
            const filename = generateId(ID_COMPLEXITY) + '.mp3';

            promises.push(
                urlToBlob(file).then(function(blob) {
                    return saveBlobToFile(filename, input_name, blob);
                })
            );
        }
        else {
            if (older_save && input_name in older_save.fields) {
                form_values.fields[input_name] = older_save.fields[input_name];

                if (typeof older_save.fields[input_name] === 'string') {
                    const parts = (older_save.fields[input_name] as string).split('/');
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

    await FILE_HELPER.write('forms/' + name + '.json', form_values);

    if (device.platform === 'Android' && SD_FILE_HELPER) {
        SD_FILE_HELPER.write('forms/' + name + '.json', form_values).catch((e) => console.log(e));
    }

    console.log(form_values);
    return form_values;
}

/**
 * Valide les contraintes externes d'un champ
 * @param constraints 
 * @param e 
 */
export function validConstraints(constraints: string, e: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) : boolean {
    const cons = constraints.split(';');
    const form = document.getElementById('__main_form__id') as HTMLFormElement;

    for (const c of cons) {
        const actual = c.split('=');
        // Supprime le possible ! à la fin de actual[0]
        const name = actual[0].replace(/!$/, '');
        const champ = form.elements[name as any] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

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
