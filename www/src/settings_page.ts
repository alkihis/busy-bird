import { UserManager, loginUser } from "./user_manager";
import { Forms } from "./form_schema";
import { askModal, initModal, getModalPreloader, informalBottomModal, showToast } from "./helpers";
import { SyncManager } from "./SyncManager";
import { PageManager } from "./PageManager";

function headerText() : string {
    return `${UserManager.logged ? 
        "Vous êtes connecté-e en tant que <span class='orange-text text-darken-2'>" + UserManager.username + "</span>" 
        : "Vous n'êtes pas connecté-e"}.`;
}

function formActualisationModal() : void {
    const instance = initModal({dismissible: false}, getModalPreloader("Actualisation..."));
    instance.open();

    Forms.init(true)
        .then(() => {
            showToast("Actualisation terminée.");
            instance.close();
            PageManager.reload();
        })
        .catch((error) => {
            showToast("Impossible d'actualiser les schémas.");
            instance.close();
        })
}

export function initSettingsPage(base: HTMLElement) {
    const connecte = UserManager.logged;

    base.innerHTML = `
    <div class="container row" id="main_settings_container">
        <h4>Utilisateur</h4>
        <p id="settings_main_text" class="flow-text no-margin-bottom">${headerText()}</p>
    </div>
    `;

    ////// DEFINITION DU BOUTON DE CONNEXION
    const container = document.getElementById('main_settings_container');
    const button = document.createElement('button');
    const header = document.getElementById('settings_main_text');
    container.appendChild(button);

    function logUserButton() : void {
        button.type = "button";
        button.innerHTML = "Se connecter";
        button.classList.remove('red');
        button.classList.add('col', 's12', 'blue', 'btn', 'btn-perso', 'btn-margins', 'white-text');

        button.onclick = function() {
            loginUser().then(function() {
                unlogUserButton();
                header.innerHTML = headerText();
            });
        };
    }

    function unlogUserButton() : void {
        button.type = "button";
        button.innerHTML = "Déconnexion";
        button.classList.remove('blue');
        button.classList.add('col', 's12', 'red', 'btn', 'btn-perso', 'btn-margins');


        button.onclick = function() {
            askModal("Se déconnecter ?", "Vous ne pourrez pas saisir une entrée de formulaire tant que vous ne serez pas reconnecté-e.")
                .then(function() {
                    // L'utilisateur veut se déconnecter
                    UserManager.unlog();
                    logUserButton();
                    header.innerHTML = headerText();
                })
                .catch(function() {
                    // L'utilisateur ne se déconnecte pas, finalement
                });
        };
    }

    if (connecte) {
        unlogUserButton();
    }
    else {
        logUserButton();
    }

    /////// PARTIE DEUX: CHOIX DU FORMULAIRE ACTUELLEMENT CHARGE
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Formulaire actif</h4>
    <p class="flow-text">
        Ce formulaire correspond à celui proposé dans la page "Nouvelle entrée".
    </p>
    `);
    const select = document.createElement('select');
    select.classList.add('material-select');

    container.appendChild(select);
    
    Forms.onReady(function() {
        const available = [["", "Aucun"], ...Forms.getAvailableForms()];

        for (const option of available) {
            const o = document.createElement('option');
            o.value = option[0];
            o.innerText = option[1];

            if (option[0] === Forms.current_key || (option[0] === "" && Forms.current_key === null)) {
                o.selected = true;
            }
            select.appendChild(o);
        }

        M.FormSelect.init(select);
    });

    select.addEventListener('change', function() {
        const value = select.value || null;

        if (Forms.formExists(value)) {
            Forms.changeForm(value, true);
        }
    });

    //// SYNCHRONISATION
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Synchronisation</h4>
    <p class="flow-text">
        Synchronisez vos entrées de formulaire avec un serveur distant.
    </p>
    `);
    const syncbtn = document.createElement('button');
    syncbtn.classList.add('col', 's12', 'blue', 'btn', 'btn-perso', 'btn-small-margins');
    syncbtn.innerHTML = "Synchroniser";
    syncbtn.onclick = function() {
        SyncManager.graphicalSync();
    }
    container.appendChild(syncbtn);

    const syncbtn2 = document.createElement('button');
    syncbtn2.classList.add('col', 's12', 'orange', 'btn', 'btn-perso', 'btn-small-margins');
    syncbtn2.innerHTML = "Tout resynchroniser";
    syncbtn2.onclick = function() {
        askModal(
            "Tout synchroniser ?", 
            "Ceci peut prendre beaucoup de temps si de nombreux éléments sont à sauvegarder. Veillez à disposer d'une bonne connexion à Internet."
        ).then(() => {
            // L'utilisateur a dit oui
            SyncManager.graphicalSync(true);
        });
    }
    container.appendChild(syncbtn2);

    const syncbtn3 = document.createElement('button');
    syncbtn3.classList.add('col', 's12', 'red', 'btn', 'btn-perso', 'btn-small-margins');
    syncbtn3.innerHTML = "Vider cache et synchroniser";
    syncbtn3.onclick = function() {
        askModal(
            "Vider cache et tout resynchroniser ?", 
            "Vider le cache obligera à resynchroniser tout l'appareil, même si vous annulez la synchronisation qui va suivre.\
            N'utilisez cette option que si vous êtes certains de pouvoir venir à bout de l'opération.\
            Cette opération peut prendre beaucoup de temps si de nombreux éléments sont à sauvegarder. Veillez à disposer d'une bonne connexion à Internet."
        ).then(() => {
            // L'utilisateur a dit oui
            SyncManager.graphicalSync(true, true);
        });
    }
    container.appendChild(syncbtn3);
    

    /// BOUTON POUR FORCER ACTUALISATION DES FORMULAIRES
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    `);

    const formbtn = document.createElement('button');
    formbtn.classList.add('col', 's12', 'green', 'btn', 'btn-perso', 'btn-small-margins');
    formbtn.innerHTML = "Actualiser schémas formulaire";
    formbtn.onclick = function() {
        if (UserManager.logged) {
            askModal(
                "Actualiser les schémas ?", 
                "L'actualisation des schémas de formulaire récupèrera les schémas à jour depuis le serveur du LBBE."
            ).then(() => {
                // L'utilisateur a dit oui
                formActualisationModal();
            });
        }
        else {
            informalBottomModal("Connectez-vous", "L'actualisation des schémas est uniquement possible en étant connecté.");
        }
    }
    container.appendChild(formbtn);
}
