import { getBase, getPreloader, getModalInstance, askModal, getBottomModalInstance, displayErrorMessage, convertHTMLToElement } from "../utils/helpers";
import { initFormPage } from "../pages/form";
import { initSettingsPage } from "../pages/settings_page";
import { initSavedForm } from "../pages/saved_forms";
import { initHomePage, APP_NAME } from "../pages/home";
import { Logger } from "../utils/logger";
import { MAX_SLEEPING_PAGES, DEFAULT_PAGE, APP_DEBUG_MODE } from "../main";
import { loadCredits } from "../pages/credits";
import { loadFirstStart } from "../pages/first_start";
import Hammer from 'hammerjs';

const NAV_TITLE_ID = 'nav_title';
const NAV_SIDE_ID = "__sidenav_base_menu";
const NAV_SIDETITLE_ID = "__nav_title_side";

interface AppPage {
    /** Don't close sidenav when switching to this page */
    not_sidenav_close?: boolean;
    /** Function to call to change to page. 
     * If your function returns a Promise, this Promise is returned by .change / .push function */
    callback: (base: HTMLElement, additionnals?: any) => any;
    /** Name of the page. Will be showed in the nav title */
    name: string;
    /** App icon in the sidenav */
    icon?: string;
    /** When user click on the back button, ask for page pop */
    ask_change?: boolean;
    /** Re-execute callback if true, execute function if Function, do nothing if false, on page restore (.pop) */
    reload_on_restore: boolean | Function;
}

interface PageSave {
    save: DocumentFragment;
    name: string;
    page: AppPage;
    ask: boolean;
}

/**
 * Déclaration des pages possibles.
 * @readonly
 */
export const AppPages: { [pageId: string]: AppPage } = {
    home: {
        name: "Dashboard",
        callback: initHomePage,
        reload_on_restore: true,
        icon: "home"
    },
    form: {
        name: "New entry",
        callback: initFormPage,
        ask_change: true,
        reload_on_restore: false,
        icon: "add"
    },
    saved: {
        name: "Entries",
        callback: initSavedForm,
        reload_on_restore: true,
        icon: "file_copy"
    },
    settings: {
        name: "Settings",
        callback: initSettingsPage,
        reload_on_restore: false,
        icon: "settings"
    },
    credits: {
        name: "About",
        callback: loadCredits,
        reload_on_restore: false,
        icon: "info"
    },
    first_start: {
        name: "First start",
        callback: loadFirstStart,
        reload_on_restore: false
    }
};

/**
 * Handle title bar and sidenav element
 *
 * @class _Navigation
 */
class _Navigation {
    protected text: HTMLElement;
    protected sidenav: HTMLElement;
    protected navbar: HTMLElement;
    protected sidetext: HTMLElement;
    protected instance: M.Sidenav;
    protected hammertime: HammerManager;

    protected readonly page_order: string[] = ["home", "", "form", "saved", "", "settings", "credits"];

    constructor() {
        this.text = document.getElementById(NAV_TITLE_ID);
        this.navbar = document.getElementsByTagName('nav')[0];

        this.sidenav = document.getElementById(NAV_SIDE_ID);
        this.sidetext = document.getElementById(NAV_SIDETITLE_ID)
        this.init();
    }

    /**
     * Get navigation bar color
     */
    get color() {
        if (this.sidenav.style.backgroundColor) {
            return this.sidenav.style.backgroundColor;
        }

        return "#98b3c3";
    }
    
    /**
     * Change navigation bar color
     *
     * @memberof _Navigation
     */
    set color(color: string) {
        this.sidenav.style.backgroundColor = color;
    }

    /**
     * Get navigation bar text
     *
     * @memberof _Navigation
     */
    get title() {
        return this.text.textContent;
    }

    /**
     * Change navigation bar text content
     *
     * @memberof _Navigation
     */
    set title(text: string) {
        this.text.innerText = text;
    }

    get sidetitle() {
        return this.sidetext.textContent;
    }

    set sidetitle(v: string) {
        this.sidetext.textContent = v;
    }

    /**
     * Init sidenav
     *
     * @memberof _Navigation
     */
    init() {
        try {
            this.destroy();
        } catch (e) { }

        this.hammertime = new Hammer(document.getElementsByTagName('main')[0] as HTMLElement, {
            recognizers: [
                [Hammer.Swipe, { direction: Hammer.DIRECTION_RIGHT }]
            ]
        });

        this.instance = M.Sidenav.init(this.sidenav, { outDuration: 200 });
        this.hammertime.on('swipe', () => {
            this.instance.open();
        });

        // Création des pages : Génération du sidenav
        this.sidenav.innerHTML = "";

        // Ajout de la bannière
        this.sidenav.insertAdjacentHTML('beforeend', `<li>
            <div class="user-view">
                <div class="background">
                <img src="img/sidenav_background.jpg">
                </div>
                <a href="#!"><img class="circle" src="img/logo.png"></a>
                <a href="#!"><span class="white-text email">${APP_NAME}</span></a>
            </div>
        </li>`);

        // Ajoute chaque page au menu
        for (const page of this.page_order) {
            if (page === "") {
                this.addDivider();
            }
            else if (page in AppPages) {
                this.add(page, AppPages[page]);
            }   
        }
    }

