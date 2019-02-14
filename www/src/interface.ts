import { getBase, getPreloader, generateId, getBottomModal, initBottomModal, getModalPreloader, getModalInstance } from "./helpers";
import { initFormPage } from "./form";
import { initSettingsPage } from "./settings_page";
import { initSavedForm } from "./saved_forms";
import { SIDENAV_OBJ } from "./main";

export const APP_NAME = "Busy Bird";

interface AppPageObj {
    not_sidenav_close?: boolean;
    callback: (base: HTMLElement, additionnals?: any) => void;
    name: string;
    ask_change?: boolean;
    reload_on_restore: boolean | Function;
}

export enum AppPageName {
    form = "form", settings = "settings", saved = "saved", home = "home"
}

export const PageManager = new class {
    protected actual_page: AppPageObj;
    protected _should_wait: boolean;

    /**
     * Déclaration des pages possibles
     * Chaque clé de AppPages doit être une possibilité de AppPageName
     */
    protected AppPages: {[pageName: string]: AppPageObj} = {
        form: {
            name: "Nouvelle entrée",
            callback: initFormPage,
            ask_change: true,
            reload_on_restore: false
        },
        settings: {
            name: "Paramètres",
            callback: initSettingsPage,
            reload_on_restore: false
        },
        saved: {
            name: "Entrées",
            callback: initSavedForm,
            reload_on_restore: true
        },
        home: {
            name: "Accueil",
            callback: initHomePage,
            reload_on_restore: false
        }
    };

    protected pages_holder: {save: DocumentFragment, name: string, page: AppPageObj, ask: boolean}[] = [];

    /**
     * Change l'affichage et charge la page "page" dans le bloc principal
     * @param AppPageName page 
     * @param delete_paused supprime les pages sauvegardées
     */
    public changePage(page: AppPageName | AppPageObj, delete_paused: boolean = true, force_name?: string | null, additionnals?: any) : void {
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
            window.history.pushState({}, "", "/?" + pagename);
        }

        // Si on a demandé à fermer le sidenav, on le ferme
        if (!page.not_sidenav_close) {
            SIDENAV_OBJ.close();
        }

        // On appelle la fonction de création de la page
        page.callback(base, additionnals);

        this.actual_page = page;
        this._should_wait = page.ask_change;

        // On met le titre de la page dans la barre de navigation
        document.getElementById('nav_title').innerText = force_name || page.name;
    }

    protected cleanWaitingPages() : void {
        while (this.pages_holder.length >= 10) {
            this.pages_holder.shift();
        }
    }

    /**
     * Pousse une nouvelle page dans la pile de page
     * @param page 
     */
    public pushPage(page: AppPageName, force_name?: string | null, additionnals?: any) : void {
        if (!this.pageExists(page)) {
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
        this.changePage(page, false, force_name, additionnals);
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
        getBase().remove();

        // Met le fragment dans le DOM
        document.getElementsByTagName('main')[0].appendChild(last_page.save.firstElementChild);
        // Remet le bon titre
        document.getElementById('nav_title').innerText = last_page.name;
        this.actual_page = last_page.page;
        this._should_wait = last_page.ask;

        if (this.actual_page.reload_on_restore) {
            if (typeof this.actual_page.reload_on_restore === 'boolean') {
                this.changePage(this.actual_page, false);
            }
            else {
                this.actual_page.reload_on_restore();
            }
        }
    }

    /**
     * Retourne à la page précédente, et demande si à confirmer si la page a le flag "should_wait".
     */
    public goBack() : void {
        const stepBack = () => {
            // Ferme le modal possiblement ouvert
            try { getModalInstance().close(); } catch (e) { }
            
            if (this.isPageWaiting()) {
                this.popPage();
            }
            else {
                this.changePage(AppPageName.home);
            }
        };
    
        if (this.should_wait) {
            modalBackHome(stepBack);
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

export function initHomePage(base: HTMLElement) : void {
    base.innerHTML = "<h2 class='center'>"+ APP_NAME +"</h2>" + `
    <div class="container">
        <p class="flow-text">
            Bienvenue dans Busy Bird, l'application qui facilite la prise de données de terrain
            pour les biologistes.
            Commencez en choisissant le "Nouvelle entrée" dans le menu de côté.
        </p>
    </div>
    `;

    // Initialise les champs materialize et le select
    M.updateTextFields();
    $('select').formSelect();
}

export function modalBackHome(callbackIfTrue: (evt?: MouseEvent) => void) : void {
    const modal = getBottomModal();
    const instance = initBottomModal();

    modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">Aller à la page précédente ?</h5>
        <p class="flow-text">Les modifications sur la page actuelle seront perdues.</p>
    </div>
    <div class="modal-footer">
        <a href="#!" id="__modal_back_home" class="btn-flat red-text right modal-close">Retour</a>
        <a href="#!" class="btn-flat blue-text left modal-close">Annuler</a>
        <div class="clearb"></div>
    </div>
    `;

    document.getElementById('__modal_back_home').onclick = callbackIfTrue;

    instance.open();
}
