import { UserManager, loginUser, createNewUser } from "../base/UserManager";
import { Settings } from "../utils/Settings";
import { Navigation, PageManager, AppPages } from "../base/PageManager";
import { APP_NAME } from "./home";
import { convertHTMLToElement, showToast, askModal, escapeHTML } from "../utils/helpers";
import { verifyServerURL, subscriptionsModal } from "./settings_page";
import { Schemas } from "../base/FormSchema";

const status_access = '__busy_bird_first_start_status';

let button_previous: HTMLElement;
let button_next: HTMLElement;

export function loadFirstStart(base: HTMLElement) {
    // Premier démarrage
    try { Navigation.destroy(); } catch (e) {}

    const container = convertHTMLToElement("<div class='container relative-container' style='margin-bottom: 70px;'></div>");
    const backcolor = convertHTMLToElement(`<div class="credits-top-element"></div>`);
    base.innerHTML = "";
    base.appendChild(backcolor);
    base.appendChild(container);
    button_previous = convertHTMLToElement(`<a class="btn-floating waves-effect btn-large waves-light blue left hide" style="position: fixed; bottom: 10px; left: 10px;"><i class="material-icons">arrow_back</i></a>`);
    button_next = convertHTMLToElement(`<a class="btn-floating waves-effect btn-large waves-light green right hide" style="position: fixed; bottom: 10px; right: 10px;"><i class="material-icons">arrow_forward</i></a>`);
    base.appendChild(button_previous);
    base.appendChild(button_next);

    if (localStorage.getItem(status_access)) {
        // Charger la bonne étape
        const step = localStorage.getItem(status_access);
        switch (step) {
            case "init": 
                // pass
                break;
            case "api":
                return configureAPIUrl(container);
            case "login":
                return loginOrCreate(container);
            case "subs":
                return subscriptions(container);
            case "finish":
                return finishFirstStart(container);
        }
    }

    localStorage.setItem(status_access, 'init');

    return welcomePage(container);
}

function welcomePage(base: HTMLElement) {
    Navigation.title = "Welcome";
    button_previous.classList.add('hide');
    button_next.classList.remove('hide');
    PageManager.custom_return_fn = undefined;

    base.innerHTML = `
        <h4 class="right-align">${APP_NAME}</h4>
        <h6 class="right-align">Welcome</h6>

        <img src="img/logo.png" style="position: absolute; top: -20px; left: -10px; height: 7rem; z-index: -1;">
        <p class="flow-text">
            We will help you to set up the application for its first start.
        </p>
        <p class="flow-text">
            Tap the next button to continue.
        </p>
    `;

    button_next.onclick = () => {
        localStorage.setItem(status_access, 'api');
        configureAPIUrl(base);
    };
}

function configureAPIUrl(base: HTMLElement) {
    Navigation.title = "Configure API server";

    button_previous.classList.remove('hide');
    button_previous.onclick = back;
    PageManager.custom_return_fn = back;
    
    function back() {
        localStorage.setItem(status_access, 'init');
        welcomePage(base);
    }

    button_next.classList.remove('hide');

    base.innerHTML = `
        <h4 class="right-align">${APP_NAME}</h4>
        <h6 class="right-align">Server</h6>

        <img src="img/logo.png" style="position: absolute; top: -20px; left: -10px; height: 7rem; z-index: -1;">
        <p class="flow-text">
            First of all, you need to select which server will be used to authentificate you, synchronize your data and get form updates.
            <br>
            If you don't know what to put here, contact your system administrator.
        </p>

        <p>
            Protocol "http://" or "https://" is required.
        </p>

        <div class="row">
            <div class="input-field col s12">
                <input id="__api_url_modifier" type="text" value="https://">
                <label for="__api_url_modifier">API URL</label>
            </div>
        </div>

        <p class="flow-text">
            When you think that the URL is correct, tap the next button.
        </p>
    `;

    const input = document.getElementById('__api_url_modifier') as HTMLInputElement;
    if (Settings.api_url) {
        input.value = Settings.api_url;
    }

    M.updateTextFields();

    button_next.onclick = async () => {
        if (input.value.trim() === "" || input.value === "https://") {
            showToast("Impossible de vérifier une URL vide.");
            return;
        }

        // Vérification de l'input
        PageManager.lock_return_button = true;
        const valid = await verifyServerURL(input.value);
        PageManager.lock_return_button = false;

        if (!valid) {
            return;
        }
        
        Settings.api_url = input.value;
 
        // Prochaine page !
        localStorage.setItem(status_access, 'login');
        loginOrCreate(base);
    };
}

