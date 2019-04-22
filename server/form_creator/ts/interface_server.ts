import { initModal, getModal } from "./form.js";
import { User, Settings } from "./server.js";
import { informalModal } from "./helpers.js";

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

    const username = document.getElementById('user_login') as HTMLInputElement;
    const password = document.getElementById('user_psw') as HTMLInputElement;
    const button = document.getElementsByClassName('login-button')[0] as HTMLElement;

    const login_func = async function() {
        button.onclick = undefined;

        try {
            await User.login(username.value, password.value);
            M.toast({html: "You've been successfully logged in"});
            instance.close();
        } catch (e) {
            M.toast({html: "Username or password is invalid"});
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
        <h5 class="no-margin-top">Server</h5>
        <div class="input-field col s12">
            <input id="api_url_sett" type="text">
            <label for="api_url_sett">API URL</label>
        </div>
        <div class="clearb"></div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat orange-text left" id="__to_server_toolbox">Go to server toolbox</a>
        <a href="#!" class="modal-close btn-flat">Close</a>
        <a href="#!" class="blue-text save-button btn-flat">Save</a>
        <div class="clearb"></div>
    </div>
    `;

    const api_url_sett = document.getElementById('api_url_sett') as HTMLInputElement;
    api_url_sett.value = Settings.api_url;
    const button = document.getElementsByClassName('save-button')[0] as HTMLElement;

    const save_func = async function() {
        Settings.api_url = api_url_sett.value;
        instance.close();
    };

    document.getElementById('__to_server_toolbox').onclick = function() {
        if (!User.logged) {
            M.toast({html: "You must be logged to access server toolbox."});
            return;
        }
        toolbox(modal);
    };

    button.onclick = save_func;

    instance.open();
    M.updateTextFields();
}

function toolbox(modal: HTMLElement) {
    modal.innerHTML = `
    <div class="modal-content row">
        <h5 class="no-margin-top">Server toolbox</h5>
        <h6>Modify a user status</h6>
        <p>Only administrators are able to push form models.</p>
        <div class="input-field col s12">
            <input id="usrn_to_make" type="text">
            <label for="usrn_to_make">Targeted username</label>
        </div>
        <div class="input-field col s12">
            <select id="status_to_make">
                <option value="basic">Basic user</option>
                <option value="admin">Administrator user</option>
            </select>
            <label>New status</label>
        </div>
        <div class="input-field col s12">
            <input id="pass_to_make" type="password" placeholder="Not required if you're already an administrator">
            <label for="pass_to_make">Administrator password</label>
        </div>
        <div class="clearb"></div>

        <div class="btn-flat blue-text right" id="__make_user_admin">Update</div>
        <div class="clearb"></div>

        <div class="divider divider-margin"></div>

        <h6>Change your password</h6>
        <div class="input-field col s12">
            <input id="__old_psw" type="password">
            <label for="__old_psw">Old password</label>
        </div>
        <div class="input-field col s12">
            <input id="__new_psw" type="password">
            <label for="__new_psw">New password</label>
        </div>
        <div class="input-field col s12">
            <input id="__new_psw2" type="password">
            <label for="__new_psw2">New password (again)</label>
        </div>
        <div class="clearb"></div>

        <div class="btn-flat green-text right" id="__chg_password">Update password</div>
        <div class="clearb"></div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="modal-close btn-flat">Close</a>
    </div>
    `;
    modal.classList.add('modal-fixed-footer');

    M.FormSelect.init(modal.querySelector('select'));
    M.updateTextFields();

    ////// Change status
    document.getElementById('__make_user_admin').onclick = async () => {
        const username = document.getElementById('usrn_to_make') as HTMLInputElement;
        const status = document.getElementById('status_to_make') as HTMLSelectElement;
        const admin_p = document.getElementById('pass_to_make') as HTMLInputElement;

        // Charge le formulaire .dataset.id
        const instance_info = informalModal("Changing status...", "Please wait", false, true);

        const resp = await User.req('users/upgrade.json', "POST", { 
            username: username.value,  
            status: status.value,
            admin_password: admin_p.value
        });

        if (!resp.ok) {
            M.toast({html: "Unable to change status. Admin password may be invalid or you're not allowed to do that."});
            instance_info.close();
            return;
        }

        M.toast({html: "Status has been updated successfully."});

        instance_info.close();
    };

    ////// Change password
    document.getElementById('__chg_password').onclick = async () => {
        const old = document.getElementById('__old_psw') as HTMLInputElement;
        const newone = document.getElementById('__new_psw') as HTMLInputElement;
        const repeat = document.getElementById('__new_psw2') as HTMLInputElement;

        if (newone.value.trim() === "") {
            return;
        }
        if (newone.value !== repeat.value) {
            M.toast({html: "Passwords must match."});
            return;
        }

        // Charge le formulaire .dataset.id
        const instance_info = informalModal("Updating password", "Please wait", false, true);

        const resp = await User.req('users/password.json', "POST", { 
            old: old.value,  
            new: newone.value
        });

        if (!resp.ok) {
            M.toast({html: "Unable to change password. Check your old password."});
            instance_info.close();
            return;
        }

        M.toast({html: "Password has been updated successfully."});

        instance_info.close();
    };
}
