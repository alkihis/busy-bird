import { UserManager } from "./user_manager";
import { SyncManager } from "./SyncManager";

export const APP_NAME = "Busy Bird";

export function initHomePage(base: HTMLElement) {
    base.innerHTML = "<h2 class='center'>"+ APP_NAME +"</h2>" + `
    <div class="container">
        <p class="flow-text">
            Bienvenue dans Busy Bird, l'application qui facilite la prise de données de terrain
            pour les biologistes.
            Commencez en choisissant le "Nouvelle entrée" dans le menu de côté.
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

    const home_container = document.getElementById('__home_container');
    
    function goodConnection() : boolean {
        // @ts-ignore
        const networkState = navigator.connection.type;
        // @ts-ignore
        return networkState !== Connection.NONE && networkState !== Connection.CELL && networkState !== Connection.CELL_2G;
    }
    
    SyncManager.remainingToSync()
        .then(count => {
            if (goodConnection()) {
                if (count > 15) {
                    home_container.innerHTML = createCardPanel(
                        `<span class="blue-text text-darken-2">Vous avez beaucoup d'éléments à synchroniser (${count} entrées).</span><br>
                        <span class="blue-text text-darken-2">Rendez-vous dans les paramètres pour lancer la synchronisation.</span>`,
                        "Synchronisation"
                    );
                }
                else if (count > 0) {
                    home_container.innerHTML = createCardPanel(
                        `<span class="blue-text text-darken-2">
                            Vous avez ${count} élément${count > 1 ? 's' : ''} en attente de synchronisation.
                        </span>`,
                        "Synchronisation"
                    );
                }
            }
            else {
                home_container.innerHTML = createCardPanel(`
                    <span class="blue-text text-darken-2">Vous avez des éléments en attente de synchronisation.</span><br>
                    <span class="red-text text-darken-2">Lorsque vous retrouverez une bonne connexion Internet,</span>
                    <span class="blue-text text-darken-2">lancez une synchronisation dans les paramètres.</span>`
                );
            }
        });

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
