import { takeAVideo } from "./helpers";
import { FILE_HELPER } from "../main";
import { FileHelperReadMode } from "../base/FileHelper";

/**
 * Représente les paramètres globaux de l'application.
 * Ils sont stockés dans le localStorage.
 */
class AppSettings {
    protected _sync_freq: number; /** En minutes */
    protected _sync_bg: boolean; /** Activer la sync en arrière plan */
    protected _api_url: string; /** URL du serveur. DOIT avoir un slash final !! */
    protected _voice_lang: string; /** Langage utilisé pour la reconnaissance vocale */
    protected _popup_location: boolean; /** Modal de localisation à ouvrir automatiquement à la nouvelle entrée */
    protected _location_labels: boolean; /** Affiche les labels dans les localisations */

    constructor() {
        this.initDefaults();

        if (localStorage.getItem('_settings_sync_freq')) {
            this._sync_freq = Number(localStorage.getItem('_settings_sync_freq'));
        }
        if (localStorage.getItem('_settings_sync_bg')) {
            this._sync_bg = localStorage.getItem('_settings_sync_bg') === 'true';
        }
        if (localStorage.getItem('_settings_popup_location')) {
            this._popup_location = localStorage.getItem('_settings_popup_location') === 'true';
        }
        if (localStorage.getItem('_settings_api_url')) {
            this._api_url = localStorage.getItem('_settings_api_url');
        }
        if (localStorage.getItem('_settings_voice_lang')) {
            this._voice_lang = localStorage.getItem('_settings_voice_lang');;
        }
        if (localStorage.getItem('_settings_location_labels')) {
            this._location_labels = localStorage.getItem('_settings_location_labels') === "true";
        }
    }

    protected initDefaults() : void {
        this._sync_bg = false;
        this._sync_freq = 30;
        this._api_url = "";
        this._voice_lang = "fr-FR";
        this._popup_location = false;
        this._location_labels = false;
    }

    public set popup_location(val: boolean) {
        this._popup_location = val;

        localStorage.setItem('_settings_popup_location', String(val));
    }

    public get popup_location() : boolean {
        return this._popup_location;
    }

    public set sync_bg(val: boolean) {
        this._sync_bg = val;

        localStorage.setItem('_settings_sync_bg', String(val));
    }

    public get sync_bg() : boolean {
        return this._sync_bg;
    }

    public set api_url(val: string) {
        if (val === "") {
            localStorage.removeItem('_settings_api_url');
            this._api_url = "";
            return;
        }

        if (!validURL(val)) {
            throw new Error("Must be an url");
        }

        val = val.replace(/\/$/, '') + '/';

        this._api_url = val;

        localStorage.setItem('_settings_api_url', val);
    }

    public get voice_lang() : string {
        return this._voice_lang;
    }

    public set voice_lang(lang: string) {
        if (lang in lang_possibilities) {
            this._voice_lang = lang_possibilities[lang];

            localStorage.setItem('_settings_voice_lang', lang_possibilities[lang]);
        }
    }

    public get api_url() : string {
        return this._api_url;
    }

    public set sync_freq(val: number) {
        this._sync_freq = val;

        localStorage.setItem('_settings_sync_freq', String(val));
    }

    public get sync_freq() : number {
        return this._sync_freq;
    }

    public set location_labels(val: boolean) {
        this._location_labels = val;

        localStorage.setItem('_settings_location_labels', String(val));
    }

    public get location_labels() : boolean {
        return this._location_labels;
    }

    /**
     * Remet à zéro les paramètres
     */
    public reset() : void {
        this.initDefaults();
        
        this.sync_bg = this._sync_bg;
        this.sync_freq = this._sync_freq;
        this.api_url = this._api_url;
        this.voice_lang = this._voice_lang;
        this.popup_location = this._popup_location;
        this.location_labels = this._location_labels;
    }
}

const lang_possibilities: {[lang: string]: string} = {
    "Français": "fr-FR",
    "English (US)": "en-US",
    "English (UK)": "en-GB",
    "Français (canadien)": "fr-CA",
    "Français (belge)": "fr-BE",
    "Français (suisse)": "fr-CH",
    "Deutsch": "de-DE",
    "Japanese": "ja-JP",
    "Italiano": "it-IT",
    "Espanõl": "es-ES"
};

