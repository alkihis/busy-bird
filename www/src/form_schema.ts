import { readFile, writeFile, toValidUrl, showToast } from "./helpers";
import { Logger } from "./logger";
import { UserManager } from "./user_manager";
import { API_URL, ENABLE_FORM_DOWNLOAD } from "./main";
import fetch from './fetch_timeout';

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

Le formulaire DOIT comporter un champ de type "datetime",
nommé "__date__" pour être affiché correctement dans 
la liste des formulaires enregistrés.
Il peut être n'importe où dans le formulaire.
*/

/**
 * Interfaces représentant un formulaire, les lieux d'un formulaire, un champ de formulaire puis une option d'un SELECT
 */
export interface Form {
    name: string;
    id_field?: string; /* Indique le nom du champ qui sert à l'ID; Ne pas préciser si il n'y en a pas */
    fields: FormEntity[];
    locations: FormLocations;
}

export type FormLocations = {[locationId: string]: FormLocation};

export interface FormLocation {
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
    slider_options?: {name: string, label: string}[] /* for type.slider */
    file_type?: string; /* for type.file */
    float_precision?: number; /* for type.float */
    default_value?: string | boolean;
    tip_on_invalid?: string;
    vocal_access_words?: string[];
    allow_voice_control?: boolean;
    remove_whitespaces?: boolean; /* for type.string / type.bigstring; during vocal reco */
    external_constraints?: string; /* for type.select only; Définit des contraintes externes de façon simpliste */
}

//// Guide pour external_constraints
//// format: nom_du_champ=*;nom_du_champ_2=green;nom_du_champ_3!=*;champ_4!=^
//// Lire > Le champ actuel est valide si: nom_du_champ a une valeur, nom_du_champ_2 vaut "green",
//// nom_champ_3 n'a aucune valeur et enfin que champ_4 ait une valeur différente du champ actuel
//// Attention: le champ actuel est forcément valide si il n'a aucune valeur.

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
    checkbox = "checkbox", file = "file", slider = "slider", datetime = "datetime", divider = "divider",
    audio = "audio"
}

// Type de fonction à passer en paramètre à onReady(callback)
type FormCallback = (available?: {[formName: string] : Form}, current?: Form) => any;

