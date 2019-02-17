import { UserManager } from "./user_manager";
import { initBottomModal, getBottomModal } from "./helpers";

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

export function modalToHome(callbackIfTrue: (evt?: MouseEvent) => void) : void {
    const modal = getBottomModal();
    const instance = initBottomModal();

    modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">Aller à la page précédente ?</h5>
        <p class="flow-text">Les modifications sur la page actuelle seront perdues.</p>
    </div>
    <div class="modal-footer">
        <a href="#!" id="__modal_back_home" class="btn-flat red-text right modal-close">Retour</a>
        <a href="#!" class="btn-flat blue-text left modal-close">Annuler</a>
        <div class="clearb"></div>
    </div>
    `;

    document.getElementById('__modal_back_home').onclick = callbackIfTrue;

    instance.open();
}