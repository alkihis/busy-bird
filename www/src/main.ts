import { PageManager, AppPages, Navigation } from './base/PageManager';
import { askModalList, saveDefaultForm, getLocation, testDistance, initModal, dateFormatter, getBase, displayErrorMessage, createRandomForms, getSdCardFolder, makeListenedObject, extendHTMLElement } from "./utils/helpers";
import { Logger } from "./utils/Logger";
import { newModalRecord } from "./utils/audio_listener";
import { Schemas } from "./base/FormSchema";
import { prompt } from "./utils/vocal_recognition";
import { createNewUser, UserManager } from "./base/UserManager";
import { SyncManager, SyncEvent } from "./base/SyncManager";
import { launchQuizz } from './utils/test_vocal_reco';
import { FileHelper, FileHelperReadMode } from './base/FileHelper';
import { Settings, Globals } from './utils/Settings';
import { ENTRIES_DIR, METADATA_DIR } from './base/FormSaves';
import { isFirstStart } from './pages/first_start';

// Constantes de l'application
export const APP_VERSION = 1.0;
export const APP_DEBUG_MODE = true;
const FIXED_NAVBAR = true; /** Active la barre de navigation fixe */
export const MAX_LIEUX_AFFICHES = 20; /** Maximum de lieux affichés dans le modal de sélection de lieu */
export const ENABLE_FORM_DOWNLOAD = true; /** Active le téléchargement automatique des schémas de formulaire au démarrage */
export const ID_COMPLEXITY = 20; /** Nombre de caractères aléatoires dans un ID automatique */
export const MP3_BITRATE = 256; /** En kb/s */
export const DEFAULT_PAGE = AppPages.home; /** Page chargée par défaut */
export const MAX_SLEEPING_PAGES = 20; /** Nombre de pages maximum qui restent en attente en arrière-plan */
export const SYNC_FREQUENCY_POSSIBILITIES = [15, 30, 60, 120, 240, 480, 1440]; /** En minutes */
export const ENABLE_SCROLL_ON_FORM_VERIFICATION_CLICK = true; /** Active le scroll lorsqu'on clique sur un élément lors du modal de vérification */
export const SCROLL_TO_CENTER_ON_FORM_VERIFICATION_CLICK = true;
export const MAX_TIMEOUT_FOR_FORM = 20000; /** Timeout pour l'envoi du fichier .json de l'entrée, en millisecondes */
export const MAX_TIMEOUT_FOR_METADATA = 180000; /** Timeout pour l'envoi de chaque fichier "métadonnée" (img, audio, ...), en millisecondes */
export const MAX_CONCURRENT_SYNC_ENTRIES = 10; /** Nombre d'entrées à envoyer en même temps pendant la synchronisation.
    Attention, 1 entrée correspond au JSON + ses possibles fichiers attachés. 
*/
export const APP_ID = "com.lbbe.busybird";
export const ALLOW_LOAD_TEST_SCHEMAS = false; /** Autorise de charger le fichier présent dans assets/form.json */
export const MAX_LENGTH_CHUNK = 512; /** En ko. Taille d'un chunk lors de l'envoi chunké des données de formulaire */
export const MAX_CONCURRENT_PARTS = 2; /** Nombre de parties de fichier pouvant s'envoyer simulanément pour un fichier donné */

// Variables globales exportées
export let SDCARD_PATH: string = null;
export let SD_FILE_HELPER: FileHelper = null;
export let FILE_HELPER: FileHelper = new FileHelper;

export const app = {
    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function () {
        // app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function () {
        // var parentElement = document.getElementById(id);
        // var listeningElement = parentElement.querySelector('.listening');
        // var receivedElement = parentElement.querySelector('.received');
        // listeningElement.setAttribute('style', 'display:none;');
        // receivedElement.setAttribute('style', 'display:block;');
        // console.log('Received Event: ' + id);
    }
};

