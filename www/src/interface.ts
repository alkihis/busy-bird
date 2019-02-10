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
    <!-- <div class="row">
        <form class="col s12">
            <div class="row">
                <div class="input-field col s6">
                    <input id="last_name" type="number" class="validate">
                    <label for="last_name">Identifiant</label>
                </div>
                <div class="input-field col s6">
                    <input placeholder="Pipou" id="first_name" type="text" class="validate">
                    <label for="first_name">Nom</label>
                </div>
            </div>
            <div class="row">
                <div class="input-field col s12">
                    <input value="" id="disabled2" type="number" class="validate">
                    <label for="disabled2">Poids</label>
                </div>

                <div class="input-field col s12">
                    <select name="lieu">
                        <option value="1">Près du ruisseau</option>
                        <option value="2">Vers le gros chêne</option>
                    </select>
                    <label>Lieux</label>
                </div>
            </div>
        </form>
    </div>
    <div class="row">
        <a class="blue-text btn-flat right">Enregistrer</a>
        <a class="red-text btn-flat left">Réinitialiser</a>
    </div>
    <div class="fixed-action-btn">
        <a class="btn-floating btn-large red" id="operate_listen">
            <i class="large material-icons">mic</i>
        </a>
    </div> -->

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
