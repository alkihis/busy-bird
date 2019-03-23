import { UserManager, loginUser, createNewUser } from "../base/UserManager";
import { Schemas, FormSchema } from "../base/FormSchema";
import { askModal, initModal, getModalPreloader, informalBottomModal, showToast, getModal, convertHTMLToElement, convertMinutesToText, escapeHTML, initBottomModal } from "../utils/helpers";
import { SyncManager } from "../base/SyncManager";
import { PageManager } from "../base/PageManager";
import fetch from '../utils/fetch_timeout';
import { SYNC_FREQUENCY_POSSIBILITIES } from "../main";
import { APP_NAME } from "./home";
import { Settings, getAvailableLanguages } from '../utils/Settings';

let select_for_schema: HTMLSelectElement = null;

/** 
 * Lance la mise à jour des schémas via le serveur
 */
function formActualisationModal() : void {
    const instance = initModal({dismissible: false}, getModalPreloader("Updating..."));
    instance.open();

    Schemas.forceSchemaDownloadFromServer()
        .then(() => {
            showToast("Update complete.");
            instance.close();
            PageManager.reload();
        })
        .catch(() => {
            showToast("Unable to update form models.");
            instance.close();
        })
}

function constructSelectForSchemas(select: HTMLSelectElement) {
    select_for_schema = select;

    select.innerHTML = "";

    const available = [["", "None"], ...Schemas.available()];

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
}

/**
 * Base pour la page des paramètres
 * @param base Element dans lequel écrire
 */
