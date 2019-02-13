import { getBase, getPreloader, generateId } from "./helpers";
import { initFormPage } from "./form";
import { initSettingsPage } from "./settings_page";
import { initSavedForm } from "./saved_forms";
import { SIDENAV_OBJ } from "./main";

export const APP_NAME = "Busy Bird";

interface AppPageObj {
    not_sidenav_close?: boolean;
    callback: (base: HTMLElement, additionnals?: any) => void;
    name: string;
}

export enum AppPageName {
    form = "form", settings = "settings", saved = "saved", home = "home"
}

export const PageManager = new class {
    /**
     * Déclaration des pages possibles
     * Chaque clé de AppPages doit être une possibilité de AppPageName
     */
    protected AppPages: {[pageName: string]: AppPageObj} = {
        form: {
            name: "Nouvelle entrée",
            callback: initFormPage
        },
        settings: {
            name: "Paramètres",
            callback: initSettingsPage
        },
        saved: {
            name: "Entrées",
            callback: initSavedForm
        },
        home: {
            name: "Accueil",
            callback: initHomePage
        }
    };

    protected pages_holder: {save: DocumentFragment, name: string}[] = [];

    /**
     * Change l'affichage et charge la page "page" dans le bloc principal
     * @param AppPageName page 
     * @param delete_paused supprime les pages sauvegardées
     */
    public changePage(page: AppPageName, delete_paused: boolean = true, additionnals?: any) : void {
        if (!this.pageExists(page)) {
            throw new ReferenceError("Page does not exists");
        }

        // Si on veut supprimer les pages en attente, on vide le tableau
        if (delete_paused) {
            this.pages_holder = [];
        }

        // On écrit le preloader dans la base et on change l'historique
        const base = getBase();
        base.innerHTML = getPreloader("Chargement");
        if (window.history) {
            window.history.pushState({}, "", "/?" + page);
        }

        // Si on a demandé à fermer le sidenav, on le ferme
        if (!this.AppPages[page].not_sidenav_close) {
            SIDENAV_OBJ.close();
        }

        // On appelle la fonction de création de la page
        this.AppPages[page].callback(base, additionnals);

        // On met le titre de la page dans la barre de navigation
        document.getElementById('nav_title').innerText = this.AppPages[page].name;
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
    public pushPage(page: AppPageName, additionnals?: any) : void {
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
        this.pages_holder.push({save, name: document.getElementById('nav_title').innerText});

        // Crée la nouvelle base mère avec le même ID
        const new_base = document.createElement('div');
        new_base.id = "main_block";

        // Insère la nouvelle base vide à la racine de main
        document.getElementsByTagName('main')[0].appendChild(new_base);

        // Appelle la fonction pour charger la page demandée dans le bloc
        this.changePage(page, false, additionnals);
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
