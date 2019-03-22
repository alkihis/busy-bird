import { UserManager, loginUser, createNewUser } from "../base/UserManager";
import { Schemas, FormSchema } from "../base/FormSchema";
import { askModal, initModal, getModalPreloader, informalBottomModal, showToast, getModal, convertHTMLToElement, convertMinutesToText, escapeHTML } from "../utils/helpers";
import { SyncManager } from "../base/SyncManager";
import { PageManager } from "../base/PageManager";
import fetch from '../utils/fetch_timeout';
import { SYNC_FREQUENCY_POSSIBILITIES } from "../main";
import { APP_NAME } from "./home";
import { Settings, getAvailableLanguages } from '../utils/Settings';

/** 
 * Lance la mise à jour des schémas via le serveur
 */
function formActualisationModal() : void {
    const instance = initModal({dismissible: false}, getModalPreloader("Actualisation..."));
    instance.open();

    Schemas.forceSchemaDownloadFromServer()
        .then(() => {
            showToast("Actualisation terminée.");
            instance.close();
            PageManager.reload();
        })
        .catch(() => {
            showToast("Impossible d'actualiser les schémas.");
            instance.close();
        })
}

/**
 * Base pour la page des paramètres
 * @param base Element dans lequel écrire
 */
export function initSettingsPage(base: HTMLElement) {
    const connecte = UserManager.logged;

    base.innerHTML = `
    <div class="container row" id="main_settings_container">
        <h4>Utilisateur</h4>
        <p class="flow-text no-margin-bottom">${UserManager.logged ? 
            "Vous êtes connecté-e en tant que <span class='orange-text text-darken-2'>" + UserManager.username + "</span>" 
            : "Vous n'êtes pas connecté-e"}.</p>
    </div>
    `;

    ////// DEFINITION DU BOUTON DE CONNEXION
    const container = document.getElementById('main_settings_container');
    const button = document.createElement('button');
    container.appendChild(button);

    if (connecte) {
        button.type = "button";
        button.innerHTML = "Déconnexion";
        button.classList.remove('blue');
        button.classList.add('col', 's12', 'red', 'btn', 'btn-perso', 'btn-margins');


        button.onclick = function() {
            askModal("Se déconnecter ?", "Vous ne pourrez pas saisir une entrée de formulaire tant que vous ne serez pas reconnecté-e.")
                .then(function() {
                    // L'utilisateur veut se déconnecter
                    UserManager.unlog();
                    PageManager.reload();
                })
                .catch(function() {
                    // L'utilisateur ne se déconnecte pas, finalement
                });
        };
    }
    else {
        button.type = "button";
        button.innerHTML = "Se connecter";
        button.classList.remove('red');
        button.classList.add('col', 's12', 'blue', 'btn', 'btn-perso', 'btn-margins', 'white-text');

        button.onclick = function() {
            loginUser().then(function() {
                PageManager.reload();
            }).catch(() => {});
        };
    }

    // Si l'utilisateur n'est pas connecté, on propose de créer un compte
    if (!connecte) {
        const createaccbtn = document.createElement('button');
        createaccbtn.classList.add('col', 's12', 'blue-grey', 'btn', 'btn-perso', 'btn-small-margins');
        createaccbtn.innerHTML = "Créer un compte";
        createaccbtn.style.marginTop = "-5px";
        createaccbtn.onclick = createNewUser;
        container.appendChild(createaccbtn);
    }

    /////// PARTIE DEUX: FORMULAIRES
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Formulaires</h4>
    <h5>Schéma actif</h5>
    <p class="flow-text">
        Ce schéma d'entrée correspond à celui proposé dans la page "Nouvelle entrée".
    </p>
    `);
    // Choix du formulaire actif
    const select = document.createElement('select');
    select.classList.add('material-select');

    container.appendChild(select);
    
    Schemas.onReady(function() {
        const available = [["", "Aucun"], ...Schemas.available()];

        for (const option of available) {
            const o = document.createElement('option');
            o.value = option[0];
            o.innerText = option[1];

            if (option[0] === Schemas.current_key || (option[0] === "" && Schemas.current_key === null)) {
                o.selected = true;
            }
            select.appendChild(o);
        }

        M.FormSelect.init(select);
    });

    select.addEventListener('change', function() {
        const value = select.value || null;

        if (Schemas.exists(value)) {
            Schemas.change(value, true);
        }
    });

    // Bouton pour accéder aux souscriptions
    container.insertAdjacentHTML('beforeend', `
    <h5>Souscriptions aux schémas</h5>
    <p class="flow-text">
        Les schémas de formulaires sont les types de formulaires vous étant proposés à la saisie dans ${APP_NAME}.
        ${UserManager.logged ? `
            Consultez et modifiez ici les différents schémas auquel l'application autorise "${UserManager.username}" à remplir.
        ` : ''}
    </p>
    `);

    const subs_btn = document.createElement('button');
    subs_btn.classList.add('col', 's12', 'purple', 'btn', 'btn-perso', 'btn-small-margins');
    subs_btn.innerHTML = "Gérer souscriptions";
    subs_btn.onclick = function() {
        if (UserManager.logged) {
            subscriptionsModal();
        }
        else {
            informalBottomModal("Connectez-vous", "La gestion des souscriptions à des schémas est uniquement possible en étant connecté.");
        }
    }
    container.appendChild(subs_btn);

    // Bouton pour actualiser les schémas
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <h5>Actualiser les schémas</h5>
    <p class="flow-text">
        Une actualisation automatique est faite à chaque démarrage de l'application.
        Si vous pensez que les schémas auquel vous avez souscrit ont changé depuis le dernier
        démarrage, vous pouvez les actualiser.
    </p>
    `);

    const formbtn = document.createElement('button');
    formbtn.classList.add('col', 's12', 'green', 'btn', 'btn-perso', 'btn-small-margins');
    formbtn.innerHTML = "Actualiser schémas formulaire";
    formbtn.onclick = function() {
        if (UserManager.logged) {
            askModal(
                "Actualiser les schémas ?", 
                "L'actualisation des schémas de formulaire récupèrera les schémas à jour depuis le serveur du LBBE."
            )
            .then(formActualisationModal)
            .catch(() => {});
        }
        else {
            informalBottomModal("Connectez-vous", "L'actualisation des schémas est uniquement possible en étant connecté.");
        }
    }
    container.appendChild(formbtn);

    //// PARTIE TROIS: SYNCHRONISATION
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Synchronisation</h4>
    <h5>Arrière-plan</h5>
    <p class="flow-text">
        L'application tente de synchroniser régulièrement les entrées 
        si une connexion à Internet est disponible.
    </p>
    `);

    // Select pour choisir la fréquence de synchro
    const select_field = convertHTMLToElement('<div class="input-field col s12"></div>');
    const select_input = document.createElement('select');
    
    for (const minutes of SYNC_FREQUENCY_POSSIBILITIES) {
        const opt = document.createElement('option');
        opt.value = String(minutes);
        opt.innerText = convertMinutesToText(minutes);
        opt.selected = minutes === Settings.sync_freq;
        select_input.appendChild(opt);
    }

    select_input.onchange = function(this: GlobalEventHandlers) {
        Settings.sync_freq = Number((this as HTMLSelectElement).value);
        SyncManager.changeBackgroundSyncInterval(Settings.sync_freq);
    };

    const select_label = document.createElement('label');
    select_label.innerText = "Fréquence de synchronisation";
    select_field.appendChild(select_input);
    select_field.appendChild(select_label);

    container.appendChild(select_field);

    // Initialisation du select materialize
    M.FormSelect.init(select_input);

    // Checkbox pour activer sync en arrière plan
    container.insertAdjacentHTML('beforeend', `
        <p style="margin-bottom: 20px">
            <label>
                <input type="checkbox" id="__sync_bg_checkbox_settings" ${Settings.sync_bg ? 'checked' : ''}>
                <span>Activer la synchronisation en arrière-plan</span>
            </label>
        </p>`);

    document.getElementById('__sync_bg_checkbox_settings').onchange = function(this: GlobalEventHandlers) {
        Settings.sync_bg = (this as HTMLInputElement).checked;
        if (Settings.sync_bg) {
            SyncManager.startBackgroundSync();
        }
        else {
            SyncManager.stopBackgroundSync();
        }
    };

    // Bouton pour forcer sync
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <h5>Forcer synchronisation</h5>
    <p class="flow-text">
        La synchronisation standard se trouve dans la page des entrées.
        Vous pouvez forcer le renvoi complet des données vers le serveur,
        y compris celles déjà synchronisées, ici. 
    </p>
    `);

    const syncbtn = document.createElement('button');
    syncbtn.classList.add('col', 's12', 'orange', 'btn', 'btn-perso', 'btn-small-margins');
    syncbtn.innerHTML = "Tout resynchroniser";
    syncbtn.onclick = function() {
        if (UserManager.logged) {
            askModal(
                "Tout synchroniser ?", 
                "Veillez à disposer d'une bonne connexion à Internet.\
                Vider le cache obligera à resynchroniser tout l'appareil, même si vous annulez la synchronisation.",
                "Oui",
                "Non",
                "Vider cache de synchronisation"
            ).then(checked_val => {
                // L'utilisateur a dit oui
                SyncManager.graphicalSync(true, checked_val);
            });
        }
        else {
            informalBottomModal("Connectez-vous", "Vous devez vous connecter pour effectuer cette action.");
        }
    }
    container.appendChild(syncbtn);

    //// PARTIE QUATRE: URL API
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>${APP_NAME} server</h4>
    <h5>Server location</h5>
    <p class="flow-text">
        Current location is <span class="blue-text text-darken-2 api-url">${escapeHTML(Settings.api_url)}</span>.
    </p>
    `);

    const changeapibutton = document.createElement('button');
    changeapibutton.className = "teal darken-4 col s12 btn btn-perso btn-small-margins"
    changeapibutton.innerHTML = "Change API URL";
    changeapibutton.onclick = changeURL;

    container.appendChild(changeapibutton);

    //// PARTIE CINQ: VOICE RECO LANG
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Voice recognition language</h4>
    <p class="flow-text">
        Choose language used for voice recognition.
    </p>
    `);

    const changelangselection = document.createElement('select');
    
    for (const opt of getAvailableLanguages()) {
        const o = document.createElement('option');
        o.value = opt;
        o.innerText = opt;

        if (opt === Settings.voice_lang) {
            o.selected = true;
        }

        changelangselection.appendChild(o);
    }

    changelangselection.onchange = function () {
        Settings.voice_lang = changelangselection.value;
    };

    container.appendChild(changelangselection);
    M.FormSelect.init(changelangselection);
}

