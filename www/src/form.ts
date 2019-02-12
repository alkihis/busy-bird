import { test_jarvis, Jarvis } from "./test_aytom";
import { FormEntityType, FormEntity, Forms, Form, FormLocation, FormSave } from './form_schema';
import Artyom from "./arytom/artyom";
import { getLocation, getModal, getModalInstance, calculateDistance, getModalPreloader, initModal, writeFile, generateId, getDir, removeFileByName, createImgSrc } from "./helpers";
import { MAX_LIEUX_AFFICHES } from "./main";
import { changePage } from "./interface";

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

    htmle.dataset.valid = ele.required ? "0" : "1";
    htmle.value = ele.default_value as string || "";

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
        location.value = location.dataset.reallocation = filled_form.location;
    }

    loc_wrapper.appendChild(location);
    const loc_title = document.createElement('h4');
    loc_title.innerText = "Lieu";
    placeh.appendChild(loc_title);
    placeh.appendChild(loc_wrapper);
    // Fin champ de lieu, itération sur champs

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

        if (ele.type === FormEntityType.integer || ele.type === FormEntityType.float) {
            const wrapper = createInputWrapper();
            const htmle = document.createElement('input');
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
            });

            element_to_add = wrapper;
        }

        if (ele.type === FormEntityType.string || ele.type === FormEntityType.bigstring) {
            const wrapper = createInputWrapper();

            let htmle: HTMLInputElement | HTMLTextAreaElement;
            if (ele.type === FormEntityType.string) {
                htmle = document.createElement('input');
                htmle.type = "text";
            }
            else {
                htmle = document.createElement('textarea');
                htmle.classList.add('materialize-textarea');
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

            // Attachage de l'évènement de vérification
            htmle.addEventListener('change', function() {
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
            });

            element_to_add = wrapper;
        }

        if (ele.type === FormEntityType.select) {
            const wrapper = createInputWrapper();
            const htmle = document.createElement('select');
            const label = document.createElement('label');
            htmle.classList.add('input-form-element');
            
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

            wrapper.classList.add('row', 'col', 's12', 'input-checkbox');
            input.classList.add('filled-in', 'input-form-element');
            input.type = "checkbox";
            input.checked = ele.default_value as boolean;

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

        if (ele.type === FormEntityType.datetime) {
            const wrapper = createInputWrapper();
            const input = document.createElement('input');
            const label = document.createElement('label');

            // Pour que le label ne recouvre pas le texte du champ
            label.classList.add('active');
            input.type = "datetime-local";
            input.classList.add('input-form-element');

            fillStandardInputValues(input, ele, label);

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

        if (ele.type === FormEntityType.file) {
            // Sépare les champ input file
            placeh.insertAdjacentHTML('beforeend', "<div class='clearb'></div><div class='divider divider-margin'></div>");

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

            if (filled_form && ele.name in filled_form) {
                // Afficher un aperçu de l'image
                // TODO
            }

            fwrapper.appendChild(f_input);
            wrapper.appendChild(fwrapper);

            placeh.appendChild(wrapper);
        }

        if (ele.type === FormEntityType.slider) {
            const wrapper = document.createElement('div');
            const label = document.createElement('label');
            const input = document.createElement('input');
            const span = document.createElement('span');

            fillStandardInputValues(input, ele);

            wrapper.classList.add('row', 'col', 's12', 'input-slider', 'switch');
            input.classList.add('input-form-element', 'input-slider-element');
            input.type = "checkbox";
            input.checked = ele.default_value as boolean;
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
 * Initie la sauvegarde: présente et vérifie les champs
 *  @param type 
 */
function initFormSave(type: string) : void {
    // Démarre le modal

    // Vérifie les champs invalides

    // Si champ invalide requis, affiche un message d'erreur avec champs à modifier

    // Si champ invalide suggéré (dépassement de range, notamment) ou champ vide, message d'alerte, mais
    // sauvegarde possible

    // Bouton de sauvegarde

    // Inscription dans le JSON (lecture des champs un à un et sauvegarde)
}
/**
 * Sauvegarde le formulaire actuel dans un fichier .json
 *  @param type 
 *  @param force_name? Force un nom pour le formulaire
 */
export function saveForm(type: string, force_name?: string, form_save?: FormSave) : void {
    const form_values: FormSave = {
        fields: {},
        type,
        location: (document.getElementById('__location__id') as HTMLInputElement).dataset.reallocation
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
            form_values.fields[i.name] = Number(i.value);
        }
        else {
            form_values.fields[i.name] = i.value;
        }
    }

    writeImagesThenForm(force_name || generateId(20), form_values, form_save);
}

/**
 * Ecrit les images présentes dans le formulaire dans un dossier spécifique,
 * puis crée le formulaire
 * @param name Nom du formulaire (sans le .json)
 */
function writeImagesThenForm(name: string, form_values: FormSave, older_save?: FormSave) : void {
    getDir(function() {
        // Crée le dossier images si besoin

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
                            writeFile('form_data/' + name, filename, new Blob([this.result]), function() {
                                // Enregistre le nom de l'image sauvegardée dans le formulaire, 
                                // dans la valeur du champ fiel
                                form_values.fields[input_name] = 'form_data/' + name + '/' + filename;

                                if (older_save && input_name in older_save.fields && older_save.fields[input_name] !== null) {
                                    // Si une image était déjà présente 
                                    if (older_save.fields[input_name] !== form_values.fields[input_name]) {
                                        // Si l'image enregistrée est différente de l'image actuelle
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
                                M.toast({html: "Une image n'a pas pu être sauvegardée. Vérifiez votre espace de stockage."});
                                reject(error);
                            });
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
                        }
                        else {
                            form_values.fields[input_name] = null;
                        }
                        
                        resolve();
                    }
                })
            );
        }
        
        Promise.all(promises)
            .then(function() {
                // On écrit enfin le formulaire !
                writeFile('forms', name + '.json', new Blob([JSON.stringify(form_values)]), function() {
                    M.toast({html: "Écriture du formulaire et de ses données réussie."});

                    if (older_save) {
                        // On vient de la page d'édition de formulaire déjà créés
                        changePage('saved');
                    }
                    else {
                        changePage('form');
                    }
                    
                    console.log(form_values);
                });
            })
            .catch(function(error) {
                console.log(error);
                M.toast({html: "Impossible d'écrire le formulaire."});
            });
    }, 'form_data');
}

