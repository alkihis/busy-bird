import { PRELOADER } from "./main";

export function getBase() : HTMLElement {
    return document.getElementById('main_block');
}

export function getPreloader(text: string) {
    return `
    <center style="margin-top: 35vh;">
        ${PRELOADER}
    </center>
    <center class="flow-text" style="margin-top: 10px">${text}</center>
    `;
}

export function saveDefaultForm() {
    // writeFile('schemas/', 'default.json', new Blob([JSON.stringify(current_form)], {type: "application/json"}));
}

const FOLDER = "cdvfile://localhost/persistent/";
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

export function getDir(callback, dirName?: string) {
    // @ts-ignore
    window.resolveLocalFileSystemURL(FOLDER, function (dirEntry) {    
        DIR_ENTRY = dirEntry;
        if (callback) {
            callback(dirEntry);
        }
    }, function(err) { console.log("Persistent not available", err.message); });
}

export function writeFile(dirName: string, fileName: string, blob: Blob, callback?) {
    getDir(function(dirEntry) {
        dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
            write(fileEntry, blob).then(function(){
                if (callback) {
                    callback();
                }
            });
        }, function(err) { console.log("Error in writing file", err.message); });
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

export function listDir(path = FOLDER){
    // @ts-ignore
    window.resolveLocalFileSystemURL(path,
        function (fileSystem) {
            var reader = fileSystem.createReader();
            reader.readEntries(
                function (entries) {
                    console.log(entries);
                },
                function (err) {
                    console.log(err);
                }
            );
        }, function (err) {
            console.log(err);
        }
    );
}

export function getLocation(onSuccess: (coords: Position) => any, onFailed?) {
    navigator.geolocation.getCurrentPosition(onSuccess,
        onFailed,
        { timeout: 30 * 1000, maximumAge: 5 * 60 * 1000 }
    );
}

export function calculateDistance(coords1: {latitude: number, longitude: number}, coords2: {latitude: number, longitude: number}) {
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
