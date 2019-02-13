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
    <center style="margin-top: 35vh;">
        ${PRELOADER}
    </center>
    <center class="flow-text" style="margin-top: 10px">${text}</center>
    `;
}

/**
 * Génère un spinner adapté à un modal avec un message d'attente
 * @param text Texte à insérer comme message de chargement
 * @returns string HTML à insérer dans la racine d'un modal
 */
export function getModalPreloader(text: string, footer?: string) : string {
    return `<div class="modal-content">
    <center>
        ${SMALL_PRELOADER}
    </center>
    <center class="flow-text pre-wrapper" style="margin-top: 10px">${text}</center>
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

// @ts-ignore 
// Met le bon répertoire dans FOLDER. Si le stockage interne/sd n'est pas monté,
// utilise le répertoire data (partition /data) de Android
let FOLDER = cordova.file.externalDataDirectory || cordova.file.dataDirectory;

/**
 * Change le répertoire actif en fonction de la plateforme et l'insère dans FOLDER.
 * Fonction appelée automatiquement au démarrage de l'application dans main.initApp()
 */
export function changeDir() {
    // @ts-ignore
    if (device.platform === "browser") {
        FOLDER = "cdvfile://localhost/temporary/";
    }
    // @ts-ignore
    else if (device.platform === "iOS") {
        // @ts-ignore
        FOLDER = cordova.file.dataDirectory;
    }
}

let DIR_ENTRY = null;
export function readFromFile(fileName: string, callback: Function, callbackIfFailed?: Function) {
    // @ts-ignore
    const pathToFile = FOLDER + fileName;
    // @ts-ignore
    window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
        fileEntry.file(function (file) {
            const reader = new FileReader();

            reader.onloadend = function (e) {
                callback(this.result);
            };

            reader.readAsText(file);
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
 * Appelle le callback avec l'entrée de répertoire voulu par le chemin dirName précisé.
 * Sans dirName, renvoie la racine du système de fichiers.
 * @param callback Function(dirEntry) => void
 * @param dirName string
 * @param onError Function(error) => void
 */
export function getDir(callback: (dirEntry) => void, dirName: string = "", onError?) {
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

/**
 * Écrit dans le fichier fileName situé dans le dossier dirName le contenu du Blob blob.
 * Après écriture, appelle callback si réussi, onFailure si échec dans toute opération
 * @param dirName string
 * @param fileName string
 * @param blob Blob
 * @param callback Function() => void
 * @param onFailure Function(error) => void | Généralement, error est une DOMException
 */
export function writeFile(dirName: string, fileName: string, blob: Blob, callback?, onFailure?) {
    getDir(function(dirEntry) {
        dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
            write(fileEntry, blob).then(function(){
                if (callback) {
                    callback();
                }
            }).catch(error => { if (onFailure) onFailure(error); });
        }, function(err) { console.log("Error in writing file", err.message); if (onFailure) { onFailure(err); } });
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

/**
 * Crée un dossier name dans la racine du système de fichiers.
 * Si name vaut "dir1/dir2", le dossier "dir2" sera créé si et uniquement si "dir1" existe.
 * Si réussi, appelle onSuccess avec le dirEntry du dossier créé.
 * Si échec, appelle onError avec l'erreur
 * @param name string
 * @param onSuccess Function(dirEntry) => void
 * @param onError Function(error: DOMException) => void
 */
export function createDir(name: string, onSuccess?: Function, onError?: Function) {
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
    // @ts-ignore
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
    // @ts-ignore
    return geolib.getDistance(
        {latitude: coords1.latitude, longitude: coords1.longitude},
        {latitude: coords2.latitude, longitude: coords2.longitude}
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

export function blobToBase64(blob) : Promise<string> {
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

export function base64ToBlob(str: string) : Promise<Blob> {
    return fetch(str).then(res => res.blob());
}