// Modal API URL
function changeURL() : void {
    const modal = getModal();
    const instance = initModal();

    modal.innerHTML = `
    <div class="modal-content row">
        <h5 class="no-margin-top">API URL</h5>
        <p>
            Make sure you know what you're doing !
            This will change the location where ${APP_NAME} send forms and download form models.
            <br>
            If you want to build our own ${APP_NAME} server, please check the docs.
        </p>

        <div class="input-field col s12">
            <input id="__api_url_modifier" type="text">
            <label for="__api_url_modifier">API URL</label>
        </div>
    </div>
    <div class="modal-footer">
        <a class="btn-flat modal-close red-text">Close</a>
        <a class="btn-flat green-text" id="__api_url_save">Save</a>
    </div>
    `;

    const input = document.getElementById("__api_url_modifier") as HTMLInputElement;
    input.value = Settings.api_url;

    document.getElementById('__api_url_save').onclick = () => {
        try {
            Settings.api_url = input.value;
            instance.close();
            modal.innerHTML = "";
            (document.querySelector('span.api-url') as HTMLElement).innerText = Settings.api_url;
        } catch (e) {
            showToast("Specified URL is not a valid URL.");
        }
    }

    M.updateTextFields();

    instance.open();
}

// FONCTIONS RELATIVES AUX SOUSCRIPTIONS