async function initApp() {
    // @ts-ignore Force à demander la permission pour enregistrer du son
    const permissions = cordova.plugins.permissions;

    type hasPerm = { hasPermission: boolean };

    await new Promise(resolve => {
        permissions.requestPermission(permissions.RECORD_AUDIO, (status: hasPerm) => {
            resolve(status);
        }, (e: any) => { console.log(e); resolve(); });
    });

    // Force à demander la permission pour accéder à la SD
    const permission_write: hasPerm = await new Promise(resolve => {
        permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, (status: hasPerm) => {
            resolve(status);
        }, (e: any) => { console.log(e); resolve(); });
    });
    
    // Essaie de trouver le chemin de la carte SD
    try {
        if (permission_write && permission_write.hasPermission) {
            const folders = await getSdCardFolder();

            for (const f of folders) {
                if (f.canWrite) {
                    SDCARD_PATH = f.filePath;

                    // Si on est pas dans Android/com.lbbe.busybird/data/
                    if (!SDCARD_PATH.includes(APP_ID)) {
                        SDCARD_PATH += "/Busy Bird";
                    }

                    SD_FILE_HELPER = new FileHelper(SDCARD_PATH);
    
                    try {
                        await SD_FILE_HELPER.waitInit();
                    } catch (e) { SD_FILE_HELPER = null; }
                    
                    break;
                }
            }
        }
    } catch (e) {  }

    // Initialise les blocs principaux du code: L'utilitaire de log, les schémas de form et le gestionnaire de sync
    await FILE_HELPER.waitInit();
    Logger.init();

    // Initialise le log d'erreurs non attrapées
    // Erreurs classiques (bien que rares)
    window.onerror = function(event, source, lineno, colno, error) {
        Logger.error("Unhandled error:", event, "in", source, "at line", lineno, "col", colno, "error:", error);
    };
    // Promesses rejetées non attrapées
    window.addEventListener('unhandledrejection', function(event: PromiseRejectionEvent) {
        let reason = event.reason;

        if (reason instanceof Error) {
            reason = "Unhandled error: " + reason.message + "\n" + reason.stack;
        }

        Logger.error('Unhandled rejection: ', reason);
    });

    Schemas.init(); 
    SyncManager.init();

    // Création des répertoires obligatoires de l'application (si ils existent, ne fait rien)
    await FILE_HELPER.mkdir(ENTRIES_DIR);
    await FILE_HELPER.mkdir(METADATA_DIR);

    // @ts-ignore Désactive le dézoom automatique sur Android quand l'utilisateur a choisi une petite police
    if (window.MobileAccessibility) {
        // @ts-ignore
        window.MobileAccessibility.usePreferredTextZoom(false);
    }

    // Initialise le bouton retour
    document.addEventListener("backbutton", function() {
        PageManager.back();
    }, false);
    document.getElementById('__nav_back_button')!.addEventListener('click', function() {
        document.dispatchEvent(new Event("backbutton"));
    });

    // app.initialize();
    // Initialise le mode de debug
    if (APP_DEBUG_MODE)
        initDebug();
        
    initModal();

    if (FIXED_NAVBAR) {
        // Ajoute la classe navbar-fixed au div contenant le nav
        document.getElementsByTagName('nav')[0].parentElement.classList.add('navbar-fixed');
    }
    
    // Check si on est à une page spéciale
    let href: string = "";

    if (window.location) {
        const tmp = location.href.split('#')[0].split('?');
        // Récupère la partie de l'URL après la query string et avant le #
        href = tmp[tmp.length - 1];
    }

    // Quand les forms sont prêts, on affiche l'app !
    return Schemas.onReady()
        .then(() => {
            // On montre l'écran
            navigator.splashscreen.hide();

            let prom: Promise<any>;

            if (isFirstStart()) {
                prom = PageManager.change(AppPages.first_start);
            }
            else if (href && PageManager.exists(href)) {
                prom = PageManager.change(AppPages[href]);
            }
            else {
                prom = PageManager.change(DEFAULT_PAGE);
            }
    
            return prom;
        });
}

function appWrapper() {
    initApp().catch(err => {
        // On montre l'écran et on affiche l'erreur
        navigator.splashscreen.hide();

        // Bloque le sidenav pour empêcher de naviguer
        try {
            Navigation.destroy();
        } catch (e) { }

        getBase().innerHTML = displayErrorMessage("Unable to initialize application", "Error: " + err.stack);

        console.error(err);
    });
}

declare global {
    interface Window {
        DEBUG: any
    }
}

function initDebug() {
    window.DEBUG = {
        launchQuizz,
        PageManager,
        saveDefaultForm,
        getLocation,
        testDistance,
        Logger,
        Schemas,
        Settings,
        SyncEvent,
        askModalList,
        FileHelper,
        FileHelperReadMode,
        createRandomForms,
        recorder: () => {
            return newModalRecord("Test");
        },
        makeListenedObject,
        dateFormatter,
        prompt,
        createNewUser,
        UserManager,
        SyncManager,
        Navigation,
        Globals,
        extendHTMLElement
    };
}

document.addEventListener('deviceready', appWrapper, false);
