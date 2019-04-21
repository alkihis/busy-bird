import { initModal, getModal } from "./form.js";
import { User, Settings } from "./server.js";
export function loginModal() {
    const instance = initModal();
    const modal = getModal();
    modal.innerHTML = `
    <div class="modal-content row">
        <h5 class="no-margin-top">Login</h5>
        <div class="input-field col s12">
            <input id="user_login" type="text" required>
            <label for="user_login">Username</label>
        </div>
        <div class="input-field col s12">
            <input id="user_psw" type="password" required>
            <label for="user_psw">Password</label>
        </div>
        <div class="clearb"></div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="modal-close btn-flat">Close</a>
        <a href="#!" class="blue-text login-button btn-flat">Login</a>
    </div>
    `;
    const username = document.getElementById('user_login');
    const password = document.getElementById('user_psw');
    const button = document.getElementsByClassName('login-button')[0];
    const login_func = async function () {
        button.onclick = undefined;
        try {
            await User.login(username.value, password.value);
            M.toast({ html: "You've been successfully logged in" });
            instance.close();
        }
        catch (e) {
            M.toast({ html: "Username or password is invalid" });
        }
        button.onclick = login_func;
    };
    button.onclick = login_func;
    instance.open();
}
export function settings() {
    const instance = initModal();
    const modal = getModal();
    modal.innerHTML = `
    <div class="modal-content row">
        <h5 class="no-margin-top">Settings</h5>
        <div class="input-field col s12">
            <input id="api_url_sett" type="text">
            <label for="api_url_sett">API URL</label>
        </div>
        <div class="clearb"></div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="modal-close btn-flat">Close</a>
        <a href="#!" class="blue-text save-button btn-flat">Save</a>
    </div>
    `;
    const api_url_sett = document.getElementById('api_url_sett');
    api_url_sett.value = Settings.api_url;
    const button = document.getElementsByClassName('save-button')[0];
    const save_func = async function () {
        Settings.api_url = api_url_sett.value;
        instance.close();
    };
    button.onclick = save_func;
    instance.open();
    M.updateTextFields();
}