/**
 * Fonction qui va faire attendre l'arrivée du formulaire,
 * puis charger la page
 * @param base 
 */
export function initFormPage(base: HTMLElement) {
    Forms.onReady(function(available, current) { 
        loadFormPage(base, current); 
    });
}

/**
 * Charge la page de formulaire (point d'entrée)
 * @param base Element dans lequel écrire la page
 */
export function loadFormPage(base: HTMLElement, current_form: Form) {
    base.innerHTML = "";

    const base_block = document.createElement('div');
    base_block.classList.add('row', 'container');

    const placeh = document.createElement('form');
    placeh.classList.add('col', 's12');

    base_block.appendChild(placeh);

    // Appelle la fonction pour construire
    constructForm(placeh, current_form);

    base.appendChild(base_block);
    
    M.updateTextFields();
    $('select').formSelect();

    // Lance le sélecteur de localisation
    callLocationSelector(current_form);

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
        saveForm(current_form_key);
    });

    base_block.appendChild(btn);
}

function cancelGeoLocModal() : void {
    // On veut fermer; Deux possibilités.
    // Si le champ lieu est déjà défini et rempli, on ferme juste le modal
    if ((document.getElementById("__location__id") as HTMLInputElement).value.trim() !== "") {
        // On ferme juste le modal
    }
    else {
        // Sinon, on ramène à la page d'accueil
        changePage('home');
    }

    getModalInstance().close();
    getModal().classList.remove('modal-fixed-footer');
}

function callLocationSelector(current_form: Form) : void {
    // Obtient l'élément HTML du modal
    const modal = getModal();
    initModal({
        dismissible: false
    });
    // Ouvre le modal et insère un chargeur
    getModalInstance().open();
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
        cancelGeoLocModal();
    };
    document.getElementById('dontloc-footer-geoloc').onclick = function() {
        is_loc_canceled = true;
        locationSelector(modal, current_form.locations, false);
    };

    // Cherche la localisation et remplit le modal
    getLocation(function(coords: Position) {
        if (!is_loc_canceled)
            locationSelector(modal, current_form.locations, coords);
    }, function() {
        if (!is_loc_canceled)
            locationSelector(modal, current_form.locations);
    });
}

