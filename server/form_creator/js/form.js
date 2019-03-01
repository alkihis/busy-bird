function getCollection() {
    return document.getElementById('form_collection');
}

// PRELOADERS: spinners for waiting time
const PRELOADER_BASE = `
<div class="spinner-layer spinner-blue-only">
    <div class="circle-clipper left">
        <div class="circle"></div>
    </div><div class="gap-patch">
        <div class="circle"></div>
    </div><div class="circle-clipper right">
        <div class="circle"></div>
    </div>
</div>`;
const PRELOADER = `
<div class="preloader-wrapper active">
    ${PRELOADER_BASE}
</div>`;
const SMALL_PRELOADER = `
<div class="preloader-wrapper small active">
    ${PRELOADER_BASE}
</div>`;

const MODAL_PRELOADER_TEXT_ID = "__classic_preloader_text";

/**
 * @returns HTMLElement Élément HTML dans lequel écrire pour modifier la page active
 */
function getBase() {
    return document.getElementById('main_block');
}

/**
 * Initialise le modal simple avec les options données (voir doc.)
 * et insère de l'HTML dedans avec content
 * @returns M.Modal Instance du modal instancié avec Materialize
 */
function initModal(options = {}, content = "") {
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
function initBottomModal(options = {}, content = "") {
    const modal = getBottomModal();
    
    if (content)
        modal.innerHTML = content;

    return M.Modal.init(modal, options);
}

/**
 * @returns HTMLElement Élément HTML racine du modal
 */
function getModal() {
    return document.getElementById('modal_placeholder');
}

/**
 * @returns HTMLElement Élément HTML racine du modal fixé en bas
 */
function getBottomModal() {
    return document.getElementById('bottom_modal_placeholder');
}

/**
 * @returns M.Modal Instance du modal (doit être initialisé)
 */
function getModalInstance() {
    return M.Modal.getInstance(getModal());
}

/**
 * @returns M.Modal Instance du modal fixé en bas (doit être initialisé)
 */
function getBottomModalInstance() {
    return M.Modal.getInstance(getBottomModal());
}

/**
 * Génère un spinner centré sur l'écran avec un message d'attente
 * @param text Texte à insérer comme message de chargement
 * @returns string HTML à insérer
 */
function getPreloader(text) {
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
function getModalPreloader(text, footer = "") {
    return `<div class="modal-content">
    <center>
        ${SMALL_PRELOADER}
    </center>
    <center class="flow-text pre-wrapper" id="${MODAL_PRELOADER_TEXT_ID}" style="margin-top: 10px">${text}</center>
    </div>
    ${footer}
    `;
}

/// {[fieldName: string]: FormEntity}
let form_items = {};
let loaded_form = null;
let form_locations = {};

function addItem(type, label, existing_item = undefined) {
    const modal = getModal();
    const instance = initModal({dismissible: false});
    modal.classList.add('modal-fixed-footer');

    modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">${existing_item ? "Modifier" : "Nouvel élement"} (${label})</h5>

        <form id="form_new_input" class="row" autocomplete="off"></form>
        <div class="clearb"></div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="red-text left modal-close btn-flat">Annuler</a>
        <a href="#!" id="__validate" class="green-text right btn-flat">Valider</a>
        <div class="clearb"></div>
    </div>`;
    const form = document.getElementById('form_new_input');

    document.getElementById('__validate').onclick = function() {
        try {
            readNewEntry(form, type, instance, label, existing_item);
        } catch (e) {
            M.toast({html: e.message});
        }
    };

    generateForm(form, type, existing_item);

    instance.open();
}

/**
 * Génère un champ par rapport à son type
 * @param {HTMLElement} baseElement 
 * @param {string} type 
 */
function generateForm(baseElement, type, existing_item) {
    // Génération des champs obligatoires
    baseElement.innerHTML = "";

    const infos = FORM_TYPES[type].info;
    if (infos !== undefined) {
        baseElement.insertAdjacentHTML('beforeend', `
        <p class="col s12">
            ${infos}
        </p>
    `);
    }

    baseElement.insertAdjacentHTML('beforeend', `
        <div class="input-field col s12">
            <input id="unique_name" name="unique_name" type="text" pattern="^[0-9a-zA-Z_-]+$" placeholder="Aucun espace autorisé"
                required class="validate ${existing_item ? "" : "in"}valid">
            <label for="unique_name">Nom interne du champ (doit être unique)</label>
        </div>
        <div class="input-field col s12">
            <input id="label" name="label" type="text" required class="validate ${existing_item ? "" : "in"}valid">
            <label for="label">Nom du champ à afficher à l'utilisateur</label>
        </div>
    `);

    if (existing_item) {
        document.getElementById('unique_name').value = existing_item.name;
        document.getElementById('label').value = existing_item.label;
    }

    if (!EMPTY_CHILDRENS.has(type)) {
        if (!NO_DEFAULT_VALUE.has(type)) {
            baseElement.insertAdjacentHTML('beforeend', `
            <div class="input-field col s12">
                <input id="default_val" name="default_val" type="text" placeholder="Laissez vide pour aucune valeur">
                <label for="default_val">Valeur par défaut du champ</label>
            </div>`);

            if (existing_item) {
                document.getElementById('default_val').value = existing_item.default_value || "";
            }
        }

        baseElement.insertAdjacentHTML('beforeend', `
        <p class="col s12 no-margin-bottom no-margin-top">
            <label>
                <input type="checkbox" name="required_field" id="required_checkbox_field" />
                <span>Champ requis</span>
            </label>
        </p>`);

        if (existing_item) {
            document.getElementById('required_checkbox_field').checked = existing_item.required || false;
        }
    }

    const elements = FORM_TYPES[type].props;

    for (const prop of elements) {
        if (typeof FORM_PROPERTIES[prop] === 'function') {
            FORM_PROPERTIES[prop](baseElement, existing_item);
        }
    }

    M.updateTextFields();
}

/**
 * 
 * @param {HTMLFormElement} form 
 * @param {string} type
 * @param {M.Modal} instance
 */
function readNewEntry(form, type, instance, f_label, existing_item) {
    const entry = { type };

    // Récupération name & label
    const name = form.querySelector(`[name="${PROPERTIES_INTERNAL_NAME.name}"]`);
    const label = form.querySelector(`[name="${PROPERTIES_INTERNAL_NAME.label}"]`);

    if (!name || !label || name.value === "" || label.value === "") {
        throw new Error("Nom et label requis");
    }

    entry.name = name.value;
    entry.label = label.value;

    if (existing_item && entry.name in form_items && entry.name === existing_item.name) {
        // Si on modifie une entrée actuelle, qu'on a PAS changé le nom unique pendant la modification
    }
    else if (entry.name in form_items) {
        throw new Error("Le nom unique est déjà pris");
    }
    

    if (!EMPTY_CHILDRENS.has(type)) {
        if (!NO_DEFAULT_VALUE.has(type)) {
            // default_value
            const def_val = form.querySelector(`[name="${PROPERTIES_INTERNAL_NAME.default_value}"]`);

            if (def_val.value) {
                entry.default_value = def_val.value;
            }
        }

        // required
        const requi = form.querySelector(`[name="${PROPERTIES_INTERNAL_NAME.required}"]`);

        if (requi.checked) {
            entry.required = true;
        }
    }

    // On passe aux éléments classiques
    const elements = FORM_TYPES[type].props;

    for (const prop of elements) {
        if (typeof PROPERTIES_INTERNAL_NAME[prop] === 'string') {
            const cname = PROPERTIES_INTERNAL_NAME[prop];
            if (cname[0] === '.') {
                // Gestion spéciale
                acquireDataFromInput(form, entry, prop);
            }
            else {
                const cur_prop = form.querySelector(`[name="${cname}"]`);

                if (!cur_prop.checkValidity()) {
                    throw new Error("Un champ contient une valeur invalide (" + cname + ")");
                }

                // Si c'est un input texte
                if (cur_prop.type === "text") {
                    if (cur_prop.value)
                        entry[prop] = cur_prop.value;
                }
                else if (cur_prop.type === "number") {
                    if (cur_prop.value)
                        entry[prop] = Number(cur_prop.value);
                }
                else if (cur_prop.type === "checkbox") {
                    entry[prop] = cur_prop.checked;
                }
            }
        }
    }

    if (!form.checkValidity()) {
        throw new Error("Un champ contient une valeur invalide ou un champ requis n'a pas été rempli");
    }

    // On peut enregistrer l'entrée
    if (existing_item) {
        delete form_items[existing_item.name];
    }

    form_items[entry.name] = entry;

    // Et l'ajouter à la collection
    const collection = getCollection();
    createCollectionItem(collection, entry, f_label, existing_item);

    // Fermeture modal
    instance.close();
}

function createCollectionItem(collection, entry, f_label, existing_item = undefined) {
    let item;

    if (existing_item) {
        item = collection.querySelector('li[data-internalname="'+ existing_item.name +'"]');

        // Met à jour le nom interne et label si il a changé
        item.dataset.internalname = entry.name;
        item.innerHTML = `<div>
            ${entry.label} (${f_label})
            <a href="#!" class="secondary-content"><i class="material-icons">import_export</i></a>
        </div>`;
    }
    else {
        item = document.createElement('li');
        item.classList.add('collection-item', 'pointer');
        item.dataset.internalname = entry.name;
        
        item.innerHTML = `<div>
            ${entry.label || entry.name} (${f_label})
            <a href="#!" class="secondary-content"><i class="material-icons">import_export</i></a>
        </div>`;

        collection.appendChild(item);
    }
    
    item.onclick = function() {
        // Editer
        addItem(entry.type, f_label, entry);
    };

    // Ajout d'un bouton pour supprimer
    const delete_btn = document.createElement('a');
    delete_btn.href = "#!";
    delete_btn.className = "red-text right delete-button";
    delete_btn.innerHTML = "<i class='material-icons'>delete</i>";

    delete_btn.onclick = function(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        askModal("Supprimer cet élément ?", "Voulez vous vraiment supprimer \"" + entry.label + "\" ?")
            .then(() => {
                // Oui
                delete form_items[entry.name];
                item.remove();

                try {
                    Sortable.active.destroy();
                } catch (e) {}
            
                Sortable.create(collection);
            })
            .catch(() => {});
    }

    item.firstChild.appendChild(delete_btn);


    try {
        Sortable.active.destroy();
    } catch (e) {}

    Sortable.create(collection);
}

/**
 * {this} HTMLInputElement : File input
 */
function loadLocationModal() {
    const modal = getModal();
    const instance = initModal({dismissible: false});

    const tsv_file = this.files[0];
    const file_input = this;

    if (!tsv_file) {
        M.toast({html: "Aucun fichier chargé"});
        return;
    }

    modal.innerHTML = `
    <div class="modal-content row">
        <h5 class="no-margin-top">Importer des localisations</h5>

        <p>
            ${Object.keys(form_locations).length} localisations actuellement chargée(s).<br>
            Les exemples donnés sont pour les données du Cincle Plongeur.
        </p>

        <h6>Mode d'importation<h6>
        <p>
            Choisissez si les localisations contenues dans le fichier doivent remplacer ou fusionner
            avec les localisations actuelles.
        </p>

        <p>
            <label>
                <input name="append_mode" type="radio" value="append" checked />
                <span>Fusionner</span>
            </label>
        </p>
        <p>
            <label>
                <input name="append_mode" type="radio" value="replace" />
                <span>Remplacer</span>
            </label>
        </p>

        <h6>Colonnes du TSV<h6>
        <div class="input-field col s12">
            <input placeholder="Insensible à la casse" id="__tsv_id_field" type="text" class="validate" required>
            <label for="__tsv_id_field">Nom de la colonne portant l'identifiant (p.e. "Nom_nid_nichoir")</label>
        </div>
        <div class="input-field col s12">
            <input placeholder="Insensible à la casse" id="__tsv_label_field" type="text" class="validate">
            <label for="__tsv_label_field">Nom de la colonne portant le label (p.e. "Localisation")</label>
        </div>

        <div class="input-field col s12">
            <input placeholder="Insensible à la casse" id="__tsv_long_field" type="text" class="validate" required>
            <label for="__tsv_long_field">Nom de la colonne portant la longitude (p.e. "LONGITUDE")</label>
        </div>
        <div class="input-field col s12">
            <input placeholder="Insensible à la casse" id="__tsv_lat_field" type="text" class="validate" required>
            <label for="__tsv_lat_field">Nom de la colonne portant la latitude (p.e. "LATITUDE")</label>
        </div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat modal-close left red-text">Annuler</a>
        <a href="#!" id="__import_tsv_file" class="btn-flat right green-text">Importer</a>
        <div class="clearb"></div>
    </div>
    `;

    let in_import = false;
    document.getElementById('__import_tsv_file').onclick = async function() {
        if (in_import) {
            return;
        }
        in_import = true;

        // importer le tsv avec les options...
        const mode = modal.querySelector('[name="append_mode"]:checked').value;
        const id = document.getElementById('__tsv_id_field').value;
        let label = document.getElementById('__tsv_label_field').value;
        if (!label) {
            label = id;
        }

        const lat = document.getElementById('__tsv_lat_field').value;
        const long = document.getElementById('__tsv_long_field').value;

        if (!id || !lat || !long) {
            M.toast({html: "Les champs obligatoires ne sont pas remplis."});
            in_import = false;
            return;
        }

        // Parsage du TSV !
        try {
            const imported = await loadTSV(tsv_file, mode, id, label, lat, long);

            M.toast({html: "Importation de " + imported + " localisations effectuée."});

            // Reset de l'input
            file_input.value = "";
            file_input.type = "";
            file_input.type = "file";

            instance.close();
        } catch (e) {
            M.toast({html: e.message});
        }

        in_import = false;
    }

    M.updateTextFields();

    instance.open();
}

async function loadTSV(file, mode, id, label, lat, long) {
    const locations = mode === "append" ? form_locations : {};

    // Lecture de la première ligne du TSV pour voir si on trouve les colonnes voulues
    let num_id = null;
    let num_lat = null;
    let num_long = null;
    let num_label = null;

    let txtfile = "";
    try {
        txtfile = await readFile(file);
    } catch (e) {
        throw new Error("Impossible de lire le fichier");
    }

    const lines = txtfile.split("\n");

    let line = lines[0].trim().split('\t');
    let i = 0;
    for (const colomn of line) {
        let word = colomn.toLowerCase();

        if (word === id.toLowerCase()) {
            num_id = i;
        }
        if (word === label.toLowerCase()) {
            num_label = i;
        }
        if (word === lat.toLowerCase()) {
            num_lat = i;
        }
        if (word === long.toLowerCase()) {
            num_long = i;
        }

        i++;
    }
        
    // Vérification que tous les nums sont définis
    if (num_id === null || num_long === null || num_lat === null || num_label === null)
        throw new Error("Un champ requis n'est pas défini dans le TSV. Vérifiez le nom des colonnes.");

    line = lines[1].trim();
    i = 2;
    while (line) {
        line = line.split('\t');
        
        try {
            const local_id = line[num_id].replace(/""/g, '"').replace(/^"/, '').replace(/"$/, ''); // Supprime les groupes de guillemets rajoutés par excel

            locations[local_id] = {
                'label': line[num_label].replace(/""/g, '"').replace(/^"/, '').replace(/"$/, ''),
                'latitude': Number(line[num_lat].replace(',', '.')),
                'longitude': Number(line[num_long].replace(',', '.'))
            };

            if (isNaN(locations[local_id].latitude) || isNaN(locations[local_id].longitude)) {
                throw "invalid lat long";
            }

            if (typeof locations[local_id].label === "undefined") {
                throw "invalid schema";
            }
        } catch (e) {
            throw new Error(`La ligne ${i} n'est pas conforme au schéma donné dans le header du TSV ou contient une valeur invalide.`);
        }

        line = lines[i].trim();

        i++;
    }
        
    form_locations = locations;

    return i - 2;
}

