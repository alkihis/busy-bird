import { PageManager, AppPageName, modalBackHome } from "./interface";
import { readFromFile, saveDefaultForm, listDir, createDir, getLocation, testDistance, initModal, rmrf, changeDir, rmrfPromise, dateFormatter } from "./helpers";
import { Logger } from "./logger";
import { newModalRecord } from "./audio_listener";
import { FormEntityType } from "./form_schema";

export let SIDENAV_OBJ: M.Sidenav = null;
export const MAX_LIEUX_AFFICHES = 20;

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
    // Si c'est un navigateur, on est sur cdvfile://localhost/persistent
    // Sinon, si mobile, on passe sur dataDirectory
    changeDir();

    Logger.init();

    // @ts-ignore Force à demander la permission pour enregistrer du son
    const permissions = cordova.plugins.permissions;
    permissions.requestPermission(permissions.RECORD_AUDIO, status => {
        console.log(status);
    }, e => {console.log(e)});

    // Initialise le bouton retour
    document.addEventListener("backbutton", function() {
        PageManager.goBack();
    }, false);

    // Initialise le sidenav
    const elem = document.querySelector('.sidenav');
    SIDENAV_OBJ = M.Sidenav.init(elem, {});

    // Bind des éléments du sidenav
    // Home
    document.getElementById('nav_home').onclick = function() {
        PageManager.pushPage(AppPageName.home);
    };
    // Form
    document.getElementById('nav_form_new').onclick = function() {
        PageManager.pushPage(AppPageName.form);
    };
    // Saved
    document.getElementById('nav_form_saved').onclick = function() {
        PageManager.pushPage(AppPageName.saved);
    };
    // Settigns
    document.getElementById('nav_settings').onclick = function() {
        PageManager.pushPage(AppPageName.settings);
    };

    app.initialize();
    initDebug();
    initModal();

    // Check si on est à une page spéciale
    let href: string | string[] = "";

    if (window.location) {
        href = location.href.split('#')[0].split('?');
        // Récupère la partie de l'URL après la query string et avant le #
        href = href[href.length - 1];
    }

    if (href && PageManager.pageExists(href)) {
        PageManager.changePage(href as AppPageName);
    }
    else {
        PageManager.changePage(AppPageName.home);
    }
}

function initDebug() {
    
    window["DEBUG"] = {
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
        modalBackHome,
        recorder: function() {
            newModalRecord(document.createElement('button'), document.createElement('input'),
            {
                name: "__test__",
                label: "Test",
                type: FormEntityType.audio
            });
        },
        dateFormatter
    };
}

document.addEventListener('deviceready', initApp, false);
