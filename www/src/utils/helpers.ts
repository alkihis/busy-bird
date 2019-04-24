import { PageManager } from "../base/PageManager";
import { Schemas, FormSave, FormEntityType } from "../base/FormSchema";
import { SyncManager } from "../base/SyncManager";
import { FILE_HELPER, SD_FILE_HELPER } from "../main";
import { ENTRIES_DIR } from "../base/FormSaves";
import { Logger } from "./logger";

// PRELOADERS: spinners for waiting time
export const PRELOADER_BASE = `
<div class="spinner-layer spinner-blue-only">
    <div class="circle-clipper left">
        <div class="circle"></div>
    </div><div class="gap-patch">
        <div class="circle"></div>
    </div><div class="circle-clipper right">
        <div class="circle"></div>
    </div>
</div>`;
export const PRELOADER = `
<div class="preloader-wrapper active">
    ${PRELOADER_BASE}
</div>`;
export const SMALL_PRELOADER = `
<div class="preloader-wrapper small active">
    ${PRELOADER_BASE}
</div>`;

export const MODAL_PRELOADER_TEXT_ID = "__classic_preloader_text";

/**
 * @returns HTMLElement Élément HTML dans lequel écrire pour modifier la page active
 */
export function getBase() : HTMLElement {
    return document.getElementById('main_block');
}

/**
 * Initialise le modal simple avec les options données (voir doc.)
 * et insère de l'HTML dedans avec content
 * @returns M.Modal Instance du modal instancié avec Materialize
 */
export function initModal(options: M.ModalOptions | {} = {}, content?: string) : M.Modal {
    const modal = getModal();
    modal.classList.remove('modal-fixed-footer');
    
    if (content)
        modal.innerHTML = content;

    return M.Modal.init(modal, options);
}

/**
 * Initialise le modal collé en bas avec les options données (voir doc.)
 * et insère de l'HTML dedans avec content
 * @returns M.Modal Instance du modal instancié avec Materialize
 */
export function initBottomModal(options: M.ModalOptions | {} = {}, content?: string) : M.Modal {
    const modal = getBottomModal();
    modal.classList.remove('unlimited');
    
    if (content)
        modal.innerHTML = content;

    return M.Modal.init(modal, options);
}

/**
 * @returns HTMLElement Élément HTML racine du modal
 */
export function getModal() : HTMLElement {
    return document.getElementById('modal_placeholder');
}

/**
 * @returns HTMLElement Élément HTML racine du modal fixé en bas
 */
export function getBottomModal() : HTMLElement {
    return document.getElementById('bottom_modal_placeholder');
}

/**
 * @returns M.Modal Instance du modal (doit être initialisé)
 */
export function getModalInstance() : M.Modal {
    return M.Modal.getInstance(getModal());
}

/**
 * @returns M.Modal Instance du modal fixé en bas (doit être initialisé)
 */
export function getBottomModalInstance() : M.Modal {
    return M.Modal.getInstance(getBottomModal());
}

/**
 * Génère un spinner centré sur l'écran avec un message d'attente
 * @param text Texte à insérer comme message de chargement
 * @returns string HTML à insérer
 */
export function getPreloader(text: string) : string {
    return `
    <div style="margin-top: 35vh; text-align: center;">
        ${PRELOADER}
    </div>
    <div class="flow-text" style="margin-top: 10px; text-align: center;">${text}</div>
    `;
}

/**
 * Génère un spinner adapté à un modal avec un message d'attente
 * @param text Texte à insérer comme message de chargement
 * @param footer HTML du footer à injecter (doit contenir le tag .modal-footer)
 * @returns string HTML à insérer dans la racine d'un modal
 */
export function getModalPreloader(text: string, footer: string = "") : string {
    return `<div class="modal-content">
    <div style="text-align: center;">
        ${SMALL_PRELOADER}
    </div>
    <div class="flow-text pre-wrapper" id="${MODAL_PRELOADER_TEXT_ID}" style="margin-top: 10px; text-align: center;">${text}</div>
    </div>
    ${footer}
    `;
}

// dec2hex :: Integer -> String
function dec2hex(dec: number) : string {
    return ('0' + dec.toString(16)).substr(-2);
}
/**
 * Génère un identifiant aléatoire
 * @param len Longueur de l'ID
 */
