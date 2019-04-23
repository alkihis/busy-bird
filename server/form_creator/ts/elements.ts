import { convertHTMLToElement } from "./helpers.js";

///// INTERFACES
export interface Schema {
    /** Nom réel du schéma (à afficher à l'écran) */
    name: string;
    /** Indique le nom du champ qui sert à l'ID; Ne pas préciser si il n'y en a pas */
    id_field?: string;
    /** Champs du formulaire. Les éléments sont affichés tel l'ordre défini dans le tableau */
    fields: FormEntity[];
    
    /** Autorise le fait que la localisation puisse ne pas être précisée */
    skip_location?: boolean;
    /** Désactive la génération de l'entrée de localisation pour ce formulaire */
    no_location?: boolean;
    /**
     * Lieux valides pour ce schéma. 
     * Attention: un champ avec la clé "\_\_unknown\_\_" est toujours ajoutée et correspond
     * à une localisation qui n'existe pas encore.
     */
    locations: FormLocations;
}

export type FormLocations = {[locationId: string]: FormLocation};

export interface FormLocation {
    label: string;
    latitude: number | string;
    longitude: number | string;
}

export interface FormEntity {
    /** Nom du champ (interne, doit être compréhensible pour un ordinateur) */
    name: string;
    /** Nom affiché du champ à l'utilisateur */
    label: string;
    /** Type du champ. Doit être une valeur de FormEntityType. */
    type: FormEntityType;
    /** Suggestion de remplissage du champ. Valable pour type.(big)string && type.integer && type.float */
    placeholder?: string;
    /** Spécifie si le champ est requis. Si non précisé, vaut faux. */
    required?: boolean;
    /** Lors de la vérification, si le champ est vide, afficher un warning. 
     * for type.string && type.bigstring && type.integer && type.float */
    suggested_not_blank?: boolean;
    /** Définit un nombre minimum ou maximum (intervalle, pour les types nombres)
     * Définit un nombre minimum ou maximum de caractères (pour les types chaînes de caractères)
     * for type.integer && type.float && type.(big)string  */
    range?: {min?: number, max?: number};
    /** for type.select: Liste les paramètres d'une liste de choix.
     * Doit être un objet avec deux champs: multiple (si la liste est à choix multiple ou non)
     * et options qui est un tableau de choix possibles */
    select_options?: {options: SelectOption[], multiple: boolean};
    /** for type.slider: Liste de deux objets composés de deux champs, 
     * name pour le nom interne du choix, label pour le nom affiché */
    slider_options?: {name: string, label: string}[];
    /** for type.file: Spécifie le type MIME du fichier accepté */
    file_type?: string;
    /** for type.integer && type.float: Précision à avoir sur le nombre. Peut être flottant ou non. */
    precision?: number;
    /** Valeur par défaut pour le champ en question. 
     * boolean pour type.checkbox, string[] pour type.select AVEC multiple=true, string pour le reste */
    default_value?: string | boolean | string[];
    /** Message d'erreur marqué si le champ est détecté invalide */
    tip_on_invalid?: string;
    /** 
     * @deprecated
     * Mots clés pour l'accès vocal au champ. N'est PAS utilisé par le code.
     */
    vocal_access_words?: string[];
    /** for type.integer && type.float && type.(big)string && type.select
     * Autorise la génération du bouton de remplissage vocal pour ce champ. */
    allow_voice_control?: boolean;
    /** for type.checkbox: La checkbox aura l'état indéterminé par défaut */
    indeterminate?: boolean;
    /** for type.(big)string: Lors du remplissage vocal, les éléments suivants seront automatiquement supprimés: 
     * espaces, à transformé en a, -. Si vous n'êtes pas satisfait des éléments remplacés, précisez vos
     * propres éléments à remplacer dans voice_control_replacements. */
    remove_whitespaces?: boolean;
    /** for type.(big)string: Voir "remove_whitespaces". 
     * Liste de tuples ["élement à remplacer", "remplacement"]. 
     * Attention: "élement à remplacer" est une EXPRESSION RÉGULIÈRE et aura automatiquement les flags suivants:
     * "i" (insensible à la casse), "u" (compatible unicode) et "g" (remplacement global). */
    voice_control_replacements?: [string, string][];
}

