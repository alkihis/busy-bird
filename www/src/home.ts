import { UserManager } from "./user_manager";

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
    </div>
    `;

    // Initialise les champs materialize et le select
    M.updateTextFields();
    $('select').formSelect();
}
