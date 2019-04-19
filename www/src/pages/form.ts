import { prompt, testOptionsVersusExpected, testMultipleOptionsVesusExpected } from "../utils/vocal_recognition";
import { FormEntityType, FormEntity, Schemas, Schema, FormSave, FormLocations } from '../base/FormSchema';
import { getLocation, getModal, getModalInstance, calculateDistance, getModalPreloader, initModal, createImgSrc, displayErrorMessage, showToast, dateFormatter, askModal, takeAPicture, takeAVideo } from "../utils/helpers";
import { MAX_LIEUX_AFFICHES, MP3_BITRATE, FILE_HELPER } from "../main";
import { PageManager } from "../base/PageManager";
import { Logger } from "../utils/logger";
import { newModalRecord } from "../utils/audio_listener";
import { UserManager } from "../base/UserManager";
import { createLocationInputSelector } from "../utils/location";
import { FileHelperReadMode } from "../base/FileHelper";
import { beginFormSave } from "../utils/save_a_form";
import { METADATA_DIR } from "../base/FormSaves";
import { Settings, Globals } from "../utils/Settings";

function resetTakePicButton(button: HTMLElement) : void {
    button.classList.add('blue', 'darken-3');
    button.classList.remove('green');
    button.innerText = "Take a new picture";
}

/**
 * Crée une miniature d'image
 * @param link Link to image
 * @param input File input
 * @param placeh Where the image should be created
 * @param absolute Specify if link is absolute or relative. NULL refers to a blob: (object URL)
 * @param f_input (optional) Input where path of file is stored
 * @param button (optional) Button for "take a picture"
 */
function createMiniature(link: string, input: HTMLInputElement, placeh: HTMLElement, absolute = false, f_input: HTMLInputElement = null, button: HTMLElement = null, is_video = false) {
    // L'input file est déjà présent dans le formulaire
    // on affiche une miniature
    placeh.innerHTML = "";

    const img_miniature = document.createElement('div');
    img_miniature.classList.add('image-form-wrapper', 'relative-container');

    if (is_video) {
        const vid_balise = document.createElement('video');
        vid_balise.classList.add('video-form-element');

        createImgSrc(link, vid_balise, absolute);

        img_miniature.appendChild(vid_balise);
    }
    else {
        const img_balise = document.createElement('img');
        img_balise.classList.add('img-form-element');

        createImgSrc(link, img_balise, absolute);

        img_miniature.appendChild(img_balise);
    }
    
    placeh.appendChild(img_miniature);

    // On crée un bouton "supprimer ce fichier"
    const delete_file_btn = document.createElement('div');
    delete_file_btn.className = "remove-img-btn";
    delete_file_btn.innerHTML = "<i class='material-icons'>close</i>";

    delete_file_btn.onclick = () => {
        askModal("Remove this picture ?", "")
            .then(() => {
                // On set un flag qui permettra, à la sauvegarde, de supprimer l'ancien fichier
                input.dataset.toremove = "true";
                img_miniature.remove();

                // Vide l'input file et l'input picture
                if (f_input)
                    f_input.value = "";

                if (button)
                    resetTakePicButton(button);

                input.type = "text";
                input.value = "";
                input.type = "file";
                input.dataset.imagemanualurl = "";
            })
            .catch(() => { });
    };

    img_miniature.appendChild(delete_file_btn);
}

/**
 * Crée une base classique dans lequel insérer un input texte ou number.
 */
function createInputWrapper() : HTMLElement {
    const e = document.createElement('div');
    e.classList.add("row", "input-field", "col", "s12");

    return e;
}

/**
 * Crée automatiquement le tip d'invalidité d'un champ
 * @param wrapper Wrapper dans lequel est l'input
 * @param ele Champ
 */
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

