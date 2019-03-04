import { PageManager } from "./PageManager";
import { Forms, FormSave, FormEntityType } from "./form_schema";
import { SyncManager } from "./SyncManager";
import { writeSdCardFile } from "./sdcard_file";

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

// Met le bon répertoire dans FOLDER. Si le stockage interne/sd n'est pas monté,
// utilise le répertoire data (partition /data) de Android
let FOLDER = cordova.file.externalDataDirectory || cordova.file.dataDirectory;

/**
 * Change le répertoire actif en fonction de la plateforme et l'insère dans FOLDER.
 * Fonction appelée automatiquement au démarrage de l'application dans main.initApp()
 */
export function changeDir() {
    if (device.platform === "browser") {
        FOLDER = "cdvfile://localhost/temporary/";

        // Permet le bouton retour sur navigateur
        const back_btn = document.getElementById('__nav_back_button')
        back_btn.onclick = function() {
            PageManager.goBack();
        };
        back_btn.classList.remove('hide');
    }
    else if (device.platform === "iOS") {
        FOLDER = cordova.file.dataDirectory;
    }
}

let DIR_ENTRY = null;
/**
 * Lit un fichier et passe son résultat sous forme de texte ou base64 à callback
 * @param fileName Nom du fichier
 * @param callback Fonction appelée si réussie
 * @param callbackIfFailed Fonction appelée en cas d'échec
 * @param asBase64 true si le fichier doit être passé encodé en base64
 */
export function readFromFile(fileName: string, callback: Function, callbackIfFailed?: Function, asBase64 = false) : void {
    const pathToFile = FOLDER + fileName;
    window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
        (fileEntry as FileEntry).file(function (file) {
            const reader = new FileReader();

            reader.onloadend = function () {
                callback(this.result);
            };

            if (asBase64) {
                reader.readAsDataURL(file);
            }
            else {
                reader.readAsText(file);
            }
        }, function() {
            if (callbackIfFailed) {
                callbackIfFailed();
            }
            else {
                console.log("not readable");
            }
        });
    }, function() {
        if (callbackIfFailed) {
            callbackIfFailed();
        }
        else {
            console.log("not found");
        }
    });
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

export function readFileAsArrayBuffer(file: File) : Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();

        r.onload = function() {
            resolve(this.result as ArrayBuffer);
        }

        r.onerror = function(error) {
            // Erreur de lecture du fichier => on rejette
            reject(error);
        }

        r.readAsArrayBuffer(file);
    });
}

/**
 * Lit un fichier fileName en tant que texte ou base64, et passe le résultat ou l'échec sous forme de Promise
 * @param fileName Nom du fichier
 * @param asBase64 true si fichier passé en base64 dans la promesse
 * @param forceBaseDir Forcer un répertoire d'origine pour le nom du fichier. (défaut: dossier de stockage de données)
 */
export function readFile(fileName: string, asBase64 = false, forceBaseDir = FOLDER) : Promise<string> {
    const pathToFile = forceBaseDir + fileName;

    return new Promise(function(resolve, reject) {
        window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
            (fileEntry as FileEntry).file(function (file) {
                const reader = new FileReader();
    
                reader.onloadend = function () {
                    resolve(this.result as string);
                };
    
                if (asBase64) {
                    reader.readAsDataURL(file);
                }
                else {
                    reader.readAsText(file);
                }
            }, reject);
        }, function(err) {
            reject(err);
        });
    });
}

/**
 * Lit un fichier en texte ou base64 depuis son FileEntry et envoie son résultat dans une Promise
 * @param fileEntry FileEntry
 * @param asBase64 true si fichier passé en base64 à la Promise
 */
export function readFileFromEntry(fileEntry, asBase64 = false) : Promise<string> {
    return new Promise(function(resolve, reject) {
        fileEntry.file(function (file) {
            const reader = new FileReader();
    
            reader.onloadend = function () {
                resolve(this.result as string);
            };
    
            if (asBase64) {
                reader.readAsDataURL(file);
            }
            else {
                reader.readAsText(file);
            }
        }, reject);
    });
}

/**
 * Version Promise de getDir.
 * Voir getDir().
 * @param dirName string Nom du répertoire
 * @return Promise<DirectoryEntry>
 */
export function getDirP(dirName: string) : Promise<DirectoryEntry> {
    return new Promise((resolve, reject) => {
        getDir(resolve, dirName, reject);
    });
}

