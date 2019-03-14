import { prompt, testOptionsVersusExpected, testMultipleOptionsVesusExpected } from "./vocal_recognition";
import { FormEntityType, FormEntity, Forms, Form, FormSave, FormLocations } from './form_schema';
import { getLocation, getModal, getModalInstance, calculateDistance, getModalPreloader, initModal, createImgSrc, displayErrorMessage, showToast, dateFormatter, askModal } from "./helpers";
import { MAX_LIEUX_AFFICHES, MP3_BITRATE, FILE_HELPER } from "./main";
import { PageManager } from "./PageManager";
import { Logger } from "./logger";
import { newModalRecord } from "./audio_listener";
import { UserManager } from "./user_manager";
import { createLocationInputSelector } from "./location";
import { FileHelperReadMode } from "./file_helper";
import { validConstraints, beginFormSave } from "./save_a_form";

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
 * @param force_element
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
 * @param force_element
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
            if (ele.type === FormEntityType.float && ele.float_precision) {
                htmle.step = String(ele.float_precision);
            }

            // On vérifie si le champ a un message de suggestion si non rempli
            const contraintes = [];
            if (ele.suggested_not_blank) {
                contraintes.push(["suggest", "true"]);
            }
            htmle.dataset.constraints = contraintes.map(e => e.join('=')).join(';');

            wrapper.appendChild(label);
            wrapper.appendChild(htmle);
            createTip(wrapper, ele);

            if (filled_form && ele.name in filled_form.fields) {
                htmle.value = filled_form.fields[ele.name] as string;
            }

            // Attachage de l'évènement de vérification
            const num_verif = function(this: HTMLInputElement) {
                let valid = true;

                let value: number;
                try {
                    value = Number(this.value);
                } catch (e) {
                    valid = false;
                }

                if (!this.checkValidity()) {
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
                        const floating_point = this.value.split('.');

                        if (floating_point.length === 1) {
                            //Il n'y a pas de . dans le nombre
                            valid = false;
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
                mic_btn.innerHTML = `<i class="material-icons red-text">mic</i>`;

                mic_btn.firstChild.addEventListener('click', function() {
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
            if (ele.suggested_not_blank) {
                contraintes.push(["suggest", "true"]);
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

                mic_btn.innerHTML = `<i class="material-icons red-text">mic</i>`;

                let timer: number;
                const gestion_click = function(erase = true) {
                    prompt().then(function(value) {
                        let val = value as string;

                        if (ele.remove_whitespaces) {
                            val = val.replace(/ /g, '').replace(/à/iug, 'a').replace(/-/g, '');
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

                mic_btn.firstChild.addEventListener('click', function() {
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
            const real_wrapper = document.createElement('div');
        
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

            /// Gestion du voice control
            real_wrapper.appendChild(wrapper);

            if (ele.allow_voice_control) {
                wrapper.classList.add('s11');
                wrapper.classList.remove('s12');

                const mic_btn = document.createElement('div');
                mic_btn.classList.add('col', 's1', 'mic-wrapper');
                mic_btn.style.paddingRight = "0";

                mic_btn.innerHTML = `<i class="material-icons red-text">mic</i>`;

                const sel_opt = Array.from(htmle.options).map(e => [e.label, e.value]);

                mic_btn.firstChild.addEventListener('click', function() {
                    prompt("Parlez maintenant", true).then(function(value) {
                        let val: string | string[]
                        
                        if (htmle.multiple)
                            val = testMultipleOptionsVesusExpected(sel_opt as [string, string][], value as string[]);
                        else
                            val = testOptionsVersusExpected(sel_opt as [string, string][], value as string[]);

                        if (val) {
                            $(htmle).val(val);

                            // On réinitialise le select
                            const instance = M.FormSelect.getInstance(htmle);

                            if (instance) {
                                instance.destroy();
                            }

                            M.FormSelect.init(htmle);
                        }
                        else {
                            // Force M.toast: Les toasts natifs ne s'affichent pas à cause du toast affiché par Google
                            M.toast({html:"Aucune option ne correspond à votre demande"});
                        }
                    });
                });

                real_wrapper.appendChild(mic_btn);
            }

            htmle.dataset.e_constraints = ele.external_constraints || "";
            htmle.dataset.invalid_tip = ele.tip_on_invalid || "";

            // Évènement pour le select: contraintes externes ou si select multiple.required
            if (htmle.multiple || ele.external_constraints) {
                // Création du tip
                createTip(wrapper, ele);
                htmle.addEventListener('change', function(this: HTMLSelectElement) {
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

            element_to_add = real_wrapper;
        }

        else if (ele.type === FormEntityType.checkbox) {
            const wrapper = document.createElement('p');
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = "checkbox";
            const span = document.createElement('span');

            fillStandardInputValues(input, ele, span as HTMLLabelElement);

            wrapper.classList.add('row', 'col', 's12', 'input-checkbox', 'flex-center-aligner');
            input.classList.add('input-form-element');

            if (filled_form && ele.name in filled_form.fields && typeof filled_form.fields[ele.name] === 'boolean') {
                input.checked = filled_form.fields[ele.name] as boolean;
            }
            else if (ele.indeterminate) {
                input.indeterminate = true;
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

        else if (ele.type === FormEntityType.date) {
            const wrapper = createInputWrapper();
            const input = document.createElement('input');
            const label = document.createElement('label');

            // Pour que le label ne recouvre pas le texte du champ
            label.classList.add('active');
            input.type = "date";
            input.classList.add('input-form-element');

            fillStandardInputValues(input, ele, label);

            // les date sont TOUJOURS valides, si ils sont pleins
            input.dataset.valid = "1";

            if (filled_form && ele.name in filled_form.fields) {
                input.value = filled_form.fields[ele.name] as string;
            }
            else {
                // Définition de la valeur par défaut = date actuelle
                input.value = dateFormatter("Y-m-d");
            }

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            element_to_add = wrapper;
        }

        else if (ele.type === FormEntityType.time) {
            const wrapper = createInputWrapper();
            const input = document.createElement('input');
            const label = document.createElement('label');

            // Pour que le label ne recouvre pas le texte du champ
            label.classList.add('active');
            input.type = "time";
            input.classList.add('input-form-element');

            fillStandardInputValues(input, ele, label);

            // les date sont TOUJOURS valides, si ils sont pleins
            input.dataset.valid = "1";

            if (filled_form && ele.name in filled_form.fields) {
                input.value = filled_form.fields[ele.name] as string;
            }
            else {
                // Définition de la valeur par défaut = date actuelle
                input.value = dateFormatter("H:i");
            }

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            element_to_add = wrapper;
        }

        else if (ele.type === FormEntityType.file) {
            //// Attention ////
            // L'input de type file pour les images, sur android,
            // ne propose pas le choix entre prendre une nouvelle photo
            // et choisir une image enregistrée. Le choix est FORCÉMENT
            // de choisir une image enregistrée. 
            // Le problème peut être contourné en créant un input personnalisé
            // avec choix en utilisant navigator.camera et le plugin cordova camera.
            let delete_file_btn: HTMLElement = null;
            const input = document.createElement('input');
            const real_wrapper = document.createElement('div');
            real_wrapper.className = "row col s12 no-margin-bottom";

            if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                // L'input file est déjà présent dans le formulaire
                // on affiche une miniature

                const img_miniature = document.createElement('div');
                img_miniature.classList.add('image-form-wrapper', 'relative-container');
                const img_balise = document.createElement('img');
                img_balise.classList.add('img-form-element');

                createImgSrc(filled_form.fields[ele.name] as string, img_balise);

                img_miniature.appendChild(img_balise);
                placeh.appendChild(img_miniature);

                // On crée un bouton "supprimer ce fichier"
                delete_file_btn = document.createElement('div');
                delete_file_btn.className = "remove-img-btn";
                delete_file_btn.innerHTML = "<i class='material-icons'>close</i>";

                delete_file_btn.onclick = () => {
                    askModal("Supprimer ce fichier ?", "")
                        .then(() => {
                            // On set un flag qui permettra, à la sauvegarde, de supprimer l'ancien fichier
                            input.dataset.toremove = "true";
                            delete_file_btn.remove();

                            $("[data-original='"+ filled_form.fields[ele.name]+ "']").remove();
                        })
                        .catch(() => {});
                };

                img_miniature.appendChild(delete_file_btn);
            }

            // Input de type file
            const wrapper = document.createElement('div');
            wrapper.classList.add('file-field', 'input-field');
            const divbtn = document.createElement('div');
            divbtn.classList.add('btn');

            const span = document.createElement('span');
            span.innerText = "Fichier";
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
            real_wrapper.appendChild(wrapper);

            placeh.appendChild(real_wrapper);

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

            button.innerText = "Enregistrement audio";
            button.type = "button";

            const real_input = document.createElement('input');
            real_input.type = "hidden";
            real_input.classList.add('input-audio-element');
            // Construit le label à retenir pour pouvoir afficher son titre dans le modal de confirmation
            real_input.dataset.label = ele.label;

            // Création d'un label vide pour l'input
            const hidden_label = document.createElement('label');
            let delete_file_btn: HTMLElement = null;

            fillStandardInputValues(real_input, ele, hidden_label);
            hidden_label.classList.add('hide');
            wrapper.appendChild(hidden_label);

            ////// Définition si un fichier son existe déjà
            if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                FILE_HELPER.read(filled_form.fields[ele.name] as string, FileHelperReadMode.url)
                    .then(base64 => {
                        button.classList.remove('blue');
                        button.classList.add('green');
                        real_input.value = base64 as string;
                        const duration = (((base64 as string).length * 0.7) / (MP3_BITRATE * 1000)) * 8;
                        button.innerText = "Enregistrement (" + duration.toFixed(0) + "s" + ")";
                    })
                    .catch(err => {
                        Logger.warn("Impossible de charger le fichier", err);
                    });

                // On crée un bouton "supprimer ce fichier"
                // pour supprimer l'entrée existante
                delete_file_btn = document.createElement('div');
                delete_file_btn.className = "btn-flat col s12 red-text btn-small-margins center";
                delete_file_btn.innerText = "Supprimer ce fichier";

                delete_file_btn.onclick = () => {
                    askModal("Supprimer ce fichier ?", "")
                        .then(() => {
                            // On set un flag qui permettra, à la sauvegarde, de supprimer l'ancien fichier
                            real_input.dataset.toremove = "true";
                            real_input.value = "";
                            delete_file_btn.remove();

                            button.className = 'btn blue col s12 btn-perso';
                            button.innerText = "Enregistrement audio";
                        })
                        .catch(() => {});
                };
            }
            ////// Fin

            button.addEventListener('click', function() {
                // Crée un modal qui sert à enregistrer de l'audio
                newModalRecord(button, real_input, ele);
            });

            wrapper.appendChild(button);
            wrapper.appendChild(real_input);

            if (delete_file_btn)
                wrapper.append(delete_file_btn);

            element_to_add = wrapper;
        }

        else if (ele.type === FormEntityType.slider) {
            const real_wrapper = document.createElement('div');
            real_wrapper.classList.add('row', 'col', 's12');

            const text_label = document.createElement('div');
            text_label.classList.add('flow-text', 'col', 's12', 'center');
            text_label.innerText = ele.label;
            real_wrapper.appendChild(text_label);

            const wrapper = document.createElement('div');
            real_wrapper.appendChild(wrapper);

            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = "checkbox";
            const span = document.createElement('span');

            fillStandardInputValues(input, ele);

            wrapper.classList.add('input-slider', 'switch', 'flex-center-aligner', 'col', 's12');
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

            element_to_add = real_wrapper;
        }

        if (element_to_add)
            placeh.appendChild(element_to_add);
    }
}

/**
 * Fonction qui va faire attendre l'arrivée du formulaire,
 * puis charger la page
 * @param base
 * @param edition_mode
 */
export function initFormPage(base: HTMLElement, edition_mode?: {save: FormSave, name: string, form: Form}) {
    if (edition_mode) {
        loadFormPage(base, edition_mode.form, edition_mode);
    }
    else {
        Forms.onReady(function(_, current) {
            if (Forms.current_key === null) {
                // Aucun formulaire n'est chargé !
                base.innerHTML = displayErrorMessage(
                    "Aucun schéma n'est chargé.", 
                    "Sélectionnez le schéma de formulaire à utiliser dans les paramètres."
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
 * @param current_form
 * @param edition_mode
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
        dismissible: false, preventScrolling: true
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

    const labels_to_name = createLocationInputSelector(content, input, locations, undefined, true);

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