function loginOrCreate(base: HTMLElement) {
    Navigation.title = "Account";

    button_previous.classList.remove('hide');
    button_previous.onclick = back;
    PageManager.custom_return_fn = back;
    function back() {
        localStorage.setItem(status_access, 'api');
        configureAPIUrl(base);
    }
    button_next.classList.add('hide');

    base.innerHTML = `
        <h4 class="right-align">${APP_NAME}</h4>
        <h6 class="right-align">Account</h6>

        <img src="img/logo.png" style="position: absolute; top: -20px; left: -10px; height: 7rem; z-index: -1;">
        <p class="flow-text">
            In order to use the application, you need to be logged. If you don't already have an account, don't worry. You can create one now.
        </p>

        <p>
            You need the administrator password to create an account.
        </p>

        <div class="row" id="__row_btn">
            
        </div>

        <p class="flow-text after-login">
            
        </p>
    `;

    function createMessage() {
        (base.querySelector('.after-login') as HTMLElement).innerHTML = `
            All right, <span class="orange-text">${UserManager.username}</span>, you can now tap the next button to jump to the next step.
        `;

        button_next.classList.remove('hide');
        createBtn();
    }

    function createBtn() {
        const row = base.querySelector('#__row_btn') as HTMLElement;

        row.innerHTML = UserManager.logged ? `
            <button id="__unlog_btn" class="col s12 red btn btn-perso btn-margins white-text">Logout</button>
        ` : `
            <button id="__login_btn" class="col s12 blue btn btn-perso btn-margins white-text">Login</button>

            <button id="__create_btn" class="col s12 blue-grey btn btn-perso btn-small-margins">Create account</button>
        `;

        if (UserManager.logged) {
            document.getElementById('__unlog_btn').onclick = function() {
                askModal("Log out ?", "")
                    .then(() => {
                        // L'utilisateur veut se déconnecter
                        UserManager.unlog();
                        // On recharge cette page
                        loginOrCreate(base);
                    })
                    .catch(() => {});
            };
        }
        else {
            document.getElementById('__login_btn').onclick = function() {
                loginUser().then(createMessage).catch(() => {});
            };
        
            document.getElementById('__create_btn').onclick = () => {
                createNewUser().then(createMessage).catch(() => {});
            }
        }
    }

    if (UserManager.logged) {
        createMessage();
    }
    else {
        createBtn();
    }

    button_next.onclick = async () => {
        // Vérification de l'input
        if (!UserManager.logged) {
            showToast('Login first');
            return;
        }
 
        // Prochaine page !
        localStorage.setItem(status_access, 'subs');
        subscriptions(base);
    };
}

function subscriptions(base: HTMLElement) {
    Navigation.title = "Subscriptions";

    button_previous.classList.remove('hide');
    button_previous.onclick = back;
    PageManager.custom_return_fn = back;
    function back() {
        localStorage.setItem(status_access, 'login');
        loginOrCreate(base);
    }

    button_next.classList.remove('hide');

    base.innerHTML = `
        <h4 class="right-align">${APP_NAME}</h4>
        <h6 class="right-align">Subscriptions</h6>

        <img src="img/logo.png" style="position: absolute; top: -20px; left: -10px; height: 7rem; z-index: -1;">
        <p class="flow-text">
            Last step, you can now subscribe to the form models of your interest (if server already have some).
            Just tap the button below.
        </p>

        <p class="flow-text" id="__current_subs"></p>

        <div class="row">
            <button id="__subs_btn" class="col s12 purple btn btn-perso btn-small-margins">Manage subscriptions</button>
        </div>
    `;

    function createMessage() {
        const available = Schemas.available();

        if (available.length) {
            const str = available.map(e => '<span class="first-sub-element">' + e[1] + '</span>').join('<br>');
    
            document.getElementById('__current_subs').innerHTML = "Current subscriptions:<br>" + str;
        }
        else {
            document.getElementById('__current_subs').innerHTML = "";
        }
    }
    
    createMessage();

    document.getElementById('__subs_btn').onclick = () => {
        subscriptionsModal().then(createMessage);
    }

    button_next.onclick = async () => { 
        // Prochaine page !
        localStorage.setItem(status_access, 'finish');
        finishFirstStart(base);
    };
}

function finishFirstStart(base: HTMLElement) {
    Navigation.title = "First start";

    button_previous.classList.remove('hide');
    button_previous.onclick = back;
    PageManager.custom_return_fn = back;
    function back() {
        localStorage.setItem(status_access, 'subs');
        subscriptions(base);
    }

    button_next.classList.remove('hide');

    base.innerHTML = `
        <h4 class="right-align">${APP_NAME}</h4>
        <h6 class="right-align">Finish</h6>

        <img src="img/logo.png" style="position: absolute; top: -20px; left: -10px; height: 7rem; z-index: -1;">

        <h5 class="no-margin-top">It's over !</h5>
        <p class="flow-text">
            Here's a sum up of the informations you've given to the app.
        </p>
        <p class="flow-text" id="__infos_first"></p>

        <p class="flow-text">
            To correct any information, use the back button.
            If it's all right, you can now tap the next button !
        </p>
    `;

    // Initialise infos
    const infos = document.getElementById('__infos_first');
    // Utilisateur
    const user = `<span class="orange-text">${UserManager.username}</span> is logged in.`;
    // Abonnements
    const avail = Schemas.available();
    const subs = avail.length ? avail.map(e => '<span class="first-sub-element">' + e[1] + '</span>').join('<br>') : "You don't have any subscription.";
    // Schéma courant
    const current = avail.length ? avail[0][1] : "";

    infos.innerHTML = `
        <h5>${APP_NAME} server</h5>
        ${escapeHTML(Settings.api_url)}
        <h5>User</h5>
        ${user}
        <h5>Subscriptions</h5>
        ${subs}
        ${current ? `
            <h5>Selected model</h5>
            <span class="first-sub-element">${current}</span> is selected. You can change the selected model later in settings.
        ` : ''}
    `;

    button_next.onclick = () => {
        if (avail.length) {
            // Autoactive le premier schéma disponible comme schéma choisi
            Schemas.change(avail[0][0], true);
        }

        // Terminé !
        localStorage.setItem('__busy_bird_first_start_done', 'true');
        Navigation.init();
        PageManager.change(AppPages.home);
    };
}

export function isFirstStart() : boolean {
    return !localStorage.getItem('__busy_bird_first_start_done');
}