export interface SelectOption {
    /** Valeur affichée à l'écran pour ce choix */
    label: string;
    /** Valeur interne utilisée pour ce choix */
    value: string;
    /** Champ sélectionné par défaut: oui ou non */
    selected?: boolean;
    /** @deprecated: Champ non utilisé */
    voice_hints?: string[];
}

/**
 * Type à préciser dans le JSON, clé "type"
 * Le type à préciser est la chaîne de caractères
 */
export enum FormEntityType {
    integer = "integer", float = "float", select = "select", string = "string", bigstring = "textarea", 
    checkbox = "checkbox", file = "file", slider = "slider", datetime = "datetime", divider = "divider",
    audio = "audio", date = "date", time = "time", image = "image", video = "video", title = "title"
}
// END

//// FORM ELEMENTS
export const PROPERTIES_INTERNAL_NAME: { [id: string]: string } = {
    name: "unique_name",
    label: "label",
    placeholder: "placeholder_text",
    required: "required_field",
    suggested_not_blank: "suggested_blank", /* for type.string */
    range: ".slider-opt-wrapper", /* for type.integer && type.float */
    select_options: ".select-opt-wrapper", /* for type.select */
    slider_options: ".slider-opt-wrapper", /* for type.slider */
    file_type: "file_type", /* for type.file */
    precision: "float_prec", /* for type.float && type.integer */
    default_value: "default_val",
    tip_on_invalid: "invalid_tip",
    indeterminate: "indeterminate_chk",
    vocal_access_words: "",
    allow_voice_control: "vocal_command",
    remove_whitespaces: "rm_whitesp" /* for type.string / type.bigstring; during vocal reco */
};

export const FORM_PROPERTIES: { [id: string]: Function } = {
    // name: string; OBLIGATOIRE
    // label: string; OBLIGATOIRE
    placeholder: generatePlaceholder,
    // required: "boolean", VALABLE POUR CHAQUE CHAMP
    suggested_not_blank: generateSuggested, /* for type.string */
    range: generateRange, /* for type.integer && type.float */
    select_options: generateSelectOpt, /* for type.select */
    slider_options: generateSliderOpt, /* for type.slider */
    file_type: generateFileType, /* for type.file */
    precision: generateFloatPrec, /* for type.float && type.integer */
    indeterminate: generateIndeterminate,
    // default_value: "string | boolean", VALABLE POUR CHAQUE CHAMP
    tip_on_invalid: generateInvalidTip,
    vocal_access_words: () => { throw new Error },
    allow_voice_control: generateAllowVoice,
    remove_whitespaces: generateRmWhitespace /* for type.string / type.bigstring; during vocal reco */
};

export const FORM_TYPES: { [name: string]: { label: string; props: string[]; info?: string } } = {
    divider: {label: "Separator", props: []},
    title: {label: "Title", props: []},
    string: {label: "Short text", props: ["allow_voice_control", "remove_whitespaces", "suggested_not_blank", "range", "tip_on_invalid", "placeholder"]}, 
    textarea: {label: "Paragraph", props: ["allow_voice_control", "remove_whitespaces", "suggested_not_blank", "range", "tip_on_invalid", "placeholder"]}, 
    integer: {label: "Integer number", props: ["allow_voice_control", "suggested_not_blank", "range", "tip_on_invalid", "precision", "placeholder"]}, 
    float: {label: "Float number", props: ["allow_voice_control", "suggested_not_blank", "range", "tip_on_invalid", "precision", "placeholder"]}, 
    slider: {label: "Binary choice", props: ["slider_options"]},
    select: {label: "Choice list", props: ["allow_voice_control", "tip_on_invalid", "select_options"]}, 
    checkbox: {label: "Checkbox", info: "Default value is unchecked or indeterminate.", props: ['indeterminate']},
    datetime: {label: "Date and time", props: []},
    image: {label: "Picture", props: []},
    video: {label: "Video", props: []},
    date: {label: "Date", props: []},
    time: {label: "Time", props: []},
    file: {label: "File", props: ["file_type"]},
    audio: {label: "Audio record", props: []}
};

export const EMPTY_CHILDRENS = new Set(["divider", "title", "checkbox", "slider"]); // > No default value & no possibility of require it
export const NO_DEFAULT_VALUE = new Set(["audio", "datetime", "date", "time", "file", "image", "video", "select"]); // > No default value
export const NO_LABEL = new Set(["divider"]);

