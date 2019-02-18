import { getBase, getPreloader, getModalInstance, askModal, getBottomModalInstance } from "./helpers";
import { initFormPage } from "./form";
import { initSettingsPage } from "./settings_page";
import { initSavedForm } from "./saved_forms";
import { SIDENAV_OBJ } from "./main";
import { initHomePage } from "./home";

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
    public lock_return_button: boolean = false;

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

    protected updateReturnBtn() : void {
        // @ts-ignore
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
    public reload(additionnals?: any) {
        this.changePage(this.actual_page, false, document.getElementById('nav_title').innerText, additionnals);
    }

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

        this.actual_page = page;
        this._should_wait = page.ask_change;
        this.lock_return_button = false;

        // On met le titre de la page dans la barre de navigation
        document.getElementById('nav_title').innerText = force_name || page.name;

        // On appelle la fonction de création de la page
        page.callback(base, additionnals);

        this.updateReturnBtn();
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
                this.changePage(AppPageName.home);
            }
        };
    
        if (this.should_wait || force_asking) {
            askModal("Aller à la page précédente ?", "Les modifications sur la page actuelle seront perdues.", "Retour", "Annuler")
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
