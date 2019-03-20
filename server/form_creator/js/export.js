function exportFormModal() {
    const modal = getModal();
    const instance = initModal({dismissible: false});

    const form_key = loaded_form ? loaded_form.key : "";
    const form_name = loaded_form ? loaded_form.name : "";
    const form_id_field = loaded_form && loaded_form.id_field ? loaded_form.id_field : "";
    const form_no_loc = loaded_form && loaded_form.no_location ? true : false;
    const form_skip_loc = loaded_form && loaded_form.skip_location ? true : false;

    modal.innerHTML = `
    <div class="modal-content row no-margin-bottom no-padding-bottom">
        <h5 class="no-margin-top">Exporter le formulaire</h5>

        <p>
            ${Object.keys(form_locations).length} localisations chargée(s).<br>
        </p>

        <h6>Paramètres du formulaire<h6>

        <div class="input-field col s12">
            <input id="__form_key" placeholder="Contient uniquement des caractères alphanumériques" 
                type="text" class="validate" required pattern="[a-zA-Z0-9_-]+" value="${form_key}">
            <label for="__form_key">Nom interne</label>
        </div>

        <div class="input-field col s12">
            <input id="__form_label" placeholder="Par exemple, 'Cincle Plongeur'" type="text" class="validate" required value="${form_name}">
            <label for="__form_label">Nom affiché du formulaire</label>
        </div>

        <div class="input-field col s12">
            <input id="__form_id_f" placeholder="Par exemple, 'ringnb'" type="text" class="validate" value="${form_id_field}">
            <label for="__form_id_f">Champ correspondant à un identifiant dans le formulaire (nom interne)</label>
        </div>
        
        <p class="col s12 no-margin-top no-margin-bottom">
            <label>
                <input type="checkbox" id="__form_skip_loc" ${form_skip_loc ? 'checked' : ''} />
                <span>La localisation peut être facultative</span>
            </label>
        </p>
        <p class="col s12 no-margin-top">
            <label>
                <input type="checkbox" id="__form_no_loc" ${form_no_loc ? 'checked' : ''} />
                <span>Ce formulaire ne contient pas d'informations de localisation</span>
            </label>
        </p>

        <div class="clearb"></div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat modal-close left red-text">Annuler</a>
        <a href="#!" id="__export_form" class="btn-flat right green-text">Exporter</a>
        <div class="clearb"></div>
    </div>
    `;

    document.getElementById('__export_form').onclick = function() {
        const name = document.getElementById('__form_label').value;
        const key = document.getElementById('__form_key').value;
        const idf = document.getElementById('__form_id_f').value;
        const skip = document.getElementById('__form_skip_loc').checked;
        const nope = document.getElementById('__form_no_loc').checked;

        if (!name || !key) {
            M.toast({html: "Vous devez préciser un nom et une clé valide."});
            return;
        }

        if (!key.match(/^[0-9a-z_-]+$/i)) {
            M.toast({html: "La clé contient des caractères invalides."});
            return;
        }

        const a = document.createElement('a');

        a.href = exportForm(name, idf, form_locations, skip, nope);
        a.innerText = "Télécharger";
        a.target = '_blank';
        a.download = key + '.json';
        a.className = "flow-text";

        const wrapper = document.createElement('div');
        wrapper.className = "row center";

        wrapper.insertAdjacentHTML('beforeend', "<p class='flow-text'>Cliquez sur télécharger pour récupérer le formulaire.</p>");
        wrapper.appendChild(a);

        modal.innerHTML = `<div class="modal-content"></div>
        <div class="modal-footer">
            <a href="#!" class="btn-flat modal-close left red-text">Fermer</a>
            <div class="clearb"></div>
        </div>
        `;

        modal.firstChild.appendChild(wrapper);
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
function exportForm(name, id_field, locations, skip_location, no_location) {
    const exported = { name, fields: [], locations: {} };
    
    if (locations && !no_location)
        exported.locations = locations;

    if (id_field)
        exported.id_field = id_field;

    const collection = getCollection();

    for (const li of collection.children) {
        if (li.tagName === "LI" && li.dataset.internalname in form_items) {
            exported.fields.push(form_items[li.dataset.internalname]);
        }
    }

    if (no_location)
        exported.no_location = true;

    if (skip_location)
        exported.skip_location = true;

    return URL.createObjectURL(new Blob([JSON.stringify(exported)], {type: "application/json"}));
}