// Classe contenant le formulaire JSON chargé et parsé
export const Forms = new class {
    protected form_ready: boolean = false;
    protected waiting_callee: FormCallback[] = [];
    protected available_forms: {[formName: string] : Form};
    protected current: Form = null;
    protected _current_key: string = null;
    protected _default_form_key: string = null;
    protected readonly DEAD_FORM_SCHEMA: Form = {name: null, fields: [], locations: {}};

    protected readonly FORM_LOCATION: string = 'loaded_forms.json';

    constructor() { 
        if (localStorage.getItem('default_form_key')) {
            this._default_form_key = localStorage.getItem('default_form_key');
        }

        // Sauvegarde dans le localStorage quoiqu'il arrive
        this.default_form_key = this._default_form_key;

        /** call init() after constructor() ! */ 
    }

    // Initialise les formulaires disponibles via le fichier JSON contenant les formulaires
    // La clé du formulaire par défaut est contenu dans "default_form_name"
    public init(crash_if_not_form_download = false) : Promise<any> {
        const loadJSONInObject = (json: any, save = false) => {
            // Le JSON est reçu, on l'enregistre dans available_forms
            this.available_forms = json;
            // On met le form à ready
            this.form_ready = true;
            // On enregistre le formulaire par défaut (si la clé définie existe)
            if (this._default_form_key in this.available_forms) {
                this.current = this.available_forms[this._default_form_key]; 
                this._current_key = this._default_form_key;
            }
            else {
                this.current = this.DEAD_FORM_SCHEMA;
            }

            // On sauvegarde les formulaires dans loaded_forms.json
            // uniquement si demandé
            if (save) {
                writeFile('', this.FORM_LOCATION, new Blob([JSON.stringify(this.available_forms)]));
            }
    
            // On exécute les fonctions en attente
            let func: FormCallback;
            while (func = this.waiting_callee.pop()) {
                func(this.available_forms, this.current);
            }
        };

        const readStandardForm = () => {
            // On vérifie si le fichier loaded_forms.json existe
            readFile(this.FORM_LOCATION)
                .then((string) => {
                    loadJSONInObject(JSON.parse(string));
                })
                .catch(() => {
                    // Il n'existe pas, on doit le charger depuis les sources de l'application
                    $.get('assets/form.json', {}, (json: any) => {
                        loadJSONInObject(json, true);
                    }, 'json')
                    .fail(function(error) {
                        // Essaie de lire le fichier sur le périphérique
                        // @ts-ignore
                        readFile('assets/form.json', false, cordova.file.applicationDirectory + 'www/')
                            .then(string => {
                                loadJSONInObject(JSON.parse(string));
                            })
                            .catch((err) => {
                                // @ts-ignore
                                showToast("Impossible de charger les formulaires." + " " + cordova.file.applicationDirectory + 'www/assets/form.json');
                            })
                    });
                });
        };


        const init_text = document.getElementById('__init_text_center');

        if (init_text) {
            init_text.innerText = "Mise à jour des formulaires";
        }

        // @ts-ignore
        if ((ENABLE_FORM_DOWNLOAD || crash_if_not_form_download) && navigator.connection.type !== Connection.NONE && UserManager.logged) {
            // On tente d'actualiser les formulaires disponibles
            // On attend au max 20 secondes
            return fetch(API_URL + "forms/available.json?access_token=" + UserManager.token, undefined, 20000)
                .then(response => response.json())
                .then(json => {
                    if (json.error_code) throw json.error_code;

                    loadJSONInObject(json, true);
                })
                .catch(error => {
                    console.log("Timeout/fail for forms");
                    // Impossible de charger le JSON depuis le serveur
                    if (crash_if_not_form_download) {
                        return Promise.reject(error);
                    }

                    readStandardForm();
                });
        }
        else {
            if (crash_if_not_form_download) {
                return Promise.reject();
            }
            readStandardForm();
        }
    }

    public onReady(callback: FormCallback) : void {
        if (this.form_ready) {
            callback(this.available_forms, this.current);
        }
        else {
            this.waiting_callee.push(callback);
        }
    }

    public formExists(name: string) : boolean {
        return name === null || name in this.available_forms;
    }

    /**
     * Change le formulaire courant renvoyé par onReady
     * @param name clé d'accès au formulaire
     * @param make_default enregistre le nouveau formulaire comme clé par défaut
     */
    public changeForm(name: string, make_default: boolean = false) : void {
        if (name === null) {
            // On supprime le formulaire chargé
            this.current = this.DEAD_FORM_SCHEMA;
            this._current_key = null;

            if (make_default) {
                this.default_form_key = null;
            }
            return;
        }

        if (this.formExists(name)) {
            this.current = this.available_forms[name]; 
            this._current_key = name;

            if (make_default) {
                this.default_form_key = name;
            }
        }
        else {
            throw new Error("Form does not exists");
        }
    }

    /**
     * Renvoie un formulaire, sans modifier le courant
     * @param name clé d'accès au formulaire
     */
    public getForm(name: string) : Form {
        if (this.formExists(name)) {
            return this.available_forms[name];
        }
        else {
            throw new Error("Form does not exists");
        }
    }

    /**
     * Retourne un tableau de tuples contenant en
     * première position la clé d'accès au formulaire,
     * et en seconde position son nom textuel à présenter à l'utilisateur
     * @returns [string, string][]
     */
    public getAvailableForms() : [string, string][] {
        const keys = Object.keys(this.available_forms);
        const tuples: [string, string][] = [];

        for (const key of keys) {
            tuples.push([key, this.available_forms[key].name]);
        }

        return tuples;
    }

    public get current_key() : string {
        return this._current_key;
    }

    public get default_form_key() : string {
        return this._default_form_key;
    }

    public set default_form_key(v: string) {
        this._default_form_key = v;

        if (v === null) {
            localStorage.removeItem('default_form_key');
        }
        else {
            localStorage.setItem('default_form_key', v);
        }
    }
};

/**
 * Interfaces représentant la sauvegarde d'un formulaire
 */

export interface FormSave {
    type: string;
    fields: FormSaveEntities;
    location: string;
    owner: string;
    metadata: {[fieldName: string]: string};
}

export interface FormSaveEntities {
    [formInputName: string]: string | boolean | string[] | number;
    /* string pour tout champ, boolean pour les checkbox, string[] pour les select multiples et number pour les nombres */
}
