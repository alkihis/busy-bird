import { test_jarvis, Jarvis } from "./test_aytom";
import * as FORMS from "./default_form"; // évite de charger la variable current_form, si jamais elle change
import { FormEntityType, FormEntity } from './default_form';
import Artyom from "./artyom";

function createInputWrapper() : HTMLElement {
    const e = document.createElement('div');
    e.classList.add("row", "input-field", "col", "s12");

    return e;
}

function createTip(wrapper: HTMLElement, ele: FormEntity) : HTMLElement {
    if (ele.tip_on_invalid) {
        const tip = document.createElement('div');
        tip.classList.add('invalid-tip');
        tip.innerText = ele.tip_on_invalid;
        tip.style.display = 'none';

        wrapper.appendChild(tip);
    }
    
    return wrapper;
}

function showHideTip(current: HTMLElement, show: boolean) : void {
    if (current.nextElementSibling && current.nextElementSibling.classList.contains("invalid-tip")) {
        // Si il y a un tip, on le fait appraître
        if (show)
            $(current.nextElementSibling).slideDown(200);
        else
            $(current.nextElementSibling).slideUp(200);
    }
}

/**
 * Classe le champ comme valide.
 * @param e Element input
 */
function setValid(e: HTMLElement) : void {
    e.classList.add('valid');
    e.classList.remove('invalid');
    e.dataset.valid = "1";
    showHideTip(e, false);
}

/**
 * Classe le champ comme invalide.
 * @param e Element input
 */
function setInvalid(e: HTMLElement) : void {
    if ((e as HTMLInputElement).value === "" && !(e as HTMLInputElement).required) {
        setValid(e);
        return;
    }

    e.classList.add('invalid');
    e.classList.remove('valid');
    e.dataset.valid = "0";
    showHideTip(e, true);
}

/**
 * Remplit les champs standards de l'input (id, name, required)...
 * @param htmle 
 * @param ele 
 * @param label 
 */
function fillStandardInputValues(htmle: HTMLInputElement | HTMLSelectElement, ele: FormEntity, label?: HTMLLabelElement) : HTMLElement {
    htmle.id = "id_" + ele.name;
    htmle.name = ele.name;
    htmle.required = ele.required;

    if (htmle.tagName === "INPUT" && ele.placeholder) {
        (htmle as HTMLInputElement).placeholder = ele.placeholder;
    }
    
    if (label) {
        label.htmlFor = htmle.id;
        label.innerText = ele.label;
    }

    htmle.dataset.valid = ele.required ? "0" : "1";
    htmle.value = ele.default_value as string;

    return htmle;
}

/**
 * Construit le formulaire automatiquement passé via "c_f"
 * @param placeh Élement HTML dans lequel écrire le formulaire
 * @param c_f Tableau d'éléments de formulaire
 * @param jarvis Instance d'Arytom à configurer
 */