// dec2hex :: Integer -> String
function dec2hex(dec: number) {
    return ('0' + dec.toString(16)).substr(-2);
}
/**
 * Génère un identifiant aléatoire
 * @param {number} len Longueur de l'ID
 */
export function generateId(len = 32) {
    const arr = new Uint8Array((len || 40) / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join('');
}

export function generateTextInput(name: string, label: string, required = false, placeholder: string = "", random_id = false, def_val = "") {
    const id = random_id ? generateId() : "id" + name;

    const div = document.createElement('div');
    div.className = "input-field col s12";

    const input = document.createElement('input');
    input.classList.add('validate');
    if (placeholder) {
        input.placeholder = placeholder;
    }
    input.name = name;
    input.id = id;
    input.type = "text";
    if (required) {
        input.required = true;
    }
    input.autocomplete = "off";

    if (def_val) {
        input.value = def_val;
    }

    const ilabel = document.createElement('label');
    ilabel.htmlFor = id;
    ilabel.innerText = label;

    div.appendChild(input);
    div.appendChild(ilabel);

    return div;
}

export function generateCheckbox(name: string, label: string, checked = false) {
    return `<p class="col s12 no-margin-bottom no-margin-top">
        <label>
            <input name="${name}" id="id${name}" type="checkbox" ${checked ? "checked" : ""} />
            <span>${label}</span>
        </label>
    </p>`;
}

export function generateNumberInput(name: string, label: string, required = false, min = 0.001, max = 0.9, placeholder: string = "", def_val = "", step = 0.001) {
    const id = "id" + name;

    const div = document.createElement('div');
    div.className = "input-field col s12";

    const input = document.createElement('input');
    input.classList.add('validate');
    if (placeholder) {
        input.placeholder = placeholder;
    }
    input.name = name;
    input.id = id;
    input.type = "number";
    input.step = String(step);
    if (required) {
        input.required = true;
    }
    input.autocomplete = "off";
    if (min !== null) {
        input.min = String(min);
    }
    if (max !== null) {
        input.max = String(max);
    }

    if (def_val) {
        input.value = def_val;
    }

    const ilabel = document.createElement('label');
    ilabel.htmlFor = id;
    ilabel.innerText = label;

    div.appendChild(input);
    div.appendChild(ilabel);

    return div;
}

function makeSelectOption(required = false, def: SelectOption = undefined) {
    const one_opt = document.createElement('div');
    one_opt.classList.add('one-select-opt');

    let def_opt = "";
    let def_label = "";
    let def_sel = false;

    if (def) {
        def_opt = def.value;
        def_label = def.label;
        def_sel = def.selected;
    }

    one_opt.insertAdjacentElement('beforeend', generateTextInput("select_option", "Option (internal name)", false, undefined, true, def_opt));
    one_opt.insertAdjacentElement('beforeend', generateTextInput("select_label", "Option (label)", required, undefined, true, def_label));

    const chkbox = convertHTMLToElement(generateCheckbox("select_selected", "Selected by default", def_sel));
    chkbox.classList.remove('s12');
    one_opt.insertAdjacentElement('beforeend', chkbox);

    if (!required) {
        // Bouton pour supprimer cette option
        const del = document.createElement('div');
        del.classList.add('delete-btn', 'right', 'btn-floating', 'pointer', 'red', 'z-depth-0');
        del.innerHTML = "<i class='material-icons'>delete_forever</i>";
        (del.firstChild as HTMLElement).onclick = function() { one_opt.remove(); };

        one_opt.appendChild(del);
    }
    one_opt.insertAdjacentHTML('beforeend', "<div class='clearb'></div>");

    return one_opt;
}

function generateIndeterminate(base: HTMLElement, existing_item?: FormEntity) {
    base.insertAdjacentHTML(
        'beforeend', 
        generateCheckbox('indeterminate_chk', "Checkbox has an indeterminate state by default", existing_item ? existing_item.indeterminate : false)
    );
}

/**
 * 
 * @param {HTMLElement} base 
 */
function generatePlaceholder(base: HTMLElement, existing_item?: FormEntity) {
    base.insertAdjacentElement(
        'beforeend', 
        generateTextInput('placeholder_text', "Placeholder for the field", false, undefined, false, existing_item ? existing_item.placeholder : "")
    );
}

function generateSuggested(base: HTMLElement, existing_item?: FormEntity) {
    base.insertAdjacentHTML('beforeend', 
        generateCheckbox('suggested_blank', "Suggest filling of this input", existing_item ? existing_item.suggested_not_blank : false)
    );
}

function generateRange(base: HTMLElement, existing_item: FormEntity) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('range-opt-wrapper');

    const opt1 = document.createElement('div');
    wrapper.appendChild(opt1);

    const opt2 = document.createElement('div');
    wrapper.appendChild(opt2);

    let min_r, max_r;

    if (existing_item && existing_item.range) {
        if (typeof existing_item.range.min !== 'undefined') {
            min_r = existing_item.range.min;
        }
        if (typeof existing_item.range.max !== 'undefined') {
            max_r = existing_item.range.max;
        }
    }

    opt1.insertAdjacentElement('beforeend', generateNumberInput('range_opt_min', "Minimum", false, null, null, "Keep empty if none", String(min_r)));
    opt2.insertAdjacentElement('beforeend', generateNumberInput('range_opt_max', "Maximum", false, null, null, "Keep empty if none", String(max_r)));

    base.appendChild(wrapper);
}

