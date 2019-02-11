import { getDir, printObj } from "./helpers";
import { FormSave } from "./form_schema";

function appendFileEntry(json: any, ph: HTMLElement) {
    const selector = document.createElement('div');
    selector.classList.add('row');

    const container = document.createElement('div');
    container.classList.add('col', 's12');

    selector.appendChild(container);

    const text = document.createElement('div');
    container.appendChild(text);
    printObj(text, json);

    ph.appendChild(selector);
}

function readAllFilesOfDirectory(dirName: string) : Promise<Promise<FormSave>[]> {
    const dirreader = new Promise(function(resolve, reject) {
        getDir(function(dirEntry) {
            // Lecture de tous les fichiers du répertoire
            const reader = dirEntry.createReader();
            reader.readEntries(function (entries) {
                const promises: Promise<FormSave>[] = [];

                for (const entry of entries) {
                    promises.push(
                        new Promise(function(resolve, reject) {
                            entry.file(function (file) {
                                const reader = new FileReader();
                        
                                reader.onloadend = function() {
                                    resolve(JSON.parse(this.result as string));
                                };

                                reader.onerror = function(err) {
                                    reject(err);
                                }
                        
                                reader.readAsText(file);
                        
                            }, function(err) {
                                reject(err);
                            });
                        })
                    );
                }

                // Renvoie le tableau de promesses lancées
                resolve(promises);
            },function (err) {
                reject(err);
                console.log(err);
            });
        }, 
        dirName,
        function(err) {
            reject(err);
        });
    }); 

    // @ts-ignore
    return dirreader;
}

export function initSavedForm(base: HTMLElement) {
    const placeholder = document.createElement('div');
    placeholder.classList.add('container');

    readAllFilesOfDirectory('forms').then(function(all_promises) {
        Promise.all(all_promises).then(function(files: FormSave[]) {
            files = files.sort(
                (a, b) => new Date(b.fields.__date__ as string).getTime() - new Date(a.fields.__date__ as string).getTime()
            );

            for (const f of files) {
                appendFileEntry(f, placeholder);
            }

            base.innerHTML = "";
            base.appendChild(placeholder);

            if (files.length === 0) {
                placeholder.innerHTML = "<h5 class='empty vertical-center'>Vous n'avez aucun formulaire sauvegardé.</h5>";
            }
        }).catch(function(err) {
            throw err;
        });
    }).catch(function(err) {
        console.log(err);
        placeholder.innerHTML = "<h4 class='red-text'>Impossible de charger les fichiers.</h4>";
        base.appendChild(placeholder);
    });
}
