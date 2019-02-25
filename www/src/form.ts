import { prompt } from "./vocal_recognition";
import { FormEntityType, FormEntity, Forms, Form, FormSave, FormLocations } from './form_schema';
import { getLocation, getModal, getModalInstance, calculateDistance, getModalPreloader, initModal, writeFile, generateId, removeFileByName, createImgSrc, readFromFile, urlToBlob, displayErrorMessage, getDirP, sleep, showToast } from "./helpers";
import { MAX_LIEUX_AFFICHES, ID_COMPLEXITY, MP3_BITRATE } from "./main";
import { PageManager, AppPageName } from "./PageManager";
import { Logger } from "./logger";
import { newModalRecord } from "./audio_listener";
import { UserManager } from "./user_manager";
import { SyncManager } from "./SyncManager";
import { createLocationInputSelector } from "./location";

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

function validConstraints(constraints: string, e: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) : boolean {
    const cons = constraints.split(';');
    const form = document.getElementById('__main_form__id') as HTMLFormElement;

    for (const c of cons) {
        const actual = c.split('=');
        // Supprime le possible ! à la fin de actual[0]
        const name = actual[0].replace(/!$/, '');
        const champ = form.elements[name] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

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

/**
 * Classe le champ comme valide.
 * @param e Element input
 */
function setValid(e: HTMLElement, force_element?: HTMLElement) : void {
    e.classList.add('valid');
    e.classList.remove('invalid');
    e.dataset.valid = "1";
    showHideTip(force_element || e, false);
}

/**
 * Classe le champ comme invalide.
 * @param e Element input
 */
function setInvalid(e: HTMLElement, force_element?: HTMLElement) : void {
    if ((e as HTMLInputElement).value === "" && !(e as HTMLInputElement).required) {
        setValid(e);
        return;
    }

    e.classList.add('invalid');
    e.classList.remove('valid');
    e.dataset.valid = "0";
    showHideTip(force_element || e, true);
}

/**
 * Remplit les champs standards de l'input (id, name, required)...
 * @param htmle Input / Select dans lequel écrire
 * @param ele Champ de formulaire lié à l'input
 * @param label Label lié à l'input (optionnel)
 */
function fillStandardInputValues(htmle: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, ele: FormEntity, label?: HTMLLabelElement) : HTMLElement {
    htmle.id = "id_" + ele.name;
    htmle.name = ele.name;
    htmle.required = ele.required;

    if (htmle.tagName !== "SELECT" && ele.placeholder) {
        (htmle as HTMLInputElement).placeholder = ele.placeholder;
    }

    if (label) {
        label.htmlFor = htmle.id;
        label.innerText = ele.label;
    }

    if (htmle.tagName === "INPUT" && htmle.type === "checkbox") {
        htmle.dataset.valid = "1";
        (htmle as HTMLInputElement).checked = ele.default_value as boolean;
    }
    else {
        htmle.dataset.valid = ele.required ? "0" : "1";
        htmle.value = ele.default_value as string || "";
    }

    return htmle;
}

/**
 * Polyfill for modulo (seems to work unproperly on flaoting point)
 * @param num1
 * @param num2
 */
function isModuloZero(num1: number, num2: number) : boolean {
    let reste = num1;

    while (reste > 0.0001) {
        reste -= num2;
    }

    // Arrondit le nombre pour éviter les problèmes de précision
    return Number(reste.toFixed(5)) === 0;
}

/**
 * Construit le formulaire automatiquement passé via "current_form"
 * @param placeh Élement HTML dans lequel écrire le formulaire
 * @param current_form Formulaire courant
 * @param filled_form Formulaire déjà rempli (utilisé pour l'édition)
 */
export function constructForm(placeh: HTMLElement, current_form: Form, filled_form?: FormSave) : void {

    // Si le formulaire accepte la localisation
    if (!current_form.no_location) {
        // Crée le champ de lieu
        const loc_wrapper = document.createElement('div');
        loc_wrapper.classList.add('input-field', 'row', 'col', 's12');
        const location = document.createElement('input');
        location.type = "text";
        location.readOnly = true;
        location.name = "__location__";
        location.id = "__location__id";
        location.addEventListener('click', function(this: HTMLInputElement) {
            this.blur(); // Retire le focus pour éviter de pouvoir écrire dedans
            callLocationSelector(current_form); // Appelle le modal pour changer de lieu
        });

        if (filled_form) {
            location.value = location.dataset.reallocation = filled_form.location || "";
            // Recherche la vraie localisation (textuelle) dans Form.location
            const label_location = (filled_form.location in current_form.locations ? 
                current_form.locations[filled_form.location] : 
                null
            );

            if (label_location) {
                location.value = `${filled_form.location} - ${label_location.label}`;
            }
            else if (filled_form.location !== null) {
                showToast("Attention: La localisation de cette entrée n'existe plus dans le schéma du formulaire.");
            }
        }

        loc_wrapper.appendChild(location);
        const loc_title = document.createElement('h4');
        loc_title.innerText = "Lieu";
        placeh.appendChild(loc_title);
        placeh.appendChild(loc_wrapper);
        // Fin champ de lieu, itération sur champs
    }

    for (const ele of current_form.fields) {
        let element_to_add: HTMLElement = null;

        if (ele.type === FormEntityType.divider) {
            // C'est un titre
            // On divide
            const clearer = document.createElement('div');
            clearer.classList.add('clearb');
            placeh.appendChild(clearer);

            const htmle = document.createElement('h4');
            htmle.innerText = ele.label;
            htmle.id = "id_" + ele.name;

            placeh.appendChild(htmle);
            continue;
        }

        else if (ele.type === FormEntityType.integer || ele.type === FormEntityType.float) {
            const real_wrapper = document.createElement('div');

            const wrapper = createInputWrapper();
            if (ele.allow_voice_control) {
                wrapper.classList.add('s11');
                wrapper.classList.remove('s12');
            }
            
            const htmle = document.createElement('input');
            htmle.autocomplete = "off";
            const label = document.createElement('label');

            fillStandardInputValues(htmle, ele, label);

            htmle.type = "number";
            htmle.classList.add('input-form-element');

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

            if (filled_form && ele.name in filled_form.fields) {
                htmle.value = filled_form.fields[ele.name] as string;
            }

            // Calcul de nombre de décimales requises
            // si le nombre demandé est un float
            let NB_DECIMALES: number = 0;
            if (ele.type === FormEntityType.float && ele.float_precision) {
                // Récupération de la partie décimale sous forme de string
                const dec_part = ele.float_precision.toString().split('.');
                // Calcul du nombre de décimales
                if (dec_part.length > 1) {
                    NB_DECIMALES = dec_part[1].length;
                }
                else {
                    throw new Error(`La précision pour la partie décimale spécifiée pour le champ "${ele.name}" est invalide: Elle ne comporte pas de décimales.`);
                }
            }

            // Définition des contraintes
            const contraintes = [];
            if (typeof ele.range !== 'undefined') {
                if (typeof ele.range.min !== 'undefined') {
                    contraintes.push(["min", ele.range.min]);
                }
                if (typeof ele.range.max !== 'undefined') {
                    contraintes.push(["max", ele.range.max]);
                }
            }
            if (ele.type === FormEntityType.float && ele.float_precision) {
                contraintes.push(["precision", ele.float_precision]);
            }
            contraintes.push(['type', ele.type === FormEntityType.float ? 'float' : 'int']);
            htmle.dataset.constraints = contraintes.map(e => e.join('=')).join(';');

            // Attachage de l'évènement de vérification
            const num_verif = function() {
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

                    // if différent, il est juste en else if pour éviter de faire les
                    // calculs si le valid est déjà à false
                    else if (ele.type === FormEntityType.float) {
                        if (ele.float_precision) {
                            // Si on a demandé à avoir un nombre de flottant précis
                            const floating_point = this.value.split('.');

                            if (floating_point.length > 1) {
                                // Récupération de la partie décimale avec le bon nombre de décimales
                                // (round obligatoire, à cause de la gestion des float imprécise)
                                const partie_decimale = Number((value % 1).toFixed(NB_DECIMALES));

                                // Si le nombre de chiffres après la virgule n'est pas le bon
                                // ou si la valeur n'est pas de l'ordre souhaité (précision 0.05 avec valeur 10.03 p.e.)
                                if (floating_point[1].length !== NB_DECIMALES || !isModuloZero(partie_decimale, ele.float_precision)) {
                                    valid = false;
                                }
                            }
                            else {
                                //Il n'y a pas de . dans le nombre
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
            };

            htmle.addEventListener('change', num_verif);

            real_wrapper.appendChild(wrapper);

            if (ele.allow_voice_control) {
                // On ajoute le bouton micro
                const mic_btn = document.createElement('div');
                mic_btn.classList.add('col', 's1', 'mic-wrapper');
                mic_btn.style.paddingRight = "0";
                mic_btn.innerHTML = `
                    <i class="material-icons red-text">mic</i>
                `;

                mic_btn.addEventListener('click', function() {
                    prompt().then(function(value) {
                        const val = value as string;

                        value = val.replace(/ /g, '').replace(/,/g, '.').replace(/-/g, '.');

                        if (!isNaN(Number(value))) {
                            htmle.value = value;
                            num_verif.call(htmle);
                            M.updateTextFields();
                        }
                        else {
                            // Affichage forcé en toast Materialize:
                            // La reconnaissance vocale ouvre un toast natif qui masquerait celui-ci
                            M.toast({html: "Nombre incorrect reconnu."});
                        }
                    });
                });

                real_wrapper.appendChild(mic_btn);
            }
            element_to_add = real_wrapper;
        }

        else if (ele.type === FormEntityType.string || ele.type === FormEntityType.bigstring) {
            const real_wrapper = document.createElement('div');
            const wrapper = createInputWrapper();

            let htmle: HTMLInputElement | HTMLTextAreaElement;
            if (ele.type === FormEntityType.string) {
                htmle = document.createElement('input');
                htmle.type = "text";
                htmle.autocomplete = "off";
            }
            else {
                htmle = document.createElement('textarea');
                htmle.classList.add('materialize-textarea');
            }

            if (ele.allow_voice_control) {
                wrapper.classList.add('s11');
                wrapper.classList.remove('s12');
            }

            htmle.classList.add('input-form-element');

            const label = document.createElement('label');

            fillStandardInputValues(htmle, ele, label);

            if (filled_form && ele.name in filled_form.fields) {
                htmle.value = filled_form.fields[ele.name] as string;
            }

            wrapper.appendChild(label);
            wrapper.appendChild(htmle);
            createTip(wrapper, ele);

            // Définition des contraintes
            const contraintes = [];
            if (typeof ele.range !== 'undefined') {
                if (typeof ele.range.min !== 'undefined') {
                    contraintes.push(["min", ele.range.min]);
                }
                if (typeof ele.range.max !== 'undefined') {
                    contraintes.push(["max", ele.range.max]);
                }
            }
            htmle.dataset.constraints = contraintes.map(e => e.join('=')).join(';');

            // Attachage de l'évènement de vérification
            const str_verif = function(this: HTMLInputElement | HTMLTextAreaElement) {
                let valid = true;

                let value: string = this.value;

                if (typeof value === 'string') {
                    if (typeof ele.range !== 'undefined') {
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
            };

            htmle.addEventListener('change', str_verif);
            real_wrapper.appendChild(wrapper);

            if (ele.allow_voice_control) {
                // On ajoute le bouton micro
                const mic_btn = document.createElement('div');
                mic_btn.classList.add('col', 's1', 'mic-wrapper');
                mic_btn.style.paddingRight = "0";

                mic_btn.innerHTML = `
                    <i class="material-icons red-text">mic</i>
                `;

                let timer: number;
                const gestion_click = function(erase = true) {
                    prompt().then(function(value) {
                        let val = value as string;

                        if (ele.remove_whitespaces) {
                            val = val.replace(/ /g, '').replace(/à/iug, 'a');
                        }

                        if (erase) {
                            htmle.value = val;
                        }
                        else {
                            htmle.value += val;
                        }

                        str_verif.call(htmle);
                        M.updateTextFields();
                        try { M.textareaAutoResize(htmle); } catch (e) {}
                    });
                    timer = 0;
                }

                mic_btn.addEventListener('click', function() {
                    if (timer) {
                        clearTimeout(timer);
                        // On a double cliqué
                        gestion_click(false);
                        return;
                    }
                    timer = setTimeout(gestion_click, 400);        
                });

                real_wrapper.appendChild(mic_btn);
            }
            
            element_to_add = real_wrapper;
        }

        else if (ele.type === FormEntityType.select) {
            const wrapper = createInputWrapper();
            const htmle = document.createElement('select');
            const label = document.createElement('label');
            htmle.classList.add('input-form-element');

            fillStandardInputValues(htmle, ele, label);

            // Création des options
            htmle.multiple = ele.select_options.multiple;

            if (!htmle.multiple) {
                htmle.dataset.valid = "1";
            }

            for (const opt of ele.select_options.options) {
                const htmlopt = document.createElement('option');
                htmlopt.selected = opt.selected;
                htmlopt.value = opt.value;
                htmlopt.innerText = opt.label;

                htmle.appendChild(htmlopt);
            }

            if (htmle.multiple && ele.required) {
                // On doit mettre un évènement pour vérifier si le select est vide
                // Attachage de l'évènement de vérification
                const select_verif = function(this: HTMLInputElement | HTMLTextAreaElement) {
                    let value: string = this.value;

                    if (value) {
                        setValid(this);
                    }
                    else {
                        setInvalid(this);
                    }
                };

                htmle.addEventListener('change', select_verif);
            }

            // const mic_btn = document.createElement('div');
            // if (!htmle.multiple) {
            //     mic_btn.addEventListener('click', function() {
            //         prompt("Valeur ?", Array.from(htmle.options).map(e => e.label)).then(function(value) {
            //             htmle.value = value;
            //         });
            //     });
            // }

            if (filled_form && ele.name in filled_form.fields) {
                if (ele.select_options.multiple) {
                    $(htmle).val(filled_form.fields[ele.name] as string[]);
                }
                else {
                    htmle.value = filled_form.fields[ele.name] as string;
                }
            }

            wrapper.appendChild(htmle);
            wrapper.appendChild(label);

            htmle.dataset.e_constraints = ele.external_constraints || "";
            htmle.dataset.invalid_tip = ele.tip_on_invalid || "";

            // Évènement pour le select: contraintes externes ou si select multiple.required
            if (htmle.multiple || ele.external_constraints) {
                // Création du tip
                createTip(wrapper, ele);
                htmle.addEventListener('change', function(this: HTMLSelectElement, e: Event) {
                    let valid = true;
                    if (this.multiple && this.required && ($(this).val() as string[]).length === 0) {
                        valid = false;
                    }
                    else if (this.value && ele.external_constraints) {
                        valid = validConstraints(ele.external_constraints, this);
                    }

                    if (valid) {
                        setValid(this, label);
                    }
                    else {
                        setInvalid(this, label);
                    }
                });
            }

            element_to_add = wrapper;
        }

        else if (ele.type === FormEntityType.checkbox) {
            const wrapper = document.createElement('p');
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = "checkbox";
            const span = document.createElement('span');

            fillStandardInputValues(input, ele, span as HTMLLabelElement);

            wrapper.classList.add('row', 'col', 's12', 'input-checkbox', 'flex-center-aligner');
            input.classList.add('filled-in', 'input-form-element');

            if (filled_form && ele.name in filled_form.fields) {
                input.checked = filled_form.fields[ele.name] as boolean;
            }

            wrapper.appendChild(label);
            label.appendChild(input);
            label.appendChild(span);

            // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
            // Il faudra par contrer créer (plus tard les input vocaux)

            element_to_add = wrapper;
        }

        else if (ele.type === FormEntityType.datetime) {
            const wrapper = createInputWrapper();
            const input = document.createElement('input');
            const label = document.createElement('label');

            // Pour que le label ne recouvre pas le texte du champ
            label.classList.add('active');
            input.type = "datetime-local";
            input.classList.add('input-form-element');

            fillStandardInputValues(input, ele, label);

            // les datetime sont TOUJOURS valides, si ils sont pleins
            input.dataset.valid = "1";

            if (filled_form && ele.name in filled_form.fields) {
                input.value = filled_form.fields[ele.name] as string;
            }
            else {
                // Problème: la date à entrer dans l'input est la date UTC
                // On "corrige" ça par manipulation de la date (on rajoute l'offset)
                let date_plus_timezone = new Date();
                date_plus_timezone.setTime(date_plus_timezone.getTime() + (-date_plus_timezone.getTimezoneOffset()*60*1000));

                const date_str = date_plus_timezone.toISOString();
                input.value = date_str.substring(0, date_str.length-8);
            }

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            element_to_add = wrapper;
        }

        else if (ele.type === FormEntityType.file) {
            if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                // L'input file est déjà présent dans le formulaire
                // on affiche une miniature

                const img_miniature = document.createElement('div');
                img_miniature.classList.add('image-form-wrapper');
                const img_balise = document.createElement('img');
                img_balise.classList.add('img-form-element');

                createImgSrc(filled_form.fields[ele.name] as string, img_balise);

                img_miniature.appendChild(img_balise);
                placeh.appendChild(img_miniature);
            }

            // Input de type file
            const wrapper = document.createElement('div');
            wrapper.classList.add('file-field', 'input-field', 'row', 'col', 's12');
            const divbtn = document.createElement('div');
            divbtn.classList.add('btn');

            const span = document.createElement('span');
            span.innerText = "Fichier";
            const input = document.createElement('input');
            input.type = "file";
            input.id = "id_" + ele.name;
            input.name = ele.name;
            input.required = ele.required;
            input.accept = ele.file_type || "";
            input.classList.add('input-image-element');

            divbtn.appendChild(span);
            divbtn.appendChild(input);

            wrapper.appendChild(divbtn);

            const fwrapper = document.createElement('div');
            fwrapper.classList.add('file-path-wrapper');
            const f_input = document.createElement('input');
            f_input.type = "text"; f_input.classList.add('file-path', 'validate');
            f_input.value = ele.label;

            // Construit le label à retenir pour pouvoir afficher son titre dans le modal de confirmation
            f_input.dataset.label = ele.label;
            f_input.dataset.for = input.id;

            fwrapper.appendChild(f_input);
            wrapper.appendChild(fwrapper);

            placeh.appendChild(wrapper);

            // Sépare les champ input file
            placeh.insertAdjacentHTML('beforeend', "<div class='clearb'></div><div class='divider divider-margin'></div>");
        }

        else if (ele.type === FormEntityType.audio) {
            // Création d'un bouton pour enregistrer du son
            const wrapper = document.createElement('div');
            wrapper.classList.add('input-field', 'row', 'col', 's12', 'no-margin-top');

            const label = document.createElement('p');
            label.classList.add('no-margin-top', 'form-audio-label');
            label.innerText = ele.label;
            wrapper.appendChild(label);

            const button = document.createElement('button');
            button.classList.add('btn', 'blue', 'col', 's12', 'btn-perso');

            button.innerText = "Enregistrement audio"
            button.type = "button";

            const real_input = document.createElement('input');
            real_input.type = "hidden";
            real_input.classList.add('input-audio-element');
            // Construit le label à retenir pour pouvoir afficher son titre dans le modal de confirmation
            real_input.dataset.label = ele.label;

            // Création d'un label vide pour l'input
            const hidden_label = document.createElement('label');

            fillStandardInputValues(real_input, ele, hidden_label);
            hidden_label.classList.add('hide');
            wrapper.appendChild(hidden_label);

            ////// Définition si un fichier son existe déjà
            if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                readFromFile(
                    filled_form.fields[ele.name] as string,
                    function(base64) {
                        button.classList.remove('blue');
                        button.classList.add('green');
                        real_input.value = base64;
                        const duration = ((base64.length * 0.7) / (MP3_BITRATE * 1000)) * 8;
                        button.innerText = "Enregistrement (" + duration.toFixed(0) + "s" + ")";
                    },
                    function(fail) {
                        Logger.warn("Impossible de charger le fichier", fail);
                    },
                    true
                );
            }
            ////// Fin

            button.addEventListener('click', function() {
                // Crée un modal qui sert à enregistrer de l'audio
                newModalRecord(button, real_input, ele);
            });

            wrapper.appendChild(button);
            wrapper.appendChild(real_input);
            element_to_add = wrapper;
        }

        else if (ele.type === FormEntityType.slider) {
            const wrapper = document.createElement('div');
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = "checkbox";
            const span = document.createElement('span');

            fillStandardInputValues(input, ele);

            wrapper.classList.add('row', 'col', 's12', 'input-slider', 'switch', 'flex-center-aligner');
            input.classList.add('input-form-element', 'input-slider-element');
            span.classList.add('lever');

            wrapper.appendChild(label);
            // Texte si not checked
            label.insertAdjacentText('afterbegin', ele.slider_options[0].label);

            label.appendChild(input);
            label.appendChild(span);

            // Texte si checked
            label.insertAdjacentText('beforeend', ele.slider_options[1].label);

            // Insertion des deux options dans l'input en data-
            input.dataset.ifunchecked = ele.slider_options[0].name;
            input.dataset.ifchecked = ele.slider_options[1].name;

            if (filled_form && ele.name in filled_form.fields) {
                input.checked = ele.slider_options[1].name === filled_form.fields[ele.name];
            }

            // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
            // Il faudra par contrer créer (plus tard les input vocaux)

            element_to_add = wrapper;
        }

        if (element_to_add)
            placeh.appendChild(element_to_add);
    }
}

/**
 * Lance la vérification des champs pour ensuite sauvegarder le formulaire
 * @param type Type de formulaire (ex: cincle_plongeur)
 * @param force_name? Force un identifiant pour le form à enregistrer
 * @param form_save? Précédente sauvegarde du formulaire
 */
async function beginFormSave(type: string, current_form: Form, force_name?: string, form_save?: FormSave) : Promise<void> {
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
    type VerifiedElement = [string, string, HTMLInputElement | HTMLSelectElement];

    // Recherche des éléments à vérifier
    const elements_failed: VerifiedElement[] = [];
    const elements_warn: VerifiedElement[] = [];

    const location_element = document.getElementById('__location__id') as HTMLInputElement;

    let location_str = null;
    if (location_element) {
        location_str = location_element.dataset.reallocation;
    }

    // Vérifie le lieu si le lieu est défini 
    // (si il n'est pas requis, affiche un warning, sinon une erreur)
    if (!current_form.no_location && !location_str) {
        if (current_form.skip_location)
            elements_warn.push(["Lieu", "Aucun lieu n'a été précisé.", location_element]);
        else
            elements_failed.push(["Lieu", "Aucun lieu n'a été précisé.", location_element]);
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
                elements_failed.push([name, str, element]);
            }
            else {
                elements_warn.push([name, str, element]);
            }
        }
        else if (element.required && !element.value) {
            if (element.tagName !== "SELECT" || (element.multiple && ($(element).val() as string[]).length === 0)) {
                elements_failed.push([name, "Champ requis", element]);
            }
        }
        else {
            let fail = false;
            let str = "";

            // Si le champ est requis et a une valeur, on recherche ses contraintes
            if (Object.keys(contraintes).length > 0) {
                if (element.type === "text" || element.tagName === "textarea") {
                    if (typeof contraintes.min !== 'undefined' && element.value.length < contraintes.min) {
                        fail = true;
                        str += "La taille du texte doit dépasser " + contraintes.min + " caractères. ";
                    }
                    if (typeof contraintes.max !== 'undefined' && element.value.length > contraintes.max) {
                        fail = true;
                        str += "La taille du texte doit être inférieure à " + contraintes.max + " caractères. ";
                    }
                }
                else if (element.type === "number") {
                    if (typeof contraintes.min !== 'undefined' && Number(element.value) < contraintes.min) {
                        fail = true;
                        str += "Le nombre doit dépasser " + contraintes.min + ". ";
                    }
                    if (typeof contraintes.max !== 'undefined' && Number(element.value) > contraintes.max) {
                        fail = true;
                        str += "Le nombre doit être inférieur à " + contraintes.max + ". ";
                    }

                    // Vérification de la précision
                    if (contraintes.precision) {
                        // Calcul de nombre de décimales requises
                        // si le nombre demandé est un float
                        let NB_DECIMALES: number = 0;
                        const dec_part = contraintes.precision.toString().split('.');
                        NB_DECIMALES = dec_part[1].length;

                        // Si on a demandé à avoir un nombre de flottant précis
                        const floating_point = element.value.split('.');

                        if (floating_point.length > 1) {
                            // Récupération de la partie décimale avec le bon nombre de décimales
                            // (round obligatoire, à cause de la gestion des float imprécise)
                            const partie_decimale = Number((Number(element.value) % 1).toFixed(NB_DECIMALES));

                            // Si le nombre de chiffres après la virgule n'est pas le bon
                            // ou si la valeur n'est pas de l'ordre souhaité (précision 0.05 avec valeur 10.03 p.e.)
                            if (floating_point[1].length !== NB_DECIMALES || !isModuloZero(partie_decimale, Number(contraintes.precision))) {
                                fail = true;
                                str += "Le nombre doit avoir une précision de " + contraintes.precision + ". ";
                            }
                        }
                        else {
                            //Il n'y a pas de . dans le nombre
                            fail = true;
                            str += "Le nombre doit être à virgule. ";
                        }
                    }
                }
            }

            if (fail) {
                if (element.required) {
                    elements_failed.push([name, str, element]);
                }
                else {
                    elements_warn.push([name, str, element]);
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

            elements_failed.push([name, "Fichier requis", filei]);
        }
    }

    // Éléments AUDIO (avec le modal permettant d'enregistrer du son)
    for (const e of document.querySelectorAll('.input-audio-element[required]')) {
        const hiddeni = e as HTMLInputElement;

        if (!hiddeni.value) {
            elements_failed.push([hiddeni.dataset.label, "Enregistrement audio requis", hiddeni]);
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
            list.appendChild(li);
        }
    
        for (const warning of elements_warn) {
            const li = document.createElement('li');
            li.classList.add("collection-item");
    
            li.innerHTML = `
                <span class="bold">${warning[0]}</span>: 
                <span>${warning[1]}</span>
            `;
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
                        showToast("Écriture du formulaire et de ses données réussie.");

                        // On vient de la page d'édition de formulaire déjà créés
                        PageManager.popPage();
                        // PageManager.reload(); la page se recharge toute seule au pop
                    }
                    else {
                        // On demande si on veut faire une nouvelle entrée
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="no-margin-top">Saisir une nouvelle entrée ?</h5>
                            <p class="flow-text">
                                La précédente entrée a bien été enregistrée.
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
 *  @param type
 *  @param nom ID du formulaire
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
                form_values.fields[i.name] = i.checked;
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
 */
function writeDataThenForm(name: string, form_values: FormSave, older_save?: FormSave) : Promise<FormSave> {
    function saveBlobToFile(resolve, reject, filename: string, input_name: string, blob: Blob) : void {
        writeFile('form_data/' + name, filename, blob, function() {
            // Enregistre le nom du fichier sauvegardé dans le formulaire,
            // dans la valeur du champ field
            form_values.fields[input_name] = 'form_data/' + name + '/' + filename;
            form_values.metadata[input_name] = filename;

            if (older_save && input_name in older_save.fields && older_save.fields[input_name] !== null) {
                // Si une image était déjà présente
                if (older_save.fields[input_name] !== form_values.fields[input_name]) {
                    // Si le fichier enregistré est différent du fichier actuel
                    // Suppression de l'ancienne image
                    const parts = (older_save.fields[input_name] as string).split('/');
                    const file_name = parts.pop();
                    const dir_name = parts.join('/');
                    removeFileByName(dir_name, file_name);
                }
            }

            // Résout la promise
            resolve();
        }, function(error) {
            // Erreur d'écriture du fichier => on rejette
            showToast("Un fichier n'a pas pu être sauvegardée. Vérifiez votre espace de stockage.");
            reject(error);
        });
    }

    return getDirP('form_data')
        .then(() => {
            // Crée le dossier form_data si besoin

            // Récupère les images du formulaire
            const images_from_form = document.getElementsByClassName('input-image-element');

            // Sauvegarde les images !
            const promises = [];

            for (const img of images_from_form) {
                promises.push(
                    new Promise(function(resolve, reject) {
                        const file = (img as HTMLInputElement).files[0];
                        const input_name = (img as HTMLInputElement).name;

                        if (file) {
                            const filename = file.name;

                            const r = new FileReader();

                            r.onload = function() {
                                saveBlobToFile(resolve, reject, filename, input_name, new Blob([this.result]));
                            }

                            r.onerror = function(error) {
                                // Erreur de lecture du fichier => on rejette
                                reject(error);
                            }

                            r.readAsArrayBuffer(file);
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

                            resolve();
                        }
                    })
                );
            }

            // Récupère les données audio du formulaire
            const audio_from_form = document.getElementsByClassName('input-audio-element');

            for (const audio of audio_from_form) {
                promises.push(
                    new Promise(function(resolve, reject) {
                        const file = (audio as HTMLInputElement).value;
                        const input_name = (audio as HTMLInputElement).name;

                        if (file) {
                            const filename = generateId(ID_COMPLEXITY) + '.mp3';

                            urlToBlob(file).then(function(blob) {
                                saveBlobToFile(resolve, reject, filename, input_name, blob);
                            });
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

                            resolve();
                        }
                    })
                );
            }

            return Promise.all(promises)
                .then(function() {
                    // On supprime les metadonnées vides du form
                    for (const n in form_values.metadata) {
                        if (form_values.metadata[n] === null) {
                            delete form_values.metadata[n];
                        }
                    }

                    return new Promise((resolve, reject) => {
                        // On écrit enfin le formulaire !
                        writeFile('forms', name + '.json', new Blob([JSON.stringify(form_values)]), function() {
                            console.log(form_values);
                            resolve(form_values);
                        }, reject);
                    }) as Promise<FormSave>;
                })
        });
}

/**
 * Fonction qui va faire attendre l'arrivée du formulaire,
 * puis charger la page
 * @param base
 */
export function initFormPage(base: HTMLElement, edition_mode?: {save: FormSave, name: string, form: Form}) {
    if (edition_mode) {
        loadFormPage(base, edition_mode.form, edition_mode);
    }
    else {
        Forms.onReady(function(available, current) {
            if (Forms.current_key === null) {
                // Aucun formulaire n'est chargé !
                base.innerHTML = displayErrorMessage(
                    "Aucun formulaire n'est chargé.", 
                    "Sélectionnez le formulaire à utiliser dans les paramètres."
                );
                PageManager.should_wait = false;
            }
            else {
                loadFormPage(base, current, edition_mode);
            }
        });
    }
}

/**
 * Charge la page de formulaire (point d'entrée)
 * @param base Element dans lequel écrire la page
 */
export function loadFormPage(base: HTMLElement, current_form: Form, edition_mode?: {save: FormSave, name: string}) {
    base.innerHTML = "";

    if (!edition_mode && !UserManager.logged) {
        // Si on est en mode création et qu'on est pas connecté
        base.innerHTML = base.innerHTML = displayErrorMessage(
            "Vous devez vous connecter pour saisir une nouvelle entrée.", 
            "Connectez-vous dans les paramètres."
        );
        PageManager.should_wait = false;
        return;
    }

    const base_block = document.createElement('div');
    base_block.classList.add('row', 'container');

    const placeh = document.createElement('form');
    placeh.classList.add('col', 's12');
    placeh.id = "__main_form__id";

    base_block.appendChild(placeh);

    // Appelle la fonction pour construire
    if (edition_mode) {
        constructForm(placeh, current_form, edition_mode.save);
    }
    else {
        constructForm(placeh, current_form);
    }

    base.appendChild(base_block);

    M.updateTextFields();
    $('select').formSelect();

    // Lance le sélecteur de localisation uniquement si on est pas en mode édition et si le formulaire autorise les lieux
    if (!edition_mode) {
        if (!(current_form.no_location || current_form.skip_location)) {
            callLocationSelector(current_form);
        }
    }

    // Autoredimensionnement des textaera si valeur par défaut
    const $textarea = $('textarea');
    if ($textarea.length > 0) {
        M.textareaAutoResize($textarea);
    }

    // Création du bouton de sauvegarde
    const btn = document.createElement('div');
    btn.classList.add('btn-flat', 'right', 'red-text');
    btn.innerText = "Enregistrer";

    const current_form_key = Forms.current_key;
    btn.addEventListener('click', function() {
        if (edition_mode) {
            beginFormSave(edition_mode.save.type, current_form, edition_mode.name, edition_mode.save);
        }
        else {
            try {
                beginFormSave(current_form_key, current_form);
            } catch (e) {
                Logger.error(JSON.stringify(e));
            }
        }
    });

    base_block.appendChild(btn);
}

/**
 * Annule la sélection de lieu
 * @param required true si le lieu est obligatoire. (une suggestion vers page précédente sera présentée si annulation)
 */
function cancelGeoLocModal(required = true) : void {
    // On veut fermer; Deux possibilités.
    // Si le champ lieu est déjà défini et rempli, on ferme juste le modal

    if (!required || (document.getElementById("__location__id") as HTMLInputElement).value.trim() !== "") {
        // On ferme juste le modal
    }
    else {
        // Sinon, on ramène à la page précédente
        PageManager.goBack();
    }

    getModalInstance().close();
    getModal().classList.remove('modal-fixed-footer');
}

/**
 * Charge le sélecteur de localisation depuis un schéma de formulaire
 * @param current_form Schéma de formulaire chargé
 */
function callLocationSelector(current_form: Form) : void {
    // Obtient l'élément HTML du modal
    const modal = getModal();
    const instance = initModal({
        dismissible: false, preventScrolling: true, inDuration: 100, outDuration: 100
    });
    // Ouvre le modal et insère un chargeur
    instance.open();
    modal.innerHTML = getModalPreloader(
        "Recherche de votre position...\nCeci peut prendre jusqu'à 30 secondes.",
        `<div class="modal-footer">
            <a href="#!" id="dontloc-footer-geoloc" class="btn-flat blue-text left">Saisie manuelle</a>
            <a href="#!" id="close-footer-geoloc" class="btn-flat red-text">Annuler</a>
            <div class="clearb"></div>
        </div>`
    );

    let is_loc_canceled = false;
    document.getElementById("close-footer-geoloc").onclick = function() {
        is_loc_canceled = true;
        cancelGeoLocModal(!current_form.skip_location);
    };
    document.getElementById('dontloc-footer-geoloc').onclick = function() {
        is_loc_canceled = true;
        locationSelector(modal, current_form.locations, false, !current_form.skip_location);
    };

    // Cherche la localisation et remplit le modal
    getLocation(function(coords: Position) {
        if (!is_loc_canceled)
            locationSelector(modal, current_form.locations, coords, !current_form.skip_location);
    }, function() {
        if (!is_loc_canceled)
            locationSelector(modal, current_form.locations, undefined, !current_form.skip_location);
    });
}

/**
 * Formate une distance en mètres en texte lisible par un humain.
 * @param distance Distance en mètres
 */
function textDistance(distance: number) : string {
    const unit = (distance >= 1000 ? "km" : "m");
    const str_distance = (distance >= 1000 ? (distance / 1000).toFixed(1) : distance.toString());

    return `${str_distance} ${unit}`;
}

/**
 * Charge le sélecteur de lieu dans le modal
 * @param modal Élément modal
 * @param locations Localisations disponibles pour ce formulaire
 * @param current_location Position actuelle. Si échec de localisation, undefined. Si explicitement non donnée, false.
 * @param required true si le lieu est obligatoire. (une suggestion vers page précédente sera présentée si annulation)
 */
function locationSelector(modal: HTMLElement, locations: FormLocations, current_location?: Position | false, required = true) {
    // Met le modal en modal avec footer fixé
    modal.classList.add('modal-fixed-footer');

    // Crée le contenu du modal et son footer
    const content = document.createElement('div');
    content.classList.add('modal-content');
    const footer = document.createElement('div');
    footer.classList.add('modal-footer');

    // Création de l'input qui va contenir le lieu
    const input = document.createElement('input');

    // Sélection manuelle
    const title = document.createElement('h5');
    title.innerText = "Sélection manuelle";
    content.appendChild(title);

    // Vide le modal actuel et le remplace par le contenu et footer créés
    modal.innerHTML = "";
    modal.appendChild(content);

    const labels_to_name = createLocationInputSelector(content, input, locations);

    // Construction de la liste de lieux si la location est trouvée
    if (current_location) {
        // Création de la fonction qui va gérer le cas où l'on appuie sur un lieu
        function clickOnLocation(this: HTMLElement) {
            input.value = this.dataset.name + " - " + this.dataset.label;
            M.updateTextFields();
        }

        // Calcul de la distance entre chaque lieu et le lieu actuel
        let lieux_dispo: {name: string; label: string; distance: number}[] = [];

        for (const lieu in locations) {
            lieux_dispo.push({
                name: lieu,
                label: locations[lieu].label,
                distance: calculateDistance(current_location.coords, locations[lieu])
            });
        }

        lieux_dispo = lieux_dispo.sort((a, b) => a.distance - b.distance);

        // Titre
        const title = document.createElement('h5');
        title.innerText = "Lieux proches";
        content.appendChild(title);

        // Construction de la liste des lieux proches
        const collection = document.createElement('div');
        collection.classList.add('collection');

        for (let i = 0; i < lieux_dispo.length && i < MAX_LIEUX_AFFICHES; i++) {
            const elem = document.createElement('a');
            elem.href = "#!";
            elem.classList.add('collection-item');
            elem.innerHTML = `
                ${lieux_dispo[i].name} - ${lieux_dispo[i].label}
                <span class="right grey-text lighten-1">${textDistance(lieux_dispo[i].distance)}</span>
            `;
            elem.dataset.name = lieux_dispo[i].name;
            elem.dataset.label = lieux_dispo[i].label;
            elem.addEventListener('click', clickOnLocation);

            collection.appendChild(elem);
        }

        content.appendChild(collection);
    }
    else if (current_location === false) {
        // On affiche aucun texte dans ce cas.
        // (écran de sélection manuelle expréssément demandé)
    }
    else {
        // Affichage d'une erreur: géolocalisation impossible
        const error = document.createElement('h6');
        error.classList.add('red-text');
        error.innerText = "Impossible de vous géolocaliser.";
        const subtext = document.createElement('div');
        subtext.classList.add('red-text', 'flow-text');
        subtext.innerText = "Choisissez un lieu manuellement.";

        content.appendChild(error);
        content.appendChild(subtext);
    }

    // Création du footer
    const ok = document.createElement('a');
    ok.href = "#!";
    ok.innerText = "Confirmer";
    ok.classList.add("btn-flat", "green-text", "right");
    ok.addEventListener('click', function() {
        if (input.value.trim() === "") {
            showToast("Vous devez préciser un lieu.");
        }
        else if (input.value in labels_to_name) {
            const loc_input = document.getElementById('__location__id') as HTMLInputElement;
            loc_input.value = input.value;

            // On stocke la clé de la localisation dans reallocation
            loc_input.dataset.reallocation = labels_to_name[input.value][0];

            getModalInstance().close();
            modal.classList.remove('modal-fixed-footer');
        }
        else {
            showToast("Le lieu entré n'a aucune correspondance dans la base de données.");
        }
    });
    footer.appendChild(ok);

    // Création du bouton annuler
    const cancel = document.createElement('a');
    cancel.href = "#!";
    cancel.innerText = "Annuler";
    cancel.classList.add("btn-flat", "red-text", "left");
    cancel.addEventListener('click', () => { cancelGeoLocModal(required); });
    footer.appendChild(cancel);

    modal.appendChild(footer);
}
