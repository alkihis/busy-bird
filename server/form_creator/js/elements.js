//// FORM ELEMENTS
const PROPERTIES_INTERNAL_NAME = {
    name: "unique_name",
    label: "label",
    placeholder: "placeholder_text",
    required: "required_field",
    suggested_not_blank: "suggested_blank", /* for type.string */
    range: ".slider-opt-wrapper", /* for type.integer && type.float */
    select_options: ".select-opt-wrapper", /* for type.select */
    slider_options: ".slider-opt-wrapper", /* for type.slider */
    file_type: "file_type", /* for type.file */
    float_precision: "float_prec", /* for type.float */
    default_value: "default_val",
    tip_on_invalid: "invalid_tip",
    vocal_access_words: false,
    allow_voice_control: "vocal_command",
    remove_whitespaces: "rm_whitesp", /* for type.string / type.bigstring; during vocal reco */
    external_constraints: "external_c" /* for type.select only; Définit des contraintes externes de façon simpliste */
};

const FORM_PROPERTIES = {
    // name: string; OBLIGATOIRE
    // label: string; OBLIGATOIRE
    placeholder: generatePlaceholder,
    // required: "boolean", VALABLE POUR CHAQUE CHAMP
    suggested_not_blank: generateSuggested, /* for type.string */
    range: generateRange, /* for type.integer && type.float */
    select_options: generateSelectOpt, /* for type.select */
    slider_options: generateSliderOpt, /* for type.slider */
    file_type: generateFileType, /* for type.file */
    float_precision: generateFloatPrec, /* for type.float */
    // default_value: "string | boolean", VALABLE POUR CHAQUE CHAMP
    tip_on_invalid: generateInvalidTip,
    vocal_access_words: "string[]",
    allow_voice_control: generateAllowVoice,
    remove_whitespaces: generateRmWhitespace, /* for type.string / type.bigstring; during vocal reco */
    external_constraints: generateExternalC /* for type.select only; Définit des contraintes externes de façon simpliste */
};

const FORM_TYPES = {
    divider: {label: "Titre / séparateur", props: []},
    string: {label: "Texte court", props: ["allow_voice_control", "remove_whitespaces", "suggested_not_blank", "range", "tip_on_invalid", "placeholder"]}, 
    textarea: {label: "Paragraphe", props: ["allow_voice_control", "remove_whitespaces", "range", "tip_on_invalid", "placeholder"]}, 
    integer: {label: "Nombre entier", props: ["allow_voice_control", "range", "tip_on_invalid", "placeholder"]}, 
    float: {label: "Nombre à virgule", props: ["allow_voice_control", "range", "tip_on_invalid", "float_precision", "placeholder"]}, 
    slider: {label: "Choix binaire", props: ["slider_options"]},
    select: {label: "Liste de choix", props: ["allow_voice_control", "tip_on_invalid", "external_constraints", "select_options"]}, 
    checkbox: {label: "Case à cocher", info: "La valeur par défaut est le statut décoché.", props: []},
    datetime: {label: "Date et heure", props: []},
    file: {label: "Fichier", props: ["file_type"]},
    audio: {label: "Enregistrement audio", props: []}
};

const EMPTY_CHILDRENS = new Set(["divider", "checkbox", "slider"]); // > No default value & no possibility of require it
const NO_DEFAULT_VALUE = new Set(["audio", "datetime", "file", "select"]); // > No default value

// dec2hex :: Integer -> String
function dec2hex(dec) {
    return ('0' + dec.toString(16)).substr(-2);
}
/**
 * Génère un identifiant aléatoire
 * @param {number} len Longueur de l'ID
 */
