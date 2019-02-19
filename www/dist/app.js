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
     * @returns Promise<void> Promesse se résolvant quand l'utilisateur approuve, se rompant si l'utilisateur refuse.
     */
    function askModal(title, question, text_yes = "Oui", text_no = "Non") {
        const modal = getBottomModal();
        const instance = initBottomModal({ dismissible: false });
        modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">${title}</h5>
        <p class="flow-text">${question}</p>
    </div>
    <div class="modal-footer">
        <a href="#!" id="__question_no" class="btn-flat green-text modal-close left">${text_no}</a>
        <a href="#!" id="__question_yes" class="btn-flat red-text modal-close right">${text_yes}</a>
        <div class="clearb"></div>
    </div>
    `;
        instance.open();
        return new Promise(function (resolve, reject) {
            PageManager_1.PageManager.lock_return_button = true;
            document.getElementById('__question_yes').addEventListener('click', () => {
                PageManager_1.PageManager.lock_return_button = false;
                resolve();
            });
            document.getElementById('__question_no').addEventListener('click', () => {
                PageManager_1.PageManager.lock_return_button = false;
                reject();
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
});
define("vocal_recognition", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // options de la reconnaissance vocale
    const options = {
        language: "fr-FR",
        prompt: "Parlez maintenant"
    };
    function prompt(prompt_text = "Parlez maintenant") {
        return new Promise(function (resolve, reject) {
            options.prompt = prompt_text;
            // @ts-ignore
            if (window.plugins && window.plugins.speechRecognition) {
                // @ts-ignore
                window.plugins.speechRecognition.startListening(function (matches) {
                    // Le premier match est toujours le meilleur
                    if (matches.length > 0) {
                        resolve(matches[0]);
                    }
                    else {
                        // La reconnaissance a échoué
                        reject();
                    }
                }, function (error) {
                    // Impossible de reconnaître
                    reject();
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
define("audio_listener", ["require", "exports", "helpers", "logger"], function (require, exports, helpers_2, logger_1) {
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
                input.dataset.duration = ((blobSize / 256000) * 8).toString();
                // Met à jour le bouton
                const duration = (blobSize / 256000) * 8;
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
        };
        function startRecording() {
            btn_start.classList.add('hide');
            player.innerHTML = `<p class='flow-text center'>
                Initialisation...
            </p>`;
            // @ts-ignore MicRecorder, credit to https://github.com/closeio/mic-recorder-to-mp3
            recorder = new MicRecorder({
                bitRate: 256
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
                .getMp3().then(([buffer, blob]) => {
                blobSize = blob.size;
                helpers_2.blobToBase64(blob).then(function (base64) {
                    audioContent = base64;
                    btn_confirm.classList.remove('hide');
                    player.innerHTML = `<figure>
                        <figcaption>Enregistrement</figcaption>
                        <audio controls src="${base64}"></audio>
                    </figure>`;
                    btn_start.classList.remove('hide');
                });
            }).catch((e) => {
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
define("SyncManager", ["require", "exports", "logger", "localforage", "main", "helpers", "user_manager", "fetch_timeout"], function (require, exports, logger_2, localforage_1, main_1, helpers_3, user_manager_1, fetch_timeout_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    localforage_1 = __importDefault(localforage_1);
    fetch_timeout_1 = __importDefault(fetch_timeout_1);
    // en millisecondes
    const MAX_TIMEOUT_FOR_FORM = 20000;
    const MAX_TIMEOUT_FOR_METADATA = 180000;
    // Nombre de formulaires à envoyer en même temps
    // Attention, 1 formulaire correspond au JSON + ses possibles fichiers attachés.
    const PROMISE_BY_SYNC_STEP = 10;
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
    };
    exports.SyncManager = new class {
        constructor() {
            this.in_sync = false;
            this.list = SyncList;
        }
        init() {
            this.list.init();
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
                    d.append("access_token", user_manager_1.UserManager.token);
                    return fetch_timeout_1.default(main_1.API_URL + "forms/send.json", {
                        method: "POST",
                        body: d
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
                            promises.push(new Promise((res, rej) => {
                                helpers_3.readFile(file, true)
                                    .then(base64 => {
                                    base64 = base64.split(',')[1];
                                    const d = new FormData();
                                    d.append("id", id);
                                    d.append("type", data.type);
                                    d.append("filename", basename);
                                    d.append("data", base64);
                                    d.append("access_token", user_manager_1.UserManager.token);
                                    return fetch_timeout_1.default(main_1.API_URL + "forms/metadata_send.json", {
                                        method: "POST",
                                        body: d
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
                                        M.toast({ html: "Impossible d'envoyer " + basename + "." });
                                        rej({ code: "metadata_send", error });
                                    });
                                })
                                    .catch(res);
                            }));
                        }
                        Promise.all(promises)
                            .then(values => {
                            resolve();
                        })
                            .catch(err => {
                            reject(err);
                        });
                    }
                    else {
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
                M.toast({ html: "Synchronisation réussie" });
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
        }
        /**
         * Synchronise les formulaires courants avec la BDD distante
         * @param force_all Forcer l'envoi de tous les formulaires
         * @param clear_cache Supprimer le cache actuel d'envoi et forcer tout l'envoi (ne fonctionne qu'avec force_all)
         * @param text_element Élément HTML dans lequel écrire l'avancement
         */
        sync(force_all = false, clear_cache = false, text_element) {
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
    };
});
define("main", ["require", "exports", "PageManager", "helpers", "logger", "audio_listener", "form_schema", "vocal_recognition", "user_manager", "SyncManager"], function (require, exports, PageManager_2, helpers_4, logger_3, audio_listener_1, form_schema_1, vocal_recognition_1, user_manager_2, SyncManager_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SIDENAV_OBJ = null;
    exports.MAX_LIEUX_AFFICHES = 20; /** Maximum de lieux affichés dans le modal de sélection de lieu */
    exports.API_URL = "https://projet.alkihis.fr/"; /** MUST HAVE TRAILING SLASH */
    exports.ENABLE_FORM_DOWNLOAD = true; /** Active le téléchargement automatique des schémas de formulaire au démarrage */
    exports.ID_COMPLEXITY = 20; /** Nombre de caractères aléatoires dans un ID automatique */
    exports.APP_VERSION = 0.4;
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
        // Si c'est un navigateur, on est sur cdvfile://localhost/persistent
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
        // Initialise le sidenav
        const elem = document.querySelector('.sidenav');
        exports.SIDENAV_OBJ = M.Sidenav.init(elem, {});
        // Bind des éléments du sidenav
        // Home
        document.getElementById('nav_home').onclick = function () {
            PageManager_2.PageManager.pushPage(PageManager_2.AppPageName.home);
        };
        // Form
        document.getElementById('nav_form_new').onclick = function () {
            PageManager_2.PageManager.pushPage(PageManager_2.AppPageName.form);
        };
        // Saved
        document.getElementById('nav_form_saved').onclick = function () {
            PageManager_2.PageManager.pushPage(PageManager_2.AppPageName.saved);
        };
        // Settigns
        document.getElementById('nav_settings').onclick = function () {
            PageManager_2.PageManager.pushPage(PageManager_2.AppPageName.settings);
        };
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
            if (href && PageManager_2.PageManager.pageExists(href)) {
                PageManager_2.PageManager.changePage(href);
            }
            else {
                PageManager_2.PageManager.changePage(PageManager_2.AppPageName.home);
            }
        });
    }
    function initDebug() {
        window["DEBUG"] = {
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
            recorder: function () {
                audio_listener_1.newModalRecord(document.createElement('button'), document.createElement('input'), {
                    name: "__test__",
                    label: "Test",
                    type: form_schema_1.FormEntityType.audio
                });
            },
            dateFormatter: helpers_4.dateFormatter,
            prompt: vocal_recognition_1.prompt,
            createNewUser: user_manager_2.createNewUser,
            UserManager: user_manager_2.UserManager,
            SyncManager: SyncManager_1.SyncManager
        };
    }
    document.addEventListener('deviceready', initApp, false);
});
define("user_manager", ["require", "exports", "main", "helpers"], function (require, exports, main_2, helpers_5) {
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
                fetch(main_2.API_URL + "users/login.json?username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password))
                    .then((response) => {
                    return response.json();
                })
                    .then((json) => {
                    if (json.error_code)
                        throw json.error_code;
                    this.logSomeone(username, json.access_token);
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
                fetch(main_2.API_URL + "users/create.json", {
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
                M.toast({ html: "Le nom ne peut pas être vide." });
                return;
            }
            if (!psw) {
                M.toast({ html: "Le mot de passe ne peut pas être vide." });
                return;
            }
            if (psw !== psw_r) {
                M.toast({ html: "Mot de passe et confirmation doivent correspondre." });
                return;
            }
            if (!psw_a) {
                M.toast({ html: "Le mot de passe administrateur est nécessaire." });
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
                M.toast({ html: "Utilisateur créé avec succès." });
                instance.close();
            }).catch(function (error) {
                console.log(error);
                if (typeof error === 'number') {
                    if (error === 6) {
                        M.toast({ html: "Le mot de passe administrateur est invalide." });
                    }
                    else if (error === 12) {
                        M.toast({ html: "Cet utilisateur existe déjà." });
                    }
                    else {
                        M.toast({ html: "Une erreur inconnue est survenue." });
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
                    M.toast({ html: "Le nom ne peut pas être vide." });
                    return;
                }
                if (!psw) {
                    M.toast({ html: "Le mot de passe ne peut pas être vide." });
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
                    M.toast({ html: "Vous avez été connecté-e avec succès." });
                    instance.close();
                    // RESOLUTION DE LA PROMESSE
                    resolve();
                }).catch(function (error) {
                    if (typeof error === 'number') {
                        if (error === 10) {
                            M.toast({ html: "Cet utilisateur n'existe pas." });
                        }
                        else if (error === 11) {
                            M.toast({ html: "Votre mot de passe est invalide." });
                        }
                        else {
                            M.toast({ html: "Une erreur inconnue est survenue." });
                        }
                    }
                    else {
                        M.toast({ html: error.message || JSON.stringify(error) });
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
define("form_schema", ["require", "exports", "helpers", "user_manager", "main", "fetch_timeout"], function (require, exports, helpers_6, user_manager_3, main_3, fetch_timeout_2) {
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
            this.DEAD_FORM_SCHEMA = { name: null, fields: [], locations: [] };
            this.FORM_LOCATION = 'loaded_forms.json';
            if (localStorage.getItem('default_form_key')) {
                this._default_form_key = localStorage.getItem('default_form_key');
            }
            // Sauvegarde dans le localStorage quoiqu'il arrive
            this.default_form_key = this._default_form_key;
            /** call init() after constructor() ! */
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
                    helpers_6.writeFile('', this.FORM_LOCATION, new Blob([JSON.stringify(this.available_forms)]));
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
                            M.toast({ html: "Impossible de charger les formulaires." + " " + cordova.file.applicationDirectory + 'www/assets/form.json' });
                        });
                    });
                });
            };
            const init_text = document.getElementById('__init_text_center');
            if (init_text) {
                init_text.innerText = "Mise à jour des formulaires";
            }
            // @ts-ignore
            if ((main_3.ENABLE_FORM_DOWNLOAD || crash_if_not_form_download) && navigator.connection.type !== Connection.NONE && user_manager_3.UserManager.logged) {
                // On tente d'actualiser les formulaires disponibles
                // On attend au max 20 secondes
                return fetch_timeout_2.default(main_3.API_URL + "forms/available.json?access_token=" + user_manager_3.UserManager.token, undefined, 20000)
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
    };
});
define("form", ["require", "exports", "vocal_recognition", "form_schema", "helpers", "main", "PageManager", "logger", "audio_listener", "user_manager", "SyncManager"], function (require, exports, vocal_recognition_2, form_schema_2, helpers_7, main_4, PageManager_3, logger_4, audio_listener_2, user_manager_4, SyncManager_2) {
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
    /**
     * Classe le champ comme valide.
     * @param e Element input
     */
    function setValid(e) {
        e.classList.add('valid');
        e.classList.remove('invalid');
        e.dataset.valid = "1";
        showHideTip(e, false);
    }
    /**
     * Classe le champ comme invalide.
     * @param e Element input
     */
    function setInvalid(e) {
        if (e.value === "" && !e.required) {
            setValid(e);
            return;
        }
        e.classList.add('invalid');
        e.classList.remove('valid');
        e.dataset.valid = "0";
        showHideTip(e, true);
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
            location.value = location.dataset.reallocation = filled_form.location;
            // Recherche la vraie localisation (textuelle) dans Form.location
            const label_location = current_form.locations.find(e => e.name === filled_form.location);
            if (label_location) {
                location.value = label_location.label;
            }
            else {
                M.toast({ html: "Attention: La localisation de cette entrée n'existe plus dans le schéma du formulaire." });
            }
        }
        loc_wrapper.appendChild(location);
        const loc_title = document.createElement('h4');
        loc_title.innerText = "Lieu";
        placeh.appendChild(loc_title);
        placeh.appendChild(loc_wrapper);
        // Fin champ de lieu, itération sur champs
        for (const ele of current_form.fields) {
            let element_to_add = null;
            if (ele.type === form_schema_2.FormEntityType.divider) {
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
            else if (ele.type === form_schema_2.FormEntityType.integer || ele.type === form_schema_2.FormEntityType.float) {
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
                if (ele.type === form_schema_2.FormEntityType.float && ele.float_precision) {
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
                if (ele.type === form_schema_2.FormEntityType.float && ele.float_precision) {
                    contraintes.push(["precision", ele.float_precision]);
                }
                contraintes.push(['type', ele.type === form_schema_2.FormEntityType.float ? 'float' : 'int']);
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
                        else if (ele.type === form_schema_2.FormEntityType.float) {
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
                        vocal_recognition_2.prompt().then(function (value) {
                            value = value.replace(/ /g, '').replace(/,/g, '.').replace(/-/g, '.');
                            if (!isNaN(Number(value))) {
                                htmle.value = value;
                                num_verif.call(htmle);
                                M.updateTextFields();
                            }
                            else {
                                M.toast({ html: "Nombre incorrect reconnu." });
                            }
                        });
                    });
                    real_wrapper.appendChild(mic_btn);
                }
                element_to_add = real_wrapper;
            }
            else if (ele.type === form_schema_2.FormEntityType.string || ele.type === form_schema_2.FormEntityType.bigstring) {
                const real_wrapper = document.createElement('div');
                const wrapper = createInputWrapper();
                let htmle;
                if (ele.type === form_schema_2.FormEntityType.string) {
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
                        vocal_recognition_2.prompt().then(function (value) {
                            if (ele.remove_whitespaces) {
                                value = value.replace(/ /g, '').replace(/à/iug, 'a');
                            }
                            if (erase) {
                                htmle.value = value;
                            }
                            else {
                                htmle.value += value;
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
            else if (ele.type === form_schema_2.FormEntityType.select) {
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
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_2.FormEntityType.checkbox) {
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
            else if (ele.type === form_schema_2.FormEntityType.datetime) {
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
            else if (ele.type === form_schema_2.FormEntityType.file) {
                if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                    // L'input file est déjà présent dans le formulaire
                    // on affiche une miniature
                    const img_miniature = document.createElement('div');
                    img_miniature.classList.add('image-form-wrapper');
                    const img_balise = document.createElement('img');
                    img_balise.classList.add('img-form-element');
                    helpers_7.createImgSrc(filled_form.fields[ele.name], img_balise);
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
            else if (ele.type === form_schema_2.FormEntityType.audio) {
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
                    helpers_7.readFromFile(filled_form.fields[ele.name], function (base64) {
                        button.classList.remove('blue');
                        button.classList.add('green');
                        real_input.value = base64;
                        const duration = ((base64.length * 0.7) / 256000) * 8;
                        button.innerText = "Enregistrement (" + duration.toFixed(0) + "s" + ")";
                    }, function (fail) {
                        console.log("Impossible de charger le fichier", fail);
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
            else if (ele.type === form_schema_2.FormEntityType.slider) {
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
    function beginFormSave(type, force_name, form_save) {
        // Ouverture du modal de verification
        const modal = helpers_7.getModal();
        const instance = helpers_7.initModal({ dismissible: false }, helpers_7.getModalPreloader("La vérification a probablement planté.<br>Merci de patienter quand même, on sait jamais.", `<div class="modal-footer">
            <a href="#!" id="cancel_verif" class="btn-flat red-text">Annuler</a>
        </div>`));
        modal.classList.add('modal-fixed-footer');
        instance.open();
        // Recherche des éléments à vérifier
        const elements_failed = [];
        const elements_warn = [];
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
            if (element.required && !element.value) {
                elements_failed.push([name, "Champ requis", element]);
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
                                    str += "Le nombre n'a pas la précision requise (" + contraintes.precision + "). ";
                                }
                            }
                            else {
                                //Il n'y a pas de . dans le nombre
                                fail = true;
                                str += "Le nombre n'est pas un flottant. ";
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
                modal.innerHTML = helpers_7.getModalPreloader("Sauvegarde en cours");
                modal.classList.remove('modal-fixed-footer');
                const unique_id = force_name || helpers_7.generateId(main_4.ID_COMPLEXITY);
                PageManager_3.PageManager.lock_return_button = true;
                saveForm(type, unique_id, form_save)
                    .then((form_values) => {
                    SyncManager_2.SyncManager.add(unique_id, form_values);
                    if (form_save) {
                        instance.close();
                        M.toast({ html: "Écriture du formulaire et de ses données réussie." });
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
    }
    /**
     * Sauvegarde le formulaire actuel dans un fichier .json
     *  @param type
     *  @param nom ID du formulaire
     */
    function saveForm(type, name, form_save) {
        const form_values = {
            fields: {},
            type,
            location: document.getElementById('__location__id').dataset.reallocation,
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
            helpers_7.writeFile('form_data/' + name, filename, blob, function () {
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
                        helpers_7.removeFileByName(dir_name, file_name);
                    }
                }
                // Résout la promise
                resolve();
            }, function (error) {
                // Erreur d'écriture du fichier => on rejette
                M.toast({ html: "Un fichier n'a pas pu être sauvegardée. Vérifiez votre espace de stockage." });
                reject(error);
            });
        }
        return helpers_7.getDirP('form_data')
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
                        const filename = helpers_7.generateId(main_4.ID_COMPLEXITY) + '.mp3';
                        helpers_7.urlToBlob(file).then(function (blob) {
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
                    helpers_7.writeFile('forms', name + '.json', new Blob([JSON.stringify(form_values)]), function () {
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
            form_schema_2.Forms.onReady(function (available, current) {
                if (form_schema_2.Forms.current_key === null) {
                    // Aucun formulaire n'est chargé !
                    base.innerHTML = helpers_7.displayErrorMessage("Aucun formulaire n'est chargé.", "Sélectionnez le formulaire à utiliser dans les paramètres.");
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
            base.innerHTML = base.innerHTML = helpers_7.displayErrorMessage("Vous devez vous connecter pour saisir une nouvelle entrée.", "Connectez-vous dans les paramètres.");
            PageManager_3.PageManager.should_wait = false;
            return;
        }
        const base_block = document.createElement('div');
        base_block.classList.add('row', 'container');
        const placeh = document.createElement('form');
        placeh.classList.add('col', 's12');
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
        // Lance le sélecteur de localisation uniquement si on est pas en mode édition
        if (!edition_mode) {
            callLocationSelector(current_form);
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
        const current_form_key = form_schema_2.Forms.current_key;
        btn.addEventListener('click', function () {
            if (edition_mode) {
                beginFormSave(edition_mode.save.type, edition_mode.name, edition_mode.save);
            }
            else {
                try {
                    beginFormSave(current_form_key);
                }
                catch (e) {
                    logger_4.Logger.error(JSON.stringify(e));
                }
            }
        });
        base_block.appendChild(btn);
    }
    exports.loadFormPage = loadFormPage;
    function cancelGeoLocModal() {
        // On veut fermer; Deux possibilités.
        // Si le champ lieu est déjà défini et rempli, on ferme juste le modal
        if (document.getElementById("__location__id").value.trim() !== "") {
            // On ferme juste le modal
        }
        else {
            // Sinon, on ramène à la page précédente
            PageManager_3.PageManager.popPage();
        }
        helpers_7.getModalInstance().close();
        helpers_7.getModal().classList.remove('modal-fixed-footer');
    }
    function callLocationSelector(current_form) {
        // Obtient l'élément HTML du modal
        const modal = helpers_7.getModal();
        const instance = helpers_7.initModal({
            dismissible: false
        });
        // Ouvre le modal et insère un chargeur
        instance.open();
        modal.innerHTML = helpers_7.getModalPreloader("Recherche de votre position...\nCeci peut prendre jusqu'à 30 secondes.", `<div class="modal-footer">
            <a href="#!" id="dontloc-footer-geoloc" class="btn-flat blue-text left">Saisie manuelle</a>
            <a href="#!" id="close-footer-geoloc" class="btn-flat red-text">Annuler</a>
            <div class="clearb"></div>
        </div>`);
        let is_loc_canceled = false;
        document.getElementById("close-footer-geoloc").onclick = function () {
            is_loc_canceled = true;
            cancelGeoLocModal();
        };
        document.getElementById('dontloc-footer-geoloc').onclick = function () {
            is_loc_canceled = true;
            locationSelector(modal, current_form.locations, false);
        };
        // Cherche la localisation et remplit le modal
        helpers_7.getLocation(function (coords) {
            if (!is_loc_canceled)
                locationSelector(modal, current_form.locations, coords);
        }, function () {
            if (!is_loc_canceled)
                locationSelector(modal, current_form.locations);
        });
    }
    function textDistance(distance) {
        const unit = (distance >= 1000 ? "km" : "m");
        const str_distance = (distance >= 1000 ? (distance / 1000).toFixed(1) : distance.toString());
        return `${str_distance} ${unit}`;
    }
    function locationSelector(modal, locations, current_location) {
        // Met le modal en modal avec footer fixé
        modal.classList.add('modal-fixed-footer');
        // Crée le contenu du modal et son footer
        const content = document.createElement('div');
        content.classList.add('modal-content');
        const footer = document.createElement('div');
        footer.classList.add('modal-footer');
        // Création de l'input qui va contenir le lieu
        const input = document.createElement('input');
        input.autocomplete = "off";
        // Sélection manuelle
        const title = document.createElement('h5');
        title.innerText = "Sélection manuelle";
        content.appendChild(title);
        // Création du champ à autocompléter
        // Conteneur
        const row = document.createElement('div');
        row.classList.add('row');
        content.appendChild(row);
        // Input field
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
        for (const lieu of locations) {
            auto_complete_data[lieu.label] = null;
        }
        // Vide le modal actuel et le remplace par le contenu et footer créés
        modal.innerHTML = "";
        modal.appendChild(content);
        // Création d'un objet label => value
        const labels_to_name = {};
        for (const lieu of locations) {
            labels_to_name[lieu.label] = lieu.name;
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
                    input.value = location;
                }
            }
        });
        // Construction de la liste de lieux si la location est trouvée
        if (current_location) {
            // Création de la fonction qui va gérer le cas où l'on appuie sur un lieu
            function clickOnLocation() {
                input.value = this.dataset.label;
                M.updateTextFields();
            }
            // Calcul de la distance entre chaque lieu et le lieu actuel
            let lieux_dispo = [];
            for (const lieu of locations) {
                lieux_dispo.push({
                    name: lieu.name,
                    label: lieu.label,
                    distance: helpers_7.calculateDistance(current_location.coords, lieu)
                });
            }
            lieux_dispo = lieux_dispo.sort((a, b) => a.distance - b.distance);
            // Titre
            const title = document.createElement('h5');
            title.innerText = "Lieux disponibles";
            content.appendChild(title);
            // Construction de la liste des lieux proches
            const collection = document.createElement('div');
            collection.classList.add('collection');
            for (let i = 0; i < lieux_dispo.length && i < main_4.MAX_LIEUX_AFFICHES; i++) {
                const elem = document.createElement('a');
                elem.href = "#!";
                elem.classList.add('collection-item');
                elem.innerHTML = `
                ${lieux_dispo[i].label}
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
                M.toast({ html: "Vous devez préciser un lieu." });
            }
            else if (input.value in labels_to_name) {
                const loc_input = document.getElementById('__location__id');
                loc_input.value = input.value;
                loc_input.dataset.reallocation = labels_to_name[input.value];
                helpers_7.getModalInstance().close();
                modal.classList.remove('modal-fixed-footer');
            }
            else {
                M.toast({ html: "Le lieu entré n'a aucune correspondance dans la base de données." });
            }
        });
        footer.appendChild(ok);
        // Création du bouton annuler
        const cancel = document.createElement('a');
        cancel.href = "#!";
        cancel.innerText = "Annuler";
        cancel.classList.add("btn-flat", "red-text", "left");
        cancel.addEventListener('click', cancelGeoLocModal);
        footer.appendChild(cancel);
        modal.appendChild(footer);
    }
});
define("settings_page", ["require", "exports", "user_manager", "form_schema", "helpers", "SyncManager", "PageManager"], function (require, exports, user_manager_5, form_schema_3, helpers_8, SyncManager_3, PageManager_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function headerText() {
        return `${user_manager_5.UserManager.logged ?
            "Vous êtes connecté-e en tant que <span class='underline'>" + user_manager_5.UserManager.username + "</span>"
            : "Vous n'êtes pas connecté-e"}.`;
    }
    function formActualisationModal() {
        const instance = helpers_8.initModal({ dismissible: false }, helpers_8.getModalPreloader("Actualisation..."));
        instance.open();
        form_schema_3.Forms.init(true)
            .then(() => {
            M.toast({ html: "Actualisation terminée." });
            instance.close();
            PageManager_4.PageManager.reload();
        })
            .catch((error) => {
            M.toast({ html: "Impossible d'actualiser les schémas." });
            instance.close();
        });
    }
    function initSettingsPage(base) {
        const connecte = user_manager_5.UserManager.logged;
        base.innerHTML = `
    <div class="container row" id="main_settings_container">
        <h4>Utilisateur</h4>
        <h5 id="settings_main_text">${headerText()}</h5>
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
                user_manager_5.loginUser().then(function () {
                    unlogUserButton();
                    header.innerHTML = headerText();
                });
            };
        }
        function unlogUserButton() {
            button.type = "button";
            button.innerHTML = "Déconnexion";
            button.classList.remove('blue');
            button.classList.add('col', 's12', 'red', 'btn', 'btn-perso', 'btn-margins');
            button.onclick = function () {
                helpers_8.askModal("Se déconnecter ?", "Vous ne pourrez pas saisir une entrée de formulaire tant que vous ne serez pas reconnecté-e.")
                    .then(function () {
                    // L'utilisateur veut se déconnecter
                    user_manager_5.UserManager.unlog();
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
        /////// PARTIE DEUX: CHOIX DU FORMULAIRE ACTUELLEMENT CHARGE
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Formulaire actif</h4>
    <p class="flow-text">
        Ce formulaire correspond à celui proposé dans la page "Nouvelle entrée".
    </p>
    `);
        const select = document.createElement('select');
        select.classList.add('material-select');
        container.appendChild(select);
        form_schema_3.Forms.onReady(function () {
            const available = [["", "Aucun"], ...form_schema_3.Forms.getAvailableForms()];
            for (const option of available) {
                const o = document.createElement('option');
                o.value = option[0];
                o.innerText = option[1];
                if (option[0] === form_schema_3.Forms.current_key || (option[0] === "" && form_schema_3.Forms.current_key === null)) {
                    o.selected = true;
                }
                select.appendChild(o);
            }
            M.FormSelect.init(select);
        });
        select.addEventListener('change', function () {
            const value = select.value || null;
            if (form_schema_3.Forms.formExists(value)) {
                form_schema_3.Forms.changeForm(value, true);
            }
        });
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    <h4>Synchronisation</h4>
    <p class="flow-text">
        Synchronisez vos entrées de formulaire avec un serveur distant.
    </p>
    `);
        const syncbtn = document.createElement('button');
        syncbtn.classList.add('col', 's12', 'blue', 'btn', 'btn-perso', 'btn-small-margins');
        syncbtn.innerHTML = "Synchroniser";
        syncbtn.onclick = function () {
            SyncManager_3.SyncManager.graphicalSync();
        };
        container.appendChild(syncbtn);
        const syncbtn2 = document.createElement('button');
        syncbtn2.classList.add('col', 's12', 'orange', 'btn', 'btn-perso', 'btn-small-margins');
        syncbtn2.innerHTML = "Tout resynchroniser";
        syncbtn2.onclick = function () {
            helpers_8.askModal("Tout synchroniser ?", "Ceci peut prendre beaucoup de temps si de nombreux éléments sont à sauvegarder. Veillez à disposer d'une bonne connexion à Internet.").then(() => {
                // L'utilisateur a dit oui
                SyncManager_3.SyncManager.graphicalSync(true);
            });
        };
        container.appendChild(syncbtn2);
        const syncbtn3 = document.createElement('button');
        syncbtn3.classList.add('col', 's12', 'red', 'btn', 'btn-perso', 'btn-small-margins');
        syncbtn3.innerHTML = "Vider cache et synchroniser";
        syncbtn3.onclick = function () {
            helpers_8.askModal("Vider cache et tout resynchroniser ?", "Vider le cache obligera à resynchroniser tout l'appareil, même si vous annulez la synchronisation qui va suivre.\
            N'utilisez cette option que si vous êtes certains de pouvoir venir à bout de l'opération.\
            Cette opération peut prendre beaucoup de temps si de nombreux éléments sont à sauvegarder. Veillez à disposer d'une bonne connexion à Internet.").then(() => {
                // L'utilisateur a dit oui
                SyncManager_3.SyncManager.graphicalSync(true, true);
            });
        };
        container.appendChild(syncbtn3);
        /// BOUTON POUR FORCER ACTUALISATION DES FORMULAIRES
        container.insertAdjacentHTML('beforeend', `
    <div class="clearb"></div>
    <div class="divider divider-margin"></div>
    `);
        const formbtn = document.createElement('button');
        formbtn.classList.add('col', 's12', 'green', 'btn', 'btn-perso', 'btn-small-margins');
        formbtn.innerHTML = "Actualiser schémas formulaire";
        formbtn.onclick = function () {
            if (user_manager_5.UserManager.logged) {
                helpers_8.askModal("Actualiser les schémas ?", "L'actualisation des schémas de formulaire récupèrera les schémas à jour depuis le serveur du LBBE.").then(() => {
                    // L'utilisateur a dit oui
                    formActualisationModal();
                });
            }
            else {
                helpers_8.informalBottomModal("Connectez-vous", "L'actualisation des schémas est uniquement possible en étant connecté.");
            }
        };
        container.appendChild(formbtn);
    }
    exports.initSettingsPage = initSettingsPage;
});
define("saved_forms", ["require", "exports", "helpers", "form_schema", "PageManager", "SyncManager", "logger"], function (require, exports, helpers_9, form_schema_4, PageManager_5, SyncManager_4, logger_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function editAForm(form, name) {
        // Vérifie que le formulaire est d'un type disponible
        if (form.type === null || !form_schema_4.Forms.formExists(form.type)) {
            M.toast({ html: "Impossible de charger ce fichier: Le type de formulaire enregistré est indisponible." });
            return;
        }
        const current_form = form_schema_4.Forms.getForm(form.type);
        PageManager_5.PageManager.pushPage(PageManager_5.AppPageName.form, "Modifier", { form: current_form, name, save: form });
    }
    function deleteAll() {
        // On veut supprimer tous les fichiers
        // Récupération de tous les fichiers de forms
        return helpers_9.getDirP('forms')
            // Récupère les entries du répertoire
            .then(helpers_9.dirEntries)
            .then(entries => {
            const promises = [];
            for (const e of entries) {
                if (e.isFile) {
                    promises.push(deleteForm(e.name));
                }
            }
            return Promise.all(promises);
        })
            .then(() => {
            return SyncManager_4.SyncManager.clear();
        })
            .then(() => {
            M.toast({ html: "Fichiers supprimés avec succès" });
            PageManager_5.PageManager.reload();
        });
    }
    function appendFileEntry(json, ph) {
        const save = json[1];
        const selector = document.createElement('li');
        selector.classList.add('collection-item');
        const container = document.createElement('div');
        let id = json[0].name;
        if (save.type !== null && form_schema_4.Forms.formExists(save.type)) {
            const id_f = form_schema_4.Forms.getForm(save.type).id_field;
            if (id_f) {
                // Si un champ existe pour ce formulaire
                id = save.fields[id_f] || json[0].name;
            }
        }
        // Ajoute le texte de l'élément
        container.innerHTML = `
        <div class="left">
            ${id} <br> 
            Modifié le ${helpers_9.formatDate(new Date(json[0].lastModified), true)}
        </div>`;
        // Ajoute le bouton de suppression
        const delete_btn = document.createElement('a');
        delete_btn.href = "#!";
        delete_btn.classList.add('secondary-content');
        const im = document.createElement('i');
        im.classList.add('material-icons', 'red-text');
        im.innerText = "delete_forever";
        delete_btn.appendChild(im);
        container.appendChild(delete_btn);
        const file_name = json[0].name;
        delete_btn.addEventListener('click', function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            modalDeleteForm(file_name);
        });
        // Clear le float
        container.insertAdjacentHTML('beforeend', "<div class='clearb'></div>");
        // Définit l'événement d'édition
        selector.addEventListener('click', function () {
            editAForm(json[1], json[0].name.split(/\.json$/)[0]);
        });
        // Ajoute les éléments dans le conteneur final
        selector.appendChild(container);
        ph.appendChild(selector);
    }
    function readAllFilesOfDirectory(dirName) {
        const dirreader = new Promise(function (resolve, reject) {
            helpers_9.getDir(function (dirEntry) {
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
        helpers_9.askModal("Supprimer ce formulaire ?", "Vous ne pourrez pas le restaurer ultérieurement.", "Supprimer", "Annuler")
            .then(() => {
            // L'utilisateur demande la suppression
            deleteForm(id)
                .then(function () {
                M.toast({ html: "Entrée supprimée." });
                PageManager_5.PageManager.reload();
            })
                .catch(function (err) {
                M.toast({ html: "Impossible de supprimer: " + err });
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
        SyncManager_4.SyncManager.remove(id);
        return new Promise(function (resolve, reject) {
            if (id) {
                // Supprime toutes les données (images, sons...) liées au formulaire
                helpers_9.rmrfPromise('form_data/' + id, true).catch(err => err).then(function () {
                    helpers_9.getDir(function (dirEntry) {
                        dirEntry.getFile(id + '.json', { create: false }, function (fileEntry) {
                            helpers_9.removeFilePromise(fileEntry).then(function () {
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
        form_schema_4.Forms.onReady(function () {
            readAllFilesOfDirectory('forms').then(all_promises => Promise.all(all_promises).then(function (files) {
                // Tri des fichiers; le plus récent en premier
                files = files.sort((a, b) => b[0].lastModified - a[0].lastModified);
                for (const f of files) {
                    appendFileEntry(f, placeholder);
                }
                base.innerHTML = "";
                base.appendChild(placeholder);
                if (files.length === 0) {
                    base.innerHTML = helpers_9.displayInformalMessage("Vous n'avez aucun formulaire sauvegardé.");
                }
                else {
                    // Bouton de suppression globale
                    const delete_btn = helpers_9.convertHTMLToElement(`
                        <div class="fixed-action-btn">
                            <a class="btn-floating btn-large waves-effect waves-light red">
                                <i class="material-icons">delete_sweep</i>
                            </a>
                        </div>`);
                    delete_btn.addEventListener('click', () => {
                        helpers_9.askModal("Tout supprimer ?", "Tous les formulaires enregistrés, même possiblement non synchronisés, seront supprimés.")
                            .then(() => {
                            setTimeout(function () {
                                // Attend que le modal précédent se ferme
                                helpers_9.askModal("Êtes-vous sûr-e ?", "La suppression est irréversible.", "Annuler", "Supprimer")
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
            }).catch(function (err) {
                throw err;
            })).catch(function (err) {
                logger_5.Logger.error("Impossible de charger les fichiers", err.message, err.stack);
                base.innerHTML = helpers_9.displayErrorMessage("Erreur", "Impossible de charger les fichiers. (" + err.message + ")");
            });
        });
    }
    exports.initSavedForm = initSavedForm;
});
define("home", ["require", "exports", "user_manager", "SyncManager", "helpers", "main"], function (require, exports, user_manager_6, SyncManager_5, helpers_10, main_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.APP_NAME = "Busy Bird";
    function initHomePage(base) {
        base.innerHTML = `
    <div class="flex-center-aligner home-top-element">
        <img src="img/logo.png" class="home-logo">
    </div>
    <div class="container relative-container">
        <span class="very-tiny-text version-text">Version ${main_5.APP_VERSION}</span>
        <p class="flow-text center">
            Bienvenue dans Busy Bird, l'application qui facilite la prise de données de terrain
            pour les biologistes.<br>
            Commencez en choisissant "Nouvelle entrée" dans le menu de côté.<br>
        </p>
        <p class="flow-text red-text">
            ${!user_manager_6.UserManager.logged ? `
                Vous n'êtes pas connecté dans l'application. Vous ne serez pas en mesure de
                saisir de nouvelles entrées sans être authentifié. Veuillez vous connecter via
                les paramètres de l'application.
            ` : ''}
        </p>
        <div id="__home_container"></div>
    </div>
    `;
        const home_container = document.getElementById('__home_container');
        // Calcul du nombre de formulaires en attente de synchronisation
        SyncManager_5.SyncManager.remainingToSync()
            .then(count => {
            if (helpers_10.hasGoodConnection()) {
                if (count > 15) {
                    home_container.innerHTML = createCardPanel(`<span class="blue-text text-darken-2">Vous avez beaucoup d'éléments à synchroniser (${count} entrées).</span><br>
                        <span class="blue-text text-darken-2">Rendez-vous dans les paramètres pour lancer la synchronisation.</span>`, "Synchronisation");
                }
                else if (count > 0) {
                    home_container.innerHTML = createCardPanel(`<span class="blue-text text-darken-2">
                            Vous avez ${count} élément${count > 1 ? 's' : ''} en attente de synchronisation.
                        </span>`, "Synchronisation");
                }
            }
            else if (count > 0) {
                home_container.innerHTML = createCardPanel(`
                    <span class="blue-text text-darken-2">Vous avez des éléments en attente de synchronisation.</span><br>
                    <span class="red-text text-darken-2">Lorsque vous retrouverez une bonne connexion Internet,</span>
                    <span class="blue-text text-darken-2">lancez une synchronisation dans les paramètres.</span>`);
            }
        });
        // Initialise les champs materialize et le select
        M.updateTextFields();
        $('select').formSelect();
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
define("PageManager", ["require", "exports", "helpers", "form", "settings_page", "saved_forms", "main", "home"], function (require, exports, helpers_11, form_1, settings_page_1, saved_forms_1, main_6, home_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
                form: {
                    name: "Nouvelle entrée",
                    callback: form_1.initFormPage,
                    ask_change: true,
                    reload_on_restore: false
                },
                settings: {
                    name: "Paramètres",
                    callback: settings_page_1.initSettingsPage,
                    reload_on_restore: false
                },
                saved: {
                    name: "Entrées",
                    callback: saved_forms_1.initSavedForm,
                    reload_on_restore: true
                },
                home: {
                    name: "Accueil",
                    callback: home_1.initHomePage,
                    reload_on_restore: false
                }
            };
            this.pages_holder = [];
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
         * @param AppPageName page
         * @param delete_paused supprime les pages sauvegardées
         */
        changePage(page, delete_paused = true, force_name, additionnals, reset_scroll = true) {
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
            const base = helpers_11.getBase();
            base.innerHTML = helpers_11.getPreloader("Chargement");
            if (window.history) {
                window.history.pushState({}, "", "?" + pagename);
            }
            // Si on a demandé à fermer le sidenav, on le ferme
            if (!page.not_sidenav_close) {
                main_6.SIDENAV_OBJ.close();
            }
            this.actual_page = page;
            this._should_wait = page.ask_change;
            this.lock_return_button = false;
            // On met le titre de la page dans la barre de navigation
            document.getElementById('nav_title').innerText = force_name || page.name;
            // On appelle la fonction de création de la page
            page.callback(base, additionnals);
            if (reset_scroll) {
                // Ramène en haut de la page
                window.scrollTo(0, 0);
            }
            this.updateReturnBtn();
        }
        cleanWaitingPages() {
            while (this.pages_holder.length >= 10) {
                this.pages_holder.shift();
            }
        }
        /**
         * Pousse une nouvelle page dans la pile de page
         * @param page
         */
        pushPage(page, force_name, additionnals) {
            if (!this.pageExists(page)) {
                throw new ReferenceError("Page does not exists");
            }
            // Si il y a plus de 10 pages dans la pile, clean
            this.cleanWaitingPages();
            // Récupère le contenu actuel du bloc mère
            const actual_base = helpers_11.getBase();
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
        popPage() {
            if (this.pages_holder.length === 0) {
                this.changePage(AppPageName.home);
                return;
            }
            // Récupère la dernière page poussée dans le tableau
            const last_page = this.pages_holder.pop();
            // Supprime le main actuel
            helpers_11.getBase().remove();
            // Met le fragment dans le DOM
            document.getElementsByTagName('main')[0].appendChild(last_page.save.firstElementChild);
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
                    helpers_11.getModalInstance().close();
                }
                catch (e) { }
                try {
                    helpers_11.getBottomModalInstance().close();
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
                helpers_11.askModal("Aller à la page précédente ?", "Les modifications sur la page actuelle seront perdues.", "Retour", "Annuler")
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
});
// Lance main.ts
require(['main']);