function textDistance(distance: number) : string {
    const unit = (distance >= 1000 ? "km" : "m");
    const str_distance = (distance >= 1000 ? (distance / 1000).toFixed(1) : distance.toString());

    return `${str_distance} ${unit}`;
}

function locationSelector(modal: HTMLElement, locations: FormLocation[], current_location?: Position | false) {
    // Met le modal en modal avec footer fixé
    modal.classList.add('modal-fixed-footer');

    // Crée le contenu du modal et son footer
    const content = document.createElement('div');
    content.classList.add('modal-content');
    const footer = document.createElement('div');
    footer.classList.add('modal-footer');

    // Création de l'input qui va contenir le lieu
    const input = document.createElement('input');
    input.autocomplete = "off";

    // Sélection manuelle
    const title = document.createElement('h5');
    title.innerText = "Sélection manuelle";
    content.appendChild(title);

    // Création du champ à autocompléter
    // Conteneur
    const row = document.createElement('div');
    row.classList.add('row');
    content.appendChild(row);

    // Input field
    const input_f = document.createElement('div');
    input_f.classList.add('input-field', 'col', 's12');
    row.appendChild(input_f);

    // Champ input réel et son label
    const label = document.createElement('label');
    input.type = "text";
    input.id = "autocomplete_field_id";
    label.htmlFor = "autocomplete_field_id";
    label.textContent = "Lieu";
    input.classList.add('autocomplete');
    
    input_f.appendChild(input);
    input_f.appendChild(label);

    // Initialisation de l'autocomplétion
    const auto_complete_data: any = {};
    for (const lieu of locations) {
        auto_complete_data[lieu.label] = null;
    }

    // Vide le modal actuel et le remplace par le contenu et footer créés
    modal.innerHTML = "";
    modal.appendChild(content);

    // Création d'un objet label => value
    const labels_to_name = {};
    for (const lieu of locations) {
        labels_to_name[lieu.label] = lieu.name;
    }

    // Lance l'autocomplétion materialize
    M.Autocomplete.init(input, {
        data: auto_complete_data,
        limit: 5,
        onAutocomplete: function() {
            // Remplacement du label par le nom réel
            const location = input.value;

            // Recherche le label sélectionné dans l'objet les contenants
            if (location in labels_to_name) {
                input.value = location;
            }
        }
    });

    // Construction de la liste de lieux si la location est trouvée
    if (current_location) {
        // Création de la fonction qui va gérer le cas où l'on appuie sur un lieu
        function clickOnLocation(this: HTMLElement) {
            input.value = this.dataset.label;
            M.updateTextFields();
        }

        // Calcul de la distance entre chaque lieu et le lieu actuel
        let lieux_dispo: {name: string; label: string; distance: number}[] = [];
        
        for (const lieu of locations) {
            lieux_dispo.push({
                name: lieu.name,
                label: lieu.label,
                distance: calculateDistance(current_location.coords, lieu)
            });
        }

        lieux_dispo = lieux_dispo.sort((a, b) => a.distance - b.distance);

        // Titre
        const title = document.createElement('h5');
        title.innerText = "Lieux disponibles";
        content.appendChild(title);

        // Construction de la liste des lieux proches
        const collection = document.createElement('div');
        collection.classList.add('collection');

        for (let i = 0; i < lieux_dispo.length && i < MAX_LIEUX_AFFICHES; i++) {
            const elem = document.createElement('a');
            elem.href = "#!";
            elem.classList.add('collection-item');
            elem.innerHTML = `
                ${lieux_dispo[i].label}
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
            M.toast({html: "Vous devez préciser un lieu."});
        }
        else if (input.value in labels_to_name) {
            const loc_input = document.getElementById('__location__id') as HTMLInputElement;
            loc_input.value = input.value;
            loc_input.dataset.reallocation = labels_to_name[input.value];

            getModalInstance().close();
            modal.classList.remove('modal-fixed-footer');
        }
        else {
            M.toast({html: "Le lieu entré n'a aucune correspondance dans la base de données."});
        }
    });
    footer.appendChild(ok);

    // Création du bouton annuler
    const cancel = document.createElement('a');
    cancel.href = "#!";
    cancel.innerText = "Annuler";
    cancel.classList.add("btn-flat", "red-text", "left");
    cancel.addEventListener('click', cancelGeoLocModal);
    footer.appendChild(cancel);

    modal.appendChild(footer);
}
