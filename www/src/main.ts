import { PageManager, AppPageName, SIDENAV_OBJ } from './PageManager';
import { askModalList, saveDefaultForm, getLocation, testDistance, initModal, changeDir, dateFormatter, getBase, displayErrorMessage, createRandomForms, getSdCardFolder } from "./helpers";
import { Logger } from "./logger";
import { newModalRecord } from "./audio_listener";
import { FormEntityType, Forms } from "./form_schema";
import { prompt } from "./vocal_recognition";
import { createNewUser, UserManager } from "./user_manager";
import { SyncManager, SyncEvent } from "./SyncManager";
import { launchQuizz } from './test_vocal_reco';
import { FileHelper, FileHelperReadMode } from './file_helper';

// Constantes de l'application
export const APP_VERSION = 0.7;
export const MAX_LIEUX_AFFICHES = 20; /** Maximum de lieux affichés dans le modal de sélection de lieu */
export const API_URL = "https://projet.alkihis.fr/"; /** MUST HAVE TRAILING SLASH */
export const ENABLE_FORM_DOWNLOAD = true; /** Active le téléchargement automatique des schémas de formulaire au démarrage */
export const ID_COMPLEXITY = 20; /** Nombre de caractères aléatoires dans un ID automatique */
export const MP3_BITRATE = 256; /** En kb/s */
export const SYNC_FREQUENCY_POSSIBILITIES = [15, 30, 60, 120, 240, 480, 1440]; /** En minutes */
export const ENABLE_SCROLL_ON_FORM_VERIFICATION_CLICK = true; /** Active le scroll lorsqu'on clique sur un élément lors du modal de vérification */
export const SCROLL_TO_CENTER_ON_FORM_VERIFICATION_CLICK = true;
export const MAX_TIMEOUT_FOR_FORM = 20000; /** Timeout pour l'envoi du fichier .json de l'entrée, en millisecondes */
export const MAX_TIMEOUT_FOR_METADATA = 180000; /** Timeout pour l'envoi de chaque fichier "métadonnée" (img, audio, ...), en millisecondes */
export const MAX_CONCURRENT_SYNC_ENTRIES = 10; /** Nombre d'entrées à envoyer en même temps pendant la synchronisation.
    Attention, 1 entrée correspond au JSON + ses possibles fichiers attachés. 
*/
export const APP_ID = "com.lbbe.busybird";

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
    // Change le répertoire de données
    // Si c'est un navigateur, on est sur cdvfile://localhost/temporary
    // Sinon, si mobile, on passe sur dataDirectory
    changeDir();

    await FILE_HELPER.waitInit();

    // @ts-ignore Force à demander la permission pour enregistrer du son
    const permissions = cordova.plugins.permissions;

    await new Promise((resolve) => {
        permissions.requestPermission(permissions.RECORD_AUDIO, (status) => {
            resolve(status);
        }, e => { console.log(e); resolve(); });
    });

    // Force à demander la permission pour accéder à la SD
    const permission_write: { hasPermission: boolean } = await new Promise((resolve) => {
        permissions.requestPermission(permissions.WRITE_EXTERNAL_STORAGE, (status: { hasPermission: boolean }) => {
            resolve(status);
        }, e => { console.log(e); resolve(undefined); });
    });
    
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

    Logger.init();
    Forms.init(); 
    SyncManager.init();

    // @ts-ignore Désactive le dézoom automatique sur Android quand l'utilisateur a choisi une petite police
    if (window.MobileAccessibility) {
        // @ts-ignore
        window.MobileAccessibility.usePreferredTextZoom(false);
    }

    // Initialise le bouton retour
    document.addEventListener("backbutton", function() {
        PageManager.goBack();
    }, false);

    app.initialize();
    initDebug();
    initModal();
    
    // Check si on est à une page spéciale
    let href: string = "";

    if (window.location) {
        const tmp = location.href.split('#')[0].split('?');
        // Récupère la partie de l'URL après la query string et avant le #
        href = tmp[tmp.length - 1];
    }

    // Quand les forms sont prêts, on affiche l'app !
    Forms.onReady(function() {
        let prom: Promise<any>;

        if (href && PageManager.pageExists(href)) {
            prom = PageManager.changePage(href as AppPageName);
        }
        else {
            prom = PageManager.changePage(AppPageName.home);
        }

        prom
            .then(() => {
                // On montre l'écran quand tout est chargé
                navigator.splashscreen.hide();
            })
            .catch(err => {
                // On montre l'écran et on affiche l'erreur
                navigator.splashscreen.hide();

                // Bloque le sidenav pour empêcher de naviguer
                try {
                    SIDENAV_OBJ.destroy();
                } catch (e) {}

                getBase().innerHTML = displayErrorMessage("Impossible d'initialiser l'application", "Erreur: " + err.stack);
            });
    });
}

function initDebug() {

    window["DEBUG"] = {
        launchQuizz,
        PageManager,
        saveDefaultForm,
        getLocation,
        testDistance,
        Logger,
        Forms,
        SyncEvent,
        askModalList,
        FileHelper,
        FileHelperReadMode,
        createRandomForms,
        recorder: function() {
            newModalRecord(document.createElement('button'), document.createElement('input'),
            {
                name: "__test__",
                label: "Test",
                type: FormEntityType.audio
            });
        },
        dateFormatter,
        prompt,
        createNewUser,
        UserManager,
        SyncManager
    };
}

document.addEventListener('deviceready', initApp, false);