/**
 * Représente un élément renvoyé par l'API de souscription
 */
interface SubscriptionObject {
    [formId: string]: [
        string, // Nom du formulaire à afficher à l'utilisateur
        boolean // Formulaire souscrit: oui / non
    ]
}

/**
 * Obtient les souscriptions disponibles depuis le serveur
 */
async function getSubscriptions() : Promise<SubscriptionObject> {
    return fetch(Settings.api_url + "schemas/available.json", {
        headers: new Headers({"Authorization": "Bearer " + UserManager.token}),
        method: "GET",
        mode: "cors"
    }, 30000)
        .then(response => response.json());
}

/**
 * Procédure d'abonnement à des schémas
 * @param ids Identifiants des schémas auquels s'abonner
 * @param fetch_subs Retourner les schémas après souscription: oui, non
 */
async function subscribe(ids: string[], fetch_subs: boolean) : Promise<void | FormSchema> {
    const form_data = new FormData();
    form_data.append('ids', ids.join(','));
    if (!fetch_subs) {
        form_data.append('trim_subs', 'true');
    }

    return fetch(Settings.api_url + "schemas/subscribe.json", {
        headers: new Headers({"Authorization": "Bearer " + UserManager.token}),
        method: "POST",
        mode: "cors",
        body: form_data
    }, 60000)
        .then(response => response.json());
}

