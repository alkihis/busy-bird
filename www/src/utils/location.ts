import { FormLocations } from "../base/FormSchema";
import { showToast } from "./helpers";

export const UNKNOWN_NAME = "__unknown__";
const UNKNOWN_LABEL = "Lieu inconnu";

/**
 * Crée le sélecteur de localisation
 * 
 * @param container Conteneur (usuellement, .modal-content)
 * @param input Champ sur lequel on va choisir (usuellement, un document.createElement('input') suffit)
 * @param locations Localisations possibles
 * @param open_on_complete Ouvrir Google Maps quand l'utilisateur clique sur une suggestion
 * @param with_unknown Ajouter un champ "\_\_unknown\_\_"
 * @param with_labels Spécifier les labels dans la sélection
 */
export function createLocationInputSelector(container: HTMLElement, input: HTMLInputElement, locations: FormLocations, open_on_complete = false, with_unknown = false, with_labels = false) {
    const row = document.createElement('div');
    row.classList.add('row');
    container.appendChild(row);

    input.autocomplete = "off";
    const input_f = document.createElement('div');
    input_f.classList.add('input-field', 'col', 's12');
    row.appendChild(input_f);

    // Champ input réel et son label
    const label = document.createElement('label');
    input.type = "text";
    input.id = "autocomplete_field_id";
    label.htmlFor = "autocomplete_field_id";
    label.textContent = "Place";
    input.classList.add('autocomplete');

    input_f.appendChild(input);
    input_f.appendChild(label);

    // Initialisation de l'autocomplétion
    const auto_complete_data: any = {};

    // Et création d'un objet clé => [nom, "latitude,longitude"]
    const labels_to_name: {[label: string]: [string, string]} = {};

    for (const lieu in locations) {
        const key = lieu + (with_labels ? " - " + locations[lieu].label : "");

        auto_complete_data[key] = null;
        labels_to_name[key] = [lieu, String(locations[lieu].latitude) + "," + String(locations[lieu].longitude)];
    }

    if (with_unknown) {
        const key = UNKNOWN_NAME + (with_labels ? " - " + UNKNOWN_LABEL : "");

        auto_complete_data[key] = null;
        labels_to_name[key] = [UNKNOWN_NAME, ""];
    }

    // Lance l'autocomplétion materialize
    M.Autocomplete.init(input, {
        data: auto_complete_data,
        limit: 5,
        onAutocomplete: function() {
            // Remplacement du label par le nom réel
            const location = input.value;

            // Recherche le label sélectionné dans l'objet les contenants
            if (location in labels_to_name) {
                if (open_on_complete) {
                    window.open("geo:" + labels_to_name[location][1] + 
                    "?q=" +labels_to_name[location][1] + "&z=zoom&mode=w", '_system');
                    
                    // Clean de l'input
                    input.value = "";
                }
            }
            else {
                showToast("This place does not exists.");
            }
        }
    });

    return labels_to_name;
}
