import { API_URL } from "./main";
import { getModal, initModal, getModalPreloader, showToast } from "./helpers";
import { Schemas } from "./form_schema";

/**
 * Permet de gérer l'utilisateur connecté, ou la création d'un nouvel utilisateur.
 * Cette classe doit être instanciée qu'une seule fois.
 */
class _UserManager {
    protected _username = null;
    protected _token = null;

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

            fetch(API_URL + "users/login.json", {body: data, method: 'POST'})
                .then((response) => {
                    return response.json();
                })
                .then((json) => {
                    if (json.error_code) throw json.error_code;

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
    public createUser(username: string, password: string, admin_password: string) : Promise<void> {
        const data = new FormData();
        data.append("username", username);
        data.append("password", password);
        data.append("admin_password", admin_password);

        return new Promise((resolve, reject) => {
            fetch(API_URL + "users/create.json", {
                method: "POST",
                body: data
            }).then((response) => {
                return response.json();
            }).then((json) => {
                if (json.error_code) throw json.error_code;

                this.logSomeone(username, json.access_token);
                resolve();
            }).catch((error) => {
                reject(error);
            });
        }); 
    }
}

export const UserManager = new _UserManager;

export function createNewUser() : void {
    const modal = getModal();
    const instance = initModal({ dismissible: false });
    modal.classList.add('modal-fixed-footer');

    modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">Créer un utilisateur</h5>
        <form class="row" id="__modal_form_new_user">
            <div class="row col s12 input-field">
                <label for="__user_new">Nom d'utilisateur</label>
                <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw">Mot de passe</label>
                <input type="password" class="validate" required id="__user_psw" name="user_psw">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_r">Mot de passe (confirmation)</label>
                <input type="password" class="validate" required id="__user_psw_r" name="user_psw_r">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_a">Mot de passe administrateur</label>
                <input type="password" class="validate" required id="__user_psw_a" name="user_psw_a">
            </div>
        </form>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat red-text left modal-close">Annuler</a>
        <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Créer utilisateur</a>
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
            showToast("Le nom ne peut pas être vide.");
            showToast("Le nom ne peut pas être vide.");
            return;
        }
        if (!psw) {
            showToast("Le mot de passe ne peut pas être vide.");
            return;
        }
        if (psw !== psw_r) {
            showToast("Mot de passe et confirmation doivent correspondre.");
            return;
        }
        if (!psw_a) {
            showToast("Le mot de passe administrateur est nécessaire.");
            return;
        }

        modal_save = document.createDocumentFragment();
        let child: Node;
        while (child = modal.firstChild) {
            modal_save.appendChild(child);
        }
        
        modal.innerHTML = getModalPreloader("Création de l'utilisateur...");
        UserManager.createUser(name, psw, psw_a)
            .then(function() {
                showToast("Utilisateur créé avec succès.");
                instance.close();
            }).catch(function(error) {
                console.log(error);
                if (typeof error === 'number') {
                    if (error === 6) {
                        showToast("Le mot de passe administrateur est invalide.");
                    }
                    else if (error === 12) {
                        showToast("Cet utilisateur existe déjà.");
                    }
                    else {
                        showToast("Une erreur inconnue est survenue.");
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
            <h5 class="no-margin-top">Connexion</h5>
            <form class="row" id="__modal_form_new_user">
                <div class="row col s12 input-field">
                    <label for="__user_new">Nom d'utilisateur</label>
                    <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
                </div>
                <div class="row col s12 input-field">
                    <label for="__user_psw">Mot de passe</label>
                    <input type="password" autocomplete="off" class="validate" required id="__user_psw" name="user_psw">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <a href="#!" id="__modal_cancel_user" class="btn-flat red-text left">Annuler</a>
            <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Connexion</a>
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
                showToast("Le nom ne peut pas être vide.");
                return;
            }
            if (!psw) {
                showToast("Le mot de passe ne peut pas être vide.");
                return;
            }
    
            modal_save = document.createDocumentFragment();
            let child: Node;
            while (child = modal.firstChild) {
                modal_save.appendChild(child);
            }
            
            modal.innerHTML = getModalPreloader("Connexion");
            UserManager.login(name, psw)
                .then(function() {
                    showToast("Vous avez été connecté-e avec succès.");
                    instance.close();

                    // RESOLUTION DE LA PROMESSE
                    resolve();
                }).catch(function(error) {
                    if (typeof error === 'number') {
                        if (error === 10) {
                            showToast("Cet utilisateur n'existe pas.");
                        }
                        else if (error === 11) {
                            showToast("Votre mot de passe est invalide.");
                        }
                        else {
                            showToast("Une erreur inconnue est survenue.");
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
