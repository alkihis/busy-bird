import { getBase, getPreloader, getModalInstance, askModal, getBottomModalInstance, convertHTMLToElement } from "./helpers";
import { initFormPage } from "./form";
import { initSettingsPage } from "./settings_page";
import { initSavedForm } from "./saved_forms";
import { initHomePage, APP_NAME } from "./home";
import { Logger } from "./logger";

export let SIDENAV_OBJ: M.Sidenav = null;

interface AppPageObj {
    not_sidenav_close?: boolean;
    callback: (base: HTMLElement, additionnals?: any) => any;
    name: string;
    ask_change?: boolean;
    reload_on_restore: boolean | Function;
}

export enum AppPageName {
    form = "form", settings = "settings", saved = "saved", home = "home"
}

class _PageMananger {
    protected actual_page: AppPageObj;
    protected _should_wait: boolean;
    public lock_return_button: boolean = false;

    /**
     * Déclaration des pages possibles
     * Chaque clé de AppPages doit être une possibilité de AppPageName
     */
    protected AppPages: {[pageName: string]: AppPageObj} = {
        home: {
            name: "Tableau de bord",
            callback: initHomePage,
            reload_on_restore: true
        },
        form: {
            name: "Nouvelle entrée",
            callback: initFormPage,
            ask_change: true,
            reload_on_restore: false
        },
        saved: {
            name: "Entrées",
            callback: initSavedForm,
            reload_on_restore: true
        },
        settings: {
            name: "Paramètres",
            callback: initSettingsPage,
            reload_on_restore: false
        }
    };

    protected pages_holder: {save: DocumentFragment, name: string, page: AppPageObj, ask: boolean}[] = [];

    constructor() {
        // Génération du sidenav
        const sidenav = document.getElementById('__sidenav_base_menu');

        // Ajout de la bannière
        sidenav.insertAdjacentHTML('beforeend', `<li>
            <div class="user-view">
                <div class="background">
                <img src="img/sidenav_background.jpg">
                </div>
                <a href="#!"><img class="circle" src="img/logo.png"></a>
                <a href="#!"><span class="white-text email">${APP_NAME}</span></a>
            </div>
        </li>`);

        // Ajoute chaque page au menu
        for (const page in this.AppPages) {
            const li = document.createElement('li');
            li.id = "__sidenav_base_element_" + page;
            li.onclick = () => {
                PageManager.pushPage(this.AppPages[page]);
            };

            const link = document.createElement('a');
            link.href = "#!";
            link.innerText = this.AppPages[page].name;
            li.appendChild(link);

            sidenav.appendChild(li);
        }
        
        // Initialise le sidenav
        const elem = document.querySelector('.sidenav');
        SIDENAV_OBJ = M.Sidenav.init(elem, {});
    }
    
    protected updateReturnBtn() : void {
        if (device.platform === "browser") {
            const back_btn = document.getElementById('__nav_back_button');
            
            if (this.isPageWaiting()) {
                back_btn.classList.remove('hide');
            }
            else {
                back_btn.classList.add('hide');
            }
        }
    }

    /**
     * Recharge la page actuelle. (la vide et réexécute le callback configuré dans la AppPageObj)
     */
    public reload(additionnals?: any, reset_scroll = false) {
        this.changePage(this.actual_page, false, document.getElementById('nav_title').innerText, additionnals, reset_scroll);
    }

    /**
     * Change l'affichage et charge la page "page" dans le bloc principal
     * @param page Page à charger
     * @param delete_paused Supprime les pages chargées dans la pile
     * @param force_name Forcer un nom pour la navbar
     * @param additionnals Variable à passer en paramètre au callback de page
     * @param reset_scroll Réinitiliser le scroll de la page en haut
     */
    public changePage(page: AppPageName | AppPageObj, delete_paused: boolean = true, force_name?: string | null, additionnals?: any, reset_scroll = true) : Promise<any> {
        // Tente de charger la page
        try {
            let pagename: string = "";
            if (typeof page === 'string') {
                // AppPageName
                if (!this.pageExists(page)) {
                    throw new ReferenceError("Page does not exists");
                }
                
                pagename = page;
                page = this.AppPages[page];
            }
            else {
                // Recherche de la clé correspondante
                for (const k in this.AppPages) {
                    if (this.AppPages[k] === page) {
                        pagename = k;
                        break;
                    }
                }
            }
    
            // Si on veut supprimer les pages en attente, on vide le tableau
            if (delete_paused) {
                this.pages_holder = [];
            }
    
            // On écrit le preloader dans la base et on change l'historique
            const base = getBase();
            base.innerHTML = getPreloader("Chargement");
            if (window.history) {
                window.history.pushState({}, "", "?" + pagename);
            }

            //// help linter
            page = page as AppPageObj;

            // Si on a demandé à fermer le sidenav, on le ferme
            if (!page.not_sidenav_close) {
                SIDENAV_OBJ.close();
            }

            this.actual_page = page;
            this._should_wait = page.ask_change;
            this.lock_return_button = false;
    
            // On met le titre de la page dans la barre de navigation
            document.getElementById('nav_title').innerText = force_name || page.name;
    
            // On appelle la fonction de création de la page
            const result = page.callback(base, additionnals);
    
            if (reset_scroll) {
                // Ramène en haut de la page
                window.scrollTo(0, 0);
            }
    
            this.updateReturnBtn();
    
            if (result instanceof Promise) {
                return result;
            }
            else {
                return Promise.resolve(result);
            }
        } catch (e) {
            Logger.error("Erreur lors du changement de page", e);
            return Promise.reject(e);
        }
    }

