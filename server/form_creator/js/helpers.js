import { getBottomModal, initBottomModal } from "./form.js";
export function readFile(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = function () {
            resolve(this.result);
        };
        fr.onerror = function (err) {
            reject(err);
        };
        fr.readAsText(file);
    });
}
/**
 * Ouvre un modal demandant à l'utilisateur de cliquer sur oui ou non
 * @param title string Titre affiché sur le modal
 * @param question string Question complète / détails sur l'action qui sera réalisée
 * @param text_yes string Texte affiché sur le bouton de validation
 * @param text_no string Texte affiché sur le bouton d'annulation
 * @returns Promise<void | boolean> Promesse se résolvant quand l'utilisateur approuve, se rompant si l'utilisateur refuse.
 * Si il y a une checkbox, la promesse résolue / rompue reçoit en valeur l'attribut checked de la checkbox
 */
export function askModal(title, question, text_yes = "Yes", text_no = "No", checkbox = undefined) {
    const modal = getBottomModal();
    const instance = initBottomModal();
    modal.innerHTML = `
    <div class="modal-content center">
        <h5 class="no-margin-top">${title}</h5>
        <p>${question}</p>

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
        <a href="#!" id="__question_no" class="btn-flat green-text modal-close">${text_no}</a>
        <a href="#!" id="__question_yes" class="btn-flat red-text modal-close">${text_yes}</a>
    </div>
    `;
    instance.open();
    const chk = document.getElementById("__question_checkbox");
    return new Promise(function (resolve, reject) {
        document.getElementById('__question_yes').addEventListener('click', () => {
            if (chk) {
                resolve(chk.checked);
            }
            else {
                resolve();
            }
        });
        document.getElementById('__question_no').addEventListener('click', () => {
            if (chk) {
                reject(chk.checked);
            }
            else {
                reject();
            }
        });
    });
}
export function informalModal(title, content, ok_button = "Ok", lock = false) {
    const modal = getBottomModal();
    const instance = initBottomModal({ dismissible: !lock });
    modal.innerHTML = `
    <div class="modal-content center">
        <h5 class="no-margin-top">${title}</h5>
        ${content}
    </div>
    
    ${ok_button ? `<div class="modal-footer"><a href="#!" class="btn-flat green-text modal-close">${ok_button}</a></div>` : ''}
    `;
    instance.open();
    return instance;
}
export function convertHTMLToElement(htmlString) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.firstElementChild;
}
