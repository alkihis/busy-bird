import { PageManager, AppPageName } from './PageManager';
import { readFromFile, askModalList, saveDefaultForm, listDir, createDir, getLocation, testDistance, initModal, rmrf, changeDir, rmrfPromise, dateFormatter } from "./helpers";
import { Logger } from "./logger";
import { newModalRecord } from "./audio_listener";
import { FormEntityType, Forms } from "./form_schema";
import { prompt } from "./vocal_recognition";
import { createNewUser, UserManager } from "./user_manager";
import { SyncManager } from "./SyncManager";
import { launchQuizz } from './test_vocal_reco';

export const MAX_LIEUX_AFFICHES = 20; /** Maximum de lieux affichés dans le modal de sélection de lieu */
export const API_URL = "https://projet.alkihis.fr/"; /** MUST HAVE TRAILING SLASH */
export const ENABLE_FORM_DOWNLOAD = true; /** Active le téléchargement automatique des schémas de formulaire au démarrage */
export const ID_COMPLEXITY = 20; /** Nombre de caractères aléatoires dans un ID automatique */
export const APP_VERSION = 0.6;
export const MP3_BITRATE = 256; /** En kb/s */
export const SYNC_FREQUENCY_POSSIBILITIES = [15, 30, 60, 120, 240, 480, 1440]; /** En minutes */

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
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function (id) {
        // var parentElement = document.getElementById(id);
        // var listeningElement = parentElement.querySelector('.listening');
        // var receivedElement = parentElement.querySelector('.received');
        // listeningElement.setAttribute('style', 'display:none;');
        // receivedElement.setAttribute('style', 'display:block;');
        // console.log('Received Event: ' + id);
    }
};

function initApp() {
    // Change le répertoire de données
    // Si c'est un navigateur, on est sur cdvfile://localhost/temporary
    // Sinon, si mobile, on passe sur dataDirectory
    changeDir();

    Logger.init();
    Forms.init(); 
    SyncManager.init();

    // @ts-ignore Désactive le dézoom automatique sur Android quand l'utilisateur a choisi une petite police
    if (window.MobileAccessibility) {
        // @ts-ignore
        window.MobileAccessibility.usePreferredTextZoom(false);
    }

    // @ts-ignore Force à demander la permission pour enregistrer du son
    const permissions = cordova.plugins.permissions;
    permissions.requestPermission(permissions.RECORD_AUDIO, status => {
        // console.log(status);
    }, e => {console.log(e)});

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
        // @ts-ignore
        navigator.splashscreen.hide();

        if (href && PageManager.pageExists(href)) {
            PageManager.changePage(href as AppPageName);
        }
        else {
            PageManager.changePage(AppPageName.home);
        }
    });
}

function initDebug() {

    window["DEBUG"] = {
        launchQuizz,
        PageManager,
        readFromFile,
        listDir,
        saveDefaultForm,
        createDir,
        getLocation,
        testDistance,
        rmrf,
        rmrfPromise,
        Logger,
        Forms,
        askModalList,
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
