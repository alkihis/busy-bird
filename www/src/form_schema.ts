import { showToast, hasConnection } from "./helpers";
import { UserManager } from "./user_manager";
import { API_URL, ENABLE_FORM_DOWNLOAD, FILE_HELPER } from "./main";
import fetch from './fetch_timeout';
import { FileHelper } from "./file_helper";

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
    
    skip_location?: boolean; /** Autorise le fait que la localisation peut ne pas être précisée (champ non obligatoire) */
    no_location?: boolean; /** Désactive la génération de l'entrée de localisation pour ce formulaire */
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
    suggested_not_blank?: boolean; /* for type.string && type.bigstring && type.integer && type.float */
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
    indeterminate?: boolean; /* for type.checkbox */
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
    audio = "audio", date = "date", time = "time"
}

// Représente tous les schémas de Formulaire dispo
export type FormSchema = {[formName: string] : Form};

// Type de fonction à passer en paramètre à onReady(callback)
type FormCallback = (available?: FormSchema, current?: Form) => any;

// Classe contenant le formulaire JSON chargé et parsé
export const Forms = new class {
    protected available_forms: FormSchema;
    protected _current_key: string = null;
    protected _default_form_key: string = null;
    protected on_ready: Promise<void> = null;

    protected readonly FORM_LOCATION: string = 'loaded_forms.json';
    protected readonly DEAD_FORM_SCHEMA: Form = {name: null, fields: [], locations: {}};

    constructor() { 
        if (localStorage.getItem('default_form_key')) {
            this._default_form_key = localStorage.getItem('default_form_key');
        }

        // Sauvegarde dans le localStorage quoiqu'il arrive
        this.default_form_key = this._default_form_key;

        /** call init() after constructor() ! */ 
    }

    /**
     * Sauvegarde les schémas actuellement chargés dans cet objet sur le stockage interne de l'appareil.
     */
    public saveForms() {
        if (this.available_forms) {
            FILE_HELPER.write(this.FORM_LOCATION, this.available_forms);
        }
    }

    /**
     * Initialise les formulaires disponible via un fichier JSON.
     * Si un connexion Internet est disponible, télécharge les derniers formulaires depuis le serveur.
     * Charge automatiquement un formulaire par défaut: la clé du formulaire par défaut est contenu dans "default_form_name"
     * N'appelez PAS deux fois cette fonction !
     */
    public init() : Promise<any> {
        return this.on_ready = this._init();
    }

    /**
     * Fonction fantôme de init(). Permet de glisser cette fonction dans on_ready.
     * Voir init().
     */
    protected _init() : Promise<any> {
        const init_text = document.getElementById('__init_text_center');

        if (init_text) {
            init_text.innerText = "Mise à jour des schémas de formulaire";
        }

        if (ENABLE_FORM_DOWNLOAD && hasConnection() && UserManager.logged) {
            return this.downloadSchemaFromServer();
        }
        else {
            return this.readSchemaJSONFromFile();
        }
    }

    /**
     * Télécharge les schémas à jour depuis un serveur distant.
     * @param timeout Temps avant d'annuler le chargement
     * @param reject_on_fetch_fail Rejeter la promesse si le téléchargement échoue.
     * Sinon, les schémas par défaut présents sur l'appareil seront chargés.
     */
    protected async downloadSchemaFromServer(timeout = 5000, reject_on_fetch_fail = false) : Promise<void> {
        // On tente d'actualiser les formulaires disponibles
        // On attend au max 20 secondes
        try {
            const response = await fetch(API_URL + "schemas/subscribed.json", {
                headers: new Headers({ "Authorization": "Bearer " + UserManager.token }),
                method: "GET"
            }, timeout);

            const json_2 = await response.json();
            if (json_2.error_code)
                throw json_2.error_code;

            this.loadFormSchemaInClass(json_2, true);
        }
        catch (error) {
            console.log("Timeout/fail for forms");
            // Impossible de charger le JSON depuis le serveur
            if (reject_on_fetch_fail) {
                return Promise.reject(error);
            }

            return this.readSchemaJSONFromFile();
        }
    }

    /**
     * Force le téléchargement des nouveaux schémas depuis un serveur distant.
     * Si le téléchargement échoue, la promesse est rejetée.
     */
    public forceSchemaDownloadFromServer() : Promise<void> {
        if (hasConnection() && UserManager.logged) {
            return this.downloadSchemaFromServer(30000, true);
        }
        else {
            return Promise.reject();
        }
    }

    /**
     * Lit les schémas depuis le système de fichiers.
     * Essaie d'abord le local, puis, si il n'existe pas, celui du package de l'app
     */
    protected async readSchemaJSONFromFile(): Promise<void> {
        // On vérifie si le fichier loaded_forms.json existe
        try {
            const string = await FILE_HELPER.read(this.FORM_LOCATION);
            this.loadFormSchemaInClass(JSON.parse((string as string)));
        }
        catch (e) {
            // Il n'existe pas, on doit le charger depuis les sources de l'application
            try {
                const parsed = await (await fetch('assets/form.json', {})).json();

                this.loadFormSchemaInClass(parsed, true);
            } catch (e2) {
                // Essaie de lire le fichier sur le périphérique
                const application = new FileHelper(cordova.file.applicationDirectory + 'www/');

                await application.waitInit();

                await application.read('assets/form.json')
                    .then(string_1 => {
                        this.loadFormSchemaInClass(JSON.parse((string_1 as string)));
                    })
                    .catch(() => {
                        showToast("Impossible de charger les schémas." + " "
                            + cordova.file.applicationDirectory + 'www/assets/form.json');
                    });
            }
        }
    }

    /**
     * Charge un FormSchema dans la classe et initialise les pointeurs sur schéma en cours dans l'objet.
     * 
     * @param schema 
     * @param save Sauvegarder dans le JSON local les schémas de FormSchema
     */
    protected loadFormSchemaInClass(schema: FormSchema, save: boolean = false) : void {
        // Le JSON est reçu, on l'enregistre dans available_forms
        this.available_forms = schema;
        // On enregistre le formulaire par défaut (si la clé définie existe)
        if (this._default_form_key in this.available_forms) {
            this._current_key = this._default_form_key;
        }

        // On sauvegarde les formulaires dans loaded_forms.json
        // uniquement si demandé
        if (save) {
            this.saveForms();
        }
    }

    /**
     * Exécute callback quand l'objet est prêt.
     * @param callback Fonction à appeler quand le formulaire est prêt
     */
    public async onReady(callback?: FormCallback) : Promise<void> {
        if (callback) {
            await this.on_ready;
            callback(this.available_forms, this.current);
        }

        return this.on_ready;
    }

    /**
     * Renvoie vrai si le formulaire existe. Renvoie également vrai pour null.
     * @param name Clé du formulaire
     */
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
            this._current_key = null;

            if (make_default) {
                this.default_form_key = null;
            }
            return;
        }

        if (this.formExists(name)) {
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

    public deleteForm(name: string) : void {
        if (this.formExists(name) && name !== null) {
            delete this.available_forms[name];

            if (this._current_key === name) {
                this._current_key = null;
            }
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

    public get current() : Form {
        if (this.current_key === null || !this.formExists(this.current_key)) {
            return this.DEAD_FORM_SCHEMA;
        }
        else {
            return this.getForm(this.current_key);
        }
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

    public set schemas(schema: FormSchema) {
        this.available_forms = schema;

        if (!(this._current_key in this.available_forms)) {
            this._current_key = null;
        }

        this.saveForms();
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
