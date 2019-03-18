import { FormSave } from "./form_schema";
import { FILE_HELPER, SD_FILE_HELPER, ID_COMPLEXITY } from "./main";
import { FileHelperReadMode } from "./file_helper";
import { SyncManager } from "./SyncManager";
import { urlToBlob, generateId, showToast } from "./helpers";

// Les classes anonymes font foirer la doc. Les classes ont donc des noms génériques

/**
 * Gérer les sauvegardes d'entrée actuellement présentes sur l'appareil
 */
class _FormSaves {
    /**
     * Obtenir une sauvegarde
     * @param id Identifiant de la sauvegarde
     */
    public get(id: string) : Promise<FormSave> {
        return FILE_HELPER.readJSON("forms/" + id + ".json");
    }

    /**
     * Obtenir les fichiers associés à un formulaire sauvegardé
     * @param id Identifiant de l'entrée
     */
    public async getMetadata(id: string) : Promise<{ [fieldName: string]: [string, File] }> {
        const save = await FILE_HELPER.readJSON("forms/" + id + ".json") as FormSave;

        const files: { [fieldName: string]: [string, File] } = {};
        for (const field in save.metadata) {
            files[field] = [
                save.metadata[field],
                await FILE_HELPER.read("form_data/" + id + "/" + save.metadata[field], FileHelperReadMode.fileobj) as File
            ];
        }

        return files;
    }

    /**
     * Liste toutes les sauvegardes disponibles (par identifiant)
     */
    public async list() : Promise<string[]> {
        const files = await FILE_HELPER.entriesOf('forms');

        const ids: string[] = [];

        for (const f of files) {
            if (f.isFile) {
                ids.push(f.name.split('.json')[0]);
            }
        }

        return ids;
    }

    public listAsFormSave() : Promise<FormSave[]> {
        return FILE_HELPER.readAll("forms", FileHelperReadMode.json) as Promise<FormSave[]>;
    }

    /**
     * Supprimer tous les formulaires sauvegardés
     */
    public async clear() {
        // On veut supprimer tous les fichiers
        await FILE_HELPER.empty('forms', true);

        if (await FILE_HELPER.exists('form_data')) {
            await FILE_HELPER.empty('form_data', true);
        }

        if (device.platform === "Android" && SD_FILE_HELPER) {
            try {
                await SD_FILE_HELPER.empty('forms', true);
                await SD_FILE_HELPER.empty('form_data', true);
            } catch (e) {
                // Tant pis, ça ne marche pas
            }
        }

        await SyncManager.clear();
    }

    /**
     * Supprimer une seule entrée
     * @param id Identifiant de l'entrée
     */
    public async rm(id: string) {
        await FILE_HELPER.rm("forms/" + id + ".json");

        if (await FILE_HELPER.exists("form_data/" + id)) {
            await FILE_HELPER.rm("form_data/" + id, true);
        }

        if (device.platform === 'Android' && SD_FILE_HELPER) {
            // Tente de supprimer depuis la carte SD
            try {
                await SD_FILE_HELPER.rm("form_data/" + id, true);
                await SD_FILE_HELPER.rm("forms/" + id + '.json');
            } catch (e) { }
        }

        await SyncManager.remove(id);
    }