function generateSelectOpt(base: HTMLElement, existing_item: FormEntity) {
    // Element le plus complexe. Deux options obligatoires, on doit pouvoir en rajouter autant que l'on veut après
    base.insertAdjacentHTML('beforeend', `<p class="flow-text">List options</p>`);

    const opt_wrapper = document.createElement('div');
    opt_wrapper.classList.add('select-opt-wrapper');

    let first_sel_option, second_sel_option, multiple_select, additionnals_options;
    if (existing_item && existing_item.select_options) {
        multiple_select = existing_item.select_options.multiple;
        first_sel_option = existing_item.select_options.options[0];
        second_sel_option = existing_item.select_options.options[1];

        if (existing_item.select_options.options.length > 2) {
            additionnals_options = existing_item.select_options.options.slice(2);
        }
    }

    opt_wrapper.insertAdjacentHTML('beforeend', generateCheckbox("select_multiple", "Multiple choices", multiple_select));
    opt_wrapper.insertAdjacentHTML('beforeend', `<div class="clearb" style="margin-top: 10px;"></div>`);

    const choices_wrapper = document.createElement('div');
    choices_wrapper.classList.add('col', 's12');
    opt_wrapper.appendChild(choices_wrapper);

    // Création des deux options obligatoires
    choices_wrapper.appendChild(makeSelectOption(true, first_sel_option));
    choices_wrapper.appendChild(makeSelectOption(true, second_sel_option));

    if (additionnals_options) {
        for (const a_o of additionnals_options) {
            // Génération des options supplémentaires
            choices_wrapper.appendChild(makeSelectOption(false, a_o));
        }
    }

    // Ajout du bouton pour créer une nouvelle entrée
    const new_entry = document.createElement('div');
    new_entry.classList.add('col', 's12', 'delete-btn', 'btn-flat', 'center-align', 'green-text');
    new_entry.innerHTML = "<i class='material-icons valign-bottom'>add</i> Add option";
    new_entry.onclick = function() { choices_wrapper.appendChild(makeSelectOption()); };

    opt_wrapper.appendChild(new_entry);

    base.appendChild(opt_wrapper);
}

function generateSliderOpt(base: HTMLElement, existing_item: FormEntity) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('slider-opt-wrapper');

    const opt1 = document.createElement('div');
    opt1.innerHTML = "<p class='flow-text no-margin-bottom'>Option 1</p><p class='no-margin-bottom'>Option 1 is selected by default.</p>";
    wrapper.appendChild(opt1);

    const opt2 = document.createElement('div');
    opt2.innerHTML = "<p class='flow-text no-margin-bottom'>Option 2</p>";
    wrapper.appendChild(opt2);

    let sel_opt1, sel_opt1i, sel_opt2, sel_opt2i;
    if (existing_item && existing_item.slider_options) {
        sel_opt1 = existing_item.slider_options[0].label;
        sel_opt1i = existing_item.slider_options[0].name;

        sel_opt2 = existing_item.slider_options[1].label;
        sel_opt2i = existing_item.slider_options[1].name;
    }

    opt1.insertAdjacentElement('beforeend', generateTextInput('slider_opt_1_i', "Internal name", true, undefined, undefined, sel_opt1i));
    opt1.insertAdjacentElement('beforeend', generateTextInput('slider_opt_1', "Label", true, undefined, undefined, sel_opt1));
    opt2.insertAdjacentElement('beforeend', generateTextInput('slider_opt_2_i', "Internal name", true, undefined, undefined, sel_opt2i));
    opt2.insertAdjacentElement('beforeend', generateTextInput('slider_opt_2', "Label", true, undefined, undefined, sel_opt2));

    base.appendChild(wrapper);
}