export function generateId(len: number) : string {
    const arr = new Uint8Array((len || 40) / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join('');
}

// USELESS
export function saveDefaultForm() {
    // writeFile('schemas/', 'default.json', new Blob([JSON.stringify(current_form)], {type: "application/json"}));
}

/**
 * Renvoie un début d'URL valide pour charger des fichiers internes à l'application sur tous les périphériques.
 */
export function toValidUrl() : string {
    if (device.platform === "browser") {
        return '';
    }
    return cordova.file.applicationDirectory + 'www/';
}

export function sleep(ms: number) : Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

/**
 * Fonction de test.
 * Écrit l'objet obj sérialisé en JSON à la fin de l'élément HTML ele.
 * @param ele HTMLElement
 * @param obj any
 */
export function printObj(ele: HTMLElement, obj: any) : void {
    ele.insertAdjacentText('beforeend', JSON.stringify(obj, null, 2));
}

/**
 * Obtient la localisation de l'utilisation.
 * Si réussi, onSuccess est appelée avec en paramètre un objet de type Position
 * @param onSuccess Function(coords: Position) => void
 * @param onFailed Function(error) => void
 */
export function getLocation(onSuccess: (coords: Position) => any, onFailed?: (positionError: PositionError) => void) {
    navigator.geolocation.getCurrentPosition(onSuccess,
        onFailed,
        { timeout: 30 * 1000, maximumAge: 5 * 60 * 1000 }
    );
}

export interface CoordsLike {
    latitude: string | number;
    longitude: string | number;
}
/**
 * Calcule la distance en mètres entre deux coordonnées GPS.
 * Les deux objets passés doivent implémenter l'interface CoordsLike
 * @param coords1 CoordsLike
 * @param coords2 CoordsLike
 * @returns number Nombre de mètres entre les deux coordonnées
 */
export function calculateDistance(coords1: CoordsLike, coords2: CoordsLike) : number {
    return geolib.getDistance(
        {latitude: String(coords1.latitude), longitude: String(coords1.longitude)},
        {latitude: String(coords2.latitude), longitude: String(coords2.longitude)}
    );
}

/**
 * Fonction de test pour tester la géolocalisation.
 * @param latitude 
 * @param longitude 
 */
export function testDistance(latitude = 45.353421, longitude = 5.836441) {
    getLocation(function(res: Position) {
        console.log(calculateDistance(res.coords, {latitude, longitude})); 
    }, function(error) {
        console.log(error);
    });
}

/**
 * Formate un objet Date en chaîne de caractères potable.
 * @param date Date
 * @param withTime boolean Détermine si la chaîne de caractères contient l'heure et les minutes
 * @returns string La châine formatée
 */
export function formatDate(date: Date, withTime: boolean = false) : string {
    const m = ((date.getMonth() + 1) < 10 ? "0" : "") + String(date.getMonth() + 1);
    const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());

    const min = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());

    return `${d}/${m}/${date.getFullYear()}` + (withTime ? ` ${date.getHours()}h${min}` : "");
}

/**
 * Formate un objet Date en chaîne de caractères potable.
 * Pour comprendre les significations des lettres du schéma, se référer à : http://php.net/manual/fr/function.date.php
 * @param schema string Schéma de la chaîne. Supporte Y, m, d, g, H, i, s, n, N, v, z, w
 * @param date Date Date depuis laquelle effectuer le formatage
 * @returns string La chaîne formatée
 */
export function dateFormatter(schema: string, date = new Date()) : string {
    function getDayOfTheYear(now: Date) : number {
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        const day = Math.floor(diff / oneDay);
        
        return day - 1; // Retourne de 0 à 364/365
    }

    const Y = date.getFullYear();
    const N = date.getDay() === 0 ? 7 : date.getDay();
    const n = date.getMonth() + 1;
    const m = (n < 10 ? "0" : "") + String(n);
    const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
    const L = Y % 4 == 0 ? 1 : 0;

    const i = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
    const H = ((date.getHours()) < 10 ? "0" : "") + String(date.getHours());
    const g = date.getHours();
    const s = ((date.getSeconds()) < 10 ? "0" : "") + String(date.getSeconds());

    const replacements: any = {
        Y, m, d, i, H, g, s, n, N, L, v: date.getMilliseconds(), z: getDayOfTheYear, w: date.getDay()
    };

    let str = "";

    // Construit la chaîne de caractères
    for (const char of schema) {
        if (char in replacements) {
            if (typeof replacements[char] === 'string') {
                str += replacements[char];
            }
            else if (typeof replacements[char] === 'number') {
                str += String(replacements[char]);
            }
            else {
                str += String(replacements[char](date));
            }
        }
        else {
            str += char;
        }
    }

    return str;
}

