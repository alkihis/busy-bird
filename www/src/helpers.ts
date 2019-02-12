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

export function getBase() : HTMLElement {
    return document.getElementById('main_block');
}

export function initModal(options: M.ModalOptions | {} = {}, content?: string) : void {
    const modal = getModal();
    
    if (content)
        modal.innerHTML = content;

    M.Modal.init(modal, options);
}

export function getModal() : HTMLElement {
    return document.getElementById('modal_placeholder');
}

export function getModalInstance() : M.Modal {
    return M.Modal.getInstance(getModal());
}

export function getPreloader(text: string) {
    return `
    <center style="margin-top: 35vh;">
        ${PRELOADER}
    </center>
    <center class="flow-text" style="margin-top: 10px">${text}</center>
    `;
}

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
  
  // generateId :: Integer -> String
export function generateId(len: number) : string {
    const arr = new Uint8Array((len || 40) / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join('');
}

export function saveDefaultForm() {
    // writeFile('schemas/', 'default.json', new Blob([JSON.stringify(current_form)], {type: "application/json"}));
}

// @ts-ignore 
// Met le bon répertoire dans FOLDER. Si le stockage interne/sd n'est pas monté,
// utilise le répertoire data (partition /data) de Android
let FOLDER = cordova.file.externalDataDirectory || cordova.file.dataDirectory;

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

export function getDir(callback, dirName?: string, onError?) {
    // par défaut, FOLDER vaut "cdvfile://localhost/persistent/"

    // @ts-ignore
    window.resolveLocalFileSystemURL(FOLDER, function (dirEntry) {    
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
    }, (err) => { 
        console.log("Persistent not available", err.message); 
        if (onError) {
            onError(err);
        }
    });
}

export function writeFile(dirName: string, fileName: string, blob: Blob, callback?, onFailure?) {
    getDir(function(dirEntry) {
        dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
            write(fileEntry, blob).then(function(){
                if (callback) {
                    callback();
                }
            });
        }, function(err) { console.log("Error in writing file", err.message); if (onFailure) { onFailure(err); } });
    }, dirName);

    function write(fileEntry, dataObj) {
        return new Promise(function (resolve, reject) {
            fileEntry.createWriter(function (fileWriter) {
                fileWriter.onwriteend = function () {
                    resolve();
                };
                fileWriter.onerror = function (e) {
                    reject(e);
                };

                fileWriter.write(dataObj);
            });
        });
    }
}

export function createDir(name: string, onSuccess?: Function, onError?: Function) {
    getDir(function(dirEntry) {
        dirEntry.getDirectory(name, { create: true }, onSuccess, onError);
    });
}

export function listDir(path = ""){
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

export function printObj(ele: HTMLElement, obj: any) : void {
    ele.insertAdjacentText('beforeend', JSON.stringify(obj, null, 2));
}

export function getLocation(onSuccess: (coords: Position) => any, onFailed?) {
    navigator.geolocation.getCurrentPosition(onSuccess,
        onFailed,
        { timeout: 30 * 1000, maximumAge: 5 * 60 * 1000 }
    );
}

export function calculateDistance(coords1: {latitude: number, longitude: number}, coords2: {latitude: number | string, longitude: number | string}) {
    // @ts-ignore
    return geolib.getDistance(
        {latitude: coords1.latitude, longitude: coords1.longitude},
        {latitude: coords2.latitude, longitude: coords2.longitude}
    );
}

export function testDistance(latitude = 45.353421, longitude = 5.836441) {
    getLocation(function(res: Position) {
        console.log(calculateDistance(res.coords, {latitude, longitude})); 
    }, function(error) {
        console.log(error);
    });
}

/**
 * Delete all files in directory, recursively, without himself
 * @param dirName? 
 */
export function rmrf(dirName?: string, callback?: () => void) : void {
    function removeEntry(entry, callback?: () => void) {
        entry.remove(function() { 
            // Fichier supprimé !
            if (callback) callback();
        }, function(err) {
            console.log("error", err);
            if (callback) callback();
        }, function() {
            console.log("file not found");
            if (callback) callback();
        });
    }

    // Récupère le dossier dirName (ou la racine du système de fichiers)
    getDir(function(dirEntry) {
        const reader = dirEntry.createReader();
        // Itère sur les entrées du répertoire via readEntries
        reader.readEntries(function (entries) {
            // Pour chaque entrée du dossier
            for (const entry of entries) {
                if (entry.isDirectory) { 
                    // Si c'est un dossier, on appelle rmrf sur celui-ci,
                    rmrf(entry.fullPath, function() {
                        // Puis on le supprime lui-même
                        removeEntry(entry, callback);
                    });
                }
                else {
                    // Si c'est un fichier, on le supprime
                    removeEntry(entry, callback);
                }
            }
        });
    }, dirName);
}