    /**
     * Ecrit les fichiers présents dans le formulaire dans un dossier spécifique,
     * puis crée le formulaire. 
     * Lit les fichiers depuis les input, doit donc être forcément
     * appelé depuis la page de création d'entrée !
     * 
     * @param identifier ID du formulaire (sans le .json)
     * @param form_values Valeurs à sauvegarder
     * @param older_save Anciennes valeurs (si mode édition)
     */
    public async save(identifier: string, form_values: FormSave, older_save?: FormSave) : Promise<FormSave> {
        async function deleteOlderFile(input_name: string) : Promise<void> {
            if (SD_FILE_HELPER) {
                SD_FILE_HELPER.rm((older_save.fields[input_name] as string));
            }
            return FILE_HELPER.rm((older_save.fields[input_name] as string));
        }
    
        async function saveBlobToFile(filename: string, input_name: string, blob: Blob) : Promise<void> {
            const full_path = 'form_data/' + identifier + '/' + filename;
    
            try {
                await FILE_HELPER.write(full_path, blob);
                if (device.platform === 'Android' && SD_FILE_HELPER) {
                    return SD_FILE_HELPER.write(full_path, blob).then(() => {}).catch(e => console.log(e));
                }
                // Enregistre le nom du fichier sauvegardé dans le formulaire,
                // dans la valeur du champ field
                form_values.fields[input_name] = full_path;
                form_values.metadata[input_name] = filename;
                if (older_save && input_name in older_save.fields && older_save.fields[input_name] !== null) {
                    // Si une image était déjà présente
                    if (older_save.fields[input_name] !== form_values.fields[input_name]) {
                        // Si le fichier enregistré est différent du fichier actuel
                        // Suppression de l'ancien fichier
                        deleteOlderFile(input_name);
                    }
                }
            }
            catch (error) {
                showToast("Un fichier n'a pas pu être sauvegardé. Vérifiez votre espace de stockage.");
                return Promise.reject(error);
            }
        }
    
        // Récupère les images du formulaire
        const images_from_form = document.getElementsByClassName('input-image-element');
    
        // Sauvegarde les images !
        const promises = [];
    
        for (const img of images_from_form) {
            const file = (img as HTMLInputElement).files[0];
            const input_name = (img as HTMLInputElement).name;
    
            if (file) {
                const filename = file.name;
    
                promises.push(
                    saveBlobToFile(filename, input_name, file)
                );
            }
            else {
                // Si il n'y a aucun fichier
                if (older_save && input_name in older_save.fields) {
                    // Si il a une sauvegarde précédente
                    form_values.fields[input_name] = older_save.fields[input_name];
                    form_values.metadata[input_name] = null;
    
                    if (typeof older_save.fields[input_name] === 'string') {
                        // Si le fichier doit être supprimé
                        if ((img as HTMLInputElement).dataset.toremove === "true") {
                            form_values.fields[input_name] = null;
                            // Suppression du fichier en question
                            deleteOlderFile(input_name);
                        } 
                        else {
                            const parts = (older_save.fields[input_name] as string).split('/');
                            form_values.metadata[input_name] = parts[parts.length - 1];
                        }
                    }
                }
                else {
                    form_values.fields[input_name] = null;
                    form_values.metadata[input_name] = null;
                }
            }
        }
    
        // Récupère les données audio du formulaire
        const audio_from_form = document.getElementsByClassName('input-audio-element');
    
        for (const audio of audio_from_form) {
            const file = (audio as HTMLInputElement).value;
            const input_name = (audio as HTMLInputElement).name;
    
            if (file) {
                const filename = generateId(ID_COMPLEXITY) + '.mp3';
    
                promises.push(
                    urlToBlob(file).then(function(blob) {
                        return saveBlobToFile(filename, input_name, blob);
                    })
                );
            }
            else {
                if (older_save && input_name in older_save.fields) {
                    form_values.fields[input_name] = older_save.fields[input_name];
                    form_values.metadata[input_name] = null;
    
                    if (typeof older_save.fields[input_name] === 'string') {
                        if ((audio as HTMLInputElement).dataset.toremove === "true") {
                            form_values.fields[input_name] = null;
                            // Suppression du fichier en question
                            deleteOlderFile(input_name);
                        } 
                        else {
                            const parts = (older_save.fields[input_name] as string).split('/');
                            form_values.metadata[input_name] = parts[parts.length - 1];
                        }
                    }
                }
                else {
                    form_values.fields[input_name] = null;
                    form_values.metadata[input_name] = null;
                }
            }
        }
    
        // Attend que les sauvegardes soient terminées
        await Promise.all(promises);
    
        // On supprime les metadonnées vides du form
        for (const n in form_values.metadata) {
            if (form_values.metadata[n] === null) {
                delete form_values.metadata[n];
            }
        }
    
        await FILE_HELPER.write('forms/' + identifier + '.json', form_values);
    
        if (device.platform === 'Android' && SD_FILE_HELPER) {
            SD_FILE_HELPER.write('forms/' + identifier + '.json', form_values).catch((e) => console.log(e));
        }
    
        console.log(form_values);
        return form_values;
    }
}

export const FormSaves = new _FormSaves;