/**
 * Assigne la balise src de l'image element au contenu de l'image située dans path.
 * @param path Chemin vers l'image (future src)
 * @param element Image (élément HTML)
 * @param absolute  true: Le chemin path est absolu. 
 *                  false: Le chemin path est relatif. 
 *                  null: Intégrer directement path dans element.src.
 */
export async function createImgSrc(path: string, element: HTMLImageElement | HTMLVideoElement, absolute = false) : Promise<void> {
    if (typeof absolute === "boolean") {
        const file = absolute ? await FILE_HELPER.absoluteGet(path) : await FILE_HELPER.get(path);

        element.src = file.toURL();
        element.dataset.original = path;
    }
    else {
        element.src = path;
    }
}

/**
 * Convertit un Blob en chaîne base64.
 * 
 * @param data Données à convertir
 *  Peut être un objet Blob ou un Blob-compatible (File, par exemple),
 *  une chaîne de caractères, un objet ne contenant pas de fonctions,
 *  un ArrayBuffer, un objet implémentant l'interface ArrayBufferView,
 *  ou un objet personnalisé implémentant la méthode toString()
 */
export function toBase64(data: any) : Promise<string> {
    const reader = new FileReader;
    const blob = FILE_HELPER.toBlob(data);

    return new Promise((resolve, reject) => {
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = progress_event => {
            reject(progress_event);
        };

        reader.readAsDataURL(blob);
    });
}

/**
 * Convertit une URL (distante, locale, data:base64...) en objet binaire Blob
 * @param str string URL
 */
export function urlToBlob(str: string) : Promise<Blob> {
    return fetch(str).then(res => res.blob());
}

/**
 * Ouvre un modal informant l'utilisateur
 * @param title string Titre affiché sur le modal
 * @param info string Information
 * @param text_close string Texte affiché sur le bouton de fermeture
 */
export function informalBottomModal(title: string, info: string, text_close = "Close") : void {
    const modal = getBottomModal();
    const instance = initBottomModal();

    modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">${title}</h5>
        <p class="flow-text">${info}</p>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat blue-text modal-close right">${text_close}</a>
        <div class="clearb"></div>
    </div>
    `;

    instance.open();
}

/**
 * Ouvre un modal informant l'utilisateur, mais sans possiblité de le fermer. Il devra être fermé via JS
 * @param content Texte affiché
 * @returns {M.Modal} Instance du modal généré
 */
export function unclosableBottomModal(content: string) : M.Modal {
    const modal = getBottomModal();
    const instance = initBottomModal({dismissible: false});

    modal.innerHTML = `
    <div class="modal-content">
        ${content}
    </div>
    `;

    instance.open();

    return instance;
}

/**
 * Ouvre un modal demandant à l'utilisateur de cliquer sur oui ou non
 * @param title string Titre affiché sur le modal
 * @param question string Question complète / détails sur l'action qui sera réalisée
 * @param text_yes string Texte affiché sur le bouton de validation
 * @param text_no string Texte affiché sur le bouton d'annulation
 * @param checkbox Texte d'une checkbox
 * @returns {Promise<void | boolean>} Promesse se résolvant quand l'utilisateur approuve, se rompant si l'utilisateur refuse.
 * Si il y a une checkbox, la promesse résolue / rompue reçoit en valeur l'attribut checked de la checkbox
 */
export function askModal(title: string, question: string, text_yes = "Yes", text_no = "No", checkbox?: string) : Promise<any> {
    const modal = getBottomModal();
    const instance = initBottomModal({ dismissible: false });

    modal.classList.add('unlimited');

    modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">${title}</h5>
        <p class="flow-text">${question}</p>

        ${typeof checkbox !== 'undefined' ? `
            <p class="no-margin-bottom">
                <label>
                    <input type="checkbox" id="__question_checkbox" />
                    <span>${checkbox}</span>
                </label>
            </p>
        ` : ''}
    </div>
    <div class="modal-footer">
        <a href="#!" id="__question_no" class="btn-flat green-text modal-close left">${text_no}</a>
        <a href="#!" id="__question_yes" class="btn-flat red-text modal-close right">${text_yes}</a>
        <div class="clearb"></div>
    </div>
    `;

    instance.open();

    const chk = document.getElementById("__question_checkbox") as HTMLInputElement;

    return new Promise(function(resolve, reject) {
        PageManager.lock_return_button = true;

        document.getElementById('__question_yes').addEventListener('click', () => {
            PageManager.lock_return_button = false;

            if (chk) {
                resolve(chk.checked);
            }
            else {
                resolve();
            }
        });
        document.getElementById('__question_no').addEventListener('click', () => {
            PageManager.lock_return_button = false;

            if (chk) {
                reject(chk.checked);
            }
            else {
                reject();
            }
        });
    });
}

