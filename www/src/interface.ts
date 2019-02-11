import { getBase, getPreloader } from "./helpers";
import { initFormPage } from "./form";
import { initSettingsPage } from "./settings_page";
import { initSavedForm } from "./saved_forms";
import { SIDENAV_OBJ } from "./main";

export const APP_NAME = "Busy Bird";

interface AppPageObj {
    not_sidenav_close?: boolean;
    callback: (base: HTMLElement) => void;
    name: string;
}

export type AppPageName = "form" | "settings" | "saved" | "home";
/**
 * Déclaration des pages possibles
 * Chaque clé de AppPages doit être une possibilité de AppPageName
 */
export const AppPages: {[pageName: string]: AppPageObj} = {
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
}

/**
 * Change l'affichage et charge la page "page" dans le bloc principal
 * @param AppPageName page 
 */
export function changePage(page: AppPageName) : void {
    const base = getBase();
    base.innerHTML = getPreloader("Chargement");
    if (window.history) {
        window.history.pushState({}, "", "/?" + page);
    }

    if (page in AppPages) {
        if (!AppPages[page].not_sidenav_close) {
            SIDENAV_OBJ.close();
        }

        AppPages[page].callback(base);

        document.getElementById('nav_title').innerText = AppPages[page].name;
    }
    else {
        throw new ReferenceError("Page does not exists");
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
