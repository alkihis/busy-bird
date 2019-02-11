import { getDir, printObj } from "./helpers";

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

export function initSavedForm(base: HTMLElement) {
    const placeholder = document.createElement('div');

    getDir(function(dirEntry) {
        // Lecture de tous les fichiers du répertoire
        const reader = dirEntry.createReader();
        reader.readEntries(
            function (entries) {
                for (const entry of entries) {
                    entry.file(function (file) {
                        const reader = new FileReader();
                
                        reader.onloadend = function() {
                            appendFileEntry(JSON.parse(this.result as string), placeholder);
                        };
                
                        reader.readAsText(file);
                
                    }, function(err) {
                        console.log("fileerr:", err);
                    });
                }
            },
            function (err) {
                console.log(err);
            }
        );
    }, 'forms');

    base.innerHTML = "";
    base.appendChild(placeholder);
}