function constructForm(placeh: HTMLElement, c_f: FormEntity[], jarvis?: Artyom) : void {
    for (const ele of c_f) {
        let element_to_add: HTMLElement = null;

        if (ele.type === FormEntityType.divider) {
            // C'est un titre
            let htmle = document.createElement('h4');
            htmle.innerText = ele.label;
            htmle.id = "id_" + ele.name;

            placeh.appendChild(htmle);
            continue;
        }

        if (ele.type === FormEntityType.integer || ele.type === FormEntityType.float) {
            const wrapper = createInputWrapper();
            const htmle = document.createElement('input');
            const label = document.createElement('label');
            
            fillStandardInputValues(htmle, ele, label);

            htmle.type = "number";
            
            if (ele.range) {
                if (typeof ele.range.min !== 'undefined') {
                    htmle.min = String(ele.range.min);
                }
                if (typeof ele.range.max !== 'undefined') {
                    htmle.max = String(ele.range.max);
                }
            }

            wrapper.appendChild(label);
            wrapper.appendChild(htmle);
            createTip(wrapper, ele);

            // Attachage de l'évènement de vérification
            htmle.addEventListener('change', function() {
                let valid = true;

                let value: number;
                try {
                    value = Number(this.value);
                } catch (e) {
                    valid = false;
                }

                if (typeof value === 'number' && value === value) {
                    if (typeof ele.range.min !== 'undefined' && value < ele.range.min) {
                        valid = false;
                    }
                    else if (typeof ele.range.max !== 'undefined' && value > ele.range.max) {
                        valid = false;
                    }

                    if (ele.type === FormEntityType.float) {
                        if (ele.float_precision) {
                            // Si on a demandé à avoir un nombre de flottant précis
                            const floating_point = this.value.split('.');
                            if (floating_point.length < 2 || floating_point[1].length !== ele.float_precision) {
                                // Si il n'y a pas de . ou si le nombre de chiffres après la virgule n'est pas le bon
                                valid = false;
                            }
                        }
                    }
                    else if (this.value.indexOf(".") !== -1) {
                        // Ce doit forcément être un entier,
                        // donc si on trouve un point
                        valid = false;
                    }
                }
                else {
                    valid = false;
                }

                if (valid) {
                    setValid(this);
                }
                else {
                    setInvalid(this);
                }
            });

            element_to_add = wrapper;
        }

        if (ele.type === FormEntityType.string) {
            const wrapper = createInputWrapper();
            const htmle = document.createElement('input');
            const label = document.createElement('label');
            
            fillStandardInputValues(htmle, ele, label);

            htmle.type = "text";

            wrapper.appendChild(label);
            wrapper.appendChild(htmle);
            createTip(wrapper, ele);

            // Attachage de l'évènement de vérification
            htmle.addEventListener('change', function() {
                let valid = true;

                let value: string = this.value;

                if (typeof value === 'string') {
                    if (typeof ele.range.min !== 'undefined' && value.length < ele.range.min) {
                        valid = false;
                    }
                    else if (typeof ele.range.max !== 'undefined' && value.length > ele.range.max) {
                        valid = false;
                    }

                    if (value.length === 0 && ele.suggested_not_blank) {
                        valid = false;
                    }
                }
                else {
                    valid = false;
                }

                if (valid) {
                    setValid(this);
                }
                else {
                    setInvalid(this);
                }
            });

            element_to_add = wrapper;
        }

        if (ele.type === FormEntityType.select) {
            const wrapper = createInputWrapper();
            const htmle = document.createElement('select');
            const label = document.createElement('label');
            
            fillStandardInputValues(htmle, ele, label);

            // Création des options
            htmle.multiple = ele.select_options.multiple;

            for (const opt of ele.select_options.options) {
                const htmlopt = document.createElement('option');
                htmlopt.selected = opt.selected;
                htmlopt.value = opt.value;
                htmlopt.innerText = opt.label;

                htmle.appendChild(htmlopt);
            }

            wrapper.appendChild(htmle);
            wrapper.appendChild(label);

            // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
            // Il faudra par contrer créer (plus tard les input vocaux)

            element_to_add = wrapper;
        }

        if (ele.type === FormEntityType.checkbox) {
            const wrapper = document.createElement('p');
            const label = document.createElement('label');
            const input = document.createElement('input');
            const span = document.createElement('span');

            fillStandardInputValues(input, ele, span as HTMLLabelElement);

            wrapper.classList.add('row', 'col', 's12');
            input.classList.add('filled-in');
            input.type = "checkbox";
            input.checked = ele.default_value as boolean;

            wrapper.appendChild(label);
            label.appendChild(input);
            label.appendChild(span);

            // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
            // Il faudra par contrer créer (plus tard les input vocaux)

            element_to_add = wrapper;
        }

        if (element_to_add)
            placeh.appendChild(element_to_add);
    }
}

/**
 * Fonction qui va faire attendre l'arrivée du formulaire,
 * puis charger la page
 * @param base 
 */
export function initFormPage(base: HTMLElement) {
    FORMS.onFormReady(function() { loadFormPage(base); });
}

/**
 * Charge la page de formulaire (point d'entrée)
 * @param base Element dans lequel écrire la page
 */
export function loadFormPage(base: HTMLElement) {
    // Construction du formulaire
    let c_f = FORMS.current_form;

    base.innerHTML = "";

    const base_block = document.createElement('div');
    base_block.classList.add('row', 'container');

    const placeh = document.createElement('form');
    placeh.classList.add('col', 's12');

    base_block.appendChild(placeh);

    // Appelle la fonction pour construire
    constructForm(placeh, c_f, Jarvis.Jarvis);

    base.appendChild(base_block);

    base.insertAdjacentHTML('beforeend', `<div class="fixed-action-btn">
        <a class="btn-floating btn-large red" id="operate_listen">
            <i class="large material-icons">mic</i>
        </a>
    </div>`);

    M.updateTextFields();
    $('select').formSelect();

    document.getElementById('operate_listen').onclick = function() {
        test_jarvis();
    };
}