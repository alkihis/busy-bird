////// LE JSON ECRIT DANS assets/form.json DOIT ÊTRE DE TYPE
/* 
{
    "nom_formel/clé_du_formulaire": {
        "name": "Nom réel (possiblement à afficher à l'écran)"
        "fields": [
            {}: FormEntity
        ],
        "locations": [
            {}: FormLocation
        ]
    },
    "nom_d_un_autre_formulaire": Form
}
*/

/**
 * Interfaces représentant un formulaire, les lieux d'un formulaire, un champ de formulaire puis une option d'un SELECT
 */
export interface Form {
    name: string;
    fields: FormEntity[];
    locations: FormLocation[];
}

export interface FormLocation {
    name: string;
    label: string;
    latitude: number | string;
    longitude: number | string;
}

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
 * Le type à préciser est la chaîne de caractères
 */
export enum FormEntityType {
    integer = "integer", float = "float", select = "select", string = "string", bigstring = "textarea", 
    checkbox = "checkbox", file = "file", datetime = "datetime", divider = "divider"
}

// Clé du JSON à charger automatiquement
export const default_form_name: string = "cincle_plongeur";

// Type de fonction à passer en paramètre à onReady(callback)
type FormCallback = (available?: {[formName: string] : Form}, current?: Form) => any;

// Classe contenant le formulaire JSON chargé et parsé
export const Forms = new class {
    protected form_ready: boolean = false;
    protected waiting_callee: FormCallback[] = [];
    protected available_forms: {[formName: string] : Form};
    protected current: Form = null;

    // Initialise les formulaires disponibles via le fichier JSON contenant les formulaires
    // La clé du formulaire par défaut est contenu dans "default_form_name"
    constructor() {
        $.get('assets/form.json', {}, (json: any) => {    
            // Le JSON est reçu, on l'enregistre dans available_forms
            this.available_forms = json;
            // On met le form à ready
            this.form_ready = true;
            // On enregistre le formulaire par défaut (si la clé définie existe)
            if (default_form_name in this.available_forms)
                this.current = this.available_forms[default_form_name];
            else
                this.current = {name: null, fields: [], locations: []};
    
            // On exécute les fonctions en attente
            let func: FormCallback;
            while (func = this.waiting_callee.pop()) {
                func(this.available_forms, this.current);
            }
        }, 'json');
    }

    onReady(callback: FormCallback) : void {
        if (this.form_ready) {
            callback(this.available_forms, this.current);
        }
        else {
            this.waiting_callee.push(callback);
        }
    }
};

