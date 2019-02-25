"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define("helpers", ["require", "exports", "PageManager"], function (require, exports, PageManager_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // PRELOADERS: spinners for waiting time
    exports.PRELOADER_BASE = `
<div class="spinner-layer spinner-blue-only">
    <div class="circle-clipper left">
        <div class="circle"></div>
    </div><div class="gap-patch">
        <div class="circle"></div>
    </div><div class="circle-clipper right">
        <div class="circle"></div>
    </div>
</div>`;
    exports.PRELOADER = `
<div class="preloader-wrapper active">
    ${exports.PRELOADER_BASE}
</div>`;
    exports.SMALL_PRELOADER = `
<div class="preloader-wrapper small active">
    ${exports.PRELOADER_BASE}
</div>`;
    exports.MODAL_PRELOADER_TEXT_ID = "__classic_preloader_text";
    /**
     * @returns HTMLElement Élément HTML dans lequel écrire pour modifier la page active
     */
    function getBase() {
        return document.getElementById('main_block');
    }
    exports.getBase = getBase;
    /**
     * Initialise le modal simple avec les options données (voir doc.)
     * et insère de l'HTML dedans avec content
     * @returns M.Modal Instance du modal instancié avec Materialize
     */
    function initModal(options = {}, content) {
        const modal = getModal();
        modal.classList.remove('modal-fixed-footer');
        if (content)
            modal.innerHTML = content;
        return M.Modal.init(modal, options);
    }
    exports.initModal = initModal;
    /**
     * Initialise le modal collé en bas avec les options données (voir doc.)
     * et insère de l'HTML dedans avec content
     * @returns M.Modal Instance du modal instancié avec Materialize
     */
    function initBottomModal(options = {}, content) {
        const modal = getBottomModal();
        if (content)
            modal.innerHTML = content;
        return M.Modal.init(modal, options);
    }
    exports.initBottomModal = initBottomModal;
    /**
     * @returns HTMLElement Élément HTML racine du modal
     */
    function getModal() {
        return document.getElementById('modal_placeholder');
    }
    exports.getModal = getModal;
    /**
     * @returns HTMLElement Élément HTML racine du modal fixé en bas
     */
    function getBottomModal() {
        return document.getElementById('bottom_modal_placeholder');
    }
    exports.getBottomModal = getBottomModal;
    /**
     * @returns M.Modal Instance du modal (doit être initialisé)
     */
    function getModalInstance() {
        return M.Modal.getInstance(getModal());
    }
    exports.getModalInstance = getModalInstance;
    /**
     * @returns M.Modal Instance du modal fixé en bas (doit être initialisé)
     */
    function getBottomModalInstance() {
        return M.Modal.getInstance(getBottomModal());
    }
    exports.getBottomModalInstance = getBottomModalInstance;
    /**
     * Génère un spinner centré sur l'écran avec un message d'attente
     * @param text Texte à insérer comme message de chargement
     * @returns string HTML à insérer
     */
    function getPreloader(text) {
        return `
    <center style="margin-top: 35vh;">
        ${exports.PRELOADER}
    </center>
    <center class="flow-text" style="margin-top: 10px">${text}</center>
    `;
    }
    exports.getPreloader = getPreloader;
    /**
     * Génère un spinner adapté à un modal avec un message d'attente
     * @param text Texte à insérer comme message de chargement
     * @returns string HTML à insérer dans la racine d'un modal
     */
    function getModalPreloader(text, footer = "") {
        return `<div class="modal-content">
    <center>
        ${exports.SMALL_PRELOADER}
    </center>
    <center class="flow-text pre-wrapper" id="${exports.MODAL_PRELOADER_TEXT_ID}" style="margin-top: 10px">${text}</center>
    </div>
    ${footer}
    `;
    }
    exports.getModalPreloader = getModalPreloader;
    // dec2hex :: Integer -> String
    function dec2hex(dec) {
        return ('0' + dec.toString(16)).substr(-2);
    }
    /**
     * Génère un identifiant aléatoire
     * @param len Longueur de l'ID
     */
    function generateId(len) {
        const arr = new Uint8Array((len || 40) / 2);
        window.crypto.getRandomValues(arr);
        return Array.from(arr, dec2hex).join('');
    }
    exports.generateId = generateId;
    // USELESS
    function saveDefaultForm() {
        // writeFile('schemas/', 'default.json', new Blob([JSON.stringify(current_form)], {type: "application/json"}));
    }
    exports.saveDefaultForm = saveDefaultForm;
    // @ts-ignore 
    // Met le bon répertoire dans FOLDER. Si le stockage interne/sd n'est pas monté,
    // utilise le répertoire data (partition /data) de Android
    let FOLDER = cordova.file.externalDataDirectory || cordova.file.dataDirectory;
    /**
     * Change le répertoire actif en fonction de la plateforme et l'insère dans FOLDER.
     * Fonction appelée automatiquement au démarrage de l'application dans main.initApp()
     */
    function changeDir() {
        // @ts-ignore
        if (device.platform === "browser") {
            FOLDER = "cdvfile://localhost/temporary/";
            // Permet le bouton retour sur navigateur
            const back_btn = document.getElementById('__nav_back_button');
            back_btn.onclick = function () {
                PageManager_1.PageManager.goBack();
            };
            back_btn.classList.remove('hide');
        }
        // @ts-ignore
        else if (device.platform === "iOS") {
            // @ts-ignore
            FOLDER = cordova.file.dataDirectory;
        }
    }
    exports.changeDir = changeDir;
    let DIR_ENTRY = null;
    /**
     * Lit un fichier et passe son résultat sous forme de texte ou base64 à callback
     * @param fileName Nom du fichier
     * @param callback Fonction appelée si réussie
     * @param callbackIfFailed Fonction appelée en cas d'échec
     * @param asBase64 true si le fichier doit être passé encodé en base64
     */
    function readFromFile(fileName, callback, callbackIfFailed, asBase64 = false) {
        // @ts-ignore
        const pathToFile = FOLDER + fileName;
        // @ts-ignore
        window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
            fileEntry.file(function (file) {
                const reader = new FileReader();
                reader.onloadend = function (e) {
                    callback(this.result);
                };
                if (asBase64) {
                    reader.readAsDataURL(file);
                }
                else {
                    reader.readAsText(file);
                }
            }, function () {
                if (callbackIfFailed) {
                    callbackIfFailed();
                }
                else {
                    console.log("not readable");
                }
            });
        }, function () {
            if (callbackIfFailed) {
                callbackIfFailed();
            }
            else {
                console.log("not found");
            }
        });
    }
    exports.readFromFile = readFromFile;
    /**
     * Renvoie un début d'URL valide pour charger des fichiers internes à l'application sur tous les périphériques.
     */
    function toValidUrl() {
        // @ts-ignore
        if (device.platform === "browser") {
            return '';
        }
        // @ts-ignore
        return cordova.file.applicationDirectory + 'www/';
    }
    exports.toValidUrl = toValidUrl;
    /**
     * Lit un fichier fileName en tant que texte ou base64, et passe le résultat ou l'échec sous forme de Promise
     * @param fileName Nom du fichier
     * @param asBase64 true si fichier passé en base64 dans la promesse
     * @param forceBaseDir Forcer un répertoire d'origine pour le nom du fichier. (défaut: dossier de stockage de données)
     */
    function readFile(fileName, asBase64 = false, forceBaseDir = FOLDER) {
        const pathToFile = forceBaseDir + fileName;
        return new Promise(function (resolve, reject) {
            // @ts-ignore
            window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
                fileEntry.file(function (file) {
                    const reader = new FileReader();
                    reader.onloadend = function (e) {
                        resolve(this.result);
                    };
                    if (asBase64) {
                        reader.readAsDataURL(file);
                    }
                    else {
                        reader.readAsText(file);
                    }
                }, reject);
            }, function (err) {
                reject(err);
            });
        });
    }
    exports.readFile = readFile;
    /**
     * Lit un fichier en texte ou base64 depuis son FileEntry et envoie son résultat dans une Promise
     * @param fileEntry FileEntry
     * @param asBase64 true si fichier passé en base64 à la Promise
     */
    function readFileFromEntry(fileEntry, asBase64 = false) {
        return new Promise(function (resolve, reject) {
            fileEntry.file(function (file) {
                const reader = new FileReader();
                reader.onloadend = function (e) {
                    resolve(this.result);
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
    exports.readFileFromEntry = readFileFromEntry;
    /**
     * Version Promise de getDir.
     * Voir getDir().
     * @param dirName string Nom du répertoire
     * @return Promise<DirectoryEntry>
     */
    function getDirP(dirName) {
        return new Promise((resolve, reject) => {
            getDir(resolve, dirName, reject);
        });
    }
    exports.getDirP = getDirP;
    /**
     * Appelle le callback avec l'entrée de répertoire voulu par le chemin dirName précisé.
     * Sans dirName, renvoie la racine du système de fichiers.
     * @param callback Function(dirEntry) => void
     * @param dirName string
     * @param onError Function(error) => void
     */
    function getDir(callback, dirName = "", onError) {
        function callGetDirEntry(dirEntry) {
            DIR_ENTRY = dirEntry;
            if (dirName) {
                dirEntry.getDirectory(dirName, { create: true, exclusive: false }, (newEntry) => {
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
            // @ts-ignore
            window.resolveLocalFileSystemURL(FOLDER, callGetDirEntry, (err) => {
                console.log("Persistent not available", err.message);
                if (onError) {
                    onError(err);
                }
            });
        }
        else {
            callGetDirEntry(DIR_ENTRY);
        }
    }
    exports.getDir = getDir;
    /**
     * Écrit dans le fichier fileName situé dans le dossier dirName le contenu du Blob blob.
     * Après écriture, appelle callback si réussi, onFailure si échec dans toute opération
     * @param dirName string
     * @param fileName string
     * @param blob Blob
     * @param callback Function() => void
     * @param onFailure Function(error) => void | Généralement, error est une DOMException
     */
    function writeFile(dirName, fileName, blob, callback, onFailure) {
        getDir(function (dirEntry) {
            dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
                write(fileEntry, blob).then(function () {
                    if (callback) {
                        callback();
                    }
                }).catch(error => { if (onFailure)
                    onFailure(error); });
            }, function (err) { console.log("Error in writing file", err.message); if (onFailure) {
                onFailure(err);
            } });
        }, dirName);
        function write(fileEntry, dataObj) {
            // Prend l'entry du fichier et son blob à écrire en paramètre
            return new Promise(function (resolve, reject) {
                // Fonction pour écrire le fichier après vidage
                function finally_write() {
                    fileEntry.createWriter(function (fileWriter) {
                        fileWriter.onerror = function (e) {
                            reject(e);
                        };
                        fileWriter.onwriteend = null;
                        fileWriter.write(dataObj);
                        fileWriter.onwriteend = function () {
                            resolve();
                        };
                    });
                }
                // Vide le fichier
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onerror = function (e) {
                        reject(e);
                    };
                    // Vide le fichier
                    fileWriter.truncate(0);
                    // Quand le fichier est vidé, on écrit finalement... enfin.. dedans
                    fileWriter.onwriteend = finally_write;
                });
            });
        }
    }
    exports.writeFile = writeFile;
    /**
     * Crée un dossier name dans la racine du système de fichiers.
     * Si name vaut "dir1/dir2", le dossier "dir2" sera créé si et uniquement si "dir1" existe.
     * Si réussi, appelle onSuccess avec le dirEntry du dossier créé.
     * Si échec, appelle onError avec l'erreur
     * @param name string
     * @param onSuccess Function(dirEntry) => void
     * @param onError Function(error: DOMException) => void
     */
    function createDir(name, onSuccess, onError) {
        getDir(function (dirEntry) {
            dirEntry.getDirectory(name, { create: true }, onSuccess, onError);
        });
    }
    exports.createDir = createDir;
    /**
     * Fonction de test.
     * Affiche les entrées du répertoire path dans la console.
     * Par défaut, affiche la racine du système de fichiers.
     * @param path string
     */
    function listDir(path = "") {
        // @ts-ignore
        getDir(function (fileSystem) {
            const reader = fileSystem.createReader();
            reader.readEntries(function (entries) {
                console.log(entries);
            }, function (err) {
                console.log(err);
            });
        }, path);
    }
    exports.listDir = listDir;
    function sleep(ms) {
        return new Promise((resolve, _) => {
            setTimeout(resolve, ms);
        });
    }
    exports.sleep = sleep;
    function dirEntries(dirEntry) {
        return new Promise(function (resolve, reject) {
            const reader = dirEntry.createReader();
            reader.readEntries(function (entries) {
                resolve(entries);
            }, function (err) {
                reject(err);
            });
        });
    }
    exports.dirEntries = dirEntries;
    /**
     * Fonction de test.
     * Écrit l'objet obj sérialisé en JSON à la fin de l'élément HTML ele.
     * @param ele HTMLElement
     * @param obj any
     */
    function printObj(ele, obj) {
        ele.insertAdjacentText('beforeend', JSON.stringify(obj, null, 2));
    }
    exports.printObj = printObj;
    /**
     * Obtient la localisation de l'utilisation.
     * Si réussi, onSuccess est appelée avec en paramètre un objet de type Position
     * @param onSuccess Function(coords: Position) => void
     * @param onFailed Function(error) => void
     */
    function getLocation(onSuccess, onFailed) {
        navigator.geolocation.getCurrentPosition(onSuccess, onFailed, { timeout: 30 * 1000, maximumAge: 5 * 60 * 1000 });
    }
    exports.getLocation = getLocation;
    /**
     * Calcule la distance en mètres entre deux coordonnées GPS.
     * Les deux objets passés doivent implémenter l'interface CoordsLike
     * @param coords1 CoordsLike
     * @param coords2 CoordsLike
     * @returns number Nombre de mètres entre les deux coordonnées
     */
    function calculateDistance(coords1, coords2) {
        // @ts-ignore
        return geolib.getDistance({ latitude: coords1.latitude, longitude: coords1.longitude }, { latitude: coords2.latitude, longitude: coords2.longitude });
    }
    exports.calculateDistance = calculateDistance;
    /**
     * Fonction de test pour tester la géolocalisation.
     * @param latitude
     * @param longitude
     */
    function testDistance(latitude = 45.353421, longitude = 5.836441) {
        getLocation(function (res) {
            console.log(calculateDistance(res.coords, { latitude, longitude }));
        }, function (error) {
            console.log(error);
        });
    }
    exports.testDistance = testDistance;
    /**
     * Supprime un fichier par son nom de dossier dirName et son nom de fichier fileName.
     * Si le chemin du fichier est "dir1/file.json", dirName = "dir1" et fileName = "file.json"
     * @param dirName string
     * @param fileName string
     * @param callback Function() => void Fonction appelée quand le fichier est supprimé
     */
    function removeFileByName(dirName, fileName, callback) {
        getDir(function (dirEntry) {
            dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
                removeFile(fileEntry, callback);
            });
        }, dirName);
    }
    exports.removeFileByName = removeFileByName;
    /**
     * Supprime un fichier via son fileEntry
     * @param entry fileEntry
     * @param callback Function(any?) => void Fonction appelée quand le fichier est supprimé (ou pas)
     */
    function removeFile(entry, callback) {
        entry.remove(function () {
            // Fichier supprimé !
            if (callback)
                callback();
        }, function (err) {
            console.log("error", err);
            if (callback)
                callback(err);
        }, function () {
            console.log("file not found");
            if (callback)
                callback(false);
        });
    }
    exports.removeFile = removeFile;
    /**
     * Supprime un fichier via son fileEntry
     * @param entry fileEntry
     * @returns Promise Promesse tenue si le fichier est supprimé, rejetée sinon
     */
    function removeFilePromise(entry) {
        return new Promise(function (resolve, reject) {
            entry.remove(function () {
                // Fichier supprimé !
                resolve();
            }, function (err) {
                reject(err);
            }, function () {
                resolve();
            });
        });
    }
    exports.removeFilePromise = removeFilePromise;
    /**
     * Supprime tous les fichiers d'un répertoire, sans le répertoire lui-même.
     * @param dirName string Chemin du répertoire
     * @param callback NE PAS UTILISER. USAGE INTERNE.
     * @param dirEntry NE PAS UTILISER. USAGE INTERNE.
     */
    function rmrf(dirName, callback, dirEntry) {
        // Récupère le dossier dirName (ou la racine du système de fichiers)
        function readDirEntry(dirEntry) {
            const reader = dirEntry.createReader();
            // Itère sur les entrées du répertoire via readEntries
            reader.readEntries(function (entries) {
                // Pour chaque entrée du dossier
                for (const entry of entries) {
                    if (entry.isDirectory) {
                        // Si c'est un dossier, on appelle rmrf sur celui-ci,
                        rmrf(entry.fullPath, function () {
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
            getDir(readDirEntry, dirName, function () {
                if (callback)
                    callback();
            });
        }
    }
    exports.rmrf = rmrf;
    /**
     * Supprime le dossier dirName et son contenu. [version améliorée de rmrf()]
     * Utilise les Promise en interne pour une plus grande efficacité, au prix d'une utilisation mémoire plus importante.
     * Si l'arborescence est très grande sous la dossier, subdivisez la suppression.
     * @param dirName string Chemin du dossier à supprimer
     * @param deleteSelf boolean true si le dossier à supprimer doit également l'être
     * @returns Promise Promesse tenue si suppression réussie, rompue sinon
     */
    function rmrfPromise(dirName, deleteSelf = false) {
        function rmrfFromEntry(dirEntry) {
            return new Promise(function (resolve, reject) {
                const reader = dirEntry.createReader();
                // Itère sur les entrées du répertoire via readEntries
                reader.readEntries(function (entries) {
                    // Pour chaque entrée du dossier
                    const promises = [];
                    for (const entry of entries) {
                        promises.push(new Promise(function (resolve, reject) {
                            if (entry.isDirectory) {
                                // Si c'est un dossier, on appelle rmrf sur celui-ci,
                                rmrfFromEntry(entry).then(function () {
                                    // Quand c'est fini, on supprime le répertoire lui-même
                                    // Puis on résout
                                    removeFilePromise(entry).then(resolve).catch(reject);
                                });
                            }
                            else {
                                // Si c'est un fichier, on le supprime
                                removeFilePromise(entry).then(resolve).catch(reject);
                            }
                        }));
                    }
                    // Attends que tous les fichiers et dossiers de ce dossier soient supprimés
                    Promise.all(promises).then(function () {
                        // Quand ils le sont, résout la promesse
                        resolve();
                    }).catch(reject);
                });
            });
        }
        return new Promise(function (resolve, reject) {
            getDir(function (dirEntry) {
                // Attends que tous les dossiers soient supprimés sous ce répertoire
                rmrfFromEntry(dirEntry).then(function () {
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
            }, dirName, reject);
        });
    }
    exports.rmrfPromise = rmrfPromise;
    /**
     * Formate un objet Date en chaîne de caractères potable.
     * @param date Date
     * @param withTime boolean Détermine si la chaîne de caractères contient l'heure et les minutes
     * @returns string La châine formatée
     */
    function formatDate(date, withTime = false) {
        const m = ((date.getMonth() + 1) < 10 ? "0" : "") + String(date.getMonth() + 1);
        const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
        const min = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
        return `${d}/${m}/${date.getFullYear()}` + (withTime ? ` ${date.getHours()}h${min}` : "");
    }
    exports.formatDate = formatDate;
    /**
     * Formate un objet Date en chaîne de caractères potable.
     * Pour comprendre les significations des lettres du schéma, se référer à : http://php.net/manual/fr/function.date.php
     * @param schema string Schéma de la chaîne. Supporte Y, m, d, h, H, i, s, n, N, v, z, w
     * @param date Date Date depuis laquelle effectuer le formatage
     * @returns string La châine formatée
     */
    function dateFormatter(schema, date = new Date()) {
        function getDayOfTheYear(now) {
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
    exports.dateFormatter = dateFormatter;
    /**
     * Assigne la balise src de l'image element au contenu de l'image située dans path.
     * @param path string
     * @param element HTMLImageElement
     */
    function createImgSrc(path, element) {
        const parts = path.split('/');
        const file_name = parts.pop();
        const dir_name = parts.join('/');
        getDir(function (dirEntry) {
            dirEntry.getFile(file_name, { create: false }, function (fileEntry) {
                element.src = fileEntry.toURL();
            });
        }, dir_name);
    }
    exports.createImgSrc = createImgSrc;
    /**
     * Convertit un Blob en chaîne base64.
     * @param blob Blob Données binaires à convertir en base64
     */
    function blobToBase64(blob) {
        const reader = new FileReader();
        return new Promise(function (resolve, reject) {
            reader.onload = function () {
                resolve(reader.result);
            };
            reader.onerror = function (e) {
                reject(e);
            };
            reader.readAsDataURL(blob);
        });
    }
    exports.blobToBase64 = blobToBase64;
    /**
     * Convertit une URL (distante, locale, data:base64...) en objet binaire Blob
     * @param str string URL
     */
    function urlToBlob(str) {
        return fetch(str).then(res => res.blob());
    }
    exports.urlToBlob = urlToBlob;
    /**
     * Ouvre un modal demandant à l'utilisateur de cliquer sur oui ou non
     * @param title string Titre affiché sur le modal
     * @param question string Question complète / détails sur l'action qui sera réalisée
     * @param text_close string Texte affiché sur le bouton de fermeture
     */
    function informalBottomModal(title, question, text_close = "Fermer") {
        const modal = getBottomModal();
        const instance = initBottomModal();
        modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">${title}</h5>
        <p class="flow-text">${question}</p>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat blue-text modal-close right">${text_close}</a>
        <div class="clearb"></div>
    </div>
    `;
        instance.open();
    }
    exports.informalBottomModal = informalBottomModal;
    /**
     * Ouvre un modal demandant à l'utilisateur de cliquer sur oui ou non
     * @param title string Titre affiché sur le modal
     * @param question string Question complète / détails sur l'action qui sera réalisée
     * @param text_yes string Texte affiché sur le bouton de validation
     * @param text_no string Texte affiché sur le bouton d'annulation
     * @returns Promise<void | boolean> Promesse se résolvant quand l'utilisateur approuve, se rompant si l'utilisateur refuse.
     * Si il y a une checkbox, la promesse résolue / rompue reçoit en valeur l'attribut checked de la checkbox
     */
    function askModal(title, question, text_yes = "Oui", text_no = "Non", checkbox) {
        const modal = getBottomModal();
        const instance = initBottomModal({ dismissible: false });
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
        const chk = document.getElementById("__question_checkbox");
        return new Promise(function (resolve, reject) {
            PageManager_1.PageManager.lock_return_button = true;
            document.getElementById('__question_yes').addEventListener('click', () => {
                PageManager_1.PageManager.lock_return_button = false;
                if (chk) {
                    resolve(chk.checked);
                }
                else {
                    resolve();
                }
            });
            document.getElementById('__question_no').addEventListener('click', () => {
                PageManager_1.PageManager.lock_return_button = false;
                if (chk) {
                    reject(chk.checked);
                }
                else {
                    reject();
                }
            });
        });
    }
    exports.askModal = askModal;
    /**
     * Échappe les caractères HTML de la chaîne text
     * @param text string
     */
    function escapeHTML(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    exports.escapeHTML = escapeHTML;
    /**
     * Renvoie une chaîne contenant de l'HTML représentant un message d'information
     * @param title Titre du message
     * @param message Message complémentaire
     */
    function displayInformalMessage(title, message = "") {
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
    exports.displayInformalMessage = displayInformalMessage;
    /**
     * Renvoie une chaîne contenant de l'HTML représentant un message d'erreur
     * @param title Titre a afficher (sera en rouge)
     * @param message Message complémentaire
     */
    function displayErrorMessage(title, message = "") {
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
    exports.displayErrorMessage = displayErrorMessage;
    /**
     * Renvoie vrai si l'utilisateur est en ligne et a une connexion potable.
     */
    function hasGoodConnection() {
        // @ts-ignore
        const networkState = navigator.connection.type;
        // @ts-ignore
        return networkState !== Connection.NONE && networkState !== Connection.CELL && networkState !== Connection.CELL_2G;
    }
    exports.hasGoodConnection = hasGoodConnection;
    function convertHTMLToElement(htmlString) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        return tempDiv.firstElementChild;
    }
    exports.convertHTMLToElement = convertHTMLToElement;
    function showToast(message, duration = 4000) {
        // @ts-ignore
        if (device.platform === "browser") {
            M.toast({ html: message, displayLength: duration });
        }
        else {
            // @ts-ignore
            window.plugins.toast.showWithOptions({
                message,
                duration,
                position: "bottom",
                addPixelsY: -250 // (optional) added a negative value to move it up a bit (default 0)
            });
        }
    }
    exports.showToast = showToast;
    function convertMinutesToText(min) {
        if (min < 60) {
            return `${min} minutes`;
        }
        else {
            const hours = Math.trunc(min / 60);
            const minutes = Math.trunc(min % 60);
            return `${hours} heure${hours > 1 ? 's' : ''} ${minutes || ""}`;
        }
    }
    exports.convertMinutesToText = convertMinutesToText;
    /**
     * Demande à l'utilisateur de choisir parmi une liste
     * @param items Choix possibles. L'insertion d'HTML est autorisé et sera parsé.
     * @returns Index du choix choisi par l'utilisateur
     */
    function askModalList(items) {
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
    exports.askModalList = askModalList;
});
define("vocal_recognition", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // options de la reconnaissance vocale
    const options = {
        language: "fr-FR",
        prompt: "Parlez maintenant"
    };
    /**
     * Récupère le texte dicté par l'utilisateur
     * @param prompt_text Message affiché à l'utilisateur expliquant ce qu'il est censé dire
     * @returns Promesse résolue contenant le texte dicté si réussi. Dans tous les autres cas, promesse rompue.
     */
    function prompt(prompt_text = "Parlez maintenant", as_array = false) {
        return new Promise(function (resolve, reject) {
            options.prompt = prompt_text;
            // @ts-ignore
            if (window.plugins && window.plugins.speechRecognition) {
                // @ts-ignore
                window.plugins.speechRecognition.startListening(function (matches) {
                    // Le premier match est toujours le meilleur
                    if (matches.length > 0) {
                        if (as_array) {
                            resolve(matches);
                            return;
                        }
                        resolve(matches[0]);
                    }
                    else {
                        // La reconnaissance a échoué
                        reject();
                    }
                }, function (error) {
                    // @ts-ignore Polyfill pour le navigateur web
                    if (device.platform === "browser") {
                        // @ts-ignore
                        const speech_reco = window.webkitSpeechRecognition || window.SpeechRecognition;
                        const recognition = new speech_reco();
                        recognition.onresult = (event) => {
                            if (event.results && event.results.length > 0) {
                                if (as_array) {
                                    const array = [];
                                    for (const r of event.results) {
                                        for (const e of r) {
                                            array.push(e.transcript);
                                        }
                                    }
                                    resolve(array);
                                    return;
                                }
                                const speechToText = event.results[0][0].transcript;
                                recognition.stop();
                                resolve(speechToText);
                            }
                            else {
                                reject();
                            }
                        };
                        recognition.onerror = reject;
                        recognition.start();
                        M.toast({ html: prompt_text });
                    }
                    else {
                        reject();
                    }
                }, options);
            }
            else {
                reject();
            }
        });
    }
    exports.prompt = prompt;
});
// export function oldPrompt(text: string = "", options: string[] = ["*"]) : Promise<string> {
//     return new Promise(function(resolve, reject) {
//         const j = Jarvis.Jarvis;
//         j.fatality();
//         j.initialize({
//             lang:"fr-FR",
//             debug: true, // Show what recognizes in the Console
//             listen: true, // Start listening after this
//             speed: 1,
//             continuous: false
//         });
//         try {
//             j.newPrompt({
//                 question: text,
//                 //We set the smart property to true to accept wildcards
//                 smart: true,
//                 options,
//                 beforePrompt: () => {
//                     setTimeout(function() {
//                         M.toast({html: "Parlez maintenant"})
//                     }, 400);
//                 },
//                 onMatch: (i, wildcard) => { // i returns the index of the given options    
//                     let action;
//                     action = () => {
//                         resolve(wildcard);
//                     };
//                     // A function needs to be returned in onMatch event
//                     // in order to accomplish what you want to execute
//                     return action;                       
//                 }
//             });
//         } catch (e) {
//             // Artyom crashes on Cordova. Catching error.
//             // Logger.error(e.stack, e.message);
//         }
//     });
// }
define("logger", ["require", "exports", "helpers"], function (require, exports, helpers_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Objet Logger
    // Sert à écrire dans un fichier de log formaté
    // à la racine du système de fichiers
    var LogLevel;
    (function (LogLevel) {
        LogLevel["debug"] = "debug";
        LogLevel["info"] = "info";
        LogLevel["warn"] = "warn";
        LogLevel["error"] = "error";
    })(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
    /**
     * Logger
     * Permet de logger dans un fichier texte des messages.
     */
    exports.Logger = new class {
        constructor() {
            this._onWrite = false;
            this.delayed = [];
            this.waiting_callee = [];
            this.init_done = false;
            this.init_waiting_callee = [];
            this.tries = 5;
        }
        /**
         * Initialise le logger. Doit être réalisé après app.init() et changeDir().
         * Pour vérifier si le logger est initialisé, utilisez onReady().
         */
        init() {
            this.init_done = false;
            if (this.tries === 0) {
                console.error("Too many init tries. Logger stays uninitialized.");
                return;
            }
            this.tries--;
            helpers_1.getDir((dirEntry) => {
                // Creates a new file or returns the file if it already exists.
                dirEntry.getFile("log.txt", { create: true }, (fileEntry) => {
                    this.fileEntry = fileEntry;
                    this.init_done = true;
                    this.onWrite = false;
                    this.tries = 5;
                    let func;
                    while (func = this.init_waiting_callee.pop()) {
                        func();
                    }
                }, function (err) {
                    console.log("Unable to create file log.", err);
                });
            }, null, function (err) {
                console.log("Unable to enable log.", err);
            });
        }
        /**
         * Vrai si le logger est prêt à écrire / lire dans le fichier de log.
         */
        isInit() {
            return this.init_done;
        }
        /**
         * Si aucun callback n'est précisé, renvoie une Promise qui se résout quand
         * le logger est prêt à recevoir des instructions.
         * @param callback? Function Si précisé, la fonction ne renvoie rien et le callback sera exécuté quand le logger est prêt
         */
        onReady(callback) {
            const oninit = new Promise((resolve, reject) => {
                if (this.isInit()) {
                    resolve();
                }
                else {
                    this.init_waiting_callee.push(resolve);
                }
            });
            if (callback) {
                oninit.then(callback);
            }
            else {
                return oninit;
            }
        }
        get onWrite() {
            return this._onWrite;
        }
        set onWrite(value) {
            this._onWrite = value;
            if (!value && this.delayed.length) {
                // On lance une tâche "delayed" avec le premier élément de la liste (le premier inséré)
                this.write(...this.delayed.shift());
            }
            else if (!value && this.waiting_callee.length) {
                // Si il n'y a aucune tâche en attente, on peut lancer les waiting function
                let func;
                while (func = this.waiting_callee.pop()) {
                    func();
                }
            }
        }
        /**
         * Écrit dans le fichier de log le contenu de text avec le niveau level.
         * Ajoute automatique date et heure au message ainsi qu'un saut de ligne à la fin.
         * Si level vaut debug, rien ne sera affiché dans la console.
         * @param text Message
         * @param level Niveau de log
         */
        write(data, level = LogLevel.warn) {
            if (!Array.isArray(data)) {
                data = [data];
            }
            if (!this.isInit()) {
                this.delayWrite(data, level);
                return;
            }
            // En debug, on écrit dans dans le fichier
            if (level === LogLevel.debug) {
                console.log(...data);
                return;
            }
            // Create a FileWriter object for our FileEntry (log.txt).
            this.fileEntry.createWriter((fileWriter) => {
                fileWriter.onwriteend = () => {
                    this.onWrite = false;
                };
                fileWriter.onerror = (e) => {
                    console.log("Logger: Failed file write: " + e.toString());
                    this.onWrite = false;
                };
                // Append to file
                try {
                    fileWriter.seek(fileWriter.length);
                }
                catch (e) {
                    console.log("Logger: File doesn't exist!", e);
                    return;
                }
                if (!this.onWrite) {
                    if (level === LogLevel.info) {
                        console.log(...data);
                    }
                    else if (level === LogLevel.warn) {
                        console.warn(...data);
                    }
                    else if (level === LogLevel.error) {
                        console.error(...data);
                    }
                    let final = this.createDateHeader(level) + " ";
                    for (const e of data) {
                        final += (typeof e === 'string' ? e : JSON.stringify(e)) + "\n";
                    }
                    this.onWrite = true;
                    fileWriter.write(new Blob([final]));
                }
                else {
                    this.delayWrite(data, level);
                }
            }, (error) => {
                console.error("Impossible d'écrire: ", error.message);
                this.delayWrite(data, level);
                this.init();
            });
        }
        /**
         * Crée une date formatée
         * @param level
         */
        createDateHeader(level) {
            const date = new Date();
            const m = ((date.getMonth() + 1) < 10 ? "0" : "") + String(date.getMonth() + 1);
            const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
            const hour = ((date.getHours()) < 10 ? "0" : "") + String(date.getHours());
            const min = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
            const sec = ((date.getSeconds()) < 10 ? "0" : "") + String(date.getSeconds());
            return `[${level}] [${d}/${m}/${date.getFullYear()} ${hour}:${min}:${sec}]`;
        }
        delayWrite(data, level) {
            this.delayed.push([data, level]);
        }
        /**
         * Si aucun callback n'est précisé, renvoie une Promise qui se résout quand
         * le logger a fini toutes ses opérations d'écriture.
         * @param callbackSuccess? Function Si précisé, la fonction ne renvoie rien et le callback sera exécuté quand toutes les opérations d'écriture sont terminées.
         */
        onWriteEnd(callbackSuccess) {
            const onwriteend = new Promise((resolve, reject) => {
                if (!this.onWrite && this.isInit()) {
                    resolve();
                }
                else {
                    this.waiting_callee.push(resolve);
                }
            });
            if (callbackSuccess) {
                onwriteend.then(callbackSuccess);
            }
            else {
                return onwriteend;
            }
        }
        /**
         * Vide le fichier de log.
         * @returns Promise La promesse est résolue quand le fichier est vidé, rompue si échec
         */
        clearLog() {
            return new Promise((resolve, reject) => {
                if (!this.isInit()) {
                    reject("Logger must be initialized");
                }
                this.fileEntry.createWriter((fileWriter) => {
                    fileWriter.onwriteend = () => {
                        this.onWrite = false;
                        resolve();
                    };
                    fileWriter.onerror = (e) => {
                        console.log("Logger: Failed to truncate.");
                        this.onWrite = false;
                        reject();
                    };
                    if (!this.onWrite) {
                        fileWriter.truncate(0);
                    }
                    else {
                        console.log("Please call this function when log is not writing.");
                        reject();
                    }
                });
            });
        }
        /**
         * Affiche tout le contenu du fichier de log dans la console via console.log()
         * @returns Promise La promesse est résolue avec le contenu du fichier si lecture réussie, rompue si échec
         */
        consoleLogLog() {
            return new Promise((resolve, reject) => {
                if (!this.isInit()) {
                    reject("Logger must be initialized");
                }
                this.fileEntry.file(function (file) {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        console.log(this.result);
                        resolve(this.result);
                    };
                    reader.readAsText(file);
                }, () => {
                    console.log("Logger: Unable to open file.");
                    this.init();
                    reject();
                });
            });
        }
        /// Méthodes d'accès rapide
        debug(...data) {
            this.write(data, LogLevel.debug);
        }
        info(...data) {
            this.write(data, LogLevel.info);
        }
        warn(...data) {
            this.write(data, LogLevel.warn);
        }
        error(...data) {
            this.write(data, LogLevel.error);
        }
    };
});
define("audio_listener", ["require", "exports", "helpers", "logger", "main"], function (require, exports, helpers_2, logger_1, main_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function newModalRecord(button, input, ele) {
        let recorder = null;
        const modal = helpers_2.getModal();
        const instance = helpers_2.initModal({}, helpers_2.getModalPreloader("Chargement", ''));
        instance.open();
        let audioContent = null;
        let blobSize = 0;
        modal.innerHTML = `
    <div class="modal-content">
        <h5 style="margin-top: 0;">${ele.label}</h5>
        <p style="margin-top: 0; margin-bottom: 25px;">Approchez votre micro de la source, puis appuyez sur enregistrer.</p>
        <a href="#!" class="btn col s12 orange" id="__media_record_record">Enregistrer</a>
        <a href="#!" class="btn hide col s12 red" id="__media_record_stop">Arrêter</a>
        <div class=clearb></div>
        <div id="__media_record_player" class="modal-record-audio-player">${input.value ? `
            <figure>
                <figcaption>Enregistrement</figcaption>
                <audio controls src="${input.value}"></audio>
            </figure>
        ` : ''}</div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat green-text right ${input.value ? "" : "hide"}" id="__media_record_save">Sauvegarder</a>
        <a href="#!" class="btn-flat red-text left" id="__media_record_cancel">Annuler</a>
        <div class="clearb"></div>
    </div>
    `;
        const btn_start = document.getElementById('__media_record_record');
        const btn_stop = document.getElementById('__media_record_stop');
        const btn_confirm = document.getElementById('__media_record_save');
        const btn_cancel = document.getElementById('__media_record_cancel');
        const player = document.getElementById('__media_record_player');
        //add events to those 2 buttons
        btn_start.addEventListener("click", startRecording);
        btn_stop.addEventListener("click", stopRecording);
        btn_confirm.onclick = function () {
            if (audioContent) {
                input.value = audioContent;
                input.dataset.duration = ((blobSize / (main_1.MP3_BITRATE * 1000)) * 8).toString();
                // Met à jour le bouton
                const duration = (blobSize / (main_1.MP3_BITRATE * 1000)) * 8;
                button.innerText = "Enregistrement (" + duration.toFixed(0) + "s" + ")";
                button.classList.remove('blue');
                button.classList.add('green');
            }
            instance.close();
            // Clean le modal et donc les variables associées
            modal.innerHTML = "";
        };
        btn_cancel.onclick = function () {
            instance.close();
            // Clean le modal et donc les variables associées
            modal.innerHTML = "";
            try {
                if (recorder)
                    recorder.stop();
            }
            catch (e) { }
        };
        function startRecording() {
            btn_start.classList.add('hide');
            player.innerHTML = `<p class='flow-text center'>
            Initialisation...
        </p>`;
            // @ts-ignore MicRecorder, credit to https://github.com/closeio/mic-recorder-to-mp3
            recorder = new MicRecorder({
                bitRate: main_1.MP3_BITRATE
            });
            recorder.start().then(function () {
                player.innerHTML = `<p class='flow-text center'>
                <i class='material-icons blink fast v-bottom red-text'>mic</i><br>
                Enregistrement en cours
            </p>`;
                btn_stop.classList.remove('hide');
            }).catch((e) => {
                logger_1.Logger.error("Impossible de lancer l'écoute.", e);
                player.innerHTML = "<p class='flow-text center red-text bold-text'>Impossible de lancer l'écoute.</p>";
            });
        }
        function stopRecording() {
            // Once you are done singing your best song, stop and get the mp3.
            btn_stop.classList.add('hide');
            player.innerHTML = "<p class='flow-text center'>Conversion en cours...</p>";
            recorder
                .stop()
                .getMp3()
                .then(([buffer, blob]) => {
                blobSize = blob.size;
                return helpers_2.blobToBase64(blob);
            })
                .then((base64) => {
                audioContent = base64;
                btn_confirm.classList.remove('hide');
                player.innerHTML = `<figure>
                    <figcaption>Enregistrement</figcaption>
                    <audio controls src="${base64}"></audio>
                </figure>`;
                btn_start.classList.remove('hide');
            })
                .catch((e) => {
                M.toast({ html: 'Impossible de lire votre enregistrement' });
                logger_1.Logger.error("Enregistrement échoué:", e.message);
            });
        }
    }
    exports.newModalRecord = newModalRecord;
});
define("fetch_timeout", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function default_1(url, options, timeout = 10000) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
        ]);
    }
    exports.default = default_1;
});
define("Settings", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Settings = new class {
        constructor() {
            this._sync_freq = 30; /** En minutes */
            this._sync_bg = true; /** Activer la sync en arrière plan */
            if (localStorage.getItem('_settings_sync_freq')) {
                this._sync_freq = Number(localStorage.getItem('_settings_sync_freq'));
            }
            if (localStorage.getItem('_settings_sync_bg')) {
                this._sync_bg = localStorage.getItem('_settings_sync_bg') === 'true';
            }
        }
        set sync_bg(val) {
            this._sync_bg = val;
            localStorage.setItem('_settings_sync_bg', String(val));
        }
        get sync_bg() {
            return this._sync_bg;
        }
        set sync_freq(val) {
            this._sync_freq = val;
            localStorage.setItem('_settings_sync_freq', String(val));
        }
        get sync_freq() {
            return this._sync_freq;
        }
    };
    exports.BackgroundSync = new class {
        constructor() {
            //// credit to https://github.com/transistorsoft/cordova-plugin-background-fetch
            this.background_sync = null;
            this.fetchCb = null;
            this.failCb = null;
        }
        isInit() {
            return this.background_sync !== null;
        }
        /**
         * Initialise le module de background sync. Cette fonction ne doit être appelée qu'une seule fois !
         * @param fetchCb Fonction à appeler lors du fetch
         * @param failCb Fonction à appeler si échec
         * @param interval Intervalle entre deux synchronisations (en minutes)
         */
        init(fetchCb, failCb, interval = exports.Settings.sync_freq) {
            this.background_sync = ("BackgroundFetch" in window) ? window["BackgroundFetch"] : null;
            return this.initBgSync(fetchCb, failCb, interval);
        }
        /**
         * Modifie le module de background sync en cours d'exécution
         * @param fetchCb Fonction à appeler lors du fetch
         * @param failCb Fonction à appeler si échec
         * @param interval Intervalle entre deux synchronisations (en minutes)
         */
        initBgSync(fetchCb, failCb, interval = exports.Settings.sync_freq) {
            if (this.background_sync) {
                this.stop();
                console.log("Starting sync with interval: " + interval);
                this.failCb = failCb;
                this.fetchCb = fetchCb;
                this.background_sync.configure(fetchCb, () => {
                    // Désinitialise l'objet
                    exports.Settings.sync_bg = false;
                    this.background_sync = null;
                    failCb();
                }, {
                    minimumFetchInterval: interval,
                    stopOnTerminate: false // <-- Android only
                });
                return true;
            }
            else {
                return false;
            }
        }
        finish() {
            if (this.background_sync) {
                this.background_sync.finish();
            }
        }
        /**
         * Change la fréquence de synchronisation
         * @param interval Intervalle entre deux synchronisations (en minutes)
         */
        changeBgSyncInterval(interval) {
            if (this.background_sync) {
                return this.initBgSync(this.fetchCb, this.failCb, interval);
            }
            return false;
        }
        start() {
            if (this.background_sync) {
                this.background_sync.start(() => {
                    console.log("Starting fetch");
                }, () => {
                    console.log("Failed to start fetch");
                });
            }
        }
        stop() {
            try {
                if (this.background_sync) {
                    this.background_sync.stop(() => {
                        console.log("Stopping sync");
                    }, () => {
                        console.log("Failed to stop sync");
                    });
                }
            }
            catch (e) { /** Ne fait rien si échoue à stopper (ce n'était pas lancé) */ }
        }
    };
});
define("SyncManager", ["require", "exports", "logger", "localforage", "main", "helpers", "user_manager", "fetch_timeout", "Settings"], function (require, exports, logger_2, localforage_1, main_2, helpers_3, user_manager_1, fetch_timeout_1, Settings_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    localforage_1 = __importDefault(localforage_1);
    fetch_timeout_1 = __importDefault(fetch_timeout_1);
    // en millisecondes
    const MAX_TIMEOUT_FOR_FORM = 20000;
    const MAX_TIMEOUT_FOR_METADATA = 180000;
    // Nombre de formulaires à envoyer en même temps
    // Attention, 1 formulaire correspond au JSON + ses possibles fichiers attachés.
    const PROMISE_BY_SYNC_STEP = 5;
    const SyncList = new class {
        init() {
            localforage_1.default.config({
                driver: [localforage_1.default.INDEXEDDB,
                    localforage_1.default.WEBSQL,
                    localforage_1.default.LOCALSTORAGE],
                name: 'forms',
                version: 1.0,
                storeName: 'keyvaluepairs',
                description: 'Enregistre les formulaires liés par ID => {type, metadata}'
            });
        }
        add(id, value) {
            return localforage_1.default.setItem(id, value);
        }
        get(id) {
            return localforage_1.default.getItem(id);
        }
        remove(id) {
            return localforage_1.default.removeItem(id);
        }
        listSaved() {
            return localforage_1.default.keys();
        }
        getRemainingToSync() {
            return localforage_1.default.keys().then(keys => keys.length);
        }
        clear() {
            return localforage_1.default.clear();
        }
        has(id) {
            return this.get(id)
                .then(item => {
                if (item) {
                    return true;
                }
                return false;
            });
        }
    };
    exports.SyncManager = new class {
        constructor() {
            this.in_sync = false;
            this.list = SyncList;
            this.last_bgsync = Date.now();
        }
        init() {
            this.list.init();
            this.initBackgroundSync();
        }
        initBackgroundSync(interval = Settings_1.Settings.sync_freq) {
            const success_fn = () => {
                logger_2.Logger.info("Il s'est écoulé " + ((Date.now() - this.last_bgsync) / 1000) + " secondes depuis la dernière synchronisation.");
                this.last_bgsync = Date.now();
                this.launchBackgroundSync()
                    .then(() => {
                    logger_2.Logger.info(`La synchronisation d'arrière-plan s'est bien déroulée et a duré ${((Date.now() - this.last_bgsync) / 1000)} secondes.`);
                    Settings_1.BackgroundSync.finish();
                })
                    .catch(e => {
                    logger_2.Logger.error("Impossible de synchroniser en arrière plan.", e);
                    Settings_1.BackgroundSync.finish();
                });
            };
            const failure_fn = () => {
                console.log("La synchronisation n'a pas pu se lancer.");
                const checkbox_setting_bgsync = document.getElementById('__sync_bg_checkbox_settings');
                if (checkbox_setting_bgsync) {
                    helpers_3.showToast("Impossible de lancer la synchronisation");
                    checkbox_setting_bgsync.checked = false;
                }
            };
            if (Settings_1.Settings.sync_bg) {
                // Initialise la synchronisation en arrière plan uniquement si elle est demandée
                if (Settings_1.BackgroundSync.isInit()) {
                    Settings_1.BackgroundSync.initBgSync(success_fn, failure_fn, interval);
                }
                else {
                    Settings_1.BackgroundSync.init(success_fn, failure_fn, interval);
                }
            }
        }
        changeBackgroundSyncInterval(interval) {
            if (Settings_1.BackgroundSync.isInit()) {
                Settings_1.BackgroundSync.changeBgSyncInterval(interval);
            }
            else {
                this.initBackgroundSync(interval);
            }
        }
        startBackgroundSync() {
            if (Settings_1.BackgroundSync.isInit()) {
                Settings_1.BackgroundSync.start();
            }
            else {
                this.initBackgroundSync();
            }
        }
        stopBackgroundSync() {
            if (Settings_1.BackgroundSync.isInit()) {
                Settings_1.BackgroundSync.stop();
            }
        }
        add(id, data) {
            const saveItem = (id, type, metadata) => {
                return this.list.add(id, { type, metadata });
            };
            return this.list.get(id)
                .then(value => {
                if (value === null) {
                    // La valeur n'est pas stockée
                    return saveItem(id, data.type, data.metadata);
                }
                else {
                    // Vérification si les métadonnées sont différentes
                    let diff = false;
                    for (const k in value.metadata) {
                        if (!(k in data.metadata) || data.metadata[k] !== value.metadata[k]) {
                            diff = true;
                            break;
                        }
                    }
                    if (diff) {
                        return saveItem(id, data.type, data.metadata);
                    }
                    else {
                        return { type: data.type, metadata: data.metadata };
                    }
                }
            });
        }
        remove(id) {
            return this.list.remove(id);
        }
        sendForm(id, data) {
            // Renvoie une promise réussie si l'envoi du formulaire 
            // et de ses métadonnées a réussi.
            return new Promise((resolve, reject) => {
                // Récupération du fichier
                helpers_3.readFile('forms/' + id + ".json")
                    .then(content => {
                    if (!this.in_sync) {
                        reject({ code: "aborted" });
                        return;
                    }
                    const d = new FormData();
                    d.append("id", id);
                    d.append("form", content);
                    return fetch_timeout_1.default(main_2.API_URL + "forms/send.json", {
                        method: "POST",
                        body: d,
                        headers: new Headers({ "Authorization": "Bearer " + user_manager_1.UserManager.token })
                    }, MAX_TIMEOUT_FOR_FORM)
                        .catch((error) => {
                        reject({ code: "json_send", error });
                        throw '';
                    })
                        .then(response => {
                        return response.json();
                    })
                        .then((json) => {
                        if (json.error_code)
                            throw json.error_code;
                        return json;
                    });
                })
                    .then(json => {
                    if (!this.in_sync) {
                        reject({ code: "aborted" });
                        return;
                    }
                    // Le JSON est envoyé !
                    if (json.status && json.send_metadata) {
                        // Si on doit envoyer les fichiers en plus
                        const base_path = "form_data/" + id + "/";
                        const promises = [];
                        // json.send_metadata est un tableau de fichiers à envoyer
                        for (const metadata in data.metadata) {
                            if (json.send_metadata.indexOf(metadata) === -1) {
                                // La donnée actuelle n'est pas demandée par le serveur
                                continue;
                            }
                            const file = base_path + data.metadata[metadata];
                            const basename = data.metadata[metadata];
                            // Envoi de tous les fichiers associés un à un
                            promises.push(new Promise((res, rej) => {
                                helpers_3.readFile(file, true)
                                    .then(base64 => {
                                    base64 = base64.split(',')[1];
                                    const d = new FormData();
                                    d.append("id", id);
                                    d.append("type", data.type);
                                    d.append("filename", basename);
                                    d.append("data", base64);
                                    return fetch_timeout_1.default(main_2.API_URL + "forms/metadata_send.json", {
                                        method: "POST",
                                        body: d,
                                        headers: new Headers({ "Authorization": "Bearer " + user_manager_1.UserManager.token })
                                    }, MAX_TIMEOUT_FOR_METADATA)
                                        .then((response) => {
                                        return response.json();
                                    })
                                        .then((json) => {
                                        if (json.error_code)
                                            rej(json.error_code);
                                        res(json);
                                    })
                                        .catch(error => {
                                        helpers_3.showToast("Impossible d'envoyer " + basename + ".");
                                        rej({ code: "metadata_send", error });
                                    });
                                })
                                    .catch(res);
                            }));
                        }
                        Promise.all(promises)
                            .then(values => {
                            this.list.remove(id);
                            resolve();
                        })
                            .catch(err => {
                            reject(err);
                        });
                    }
                    else {
                        this.list.remove(id);
                        resolve();
                    }
                })
                    .catch((error) => {
                    logger_2.Logger.info("Impossible de lire le fichier", error.message);
                    reject({ code: "file_read", error });
                });
            });
        }
        available() {
            return this.list.listSaved();
        }
        /**
         * Obtient tous les fichiers JSON disponibles sur l'appareil
         */
        getAllCurrentFiles() {
            return helpers_3.getDirP('forms')
                .then(helpers_3.dirEntries)
                .then(entries => {
                // On a les différents JSON situés dans le dossier 'forms', désormais,
                // sous forme de FileEntry
                const promises = [];
                // On ajoute chaque entrée
                for (const entry of entries) {
                    promises.push(helpers_3.readFileFromEntry(entry)
                        .then(text => {
                        const json = JSON.parse(text);
                        return [
                            entry.name.split('.json')[0],
                            { type: json.type, metadata: json.metadata }
                        ];
                    }));
                }
                // On attend que tout soit OK
                return Promise.all(promises);
            });
        }
        /**
         * Supprime le cache de sauvegarde et ajoute tous les fichiers JSON disponibles dans celui-ci
         */
        addAllFiles() {
            // On obtient tous les fichiers disponibles
            return this.getAllCurrentFiles()
                .then(forms => {
                // On vide le cache actuel
                return this.list.clear()
                    .then(() => {
                    return forms;
                });
            })
                .then((forms) => {
                const promises = [];
                // Pour chaque form dispo, on l'ajoute dans le cache à sauvegarder
                for (const form of forms) {
                    promises.push(this.list.add(form[0], form[1]));
                }
                return Promise.all(promises)
                    .then(res => {
                    return;
                });
            });
        }
        /**
         * Lance la synchronisation et affiche son état dans un modal
         * @param force_all Forcer l'envoi de tous les formulaires
         * @param clear_cache Supprimer le cache actuel d'envoi et forcer tout l'envoi (ne fonctionne qu'avec force_all)
         */
        graphicalSync(force_all = false, clear_cache = false) {
            const modal = helpers_3.getModal();
            const instance = helpers_3.initModal({ dismissible: false }, helpers_3.getModalPreloader("Initialisation...", `<div class="modal-footer">
                    <a href="#!" class="red-text btn-flat left" id="__sync_modal_cancel">Annuler</a>
                    <div class="clearb"></div>
                </div>`));
            instance.open();
            let cancel_clicked = false;
            const text = document.getElementById(helpers_3.MODAL_PRELOADER_TEXT_ID);
            const modal_cancel = document.getElementById('__sync_modal_cancel');
            modal_cancel.onclick = () => {
                cancel_clicked = true;
                this.in_sync = false;
                if (text)
                    text.insertAdjacentHTML("afterend", `<p class='flow-text center red-text'>Annulation en cours...</p>`);
            };
            return this.sync(force_all, clear_cache, text)
                .then(data => {
                helpers_3.showToast("Synchronisation réussie");
                instance.close();
                return data;
            })
                .catch(reason => {
                if (reason && typeof reason === 'object') {
                    logger_2.Logger.error("Sync fail:", reason);
                    // Si jamais la syncho a été refusée parce qu'une est déjà en cours
                    if (reason.code === "already") {
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="red-text no-margin-top">Une synchronisation est déjà en cours.</h5>
                            <p class="flow-text">Veuillez réessayer ultérieurement.</p>
                            <div class="center">
                                <a href="#!" id="__ask_sync_cancel" class="green-text btn-flat center">Demander l'annulation</a>
                            </div>
                            <div class="clearb"></div>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" class="red-text btn-flat left modal-close">Fermer</a>
                            <div class="clearb"></div>
                        </div>
                        `;
                        const that = this;
                        document.getElementById('__ask_sync_cancel').onclick = function () {
                            const text = document.createElement('p');
                            text.classList.add('center', 'flow-text');
                            this.insertAdjacentElement('afterend', text);
                            that.cancelSync();
                            const a_element = this;
                            a_element.style.display = "none";
                            function launch_timeout() {
                                setTimeout(() => {
                                    if (!a_element)
                                        return;
                                    if (that.in_sync) {
                                        launch_timeout();
                                    }
                                    else {
                                        if (text) {
                                            text.classList.add('red-text');
                                            text.innerText = "Synchronisation annulée.";
                                        }
                                    }
                                }, 500);
                            }
                            launch_timeout();
                        };
                    }
                    else if (typeof reason.code === "string") {
                        let cause = (function (reason) {
                            switch (reason) {
                                case "aborted": return "La synchonisation a été annulée.";
                                case "json_send": return "Un formulaire n'a pas pu être envoyé.";
                                case "metadata_send": return "Un fichier associé à un formulaire n'a pas pu être envoyé.";
                                case "file_read": return "Un fichier à envoyer n'a pas pu être lu.";
                                case "id_getter": return "Impossible de communiquer avec la base de données interne gérant la synchronisation.";
                                default: return "Erreur inconnue.";
                            }
                        })(reason.code);
                        // Modifie le texte du modal
                        modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="red-text no-margin-top">Impossible de synchroniser</h5>
                            <p class="flow-text">
                                ${cause}<br>
                                Veuillez réessayer ultérieurement.
                            </p>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" class="red-text btn-flat right modal-close">Fermer</a>
                            <div class="clearb"></div>
                        </div>
                        `;
                    }
                }
                else if (cancel_clicked) {
                    instance.close();
                }
                else {
                    // Modifie le texte du modal
                    modal.innerHTML = `
                    <div class="modal-content">
                        <h5 class="red-text no-margin-top">Impossible de synchroniser</h5>
                        <p class="flow-text">
                            Une erreur inconnue est survenue.<br>
                            Veuillez réessayer ultérieurement.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <a href="#!" class="red-text btn-flat right modal-close">Fermer</a>
                        <div class="clearb"></div>
                    </div>
                    `;
                }
                return Promise.reject(reason);
            });
        }
        /**
         * Divise le nombre d'éléments à envoyer par requête.
         * @param id_getter Fonction pour récupérer un ID depuis la BDD
         * @param entries Tableau des IDs à envoyer
         * @param text_element Élément HTML dans lequel écrire l'avancement de l'envoi
         * @param position Position actuelle dans le tableau d'entrées (utilisation interne)
         */
        subSyncDivider(id_getter, entries, text_element) {
            return __awaiter(this, void 0, void 0, function* () {
                for (let position = 0; position < entries.length; position += PROMISE_BY_SYNC_STEP) {
                    const subset = entries.slice(position, PROMISE_BY_SYNC_STEP + position);
                    const promises = [];
                    let i = 1;
                    for (const id of subset) {
                        // Pour chaque clé disponible
                        promises.push(id_getter(id)
                            .catch(error => {
                            return Promise.reject({ code: "id_getter", error });
                        })
                            .then(value => {
                            if (text_element) {
                                text_element.innerHTML = `Envoi des données au serveur (Formulaire ${i + position}/${entries.length})`;
                            }
                            i++;
                            return this.sendForm(id, value);
                        }));
                    }
                    yield Promise.all(promises);
                }
            });
        }
        /**
         * Lance la synchronisation en arrière plan
         */
        launchBackgroundSync() {
            if (helpers_3.hasGoodConnection()) {
                return this.sync();
            }
            return Promise.reject({ code: "no_good_connection" });
        }
        /**
         * Synchronise les formulaires courants avec la BDD distante
         * @param force_all Forcer l'envoi de tous les formulaires
         * @param clear_cache Supprimer le cache actuel d'envoi et forcer tout l'envoi (ne fonctionne qu'avec force_all)
         * @param text_element Élément HTML dans lequel écrire l'avancement
         * @param force_specific_elements Tableau d'identifiants de formulaire (string[]) à utiliser pour la synchronisation
         */
        sync(force_all = false, clear_cache = false, text_element, force_specific_elements) {
            if (this.in_sync) {
                return Promise.reject({ code: 'already' });
            }
            this.in_sync = true;
            let data_cache = {};
            let use_cache = false;
            return new Promise((resolve, reject) => {
                if (text_element) {
                    text_element.innerText = "Lecture des données à synchroniser";
                }
                let entries_promise;
                if (force_all) {
                    if (clear_cache) {
                        entries_promise = this.addAllFiles().then(() => {
                            return this.list.listSaved();
                        });
                    }
                    else {
                        use_cache = true;
                        entries_promise = this.getAllCurrentFiles().then((forms) => {
                            // Ne récupère que les ID (en première position du tuple)
                            // On sauvegarde le SList qui sera injecté
                            forms.forEach(e => { data_cache[e[0]] = e[1]; });
                            return forms.map(e => e[0]);
                        });
                    }
                }
                else if (force_specific_elements) {
                    entries_promise = Promise.resolve(force_specific_elements);
                }
                else {
                    entries_promise = this.list.listSaved();
                }
                // Utilisé pour soit lire depuis le cache, soit lire depuis this.list
                const id_getter = (id) => {
                    if (use_cache) {
                        return Promise.resolve(data_cache[id]);
                    }
                    else {
                        return this.list.get(id);
                    }
                };
                entries_promise
                    .then(entries => {
                    if (!this.in_sync) {
                        reject({ code: "aborted" });
                        return;
                    }
                    return this.subSyncDivider(id_getter, entries, text_element)
                        .then(v => {
                        if (!force_specific_elements)
                            this.list.clear();
                        this.in_sync = false;
                        // La synchro a réussi !
                        resolve();
                    });
                })
                    .catch(r => {
                    this.in_sync = false;
                    logger_2.Logger.info("Synchronisation échouée:", r);
                    reject(r);
                });
            });
        }
        cancelSync() {
            this.in_sync = false;
        }
        clear() {
            return this.list.clear();
        }
        remainingToSync() {
            return this.list.getRemainingToSync();
        }
        has(id) {
            return this.list.has(id);
        }
    };
});
define("test_vocal_reco", ["require", "exports", "vocal_recognition"], function (require, exports, vocal_recognition_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /// FICHIER DE TEST DE LA RECONNAISSANCE VOCALE
    function talk(sentence) {
        const u = new SpeechSynthesisUtterance();
        u.text = sentence;
        u.lang = 'fr-FR';
        return new Promise((resolve, _) => {
            u.onend = () => { resolve(); };
            speechSynthesis.speak(u);
        });
    }
    exports.talk = talk;
    function launchQuizz(base) {
        const if_bad_answer = [
            "Oups, mauvaise réponse",
            "Vous vous êtes planté !"
        ];
        const if_good_answer = [
            "Oui, la bonne réponse était bien * !",
            "Bravo, vous avez trouvé la bonne réponse !",
            "Excellent, vous avez trouvé !"
        ];
        const list_question_rep = {
            "Combien font 4 x 8 ?": "32",
            "Qui est l'actuel premier ministre?": "Édouard Philippe",
            "Quel pays a remporté la coupe du monde de football en 2014?": "Allemagne",
            "Dans quelle ville italienne se situe l'action de Roméo et Juliette?": "Vérone",
            "Comment désigne-t-on une belle-mère cruelle?": "Marâtre",
            "Qui était le dieu de la guerre dans la mythologie grecque?": "Arès",
            "Quel est le plus long fleuve de France?": "Loire",
            "Quel animal est Pan-pan dans Bambi?": "Lapin",
            "Avec la laine de quel animal fait-on du cachemire?": "Chèvre",
            "Quelle est la première ville du monde à s'être dotée d'un métro?": "Londres",
            "Dans quel état des Etats-Unis le Grand Canyon se trouve-t-il?": "Arizona",
            "Combien de paires de côtes possède-t-on?": ["Douze", "12"],
            "En géométrie, quel adjectif qualifie un angle de 180 degrés ?": "plat",
            "En quelle année fut posé le premier pas sur la lune ?": "1969",
            "Quel os du squelette humain est le plus long et le plus solide?": "Fémur",
            "Quel arbre est connu pour être le plus grand au monde?": "Séquoia",
            "Quelle est l'unité de la tension électrique?": "Volt",
            "De quel animal le Sphinx de Gizeh a-t-il le corps?": "Lion",
            "Quel est le premier long métrage d'animation de Disney?": "Blanche-neige",
            "Quelle partie de l'oeil est colorée?": "Iris",
            "Quel pays a décidé de quitter l'Union Européenne en 2016?": ["Angleterre", "Royaume-Uni"],
            "Quelle est la plus grande planète du système solaire?": "Jupiter",
            "Quelle est la plus grande artère du corps?": "Aorte",
            "Quelle est la capitale de l’Inde?": "New Delhi",
            "Quel est le nom du principal indice boursier de la place de Paris ?": "CAC 40",
            "Qu’est-ce qu’un ouistiti ?": "singe",
            "Qui etait le président français en 1995 ?": ["Jacques Chirac", "Chirac"],
            "Quel légume entre dans la composition du tzatziki ?": "concombre",
            "De quel pays, les Beatles sont-ils originaires ?": ["Angleterre", "Royaume-Uni"],
            "Quel acteur français a été l’image de la marque de pâtes Barilla dans les années 90 ?": "Depardieu",
            "Quel animal est l'emblème de la marque automobile Ferrari ?": "cheval",
            "Dans la mythologie grecque qui est le maitre des dieux ?": "Zeus",
            "De quel pays la pizza est elle originaire ?": "Italie",
            "Quel est le dessert préféré d’Homer Simpson ?": "donuts",
            "Que trouve-t-on généralement au fond d'un verre de Martini ?": "Olive",
        };
        base.innerHTML = `
    <div class="container">
    <h4 class="center">RomuQuizz</h4>
    <div class="divider divider-margin"></div>

    <div class="card-panel card-perso flow-text">
        <span class="blue-text text-darken-2">Question:</span>
        <span class="orange-text text-darken-3" id="__question_visual"></span>
    </div>

    <p class="flow-text center" id="__question_tip"></p>

    <div class="center center-block">
        <div class="btn red" id="__question_speak"><i class="material-icons left">mic</i>Parler</div>
    </div>

    <div class="clearb"></div>
    <div class="divider divider-margin"></div>

    <div class="center center-block">
        <div class="btn green" id="__question_other">Autre question !</div>
    </div>
    </div>
    `;
        const question_text = document.getElementById('__question_visual');
        const answer_btn = document.getElementById('__question_speak');
        const message_block = document.getElementById('__question_tip');
        const new_question = document.getElementById('__question_other');
        let actual_question = "";
        answer_btn.onclick = function () {
            vocal_recognition_1.prompt(actual_question, true)
                .then(values => {
                message_block.classList.remove('blue-text', 'red-text');
                if (parseAnswer(values)) {
                    // Trouvé !
                    const response = list_question_rep[actual_question];
                    const rep = (typeof response === 'string' ? response : response.join('/'));
                    const spoken = if_good_answer[Math.floor(Math.random() * if_good_answer.length)];
                    talk(spoken.replace('*', rep));
                    message_block.classList.add('blue-text');
                    message_block.innerText = "Bravo, vous avez trouvé la bonne réponse : " + rep + " !";
                }
                else {
                    talk(if_bad_answer[Math.floor(Math.random() * if_bad_answer.length)]);
                    message_block.classList.add('red-text');
                    message_block.innerText = "Mauvaise réponse !";
                }
            })
                .catch(() => {
                talk("Veuillez répéter");
                message_block.classList.remove('blue-text');
                message_block.classList.add('red-text');
                message_block.innerText = "J'ai eu du mal à vous entendre...";
            });
        };
        new_question.onclick = newQuestion;
        function parseAnswer(possible_responses) {
            console.log(possible_responses);
            const p_r = list_question_rep[actual_question];
            if (typeof p_r === 'string') {
                for (const rep of possible_responses) {
                    if (rep.toLowerCase().includes(p_r.toLowerCase())) {
                        return true;
                    }
                }
            }
            else {
                for (const rep of possible_responses) {
                    for (const answ of p_r) {
                        if (rep.toLowerCase().includes(answ.toLowerCase())) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        function newQuestion() {
            const keys = Object.keys(list_question_rep);
            let position;
            do {
                position = Math.floor(Math.random() * ((keys.length - 1) + 1));
            } while (actual_question === keys[position]);
            actual_question = keys[position];
            question_text.innerText = actual_question;
            message_block.innerText = "";
            talk(actual_question);
        }
        newQuestion();
    }
    exports.launchQuizz = launchQuizz;
});
define("main", ["require", "exports", "PageManager", "helpers", "logger", "audio_listener", "form_schema", "vocal_recognition", "user_manager", "SyncManager", "test_vocal_reco"], function (require, exports, PageManager_2, helpers_4, logger_3, audio_listener_1, form_schema_1, vocal_recognition_2, user_manager_2, SyncManager_1, test_vocal_reco_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MAX_LIEUX_AFFICHES = 20; /** Maximum de lieux affichés dans le modal de sélection de lieu */
    exports.API_URL = "https://projet.alkihis.fr/"; /** MUST HAVE TRAILING SLASH */
    exports.ENABLE_FORM_DOWNLOAD = true; /** Active le téléchargement automatique des schémas de formulaire au démarrage */
    exports.ID_COMPLEXITY = 20; /** Nombre de caractères aléatoires dans un ID automatique */
    exports.APP_VERSION = 0.6;
    exports.MP3_BITRATE = 256; /** En kb/s */
    exports.SYNC_FREQUENCY_POSSIBILITIES = [15, 30, 60, 120, 240, 480, 1440]; /** En minutes */
    exports.app = {
        // Application Constructor
        initialize: function () {
            this.bindEvents();
        },
        // Bind Event Listeners
        //
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function () {
            document.addEventListener('deviceready', this.onDeviceReady, false);
        },
        // deviceready Event Handler
        //
        // The scope of 'this' is the event. In order to call the 'receivedEvent'
        // function, we must explicitly call 'app.receivedEvent(...);'
        onDeviceReady: function () {
            exports.app.receivedEvent('deviceready');
        },
        // Update DOM on a Received Event
        receivedEvent: function (id) {
            // var parentElement = document.getElementById(id);
            // var listeningElement = parentElement.querySelector('.listening');
            // var receivedElement = parentElement.querySelector('.received');
            // listeningElement.setAttribute('style', 'display:none;');
            // receivedElement.setAttribute('style', 'display:block;');
            // console.log('Received Event: ' + id);
        }
    };
    function initApp() {
        // Change le répertoire de données
        // Si c'est un navigateur, on est sur cdvfile://localhost/temporary
        // Sinon, si mobile, on passe sur dataDirectory
        helpers_4.changeDir();
        logger_3.Logger.init();
        form_schema_1.Forms.init();
        SyncManager_1.SyncManager.init();
        // @ts-ignore Désactive le dézoom automatique sur Android quand l'utilisateur a choisi une petite police
        if (window.MobileAccessibility) {
            // @ts-ignore
            window.MobileAccessibility.usePreferredTextZoom(false);
        }
        // @ts-ignore Force à demander la permission pour enregistrer du son
        const permissions = cordova.plugins.permissions;
        permissions.requestPermission(permissions.RECORD_AUDIO, status => {
            // console.log(status);
        }, e => { console.log(e); });
        // Initialise le bouton retour
        document.addEventListener("backbutton", function () {
            PageManager_2.PageManager.goBack();
        }, false);
        exports.app.initialize();
        initDebug();
        helpers_4.initModal();
        // Check si on est à une page spéciale
        let href = "";
        if (window.location) {
            const tmp = location.href.split('#')[0].split('?');
            // Récupère la partie de l'URL après la query string et avant le #
            href = tmp[tmp.length - 1];
        }
        // Quand les forms sont prêts, on affiche l'app !
        form_schema_1.Forms.onReady(function () {
            let prom;
            if (href && PageManager_2.PageManager.pageExists(href)) {
                prom = PageManager_2.PageManager.changePage(href);
            }
            else {
                prom = PageManager_2.PageManager.changePage(PageManager_2.AppPageName.home);
            }
            prom
                .then(() => {
                // @ts-ignore On montre l'écran quand tout est chargé
                navigator.splashscreen.hide();
            })
                .catch(err => {
                // @ts-ignore On montre l'écran et on affiche l'erreur
                navigator.splashscreen.hide();
                // Bloque le sidenav pour empêcher de naviguer
                try {
                    PageManager_2.SIDENAV_OBJ.destroy();
                }
                catch (e) { }
                helpers_4.getBase().innerHTML = helpers_4.displayErrorMessage("Impossible d'initialiser l'application", "Erreur: " + err.stack);
            });
        });
    }
    function initDebug() {
        window["DEBUG"] = {
            launchQuizz: test_vocal_reco_1.launchQuizz,
            PageManager: PageManager_2.PageManager,
            readFromFile: helpers_4.readFromFile,
            listDir: helpers_4.listDir,
            saveDefaultForm: helpers_4.saveDefaultForm,
            createDir: helpers_4.createDir,
            getLocation: helpers_4.getLocation,
            testDistance: helpers_4.testDistance,
            rmrf: helpers_4.rmrf,
            rmrfPromise: helpers_4.rmrfPromise,
            Logger: logger_3.Logger,
            Forms: form_schema_1.Forms,
            askModalList: helpers_4.askModalList,
            recorder: function () {
                audio_listener_1.newModalRecord(document.createElement('button'), document.createElement('input'), {
                    name: "__test__",
                    label: "Test",
                    type: form_schema_1.FormEntityType.audio
                });
            },
            dateFormatter: helpers_4.dateFormatter,
            prompt: vocal_recognition_2.prompt,
            createNewUser: user_manager_2.createNewUser,
            UserManager: user_manager_2.UserManager,
            SyncManager: SyncManager_1.SyncManager
        };
    }
    document.addEventListener('deviceready', initApp, false);
});
define("user_manager", ["require", "exports", "main", "helpers", "form_schema"], function (require, exports, main_3, helpers_5, form_schema_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UserManager = new class {
        constructor() {
            this._username = null;
            this._token = null;
            const usr = localStorage.getItem('__username_manager');
            const tkn = localStorage.getItem('__token_manager');
            if (usr && tkn) {
                this._username = usr;
                this._token = tkn;
            }
        }
        get username() {
            return this._username;
        }
        get token() {
            return this._token;
        }
        login(username, password) {
            return new Promise((resolve, reject) => {
                let data = new FormData();
                data.append("username", username);
                data.append('password', password);
                fetch(main_3.API_URL + "users/login.json", { body: data, method: 'POST' })
                    .then((response) => {
                    return response.json();
                })
                    .then((json) => {
                    if (json.error_code)
                        throw json.error_code;
                    this.logSomeone(username, json.access_token);
                    // On sauvegarde les schémas envoyés
                    if (Array.isArray(json.subscriptions)) {
                        json.subscriptions = {};
                    }
                    form_schema_2.Forms.schemas = json.subscriptions;
                    resolve();
                })
                    .catch((error) => {
                    reject(error);
                });
            });
        }
        logSomeone(username, token) {
            this._token = token;
            this._username = username;
            localStorage.setItem('__username_manager', username);
            localStorage.setItem('__token_manager', token);
        }
        unlog() {
            localStorage.removeItem('__username_manager');
            localStorage.removeItem('__token_manager');
            this._username = null;
            this._token = null;
        }
        get logged() {
            return this._username !== null;
        }
        createUser(username, password, admin_password) {
            const data = new FormData();
            data.append("username", username);
            data.append("password", password);
            data.append("admin_password", admin_password);
            return new Promise((resolve, reject) => {
                fetch(main_3.API_URL + "users/create.json", {
                    method: "POST",
                    body: data
                }).then((response) => {
                    return response.json();
                }).then((json) => {
                    if (json.error_code)
                        throw json.error_code;
                    this.logSomeone(username, json.access_token);
                    resolve();
                }).catch((error) => {
                    reject(error);
                });
            });
        }
    };
    function createNewUser() {
        const modal = helpers_5.getModal();
        const instance = helpers_5.initModal({ dismissible: false });
        modal.classList.add('modal-fixed-footer');
        modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">Créer un utilisateur</h5>
        <form class="row" id="__modal_form_new_user">
            <div class="row col s12 input-field">
                <label for="__user_new">Nom d'utilisateur</label>
                <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw">Mot de passe</label>
                <input type="password" class="validate" required id="__user_psw" name="user_psw">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_r">Mot de passe (confirmation)</label>
                <input type="password" class="validate" required id="__user_psw_r" name="user_psw_r">
            </div>
            <div class="row col s12 input-field">
                <label for="__user_psw_a">Mot de passe administrateur</label>
                <input type="password" class="validate" required id="__user_psw_a" name="user_psw_a">
            </div>
        </form>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat red-text left modal-close">Annuler</a>
        <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Créer utilisateur</a>
        <div class="clearb"></div>
    </div>
    `;
        instance.open();
        const orig_psw = document.getElementById('__user_psw');
        document.getElementById('__user_psw_r').onchange = function () {
            const e = this;
            if (e.value !== orig_psw.value) {
                e.classList.add('invalid');
                e.classList.remove('valid');
            }
            else {
                e.classList.add('valid');
                e.classList.remove('invalid');
            }
        };
        let modal_save = null;
        document.getElementById('__modal_create_new_user').onclick = function () {
            const form = document.getElementById('__modal_form_new_user');
            const name = form.user_new.value.trim();
            const psw = form.user_psw.value.trim();
            const psw_r = form.user_psw_r.value.trim();
            const psw_a = form.user_psw_a.value.trim();
            if (!name) {
                helpers_5.showToast("Le nom ne peut pas être vide.");
                helpers_5.showToast("Le nom ne peut pas être vide.");
                return;
            }
            if (!psw) {
                helpers_5.showToast("Le mot de passe ne peut pas être vide.");
                return;
            }
            if (psw !== psw_r) {
                helpers_5.showToast("Mot de passe et confirmation doivent correspondre.");
                return;
            }
            if (!psw_a) {
                helpers_5.showToast("Le mot de passe administrateur est nécessaire.");
                return;
            }
            modal_save = document.createDocumentFragment();
            let child;
            while (child = modal.firstChild) {
                modal_save.appendChild(child);
            }
            modal.innerHTML = helpers_5.getModalPreloader("Création de l'utilisateur...");
            exports.UserManager.createUser(name, psw, psw_a)
                .then(function () {
                helpers_5.showToast("Utilisateur créé avec succès.");
                instance.close();
            }).catch(function (error) {
                console.log(error);
                if (typeof error === 'number') {
                    if (error === 6) {
                        helpers_5.showToast("Le mot de passe administrateur est invalide.");
                    }
                    else if (error === 12) {
                        helpers_5.showToast("Cet utilisateur existe déjà.");
                    }
                    else {
                        helpers_5.showToast("Une erreur inconnue est survenue.");
                    }
                }
                modal.innerHTML = "";
                let e;
                while (e = modal_save.firstChild) {
                    modal.appendChild(e);
                }
            });
        };
    }
    exports.createNewUser = createNewUser;
    function loginUser() {
        return new Promise(function (resolve, reject) {
            const modal = helpers_5.getModal();
            const instance = helpers_5.initModal({ dismissible: false });
            modal.innerHTML = `
        <div class="modal-content">
            <h5 class="no-margin-top">Connexion</h5>
            <form class="row" id="__modal_form_new_user">
                <div class="row col s12 input-field">
                    <label for="__user_new">Nom d'utilisateur</label>
                    <input type="text" autocomplete="off" class="validate" required id="__user_new" name="user_new">
                </div>
                <div class="row col s12 input-field">
                    <label for="__user_psw">Mot de passe</label>
                    <input type="password" autocomplete="off" class="validate" required id="__user_psw" name="user_psw">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <a href="#!" id="__modal_cancel_user" class="btn-flat red-text left">Annuler</a>
            <a href="#!" id="__modal_create_new_user" class="btn-flat blue-text right">Connexion</a>
            <div class="clearb"></div>
        </div>
        `;
            instance.open();
            let modal_save = null;
            document.getElementById('__modal_cancel_user').onclick = function () {
                instance.close();
                reject();
            };
            document.getElementById('__modal_create_new_user').onclick = function () {
                const form = document.getElementById('__modal_form_new_user');
                const name = form.user_new.value.trim();
                const psw = form.user_psw.value.trim();
                if (!name) {
                    helpers_5.showToast("Le nom ne peut pas être vide.");
                    return;
                }
                if (!psw) {
                    helpers_5.showToast("Le mot de passe ne peut pas être vide.");
                    return;
                }
                modal_save = document.createDocumentFragment();
                let child;
                while (child = modal.firstChild) {
                    modal_save.appendChild(child);
                }
                modal.innerHTML = helpers_5.getModalPreloader("Connexion");
                exports.UserManager.login(name, psw)
                    .then(function () {
                    helpers_5.showToast("Vous avez été connecté-e avec succès.");
                    instance.close();
                    // RESOLUTION DE LA PROMESSE
                    resolve();
                }).catch(function (error) {
                    if (typeof error === 'number') {
                        if (error === 10) {
                            helpers_5.showToast("Cet utilisateur n'existe pas.");
                        }
                        else if (error === 11) {
                            helpers_5.showToast("Votre mot de passe est invalide.");
                        }
                        else {
                            helpers_5.showToast("Une erreur inconnue est survenue.");
                        }
                    }
                    else {
                        helpers_5.showToast(error.message || JSON.stringify(error));
                    }
                    modal.innerHTML = "";
                    let e;
                    while (e = modal_save.firstChild) {
                        modal.appendChild(e);
                    }
                });
            };
        });
    }
    exports.loginUser = loginUser;
});
/**
 *
 * const data = new FormData();
        data.append("username", username);
        data.append("password", password);
 * return new Promise((resolve, reject) => {
            fetch(API_URL + "/users/login.json", {
                method: "POST",
                body: data
            }).then((response) => {
                return response.json();
            }).then((json) => {
                this._token = json.access_token;
                this._username = username;

                resolve();
            }).catch((error) => {
                reject(error);
            });
        });
 */ 
define("form_schema", ["require", "exports", "helpers", "user_manager", "main", "fetch_timeout"], function (require, exports, helpers_6, user_manager_3, main_4, fetch_timeout_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    fetch_timeout_2 = __importDefault(fetch_timeout_2);
    /**
     * Type à préciser dans le JSON, clé "type"
     * Le type à préciser est la chaîne de caractères
     */
    var FormEntityType;
    (function (FormEntityType) {
        FormEntityType["integer"] = "integer";
        FormEntityType["float"] = "float";
        FormEntityType["select"] = "select";
        FormEntityType["string"] = "string";
        FormEntityType["bigstring"] = "textarea";
        FormEntityType["checkbox"] = "checkbox";
        FormEntityType["file"] = "file";
        FormEntityType["slider"] = "slider";
        FormEntityType["datetime"] = "datetime";
        FormEntityType["divider"] = "divider";
        FormEntityType["audio"] = "audio";
    })(FormEntityType = exports.FormEntityType || (exports.FormEntityType = {}));
    // Classe contenant le formulaire JSON chargé et parsé
    exports.Forms = new class {
        constructor() {
            this.form_ready = false;
            this.waiting_callee = [];
            this.current = null;
            this._current_key = null;
            this._default_form_key = null;
            this.DEAD_FORM_SCHEMA = { name: null, fields: [], locations: {} };
            this.FORM_LOCATION = 'loaded_forms.json';
            if (localStorage.getItem('default_form_key')) {
                this._default_form_key = localStorage.getItem('default_form_key');
            }
            // Sauvegarde dans le localStorage quoiqu'il arrive
            this.default_form_key = this._default_form_key;
            /** call init() after constructor() ! */
        }
        saveForms() {
            if (this.available_forms) {
                helpers_6.writeFile('', this.FORM_LOCATION, new Blob([JSON.stringify(this.available_forms)]));
            }
        }
        // Initialise les formulaires disponibles via le fichier JSON contenant les formulaires
        // La clé du formulaire par défaut est contenu dans "default_form_name"
        init(crash_if_not_form_download = false) {
            const loadJSONInObject = (json, save = false) => {
                // Le JSON est reçu, on l'enregistre dans available_forms
                this.available_forms = json;
                // On met le form à ready
                this.form_ready = true;
                // On enregistre le formulaire par défaut (si la clé définie existe)
                if (this._default_form_key in this.available_forms) {
                    this.current = this.available_forms[this._default_form_key];
                    this._current_key = this._default_form_key;
                }
                else {
                    this.current = this.DEAD_FORM_SCHEMA;
                }
                // On sauvegarde les formulaires dans loaded_forms.json
                // uniquement si demandé
                if (save) {
                    this.saveForms();
                }
                // On exécute les fonctions en attente
                let func;
                while (func = this.waiting_callee.pop()) {
                    func(this.available_forms, this.current);
                }
            };
            const readStandardForm = () => {
                // On vérifie si le fichier loaded_forms.json existe
                helpers_6.readFile(this.FORM_LOCATION)
                    .then((string) => {
                    loadJSONInObject(JSON.parse(string));
                })
                    .catch(() => {
                    // Il n'existe pas, on doit le charger depuis les sources de l'application
                    $.get('assets/form.json', {}, (json) => {
                        loadJSONInObject(json, true);
                    }, 'json')
                        .fail(function (error) {
                        // Essaie de lire le fichier sur le périphérique
                        // @ts-ignore
                        helpers_6.readFile('assets/form.json', false, cordova.file.applicationDirectory + 'www/')
                            .then(string => {
                            loadJSONInObject(JSON.parse(string));
                        })
                            .catch((err) => {
                            // @ts-ignore
                            helpers_6.showToast("Impossible de charger les formulaires." + " " + cordova.file.applicationDirectory + 'www/assets/form.json');
                        });
                    });
                });
            };
            const init_text = document.getElementById('__init_text_center');
            if (init_text) {
                init_text.innerText = "Mise à jour des formulaires";
            }
            // @ts-ignore
            if ((main_4.ENABLE_FORM_DOWNLOAD || crash_if_not_form_download) && navigator.connection.type !== Connection.NONE && user_manager_3.UserManager.logged) {
                // On tente d'actualiser les formulaires disponibles
                // On attend au max 20 secondes
                return fetch_timeout_2.default(main_4.API_URL + "schemas/subscribed.json", {
                    headers: new Headers({ "Authorization": "Bearer " + user_manager_3.UserManager.token }),
                    method: "GET"
                }, 20000)
                    .then(response => response.json())
                    .then(json => {
                    if (json.error_code)
                        throw json.error_code;
                    loadJSONInObject(json, true);
                })
                    .catch(error => {
                    console.log("Timeout/fail for forms");
                    // Impossible de charger le JSON depuis le serveur
                    if (crash_if_not_form_download) {
                        return Promise.reject(error);
                    }
                    readStandardForm();
                });
            }
            else {
                if (crash_if_not_form_download) {
                    return Promise.reject();
                }
                readStandardForm();
            }
        }
        onReady(callback) {
            if (this.form_ready) {
                callback(this.available_forms, this.current);
            }
            else {
                this.waiting_callee.push(callback);
            }
        }
        formExists(name) {
            return name === null || name in this.available_forms;
        }
        /**
         * Change le formulaire courant renvoyé par onReady
         * @param name clé d'accès au formulaire
         * @param make_default enregistre le nouveau formulaire comme clé par défaut
         */
        changeForm(name, make_default = false) {
            if (name === null) {
                // On supprime le formulaire chargé
                this.current = this.DEAD_FORM_SCHEMA;
                this._current_key = null;
                if (make_default) {
                    this.default_form_key = null;
                }
                return;
            }
            if (this.formExists(name)) {
                this.current = this.available_forms[name];
                this._current_key = name;
                if (make_default) {
                    this.default_form_key = name;
                }
            }
            else {
                throw new Error("Form does not exists");
            }
        }
        /**
         * Renvoie un formulaire, sans modifier le courant
         * @param name clé d'accès au formulaire
         */
        getForm(name) {
            if (this.formExists(name)) {
                return this.available_forms[name];
            }
            else {
                throw new Error("Form does not exists");
            }
        }
        deleteForm(name) {
            if (this.formExists(name) && name !== null) {
                delete this.available_forms[name];
                if (this._current_key === name) {
                    this._current_key = null;
                }
            }
        }
        /**
         * Retourne un tableau de tuples contenant en
         * première position la clé d'accès au formulaire,
         * et en seconde position son nom textuel à présenter à l'utilisateur
         * @returns [string, string][]
         */
        getAvailableForms() {
            const keys = Object.keys(this.available_forms);
            const tuples = [];
            for (const key of keys) {
                tuples.push([key, this.available_forms[key].name]);
            }
            return tuples;
        }
        get current_key() {
            return this._current_key;
        }
        get default_form_key() {
            return this._default_form_key;
        }
        set default_form_key(v) {
            this._default_form_key = v;
            if (v === null) {
                localStorage.removeItem('default_form_key');
            }
            else {
                localStorage.setItem('default_form_key', v);
            }
        }
        set schemas(schema) {
            this.available_forms = schema;
            if (!(this._current_key in this.available_forms)) {
                this._current_key = null;
            }
            this.saveForms();
        }
    };
});
define("location", ["require", "exports", "helpers"], function (require, exports, helpers_7) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function createLocationInputSelector(container, input, locations, open_on_complete = false) {
        const row = document.createElement('div');
        row.classList.add('row');
        container.appendChild(row);
        input.autocomplete = "off";
        const input_f = document.createElement('div');
        input_f.classList.add('input-field', 'col', 's12');
        row.appendChild(input_f);
        // Champ input réel et son label
        const label = document.createElement('label');
        input.type = "text";
        input.id = "autocomplete_field_id";
        label.htmlFor = "autocomplete_field_id";
        label.textContent = "Lieu";
        input.classList.add('autocomplete');
        input_f.appendChild(input);
        input_f.appendChild(label);
        // Initialisation de l'autocomplétion
        const auto_complete_data = {};
        for (const lieu in locations) {
            let key = lieu + " - " + locations[lieu].label;
            auto_complete_data[key] = null;
        }
        // Création d'un objet clé => [nom, "latitude,longitude"]
        const labels_to_name = {};
        for (const lieu in locations) {
            let key = lieu + " - " + locations[lieu].label;
            labels_to_name[key] = [lieu, String(locations[lieu].latitude) + "," + String(locations[lieu].longitude)];
        }
        // Lance l'autocomplétion materialize
        M.Autocomplete.init(input, {
            data: auto_complete_data,
            limit: 5,
            onAutocomplete: function () {
                // Remplacement du label par le nom réel
                const location = input.value;
                // Recherche le label sélectionné dans l'objet les contenants
                if (location in labels_to_name) {
                    if (open_on_complete) {
                        window.open("geo:" + labels_to_name[location][1] +
                            "?q=" + labels_to_name[location][1] + "&z=zoom&mode=w", '_system');
                        // Clean de l'input
                        input.value = "";
                    }
                }
                else {
                    helpers_7.showToast("Ce lieu n'existe pas.");
                }
            }
        });
        return labels_to_name;
    }
    exports.createLocationInputSelector = createLocationInputSelector;
});
define("form", ["require", "exports", "vocal_recognition", "form_schema", "helpers", "main", "PageManager", "logger", "audio_listener", "user_manager", "SyncManager", "location"], function (require, exports, vocal_recognition_3, form_schema_3, helpers_8, main_5, PageManager_3, logger_4, audio_listener_2, user_manager_4, SyncManager_2, location_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function createInputWrapper() {
        const e = document.createElement('div');
        e.classList.add("row", "input-field", "col", "s12");
        return e;
    }
    function createTip(wrapper, ele) {
        if (ele.tip_on_invalid) {
            const tip = document.createElement('div');
            tip.classList.add('invalid-tip');
            tip.innerText = ele.tip_on_invalid;
            tip.style.display = 'none';
            wrapper.appendChild(tip);
        }
        return wrapper;
    }
    function showHideTip(current, show) {
        if (current.nextElementSibling && current.nextElementSibling.classList.contains("invalid-tip")) {
            // Si il y a un tip, on le fait appraître
            if (show)
                $(current.nextElementSibling).slideDown(200);
            else
                $(current.nextElementSibling).slideUp(200);
        }
    }
    function validConstraints(constraints, e) {
        const cons = constraints.split(';');
        const form = document.getElementById('__main_form__id');
        for (const c of cons) {
            const actual = c.split('=');
            // Supprime le possible ! à la fin de actual[0]
            const name = actual[0].replace(/!$/, '');
            const champ = form.elements[name];
            if (!champ) { // Le champ n'existe pas
                console.log('field does not exists');
                continue;
            }
            if (actual[0][actual[0].length - 1] === '!') {
                // Différent de
                if (actual[1] === '*' && champ.value) {
                    // On veut que champ n'ait aucune valeur
                    return false;
                }
                else if (actual[1] === '^' && champ.value === e.value) {
                    // On veut que champ ait une valeur différente de e
                    return false;
                }
                else if (champ.value === actual[1]) {
                    // On veut que champ ait une valeur différente de actual[1]
                    return false;
                }
            }
            else {
                // Champ name égal à
                if (actual[1] === '*' && !champ.value) {
                    // On veut que champ ait une valeur
                    return false;
                }
                else if (actual[1] === '^' && champ.value !== e.value) {
                    // On veut que champ ait une valeur identique à e
                    return false;
                }
                else if (champ.value !== actual[1]) {
                    // On veut que champ ait une valeur identique à actual[1]
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Classe le champ comme valide.
     * @param e Element input
     */
    function setValid(e, force_element) {
        e.classList.add('valid');
        e.classList.remove('invalid');
        e.dataset.valid = "1";
        showHideTip(force_element || e, false);
    }
    /**
     * Classe le champ comme invalide.
     * @param e Element input
     */
    function setInvalid(e, force_element) {
        if (e.value === "" && !e.required) {
            setValid(e);
            return;
        }
        e.classList.add('invalid');
        e.classList.remove('valid');
        e.dataset.valid = "0";
        showHideTip(force_element || e, true);
    }
    /**
     * Remplit les champs standards de l'input (id, name, required)...
     * @param htmle Input / Select dans lequel écrire
     * @param ele Champ de formulaire lié à l'input
     * @param label Label lié à l'input (optionnel)
     */
    function fillStandardInputValues(htmle, ele, label) {
        htmle.id = "id_" + ele.name;
        htmle.name = ele.name;
        htmle.required = ele.required;
        if (htmle.tagName !== "SELECT" && ele.placeholder) {
            htmle.placeholder = ele.placeholder;
        }
        if (label) {
            label.htmlFor = htmle.id;
            label.innerText = ele.label;
        }
        if (htmle.tagName === "INPUT" && htmle.type === "checkbox") {
            htmle.dataset.valid = "1";
            htmle.checked = ele.default_value;
        }
        else {
            htmle.dataset.valid = ele.required ? "0" : "1";
            htmle.value = ele.default_value || "";
        }
        return htmle;
    }
    /**
     * Polyfill for modulo (seems to work unproperly on flaoting point)
     * @param num1
     * @param num2
     */
    function isModuloZero(num1, num2) {
        let reste = num1;
        while (reste > 0.0001) {
            reste -= num2;
        }
        // Arrondit le nombre pour éviter les problèmes de précision
        return Number(reste.toFixed(5)) === 0;
    }
    /**
     * Construit le formulaire automatiquement passé via "current_form"
     * @param placeh Élement HTML dans lequel écrire le formulaire
     * @param current_form Formulaire courant
     * @param filled_form Formulaire déjà rempli (utilisé pour l'édition)
     */
    function constructForm(placeh, current_form, filled_form) {
        // Si le formulaire accepte la localisation
        if (!current_form.no_location) {
            // Crée le champ de lieu
            const loc_wrapper = document.createElement('div');
            loc_wrapper.classList.add('input-field', 'row', 'col', 's12');
            const location = document.createElement('input');
            location.type = "text";
            location.readOnly = true;
            location.name = "__location__";
            location.id = "__location__id";
            location.addEventListener('click', function () {
                this.blur(); // Retire le focus pour éviter de pouvoir écrire dedans
                callLocationSelector(current_form); // Appelle le modal pour changer de lieu
            });
            if (filled_form) {
                location.value = location.dataset.reallocation = filled_form.location || "";
                // Recherche la vraie localisation (textuelle) dans Form.location
                const label_location = (filled_form.location in current_form.locations ?
                    current_form.locations[filled_form.location] :
                    null);
                if (label_location) {
                    location.value = `${filled_form.location} - ${label_location.label}`;
                }
                else if (filled_form.location !== null) {
                    helpers_8.showToast("Attention: La localisation de cette entrée n'existe plus dans le schéma du formulaire.");
                }
            }
            loc_wrapper.appendChild(location);
            const loc_title = document.createElement('h4');
            loc_title.innerText = "Lieu";
            placeh.appendChild(loc_title);
            placeh.appendChild(loc_wrapper);
            // Fin champ de lieu, itération sur champs
        }
        for (const ele of current_form.fields) {
            let element_to_add = null;
            if (ele.type === form_schema_3.FormEntityType.divider) {
                // C'est un titre
                // On divide
                const clearer = document.createElement('div');
                clearer.classList.add('clearb');
                placeh.appendChild(clearer);
                const htmle = document.createElement('h4');
                htmle.innerText = ele.label;
                htmle.id = "id_" + ele.name;
                placeh.appendChild(htmle);
                continue;
            }
            else if (ele.type === form_schema_3.FormEntityType.integer || ele.type === form_schema_3.FormEntityType.float) {
                const real_wrapper = document.createElement('div');
                const wrapper = createInputWrapper();
                if (ele.allow_voice_control) {
                    wrapper.classList.add('s11');
                    wrapper.classList.remove('s12');
                }
                const htmle = document.createElement('input');
                htmle.autocomplete = "off";
                const label = document.createElement('label');
                fillStandardInputValues(htmle, ele, label);
                htmle.type = "number";
                htmle.classList.add('input-form-element');
                if (ele.range) {
                    if (typeof ele.range.min !== 'undefined') {
                        htmle.min = String(ele.range.min);
                    }
                    if (typeof ele.range.max !== 'undefined') {
                        htmle.max = String(ele.range.max);
                    }
                }
                wrapper.appendChild(label);
                wrapper.appendChild(htmle);
                createTip(wrapper, ele);
                if (filled_form && ele.name in filled_form.fields) {
                    htmle.value = filled_form.fields[ele.name];
                }
                // Calcul de nombre de décimales requises
                // si le nombre demandé est un float
                let NB_DECIMALES = 0;
                if (ele.type === form_schema_3.FormEntityType.float && ele.float_precision) {
                    // Récupération de la partie décimale sous forme de string
                    const dec_part = ele.float_precision.toString().split('.');
                    // Calcul du nombre de décimales
                    if (dec_part.length > 1) {
                        NB_DECIMALES = dec_part[1].length;
                    }
                    else {
                        throw new Error(`La précision pour la partie décimale spécifiée pour le champ "${ele.name}" est invalide: Elle ne comporte pas de décimales.`);
                    }
                }
                // Définition des contraintes
                const contraintes = [];
                if (typeof ele.range !== 'undefined') {
                    if (typeof ele.range.min !== 'undefined') {
                        contraintes.push(["min", ele.range.min]);
                    }
                    if (typeof ele.range.max !== 'undefined') {
                        contraintes.push(["max", ele.range.max]);
                    }
                }
                if (ele.type === form_schema_3.FormEntityType.float && ele.float_precision) {
                    contraintes.push(["precision", ele.float_precision]);
                }
                contraintes.push(['type', ele.type === form_schema_3.FormEntityType.float ? 'float' : 'int']);
                htmle.dataset.constraints = contraintes.map(e => e.join('=')).join(';');
                // Attachage de l'évènement de vérification
                const num_verif = function () {
                    let valid = true;
                    let value;
                    try {
                        value = Number(this.value);
                    }
                    catch (e) {
                        valid = false;
                    }
                    if (typeof value === 'number' && value === value) {
                        if (typeof ele.range.min !== 'undefined' && value < ele.range.min) {
                            valid = false;
                        }
                        else if (typeof ele.range.max !== 'undefined' && value > ele.range.max) {
                            valid = false;
                        }
                        // if différent, il est juste en else if pour éviter de faire les
                        // calculs si le valid est déjà à false
                        else if (ele.type === form_schema_3.FormEntityType.float) {
                            if (ele.float_precision) {
                                // Si on a demandé à avoir un nombre de flottant précis
                                const floating_point = this.value.split('.');
                                if (floating_point.length > 1) {
                                    // Récupération de la partie décimale avec le bon nombre de décimales
                                    // (round obligatoire, à cause de la gestion des float imprécise)
                                    const partie_decimale = Number((value % 1).toFixed(NB_DECIMALES));
                                    // Si le nombre de chiffres après la virgule n'est pas le bon
                                    // ou si la valeur n'est pas de l'ordre souhaité (précision 0.05 avec valeur 10.03 p.e.)
                                    if (floating_point[1].length !== NB_DECIMALES || !isModuloZero(partie_decimale, ele.float_precision)) {
                                        valid = false;
                                    }
                                }
                                else {
                                    //Il n'y a pas de . dans le nombre
                                    valid = false;
                                }
                            }
                        }
                        else if (this.value.indexOf(".") !== -1) {
                            // Ce doit forcément être un entier,
                            // donc si on trouve un point
                            valid = false;
                        }
                    }
                    else {
                        valid = false;
                    }
                    if (valid) {
                        setValid(this);
                    }
                    else {
                        setInvalid(this);
                    }
                };
                htmle.addEventListener('change', num_verif);
                real_wrapper.appendChild(wrapper);
                if (ele.allow_voice_control) {
                    // On ajoute le bouton micro
                    const mic_btn = document.createElement('div');
                    mic_btn.classList.add('col', 's1', 'mic-wrapper');
                    mic_btn.style.paddingRight = "0";
                    mic_btn.innerHTML = `
                    <i class="material-icons red-text">mic</i>
                `;
                    mic_btn.addEventListener('click', function () {
                        vocal_recognition_3.prompt().then(function (value) {
                            const val = value;
                            value = val.replace(/ /g, '').replace(/,/g, '.').replace(/-/g, '.');
                            if (!isNaN(Number(value))) {
                                htmle.value = value;
                                num_verif.call(htmle);
                                M.updateTextFields();
                            }
                            else {
                                // Affichage forcé en toast Materialize:
                                // La reconnaissance vocale ouvre un toast natif qui masquerait celui-ci
                                M.toast({ html: "Nombre incorrect reconnu." });
                            }
                        });
                    });
                    real_wrapper.appendChild(mic_btn);
                }
                element_to_add = real_wrapper;
            }
            else if (ele.type === form_schema_3.FormEntityType.string || ele.type === form_schema_3.FormEntityType.bigstring) {
                const real_wrapper = document.createElement('div');
                const wrapper = createInputWrapper();
                let htmle;
                if (ele.type === form_schema_3.FormEntityType.string) {
                    htmle = document.createElement('input');
                    htmle.type = "text";
                    htmle.autocomplete = "off";
                }
                else {
                    htmle = document.createElement('textarea');
                    htmle.classList.add('materialize-textarea');
                }
                if (ele.allow_voice_control) {
                    wrapper.classList.add('s11');
                    wrapper.classList.remove('s12');
                }
                htmle.classList.add('input-form-element');
                const label = document.createElement('label');
                fillStandardInputValues(htmle, ele, label);
                if (filled_form && ele.name in filled_form.fields) {
                    htmle.value = filled_form.fields[ele.name];
                }
                wrapper.appendChild(label);
                wrapper.appendChild(htmle);
                createTip(wrapper, ele);
                // Définition des contraintes
                const contraintes = [];
                if (typeof ele.range !== 'undefined') {
                    if (typeof ele.range.min !== 'undefined') {
                        contraintes.push(["min", ele.range.min]);
                    }
                    if (typeof ele.range.max !== 'undefined') {
                        contraintes.push(["max", ele.range.max]);
                    }
                }
                htmle.dataset.constraints = contraintes.map(e => e.join('=')).join(';');
                // Attachage de l'évènement de vérification
                const str_verif = function () {
                    let valid = true;
                    let value = this.value;
                    if (typeof value === 'string') {
                        if (typeof ele.range !== 'undefined') {
                            if (typeof ele.range.min !== 'undefined' && value.length < ele.range.min) {
                                valid = false;
                            }
                            else if (typeof ele.range.max !== 'undefined' && value.length > ele.range.max) {
                                valid = false;
                            }
                            if (value.length === 0 && ele.suggested_not_blank) {
                                valid = false;
                            }
                        }
                    }
                    else {
                        valid = false;
                    }
                    if (valid) {
                        setValid(this);
                    }
                    else {
                        setInvalid(this);
                    }
                };
                htmle.addEventListener('change', str_verif);
                real_wrapper.appendChild(wrapper);
                if (ele.allow_voice_control) {
                    // On ajoute le bouton micro
                    const mic_btn = document.createElement('div');
                    mic_btn.classList.add('col', 's1', 'mic-wrapper');
                    mic_btn.style.paddingRight = "0";
                    mic_btn.innerHTML = `
                    <i class="material-icons red-text">mic</i>
                `;
                    let timer;
                    const gestion_click = function (erase = true) {
                        vocal_recognition_3.prompt().then(function (value) {
                            let val = value;
                            if (ele.remove_whitespaces) {
                                val = val.replace(/ /g, '').replace(/à/iug, 'a');
                            }
                            if (erase) {
                                htmle.value = val;
                            }
                            else {
                                htmle.value += val;
                            }
                            str_verif.call(htmle);
                            M.updateTextFields();
                            try {
                                M.textareaAutoResize(htmle);
                            }
                            catch (e) { }
                        });
                        timer = 0;
                    };
                    mic_btn.addEventListener('click', function () {
                        if (timer) {
                            clearTimeout(timer);
                            // On a double cliqué
                            gestion_click(false);
                            return;
                        }
                        timer = setTimeout(gestion_click, 400);
                    });
                    real_wrapper.appendChild(mic_btn);
                }
                element_to_add = real_wrapper;
            }
            else if (ele.type === form_schema_3.FormEntityType.select) {
                const wrapper = createInputWrapper();
                const htmle = document.createElement('select');
                const label = document.createElement('label');
                htmle.classList.add('input-form-element');
                fillStandardInputValues(htmle, ele, label);
                // Création des options
                htmle.multiple = ele.select_options.multiple;
                if (!htmle.multiple) {
                    htmle.dataset.valid = "1";
                }
                for (const opt of ele.select_options.options) {
                    const htmlopt = document.createElement('option');
                    htmlopt.selected = opt.selected;
                    htmlopt.value = opt.value;
                    htmlopt.innerText = opt.label;
                    htmle.appendChild(htmlopt);
                }
                if (htmle.multiple && ele.required) {
                    // On doit mettre un évènement pour vérifier si le select est vide
                    // Attachage de l'évènement de vérification
                    const select_verif = function () {
                        let value = this.value;
                        if (value) {
                            setValid(this);
                        }
                        else {
                            setInvalid(this);
                        }
                    };
                    htmle.addEventListener('change', select_verif);
                }
                // const mic_btn = document.createElement('div');
                // if (!htmle.multiple) {
                //     mic_btn.addEventListener('click', function() {
                //         prompt("Valeur ?", Array.from(htmle.options).map(e => e.label)).then(function(value) {
                //             htmle.value = value;
                //         });
                //     });
                // }
                if (filled_form && ele.name in filled_form.fields) {
                    if (ele.select_options.multiple) {
                        $(htmle).val(filled_form.fields[ele.name]);
                    }
                    else {
                        htmle.value = filled_form.fields[ele.name];
                    }
                }
                wrapper.appendChild(htmle);
                wrapper.appendChild(label);
                htmle.dataset.e_constraints = ele.external_constraints || "";
                htmle.dataset.invalid_tip = ele.tip_on_invalid || "";
                // Évènement pour le select: contraintes externes ou si select multiple.required
                if (htmle.multiple || ele.external_constraints) {
                    // Création du tip
                    createTip(wrapper, ele);
                    htmle.addEventListener('change', function (e) {
                        let valid = true;
                        if (this.multiple && this.required && $(this).val().length === 0) {
                            valid = false;
                        }
                        else if (this.value && ele.external_constraints) {
                            valid = validConstraints(ele.external_constraints, this);
                        }
                        if (valid) {
                            setValid(this, label);
                        }
                        else {
                            setInvalid(this, label);
                        }
                    });
                }
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_3.FormEntityType.checkbox) {
                const wrapper = document.createElement('p');
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = "checkbox";
                const span = document.createElement('span');
                fillStandardInputValues(input, ele, span);
                wrapper.classList.add('row', 'col', 's12', 'input-checkbox', 'flex-center-aligner');
                input.classList.add('filled-in', 'input-form-element');
                if (filled_form && ele.name in filled_form.fields) {
                    input.checked = filled_form.fields[ele.name];
                }
                wrapper.appendChild(label);
                label.appendChild(input);
                label.appendChild(span);
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_3.FormEntityType.datetime) {
                const wrapper = createInputWrapper();
                const input = document.createElement('input');
                const label = document.createElement('label');
                // Pour que le label ne recouvre pas le texte du champ
                label.classList.add('active');
                input.type = "datetime-local";
                input.classList.add('input-form-element');
                fillStandardInputValues(input, ele, label);
                // les datetime sont TOUJOURS valides, si ils sont pleins
                input.dataset.valid = "1";
                if (filled_form && ele.name in filled_form.fields) {
                    input.value = filled_form.fields[ele.name];
                }
                else {
                    // Problème: la date à entrer dans l'input est la date UTC
                    // On "corrige" ça par manipulation de la date (on rajoute l'offset)
                    let date_plus_timezone = new Date();
                    date_plus_timezone.setTime(date_plus_timezone.getTime() + (-date_plus_timezone.getTimezoneOffset() * 60 * 1000));
                    const date_str = date_plus_timezone.toISOString();
                    input.value = date_str.substring(0, date_str.length - 8);
                }
                wrapper.appendChild(label);
                wrapper.appendChild(input);
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_3.FormEntityType.file) {
                if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                    // L'input file est déjà présent dans le formulaire
                    // on affiche une miniature
                    const img_miniature = document.createElement('div');
                    img_miniature.classList.add('image-form-wrapper');
                    const img_balise = document.createElement('img');
                    img_balise.classList.add('img-form-element');
                    helpers_8.createImgSrc(filled_form.fields[ele.name], img_balise);
                    img_miniature.appendChild(img_balise);
                    placeh.appendChild(img_miniature);
                }
                // Input de type file
                const wrapper = document.createElement('div');
                wrapper.classList.add('file-field', 'input-field', 'row', 'col', 's12');
                const divbtn = document.createElement('div');
                divbtn.classList.add('btn');
                const span = document.createElement('span');
                span.innerText = "Fichier";
                const input = document.createElement('input');
                input.type = "file";
                input.id = "id_" + ele.name;
                input.name = ele.name;
                input.required = ele.required;
                input.accept = ele.file_type || "";
                input.classList.add('input-image-element');
                divbtn.appendChild(span);
                divbtn.appendChild(input);
                wrapper.appendChild(divbtn);
                const fwrapper = document.createElement('div');
                fwrapper.classList.add('file-path-wrapper');
                const f_input = document.createElement('input');
                f_input.type = "text";
                f_input.classList.add('file-path', 'validate');
                f_input.value = ele.label;
                // Construit le label à retenir pour pouvoir afficher son titre dans le modal de confirmation
                f_input.dataset.label = ele.label;
                f_input.dataset.for = input.id;
                fwrapper.appendChild(f_input);
                wrapper.appendChild(fwrapper);
                placeh.appendChild(wrapper);
                // Sépare les champ input file
                placeh.insertAdjacentHTML('beforeend', "<div class='clearb'></div><div class='divider divider-margin'></div>");
            }
            else if (ele.type === form_schema_3.FormEntityType.audio) {
                // Création d'un bouton pour enregistrer du son
                const wrapper = document.createElement('div');
                wrapper.classList.add('input-field', 'row', 'col', 's12', 'no-margin-top');
                const label = document.createElement('p');
                label.classList.add('no-margin-top', 'form-audio-label');
                label.innerText = ele.label;
                wrapper.appendChild(label);
                const button = document.createElement('button');
                button.classList.add('btn', 'blue', 'col', 's12', 'btn-perso');
                button.innerText = "Enregistrement audio";
                button.type = "button";
                const real_input = document.createElement('input');
                real_input.type = "hidden";
                real_input.classList.add('input-audio-element');
                // Construit le label à retenir pour pouvoir afficher son titre dans le modal de confirmation
                real_input.dataset.label = ele.label;
                // Création d'un label vide pour l'input
                const hidden_label = document.createElement('label');
                fillStandardInputValues(real_input, ele, hidden_label);
                hidden_label.classList.add('hide');
                wrapper.appendChild(hidden_label);
                ////// Définition si un fichier son existe déjà
                if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                    helpers_8.readFromFile(filled_form.fields[ele.name], function (base64) {
                        button.classList.remove('blue');
                        button.classList.add('green');
                        real_input.value = base64;
                        const duration = ((base64.length * 0.7) / (main_5.MP3_BITRATE * 1000)) * 8;
                        button.innerText = "Enregistrement (" + duration.toFixed(0) + "s" + ")";
                    }, function (fail) {
                        logger_4.Logger.warn("Impossible de charger le fichier", fail);
                    }, true);
                }
                ////// Fin
                button.addEventListener('click', function () {
                    // Crée un modal qui sert à enregistrer de l'audio
                    audio_listener_2.newModalRecord(button, real_input, ele);
                });
                wrapper.appendChild(button);
                wrapper.appendChild(real_input);
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_3.FormEntityType.slider) {
                const wrapper = document.createElement('div');
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = "checkbox";
                const span = document.createElement('span');
                fillStandardInputValues(input, ele);
                wrapper.classList.add('row', 'col', 's12', 'input-slider', 'switch', 'flex-center-aligner');
                input.classList.add('input-form-element', 'input-slider-element');
                span.classList.add('lever');
                wrapper.appendChild(label);
                // Texte si not checked
                label.insertAdjacentText('afterbegin', ele.slider_options[0].label);
                label.appendChild(input);
                label.appendChild(span);
                // Texte si checked
                label.insertAdjacentText('beforeend', ele.slider_options[1].label);
                // Insertion des deux options dans l'input en data-
                input.dataset.ifunchecked = ele.slider_options[0].name;
                input.dataset.ifchecked = ele.slider_options[1].name;
                if (filled_form && ele.name in filled_form.fields) {
                    input.checked = ele.slider_options[1].name === filled_form.fields[ele.name];
                }
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            if (element_to_add)
                placeh.appendChild(element_to_add);
        }
    }
    exports.constructForm = constructForm;
    /**
     * Lance la vérification des champs pour ensuite sauvegarder le formulaire
     * @param type Type de formulaire (ex: cincle_plongeur)
     * @param force_name? Force un identifiant pour le form à enregistrer
     * @param form_save? Précédente sauvegarde du formulaire
     */
    function beginFormSave(type, current_form, force_name, form_save) {
        return __awaiter(this, void 0, void 0, function* () {
            // Ouverture du modal de verification
            const modal = helpers_8.getModal();
            const instance = helpers_8.initModal({ dismissible: false, outDuration: 100 }, helpers_8.getModalPreloader("Vérification du formulaire en cours", `<div class="modal-footer">
            <a href="#!" class="btn-flat red-text modal-close">Annuler</a>
        </div>`));
            instance.open();
            // Attend que le modal s'ouvre proprement (ralentissements sinon)
            yield helpers_8.sleep(300);
            modal.classList.add('modal-fixed-footer');
            // Recherche des éléments à vérifier
            const elements_failed = [];
            const elements_warn = [];
            const location_element = document.getElementById('__location__id');
            let location_str = null;
            if (location_element) {
                location_str = location_element.dataset.reallocation;
            }
            // Vérifie le lieu si le lieu est défini 
            // (si il n'est pas requis, affiche un warning, sinon une erreur)
            if (!current_form.no_location && !location_str) {
                if (current_form.skip_location)
                    elements_warn.push(["Lieu", "Aucun lieu n'a été précisé.", location_element]);
                else
                    elements_failed.push(["Lieu", "Aucun lieu n'a été précisé.", location_element]);
            }
            // Input classiques: checkbox/slider, text, textarea, select, number
            for (const e of document.getElementsByClassName('input-form-element')) {
                const element = e;
                const label = document.querySelector(`label[for="${element.id}"]`);
                let name = element.name;
                if (label) {
                    name = label.textContent;
                }
                const contraintes = {};
                if (element.dataset.constraints) {
                    element.dataset.constraints.split(';').map((e) => {
                        const [name, value] = e.split('=');
                        contraintes[name] = value;
                    });
                }
                // Valide des contraintes externes si jamais l'élément a une valeur
                if (element.value && element.dataset.e_constraints && !validConstraints(element.dataset.e_constraints, element)) {
                    const str = element.dataset.invalid_tip || "Les contraintes externes du champ ne sont pas remplies.";
                    if (element.required) {
                        elements_failed.push([name, str, element]);
                    }
                    else {
                        elements_warn.push([name, str, element]);
                    }
                }
                else if (element.required && !element.value) {
                    if (element.tagName !== "SELECT" || (element.multiple && $(element).val().length === 0)) {
                        elements_failed.push([name, "Champ requis", element]);
                    }
                }
                else {
                    let fail = false;
                    let str = "";
                    // Si le champ est requis et a une valeur, on recherche ses contraintes
                    if (Object.keys(contraintes).length > 0) {
                        if (element.type === "text" || element.tagName === "textarea") {
                            if (typeof contraintes.min !== 'undefined' && element.value.length < contraintes.min) {
                                fail = true;
                                str += "La taille du texte doit dépasser " + contraintes.min + " caractères. ";
                            }
                            if (typeof contraintes.max !== 'undefined' && element.value.length > contraintes.max) {
                                fail = true;
                                str += "La taille du texte doit être inférieure à " + contraintes.max + " caractères. ";
                            }
                        }
                        else if (element.type === "number") {
                            if (typeof contraintes.min !== 'undefined' && Number(element.value) < contraintes.min) {
                                fail = true;
                                str += "Le nombre doit dépasser " + contraintes.min + ". ";
                            }
                            if (typeof contraintes.max !== 'undefined' && Number(element.value) > contraintes.max) {
                                fail = true;
                                str += "Le nombre doit être inférieur à " + contraintes.max + ". ";
                            }
                            // Vérification de la précision
                            if (contraintes.precision) {
                                // Calcul de nombre de décimales requises
                                // si le nombre demandé est un float
                                let NB_DECIMALES = 0;
                                const dec_part = contraintes.precision.toString().split('.');
                                NB_DECIMALES = dec_part[1].length;
                                // Si on a demandé à avoir un nombre de flottant précis
                                const floating_point = element.value.split('.');
                                if (floating_point.length > 1) {
                                    // Récupération de la partie décimale avec le bon nombre de décimales
                                    // (round obligatoire, à cause de la gestion des float imprécise)
                                    const partie_decimale = Number((Number(element.value) % 1).toFixed(NB_DECIMALES));
                                    // Si le nombre de chiffres après la virgule n'est pas le bon
                                    // ou si la valeur n'est pas de l'ordre souhaité (précision 0.05 avec valeur 10.03 p.e.)
                                    if (floating_point[1].length !== NB_DECIMALES || !isModuloZero(partie_decimale, Number(contraintes.precision))) {
                                        fail = true;
                                        str += "Le nombre doit avoir une précision de " + contraintes.precision + ". ";
                                    }
                                }
                                else {
                                    //Il n'y a pas de . dans le nombre
                                    fail = true;
                                    str += "Le nombre doit être à virgule. ";
                                }
                            }
                        }
                    }
                    if (fail) {
                        if (element.required) {
                            elements_failed.push([name, str, element]);
                        }
                        else {
                            elements_warn.push([name, str, element]);
                        }
                    }
                    // Si c'est autre chose, l'élément est forcément valide
                }
            }
            // Éléments FILE (ici, possiblement que des images)
            for (const e of document.querySelectorAll('.input-image-element[required]')) {
                const filei = e;
                if (filei.files.length === 0) {
                    const label = document.querySelector(`input[data-for="${filei.id}"]`);
                    let name = filei.name;
                    if (label) {
                        name = label.dataset.label;
                    }
                    elements_failed.push([name, "Fichier requis", filei]);
                }
            }
            // Éléments AUDIO (avec le modal permettant d'enregistrer du son)
            for (const e of document.querySelectorAll('.input-audio-element[required]')) {
                const hiddeni = e;
                if (!hiddeni.value) {
                    elements_failed.push([hiddeni.dataset.label, "Enregistrement audio requis", hiddeni]);
                }
            }
            // Construit les éléments dans le modal
            const container = document.createElement('div');
            container.classList.add('modal-content');
            if (elements_warn.length > 0 || elements_failed.length > 0) {
                const par = document.createElement('p');
                par.classList.add('flow-text', 'no-margin-top');
                par.innerText = "Des erreurs " + (!elements_failed.length ? 'potentielles' : '') + " ont été détectées.";
                container.appendChild(par);
                if (!elements_failed.length) {
                    const tinypar = document.createElement('p');
                    tinypar.style.marginTop = "-15px";
                    tinypar.innerText = "Veuillez vérifier votre saisie avant de continuer.";
                    container.appendChild(tinypar);
                }
                const list = document.createElement('ul');
                list.classList.add('collection');
                for (const error of elements_failed) {
                    const li = document.createElement('li');
                    li.classList.add("collection-item");
                    li.innerHTML = `
                <span class="red-text bold">${error[0]}</span>: 
                <span>${error[1]}</span>
            `;
                    list.appendChild(li);
                }
                for (const warning of elements_warn) {
                    const li = document.createElement('li');
                    li.classList.add("collection-item");
                    li.innerHTML = `
                <span class="bold">${warning[0]}</span>: 
                <span>${warning[1]}</span>
            `;
                    list.appendChild(li);
                }
                container.appendChild(list);
            }
            else {
                // On affiche un message de succès
                const title = document.createElement('h5');
                title.classList.add('no-margin-top');
                title.innerText = "Résumé";
                container.appendChild(title);
                const par = document.createElement('p');
                par.classList.add('flow-text');
                par.innerText = "Votre saisie ne contient aucune erreur. Vous pouvez désormais enregistrer cette entrée.";
                container.appendChild(par);
            }
            // Footer
            const footer = document.createElement('div');
            footer.classList.add('modal-footer');
            const cancel_btn = document.createElement('a');
            cancel_btn.href = "#!";
            cancel_btn.classList.add('btn-flat', 'left', 'modal-close', 'red-text');
            cancel_btn.innerText = "Corriger";
            footer.appendChild(cancel_btn);
            // Si aucun élément requis n'est oublié ou invalide, alors on autorise la sauvegarde
            if (elements_failed.length === 0) {
                const save_btn = document.createElement('a');
                save_btn.href = "#!";
                save_btn.classList.add('btn-flat', 'right', 'green-text');
                save_btn.innerText = "Sauvegarder";
                save_btn.onclick = function () {
                    modal.innerHTML = helpers_8.getModalPreloader("Sauvegarde en cours");
                    modal.classList.remove('modal-fixed-footer');
                    const unique_id = force_name || helpers_8.generateId(main_5.ID_COMPLEXITY);
                    PageManager_3.PageManager.lock_return_button = true;
                    saveForm(type, unique_id, location_str, form_save)
                        .then((form_values) => {
                        SyncManager_2.SyncManager.add(unique_id, form_values);
                        if (form_save) {
                            instance.close();
                            helpers_8.showToast("Écriture du formulaire et de ses données réussie.");
                            // On vient de la page d'édition de formulaire déjà créés
                            PageManager_3.PageManager.popPage();
                            // PageManager.reload(); la page se recharge toute seule au pop
                        }
                        else {
                            // On demande si on veut faire une nouvelle entrée
                            modal.innerHTML = `
                        <div class="modal-content">
                            <h5 class="no-margin-top">Saisir une nouvelle entrée ?</h5>
                            <p class="flow-text">
                                La précédente entrée a bien été enregistrée.
                            </p>
                        </div>
                        <div class="modal-footer">
                            <a href="#!" id="__after_save_entries" class="modal-close btn-flat blue-text left">Non</a>
                            <a href="#!" id="__after_save_new" class="modal-close btn-flat green-text right">Oui</a>
                            <div class="clearb"></div>
                        </div>
                        `;
                            document.getElementById('__after_save_entries').onclick = function () {
                                PageManager_3.PageManager.changePage(PageManager_3.AppPageName.saved, false);
                            };
                            document.getElementById('__after_save_new').onclick = function () {
                                setTimeout(() => {
                                    PageManager_3.PageManager.reload(undefined, true);
                                }, 150);
                            };
                        }
                    })
                        .catch((error) => {
                        modal.innerHTML = `
                    <div class="modal-content">
                        <h5 class="no-margin-top red-text">Erreur</h5>
                        <p class="flow-text">
                            Impossible d'enregistrer cette entrée.
                            Veuillez réessayer.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <a href="#!" class="btn-flat right red-text modal-close">Fermer</a>
                        <div class="clearb"></div>
                    </div>
                    `;
                        PageManager_3.PageManager.lock_return_button = false;
                        logger_4.Logger.error(error, error.message, error.stack);
                    });
                };
                footer.appendChild(save_btn);
            }
            const clearb = document.createElement('div');
            clearb.classList.add('clearb');
            footer.appendChild(clearb);
            modal.innerHTML = "";
            modal.appendChild(container);
            modal.appendChild(footer);
        });
    }
    /**
     * Sauvegarde le formulaire actuel dans un fichier .json
     *  @param type
     *  @param nom ID du formulaire
     */
    function saveForm(type, name, location, form_save) {
        const form_values = {
            fields: {},
            type,
            location,
            owner: (form_save ? form_save.owner : user_manager_4.UserManager.username),
            metadata: {}
        };
        for (const input of document.getElementsByClassName('input-form-element')) {
            const i = input;
            if (input.tagName === "SELECT" && input.multiple) {
                const selected = [...input.options].filter(option => option.selected).map(option => option.value);
                form_values.fields[i.name] = selected;
            }
            else if (i.type === "checkbox") {
                if (i.classList.contains("input-slider-element")) {
                    // C'est un slider
                    form_values.fields[i.name] = (i.checked ? i.dataset.ifchecked : i.dataset.ifunchecked);
                }
                else {
                    // C'est une checkbox classique
                    form_values.fields[i.name] = i.checked;
                }
            }
            else if (i.type === "number") {
                form_values.fields[i.name] = i.value === "" ? null : Number(i.value);
            }
            else {
                form_values.fields[i.name] = i.value;
            }
        }
        return writeDataThenForm(name, form_values, form_save);
    }
    exports.saveForm = saveForm;
    /**
     * Ecrit les fichiers présents dans le formulaire dans un dossier spécifique,
     * puis crée le formulaire
     * @param name Nom du formulaire (sans le .json)
     */
    function writeDataThenForm(name, form_values, older_save) {
        function saveBlobToFile(resolve, reject, filename, input_name, blob) {
            helpers_8.writeFile('form_data/' + name, filename, blob, function () {
                // Enregistre le nom du fichier sauvegardé dans le formulaire,
                // dans la valeur du champ field
                form_values.fields[input_name] = 'form_data/' + name + '/' + filename;
                form_values.metadata[input_name] = filename;
                if (older_save && input_name in older_save.fields && older_save.fields[input_name] !== null) {
                    // Si une image était déjà présente
                    if (older_save.fields[input_name] !== form_values.fields[input_name]) {
                        // Si le fichier enregistré est différent du fichier actuel
                        // Suppression de l'ancienne image
                        const parts = older_save.fields[input_name].split('/');
                        const file_name = parts.pop();
                        const dir_name = parts.join('/');
                        helpers_8.removeFileByName(dir_name, file_name);
                    }
                }
                // Résout la promise
                resolve();
            }, function (error) {
                // Erreur d'écriture du fichier => on rejette
                helpers_8.showToast("Un fichier n'a pas pu être sauvegardée. Vérifiez votre espace de stockage.");
                reject(error);
            });
        }
        return helpers_8.getDirP('form_data')
            .then(() => {
            // Crée le dossier form_data si besoin
            // Récupère les images du formulaire
            const images_from_form = document.getElementsByClassName('input-image-element');
            // Sauvegarde les images !
            const promises = [];
            for (const img of images_from_form) {
                promises.push(new Promise(function (resolve, reject) {
                    const file = img.files[0];
                    const input_name = img.name;
                    if (file) {
                        const filename = file.name;
                        const r = new FileReader();
                        r.onload = function () {
                            saveBlobToFile(resolve, reject, filename, input_name, new Blob([this.result]));
                        };
                        r.onerror = function (error) {
                            // Erreur de lecture du fichier => on rejette
                            reject(error);
                        };
                        r.readAsArrayBuffer(file);
                    }
                    else {
                        if (older_save && input_name in older_save.fields) {
                            form_values.fields[input_name] = older_save.fields[input_name];
                            if (typeof older_save.fields[input_name] === 'string') {
                                const parts = older_save.fields[input_name].split('/');
                                form_values.metadata[input_name] = parts[parts.length - 1];
                            }
                            else {
                                form_values.metadata[input_name] = null;
                            }
                        }
                        else {
                            form_values.fields[input_name] = null;
                            form_values.metadata[input_name] = null;
                        }
                        resolve();
                    }
                }));
            }
            // Récupère les données audio du formulaire
            const audio_from_form = document.getElementsByClassName('input-audio-element');
            for (const audio of audio_from_form) {
                promises.push(new Promise(function (resolve, reject) {
                    const file = audio.value;
                    const input_name = audio.name;
                    if (file) {
                        const filename = helpers_8.generateId(main_5.ID_COMPLEXITY) + '.mp3';
                        helpers_8.urlToBlob(file).then(function (blob) {
                            saveBlobToFile(resolve, reject, filename, input_name, blob);
                        });
                    }
                    else {
                        if (older_save && input_name in older_save.fields) {
                            form_values.fields[input_name] = older_save.fields[input_name];
                            if (typeof older_save.fields[input_name] === 'string') {
                                const parts = older_save.fields[input_name].split('/');
                                form_values.metadata[input_name] = parts[parts.length - 1];
                            }
                            else {
                                form_values.metadata[input_name] = null;
                            }
                        }
                        else {
                            form_values.fields[input_name] = null;
                            form_values.metadata[input_name] = null;
                        }
                        resolve();
                    }
                }));
            }
            return Promise.all(promises)
                .then(function () {
                // On supprime les metadonnées vides du form
                for (const n in form_values.metadata) {
                    if (form_values.metadata[n] === null) {
                        delete form_values.metadata[n];
                    }
                }
                return new Promise((resolve, reject) => {
                    // On écrit enfin le formulaire !
                    helpers_8.writeFile('forms', name + '.json', new Blob([JSON.stringify(form_values)]), function () {
                        console.log(form_values);
                        resolve(form_values);
                    }, reject);
                });
            });
        });
    }
    /**
     * Fonction qui va faire attendre l'arrivée du formulaire,
     * puis charger la page
     * @param base
     */
    function initFormPage(base, edition_mode) {
        if (edition_mode) {
            loadFormPage(base, edition_mode.form, edition_mode);
        }
        else {
            form_schema_3.Forms.onReady(function (available, current) {
                if (form_schema_3.Forms.current_key === null) {
                    // Aucun formulaire n'est chargé !
                    base.innerHTML = helpers_8.displayErrorMessage("Aucun formulaire n'est chargé.", "Sélectionnez le formulaire à utiliser dans les paramètres.");
                    PageManager_3.PageManager.should_wait = false;
                }
                else {
                    loadFormPage(base, current, edition_mode);
                }
            });
        }
    }
    exports.initFormPage = initFormPage;
    /**
     * Charge la page de formulaire (point d'entrée)
     * @param base Element dans lequel écrire la page
     */
    function loadFormPage(base, current_form, edition_mode) {
        base.innerHTML = "";
        if (!edition_mode && !user_manager_4.UserManager.logged) {
            // Si on est en mode création et qu'on est pas connecté
            base.innerHTML = base.innerHTML = helpers_8.displayErrorMessage("Vous devez vous connecter pour saisir une nouvelle entrée.", "Connectez-vous dans les paramètres.");
            PageManager_3.PageManager.should_wait = false;
            return;
        }
        const base_block = document.createElement('div');
        base_block.classList.add('row', 'container');
        const placeh = document.createElement('form');
        placeh.classList.add('col', 's12');
        placeh.id = "__main_form__id";
        base_block.appendChild(placeh);
        // Appelle la fonction pour construire
        if (edition_mode) {
            constructForm(placeh, current_form, edition_mode.save);
        }
        else {
            constructForm(placeh, current_form);
        }
        base.appendChild(base_block);
        M.updateTextFields();
        $('select').formSelect();
        // Lance le sélecteur de localisation uniquement si on est pas en mode édition et si le formulaire autorise les lieux
        if (!edition_mode) {
            if (!(current_form.no_location || current_form.skip_location)) {
                callLocationSelector(current_form);
            }
        }
        // Autoredimensionnement des textaera si valeur par défaut
        const $textarea = $('textarea');
        if ($textarea.length > 0) {
            M.textareaAutoResize($textarea);
        }
        // Création du bouton de sauvegarde
        const btn = document.createElement('div');
        btn.classList.add('btn-flat', 'right', 'red-text');
        btn.innerText = "Enregistrer";
        const current_form_key = form_schema_3.Forms.current_key;
        btn.addEventListener('click', function () {
            if (edition_mode) {
                beginFormSave(edition_mode.save.type, current_form, edition_mode.name, edition_mode.save);
            }
            else {
                try {
                    beginFormSave(current_form_key, current_form);
                }
                catch (e) {
                    logger_4.Logger.error(JSON.stringify(e));
                }
            }
        });
        base_block.appendChild(btn);
    }
    exports.loadFormPage = loadFormPage;
    /**
     * Annule la sélection de lieu
     * @param required true si le lieu est obligatoire. (une suggestion vers page précédente sera présentée si annulation)
     */
    function cancelGeoLocModal(required = true) {
        // On veut fermer; Deux possibilités.
        // Si le champ lieu est déjà défini et rempli, on ferme juste le modal
        if (!required || document.getElementById("__location__id").value.trim() !== "") {
            // On ferme juste le modal
        }
        else {
            // Sinon, on ramène à la page précédente
            PageManager_3.PageManager.goBack();
        }
        helpers_8.getModalInstance().close();
        helpers_8.getModal().classList.remove('modal-fixed-footer');
    }
    /**
     * Charge le sélecteur de localisation depuis un schéma de formulaire
     * @param current_form Schéma de formulaire chargé
     */
    function callLocationSelector(current_form) {
        // Obtient l'élément HTML du modal
        const modal = helpers_8.getModal();
        const instance = helpers_8.initModal({
            dismissible: false, preventScrolling: true, inDuration: 100, outDuration: 100
        });
        // Ouvre le modal et insère un chargeur
        instance.open();
        modal.innerHTML = helpers_8.getModalPreloader("Recherche de votre position...\nCeci peut prendre jusqu'à 30 secondes.", `<div class="modal-footer">
            <a href="#!" id="dontloc-footer-geoloc" class="btn-flat blue-text left">Saisie manuelle</a>
            <a href="#!" id="close-footer-geoloc" class="btn-flat red-text">Annuler</a>
            <div class="clearb"></div>
        </div>`);
        let is_loc_canceled = false;
        document.getElementById("close-footer-geoloc").onclick = function () {
            is_loc_canceled = true;
            cancelGeoLocModal(!current_form.skip_location);
        };
        document.getElementById('dontloc-footer-geoloc').onclick = function () {
            is_loc_canceled = true;
            locationSelector(modal, current_form.locations, false, !current_form.skip_location);
        };
        // Cherche la localisation et remplit le modal
        helpers_8.getLocation(function (coords) {
            if (!is_loc_canceled)
                locationSelector(modal, current_form.locations, coords, !current_form.skip_location);
        }, function () {
            if (!is_loc_canceled)
                locationSelector(modal, current_form.locations, undefined, !current_form.skip_location);
        });
    }
    /**
     * Formate une distance en mètres en texte lisible par un humain.
     * @param distance Distance en mètres
     */
    function textDistance(distance) {
        const unit = (distance >= 1000 ? "km" : "m");
        const str_distance = (distance >= 1000 ? (distance / 1000).toFixed(1) : distance.toString());
        return `${str_distance} ${unit}`;
    }
    /**
     * Charge le sélecteur de lieu dans le modal
     * @param modal Élément modal
     * @param locations Localisations disponibles pour ce formulaire
     * @param current_location Position actuelle. Si échec de localisation, undefined. Si explicitement non donnée, false.
     * @param required true si le lieu est obligatoire. (une suggestion vers page précédente sera présentée si annulation)
     */
    function locationSelector(modal, locations, current_location, required = true) {
        // Met le modal en modal avec footer fixé
        modal.classList.add('modal-fixed-footer');
        // Crée le contenu du modal et son footer
        const content = document.createElement('div');
        content.classList.add('modal-content');
        const footer = document.createElement('div');
        footer.classList.add('modal-footer');
        // Création de l'input qui va contenir le lieu
        const input = document.createElement('input');
        // Sélection manuelle
        const title = document.createElement('h5');
        title.innerText = "Sélection manuelle";
        content.appendChild(title);
        // Vide le modal actuel et le remplace par le contenu et footer créés
        modal.innerHTML = "";
        modal.appendChild(content);
        const labels_to_name = location_1.createLocationInputSelector(content, input, locations);
        // Construction de la liste de lieux si la location est trouvée
        if (current_location) {
            // Création de la fonction qui va gérer le cas où l'on appuie sur un lieu
            function clickOnLocation() {
                input.value = this.dataset.name + " - " + this.dataset.label;
                M.updateTextFields();
            }
            // Calcul de la distance entre chaque lieu et le lieu actuel
            let lieux_dispo = [];
            for (const lieu in locations) {
                lieux_dispo.push({
                    name: lieu,
                    label: locations[lieu].label,
                    distance: helpers_8.calculateDistance(current_location.coords, locations[lieu])
                });
            }
            lieux_dispo = lieux_dispo.sort((a, b) => a.distance - b.distance);
            // Titre
            const title = document.createElement('h5');
            title.innerText = "Lieux proches";
            content.appendChild(title);
            // Construction de la liste des lieux proches
            const collection = document.createElement('div');
            collection.classList.add('collection');
            for (let i = 0; i < lieux_dispo.length && i < main_5.MAX_LIEUX_AFFICHES; i++) {
                const elem = document.createElement('a');
                elem.href = "#!";
                elem.classList.add('collection-item');
                elem.innerHTML = `
                ${lieux_dispo[i].name} - ${lieux_dispo[i].label}
                <span class="right grey-text lighten-1">${textDistance(lieux_dispo[i].distance)}</span>
            `;
                elem.dataset.name = lieux_dispo[i].name;
                elem.dataset.label = lieux_dispo[i].label;
                elem.addEventListener('click', clickOnLocation);
                collection.appendChild(elem);
            }
            content.appendChild(collection);
        }
        else if (current_location === false) {
            // On affiche aucun texte dans ce cas.
            // (écran de sélection manuelle expréssément demandé)
        }
        else {
            // Affichage d'une erreur: géolocalisation impossible
            const error = document.createElement('h6');
            error.classList.add('red-text');
            error.innerText = "Impossible de vous géolocaliser.";
            const subtext = document.createElement('div');
            subtext.classList.add('red-text', 'flow-text');
            subtext.innerText = "Choisissez un lieu manuellement.";
            content.appendChild(error);
            content.appendChild(subtext);
        }
        // Création du footer
        const ok = document.createElement('a');
        ok.href = "#!";
        ok.innerText = "Confirmer";
        ok.classList.add("btn-flat", "green-text", "right");
        ok.addEventListener('click', function () {
            if (input.value.trim() === "") {
                helpers_8.showToast("Vous devez préciser un lieu.");
            }
            else if (input.value in labels_to_name) {
                const loc_input = document.getElementById('__location__id');
                loc_input.value = input.value;
                // On stocke la clé de la localisation dans reallocation
                loc_input.dataset.reallocation = labels_to_name[input.value][0];
                helpers_8.getModalInstance().close();
                modal.classList.remove('modal-fixed-footer');
            }
            else {
                helpers_8.showToast("Le lieu entré n'a aucune correspondance dans la base de données.");
            }
        });
        footer.appendChild(ok);
        // Création du bouton annuler
        const cancel = document.createElement('a');
        cancel.href = "#!";
        cancel.innerText = "Annuler";
        cancel.classList.add("btn-flat", "red-text", "left");
        cancel.addEventListener('click', () => { cancelGeoLocModal(required); });
        footer.appendChild(cancel);
        modal.appendChild(footer);
    }
});
define("home", ["require", "exports", "user_manager", "SyncManager", "helpers", "main", "form_schema", "location", "test_vocal_reco"], function (require, exports, user_manager_5, SyncManager_3, helpers_9, main_6, form_schema_4, location_2, test_vocal_reco_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.APP_NAME = "Busy Bird";
    function initHomePage(base) {
        return __awaiter(this, void 0, void 0, function* () {
            base.innerHTML = `
    <div class="flex-center-aligner home-top-element">
        <img id="__home_logo_clicker" src="img/logo.png" class="home-logo">
    </div>
    <div class="container relative-container">
        <span class="very-tiny-text version-text">Version ${main_6.APP_VERSION}</span>
        <p class="flow-text center">
            Bienvenue dans ${exports.APP_NAME}, l'application qui facilite le suivi d'espèces 
            sur le terrain !
        </p>
        <p class="flow-text red-text">
            ${!user_manager_5.UserManager.logged ? `
                Vous n'êtes pas connecté dans l'application. Vous ne serez pas en mesure de
                saisir de nouvelles entrées sans être authentifié. Veuillez vous connecter via
                les paramètres de l'application.
            ` : ''}
        </p>
        <div id="__home_container"></div>
    </div>
    `;
            //////// TEST ////////
            createTestHome();
            //////// ENDTEST ////////
            const home_container = document.getElementById('__home_container');
            // Calcul du nombre de formulaires en attente de synchronisation
            try {
                const remaining_count = yield SyncManager_3.SyncManager.remainingToSync();
                if (helpers_9.hasGoodConnection()) {
                    if (remaining_count > 15) {
                        home_container.innerHTML = createCardPanel(`<span class="blue-text text-darken-2">Vous avez beaucoup d'éléments à synchroniser (${remaining_count} entrées).</span><br>
                    <span class="blue-text text-darken-2">Rendez-vous dans les paramètres pour lancer la synchronisation.</span>`, "Synchronisation");
                    }
                    else if (remaining_count > 0) {
                        home_container.innerHTML = createCardPanel(`<span class="blue-text text-darken-2">
                        Vous avez ${remaining_count} entrée${remaining_count > 1 ? 's' : ''} en attente de synchronisation.
                    </span>`);
                    }
                }
                else if (remaining_count > 0) {
                    home_container.innerHTML = createCardPanel(`
                <span class="blue-text text-darken-2">Vous avez des éléments en attente de synchronisation.</span><br>
                <span class="red-text text-darken-2">Lorsque vous retrouverez une bonne connexion Internet,</span>
                <span class="blue-text text-darken-2">lancez une synchronisation dans les paramètres.</span>`);
                }
            }
            catch (e) {
                home_container.innerHTML = createCardPanel(`<span class="red-text text-darken-2">Impossible de relever les entrées disponibles.</span><br>
            <span class="red-text text-darken-2">Cette erreur est possiblement grave. 
            Nous vous conseillons de ne pas enregistrer de formulaire.</span>`, "Erreur");
            }
            // Montre l'utilisateur connecté
            if (user_manager_5.UserManager.logged) {
                home_container.insertAdjacentHTML('beforeend', createCardPanel(`<span class="grey-text text-darken-1">${user_manager_5.UserManager.username}</span>
            <span class="blue-text text-darken-2">est connecté-e.</span>`));
            }
            // Nombre de formulaires enregistrés sur l'appareil
            try {
                const nb_files = (yield helpers_9.getDirP('forms').then(helpers_9.dirEntries)).length;
                home_container.insertAdjacentHTML('beforeend', createCardPanel(`<span class="blue-text text-darken-2">${nb_files === 0 ? 'Aucune' : nb_files} entrée${nb_files > 1 ? 's' : ''} 
            ${nb_files > 1 ? 'sont' : 'est'} stockée${nb_files > 1 ? 's' : ''} sur cet appareil.</span>`));
            }
            catch (e) {
                // Impossible d'obtenir les fichiers
                home_container.insertAdjacentHTML('beforeend', createCardPanel(`<span class="red-text text-darken-2">Impossible d'obtenir la liste des fichiers présents sur l'appareil.</span><br>
            <span class="red-text text-darken-2">Cette erreur est probablement grave. 
            Nous vous conseillons de ne pas tenter d'enregistrer un formulaire et de vérifier votre stockage interne.</span>`));
            }
            form_schema_4.Forms.onReady(function (available, current) {
                if (form_schema_4.Forms.current_key === null) {
                    return;
                }
                const locations = current.locations;
                // Navigation vers nichoir
                home_container.insertAdjacentHTML('beforeend', `<div class="divider divider-margin big"></div>
            <h6 style="margin-left: 10px; font-size: 1.25rem">Naviguer vers un habitat de ${current.name.toLowerCase()}</h6>`);
                location_2.createLocationInputSelector(home_container, document.createElement('input'), locations, true);
            });
            // Initialise les champs materialize et le select
            M.updateTextFields();
            $('select').formSelect();
        });
    }
    exports.initHomePage = initHomePage;
    function createCardPanel(html_text, title) {
        return `
        <div class="card-panel card-perso">
            ${title ? `<h6 class="no-margin-top">${title}</h6>` : ''}
            <p class="flow-text no-margin-top no-margin-bottom">${html_text}</p>
        </div>
    `;
    }
    function createTestHome() {
        let click_count = 0;
        let timeout_click;
        let allow_to_click_to_terrain = false;
        document.getElementById('__home_logo_clicker').onclick = function () {
            if (timeout_click)
                clearTimeout(timeout_click);
            timeout_click = 0;
            click_count++;
            if (click_count === 5) {
                timeout_click = setTimeout(function () {
                    allow_to_click_to_terrain = true;
                    setTimeout(function () {
                        allow_to_click_to_terrain = false;
                    }, 20000);
                }, 1500);
            }
            else {
                timeout_click = setTimeout(function () {
                    click_count = 0;
                }, 400);
            }
        };
        const version_t = document.querySelector('.relative-container span.version-text');
        version_t.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (allow_to_click_to_terrain) {
                test_vocal_reco_2.launchQuizz(helpers_9.getBase());
            }
        };
    }
});
// ////// DEPRECATED
// /**
//  * Initie la sauvegarde: présente et vérifie les champs
//  *  @param type
//  */
// function initFormSave(type: string, force_name?: string, form_save?: FormSave): any {
//     console.log("Demarrage initFormSave")
//     // Ouverture du modal de verification
//     const modal = getModal();
//     const instance = initModal({ dismissible: true }, getModalPreloader(
//         "La vérification a probablement planté.<br>Merci de patienter quand même, on sait jamais.",
//         `<div class="modal-footer">
//             <a href="#!" id="cancel_verif" class="btn-flat red-text">Annuler</a>
//         </div>`
//     ));
//     modal.classList.add('modal-fixed-footer');
//     // Ouverture du premiere modal de chargement
//     instance.open();
//     // creation de la liste d'erreurs
//     let list_erreur = document.createElement("div");
//     list_erreur.classList.add("modal-content");
//     let element_erreur = document.createElement("ul");
//     element_erreur.classList.add("collection")
//     list_erreur.appendChild(element_erreur);
//     //Ajouter verification avant d'ajouter bouton valider
//     let erreur_critique: boolean = false;
//     //Parcours tous les elements remplits ou non
//     for (const input of document.getElementsByClassName('input-form-element')) {
//         //Attribution du label plutot que son nom interne
//         const i = input as HTMLInputElement;
//         const label = document.querySelector(`label[for="${i.id}"]`);
//         let name = i.name;
//         if (label) {
//             name = label.textContent;
//         };
//         const contraintes: any = {};
//         if (i.dataset.constraints) {
//             i.dataset.constraints.split(';').map((e: string) => {
//                 const [name, value] = e.split('=');
//                 contraintes[name] = value;
//             });
//         }
//         //Si l'attribut est obligatoirement requis et qu'il est vide -> erreur critique impossible de sauvegarder
//         if (i.required && !i.value) {
//             let erreur = document.createElement("li");
//             erreur.classList.add("collection-item");
//             erreur.innerHTML = "<strong style='color: red;' >" + name + "</strong> : Champ requis";
//             element_erreur.insertBefore(erreur, element_erreur.firstChild);
//             erreur_critique = true;
//             continue;
//         }
//         if (input.tagName === "SELECT" && (input as HTMLSelectElement).multiple) {
//             const selected = [...(input as HTMLSelectElement).options].filter(option => option.selected).map(option => option.value);
//             if (selected.length == 0) {
//                 let erreur = document.createElement("li");
//                 erreur.classList.add("collection-item");
//                 erreur.innerHTML = "<strong>" + name + "</strong> : Non renseigné";
//                 element_erreur.appendChild(erreur);
//             }
//         }
//         else if (i.type !== "checkbox") {
//             if (!i.value) {
//                 let erreur = document.createElement("li");
//                 erreur.classList.add("collection-item");
//                 erreur.innerHTML = "<strong>" + name + "</strong> : Non renseigné";
//                 element_erreur.appendChild(erreur);
//             }
//             else if (i.type === "number") {
//                 if (contraintes) {
//                     if ((Number(i.value) <= Number(contraintes['min'])) || (Number(i.value) >= Number(contraintes['max']))) {
//                         let erreur = document.createElement("li");
//                         erreur.classList.add("collection-item");
//                         erreur.innerHTML = "<strong>" + name + "</strong> : Intervale non respecté";
//                         element_erreur.appendChild(erreur);
//                     }
//                     // ajouter precision else if ()
//                 }
//             }
//             else if (i.type === "text") {
//                 if (contraintes) {
//                     if ((i.value.length < Number(contraintes['min'])) || (i.value.length > Number(contraintes['max']))) {
//                         let erreur = document.createElement("li");
//                         erreur.classList.add("collection-item");
//                         erreur.innerHTML = "<strong>" + name + "</strong> : Taille non respecté";
//                         element_erreur.appendChild(erreur);
//                     };
//                 }
//             }
//         }
//     }
//     modal.innerHTML = "";
//     modal.appendChild(list_erreur);
//     let footer = document.createElement("div");
//     footer.classList.add("modal-footer");
//     if (erreur_critique) {
//         footer.innerHTML = `<a href="#!" id="cancel_verif" class="btn-flat red-text">Corriger</a>
//         </div>`;
//     }
//     else {
//         footer.innerHTML = `<a href="#!" id="cancel_verif" class="btn-flat red-text">Corriger</a><a href="#!" id="valid_verif" class="btn-flat green-text">Valider</a>
//         </div>`;
//     }
//     modal.appendChild(footer);
//     document.getElementById("cancel_verif").onclick = function() {
//         getModalInstance().close();
//     };
//     if (!erreur_critique) {
//         document.getElementById("valid_verif").onclick = function() {
//             getModalInstance().close();
//             saveForm(type, force_name, form_save);
//         }
//     };
//     // Si champ invalide suggéré (dépassement de range, notamment) ou champ vide, message d'alerte, mais
// }
define("settings_page", ["require", "exports", "user_manager", "form_schema", "helpers", "SyncManager", "PageManager", "fetch_timeout", "main", "home", "Settings"], function (require, exports, user_manager_6, form_schema_5, helpers_10, SyncManager_4, PageManager_4, fetch_timeout_3, main_7, home_1, Settings_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    fetch_timeout_3 = __importDefault(fetch_timeout_3);
    function headerText() {
        return `${user_manager_6.UserManager.logged ?
            "Vous êtes connecté-e en tant que <span class='orange-text text-darken-2'>" + user_manager_6.UserManager.username + "</span>"
            : "Vous n'êtes pas connecté-e"}.`;
    }
    function formActualisationModal() {
        const instance = helpers_10.initModal({ dismissible: false }, helpers_10.getModalPreloader("Actualisation..."));
        instance.open();
        form_schema_5.Forms.init(true)
            .then(() => {
            helpers_10.showToast("Actualisation terminée.");
            instance.close();
            PageManager_4.PageManager.reload();
        })
            .catch((error) => {
            helpers_10.showToast("Impossible d'actualiser les schémas.");
            instance.close();
        });
    }
    function initSettingsPage(base) {
        const connecte = user_manager_6.UserManager.logged;
        base.innerHTML = `
    <div class="container row" id="main_settings_container">
        <h4>Utilisateur</h4>
        <p id="settings_main_text" class="flow-text no-margin-bottom">${headerText()}</p>
    </div>
    `;
        ////// DEFINITION DU BOUTON DE CONNEXION
        const container = document.getElementById('main_settings_container');
        const button = document.createElement('button');
        const header = document.getElementById('settings_main_text');
        container.appendChild(button);
        function logUserButton() {
            button.type = "button";
            button.innerHTML = "Se connecter";
            button.classList.remove('red');
            button.classList.add('col', 's12', 'blue', 'btn', 'btn-perso', 'btn-margins', 'white-text');
            button.onclick = function () {
                user_manager_6.loginUser().then(function () {
                    PageManager_4.PageManager.reload();
                });
            };
        }
        function unlogUserButton() {
            button.type = "button";
            button.innerHTML = "Déconnexion";
            button.classList.remove('blue');
            button.classList.add('col', 's12', 'red', 'btn', 'btn-perso', 'btn-margins');
            button.onclick = function () {
                helpers_10.askModal("Se déconnecter ?", "Vous ne pourrez pas saisir une entrée de formulaire tant que vous ne serez pas reconnecté-e.")
                    .then(function () {
                    // L'utilisateur veut se déconnecter
                    user_manager_6.UserManager.unlog();
                    logUserButton();
                    header.innerHTML = headerText();
                })
                    .catch(function () {
                    // L'utilisateur ne se déconnecte pas, finalement
                });
            };
        }
        if (connecte) {
            unlogUserButton();
        }
        else {
            logUserButton();
        }
        /////// PARTIE DEUX: FORMULAIRES
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Formulaires</h4>
    <h5>Schéma actif</h5>
    <p class="flow-text">
        Ce schéma d'entrée correspond à celui proposé dans la page "Nouvelle entrée".
    </p>
    `);
        // Choix du formulaire actif
        const select = document.createElement('select');
        select.classList.add('material-select');
        container.appendChild(select);
        form_schema_5.Forms.onReady(function () {
            const available = [["", "Aucun"], ...form_schema_5.Forms.getAvailableForms()];
            for (const option of available) {
                const o = document.createElement('option');
                o.value = option[0];
                o.innerText = option[1];
                if (option[0] === form_schema_5.Forms.current_key || (option[0] === "" && form_schema_5.Forms.current_key === null)) {
                    o.selected = true;
                }
                select.appendChild(o);
            }
            M.FormSelect.init(select);
        });
        select.addEventListener('change', function () {
            const value = select.value || null;
            if (form_schema_5.Forms.formExists(value)) {
                form_schema_5.Forms.changeForm(value, true);
            }
        });
        // Bouton pour accéder aux souscriptions
        container.insertAdjacentHTML('beforeend', `
    <h5>Souscriptions aux schémas</h5>
    <p class="flow-text">
        Les schémas de formulaires sont les types de formulaires vous étant proposés à la saisie dans ${home_1.APP_NAME}.
        ${user_manager_6.UserManager.logged ? `
            Consultez et modifiez ici les différents schémas auquel l'application autorise "${user_manager_6.UserManager.username}" à remplir.
        ` : ''}
    </p>
    `);
        const subs_btn = document.createElement('button');
        subs_btn.classList.add('col', 's12', 'purple', 'btn', 'btn-perso', 'btn-small-margins');
        subs_btn.innerHTML = "Gérer souscriptions";
        subs_btn.onclick = function () {
            if (user_manager_6.UserManager.logged) {
                subscriptionsModal();
            }
            else {
                helpers_10.informalBottomModal("Connectez-vous", "La gestion des souscriptions à des schémas est uniquement possible en étant connecté.");
            }
        };
        container.appendChild(subs_btn);
        // Bouton pour actualiser les schémas
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <h5>Actualiser les schémas</h5>
    <p class="flow-text">
        Une actualisation automatique est faite à chaque démarrage de l'application.
        Si vous pensez que les schémas auquel vous avez souscrit ont changé depuis le dernier
        démarrage, vous pouvez les actualiser.
    </p>
    `);
        const formbtn = document.createElement('button');
        formbtn.classList.add('col', 's12', 'green', 'btn', 'btn-perso', 'btn-small-margins');
        formbtn.innerHTML = "Actualiser schémas formulaire";
        formbtn.onclick = function () {
            if (user_manager_6.UserManager.logged) {
                helpers_10.askModal("Actualiser les schémas ?", "L'actualisation des schémas de formulaire récupèrera les schémas à jour depuis le serveur du LBBE.").then(() => {
                    // L'utilisateur a dit oui
                    formActualisationModal();
                });
            }
            else {
                helpers_10.informalBottomModal("Connectez-vous", "L'actualisation des schémas est uniquement possible en étant connecté.");
            }
        };
        container.appendChild(formbtn);
        //// PARTIE TROIS: SYNCHRONISATION
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Synchronisation</h4>
    <h5>Arrière-plan</h5>
    <p class="flow-text">
        L'application tente de synchroniser régulièrement les entrées 
        si une connexion à Internet est disponible.
    </p>
    `);
        // Select pour choisir la fréquence de synchro
        const select_field = helpers_10.convertHTMLToElement('<div class="input-field col s12"></div>');
        const select_input = document.createElement('select');
        for (const minutes of main_7.SYNC_FREQUENCY_POSSIBILITIES) {
            const opt = document.createElement('option');
            opt.value = String(minutes);
            opt.innerText = helpers_10.convertMinutesToText(minutes);
            opt.selected = minutes === Settings_2.Settings.sync_freq;
            select_input.appendChild(opt);
        }
        select_input.onchange = function () {
            Settings_2.Settings.sync_freq = Number(this.value);
            SyncManager_4.SyncManager.changeBackgroundSyncInterval(Settings_2.Settings.sync_freq);
        };
        const select_label = document.createElement('label');
        select_label.innerText = "Fréquence de synchronisation";
        select_field.appendChild(select_input);
        select_field.appendChild(select_label);
        container.appendChild(select_field);
        // Initialisation du select materialize
        M.FormSelect.init(select_input);
        // Checkbox pour activer sync en arrière plan
        container.insertAdjacentHTML('beforeend', `
        <p style="margin-bottom: 20px">
            <label>
                <input type="checkbox" id="__sync_bg_checkbox_settings" ${Settings_2.Settings.sync_bg ? 'checked' : ''}>
                <span>Activer la synchronisation en arrière-plan</span>
            </label>
        </p>`);
        document.getElementById('__sync_bg_checkbox_settings').onchange = function () {
            Settings_2.Settings.sync_bg = this.checked;
            if (Settings_2.Settings.sync_bg) {
                SyncManager_4.SyncManager.startBackgroundSync();
            }
            else {
                SyncManager_4.SyncManager.stopBackgroundSync();
            }
        };
        // Bouton pour forcer sync
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <h5>Forcer synchronisation</h5>
    <p class="flow-text">
        La synchronisation standard se trouve dans la page des entrées.
        Vous pouvez forcer le renvoi complet des données vers le serveur,
        y compris celles déjà synchronisées, ici. 
    </p>
    `);
        const syncbtn = document.createElement('button');
        syncbtn.classList.add('col', 's12', 'orange', 'btn', 'btn-perso', 'btn-small-margins');
        syncbtn.innerHTML = "Tout resynchroniser";
        syncbtn.onclick = function () {
            helpers_10.askModal("Tout synchroniser ?", "Veillez à disposer d'une bonne connexion à Internet.\
            Vider le cache obligera à resynchroniser tout l'appareil, même si vous annulez la synchronisation.", "Oui", "Non", "Vider cache de synchronisation").then(checked_val => {
                // L'utilisateur a dit oui
                SyncManager_4.SyncManager.graphicalSync(true, checked_val);
            });
        };
        container.appendChild(syncbtn);
    }
    exports.initSettingsPage = initSettingsPage;
    function getSubscriptions() {
        return __awaiter(this, void 0, void 0, function* () {
            return fetch_timeout_3.default(main_7.API_URL + "schemas/available.json", {
                headers: new Headers({ "Authorization": "Bearer " + user_manager_6.UserManager.token }),
                method: "GET",
                mode: "cors"
            }, 30000)
                .then(response => response.json());
        });
    }
    function subscribe(ids, fetch_subs) {
        return __awaiter(this, void 0, void 0, function* () {
            const form_data = new FormData();
            form_data.append('ids', ids.join(','));
            if (!fetch_subs) {
                form_data.append('trim_subs', 'true');
            }
            return fetch_timeout_3.default(main_7.API_URL + "schemas/subscribe.json", {
                headers: new Headers({ "Authorization": "Bearer " + user_manager_6.UserManager.token }),
                method: "POST",
                mode: "cors",
                body: form_data
            }, 60000)
                .then(response => response.json());
        });
    }
    function unsubscribe(ids, fetch_subs) {
        return __awaiter(this, void 0, void 0, function* () {
            const form_data = new FormData();
            form_data.append('ids', ids.join(','));
            if (!fetch_subs) {
                form_data.append('trim_subs', 'true');
            }
            return fetch_timeout_3.default(main_7.API_URL + "schemas/unsubscribe.json", {
                headers: new Headers({ "Authorization": "Bearer " + user_manager_6.UserManager.token }),
                method: "POST",
                mode: "cors",
                body: form_data
            }, 60000)
                .then(response => response.json());
        });
    }
    function subscriptionsModal() {
        return __awaiter(this, void 0, void 0, function* () {
            const modal = helpers_10.getModal();
            const instance = helpers_10.initModal({ outDuration: 100, inDuration: 100 }, helpers_10.getModalPreloader("Récupération des souscriptions", `<div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Annuler</a></div>`));
            instance.open();
            const content = document.createElement('div');
            content.classList.add('modal-content');
            let subscriptions;
            try {
                subscriptions = yield getSubscriptions();
            }
            catch (e) {
                modal.innerHTML = `
        <div class="modal-content">
            <h5 class="red-text no-margin-top">Erreur</h5>
            <p class="flow-text">Impossible d'obtenir les souscriptions.</p>
        </div>
        <div class="modal-footer"><a href="#!" class="btn-flat red-text modal-close">Fermer</a></div>
        `;
                return;
            }
            // Construction du contenu du modal
            // <p>
            //   <label>
            //     <input type="checkbox" />
            //     <span>LABEL</span>
            //   </label>
            // </p>
            content.insertAdjacentHTML('beforeend', `<h5 class="no-margin-top">Souscriptions</h5>`);
            content.insertAdjacentHTML('beforeend', `
        <p class="flow-text">
            Gérez vos souscriptions et abonnez-vous à des nouveaux schémas de formulaire ici.
            Cochez pour vous abonner.
        </p>
    `);
            const row = document.createElement('div');
            row.classList.add('row');
            content.appendChild(row);
            const first_checked = {};
            for (const form_id in subscriptions) {
                const p = document.createElement('p');
                const label = document.createElement('label');
                p.appendChild(label);
                const checkbox = document.createElement('input');
                checkbox.type = "checkbox";
                checkbox.checked = subscriptions[form_id][1];
                checkbox.classList.add('input-subscription-element');
                checkbox.dataset.id = form_id;
                if (checkbox.checked) {
                    first_checked[form_id] = true;
                }
                const span = document.createElement('span');
                span.innerText = subscriptions[form_id][0];
                label.appendChild(checkbox);
                label.appendChild(span);
                row.appendChild(p);
            }
            const footer = document.createElement('div');
            footer.classList.add('modal-footer');
            footer.insertAdjacentHTML('beforeend', `<a href="#!" class="btn-flat left red-text modal-close">Annuler</a>`);
            const valid_btn = document.createElement('a');
            valid_btn.classList.add('btn-flat', 'right', 'green-text');
            valid_btn.href = "#!";
            valid_btn.innerText = "Enregistrer";
            // Si demande d'enregistrement > lance la procédure
            valid_btn.onclick = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // Récupération des checkbox; cochées et non cochées
                    const checkboxes = document.getElementsByClassName('input-subscription-element');
                    const to_check = [];
                    const to_uncheck = [];
                    for (const c of checkboxes) {
                        const ch = c;
                        // Si l'élément est coché et il n'est pas présent dans la liste originale d'éléments cochés
                        if (ch.checked && !(ch.dataset.id in first_checked)) {
                            to_check.push(ch.dataset.id);
                        }
                        // Si l'élément est décoché mais il est présent dans la liste originale d'éléments cochés
                        else if (!ch.checked && ch.dataset.id in first_checked) {
                            to_uncheck.push(ch.dataset.id);
                        }
                    }
                    modal.innerHTML = helpers_10.getModalPreloader("Mise à jour des souscriptions<br>Veuillez ne pas fermer cette fenêtre");
                    modal.classList.remove('modal-fixed-footer');
                    try {
                        // Appel à unsubscribe
                        if (to_uncheck.length > 0) {
                            yield unsubscribe(to_uncheck, false);
                            // Suppression des formulaires demandés à être unsub
                            for (const f of to_uncheck) {
                                form_schema_5.Forms.deleteForm(f);
                            }
                            form_schema_5.Forms.saveForms();
                        }
                        let subs = undefined;
                        // Appel à subscribe
                        if (to_check.length > 0) {
                            subs = (yield subscribe(to_check, true));
                        }
                        helpers_10.showToast("Mise à jour des souscriptions réussie");
                        instance.close();
                        // Met à jour les formulaires si ils ont changé (appel à subscribe ou unsubscribe)
                        if (subs) {
                            form_schema_5.Forms.schemas = subs;
                        }
                    }
                    catch (e) {
                        helpers_10.showToast("Impossible de mettre à jour les souscriptions.\nVérifiez votre connexion à Internet.");
                        instance.close();
                    }
                    PageManager_4.PageManager.reload();
                });
            };
            footer.appendChild(valid_btn);
            footer.insertAdjacentHTML('beforeend', `<div class="clearb"></div>`);
            modal.classList.add('modal-fixed-footer');
            modal.innerHTML = "";
            modal.appendChild(content);
            modal.appendChild(footer);
        });
    }
});
define("saved_forms", ["require", "exports", "helpers", "form_schema", "PageManager", "SyncManager", "logger"], function (require, exports, helpers_11, form_schema_6, PageManager_5, SyncManager_5, logger_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var SaveState;
    (function (SaveState) {
        SaveState[SaveState["saved"] = 0] = "saved";
        SaveState[SaveState["waiting"] = 1] = "waiting";
        SaveState[SaveState["error"] = 2] = "error";
    })(SaveState || (SaveState = {}));
    ;
    function editAForm(form, name) {
        // Vérifie que le formulaire est d'un type disponible
        if (form.type === null || !form_schema_6.Forms.formExists(form.type)) {
            helpers_11.showToast("Impossible de charger ce fichier.\nLe type de formulaire enregistré est indisponible.\nVérifiez que vous avez souscrit à ce type de formulaire: '" + form.type + "'.", 10000);
            return;
        }
        const current_form = form_schema_6.Forms.getForm(form.type);
        PageManager_5.PageManager.pushPage(PageManager_5.AppPageName.form, "Modifier", { form: current_form, name, save: form });
    }
    function deleteAll() {
        return __awaiter(this, void 0, void 0, function* () {
            // On veut supprimer tous les fichiers
            // Récupération de tous les fichiers de forms
            let dirEntries = yield helpers_11.getDirP('forms');
            const entries = yield dirEntries(dirEntries);
            const promises = [];
            for (const e of entries) {
                if (e.isFile) {
                    promises.push(deleteForm(e.name));
                }
            }
            yield Promise.all(promises);
            yield SyncManager_5.SyncManager.clear();
            helpers_11.showToast("Fichiers supprimés avec succès");
            PageManager_5.PageManager.reload();
        });
    }
    function appendFileEntry(json, ph) {
        return __awaiter(this, void 0, void 0, function* () {
            const save = json[1];
            const selector = document.createElement('li');
            selector.classList.add('collection-item');
            const container = document.createElement('div');
            container.classList.add('saved-form-item');
            let id = json[0].name;
            let id_without_json = id.split('.json')[0];
            container.dataset.formid = id_without_json;
            let state = SaveState.error;
            let type = "Type inconnu";
            if (save.type !== null && form_schema_6.Forms.formExists(save.type)) {
                const form = form_schema_6.Forms.getForm(save.type);
                type = form.name;
                if (form.id_field) {
                    // Si un champ existe pour ce formulaire
                    id = save.fields[form.id_field] || json[0].name;
                }
            }
            // Recherche si il y a déjà eu synchronisation
            try {
                const present = yield SyncManager_5.SyncManager.has(id_without_json);
                if (present) {
                    state = SaveState.waiting;
                }
                else {
                    state = SaveState.saved;
                }
            }
            catch (e) {
                state = SaveState.error;
            }
            // Ajoute de l'icône indiquant si l'élément a été synchronisé
            let sync_str = `<i class="material-icons red-text">sync_problem</i>`;
            if (state === SaveState.saved) {
                sync_str = `<i class="material-icons green-text">sync</i>`;
            }
            else if (state === SaveState.waiting) {
                sync_str = `<i class="material-icons grey-text">sync_disabled</i>`;
            }
            const sync_btn = helpers_11.convertHTMLToElement(`<a href="#!" class="sync-icon">${sync_str}</a>`);
            container.innerHTML = "";
            container.appendChild(sync_btn);
            // Ajoute le texte de l'élément
            container.insertAdjacentHTML('beforeend', `
        <div class="left">
            [${type}] ${id} <br> 
            Modifié le ${helpers_11.formatDate(new Date(json[0].lastModified), true)}
        </div>`);
            // Ajout des actions de l'élément
            //// ACTION 1: Modifier
            const modify_element = () => {
                editAForm(json[1], json[0].name.split(/\.json$/)[0]);
            };
            const delete_element = () => {
                modalDeleteForm(json[0].name);
            };
            let sync_element = null;
            if (state !== SaveState.saved) {
                sync_element = () => {
                    // On fait tourner le bouton
                    const sync_icon = document.querySelector(`div[data-formid="${id_without_json}"] .sync-icon i`);
                    if (sync_icon) {
                        const icon = sync_icon.innerText;
                        const classes = sync_icon.className;
                        sync_icon.innerText = "sync";
                        sync_icon.className = "material-icons grey-text turn-anim";
                        SyncManager_5.SyncManager.sync(false, false, undefined, [id_without_json])
                            .then(() => {
                            // La synchro a réussi
                            sync_icon.className = "material-icons green-text";
                        })
                            .catch(() => {
                            helpers_11.showToast("La synchronisation a échoué");
                            // La synchronisation a échoué
                            sync_icon.className = "material-icons red-text";
                            sync_icon.innerText = "sync_problem";
                        });
                    }
                    else {
                        console.log("L'élément a disparu");
                    }
                };
            }
            // Définit l'événement de clic sur le formulaire
            selector.addEventListener('click', function () {
                const list = ["Modifier"];
                if (sync_element) {
                    list.push("Synchroniser");
                }
                list.push("Supprimer");
                helpers_11.askModalList(list)
                    .then(index => {
                    if (index === 0) {
                        modify_element();
                    }
                    else if (sync_element && index === 1) {
                        sync_element();
                    }
                    else {
                        delete_element();
                    }
                })
                    .catch(() => { });
            });
            // Clear le float
            container.insertAdjacentHTML('beforeend', "<div class='clearb'></div>");
            // Ajoute les éléments dans le conteneur final
            selector.appendChild(container);
            ph.appendChild(selector);
        });
    }
    function readAllFilesOfDirectory(dirName) {
        const dirreader = new Promise(function (resolve, reject) {
            helpers_11.getDir(function (dirEntry) {
                // Lecture de tous les fichiers du répertoire
                const reader = dirEntry.createReader();
                reader.readEntries(function (entries) {
                    const promises = [];
                    for (const entry of entries) {
                        promises.push(new Promise(function (resolve, reject) {
                            entry.file(function (file) {
                                const reader = new FileReader();
                                console.log(file);
                                reader.onloadend = function () {
                                    try {
                                        resolve([file, JSON.parse(this.result)]);
                                    }
                                    catch (e) {
                                        console.log("JSON mal formé:", this.result);
                                        resolve([file, { fields: {}, type: "", location: "", owner: "", metadata: {} }]);
                                    }
                                };
                                reader.onerror = function (err) {
                                    reject(err);
                                };
                                reader.readAsText(file);
                            }, function (err) {
                                reject(err);
                            });
                        }));
                    }
                    // Renvoie le tableau de promesses lancées
                    resolve(promises);
                }, function (err) {
                    reject(err);
                    console.log(err);
                });
            }, dirName, function (err) {
                reject(err);
            });
        });
        // @ts-ignore
        return dirreader;
    }
    function modalDeleteForm(id) {
        helpers_11.askModal("Supprimer ce formulaire ?", "Vous ne pourrez pas le restaurer ultérieurement.", "Supprimer", "Annuler")
            .then(() => {
            // L'utilisateur demande la suppression
            deleteForm(id)
                .then(function () {
                helpers_11.showToast("Entrée supprimée.");
                PageManager_5.PageManager.reload();
            })
                .catch(function (err) {
                helpers_11.showToast("Impossible de supprimer: " + err);
            });
        })
            .catch(() => {
            // Annulation
        });
    }
    function deleteForm(id) {
        if (id.match(/\.json$/)) {
            id = id.substring(0, id.length - 5);
        }
        SyncManager_5.SyncManager.remove(id);
        return new Promise(function (resolve, reject) {
            if (id) {
                // Supprime toutes les données (images, sons...) liées au formulaire
                helpers_11.rmrfPromise('form_data/' + id, true).catch(err => err).then(function () {
                    helpers_11.getDir(function (dirEntry) {
                        dirEntry.getFile(id + '.json', { create: false }, function (fileEntry) {
                            helpers_11.removeFilePromise(fileEntry).then(function () {
                                resolve();
                            }).catch(reject);
                        }, function () {
                            console.log("Impossible de supprimer");
                            reject("Impossible de supprimer");
                        });
                    }, 'forms', reject);
                });
            }
            else {
                reject("ID invalide");
            }
        });
    }
    function initSavedForm(base) {
        const placeholder = document.createElement('ul');
        placeholder.classList.add('collection', 'no-margin-top');
        form_schema_6.Forms.onReady(function () {
            readAllFilesOfDirectory('forms').then(all_promises => Promise.all(all_promises)
                .then(function (files) {
                return __awaiter(this, void 0, void 0, function* () {
                    // Tri des fichiers; le plus récent en premier
                    files = files.sort((a, b) => b[0].lastModified - a[0].lastModified);
                    for (const f of files) {
                        yield appendFileEntry(f, placeholder);
                    }
                    base.innerHTML = "";
                    base.appendChild(placeholder);
                    /// Insère un div avec une margin pour forcer de la
                    /// place en bas, pour les boutons
                    base.insertAdjacentHTML('beforeend', "<div class='saver-collection-margin'></div>");
                    if (files.length === 0) {
                        base.innerHTML = helpers_11.displayInformalMessage("Vous n'avez aucun formulaire sauvegardé.");
                    }
                    else {
                        //// Bouton de synchronisation
                        const syncbtn = helpers_11.convertHTMLToElement(`
                            <div class="fixed-action-btn" style="margin-right: 50px;">
                                <a class="btn-floating waves-effect waves-light green">
                                    <i class="material-icons">sync</i>
                                </a>
                            </div>`);
                        syncbtn.onclick = function () {
                            helpers_11.askModal("Synchroniser ?", "Voulez-vous lancer la synchronisation des entrées maintenant ?")
                                .then(() => {
                                return SyncManager_5.SyncManager.graphicalSync();
                            })
                                .then(() => {
                                PageManager_5.PageManager.reload();
                            })
                                .catch(() => { });
                        };
                        base.appendChild(syncbtn);
                        // Bouton de suppression globale
                        const delete_btn = helpers_11.convertHTMLToElement(`
                            <div class="fixed-action-btn">
                                <a class="btn-floating waves-effect waves-light red">
                                    <i class="material-icons">delete_sweep</i>
                                </a>
                            </div>`);
                        delete_btn.addEventListener('click', () => {
                            helpers_11.askModal("Tout supprimer ?", "Tous les formulaires enregistrés, même possiblement non synchronisés, seront supprimés.")
                                .then(() => {
                                setTimeout(function () {
                                    // Attend que le modal précédent se ferme
                                    helpers_11.askModal("Êtes-vous sûr-e ?", "La suppression est irréversible.", "Annuler", "Supprimer")
                                        .then(() => {
                                        // Annulation
                                    })
                                        .catch(() => {
                                        deleteAll();
                                    });
                                }, 150);
                            })
                                .catch(() => { });
                        });
                        base.insertAdjacentElement('beforeend', delete_btn);
                    }
                });
            })).catch(function (err) {
                logger_5.Logger.error("Impossible de charger les fichiers", err.message, err.stack);
                base.innerHTML = helpers_11.displayErrorMessage("Erreur", "Impossible de charger les fichiers. (" + err.message + ")");
            });
        });
    }
    exports.initSavedForm = initSavedForm;
});
define("PageManager", ["require", "exports", "helpers", "form", "settings_page", "saved_forms", "home", "logger"], function (require, exports, helpers_12, form_1, settings_page_1, saved_forms_1, home_2, logger_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SIDENAV_OBJ = null;
    var AppPageName;
    (function (AppPageName) {
        AppPageName["form"] = "form";
        AppPageName["settings"] = "settings";
        AppPageName["saved"] = "saved";
        AppPageName["home"] = "home";
    })(AppPageName = exports.AppPageName || (exports.AppPageName = {}));
    exports.PageManager = new class {
        constructor() {
            this.lock_return_button = false;
            /**
             * Déclaration des pages possibles
             * Chaque clé de AppPages doit être une possibilité de AppPageName
             */
            this.AppPages = {
                home: {
                    name: "Tableau de bord",
                    callback: home_2.initHomePage,
                    reload_on_restore: true
                },
                form: {
                    name: "Nouvelle entrée",
                    callback: form_1.initFormPage,
                    ask_change: true,
                    reload_on_restore: false
                },
                saved: {
                    name: "Entrées",
                    callback: saved_forms_1.initSavedForm,
                    reload_on_restore: true
                },
                settings: {
                    name: "Paramètres",
                    callback: settings_page_1.initSettingsPage,
                    reload_on_restore: false
                }
            };
            this.pages_holder = [];
            // Génération du sidenav
            const sidenav = document.getElementById('__sidenav_base_menu');
            // Ajout de la bannière
            sidenav.insertAdjacentHTML('beforeend', `<li>
            <div class="user-view">
                <div class="background">
                <img src="img/sidenav_background.jpg">
                </div>
                <a href="#!"><img class="circle" src="img/logo.png"></a>
                <a href="#!"><span class="white-text email">${home_2.APP_NAME}</span></a>
            </div>
        </li>`);
            // Ajoute chaque page au menu
            for (const page in this.AppPages) {
                const li = document.createElement('li');
                li.id = "__sidenav_base_element_" + page;
                li.onclick = () => {
                    exports.PageManager.pushPage(this.AppPages[page]);
                };
                const link = document.createElement('a');
                link.href = "#!";
                link.innerText = this.AppPages[page].name;
                li.appendChild(link);
                sidenav.appendChild(li);
            }
            // Initialise le sidenav
            const elem = document.querySelector('.sidenav');
            exports.SIDENAV_OBJ = M.Sidenav.init(elem, {});
        }
        updateReturnBtn() {
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
        reload(additionnals, reset_scroll = false) {
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
        changePage(page, delete_paused = true, force_name, additionnals, reset_scroll = true) {
            // Tente de charger la page
            try {
                let pagename = "";
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
                const base = helpers_12.getBase();
                base.innerHTML = helpers_12.getPreloader("Chargement");
                if (window.history) {
                    window.history.pushState({}, "", "?" + pagename);
                }
                // Si on a demandé à fermer le sidenav, on le ferme
                if (!page.not_sidenav_close) {
                    exports.SIDENAV_OBJ.close();
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
            }
            catch (e) {
                logger_6.Logger.error("Erreur lors du changement de page", e);
                return Promise.reject(e);
            }
        }
        cleanWaitingPages() {
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
        pushPage(page, force_name, additionnals) {
            if (typeof page === 'string' && !this.pageExists(page)) {
                throw new ReferenceError("Page does not exists");
            }
            // Si il y a plus de 10 pages dans la pile, clean
            this.cleanWaitingPages();
            // Récupère le contenu actuel du bloc mère
            const actual_base = helpers_12.getBase();
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
        popPage() {
            if (this.pages_holder.length === 0) {
                this.changePage(AppPageName.home);
                return;
            }
            // Récupère la dernière page poussée dans le tableau
            const last_page = this.pages_holder.pop();
            // Supprime le main actuel
            const main = helpers_12.getBase();
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
        goBack(force_asking = false) {
            if (this.lock_return_button) {
                return;
            }
            const stepBack = () => {
                // Ferme le modal possiblement ouvert
                try {
                    helpers_12.getModalInstance().close();
                }
                catch (e) { }
                try {
                    helpers_12.getBottomModalInstance().close();
                }
                catch (e) { }
                if (this.isPageWaiting()) {
                    this.popPage();
                }
                else {
                    // @ts-ignore this.changePage(AppPageName.home);
                    navigator.app.exitApp();
                }
            };
            if (this.should_wait || force_asking) {
                helpers_12.askModal("Aller à la page précédente ?", "Les modifications sur la page actuelle seront perdues.", "Retour", "Annuler")
                    .then(stepBack)
                    .catch(() => { });
            }
            else {
                stepBack();
            }
        }
        get should_wait() {
            return this._should_wait;
        }
        set should_wait(v) {
            this._should_wait = v;
        }
        pageExists(name) {
            return name in this.AppPages;
        }
        isPageWaiting() {
            return this.pages_holder.length > 0;
        }
    };
    function cleanElement(e) {
        let n;
        while (n = e.firstChild) {
            e.removeChild(n);
        }
    }
});
// Lance main.ts
require(['main']);
