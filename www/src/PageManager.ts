import { getBase, getPreloader, getModalInstance, askModal, getBottomModalInstance } from "./helpers";
import { initFormPage } from "./form";
import { initSettingsPage } from "./settings_page";
import { initSavedForm } from "./saved_forms";
import { initHomePage, APP_NAME } from "./home";
import { Logger } from "./logger";
import { MAX_SLEEPING_PAGES } from "./main";

export let SIDENAV_OBJ: M.Sidenav = null;

interface AppPage {
    not_sidenav_close?: boolean;
    callback: (base: HTMLElement, additionnals?: any) => any;
    name: string;
    ask_change?: boolean;
    reload_on_restore: boolean | Function;
}

export enum AppPageName {
    form = "form", settings = "settings", saved = "saved", home = "home"
}

type AppPages = {[pageName: string]: AppPage};

interface PageSave {
    save: DocumentFragment;
    name: string;
    page: AppPage;
    ask: boolean
}

const DEFAULT_PAGE = AppPageName.home;

/**
 * Gère les pages de l'application.
 * Utilisée pour gérer le système de pile de pages.
 * Pour pousser une nouvelle page sur les autres, utilisez push().
 * Pour revenir à la page précédente, utilisez back(). Vous pouvez
 * aussi utiliser pop() qui ne fait pas de vérification d'usage lors du dépop.
 * Cette classe ne doit être instanciée qu'une seule fois !
 */
class _PageManager {
    protected actual_page: AppPage;
    protected _should_wait: boolean;
    public lock_return_button: boolean = false;

    /**
     * Déclaration des pages possibles
     * Chaque clé de AppPages doit être une possibilité de AppPageName
     */
    protected app_pages: AppPages = {
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

    protected pages_holder: PageSave[] = [];

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
        for (const page in this.app_pages) {
            const li = document.createElement('li');
            li.id = "__sidenav_base_element_" + page;
            li.onclick = () => {
                PageManager.push(this.app_pages[page]);
            };

            const link = document.createElement('a');
            link.href = "#!";
            link.innerText = this.app_pages[page].name;
            li.appendChild(link);

            sidenav.appendChild(li);
        }
        
        // Initialise le sidenav
        const elem = document.querySelector('.sidenav');
        SIDENAV_OBJ = M.Sidenav.init(elem, {});
    }
    
    /**
     * Met à jour le bouton retour sur PC
     */
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
        this.change(this.actual_page, false, document.getElementById('nav_title').innerText, additionnals, reset_scroll);
    }

    /**
     * Change l'affichage et charge la page "page" dans le bloc principal
     * @param page Page à charger
     * @param delete_paused Supprime les pages chargées dans la pile
     * @param force_name Forcer un nom pour la navbar
     * @param additionnals Variable à passer en paramètre au callback de page
     * @param reset_scroll Réinitiliser le scroll de la page en haut
     */
    public change(page: AppPageName | AppPage, delete_paused: boolean = true, force_name?: string | null, additionnals?: any, reset_scroll = true) : Promise<any> {
        // Tente de charger la page
        try {
            let pagename: string = "";
            if (typeof page === 'string') {
                // AppPageName
                if (!this.exists(page)) {
                    throw new ReferenceError("Page does not exists");
                }
                
                pagename = page;
                page = this.app_pages[page];
            }
            else {
                // Recherche de la clé correspondante
                for (const k in this.app_pages) {
                    if (this.app_pages[k] === page) {
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
            page = page as AppPage;

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

    /**
     * Supprime des pages sauvegardées si la pile de page dépasse MAX_SLEEPING_PAGES
     */
    protected clean() : void {
        while (this.pages_holder.length >= MAX_SLEEPING_PAGES) {
            this.pages_holder.shift();
        }
    }

    /**
     * Pousse une nouvelle page dans la pile de page
     * @param page Page à pousser
     * @param force_name Nom à mettre dans la navbar
     * @param additionnals Variable à passer au callback de la page à charger
     */
    public push(page: AppPageName | AppPage, force_name?: string | null, additionnals?: any) : Promise<any> {
        if (typeof page === 'string' && !this.exists(page)) {
            throw new ReferenceError("Page does not exists");
        }

        // Si il y a plus de MAX_SLEEPING_PAGES pages dans la pile, clean
        this.clean();

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
        return this.change(page, false, force_name, additionnals);
    }

    /**
     * Revient à la page précédente.
     * Charge la page d'accueil si aucune page disponible
     */
    public pop() : void {
        if (this.pages_holder.length === 0) {
            this.change(DEFAULT_PAGE);
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
                this.change(this.actual_page, false, undefined, undefined, false);
            }
            else {
                this.actual_page.reload_on_restore();
            }
        }

        this.updateReturnBtn();
    }

    /**
     * Retourne à la page précédente, et demande si à confirmer si la page a le flag "should_wait".
     * @param force_asking Oblige à demander si on doit retourner à la page précédente ou non.
     */
    public back(force_asking = false) : void {
        if (this.lock_return_button) {
            return;
        }

        const stepBack = () => {
            // Ferme le modal possiblement ouvert
            try { getModalInstance().close(); } catch (e) { }
            try { getBottomModalInstance().close(); } catch (e) { }
            
            if (this.isPageWaiting()) {
                this.pop();
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

    public exists(name: string) : boolean {
        return name in this.app_pages;
    }

    public isPageWaiting() : boolean {
        return this.pages_holder.length > 0;
    }
}

export const PageManager = new _PageManager;

function cleanElement(e: HTMLElement) {
    let n: Node;
    while (n = e.firstChild) {
        e.removeChild(n);
    }
}
