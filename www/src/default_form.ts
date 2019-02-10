export type Form = FormEntity[];

export interface FormEntity {
    name: string; /* MUST BE UNIQUE */
    label: string;
    placeholder?: string;
    required?: boolean;
    suggested_not_blank?: boolean; /* for type.string */
    type: FormEntityType;
    range?: {min?: number, max?: number}; /* for type.integer && type.float */
    select_options?: {options: SelectOption[], multiple: boolean}; /* for type.select */
    file_type?: "image/png" | "image/jpeg" | "image" | "images"; /* for type.file */
    float_precision?: number; /* for type.float */
    default_value?: string | boolean;
    tip_on_invalid?: string;
    vocal_access_words?: string[];
}

interface SelectOption {
    label: string;
    value: string;
    selected?: boolean;
    voice_hints?: string[];
}

/**
 * Type à préciser dans le JSON, clé "type"
 */
export enum FormEntityType {
    integer = "integer", float = "float", select = "select", string = "string", bigstring = "textaera", 
    checkbox = "checkbox", file = "file", date = "date", time = "time", divider = "divider"
}

export let available_forms : {[formName: string] : Form}; 

export const default_form_name: string = "Cincle plongeur";
export let current_form: FormEntity[];

let form_ready = false;
let on_forms_ready: Function[] = [];

// Exécute une fonction quand le formulaire est chargé
export function onFormReady(callback: () => any) : void {
    if (form_ready) {
        callback();
    }
    else {
        on_forms_ready.push(callback);
    }
}

let test;
// Initialise les formulaires disponibles via le fichier JSON contenant les formulaires
// La clé du formulaire par défaut est contenu dans "default_form_name"
(function() {
    $.get('assets/form.json', {}, function(json: any) {
        // Si jamais le JSON arrive sous forme de string (pas parsé), on le parse
        if (typeof json === 'string') {
            json = JSON.parse(json);
        }

        // Le JSON est reçu, on l'enregistre dans available_forms
        available_forms = json;
        // On met le form à ready
        form_ready = true;
        // On enregistre le formulaire par défaut
        current_form = available_forms[default_form_name];

        console.log(available_forms, current_form);

        // On exécute les fonctions en attente
        for (const func of on_forms_ready) {
            func();
        }
        // On les supprime
        on_forms_ready = [];
    });
})();