    protected cleanWaitingPages() : void {
        while (this.pages_holder.length >= 10) {
            this.pages_holder.shift();
        }
    }

    /**
     * Pousse une nouvelle page dans la pile de page
     * @param page Page à pousser
     * @param force_name Nom à mettre dans la navbar
     * @param additionnals Variable à passer au callback de la page à charger
     */
    public pushPage(page: AppPageName | AppPageObj, force_name?: string | null, additionnals?: any) : Promise<any> {
        if (typeof page === 'string' && !this.pageExists(page)) {
            throw new ReferenceError("Page does not exists");
        }

        // Si il y a plus de 10 pages dans la pile, clean
        this.cleanWaitingPages();

        // Récupère le contenu actuel du bloc mère
        const actual_base = getBase();

        // Sauvegarde de la base actuelle dans le document fragment
        // Cela supprime immédiatement le noeud du DOM
        // const save = new DocumentFragment(); // semble être trop récent
        const save = document.createDocumentFragment();
        actual_base.id = "";
        save.appendChild(actual_base);
        // Insère la sauvegarde dans la pile de page
        this.pages_holder.push({
            save, 
            ask: this._should_wait,
            name: document.getElementById('nav_title').innerText,
            page: this.actual_page
        });

        // Crée la nouvelle base mère avec le même ID
        const new_base = document.createElement('div');
        new_base.id = "main_block";

        // Insère la nouvelle base vide à la racine de main
        document.getElementsByTagName('main')[0].appendChild(new_base);

        // Appelle la fonction pour charger la page demandée dans le bloc
        return this.changePage(page, false, force_name, additionnals);
    }

    /**
     * Revient à la page précédente.
     * Charge la page d'accueil si aucune page disponible
     */
    public popPage() : void {
        if (this.pages_holder.length === 0) {
            this.changePage(AppPageName.home);
            return;
        }

        // Récupère la dernière page poussée dans le tableau
        const last_page = this.pages_holder.pop();

        // Supprime le main actuel
        const main = getBase();
        cleanElement(main);
        main.parentElement.removeChild(main);

        const new_main = last_page.save.firstElementChild;
        new_main.id = "main_block";
        // Met le fragment dans le DOM
        document.getElementsByTagName('main')[0].appendChild(new_main);
        // Remet le bon titre
        document.getElementById('nav_title').innerText = last_page.name;
        this.actual_page = last_page.page;
        this._should_wait = last_page.ask;
        this.lock_return_button = false;

        if (this.actual_page.reload_on_restore) {
            if (typeof this.actual_page.reload_on_restore === 'boolean') {
                this.changePage(this.actual_page, false, undefined, undefined, false);
            }
            else {
                this.actual_page.reload_on_restore();
            }
        }

        this.updateReturnBtn();
    }

    /**
     * Retourne à la page précédente, et demande si à confirmer si la page a le flag "should_wait".
     */
    public goBack(force_asking = false) : void {
        if (this.lock_return_button) {
            return;
        }

        const stepBack = () => {
            // Ferme le modal possiblement ouvert
            try { getModalInstance().close(); } catch (e) { }
            try { getBottomModalInstance().close(); } catch (e) { }
            
            if (this.isPageWaiting()) {
                this.popPage();
            }
            else {
                // @ts-ignore this.changePage(AppPageName.home);
                navigator.app.exitApp();
            }
        };
    
        if (this.should_wait || force_asking) {
            askModal("Aller à la page précédente ?", "Les modifications sur la page actuelle seront perdues.", "Page précédente", "Annuler")
                .then(stepBack)
                .catch(() => {})
        }
        else {
            stepBack();
        }
    }

    public get should_wait() {
        return this._should_wait;
    }

    public set should_wait(v: boolean) {
        this._should_wait = v;
    }

    public pageExists(name: string) : boolean {
        return name in this.AppPages;
    }

    public isPageWaiting() : boolean {
        return this.pages_holder.length > 0;
    }
}

export const PageManager = new _PageMananger;

function cleanElement(e: HTMLElement) {
    let n: Node;
    while (n = e.firstChild) {
        e.removeChild(n);
    }
}
