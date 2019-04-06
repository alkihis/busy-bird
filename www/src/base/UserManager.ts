import { getModal, initModal, getModalPreloader, showToast } from "../utils/helpers";
import { Schemas } from "./FormSchema";
import { Settings } from "../utils/Settings";
import { PageManager } from "./PageManager";
import { APIHandler, APIResp } from "./APIHandler";

/**
 * Permet de gérer l'utilisateur connecté, ou la création d'un nouvel utilisateur.
 * Cette classe doit être instanciée qu'une seule fois.
 */
class _UserManager {
    protected _username: string = null;
    protected _token: string = null;

    /**
     * Initialise l'utilisateur connecté depuis les données sauvegardées.
     */
    constructor() {
        const usr = localStorage.getItem('__username_manager');
        const tkn = localStorage.getItem('__token_manager')

        if (usr && tkn) {
            this._username = usr;
            this._token = tkn;
        }
    }

    public get username() : string {
        return this._username;
    }

    public get token() : string {
        return this._token;
    }

    /**
     * Connecte un utilisateur par son nom d'utilisateur et mot de passe.
     * Renvoie une promesse résolue si connexion réussie, rompue si échec.
     * @param username 
     * @param password 
     */
    public login(username: string, password: string) : Promise<void> {
        return new Promise((resolve, reject) => {
            let data = new FormData();
            data.append("username", username);
            data.append('password', password);

            APIHandler.req("users/login.json", { body: data, method: "POST" }, APIResp.JSON, false)[0]
                .then(json => {
                    if (json.error_code) return Promise.reject(json.error_code);

                    this.logSomeone(username, json.access_token);
                    // On sauvegarde les schémas envoyés
                    if (Array.isArray(json.subscriptions)) {
                        json.subscriptions = {};
                    }

                    Schemas.schemas = json.subscriptions;
                    
                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        }); 
    }

    /**
     * Connecte un utilisateur en interne sans faire d'appel à l'API.
     * @param username 
     * @param token 
     */
    protected logSomeone(username: string, token: string) : void {
        this._token = token;
        this._username = username;
        localStorage.setItem('__username_manager', username);
        localStorage.setItem('__token_manager', token);
    }

    /**
     * Déconnecte l'utilisateur connecté dans l'objet.
     */
    public unlog() : void {
        localStorage.removeItem('__username_manager');
        localStorage.removeItem('__token_manager');
        this._username = null;
        this._token = null;
    }

    public get logged() : boolean {
        return this._username !== null;
    }

    /**
     * Demande à créer un nouvel utilisateur au serveur.
     * @param username 
     * @param password 
     * @param admin_password 
     */
    public async createUser(username: string, password: string, admin_password: string) : Promise<void> {
        const data = new FormData();
        data.append("username", username);
        data.append("password", password);
        data.append("admin_password", admin_password);

        const json = await APIHandler.req("users/create.json", { body: data, method: "POST" }, APIResp.JSON, false)[0];

        if (json.error_code)
            throw json.error_code;

        this.logSomeone(username, json.access_token);
    }
}

export const UserManager = new _UserManager;

export function createNewUser() : void {
    const modal = getModal();
    const instance = initModal({ dismissible: false });
    modal.classList.add('modal-fixed-footer');

    modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">Create new user</h5>
        <form class="row" id="__modal_form_new_user">
            <div class="row col s12 input-field">
                <label for="__user_new">Username</label>
                <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw">Password</label>
                <input type="password" class="validate" required id="__user_psw" name="user_psw">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_r">Password (confirmation)</label>
                <input type="password" class="validate" required id="__user_psw_r" name="user_psw_r">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_a">Administrator password</label>
                <input type="password" class="validate" required id="__user_psw_a" name="user_psw_a">
            </div>
        </form>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat red-text left modal-close">Cancel</a>
        <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Create an user</a>
        <div class="clearb"></div>
    </div>
    `;

    instance.open();

    const orig_psw = document.getElementById('__user_psw') as HTMLInputElement;
    document.getElementById('__user_psw_r').onchange = function(this: GlobalEventHandlers) {
        const e = this as HTMLInputElement;

        if (e.value !== orig_psw.value) {
            e.classList.add('invalid');
            e.classList.remove('valid');
        }
        else {
            e.classList.add('valid');
            e.classList.remove('invalid');
        }
    }

    let modal_save: DocumentFragment = null;

    document.getElementById('__modal_create_new_user').onclick = function() {
        const form = document.getElementById('__modal_form_new_user') as HTMLFormElement;
        
        const name = form.user_new.value.trim();
        const psw = form.user_psw.value.trim();
        const psw_r = form.user_psw_r.value.trim();
        const psw_a = form.user_psw_a.value.trim();

        if (!name) {
            showToast("Name cannot be empty.");
            return;
        }
        if (!psw) {
            showToast("Password cannot be empty.");
            return;
        }
        if (psw !== psw_r) {
            showToast("Password and confirmation should be equal.");
            return;
        }
        if (!psw_a) {
            showToast("Administrator password is needed.");
            return;
        }

        modal_save = document.createDocumentFragment();
        let child: Node;
        while (child = modal.firstChild) {
            modal_save.appendChild(child);
        }
        
        modal.innerHTML = getModalPreloader("Creating user...");
        UserManager.createUser(name, psw, psw_a)
            .then(function() {
                showToast("User has been created successfully.");
                instance.close();
                PageManager.reload();
            }).catch(function(error) {
                console.log(error);
                if (typeof error === 'number') {
                    if (error === 6) {
                        showToast("Administrator password is invalid.");
                    }
                    else if (error === 12) {
                        showToast("This user already exists.");
                    }
                    else {
                        showToast("An unknown error occurred.");
                    }
                }

                modal.innerHTML = "";

                let e: Node;
                while (e = modal_save.firstChild) {
                    modal.appendChild(e);
                }
            });
    };
}

export function loginUser() : Promise<void> {
    return new Promise(function(resolve, reject) {
        const modal = getModal();
        const instance = initModal({ dismissible: false });
    
        modal.innerHTML = `
        <div class="modal-content">
            <h5 class="no-margin-top">Login</h5>
            <form class="row" id="__modal_form_new_user">
                <div class="row col s12 input-field">
                    <label for="__user_new">Username</label>
                    <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
                </div>
                <div class="row col s12 input-field">
                    <label for="__user_psw">Password</label>
                    <input type="password" autocomplete="off" class="validate" required id="__user_psw" name="user_psw">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <a href="#!" id="__modal_cancel_user" class="btn-flat red-text left">Cancel</a>
            <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Login</a>
            <div class="clearb"></div>
        </div>
        `;
    
        instance.open();
        let modal_save: DocumentFragment = null;

        document.getElementById('__modal_cancel_user').onclick = function() {
            instance.close();
            reject();
        }
    
        document.getElementById('__modal_create_new_user').onclick = function() {
            const form = document.getElementById('__modal_form_new_user') as HTMLFormElement;
            
            const name = form.user_new.value.trim();
            const psw = form.user_psw.value.trim();
    
            if (!name) {
                showToast("Name cannot be empty.");
                return;
            }
            if (!psw) {
                showToast("Password cannot be empty.");
                return;
            }
    
            modal_save = document.createDocumentFragment();
            let child: Node;
            while (child = modal.firstChild) {
                modal_save.appendChild(child);
            }
            
            modal.innerHTML = getModalPreloader("Login in...");
            UserManager.login(name, psw)
                .then(function() {
                    showToast("You have been logged in successfully.");
                    instance.close();

                    // RESOLUTION DE LA PROMESSE
                    resolve();
                }).catch(function(error) {
                    if (typeof error === 'number') {
                        if (error === 10) {
                            showToast("This user does not exists.");
                        }
                        else if (error === 11) {
                            showToast("Password is invalid.");
                        }
                        else {
                            showToast("An unknown error occurred.");
                        }
                    }
                    else {
                        showToast(error.message || JSON.stringify(error));
                    }
    
                    modal.innerHTML = "";
    
                    let e: Node;
                    while (e = modal_save.firstChild) {
                        modal.appendChild(e);
                    }
                });
        };
    });
}