export function initSettingsPage(base: HTMLElement) {
    const connecte = UserManager.logged;

    base.innerHTML = `
    <div class="container row" id="main_settings_container">
        <h4>User</h4>
        <p class="flow-text no-margin-bottom">${UserManager.logged ? 
            "You are currently logged as <span class='orange-text text-darken-2'>" + UserManager.username + "</span>" 
            : "You are not logged in"}.</p>
    </div>
    `;

    ////// DEFINITION DU BOUTON DE CONNEXION
    const container = document.getElementById('main_settings_container');
    const button = document.createElement('button');
    container.appendChild(button);

    if (connecte) {
        button.type = "button";
        button.innerHTML = "Log out";
        button.classList.remove('blue');
        button.classList.add('col', 's12', 'red', 'btn', 'btn-perso', 'btn-margins');


        button.onclick = function() {
            askModal("Log out ?", "You can't make new entries until you're logged in again.")
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
        button.innerHTML = "Login";
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
        createaccbtn.innerHTML = "Create an account";
        createaccbtn.style.marginTop = "-5px";
        createaccbtn.onclick = createNewUser;
        container.appendChild(createaccbtn);
    }

    /////// PARTIE DEUX: FORMULAIRES
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Forms</h4>
    <h5>Active model</h5>
    <p class="flow-text">
        Active model is the model to the proposed one in "new entry" page.
    </p>
    `);
    // Choix du formulaire actif
    const select = document.createElement('select');
    select.classList.add('material-select');

    container.appendChild(select);
    constructSelectForSchemas(select);

    select.addEventListener('change', function() {
        const value = select.value || null;

        if (Schemas.exists(value)) {
            Schemas.change(value, true);
        }
    });

    // Bouton pour accéder aux souscriptions
    container.insertAdjacentHTML('beforeend', `
    <h5>Model subscriptions</h5>
    <p class="flow-text">
        Form model are the forms eligibles for filling in ${APP_NAME}.
        ${UserManager.logged ? `
            Manage the differents models that the application allows "${UserManager.username}" to fill.
        ` : ''}
    </p>
    `);

    const subs_btn = document.createElement('button');
    subs_btn.classList.add('col', 's12', 'purple', 'btn', 'btn-perso', 'btn-small-margins');
    subs_btn.innerHTML = "Manage subscriptions";
    subs_btn.onclick = function() {
        if (UserManager.logged) {
            subscriptionsModal();
        }
        else {
            informalBottomModal("Log in", "Subscription management is allowed to logged users only.");
        }
    }
    container.appendChild(subs_btn);

    // Bouton pour actualiser les schémas
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <h5>Update models</h5>
    <p class="flow-text">
        An automatic update is realized at every application startup.
        If you think subscribed models has been changed since the last startup, you could
        update them here.
    </p>
    `);

    const formbtn = document.createElement('button');
    formbtn.classList.add('col', 's12', 'green', 'btn', 'btn-perso', 'btn-small-margins');
    formbtn.innerHTML = "Update models";
    formbtn.onclick = function() {
        if (UserManager.logged) {
            askModal(
                "Update form models ?", 
                "Form models will be updated from server."
            )
            .then(formActualisationModal)
            .catch(() => {});
        }
        else {
            informalBottomModal("Log in", "Update of form models are only available if you're logged in.");
        }
    }
    container.appendChild(formbtn);

    //// PARTIE TROIS: SYNCHRONISATION
    container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Synchronisation</h4>
    <h5>Background sync</h5>
    <p class="flow-text">
        ${APP_NAME} tries to periodically sync entries if a good Internet
        connection is available.
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
    select_label.innerText = "Synchronisation interval";
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
                <span>Enable background synchronisation</span>
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
    <h5>Force synchronisation</h5>
    <p class="flow-text">
        Standard sync is located in entries page.
        You could force to send all device entries, even for already synced forms, here.
    </p>
    `);

    const syncbtn = document.createElement('button');
    syncbtn.classList.add('col', 's12', 'orange', 'btn', 'btn-perso', 'btn-small-margins');
    syncbtn.innerHTML = "Synchronize all";
    syncbtn.onclick = function() {
        if (UserManager.logged) {
            askModal(
                "Synchronize all ?", 
                "Take care of having a decent Internet connection.\
                Empty cache force to sync all device's files, even if you cancel sync.",
                "Yes",
                "No",
                "Empty sync cache"
            ).then(checked_val => {
                // L'utilisateur a dit oui
                SyncManager.graphicalSync(true, checked_val);
            });
        }
        else {
            informalBottomModal("Log in", "You should be logged in to perform this action.");
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

/**
 * Modal pour changer l'URL du serveur Busy Bird
 */
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

    document.getElementById('__api_url_save').onclick = async () => {
        try {
            if (Settings.api_url !== input.value) {
                PageManager.lock_return_button = true;
                const valid = await verifyServerURL(input.value);
                PageManager.lock_return_button = false;

                if (!valid) {
                    return;
                }
            }
            
            Settings.api_url = input.value;
            instance.close();
            modal.innerHTML = "";
            (document.querySelector('span.api-url') as HTMLElement).innerText = Settings.api_url;
        } catch (e) {
            showToast("Specified URL is not a valid URL.");
        }
    };

    M.updateTextFields();

    instance.open();
}

/**
 * Vérifie si l'url est un serveur Busy Bird-compatible
 * @param url 
 */
async function verifyServerURL(url: string) : Promise<boolean> {
    // Vérifie si le serveur existe
    const f_data = new FormData;
    if (UserManager.logged) {
        f_data.append("username", UserManager.username);
        f_data.append("token", UserManager.token);
    }

    const instance = initBottomModal({ dismissible: false }, getModalPreloader("Just a second..."));
    instance.open();

    try {
        const resp = await fetch(url.replace(/\/$/, '') + "/users/validate.json", {
            method: "POST",
            body: f_data,
            mode: "no-cors"
        }, 60000).then(resp => resp.json());

        if (resp.error_code) {
            if (UserManager.logged) {
                if (resp.error_code === 16) {
                    showToast("Current logged user does not exists in new source server. You will be unlogged automatically.");
                    UserManager.unlog(); instance.close(); return true;
                }
                else if (resp.error_code === 15) {
                    showToast("An user does have the same username as yours in new source server, but it don't seems to be you. You will be unlogged.");
                    UserManager.unlog(); instance.close(); return true;
                }
            }
            
            showToast("An unknown error occurred. (error code " + resp.error_code + ")");
        }
        else {
            if (resp.subscriptions) {
                // On met à jour les souscriptions
                // On recharge pas la page... On suppose que c'est les mêmes, tant pis
                Schemas.schemas = resp.subscriptions;
                constructSelectForSchemas(select_for_schema);
            }
            else {
                // L'utilisateur n'est pas pas précisé
            }
            instance.close(); return true;
        }
    } catch (e) {
        showToast("Unable to find a " + APP_NAME + " compatible server at this address.");
    }

    instance.close();
    return false;
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
            "Fetching subscriptions", 
            `<div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Cancel</a></div>`
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
            <h5 class="red-text no-margin-top">Error</h5>
            <p class="flow-text">Unable to obtain subscriptions.</p>
        </div>
        <div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Close</a></div>
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
    content.insertAdjacentHTML('beforeend', `<h5 class="no-margin-top">Subscriptions</h5>`);
    content.insertAdjacentHTML('beforeend', `
        <p class="flow-text">
            Manage your subscriptions and subscribe to new form models here. Check to subscribe.
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

    footer.insertAdjacentHTML('beforeend', `<a href="#!" class="btn-flat left red-text modal-close">Cancel</a>`);

    // Bouton d'enregistrement
    const valid_btn = document.createElement('a');
    valid_btn.classList.add('btn-flat', 'right', 'green-text');
    valid_btn.href = "#!";
    valid_btn.innerText = "Save";

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

        modal.innerHTML = getModalPreloader("Updating subscriptions<br>Please do not close this window");
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
    
            showToast("Subscription update complete");
            instance.close();

            // Met à jour les formulaires si ils ont changé (appel à subscribe ou unsubscribe)
            if (subs) {
                Schemas.schemas = subs;
            }
        } catch (e) {
            showToast("Unable to update subscriptions.\nCheck your Internet connection.");
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
