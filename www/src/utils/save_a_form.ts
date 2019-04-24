import { ID_COMPLEXITY, ENABLE_SCROLL_ON_FORM_VERIFICATION_CLICK, SCROLL_TO_CENTER_ON_FORM_VERIFICATION_CLICK } from "../main";
import { generateId, showToast, getModalPreloader, sleep, initModal, getModal } from "./helpers";
import { FormSave, Schema } from "../base/FormSchema";
import { UserManager } from "../base/UserManager";
import { PageManager, AppPages } from "../base/PageManager";
import { Logger } from "./Logger";
import { SyncManager } from "../base/SyncManager";
import { UNKNOWN_NAME } from "./location";
import { FormSaves } from "../base/FormSaves";

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
export async function beginFormSave(type: string, current_form: Schema, force_name?: string, form_save?: FormSave) : Promise<void> {
    // Ouverture du modal de verification
    const modal = getModal();
    const instance = initModal({ dismissible: false, outDuration: 100 }, getModalPreloader(
        "Checking form...",
        `<div class="modal-footer">
            <a href="#!" class="btn-flat red-text modal-close">Cancel</a>
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
            elements_warn.push(["Location", "No place has been selected.", location_element.parentElement]);
        else
            elements_failed.push(["Location", "No place has been selected.", location_element.parentElement]);
    }
    if (location_str === UNKNOWN_NAME) {
        elements_warn.push(["Location", "Choosen place is an inexistant place.", location_element.parentElement]);
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

        // Si c'est une checkbox, on regarde si elle est indéterminée
        if (element.tagName === "INPUT" && element.type === "checkbox") {
            if ((element as HTMLInputElement).indeterminate) {
                if (element.required) {
                    elements_failed.push([(element.nextElementSibling as HTMLElement).innerText, "Required field.", element.parentElement]);
                }
                else {
                    elements_warn.push([(element.nextElementSibling as HTMLElement).innerText, "You have not interacted with this field.", element.parentElement]);
                }
            }
        }
        // Si l'élément est requis mais qu'il n'a aucune valeur
        else if (element.required && !element.value) {
            if (element.tagName !== "SELECT" || (element.multiple && ($(element).val() as string[]).length === 0)) {
                elements_failed.push([name, "Required field.", element.parentElement]);
            }
        }
        else {
            let str = "";

            // Si le champ est requis et a une valeur, on recherche ses contraintes
            if (Object.keys(contraintes).length > 0 || element.type === "number") {
                if (element.type === "text" || element.tagName === "textarea") {
                    if (typeof contraintes.min !== 'undefined' && element.value.length < contraintes.min) {
                        str += "Text length should be equal or greater to " + contraintes.min + " characters. ";
                    }
                    if (typeof contraintes.max !== 'undefined' && element.value.length > contraintes.max) {
                        str += "Text length should be equal or less than " + contraintes.max + " characters. ";
                    }
                }
                else if (element.type === "number" && element.value !== "") {
                    if (element.validity.rangeUnderflow) {
                        str += "Number should be equal or greater to " + (element as HTMLInputElement).min + ". ";
                    }
                    if (element.validity.rangeOverflow) {
                        str += "Number should be equal or less than " + (element as HTMLInputElement).max + ". ";
                    }

                    // Vérification de la précision
                    if ((element as HTMLInputElement).step) {
                        if (element.validity.stepMismatch) {
                            str += "Number should have a precision of " + (element as HTMLInputElement).step + ". ";
                        }
                        else if (element.value.indexOf('.') === -1) {
                            str += "Number should have floating point. ";
                        }
                    }
                }
            }

            // On vérifie que le champ n'a pas un "suggested_not_blank"
            // Le warning ne peut pas s'afficher pour les éléments non requis: de toute façon, si ils
            // sont vides, la vérification lève une erreur fatale.
            if (contraintes.suggest && !element.required && element.value === "") {
                str += "This element should not be empty. ";
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

    // Éléments IMAGE
    for (const e of document.querySelectorAll('.input-image-element[required]')) {
        const filei = e as HTMLInputElement;

        if (filei.files.length === 0 && !filei.dataset.imagemanualurl) {
            const label = document.querySelector(`input[data-for="${filei.id}"]`) as HTMLElement;
            let name = filei.name;
            if (label) {
                name = label.dataset.label;
            }

            elements_failed.push([name, "Required image", filei.parentElement]);
        }
    }

    // Éléments FILE
    for (const e of document.querySelectorAll('.input-fileitem-element[required]')) {
        const filei = e as HTMLInputElement;

        if (filei.files.length === 0) {
            const label = document.querySelector(`input[data-for="${filei.id}"]`) as HTMLElement;
            let name = filei.name;
            if (label) {
                name = label.dataset.label;
            }

            elements_failed.push([name, "Required file", filei.parentElement]);
        }
    }

    // Éléments AUDIO (avec le modal permettant d'enregistrer du son)
    for (const e of document.querySelectorAll('.input-audio-element[required]')) {
        const hiddeni = e as HTMLInputElement;

        if (!hiddeni.value) {
            elements_failed.push([hiddeni.dataset.label, "Required audio record", hiddeni.parentElement]);
        }
    }

    // Construit les éléments dans le modal
    const container = document.createElement('div');
    container.classList.add('modal-content');

    if (elements_warn.length > 0 || elements_failed.length > 0) {
        const par = document.createElement('p');
        par.classList.add('flow-text', 'no-margin-top');
        par.innerText = (!elements_failed.length ? 'Potential e' : 'E') +"rrors has been detected.";
        container.appendChild(par);

        if (!elements_failed.length) {
            const tinypar = document.createElement('p');
            tinypar.style.marginTop = "-15px";
            tinypar.innerText = "Please check your typing.";
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
        title.innerText = "Sum up";
        container.appendChild(title);

        const par = document.createElement('p');
        par.classList.add('flow-text');
        par.innerText = "This entry does not contains errors. You could save your work now.";
        container.appendChild(par);
    }

    // Footer
    const footer = document.createElement('div');
    footer.classList.add('modal-footer');

    const cancel_btn = document.createElement('a');
    cancel_btn.href = "#!";
    cancel_btn.classList.add('btn-flat', 'left', 'modal-close', 'red-text');
    cancel_btn.innerText = "Correct";

    footer.appendChild(cancel_btn);

    // Si aucun élément requis n'est oublié ou invalide, alors on autorise la sauvegarde
    if (elements_failed.length === 0) {
        const save_btn = document.createElement('a');
        save_btn.href = "#!";
        save_btn.classList.add('btn-flat', 'right', 'green-text');
        save_btn.innerText = "Save";

        save_btn.onclick = function() {
            modal.innerHTML = getModalPreloader("Save in progress");
            modal.classList.remove('modal-fixed-footer');
            const unique_id = force_name || generateId(ID_COMPLEXITY);
            PageManager.lock_return_button = true;

            saveForm(type, unique_id, location_str, form_save)
                .then((form_values) => {
                    SyncManager.add(unique_id, form_values);

                    if (form_save) {
                        instance.close();
                        showToast("Entry has been saved successfully.");

                        // On vient de la page d'édition de formulaire déjà créés
                        PageManager.pop();
                        // PageManager.reload(); la page se recharge toute seule au pop
                    }
                    else {
                        // On demande si on veut faire une nouvelle entrée
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="no-margin-top">Entry saved successfully</h5>
                            <p class="flow-text">
                                Do you want to begin a new entry ?
                            </p>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" id="__after_save_entries" class="modal-close btn-flat blue-text left">No</a>
                            <a href="#!" id="__after_save_new" class="modal-close btn-flat green-text right">Yes</a>
                            <div class="clearb"></div>
                        </div>
                        `;

                        document.getElementById('__after_save_entries').onclick = function() {
                            PageManager.change(AppPages.saved, false);
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
                        <h5 class="no-margin-top red-text">Error</h5>
                        <p class="flow-text">
                            Unable to save this entry.
                            Please try again.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <a href="#!" class="btn-flat right red-text modal-close">Close</a>
                        <div class="clearb"></div>
                    </div>
                    `;

                    PageManager.lock_return_button = false;
                    Logger.error("Unable to save form:", error, error.message, error.stack);
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
 * @param type Type du formulaire à sauvegarder
 * @param name ID du formulaire 
 * @param location Localisation choisie par l'utilisateur (peut être chaîne vide si non précisée)
 * @param form_save Ancienne sauvegarde (si mode édition)
 */
export function saveForm(type: string, name: string, location: string, form_save?: FormSave) : Promise<FormSave> {
    // On construit l'objet représentant une sauvegarde
    const form_values: FormSave = {
        fields: {},
        type,
        location,
        owner: (form_save ? form_save.owner : UserManager.username),
        metadata: {}
    };

    // On récupère les valeurs des éléments "classiques" (hors fichiers)
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

    return FormSaves.save(name, form_values, form_save);
}

/**
 * __DEPRECATED__ : cette fonctionnalité a été supprimée.
 * Valide les contraintes externes d'un champ
 * @param constraints 
 * @param e 
 * @deprecated
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