    /**
     * Add a page in sidenav
     *
     * @param {string} name Page ID
     * @param {AppPage} page Page AppPage element
     * @param {number} [place=-1] Where the new page should be placed. 
     * -1 if it should be in the last position.
     * @memberof _Navigation
     */
    add(name: string, page: AppPage, place: number = -1) {
        AppPages[name] = page;

        const li = document.createElement('li');
        li.id = "__sidenav_base_element_" + name;
        li.onclick = () => {
            PageManager.push(page);
        };

        const link = document.createElement('a');
        link.href = "#!";

        if (page.icon) {
            const icon = document.createElement('i');
            icon.className = "material-icons black-text left";
            icon.textContent = page.icon;

            link.appendChild(icon);
            link.appendChild(document.createTextNode(page.name));
        }
        else {
            link.innerText = page.name;
        }
        
        link.className = "waves-effect";
        li.appendChild(link);

        let node_interesting: Node = null;

        if (place >= 0) {
            for (const child of this.sidenav.querySelectorAll('[id^="__sidenav_base_element_"]')) {
                node_interesting = child;

                place--;
                if (place < 0) {
                    break;
                }
            }
        }
        
        if (place < 0) {
            this.sidenav.appendChild(li);
        }
        else {
            this.sidenav.insertBefore(li, node_interesting);
        }
    }

    /**
     * Add a divider to sidenav
     * Divider does *NOT* count as an element in "place" parameter
     *
     * @memberof _Navigation
     */
    addDivider(place: number = -1) {
        const li = convertHTMLToElement(`<li>
            <div class="divider" style="margin-bottom: .5em"></div>
        </li>`);

        let node_interesting: Node = null;

        if (place >= 0) {
            for (const child of this.sidenav.querySelectorAll('[id^="__sidenav_base_element_"]')) {
                node_interesting = child;

                place--;
                if (place < 0) {
                    break;
                }
            }
        }
        
        if (place < 0) {
            this.sidenav.appendChild(li);
        }
        else {
            this.sidenav.insertBefore(li, node_interesting);
        }
    }

    /**
     * Remove page ID "name" from the sidenav
     *
     * @param {string} name
     * @memberof _Navigation
     */
    remove(name: string) {
        const ele = document.getElementById('__sidenav_base_element_' + name);

        if (ele) {
            ele.remove();
        }
        else {
            throw new ReferenceError("Page not found");
        }
    }

    /**
     * Check if page ID "name" is in sidenav
     *
     * @param {string} name
     * @returns {boolean}
     * @memberof _Navigation
     */
    has(name: string) : boolean {
        return document.getElementById('__sidenav_base_element_' + name) !== null;
    }

    /**
     * Open sidenav
     *
     * @memberof _Navigation
     */
    open() {
        if (this.instance)
            this.instance.open();
    }

    /**
     * Close sidenav
     *
     * @memberof _Navigation
     */
    close() {
        if (this.instance)
            this.instance.close();
    }

    /**
     * Close sidenav and destroy the instance
     *
     * @memberof _Navigation
     */
    destroy() {
        if (this.instance)
            this.instance.destroy();
        if (this.hammertime) 
            this.hammertime.destroy();
        this.hammertime = undefined;
    }
}

