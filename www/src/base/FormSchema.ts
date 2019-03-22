import { showToast, hasConnection } from "../utils/helpers";
import { UserManager } from "./UserManager";
import { ENABLE_FORM_DOWNLOAD, FILE_HELPER } from "../main";
import fetch from '../utils/fetch_timeout';
import { FileHelper } from "./FileHelper";
import { Settings } from "../utils/Settings";

////// LE JSON ECRIT DANS assets/form.json DOIT ÊTRE DE TYPE
/* 
{
    "nom_formel/clé_du_formulaire": {
        "name": "Nom réel (possiblement à afficher à l'écran)"
        "fields": [
            {}: FormEntity
        ],
        "locations": {
            "location_id": FormLocation,
            "...": FormLocation,
            ...
        }
    },
    "nom_d_un_autre_formulaire": Form
}

*/

/**
 * Interfaces représentant un schéma de formulaire, les lieux d'un formulaire, un champ de formulaire puis une option d'un SELECT
 */
export interface Schema {
    /**
     * Nom réel du schéma (à afficher à l'écran)
     */
    name: string;
    /**
     * Indique le nom du champ qui sert à l'ID; Ne pas préciser si il n'y en a pas
     */
    id_field?: string;
    /**
     * Champs du formulaire. Les éléments sont affichés tel l'ordre défini dans le tableau
     */
    fields: FormEntity[];
    
    /**
     * Autorise le fait que la localisation puisse ne pas être précisée (champ non obligatoire)
     */
    skip_location?: boolean;
    /**
     * Désactive la génération de l'entrée de localisation pour ce formulaire
     */
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
    /** for type.float: Précision décimale pour les nombres flottants */
    float_precision?: number;
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

interface SelectOption {
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
    audio = "audio", date = "date", time = "time"
}

// Représente tous les schémas de Formulaire dispo
export type FormSchema = {[formName: string] : Schema};

// Type de fonction à passer en paramètre à onReady(callback)
type FormCallback = (available?: FormSchema, current?: Schema) => any;


/**
 * Contient les différents schémas de formulaire,
 * le schéma actuellement chargé,
 * et charge automatiquement au démarrage, depuis le serveur
 * ou depuis le stockage interne, les schémas disponibles.
 * 
 * Après création de l'objet, lancez l'initialisation avec init() 
 * puis attendez la fin de l'initialisation avec onReady().
 */
class FormSchemas {
    protected available_forms: FormSchema;
    protected _current_key: string = null;
    protected _default_form_key: string = null;
    protected on_ready: Promise<void> = null;

    protected readonly FORM_LOCATION: string = 'loaded_forms.json';
    protected readonly DEAD_FORM_SCHEMA: Schema = {name: null, fields: [], locations: {}};

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
     * Retourne une promesse qui contient le FileEntry du fichier écrit.
     * 
     * Si aucun schéma n'est disponible (available_forms = null), la promesse est rejectée.
     * 
     * @throws {Error} Si aucun schéma n'est disponible => message:"Forms are not available."
     * @throws {FileError} Erreur d'écriture du fichier
     */
    public save() : Promise<FileEntry> {
        if (this.available_forms) {
            return FILE_HELPER.write(this.FORM_LOCATION, this.available_forms);
        }
        return Promise.reject(new Error("Forms are not available."));
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
    protected async _init() : Promise<any> {
        const init_text = document.getElementById('__init_text_center');

        if (init_text) {
            init_text.innerText = "Updating form models";
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
            const response = await fetch(Settings.api_url + "schemas/subscribed.json", {
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
                        showToast("Unable to load form models." + " "
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
            this.save();
        }
    }

    /**
     * Exécute callback quand l'objet est prêt.
     * @param callback Fonction à appeler quand le formulaire est prêt
     */
    public onReady(callback?: FormCallback) : Promise<void> {
        if (callback) {
            this.on_ready.then(() => {
                callback(this.available_forms, this.current);
            });
        }

        return this.on_ready;
    }

    /**
     * Renvoie vrai si le formulaire existe. Renvoie également vrai pour null.
     * @param name Clé du formulaire
     */
    public exists(name: string) : boolean {
        return name === null || name in this.available_forms;
    }

    /**
     * Change le formulaire courant renvoyé par onReady
     * @param name clé d'accès au formulaire
     * @param make_default enregistre le nouveau formulaire comme clé par défaut
     */
    public change(name: string, make_default: boolean = false) : void {
        if (name === null) {
            // On supprime le formulaire chargé
            this._current_key = null;

            if (make_default) {
                this.default_form_key = null;
            }
            return;
        }

        if (this.exists(name)) {
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
    public get(name: string) : Schema {
        if (this.exists(name)) {
            return this.available_forms[name];
        }
        else {
            throw new Error("Form does not exists");
        }
    }

    /**
     * Supprime un schéma existant
     * @param name 
     * @param will_save Sauvegarder les forms après suppression
     */
    public delete(name: string, will_save = false) : void {
        if (this.exists(name) && name !== null) {
            delete this.available_forms[name];

            if (this._current_key === name) {
                this._current_key = null;
            }

            if (will_save) {
                this.save();
            }
        }
    }

    /**
     * Retourne un tableau de tuples contenant en
     * première position la clé d'accès au formulaire,
     * et en seconde position son nom textuel à présenter à l'utilisateur
     * @returns [string, string][]
     */
    public available() : [string, string][] {
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

    public get current() : Schema {
        if (this.current_key === null || !this.exists(this.current_key)) {
            return this.DEAD_FORM_SCHEMA;
        }
        else {
            return this.get(this.current_key);
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

        this.save();
    }
}

export const Schemas = new FormSchemas;

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