/**
 * Échappe les caractères HTML de la chaîne text
 * @param text string
 */
export function escapeHTML(text: string) : string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Renvoie une chaîne contenant de l'HTML représentant un message d'information
 * @param title Titre du message
 * @param message Message complémentaire
 */
export function displayInformalMessage(title: string, message: string = "") : string {
    return `
        <div class="absolute-container">
            <div class="absolute-center-container">
                <p class="flow-text grey-text text-lighten-1">
                    ${escapeHTML(title)}
                </p>
                <p class="flow-text">
                    ${escapeHTML(message)}
                </p>
            </div>
        </div>
    `;
}

/**
 * Renvoie une chaîne contenant de l'HTML représentant un message d'erreur
 * @param title Titre a afficher (sera en rouge)
 * @param message Message complémentaire
 */
export function displayErrorMessage(title: string, message: string = "") : string {
    return `
        <div class="absolute-container">
            <div class="absolute-center-container">
                <p class="rotate-90 big-text smiley grey-text text-lighten-1">:(</p>
                <p class="flow-text red-text text-lighten-1">
                    ${escapeHTML(title)}
                </p>
                <p class="flow-text">
                    ${escapeHTML(message)}
                </p>
            </div>
        </div>
    `;
}

/**
 * Renvoie vrai si l'utilisateur est en ligne et a une connexion potable.
 */
export function hasGoodConnection() : boolean {
    const networkState = navigator.connection.type;
    return networkState !== Connection.NONE && networkState !== Connection.CELL && networkState !== Connection.CELL_2G;
}

/**
 * Renvoie vrai si l'utilisateur est en ligne.
 */
export function hasConnection() : boolean {
    return navigator.connection.type !== Connection.NONE;
}

/**
 * Convertit une chaîne contenant de l'HTML en un élément.
 * La chaîne ne doit contenir qu'un seul élément à sa racine !
 * 
 * @param htmlString 
 */
export function convertHTMLToElement(htmlString: string) : HTMLElement {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.firstElementChild as HTMLElement;
}

/**
 * Affiche un toast (bulle) native au système d'exploitation
 * @param message 
 * @param duration Usually, Android ignores it.
 */
export function showToast(message: string, duration: number = 4000) : void {
    if (device.platform === "browser") {
        M.toast({html: message, displayLength: duration});
    }
    else {
        // @ts-ignore
        window.plugins.toast.showWithOptions({
            message,
            duration, // ms
            position: "bottom",
            addPixelsY: -250  // (optional) added a negative value to move it up a bit (default 0)
        });
    }
}

/**
 * Convertit les minutes en texte compréhensible
 * @param min 
 */
export function convertMinutesToText(min: number) : string {
    if (min < 60) {
        return `${min} min`;
    }
    else {
        const hours = Math.trunc(min / 60);
        const minutes = Math.trunc(min % 60);

        return `${hours}h ${minutes || ""}`;
    }
}

/**
 * Demande à l'utilisateur de choisir parmi une liste
 * @param items Choix possibles. L'insertion d'HTML est autorisé et sera parsé.
 * @returns Index du choix choisi par l'utilisateur
 */
export function askModalList(items: string[]) : Promise<number> {
    const modal = getBottomModal();

    modal.innerHTML = "";
    const content = document.createElement('div');
    content.classList.add('modal-list');

    modal.appendChild(content);

    return new Promise((resolve, reject) => {
        let resolved = false;

        const instance = initBottomModal({
            onCloseEnd: () => {
                if (!resolved)
                    reject();
            }
        });

        modal.classList.add('unlimited');

        for (let i = 0; i < items.length; i++) {
            const link = document.createElement('a');
            link.classList.add('modal-list-item', 'flow-text', 'waves-effect');
            link.innerHTML = items[i];
            link.href = "#!";
            link.onclick = () => {
                resolve(i);
                resolved = true;
                instance.close();
            };
            content.appendChild(link);
        }

        instance.open();
    });
}