/**
 * Appelle le callback avec l'entrée de répertoire voulu par le chemin dirName précisé.
 * Sans dirName, renvoie la racine du système de fichiers.
 * @param callback Function(dirEntry) => void
 * @param dirName string
 * @param onError Function(error) => void
 */
export function getDir(callback: (dirEntry: DirectoryEntry) => void, dirName: string = "", onError?) {
    function callGetDirEntry(dirEntry: DirectoryEntry) {
        DIR_ENTRY = dirEntry;

        if (dirName) {
            dirEntry.getDirectory(dirName, { create: true, exclusive: false }, (newEntry: DirectoryEntry) => {
                if (callback) {
                    callback(newEntry);
                }
            }, (err) => { 
                console.log("Unable to create dir"); 
                if (onError) {
                    onError(err);
                }
            });
        }
        else if (callback) {
            callback(dirEntry);
        }
    }

    // par défaut, FOLDER vaut "cdvfile://localhost/persistent/"

    if (DIR_ENTRY === null) {
        window.resolveLocalFileSystemURL(FOLDER, 
            (dirEntry: Entry) => {
                callGetDirEntry(dirEntry as DirectoryEntry);
            }, (err) => { 
            console.log("Persistent not available", err.code); 
            if (onError) {
                onError(err);
            }
        });
    }
    else {
        callGetDirEntry(DIR_ENTRY);
    }
}

export function writeFileP(dirName: string, fileName: string, blob: Blob) : Promise<any> {
    return new Promise((resolve, reject) => {
        writeFile(dirName, fileName, blob, resolve, reject);
    });
}

/**
 * Écrit dans le fichier fileName situé dans le dossier dirName le contenu du Blob blob.
 * Après écriture, appelle callback si réussi, onFailure si échec dans toute opération
 * @param dirName string
 * @param fileName string
 * @param blob Blob
 * @param callback Function() => void
 * @param onFailure Function(error) => void | Généralement, error est une FileError
 */
export function writeFile(dirName: string, fileName: string, blob: Blob, callback?, onFailure?) {
    getDir(function(dirEntry) {
        dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
            writeFileFromEntry(fileEntry, blob).then(function(){
                if (callback) {
                    callback();
                }
            }).catch(error => { if (onFailure) onFailure(error); });
        }, function(err) { console.log("Error in writing file", err.code); if (onFailure) { onFailure(err); } });
    }, dirName);
}

export function writeFileFromEntry(file: FileEntry, content: Blob) : Promise<void> {
    // Prend l'entry du fichier et son blob à écrire en paramètre
    return new Promise(function (resolve, reject) {
        // Fonction pour écrire le fichier après vidage
        function finally_write() {
            file.createWriter(function (fileWriter) {
                fileWriter.onerror = function (e) {
                    reject(e);
                };

                fileWriter.onwriteend = null;
                fileWriter.write(content);

                fileWriter.onwriteend = resolve as () => void;
            });
        }

        // Vide le fichier
        file.createWriter(function (fileWriter) {
            fileWriter.onerror = function (e) {
                reject(e);
            };

            // Vide le fichier
            fileWriter.truncate(0);

            // Quand le fichier est vidé, on écrit finalement dedans
            fileWriter.onwriteend = finally_write;
        });
    });
}

/**
 * Crée un dossier name dans la racine du système de fichiers.
 * Si name vaut "dir1/dir2", le dossier "dir2" sera créé si et uniquement si "dir1" existe.
 * Si réussi, appelle onSuccess avec le dirEntry du dossier créé.
 * Si échec, appelle onError avec l'erreur
 * @param name string
 * @param onSuccess Function(dirEntry) => void
 * @param onError Function(error: FileError) => void
 */
export function createDir(name: string, onSuccess?: (dirEntry: DirectoryEntry) => void, onError?: (error: FileError) => void) {
    getDir(function(dirEntry) {
        dirEntry.getDirectory(name, { create: true }, onSuccess, onError);
    });
}

/**
 * Fonction de test.
 * Affiche les entrées du répertoire path dans la console.
 * Par défaut, affiche la racine du système de fichiers.
 * @param path string
 */
export function listDir(path: string = "") : void {
    getDir(function (fileSystem) {
        const reader = fileSystem.createReader();
        reader.readEntries(
            function (entries) {
                console.log(entries);
            },
            function (err) {
                console.log(err);
            }
        );
    }, path);
}

