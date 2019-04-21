import { User } from "./server.js";
import { getModal, initModal, getModalPreloader, changeLoadedForm } from "./form.js";
import { informalModal } from "./helpers.js";
export async function loadFromServer() {
    if (!User.logged) {
        M.toast({ html: "You must be logged to do that" });
        return;
    }
    // Préparation du modal
    const modal = getModal();
    const instance = initModal();
    modal.innerHTML = `
    ${getModalPreloader("Please wait")}
    <div class="modal-footer">
        <a href="#!" class="btn-flat red-text modal-close">Cancel</a>
    </div>
    `;
    const content = document.createElement('div');
    content.className = "modal-content";
    instance.open();
    // Construction du contenu
    const model_list = await User.req("schemas/available.json").then(r => r.ok ? r.json() : new Error(r));
    if (model_list instanceof Error) {
        const json = await model_list.message.text();
        modal.innerHTML = `
        <div class="modal-content">
            <h5 class="no-margin-top">Unable to fetch available models.</h5>
            <p>${json}</p>
        </div>
        <div class="modal-footer">
            <a href="#!" class="btn-flat red-text modal-close">Cancel</a>
        </div>
        `;
        return;
    }
    const h5 = document.createElement('h5');
    h5.className = "no-margin-top";
    h5.innerText = "Available form models";
    content.appendChild(h5);
    // Construction de la liste
    const collection = document.createElement('ul');
    collection.className = "collection";
    const access_fn = async function () {
        // Charge le formulaire .dataset.id
        const instance_info = informalModal("Fetching " + this.dataset.id + "...", "Please wait", false, true);
        const resp = await User.req('schemas/get.json', "GET", { type: this.dataset.id });
        if (!resp.ok) {
            M.toast({ html: "Unable to get this model." });
            instance_info.close();
            return;
        }
        changeLoadedForm(await resp.json(), this.dataset.id);
        instance.close();
        instance_info.close();
    };
    for (const form_key in model_list) {
        const item = document.createElement('a');
        item.className = "collection-item available-model";
        item.href = "#!";
        item.innerText = model_list[form_key][0] + " (" + form_key + ")";
        item.dataset.id = form_key;
        // @ts-ignore
        item.onclick = access_fn;
        collection.appendChild(item);
    }
    content.appendChild(collection);
    modal.innerHTML = "";
    modal.appendChild(content);
    modal.insertAdjacentHTML('beforeend', `<div class="modal-footer">
        <a href="#!" class="btn-flat red-text modal-close">Cancel</a>
    </div>`);
}
