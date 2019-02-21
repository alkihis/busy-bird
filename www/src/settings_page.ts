import { UserManager, loginUser } from "./user_manager";
import { Forms, FormSchema } from "./form_schema";
import { askModal, initModal, getModalPreloader, informalBottomModal, showToast, getModal } from "./helpers";
import { SyncManager } from "./SyncManager";
import { PageManager } from "./PageManager";
import fetch from './fetch_timeout';
import { API_URL } from "./main";

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
                PageManager.reload();
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
    
    /// BOUTON POUR AFFICHER LE MODAL DE SOUSCRIPTIONS
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    `);

    const subs_btn = document.createElement('button');
    subs_btn.classList.add('col', 's12', 'purple', 'btn', 'btn-perso', 'btn-small-margins');
    subs_btn.innerHTML = "Gérer souscriptions schémas";
    subs_btn.onclick = function() {
        if (UserManager.logged) {
            subscriptionsModal();
        }
        else {
            informalBottomModal("Connectez-vous", "La gestion des souscriptions à des schémas est uniquement possible en étant connecté.");
        }
    }
    container.appendChild(subs_btn);

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

interface SubscriptionObject {
    [formId: string]: [
        string, // Nom du formulaire à afficher à l'utilisateur
        boolean // Formulaire souscrit: oui / non
    ]
}

async function getSubscriptions() : Promise<SubscriptionObject> {
    return fetch(API_URL + "schemas/available.json", {
        headers: new Headers({"Authorization": "Bearer " + UserManager.token}),
        method: "GET",
        mode: "cors"
    }, 30000)
        .then(response => response.json());
}

async function subscribe(ids: string[], fetch_subs: boolean) : Promise<void | FormSchema> {
    const form_data = new FormData();
    form_data.append('ids', ids.join(','));
    if (!fetch_subs) {
        form_data.append('trim_subs', 'true');
    }

    return fetch(API_URL + "schemas/subscribe.json", {
        headers: new Headers({"Authorization": "Bearer " + UserManager.token}),
        method: "POST",
        mode: "cors",
        body: form_data
    }, 60000)
        .then(response => response.json());
}

async function unsubscribe(ids: string[], fetch_subs: boolean) : Promise<void | FormSchema> {
    const form_data = new FormData();
    form_data.append('ids', ids.join(','));
    if (!fetch_subs) {
        form_data.append('trim_subs', 'true');
    }

    return fetch(API_URL + "schemas/unsubscribe.json", {
        headers: new Headers({"Authorization": "Bearer " + UserManager.token}),
        method: "POST",
        mode: "cors",
        body: form_data
    }, 60000)
        .then(response => response.json());
}

async function subscriptionsModal() : Promise<void> {
    const modal = getModal();
    const instance = initModal(
        {outDuration: 100, inDuration: 100}, 
        getModalPreloader(
            "Récupération des souscriptions", 
            `<div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Annuler</a></div>`
        )
    );

    instance.open();

    const content = document.createElement('div');
    content.classList.add('modal-content');

    let subscriptions: SubscriptionObject;
    try {
        subscriptions = await getSubscriptions();
    } catch (e) {
        modal.innerHTML = `
        <div class="modal-content">
            <h5 class="red-text no-margin-top">Erreur</h5>
            <p class="flow-text">Impossible d'obtenir les souscriptions.</p>
        </div>
        <div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Fermer</a></div>
        `;
        return;
    }

    // Construction du contenu du modal
    // <p>
    //   <label>
    //     <input type="checkbox" />
    //     <span>LABEL</span>
    //   </label>
    // </p>
    content.insertAdjacentHTML('beforeend', `<h5 class="no-margin-top">Souscriptions</h5>`);
    content.insertAdjacentHTML('beforeend', `
        <p class="flow-text">
            Gérez vos souscriptions et abonnez-vous à des nouveaux schémas de formulaire ici.
        </p>
    `);

    const row = document.createElement('div');
    row.classList.add('row');
    content.appendChild(row);

    const first_checked: {[formId: string]: true} = {};
    for (const form_id in subscriptions) {
        const p = document.createElement('p');
        const label = document.createElement('label');
        p.appendChild(label);

        const checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.checked = subscriptions[form_id][1];
        checkbox.classList.add('input-subscription-element');
        checkbox.dataset.id = form_id;

        if (checkbox.checked) {
            first_checked[form_id] = true;
        }

        const span = document.createElement('span');
        span.innerText = subscriptions[form_id][0];

        label.appendChild(checkbox);
        label.appendChild(span);

        row.appendChild(p);
    }


    const footer = document.createElement('div');
    footer.classList.add('modal-footer');

    footer.insertAdjacentHTML('beforeend', `<a href="#!" class="btn-flat left red-text modal-close">Annuler</a>`);

    const valid_btn = document.createElement('a');
    valid_btn.classList.add('btn-flat', 'right', 'green-text');
    valid_btn.href = "#!";
    valid_btn.innerText = "Enregistrer";

    // Si demande d'enregistrement > lance la procédure
    valid_btn.onclick = async function() {
        // Récupération des checkbox; cochées et non cochées
        const checkboxes = document.getElementsByClassName('input-subscription-element');

        const to_check: string[] = [];
        const to_uncheck: string[] = [];

        for (const c of checkboxes) {
            const ch = c as HTMLInputElement;

            // Si l'élément est coché et il n'est pas présent dans la liste originale d'éléments cochés
            if (ch.checked && !(ch.dataset.id in first_checked)) {
                to_check.push(ch.dataset.id);
            }

            // Si l'élément est décoché mais il est présent dans la liste originale d'éléments cochés
            else if (!ch.checked && ch.dataset.id in first_checked) {
                to_uncheck.push(ch.dataset.id);
            }
        }

        modal.innerHTML = getModalPreloader("Mise à jour des souscriptions<br>Veuillez ne pas fermer cette fenêtre");
        modal.classList.remove('modal-fixed-footer');

        try {
            // Appel à unsubscribe
            if (to_uncheck.length > 0) {
                await unsubscribe(to_uncheck, false);

                // Suppression des formulaires demandés à être unsub
                for (const f of to_uncheck) {
                    Forms.deleteForm(f);
                }

                Forms.saveForms();
            }

            let subs: FormSchema = undefined;
            // Appel à subscribe
            if (to_check.length > 0) {
                subs = await subscribe(to_check, true) as FormSchema;
            }
    
            showToast("Mise à jour des souscriptions réussie");
            instance.close();

            // Met à jour les formulaires si ils ont changé (appel à subscribe ou unsubscribe)
            if (subs) {
                Forms.schemas = subs;
            }
        } catch (e) {
            showToast("Impossible de mettre à jour les souscriptions.\nVérifiez votre connexion à Internet.");
            instance.close();
        }

        PageManager.reload();
    };

    footer.appendChild(valid_btn);
    footer.insertAdjacentHTML('beforeend', `<div class="clearb"></div>`);

    modal.classList.add('modal-fixed-footer');
    modal.innerHTML = "";
    modal.appendChild(content);
    modal.appendChild(footer);
}