/**
 * Montre ou cache le tip d'invalidité
 * @param current La plupart du temps, l'input. Doit être l'élément **AVANT** le tip dans le DOM.
 * @param show Montrer: oui ou non
 */
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
export function constructForm(placeh: HTMLElement, current_form: Schema, edition_mode?: {save: FormSave, name: string}) : void {
    const filled_form = edition_mode ? edition_mode.save : undefined;
    const filled_form_id = edition_mode ? edition_mode.name : undefined;

    // Si le formulaire accepte la localisation
    if (!current_form.no_location) {
        // Crée le champ de lieu
        const loc_wrapper = document.createElement('div');
        loc_wrapper.classList.add('input-field', 'row', 'col', 's12');
        const location = document.createElement('input');
        location.type = "text";
        location.readOnly = true;
        location.name = "__location__";
        location.placeholder = "Place / location";
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
                location.value = `${filled_form.location}` + (Settings.location_labels ? " - " + label_location.label : "");
            }
            else if (filled_form.location !== null) {
                showToast("Warning: Entry location does not exists in form model.");
            }
        }

        loc_wrapper.appendChild(location);
        const loc_title = document.createElement('h4');
        loc_title.innerText = "Place";
        placeh.appendChild(loc_title);
        placeh.appendChild(loc_wrapper);
        // Fin champ de lieu, itération sur champs
    }

    for (const ele of current_form.fields) {
        let element_to_add: HTMLElement = null;

        if (ele.type === FormEntityType.title) {
            // C'est un titre
            const clearer = document.createElement('div');
            clearer.classList.add('clearb');
            placeh.appendChild(clearer);

            const htmle = document.createElement('h4');
            htmle.innerText = ele.label;
            htmle.id = "id_" + ele.name;

            placeh.appendChild(htmle);
        }

        else if (ele.type === FormEntityType.divider) {
            // On crée un diviseur
            placeh.insertAdjacentHTML('beforeend', `
                <div class="clearb"></div>
                <div class="divider divider-margin" id="id_${ele.name}"></div>
                <div class="clearb"></div>
            `);
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

            if (ele.precision) {
                htmle.step = String(ele.precision);
            }
            else if (ele.type === FormEntityType.float) {
                htmle.step = "0.001";
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
                            M.toast({html: "Unknown number recognized."});
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

                const voice_replacements = ele.voice_control_replacements ? 
                    ele.voice_control_replacements : 
                    [[' ', ''], ['à', 'a'], ['-', '']];                

                let timer: number;
                const gestion_click = function(erase = true) {
                    prompt().then(function(value) {
                        let val = value as string;

                        if (ele.remove_whitespaces) {
                            for (const [regex, replacement] of voice_replacements) {
                                val = val.replace(new RegExp(regex, "iug"), replacement);
                            }
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
                    prompt("Speak now", true).then(function(value) {
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
                            M.toast({html: "Any option has matched your speech"});
                        }
                    });
                });

                real_wrapper.appendChild(mic_btn);
            }

            htmle.dataset.invalid_tip = ele.tip_on_invalid || "";

            // Évènement pour le select: si select multiple.required
            if (htmle.multiple) {
                // Création du tip
                createTip(wrapper, ele);
                htmle.addEventListener('change', function(this: HTMLSelectElement) {
                    let valid = true;
                    if (this.multiple && this.required && ($(this).val() as string[]).length === 0) {
                        valid = false;
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

        else if (ele.type === FormEntityType.image || ele.type === FormEntityType.video || ele.type === FormEntityType.file) {
            //// Attention ////
            // L'input de type file pour les images, sur android,
            // ne propose pas le choix entre prendre une nouvelle photo
            // et choisir une image enregistrée. Le choix est FORCÉMENT
            // de choisir une image enregistrée. 
            // Le problème est contourné en créant un input personnalisé utilisant navigator.camera

            const is_image = FormEntityType.image === ele.type || ele.file_type === "image/*";
            const is_video = FormEntityType.video === ele.type || ele.file_type === "video/*";

            let delete_file_btn: HTMLElement = null;
            // Wrapper
            const real_wrapper = document.createElement('div');
            real_wrapper.className = "row col s12 no-margin-bottom";

            // Wrapper pour la miniature
            const minia_wrapper = document.createElement('div');

            // File input
            const input = document.createElement('input');
            input.type = "file"; input.id = "id_" + ele.name; input.name = ele.name;
            input.required = ele.required; input.accept = ele.file_type || "";

            // Text for file input
            const f_input = document.createElement('input');

            // Création du p exposant le titre de la photo
            const label_file = document.createElement('p');
            label_file.innerText = ele.label;
            label_file.className = "flow-text";
            label_file.style.marginTop = "5px";
            real_wrapper.appendChild(label_file);

            real_wrapper.appendChild(minia_wrapper);

            if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                if (is_image || is_video) {
                    // L'input file est déjà présent dans le formulaire
                    // on affiche une miniature
                    createMiniature(METADATA_DIR + filled_form_id + "/" + filled_form.fields[ele.name] as string, 
                        input, minia_wrapper, false, f_input, undefined, is_video);
                }
                else {
                    const description = document.createElement('p');
                    description.className = "flow-text col s12";
                    description.innerText = "File " + (filled_form.fields[ele.name] as string) + " is saved.";
                    real_wrapper.appendChild(description);

                    delete_file_btn = document.createElement('div');
                    delete_file_btn.className = "btn-flat col s12 red-text btn-small-margins center";
                    delete_file_btn.innerText = "Delete this file";

                    delete_file_btn.onclick = () => {
                        askModal("Delete this file ?", "")
                            .then(() => {
                                // On set un flag qui permettra, à la sauvegarde, de supprimer l'ancien fichier
                                input.dataset.toremove = "true";
                                input.value = "";
                                delete_file_btn.remove();
                                description.remove();
                            })
                            .catch(() => {});
                    }
                }
            }

            // Input de type file
            const wrapper = document.createElement('div');
            wrapper.classList.add('file-field', 'input-field');
            const divbtn = document.createElement('div');
            divbtn.classList.add('btn');

            const span = document.createElement('span');
            span.style.textTransform = "none";

            // Element DANS le bouton / input file
            const fwrapper = document.createElement('div');
            fwrapper.classList.add('file-path-wrapper');
            f_input.type = "text"; f_input.classList.add('file-path', 'validate');

            // Construit le label à retenir pour pouvoir afficher son titre dans le modal de confirmation
            f_input.dataset.label = ele.label;
            f_input.dataset.for = input.id;

            // Si on veut créer une image
            if (is_image) {
                input.classList.add('input-image-element');
                span.innerText = "Select a picture";

                // Création du bouton "take a new picture"
                const button = document.createElement('button');
                button.classList.add('btn', 'blue', 'darken-3', 'col', 's12', 'btn-perso');

                button.innerText = "Take a new picture";
                button.type = "button";

                real_wrapper.appendChild(button);
                real_wrapper.insertAdjacentHTML('beforeend', `<div class="clearb"></div>`);

                button.addEventListener('click', function() {
                    takeAPicture()
                        .then(url => {
                            input.dataset.imagemanualurl = url;
                            button.classList.remove('blue', 'darken-3');
                            button.classList.add('green');
                            button.innerText = "Picture (" + url.split('/').pop() + ")";

                            // Vide l'input
                            f_input.value = "";
                            input.type = "text";
                            input.value = "";
                            input.type = "file";

                            // Crée la miniature
                            createMiniature(url, input, minia_wrapper, true, f_input, button);
                        })
                        .catch(() => {});
                });
                
                // Met un listener sur le file pour vider le bouton si jamais on sélectionne une photo
                input.addEventListener('change', function() {
                    // Vide le bouton
                    input.dataset.imagemanualurl = "";
                    resetTakePicButton(button);

                    // Crée la miniature
                    if (input.files.length > 0) {
                        createMiniature(URL.createObjectURL(input.files[0]), input, minia_wrapper, null, f_input, button);
                    } 
                });
            }
            else if (is_video) {
                input.classList.add('input-video-element');
                span.innerText = "Select a video";

                // Création du bouton "take a new picture"
                const button = document.createElement('button');
                button.classList.add('btn', 'blue', 'darken-3', 'col', 's12', 'btn-perso');

                button.innerText = "Take a new video";
                button.type = "button";

                real_wrapper.appendChild(button);
                real_wrapper.insertAdjacentHTML('beforeend', `<div class="clearb"></div>`);

                button.addEventListener('click', function() {
                    Globals.makeVideo()
                        .then(([url, original]) => {
                            console.log(url, original);
                            input.dataset.imagemanualurl = original;
                            button.classList.remove('blue', 'darken-3');
                            button.classList.add('green');
                            button.innerText = "Video (" + url.split('/').pop() + ")";

                            // Vide l'input
                            f_input.value = "";
                            input.type = "text";
                            input.value = "";
                            input.type = "file";

                            // Crée la miniature
                            createMiniature(url, input, minia_wrapper, true, f_input, button, is_video);
                        })
                        .catch((e) => console.log(e));
                });
                
                // Met un listener sur le file pour vider le bouton si jamais on sélectionne une photo
                input.addEventListener('change', function() {
                    // Vide le bouton
                    input.dataset.imagemanualurl = "";
                    resetTakePicButton(button);

                    // Crée la miniature
                    if (input.files.length > 0) {
                        createMiniature(URL.createObjectURL(input.files[0]), input, minia_wrapper, null, f_input, button, is_video);
                    } 
                });
            }
            else {
                input.classList.add('input-fileitem-element');
                span.innerText = "File";
            }

            divbtn.appendChild(span);
            divbtn.appendChild(input);

            wrapper.appendChild(divbtn);

            fwrapper.appendChild(f_input);
            wrapper.appendChild(fwrapper);
            
            real_wrapper.appendChild(wrapper);

            if (delete_file_btn)
                real_wrapper.appendChild(delete_file_btn);

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

            button.innerText = "Audio record";
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
                FILE_HELPER.read(METADATA_DIR + filled_form_id + "/" + filled_form.fields[ele.name] as string, FileHelperReadMode.url)
                    .then(base64 => {
                        button.classList.remove('blue');
                        button.classList.add('green');
                        real_input.value = base64 as string;
                        const duration = (((base64 as string).length * 0.7) / (MP3_BITRATE * 1000)) * 8;
                        button.innerText = "Record (" + duration.toFixed(0) + "s" + ")";
                    })
                    .catch(err => {
                        Logger.warn("Unable to load file", err);
                    });

                // On crée un bouton "supprimer ce fichier"
                // pour supprimer l'entrée existante
                delete_file_btn = document.createElement('div');
                delete_file_btn.className = "btn-flat col s12 red-text btn-small-margins center";
                delete_file_btn.innerText = "Delete this file";

                delete_file_btn.onclick = () => {
                    askModal("Delete this file ?", "")
                        .then(() => {
                            // On set un flag qui permettra, à la sauvegarde, de supprimer l'ancien fichier
                            real_input.dataset.toremove = "true";
                            real_input.value = "";
                            delete_file_btn.remove();

                            button.className = 'btn blue col s12 btn-perso';
                            button.innerText = "Audio record";
                        })
                        .catch(() => {});
                };
            }
            ////// Fin

            button.addEventListener('click', function() {
                // Crée un modal qui sert à enregistrer de l'audio
                newModalRecord(ele.label, real_input.value)
                    .then(recres => {
                        real_input.value = recres.content;
                        real_input.dataset.duration = recres.duration.toString();
            
                        // Met à jour le bouton
                        button.innerText = "Record (" + recres.duration.toFixed(0) + "s" + ")";
                        button.classList.remove('blue');
                        button.classList.add('green');
                    })
                    .catch(() => {}); // Rien n'a changé
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
export function initFormPage(base: HTMLElement, edition_mode?: {save: FormSave, name: string, form: Schema}) {
    if (edition_mode) {
        loadFormPage(base, edition_mode.form, edition_mode);
    }
    else {
        Schemas.onReady(function(_, current) {
            if (Schemas.current_key === null) {
                // Aucun formulaire n'est chargé !
                base.innerHTML = displayErrorMessage(
                    "No form model is loaded.", 
                    "Select model to use in settings."
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
export function loadFormPage(base: HTMLElement, current_form: Schema, edition_mode?: {save: FormSave, name: string}) {
    if (!edition_mode && !UserManager.logged) {
        // Si on est en mode création et qu'on est pas connecté
        base.innerHTML = displayErrorMessage(
            "You have to login to register a new entry.", 
            "Login in settings."
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
        constructForm(placeh, current_form, edition_mode);
    }
    else {
        constructForm(placeh, current_form);
    }

    // Lance automatiquement le sélecteur de localisation uniquement si on est pas en mode édition,
    // si c'est autorisé par l'utilisateur dans les paramètres et si le formulaire autorise les lieux
    if (!edition_mode && Settings.popup_location) {
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
    btn.innerText = "Complete";

    const current_form_key = Schemas.current_key;
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

    base.innerHTML = "";
    base.appendChild(base_block);
    base_block.appendChild(btn);
    M.updateTextFields();
    $('select').formSelect();
}

/**
 * Annule la sélection de lieu
 */
function cancelGeoLocModal() : void {
    // On veut fermer

    getModalInstance().close();
    getModal().classList.remove('modal-fixed-footer');
}

/**
 * Charge le sélecteur de localisation depuis un schéma de formulaire
 * @param current_form Schéma de formulaire chargé
 */
function callLocationSelector(current_form: Schema) : void {
    // Obtient l'élément HTML du modal
    const modal = getModal();
    const instance = initModal({
        dismissible: false, preventScrolling: true
    });
    // Ouvre le modal et insère un chargeur
    instance.open();
    modal.innerHTML = getModalPreloader(
        "Finding your location...\nThis could take up to 30 seconds",
        `<div class="modal-footer">
            <a href="#!" id="dontloc-footer-geoloc" class="btn-flat blue-text left">Manual mode</a>
            <a href="#!" id="close-footer-geoloc" class="btn-flat red-text">Cancel</a>
            <div class="clearb"></div>
        </div>`
    );

    let is_loc_canceled = false;
    document.getElementById("close-footer-geoloc").onclick = function() {
        is_loc_canceled = true;
        cancelGeoLocModal();
    };
    document.getElementById('dontloc-footer-geoloc').onclick = function() {
        is_loc_canceled = true;
        locationSelector(modal, current_form.locations, false, Settings.location_labels);
    };

    // Cherche la localisation et remplit le modal
    getLocation(function(coords: Position) {
        if (!is_loc_canceled)
            locationSelector(modal, current_form.locations, coords, Settings.location_labels);
    }, function() {
        if (!is_loc_canceled)
            locationSelector(modal, current_form.locations, undefined, Settings.location_labels);
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
function locationSelector(modal: HTMLElement, locations: FormLocations, current_location?: Position | false, with_labels = false) {
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
    title.innerText = "Manual select";
    content.appendChild(title);

    // Vide le modal actuel et le remplace par le contenu et footer créés
    modal.innerHTML = "";
    modal.appendChild(content);

    const labels_to_name = createLocationInputSelector(content, input, locations, undefined, true, with_labels);

    // Construction de la liste de lieux si la location est trouvée
    if (current_location) {
        // Création de la fonction qui va gérer le cas où l'on appuie sur un lieu
        function clickOnLocation(this: HTMLElement) {
            input.value = this.dataset.name + (with_labels ? " - " + this.dataset.label : "");
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
        title.innerText = "Near locations";
        content.appendChild(title);

        // Construction de la liste des lieux proches
        const collection = document.createElement('div');
        collection.classList.add('collection');

        for (let i = 0; i < lieux_dispo.length && i < MAX_LIEUX_AFFICHES; i++) {
            const elem = document.createElement('a');
            elem.href = "#!";
            elem.classList.add('collection-item');
            elem.innerHTML = `
                ${lieux_dispo[i].name} ${with_labels ? `- ${lieux_dispo[i].label}` : ""}
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
        error.innerText = "Unable to find your location.";
        const subtext = document.createElement('div');
        subtext.classList.add('red-text', 'flow-text');
        subtext.innerText = "Please choose a place.";

        content.appendChild(error);
        content.appendChild(subtext);
    }

    // Création du footer
    const ok = document.createElement('a');
    ok.href = "#!";
    ok.innerText = "Confirm";
    ok.classList.add("btn-flat", "green-text", "right");
    ok.addEventListener('click', function() {
        if (input.value.trim() === "") {
            showToast("You must specify a place.");
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
            showToast("Entered place has no matching correspondance in places database.");
        }
    });
    footer.appendChild(ok);

    // Création du bouton annuler
    const cancel = document.createElement('a');
    cancel.href = "#!";
    cancel.innerText = "Cancel";
    cancel.classList.add("btn-flat", "red-text", "left");
    cancel.addEventListener('click', cancelGeoLocModal);
    footer.appendChild(cancel);

    modal.appendChild(footer);
}