function generateId(len = 20) {
    const arr = new Uint8Array((len || 40) / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join('');
}

function generateTextInput(name, label, required = false, placeholder = undefined, random_id = false, def_val = "") {
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

function generateCheckbox(name, label, checked = false) {
    return `<p class="col s12 no-margin-bottom no-margin-top">
        <label>
            <input name="${name}" id="id${name}" type="checkbox" ${checked ? "checked" : ""} />
            <span>${label}</span>
        </label>
    </p>`;
}

function generateNumberInput(name, label, required = false, min = 0.001, max = 0.9, placeholder = undefined, def_val = "") {
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
    input.step = "0.001";
    if (required) {
        input.required = true;
    }
    input.autocomplete = "off";
    if (min !== null) {
        input.min = min;
    }
    if (max !== null) {
        input.max = max;
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

function makeSelectOption(required = false, def = undefined) {
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

    one_opt.insertAdjacentElement('beforeend', generateTextInput("select_option", "Option (nom interne)", false, undefined, true, def_opt));
    one_opt.insertAdjacentElement('beforeend', generateTextInput("select_label", "Option (nom affiché)", required, undefined, true, def_label));
    one_opt.insertAdjacentHTML('beforeend', generateCheckbox("select_selected", "Sélectionnée par défaut", def_sel));

    one_opt.insertAdjacentHTML('beforeend', "<div class='clearb'></div>");

    if (!required) {
        // Bouton pour supprimer cette option
        const del = document.createElement('div');
        del.classList.add('col', 's12', 'delete-btn', 'right-align', 'btn-flat', 'nopointer', 'red-text');
        del.innerHTML = "<span class='pointer'><i class='material-icons right'>close</i> Supprimer cette option</span>";
        del.firstChild.onclick = function() { one_opt.remove(); };

        one_opt.appendChild(del);
        one_opt.insertAdjacentHTML('beforeend', "<div class='clearb'></div>");
    }

    return one_opt;
}

/**
 * 
 * @param {HTMLElement} base 
 */
function generatePlaceholder(base, existing_item = {}) {
    base.insertAdjacentElement(
        'beforeend', 
        generateTextInput('placeholder_text', "Suggestion dans le champ de texte", false, undefined, false, existing_item.placeholder || "")
    );
}

function generateSuggested(base, existing_item = {}) {
    base.insertAdjacentHTML('beforeend', 
        generateCheckbox('suggested_blank', "Suggérer le remplissage du champ", existing_item.suggested_not_blank || false)
    );
}

function generateRange(base, existing_item) {
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

    opt1.insertAdjacentElement('beforeend', generateNumberInput('range_opt_min', "Minimum", false, null, null, "Laissez vide si aucun", min_r));
    opt2.insertAdjacentElement('beforeend', generateNumberInput('range_opt_max', "Maximum", false, null, null, "Laissez vide si aucun", max_r));

    base.appendChild(wrapper);
}

function generateSelectOpt(base, existing_item) {
    // Element le plus complexe. Deux options obligatoires, on doit pouvoir en rajouter autant que l'on veut après
    base.insertAdjacentHTML('beforeend', `<p class="flow-text">Options de la liste</p>`);

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

    opt_wrapper.insertAdjacentHTML('beforeend', generateCheckbox("select_multiple", "Liste à choix multiples", multiple_select));
    opt_wrapper.insertAdjacentHTML('beforeend', `<div class="clearb" style="margin-top: 10px;"></div>`);

    const choices_wrapper = document.createElement('div');
    choices_wrapper.classList.add('col', 's12');
    opt_wrapper.appendChild(choices_wrapper);

    // Création des deux options obligatoires
    choices_wrapper.appendChild(makeSelectOption(true, first_sel_option));
    choices_wrapper.appendChild(makeSelectOption(true, second_sel_option));

    if (additionnals_options) {
        for (a_o of additionnals_options) {
            // Génération des options supplémentaires
            choices_wrapper.appendChild(makeSelectOption(false, a_o));
        }
    }

    // Ajout du bouton pour créer une nouvelle entrée
    const new_entry = document.createElement('div');
    new_entry.classList.add('col', 's12', 'delete-btn', 'btn-flat', 'center-align', 'green-text');
    new_entry.innerHTML = "<i class='material-icons valign-bottom'>add</i> Ajouter option";
    new_entry.onclick = function() { choices_wrapper.appendChild(makeSelectOption()); };

    opt_wrapper.appendChild(new_entry);

    base.appendChild(opt_wrapper);
}

function generateSliderOpt(base, existing_item) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('slider-opt-wrapper');

    const opt1 = document.createElement('div');
    opt1.innerHTML = "<p class='flow-text no-margin-bottom'>Option 1</p><p class='no-margin-bottom'>L'option 1 est l'option sélectionnée par défaut.</p>";
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

    opt1.insertAdjacentElement('beforeend', generateTextInput('slider_opt_1_i', "Nom interne", true, undefined, undefined, sel_opt1i));
    opt1.insertAdjacentElement('beforeend', generateTextInput('slider_opt_1', "Nom affiché", true, undefined, undefined, sel_opt1));
    opt2.insertAdjacentElement('beforeend', generateTextInput('slider_opt_2_i', "Nom interne", true, undefined, undefined, sel_opt2i));
    opt2.insertAdjacentElement('beforeend', generateTextInput('slider_opt_2', "Nom affiché", true, undefined, undefined, sel_opt2));

    base.appendChild(wrapper);
}

function generateFileType(base, existing_item = {}) {
    base.insertAdjacentElement('beforeend',
    generateTextInput('file_type', "Type MIME du fichier accepté", false, undefined, false, existing_item.file_type || ""));
}

function generateFloatPrec(base, existing_item = {}) {
    base.insertAdjacentElement('beforeend', 
    generateNumberInput('float_prec', "Précision numérique (de 0.001 à 0.99)", false, undefined, undefined, undefined, existing_item.float_precision || "")
    );
}

function generateInvalidTip(base, existing_item = {}) {
    base.insertAdjacentElement('beforeend', 
    generateTextInput('invalid_tip', "Aide affichée si champ invalide", false, undefined, false, existing_item.tip_on_invalid || "")
    );
}

function generateAllowVoice(base, existing_item = {}) {
    base.insertAdjacentHTML('beforeend', 
    generateCheckbox('vocal_command', "Autoriser commande vocale", existing_item.allow_voice_control || false)
    );
}

function generateRmWhitespace(base, existing_item = {}) {
    base.insertAdjacentHTML('beforeend', 
    generateCheckbox('rm_whitesp', "Supprimer les espaces lors de la saisie vocale", existing_item.remove_whitespaces || false)
    );
}

function generateExternalC(base, existing_item = {}) {
    base.insertAdjacentElement('beforeend', 
    generateTextInput('external_c', "Contraintes externes (voir manuel)", false, undefined, false, existing_item.external_constraints || "")
    );
}

/**
 * @param {HTMLFormElement} form
 * @param {any} entry 
 * @param {string} prop
 */
function acquireDataFromInput(form, entry, prop) {
    if (prop === "slider_options") {
        // Récupération des deux name + label
        const name1 = form.querySelector(`[name="slider_opt_1_i"]`).value;
        const label1 = form.querySelector(`[name="slider_opt_1"]`).value;

        const name2 = form.querySelector(`[name="slider_opt_2_i"]`).value;
        const label2 = form.querySelector(`[name="slider_opt_2"]`).value;

        entry.slider_options = [
            {name: name1, label: label1},
            {name: name2, label: label2}
        ];
    }
    else if (prop === "select_options") {
        // Récupération du select multiple
        const sopt = {};
        sopt.multiple = form.querySelector(`[name="select_multiple"]`).checked;

        sopt.options = [];
        // Récupération des options
        const options = form.getElementsByClassName('one-select-opt');
        
        for (const o of options) {
            const value = o.querySelector(`[name="select_option"]`).value;
            const label = o.querySelector(`[name="select_label"]`).value;
            const selected = o.querySelector(`[name="select_selected"]`).checked;

            sopt.options.push({ label, value, selected });
        }

        entry.select_options = sopt;
    }
    else if (prop === "range") {
        const min = form.querySelector(`[name="range_opt_min"]`).value;
        const max = form.querySelector(`[name="range_opt_max"]`).value;

        if (min !== "") {
            entry.range = {min: Number(min)};
        }
        if (max !== "") {
            if (entry.range) {
                entry.range.max = Number(max);

                if (entry.range.min > entry.range.max) {
                    throw new Error("Le minimum ne peut être supérieur au maximum");
                }
            }
            else {
                entry.range = {max: Number(max)};
            }
        }
    }
}