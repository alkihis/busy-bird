export type Form = FormEntity[];

////// LE JSON ECRIT DANS assets/form.json DOIT ÊTRE DE TYPE
/* 
{
    "nom_du_formulaire": [
        {}: FormEntity
    ],
    "nom_d_un_autre_formulaire": [...]
}
*/

/**
 * Interfaces représentant un champ de formulaire puis une option d'un SELECT
 */
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

export const default_form_name: string = "Cincle plongeur";

// Classe contenant le formulaire JSON chargé et parsé
export const Forms = new class {
    protected form_ready: boolean = false;
    protected waiting_callee: Function[] = [];
    protected available_forms: {[formName: string] : Form};
    protected current: FormEntity[] = [];

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
    
            // On exécute les fonctions en attente
            let func: Function;
            while (func = this.waiting_callee.pop()) {
                func(this.available_forms, this.current);
            }
        }, 'json');
    }

    onReady(callback: (available?: {[formName: string] : Form}, current?: FormEntity[]) => any) : void {
        if (this.form_ready) {
            callback(this.available_forms, this.current);
        }
        else {
            this.waiting_callee.push(callback);
        }
    }
};

