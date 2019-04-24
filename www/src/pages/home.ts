import { UserManager } from "../base/UserManager";
import { SyncManager } from "../base/SyncManager";
import { hasGoodConnection, getBase } from "../utils/helpers";
import { APP_VERSION, FILE_HELPER } from "../main";
import { Schemas } from "../base/FormSchema";
import { createLocationInputSelector } from "../utils/location";
import { launchQuizz } from "../utils/test_vocal_reco";
import { ENTRIES_DIR } from "../base/FormSaves";
import { Settings } from "../utils/Settings";
import { PageManager, AppPages } from "../base/PageManager";

export const APP_NAME = "Busy Bird";

export async function initHomePage(base: HTMLElement) {
    let app_version_text = String(APP_VERSION);

    if (typeof APP_VERSION === 'number' && app_version_text.indexOf('.') === -1) {
        // Il n'y a pas de .
        app_version_text = APP_VERSION.toFixed(1);
    }

    base.innerHTML = `
    <div class="flex-center-aligner home-top-element">
        <img id="__home_logo_clicker" src="img/logo.png" class="home-logo">
    </div>
    <div class="container relative-container">
        <span class="very-tiny-text version-text">Version ${app_version_text}</span>
        <p class="flow-text center">
            Welcome to ${APP_NAME}, the application that makes specie tracking easy !
        </p>
        <p class="flow-text red-text">
            ${!UserManager.logged ? `
                You are not currently logged in. You will not be able to make new entries
                without being authentificated. Please log in into settings.
            ` : ''}
        </p>
        <p class="flow-text red-text">
            ${!Settings.api_url ? `
                ${APP_NAME} server location is not properly set. Please go to the <span class="blue-text go-settings">settings page</span> to register the URL.
            ` : ''}
        </p>
        <div id="__home_container"></div>
    </div>
    `;

    const go_settings = document.querySelector('span.go-settings') as HTMLElement;
    if (go_settings) {
        go_settings.onclick = () => {
            PageManager.push(AppPages.settings);
        };
    }

    //////// TEST ////////
    createTestHome();
    //////// ENDTEST ////////

    const home_container = document.getElementById('__home_container');
    
    // Calcul du nombre de formulaires en attente de synchronisation
    try {
        const remaining_count = await SyncManager.remainingToSync();

        if (hasGoodConnection()) {
            if (remaining_count > 15) {
                home_container.innerHTML = createCardPanel(
                    `<span class="blue-text text-darken-2">You have many elements to sync (${remaining_count} entries).</span><br>
                    <span class="blue-text text-darken-2">Please go to the entries section to start synchronisation.</span>`,
                    "Synchronisation"
                );
            }
            else if (remaining_count > 0) {
                home_container.innerHTML = createCardPanel(
                    `<span class="blue-text text-darken-2">
                        You have ${remaining_count} waiting to sync entr${remaining_count > 1 ? 'ies' : 'y'}.
                    </span>`
                );
            }
        }
        else if (remaining_count > 0) {
            home_container.innerHTML = createCardPanel(`
                <span class="blue-text text-darken-2">You have entries that wait synchronisation.</span><br>
                <span class="red-text text-darken-2">When you'll have a good Internet connection again,</span>
                <span class="blue-text text-darken-2">please start a new synchronisation.</span>`
            );
        }
    } catch (e) {
        home_container.innerHTML = createCardPanel(
            `<span class="red-text text-darken-2">Unable to fetch waiting to sync entries.</span><br>
            <span class="red-text text-darken-2">This error could be serious.</span>`,
            "Error"
        );
    }

    // Montre l'utilisateur connecté
    if (UserManager.logged) {
        home_container.insertAdjacentHTML('beforeend', createCardPanel(
            `<span class="grey-text text-darken-1">${UserManager.username}</span>
            <span class="blue-text text-darken-2">is logged in.</span>`
        ));
    }

    // Nombre de formulaires enregistrés sur l'appareil
    try {
        let nb_files: number;
        nb_files = (await FILE_HELPER.ls(ENTRIES_DIR) as string[]).length;

        home_container.insertAdjacentHTML('beforeend', createCardPanel(
            `<span class="blue-text text-darken-2">${nb_files === 0 ? 'No' : nb_files} entr${nb_files > 1 ? 'ies' : 'y'} 
            ${nb_files > 1 ? 'are' : 'is'} stored into this device.</span>`
        ));
    } catch (e) {
        // Impossible d'obtenir les fichiers
        home_container.insertAdjacentHTML('beforeend', createCardPanel(
            `<span class="red-text text-darken-2">Unable to list existing files into this devices.</span><br>
            <span class="red-text text-darken-2">This error could be serious. Please check your internal storage.</span>`
        ));
    }

    if (Schemas.current_key !== null) {
        const locations = Schemas.current.locations;

        if (Object.keys(locations).length > 0) {
            // Navigation vers nichoir
            home_container.insertAdjacentHTML('beforeend',
                `<div class="divider divider-margin big"></div>
                <h6 style="margin-left: 10px; font-size: 1.25rem">Navigate to an habitat of ${Schemas.current.name.toLowerCase()}</h6>`
            );

            createLocationInputSelector(home_container, document.createElement('input'), locations, true, false, Settings.location_labels);
        }
    }

    // Initialise les champs materialize et le select
    M.updateTextFields();
    $('select').formSelect();
}

function createCardPanel(html_text: string, title?: string) : string {
    return `
        <div class="card-panel card-perso">
            ${title ? `<h6 class="no-margin-top">${title}</h6>`: ''}
            <p class="flow-text no-margin-top no-margin-bottom">${html_text}</p>
        </div>
    `;
}

function createTestHome() : void {
    let click_count = 0;
    let timeout_click: number;
    let allow_to_click_to_terrain = false;

    document.getElementById('__home_logo_clicker').onclick = function() {
        if (timeout_click) clearTimeout(timeout_click);
        timeout_click = 0;
        click_count++;

        if (click_count === 5) {
            timeout_click = setTimeout(function() {
                allow_to_click_to_terrain = true;

                setTimeout(() => {
                    allow_to_click_to_terrain = false;
                }, 20000);
            }, 1500); 
        }
        else {
            timeout_click = setTimeout(function() {
                click_count = 0;
            }, 400);
        }
    }

    const version_t = document.querySelector('.relative-container span.version-text') as HTMLElement;
    
    version_t.onclick = function(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();

        if (allow_to_click_to_terrain) {
            launchQuizz(getBase());
        }
    }
}