$(function() {
    // Fonction d'initialisation
    const collection = getCollection();

    // génération du select dans la page
    const new_item = document.getElementById('new_item');
    new_item.innerHTML = `
    <div class="row">
        <div class="input-field col s12" id="select_new_type_wrapper">
            <select id="select_new_type">
                <option value="" selected disabled>Aucun</option>
            </select>
            <label>Insérer un nouveau champ</label>
        </div>
    </div>`;

    const type_select = document.getElementById('select_new_type');

    for (const type in FORM_TYPES) {
        type_select.insertAdjacentHTML('beforeend', `
            <option value="${type}">${FORM_TYPES[type].label}</option>
        `);
    }

    type_select.addEventListener('change', function() {
        if (this.value !== "") {
            // On génère le modal pour ce type
            addItem(this.value, this.querySelector('option:checked').innerText);
            this.value = "";
        }
    });

    M.FormSelect.init(type_select);

    // Initialisation du file TSV input
    document.getElementById('__tsv_file_input').onchange = loadLocationModal;

    // Initilisation du file input JSON
    document.getElementById('__newfile_input').onchange = async function() {
        let content = {};
        let info = document.getElementById('__newfile_info');

        try {
            info.innerText = "Lecture du fichier...";

            content = JSON.parse(await readFile(this.files[0]));

            if (!("fields" in content && "name" in content)) {
                throw new Error("Fichier invalide");
            }
        } catch (e) {
            M.toast({html: "Impossible de lire le fichier"});
            info.innerText = "";
            return;
        }

        // Stockage
        loaded_form = content;
        loaded_form.key = this.files[0].name.split('.json')[0];

        form_items = {};
        form_locations = content.locations;
        collection.innerHTML = "";

        // Association dans form_items et création de la collection
        for (const field of content.fields) {
            form_items[field.name] = field;
            try {
                createCollectionItem(collection, field, FORM_TYPES[field.type].label);
            } catch (e) {
                console.log(e, field);
            }
        }

        info.innerText = "";
    };

    // Initialisation du bouton d'export
    document.getElementById('__export_form_btn').onclick = exportFormModal;

    // Initialisation du bouton de reset
    document.getElementById('__reset_form_btn').onclick = resetForm;
});

function resetForm() {
    askModal("Remettre à zéro ?", "Toutes les modifications sur cette page seront perdues.")
        .then(() => {
            // Oui
            form_items = {};
            form_locations = {};
            loaded_form = null;

            getCollection().innerHTML = "";

            try {
                Sortable.active.destroy();
            } catch (e) {}
        })
        .catch(() => {});
}