/**
 * Procédure de désabonnement à des schémas
 * @param ids Identifiants des schémas auquels se désabonner
 * @param fetch_subs Retourner la liste de schémas actualisée après désincription: oui, non
 */
async function unsubscribe(ids: string[], fetch_subs: boolean) : Promise<void | FormSchema> {
    const form_data = new FormData();
    form_data.append('ids', ids.join(','));
    if (!fetch_subs) {
        form_data.append('trim_subs', 'true');
    }

    return fetch(Settings.api_url + "schemas/unsubscribe.json", {
        headers: new Headers({"Authorization": "Bearer " + UserManager.token}),
        method: "POST",
        mode: "cors",
        body: form_data
    }, 60000)
        .then(response => response.json());
}

/**
 * Lance le modal de gestion des souscriptions
 */
async function subscriptionsModal() : Promise<void> {
    // Initialise le modal
    const modal = getModal();
    const instance = initModal(
        { inDuration: 200, outDuration: 150 }, 
        getModalPreloader(
            "Récupération des souscriptions", 
            `<div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Annuler</a></div>`
        )
    );

    // Ouvre le modal
    instance.open();

    // Obtient les souscriptions disponibles
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
    // Construit la liste de souscriptions
    content.insertAdjacentHTML('beforeend', `<h5 class="no-margin-top">Souscriptions</h5>`);
    content.insertAdjacentHTML('beforeend', `
        <p class="flow-text">
            Gérez vos souscriptions et abonnez-vous à des nouveaux schémas de formulaire ici.
            Cochez pour vous abonner.
        </p>
    `);

    const row = document.createElement('div');
    row.classList.add('row');
    content.appendChild(row);

    // Construit les checkboxs et note les éléments qui sont cochés 
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


    // Création du footer
    const footer = document.createElement('div');
    footer.classList.add('modal-footer');

    footer.insertAdjacentHTML('beforeend', `<a href="#!" class="btn-flat left red-text modal-close">Annuler</a>`);

    // Bouton d'enregistrement
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
                    Schemas.delete(f, false);
                }

                Schemas.save();
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
                Schemas.schemas = subs;
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