/**
 * Fonction de test: Crée des formulaires automatiques
 * @param count Nombre de formulaires à créer
 */
export async function createRandomForms(count: number = 50, wait_between = 0) : Promise<void> {
    if (Schemas.current_key === null) {
        throw "Unable to create entries without form model";
    }

    const current = Schemas.get(Schemas.current_key);
    const promises: Promise<any>[] = [];
    for (let i = 0; i < count; i++) {
        if (wait_between) {
            await sleep(wait_between);
        }

        const save: FormSave = {
            fields: {},
            location: "",
            type: Schemas.current_key,
            owner: "randomizer",
            metadata: {}
        };

        for (const field of current.fields) {
            switch(field.type) {
                case FormEntityType.bigstring:
                case FormEntityType.string:
                case FormEntityType.datetime:
                case FormEntityType.select:
                case FormEntityType.slider:
                    save.fields[field.name] = generateId(25);
                    break;
                case FormEntityType.integer:
                    save.fields[field.name] = Math.trunc(Math.random() * 1000);
                    break;
                case FormEntityType.float:
                    save.fields[field.name] = Math.random();
                    break;
                case FormEntityType.file:
                case FormEntityType.audio:
                    save.fields[field.name] = null;
                    break;
                case FormEntityType.checkbox:
                    save.fields[field.name] = Math.random() > 0.5;
                    break;
            }
        }

        // Sauvegarde du formulaire
        const id = generateId(20);

        promises.push(
            FILE_HELPER.write(ENTRIES_DIR + id + ".json", save)
                .then(() => {
                    return SyncManager.add(id, save)
                })
        );

        if (SD_FILE_HELPER) {
            SD_FILE_HELPER.write(ENTRIES_DIR + id + ".json", save).catch(error => Logger.error("Error while writing to SD:", error));
        }
    }

    await Promise.all(promises);
}

export function takeAPicture() : Promise<string> {
    return new Promise((resolve, reject) => {
        if (device.platform === "browser") {
            reject(); return;
        }

        navigator.camera.getPicture(resolve, reject);
    });
}

/**
 * Returns a PATH to a recorded video (not a base64 string !)
 *
 * @export
 * @returns {Promise<MediaFile>}
 */
export function takeAVideo() : Promise<MediaFile> {
    return new Promise((resolve, reject) => {
        if (device.platform === "browser") {

        }
        
        navigator.device.capture.captureVideo(files => {
            if (files[0]) resolve(files[0]);
            reject("no video");
        }, reject, { limit: 1 });
    })
}

export function cleanTakenPictures() : Promise<void> {
    return new Promise((resolve, reject) => {
        navigator.camera.cleanup(resolve, reject);
    });
}

/**
 * Obtient les répertoires sur cartes SD montés. 
 * Attention, depuis KitKat, la racine de la carte SD n'est PAS accessible en écriture !
 */
export function getSdCardFolder() : Promise<{path: string, filePath: string, canWrite: boolean}[]> {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        cordova.plugins.diagnostic.external_storage.getExternalSdCardDetails(resolve, reject);
    });
}

/**
 * Crée un objet avec des écouteurs de changement/accès aux propriétés
 * @param param0 Objet contenant une fonction get et une fonction set
 * @param base Optionnel. Objet duquel prélever les propriétés
 */
export function makeListenedObject(
    { 
        set = (obj: any, prop: string, value: any) => obj[prop] = value, 
        get = (obj: any, prop: string) => prop in obj ? obj[prop] : undefined
    } = {}, 
    base?: any
) {
    return new Proxy(base ? base : {}, { set, get });
}

interface IDCollection {
    [id: string]: HTMLElement;
}

interface ExtendedHTMLElement extends HTMLElement {
    ids: () => IDCollection;
}

function getIdsBelowElement(this: HTMLElement) : IDCollection {
    const ids = this.querySelectorAll('[id]');

    const obj_ids: IDCollection = {};

    for (const id of ids) {
        obj_ids[id.id] = id as HTMLElement;
    }

    return obj_ids;
}

export function extendHTMLElement(e: HTMLElement) : ExtendedHTMLElement {
    Object.defineProperty(e, 'ids', { 
        get: getIdsBelowElement
    });

    return e as ExtendedHTMLElement;
}
