import { FormLocations } from "./form_schema";
import { showToast } from "./helpers";

export function createLocationInputSelector(container: HTMLElement, input: HTMLInputElement, locations: FormLocations, open_on_complete = false) {
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
    label.textContent = "Lieu";
    input.classList.add('autocomplete');

    input_f.appendChild(input);
    input_f.appendChild(label);

    // Initialisation de l'autocomplétion
    const auto_complete_data: any = {};
    for (const lieu in locations) {
        let key = lieu + " - " + locations[lieu].label;

        auto_complete_data[key] = null;
    }
    // Création d'un objet clé => [nom, "latitude,longitude"]
    const labels_to_name: {[label: string]: [string, string]} = {};
    for (const lieu in locations) {
        let key = lieu + " - " + locations[lieu].label;
        labels_to_name[key] = [lieu, String(locations[lieu].latitude) + "," + String(locations[lieu].longitude)];
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
                }
            }
            else {
                showToast("Ce lieu n'existe pas.");
            }
        }
    });

    return labels_to_name;
}