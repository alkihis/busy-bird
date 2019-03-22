import { UserManager } from "../base/UserManager";
import { SyncManager } from "../base/SyncManager";
import { hasGoodConnection, getBase } from "../utils/helpers";
import { APP_VERSION, FILE_HELPER } from "../main";
import { Schemas } from "../base/FormSchema";
import { createLocationInputSelector } from "../utils/location";
import { launchQuizz } from "../utils/test_vocal_reco";
import { ENTRIES_DIR } from "../base/FormSaves";

export const APP_NAME = "Busy Bird";

export async function initHomePage(base: HTMLElement) {
    base.innerHTML = `
    <div class="flex-center-aligner home-top-element">
        <img id="__home_logo_clicker" src="img/logo.png" class="home-logo">
    </div>
    <div class="container relative-container">
        <span class="very-tiny-text version-text">Version ${APP_VERSION}</span>
        <p class="flow-text center">
            Bienvenue dans ${APP_NAME}, l'application qui facilite le suivi d'espèces 
            sur le terrain !
        </p>
        <p class="flow-text red-text">
            ${!UserManager.logged ? `
                Vous n'êtes pas connecté dans l'application. Vous ne serez pas en mesure de
                saisir de nouvelles entrées sans être authentifié. Veuillez vous connecter via
                les paramètres de l'application.
            ` : ''}
        </p>
        <div id="__home_container"></div>
    </div>
    `;

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
                    `<span class="blue-text text-darken-2">Vous avez beaucoup d'éléments à synchroniser (${remaining_count} entrées).</span><br>
                    <span class="blue-text text-darken-2">Rendez-vous dans les entrées pour lancer la synchronisation.</span>`,
                    "Synchronisation"
                );
            }
            else if (remaining_count > 0) {
                home_container.innerHTML = createCardPanel(
                    `<span class="blue-text text-darken-2">
                        Vous avez ${remaining_count} entrée${remaining_count > 1 ? 's' : ''} en attente de synchronisation.
                    </span>`
                );
            }
        }
        else if (remaining_count > 0) {
            home_container.innerHTML = createCardPanel(`
                <span class="blue-text text-darken-2">Vous avez des éléments en attente de synchronisation.</span><br>
                <span class="red-text text-darken-2">Lorsque vous retrouverez une bonne connexion Internet,</span>
                <span class="blue-text text-darken-2">lancez une synchronisation dans les paramètres.</span>`
            );
        }
    } catch (e) {
        home_container.innerHTML = createCardPanel(
            `<span class="red-text text-darken-2">Impossible de relever les entrées disponibles.</span><br>
            <span class="red-text text-darken-2">Cette erreur est possiblement grave. 
            Nous vous conseillons de ne pas enregistrer d'entrée.</span>`,
            "Erreur"
        );
    }

    // Montre l'utilisateur connecté
    if (UserManager.logged) {
        home_container.insertAdjacentHTML('beforeend', createCardPanel(
            `<span class="grey-text text-darken-1">${UserManager.username}</span>
            <span class="blue-text text-darken-2">est connecté-e.</span>`
        ));
    }

    // Nombre de formulaires enregistrés sur l'appareil
    try {
        let nb_files: number;
        try {
            nb_files = (await FILE_HELPER.ls(ENTRIES_DIR) as string[]).length;
        } catch (e) {
            nb_files = 0;
            await FILE_HELPER.mkdir(ENTRIES_DIR);
        }
        

        home_container.insertAdjacentHTML('beforeend', createCardPanel(
            `<span class="blue-text text-darken-2">${nb_files === 0 ? 'Aucune' : nb_files} entrée${nb_files > 1 ? 's' : ''} 
            ${nb_files > 1 ? 'sont' : 'est'} stockée${nb_files > 1 ? 's' : ''} sur cet appareil.</span>`
        ));
    } catch (e) {
        // Impossible d'obtenir les fichiers
        home_container.insertAdjacentHTML('beforeend', createCardPanel(
            `<span class="red-text text-darken-2">Impossible d'obtenir la liste des fichiers présents sur l'appareil.</span><br>
            <span class="red-text text-darken-2">Cette erreur est probablement grave. 
            Nous vous conseillons de ne pas tenter d'enregistrer d'entrée et de vérifier votre stockage interne.</span>`
        ));
    }

    if (Schemas.current_key !== null) {
        const locations = Schemas.current.locations;

        if (Object.keys(locations).length > 0) {
            // Navigation vers nichoir
            home_container.insertAdjacentHTML('beforeend',
                `<div class="divider divider-margin big"></div>
                <h6 style="margin-left: 10px; font-size: 1.25rem">Naviguer vers un habitat de ${Schemas.current.name.toLowerCase()}</h6>`
            );

            createLocationInputSelector(home_container, document.createElement('input'), locations, true);
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

                setTimeout(function() {
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