export const Navigation = new _Navigation;

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
    public custom_return_fn: Function;

    protected pages_holder: PageSave[] = [];

    /**
     * Itère sur les pages stockées dans le PageManager
     * @yields Page actuelle jusqu'à la page stockée la plus vieille
     */
    public *[Symbol.iterator]() : Iterable<PageSave> {
        const base = getBase() as unknown as DocumentFragment;
        // Implémente getById pour faire croire à un document fragment
        base.getElementById = function(id: string) { return this.querySelector('#' + id); };

        yield { 
            save: base, 
            name: document.getElementById('nav_title').innerText,
            page: this.actual_page,
            ask: this._should_wait
        };

        yield* [...this.pages_holder].reverse();
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
        this.change(this.actual_page, false, Navigation.title, additionnals, reset_scroll);
    }

    /**
     * Change l'affichage et charge la page "page" dans le bloc principal
     * @param page Page à charger
     * @param delete_paused Supprime les pages chargées dans la pile
     * @param force_name Forcer un nom pour la navbar
     * @param additionnals Variable à passer en paramètre au callback de page
     * @param reset_scroll Réinitiliser le scroll de la page en haut
     */
    public async change(page: AppPage, delete_paused: boolean = true, force_name?: string | null, additionnals?: any, reset_scroll = true) : Promise<any> {
        // Tente de charger la page
        try {
            let pagename: string = undefined;
            // Recherche de la clé correspondante
            for (const k in AppPages) {
                if (AppPages[k] === page) {
                    pagename = k;
                    break;
                }
            }

            if (typeof pagename === 'undefined') {
                throw new ReferenceError("Selected page does not exists");
            }
    
            // Si on veut supprimer les pages en attente, on vide le tableau
            if (delete_paused) {
                this.pages_holder = [];
            }

            // Si on a demandé à fermer le sidenav, on le ferme
            if (!page.not_sidenav_close) {
                Navigation.close();
            }
    
            // On écrit le preloader dans la base et on change l'historique
            const base = getBase();

            base.innerHTML = getPreloader("Loading");
            if (window.history) {
                window.history.pushState({}, "", "?" + pagename);
            }

            //// help linter
            page = page as AppPage;

            this.actual_page = page;
            this._should_wait = !!page.ask_change;
            this.lock_return_button = false;
            this.custom_return_fn = undefined;
    
            // On met le titre de la page dans la barre de navigation
            Navigation.title = force_name || page.name;
    
            // On appelle la fonction de création de la page
            const result = page.callback(base, additionnals);
    
            if (reset_scroll) {
                // Ramène en haut de la page
                window.scrollTo(0, 0);
            }
    
            this.updateReturnBtn();
    
            if (result instanceof Promise) {
                return result.then(r => {
                    if (APP_DEBUG_MODE && base.innerHTML === getPreloader("Loading")) {
                        // Si rien n'a bougé
                        this.displayInactivePage(base);
                    }

                    return r;
                });
            }
            else {
                if (APP_DEBUG_MODE && base.innerHTML === getPreloader("Loading")) {
                    // Si rien n'a bougé
                    this.displayInactivePage(base);
                }
                
                return Promise.resolve(result);
            }
        } catch (e) {
            Logger.error("Error while changing pages", e);
            return Promise.reject(e);
        }
    }

    /**
     * Display a message showing that current page hasn't changed any HTML.
     *
     * @protected
     * @param {HTMLElement} base
     * @memberof _PageManager
     */
    protected displayInactivePage(base: HTMLElement) {
        base.innerHTML = displayErrorMessage("This page does not work", "Any HTML has been changed by callback() function.");
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
    public async push(page: AppPage, force_name?: string | null, additionnals?: any) : Promise<any> {
        if (typeof page === 'string' && !this.exists(page)) {
            throw new ReferenceError("Page does not exists");
        }

        // Si il y a plus de MAX_SLEEPING_PAGES pages dans la pile, clean
        this.clean();

        // Récupère le contenu actuel du bloc mère
        const actual_base = getBase();

        // Si on a demandé à fermer le sidenav, on le ferme
        if (!page.not_sidenav_close) {
            Navigation.close();
        }

        const new_base = document.createElement('div');
        actual_base.id = "";

        // Crée la nouvelle base mère avec le même ID
        new_base.id = "main_block";

        // let anim_promise: Promise<void> = null;

        // if (ANIMATIONS_ON) {
        //     // Fait une animation de défilement vers gauche
        //     // Décale le main actuel vers la gauche

        //     actual_base.style.position = "absolute";
        //     new_base.style.position = "absolute";
            
        //     new_base.setAttribute('style', "opacity: 0");
            
        //     anim_promise = new Promise(resolve => {
        //         $(actual_base).animate({
        //             opacity: 0, // animate slideLeft
        //             marginLeft: "-" + window.innerWidth + "px",
        //             marginRight: String(window.innerWidth) + "px"
        //         }, 350, 'swing', resolve);
        //     });

        //     $(new_base).animate({
        //         opacity: 1,
        //     }, 250, 'swing');
        // }

        // Sauvegarde de la base actuelle dans le document fragment
        // Cela supprime immédiatement le noeud du DOM
        // const save = new DocumentFragment(); // semble être trop récent
        const save = document.createDocumentFragment();
        
        // Insère la sauvegarde dans la pile de page
        this.pages_holder.push({
            save, 
            ask: this._should_wait,
            name: Navigation.title,
            page: this.actual_page
        });

        save.appendChild(actual_base);

        // Insère la nouvelle base vide à la racine de main
        document.getElementsByTagName('main')[0].appendChild(new_base);

        // Appelle la fonction pour charger la page demandée dans le bloc
        this.change(page, false, force_name, additionnals, undefined);

        // if (!anim_promise) {
        //     anim_promise = Promise.resolve();
        // }
        
        // anim_promise.then(() => {
        //     save.appendChild(actual_base);
        //     new_base.style.position = "";
        // });
    }

    /**
     * Revient à la page précédente.
     * Charge la page d'accueil si aucune page disponible
     */
    public async pop() : Promise<void> {
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
        Navigation.title = last_page.name;
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

            if (this.custom_return_fn) {
                this.custom_return_fn();
                return;
            }
            
            if (this.isPageWaiting()) {
                this.pop();
            }
            else {
                // @ts-ignore this.changePage(AppPageName.home);
                navigator.app.exitApp();
            }
        };
    
        if (this.should_wait || force_asking) {
            askModal("Go to previous page ?", "Modifications on this page will be lost.", "Previous page", "Cancel")
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
        return name in AppPages;
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