/// INFORMAL
/* Supported languages (à remplir l'objet si dessus si vous avez plus la foi que moi)
["nl-NL","vi-VN","ca-ES","es-CL","ko-KR",
  "ro-RO","en-PH","en-SG","en-IN","en-NZ","it-CH","da-DK",
  "de-AT","pt-BR","sv-SE","ar-SA","hu-HU","fi-FI","tr-TR","nb-NO","en-ID","en-SA",
  "pl-PL","id-ID","ms-MY",
  "el-GR","cs-CZ","hr-HR","en-AE","he-IL","ru-RU","de-CH","en-AU","nl-BE",
  "th-TH","pt-PT","sk-SK","en-IE","es-CO","uk-UA","es-US"];
*/

export function getAvailableLanguages() : string[] {
    return Object.keys(lang_possibilities);
}

function validURL(str: string) : boolean {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
}

export const Settings = new AppSettings;

class AppGlobals {
    protected taken_videos: string[] = [];

    cleanVideos() {
        for (const video of this.taken_videos) {
            URL.revokeObjectURL(video);
        }
    }

    async makeVideo() : Promise<[string, string]> {
        const video = await takeAVideo();

        const file_entry = await FILE_HELPER.absoluteGet(video.fullPath) as FileEntry;
        const url = file_entry.toURL();

        this.taken_videos.push(url);

        return [url, video.fullPath];
    }
}

export const Globals = new AppGlobals;

/**
 * Permet de sauvegarder en arrière-plan.
 * Cette classe ne doit pas être utilisée seule. SyncManager s'en occupe.
 */
class BgSyncObj {
    //// credit to https://github.com/transistorsoft/cordova-plugin-background-fetch
    protected background_sync: any = null;
    protected fetchCb: Function = null;
    protected failCb: Function = null;

    public isInit() {
        return this.background_sync !== null;
    }

    /**
     * Initialise le module de background sync. Cette fonction ne doit être appelée qu'une seule fois !
     * @param fetchCb Fonction à appeler lors du fetch
     * @param failCb Fonction à appeler si échec
     * @param interval Intervalle entre deux synchronisations (en minutes)
     */
    public init(fetchCb: Function, failCb: Function, interval: number = Settings.sync_freq) : boolean {
        this.background_sync = ("BackgroundFetch" in window) ? window["BackgroundFetch"] : null;

        return this.initBgSync(fetchCb, failCb, interval);
    }

    /**
     * Modifie le module de background sync en cours d'exécution
     * @param fetchCb Fonction à appeler lors du fetch
     * @param failCb Fonction à appeler si échec
     * @param interval Intervalle entre deux synchronisations (en minutes)
     */
    public initBgSync(fetchCb: Function, failCb: Function, interval: number = Settings.sync_freq) : boolean {
        if (this.background_sync) {
            this.stop();

            console.log("Starting sync with interval: " + interval);

            this.failCb = failCb;
            this.fetchCb = fetchCb;

            this.background_sync.configure(
                fetchCb, 
                () => {
                    // Désinitialise l'objet
                    Settings.sync_bg = false;
                    this.background_sync = null;
                    failCb();
                }, {
                    minimumFetchInterval: interval, // <-- default is 15
                    stopOnTerminate: false   // <-- Android only
                }
            );  

            return true;
        }
        else {
            return false;
        }
    }

    public finish() {
        if (this.background_sync) {
            this.background_sync.finish();
        }
    }

    /**
     * Change la fréquence de synchronisation
     * @param interval Intervalle entre deux synchronisations (en minutes)
     */
    public changeBgSyncInterval(interval: number) : boolean {
        if (this.background_sync) {
            return this.initBgSync(this.fetchCb, this.failCb, interval);
        }

        return false;
    }

    public start() {
        if (this.background_sync) {
            this.background_sync.start(() => {
                console.log("Starting fetch");
            }, () => {
                console.log("Failed to start fetch");
            });
        }
    }

    public stop() {
        try {
            if (this.background_sync) {
                this.background_sync.stop(() => {
                    console.log("Stopping sync");
                }, () => {
                    console.log("Failed to stop sync");
                });
            }
        } catch (e) { /** Ne fait rien si échoue à stopper (ce n'était pas lancé) */ }
    }
}

export const BackgroundSync = new BgSyncObj;