export function sleep(ms: number) : Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

export function dirEntries(dirEntry: DirectoryEntry) : Promise<Entry[]> {
    return new Promise(function(resolve, reject) {
        const reader = dirEntry.createReader();
        reader.readEntries(
            function (entries) {
                resolve(entries);
            },
            function (err) {
                reject(err);
            }
        );
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
export function getLocation(onSuccess: (coords: Position) => any, onFailed?) {
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
 * Supprime un fichier par son nom de dossier dirName et son nom de fichier fileName.
 * Si le chemin du fichier est "dir1/file.json", dirName = "dir1" et fileName = "file.json"
 * @param dirName string
 * @param fileName string
 * @param callback Function() => void Fonction appelée quand le fichier est supprimé
 */
export function removeFileByName(dirName: string, fileName: string, callback?: () => void) : void {
    getDir(function(dirEntry) {
        dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
            removeFile(fileEntry, callback);
        });
    }, dirName);
}

/**
 * Supprime un fichier via son fileEntry
 * @param entry fileEntry
 * @param callback Function(any?) => void Fonction appelée quand le fichier est supprimé (ou pas)
 */
export function removeFile(entry, callback?: (any?) => void) : void {
    entry.remove(function() { 
        // Fichier supprimé !
        if (callback) callback();
    }, function(err) {
        console.log("error", err);
        if (callback) callback(err);
    }, function() {
        console.log("file not found");
        if (callback) callback(false);
    });
}

/**
 * Supprime un fichier via son fileEntry
 * @param entry fileEntry
 * @returns Promise Promesse tenue si le fichier est supprimé, rejetée sinon
 */
export function removeFilePromise(entry) : Promise<void> {
    return new Promise(function(resolve, reject) {
        entry.remove(function() { 
            // Fichier supprimé !
            resolve();
        }, function(err) {
            reject(err);
        }, function() {
            resolve();
        });
    });
}

/**
 * Supprime tous les fichiers d'un répertoire, sans le répertoire lui-même.
 * @param dirName string Chemin du répertoire
 * @param callback NE PAS UTILISER. USAGE INTERNE.
 * @param dirEntry NE PAS UTILISER. USAGE INTERNE.
 */
export function rmrf(dirName?: string, callback?: () => void, dirEntry?) : void {
    // Récupère le dossier dirName (ou la racine du système de fichiers)
    function readDirEntry(dirEntry) {
        const reader = dirEntry.createReader();
        // Itère sur les entrées du répertoire via readEntries
        reader.readEntries(function (entries) {
            // Pour chaque entrée du dossier
            for (const entry of entries) {
                if (entry.isDirectory) { 
                    // Si c'est un dossier, on appelle rmrf sur celui-ci,
                    rmrf(entry.fullPath, function() {
                        // Puis on le supprime lui-même
                        removeFile(entry, callback);
                    });
                }
                else {
                    // Si c'est un fichier, on le supprime
                    removeFile(entry, callback);
                }
            }
        });
    }

    if (dirEntry) {
        readDirEntry(dirEntry);
    }
    else {
        getDir(readDirEntry, dirName, function() {
            if (callback) callback();
        });
    }   
}

/**
 * Supprime le dossier dirName et son contenu. [version améliorée de rmrf()]
 * Utilise les Promise en interne pour une plus grande efficacité, au prix d'une utilisation mémoire plus importante.
 * Si l'arborescence est très grande sous la dossier, subdivisez la suppression.
 * @param dirName string Chemin du dossier à supprimer
 * @param deleteSelf boolean true si le dossier à supprimer doit également l'être
 * @returns Promise Promesse tenue si suppression réussie, rompue sinon
 */
export function rmrfPromise(dirName: string, deleteSelf: boolean = false) : Promise<void> {
    function rmrfFromEntry(dirEntry) : Promise<void> {
        return new Promise(function(resolve, reject) {
            const reader = dirEntry.createReader();
            // Itère sur les entrées du répertoire via readEntries
            reader.readEntries(function (entries) {
                // Pour chaque entrée du dossier
                const promises: Promise<void>[] = [];

                for (const entry of entries) {
                    promises.push(
                        new Promise(function(resolve, reject) {
                            if (entry.isDirectory) { 
                                // Si c'est un dossier, on appelle rmrf sur celui-ci,
                                rmrfFromEntry(entry).then(function() {
                                    // Quand c'est fini, on supprime le répertoire lui-même
                                    // Puis on résout
                                    removeFilePromise(entry).then(resolve).catch(reject)
                                });
                            }
                            else {
                                // Si c'est un fichier, on le supprime
                                removeFilePromise(entry).then(resolve).catch(reject);
                            }
                        })
                    );
                }

                // Attends que tous les fichiers et dossiers de ce dossier soient supprimés
                Promise.all(promises).then(function() {
                    // Quand ils le sont, résout la promesse
                    resolve();
                }).catch(reject);
            });
        });
    }

    return new Promise(function(resolve, reject) {
        getDir(
            function(dirEntry) {
                // Attends que tous les dossiers soient supprimés sous ce répertoire
                rmrfFromEntry(dirEntry).then(function() {
                    // Si on doit supprimer le dossier et que ce n'est pas la racine
                    if (deleteSelf && dirName !== "") {
                        // On supprime puis on résout
                        removeFilePromise(dirEntry).then(resolve).catch(reject);
                    }
                    // On résout immédiatement
                    else {
                        resolve();
                    }
                }).catch(reject);
            }, 
            dirName, 
            reject
        );
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
 * @param schema string Schéma de la chaîne. Supporte Y, m, d, h, H, i, s, n, N, v, z, w
 * @param date Date Date depuis laquelle effectuer le formatage
 * @returns string La châine formatée
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
    const h = date.getHours();
    const s = ((date.getSeconds()) < 10 ? "0" : "") + String(date.getSeconds());

    const replacements = {
        Y, m, d, i, H, h, s, n, N, L, v: date.getMilliseconds(), z: getDayOfTheYear, w: date.getDay()
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
 * @param path string
 * @param element HTMLImageElement
 */
export function createImgSrc(path: string, element: HTMLImageElement) : void {
    const parts = path.split('/');
    const file_name = parts.pop();
    const dir_name = parts.join('/');

    getDir(function(dirEntry) {
        dirEntry.getFile(file_name, { create: false }, function (fileEntry) {
            element.src = fileEntry.toURL();
        });
    }, dir_name);
}

/**
 * Convertit un Blob en chaîne base64.
 * @param blob Blob Données binaires à convertir en base64
 */
export function blobToBase64(blob: Blob) : Promise<string> {
    const reader = new FileReader();

    return new Promise(function(resolve, reject) {
        reader.onload = function() {
            resolve(reader.result as string);
        };
        reader.onerror = function(e) {
            reject(e);
        }

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
export function informalBottomModal(title: string, info: string, text_close = "Fermer") : void {
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
export function askModal(title: string, question: string, text_yes = "Oui", text_no = "Non", checkbox?: string) : Promise<any> {
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

export function convertHTMLToElement(htmlString: string) : HTMLElement {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.firstElementChild as HTMLElement;
}

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

export function convertMinutesToText(min: number) : string {
    if (min < 60) {
        return `${min} minutes`;
    }
    else {
        const hours = Math.trunc(min / 60);
        const minutes = Math.trunc(min % 60);

        return `${hours} heure${hours > 1 ? 's' : ''} ${minutes || ""}`;
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

export async function createRandomForms(count: 50) : Promise<void> {
    if (Forms.current_key === null) {
        throw "Impossible de créer des formulaires sans base";
    }

    const current = Forms.getForm(Forms.current_key);
    const promises: Promise<any>[] = [];
    for (let i = 0; i < count; i++) {
        const save: FormSave = {
            fields: {},
            location: "",
            type: Forms.current_key,
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
        promises.push(
            new Promise((resolve, reject) => {
                const id = generateId(20);
                writeFile('forms', id + '.json', new Blob([JSON.stringify(save)]), function() {
                    SyncManager.add(id, save).then(resolve).catch(reject);
                }, reject);
            })
        );

        writeSdCardFile("forms/" + generateId(20) + ".json", new Blob([JSON.stringify(save)]))
            .catch(error => console.log(error));
    }

    await Promise.all(promises);
}

export async function removeContentOfDirectory(name: string) {
    const entry = await getDirP(name);

    await new Promise((resolve, reject) => {
        entry.removeRecursively(resolve, reject);
    });
    
    // Recrée le répertoire
    await getDirP(name);
}
