import { PageManager, AppPageName } from "./interface";
import { readFromFile, saveDefaultForm, listDir, createDir, getLocation, testDistance, initModal, rmrf, changeDir, rmrfPromise, getBase } from "./helpers";
import { Logger } from "./logger";

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

    // Initialise le bouton retour
    document.addEventListener("backbutton", function() {
        if (PageManager.isPageWaiting()) {
            PageManager.popPage();
        }
        else {
            // Do nothing
        }
    }, false);

    // Initialise le sidenav
    const elem = document.querySelector('.sidenav');
    SIDENAV_OBJ = M.Sidenav.init(elem, {});

    // Bind des éléments du sidenav
    // Home
    document.getElementById('nav_home').onclick = function() {
        PageManager.changePage("home");
    };
    // Form
    document.getElementById('nav_form_new').onclick = function() {
        PageManager.changePage("form");
    };
    // Saved
    document.getElementById('nav_form_saved').onclick = function() {
        PageManager.changePage("saved");
    };
    // Settigns
    document.getElementById('nav_settings').onclick = function() {
        PageManager.changePage("settings");
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
        PageManager.changePage("home");
    }
    
    // (function() {
    //     getLocation(function(position: Position) {
    //         document.body.insertAdjacentText('beforeend', `Lat: ${position.coords.latitude}; long: ${position.coords.longitude}`);
    //     }, function(error) {
    //         document.body.insertAdjacentText('beforeend', "Error while fetching coords" + JSON.stringify(error));
    //     });
    // })();
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
        Logger
    };
}

document.addEventListener('deviceready', initApp, false);