function generateFileType(base: HTMLElement, existing_item?: FormEntity) {
    base.insertAdjacentElement('beforeend',
    generateTextInput('file_type', "MIME type of the file", false, undefined, false, existing_item ? existing_item.file_type : ""));
}

function generateFloatPrec(base: HTMLElement, existing_item?: FormEntity) {
    base.insertAdjacentElement('beforeend', 
        generateNumberInput('float_prec', "Number precision", false, null, null, undefined, existing_item ? String(existing_item.precision) : "")
    );
}

function generateInvalidTip(base: HTMLElement, existing_item?: FormEntity) {
    base.insertAdjacentElement('beforeend', 
    generateTextInput('invalid_tip', "Help text when field is invalid", false, undefined, false, existing_item ? existing_item.tip_on_invalid : "")
    );
}

function generateAllowVoice(base: HTMLElement, existing_item?: FormEntity) {
    base.insertAdjacentHTML('beforeend', 
    generateCheckbox('vocal_command', "Allow vocal command", existing_item ? existing_item.allow_voice_control : false)
    );
}

function generateRmWhitespace(base: HTMLElement, existing_item?: FormEntity) {
    base.insertAdjacentHTML('beforeend', 
    generateCheckbox('rm_whitesp', "Remove whitespaces during vocal recognition", existing_item ? existing_item.remove_whitespaces : false)
    )
}

/**
 * @param {HTMLFormElement} form
 * @param {any} entry 
 * @param {string} prop
 */
export function acquireDataFromInput(form: HTMLFormElement, entry: FormEntity, prop: string) {
    if (prop === "slider_options") {
        // Récupération des deux name + label
        const name1 = (form.querySelector(`[name="slider_opt_1_i"]`) as HTMLInputElement).value;
        const label1 = (form.querySelector(`[name="slider_opt_1"]`) as HTMLInputElement).value;

        const name2 = (form.querySelector(`[name="slider_opt_2_i"]`) as HTMLInputElement).value;
        const label2 = (form.querySelector(`[name="slider_opt_2"]`) as HTMLInputElement).value;

        entry.slider_options = [
            {name: name1, label: label1},
            {name: name2, label: label2}
        ];
    }
    else if (prop === "select_options") {
        // Récupération du select multiple
        const sopt: { options: SelectOption[], multiple: boolean } = {options: [], multiple: false};
        sopt.multiple = (form.querySelector(`[name="select_multiple"]`) as HTMLInputElement).checked;

        sopt.options = [];
        // Récupération des options
        const options = form.getElementsByClassName('one-select-opt');
        
        for (const o of options) {
            const value = (o.querySelector(`[name="select_option"]`) as HTMLInputElement).value;
            const label = (o.querySelector(`[name="select_label"]`) as HTMLInputElement).value;
            const selected = (o.querySelector(`[name="select_selected"]`) as HTMLInputElement).checked;

            sopt.options.push({ label, value, selected });
        }

        entry.select_options = sopt;
    }
    else if (prop === "range") {
        const min = (form.querySelector(`[name="range_opt_min"]`) as HTMLInputElement).value;
        const max = (form.querySelector(`[name="range_opt_max"]`) as HTMLInputElement).value;

        if (min !== "") {
            entry.range = {min: Number(min)};
        }
        if (max !== "") {
            if (entry.range) {
                entry.range.max = Number(max);

                if (entry.range.min > entry.range.max) {
                    throw new Error("Minimum shoud not be superior to maximum");
                }
            }
            else {
                entry.range = {max: Number(max)};
            }
        }
    }
}
