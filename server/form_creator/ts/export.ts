import { getModal, initModal, loaded_form, form_locations, getCollection, form_items, getModalPreloader } from "./form.js";
import { FormLocations, Schema } from "./elements.js";
import { User } from "./server.js";
import { informalModal } from "./helpers.js";

export function exportFormModal() {
    const modal = getModal();
    const instance = initModal({dismissible: false});

    // @ts-ignore
    const form_key = loaded_form ? loaded_form.key : "";
    const form_name = loaded_form ? loaded_form.name : "";
    const form_id_field = loaded_form && loaded_form.id_field ? loaded_form.id_field : "";
    const form_no_loc = loaded_form && loaded_form.no_location ? true : false;
    const form_skip_loc = loaded_form && loaded_form.skip_location ? true : false;

    modal.innerHTML = `
    <div class="modal-content row no-margin-bottom no-padding-bottom">
        <h5 class="no-margin-top">Export modal</h5>

        <p>
            ${Object.keys(form_locations).length} loaded locations.<br>
        </p>

        <h6>Modal settings<h6>

        <div class="input-field col s12">
            <input id="__form_key" placeholder="Only alpha-numerical characters" 
                type="text" class="validate" required pattern="[a-zA-Z0-9_-]+" value="${form_key}">
            <label for="__form_key">Internal name</label>
        </div>

        <div class="input-field col s12">
            <input id="__form_label" placeholder="For example, 'Cincle Plongeur'" type="text" class="validate" required value="${form_name}">
            <label for="__form_label">Label of model</label>
        </div>

        <div class="input-field col s12">
            <input id="__form_id_f" placeholder="For example, 'ringnb'" type="text" class="validate" value="${form_id_field}">
            <label for="__form_id_f">Field referring to a ID field in the model (internal name)</label>
        </div>
        
        <p class="col s12 no-margin-top no-margin-bottom">
            <label>
                <input type="checkbox" id="__form_skip_loc" ${form_skip_loc ? 'checked' : ''} />
                <span>Location could be optional</span>
            </label>
        </p>
        <p class="col s12 no-margin-top">
            <label>
                <input type="checkbox" id="__form_no_loc" ${form_no_loc ? 'checked' : ''} />
                <span>This form type should not have location informations</span>
            </label>
        </p>

        <div class="clearb"></div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat modal-close left red-text">Cancel</a>
        <a href="#!" id="__export_form" class="btn-flat right green-text">Export to file</a>
        <a href="#!" id="__export_form_server" class="btn-flat right blue-text">Export to server</a>
        <div class="clearb"></div>
    </div>
    `;

    document.getElementById('__export_form').onclick = () => { export_form(); };
    document.getElementById('__export_form_server').onclick = () => { export_form(false); };
    
    async function export_form(export_file = true) {
        const name = (document.getElementById('__form_label') as HTMLInputElement).value;
        const key = (document.getElementById('__form_key') as HTMLInputElement).value;
        const idf = (document.getElementById('__form_id_f') as HTMLInputElement).value;
        const skip = (document.getElementById('__form_skip_loc') as HTMLInputElement).checked;
        const nope = (document.getElementById('__form_no_loc') as HTMLInputElement).checked;

        if (!name || !key) {
            M.toast({html: "You must specify a valid name and label."});
            return;
        }

        if (!key.match(/^[0-9a-z_-]+$/i)) {
            M.toast({html: "Internal name is invalid."});
            return;
        }

        if (export_file) {
            const a = document.createElement('a');

            a.href = exportForm(name, idf, form_locations, skip, nope);
            a.innerText = "Download";
            a.target = '_blank';
            a.download = key + '.json';
            a.className = "flow-text";
    
            const wrapper = document.createElement('div');
            wrapper.className = "row center";
    
            wrapper.insertAdjacentHTML('beforeend', "<p class='flow-text'>Click on download to retrieve the model</p>");
            wrapper.appendChild(a);
    
            modal.innerHTML = `<div class="modal-content"></div>
            <div class="modal-footer">
                <a href="#!" class="btn-flat modal-close left red-text">Close</a>
                <div class="clearb"></div>
            </div>
            `;
    
            modal.firstChild.appendChild(wrapper);
        }
        else {
            // Try exporting to server
            if (!User.logged) {
                M.toast({html: "Log in to send models to server"});
                return;
            }

            const ist = informalModal("Exporting", getModalPreloader("Please wait"), false, true);

            try {
                const response = await User.req("schemas/insert.json", "POST", {
                    type: key,
                    model: exportForm(name, idf, form_locations, skip, nope, false)
                });

                if (!response.ok) {
                    throw new Error;
                }

                M.toast({html: "Model has been sent"});
                instance.close();
            } catch (e) {
                M.toast({html: "Unable to send model. You may not be allowed to send models to server"});
            }

            ist.close();
        }
    }

    M.updateTextFields();
    instance.open();
}

/**
 * @param {string} name
 * @param {string} id_field 
 * @param {any} locations 
 * @param {boolean} skip_location 
 * @param {boolean} no_location 
 * 
 * @returns {string} URL for schema download
 */
export function exportForm(name: string, id_field: string, locations: FormLocations, skip_location: boolean, no_location: boolean, as_url = true) {
    const exported: Schema = { name, fields: [], locations: {} };
    
    if (locations && !no_location)
        exported.locations = locations;

    if (id_field)
        exported.id_field = id_field;

    const collection = getCollection();

    for (const li of collection.children) {
        if (li.tagName === "LI" && (li as HTMLElement).dataset.internalname in form_items) {
            exported.fields.push(form_items[(li as HTMLElement).dataset.internalname]);
        }
    }

    if (no_location)
        exported.no_location = true;

    if (skip_location)
        exported.skip_location = true;

    return as_url ? URL.createObjectURL(new Blob([JSON.stringify(exported)], {type: "application/json"})) : JSON.stringify(exported);
}

