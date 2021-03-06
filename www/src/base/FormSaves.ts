import { FormSave } from "./FormSchema";
import { FILE_HELPER, SD_FILE_HELPER, ID_COMPLEXITY } from "../main";
import { FileHelperReadMode } from "./FileHelper";
import { SyncManager } from "./SyncManager";
import { urlToBlob, generateId, showToast, cleanTakenPictures } from "../utils/helpers";
import { Logger } from "../utils/logger";

export const ENTRIES_DIR = "forms/";
export const METADATA_DIR = "form_data/";

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
        return FILE_HELPER.readJSON(ENTRIES_DIR + id + ".json");
    }

    /**
     * Obtenir les fichiers associés à un formulaire sauvegardé
     * @param id Identifiant de l'entrée
     */
    public async getMetadata(id: string) : Promise<{ [fieldName: string]: [string, File] }> {
        const save = await FILE_HELPER.readJSON(ENTRIES_DIR + id + ".json") as FormSave;

        const files: { [fieldName: string]: [string, File] } = {};
        for (const field in save.metadata) {
            files[field] = [
                save.metadata[field],
                await FILE_HELPER.read(METADATA_DIR + id + "/" + save.metadata[field], FileHelperReadMode.fileobj) as File
            ];
        }

        return files;
    }

    /**
     * Liste toutes les sauvegardes disponibles (par identifiant)
     */
    public async list() : Promise<string[]> {
        const files = await FILE_HELPER.entriesOf(ENTRIES_DIR);

        const ids: string[] = [];

        for (const f of files) {
            if (f.isFile) {
                ids.push(f.name.split('.json')[0]);
            }
        }

        return ids;
    }

    public listAsFormSave() : Promise<FormSave[]> {
        return FILE_HELPER.readAll(ENTRIES_DIR, FileHelperReadMode.json) as Promise<FormSave[]>;
    }

    /**
     * Supprimer tous les formulaires sauvegardés
     */
    public async clear() {
        // On veut supprimer tous les fichiers
        await FILE_HELPER.empty(ENTRIES_DIR, true);

        if (await FILE_HELPER.exists(METADATA_DIR)) {
            await FILE_HELPER.empty(METADATA_DIR, true);
        }

        if (device.platform === "Android" && SD_FILE_HELPER) {
            try {
                await SD_FILE_HELPER.empty(ENTRIES_DIR, true);
                await SD_FILE_HELPER.empty(METADATA_DIR, true);
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
        await FILE_HELPER.rm(ENTRIES_DIR + id + ".json");

        if (await FILE_HELPER.exists(METADATA_DIR + id)) {
            await FILE_HELPER.rm(METADATA_DIR + id, true);
        }

        if (device.platform === 'Android' && SD_FILE_HELPER) {
            // Tente de supprimer depuis la carte SD
            try {
                await SD_FILE_HELPER.rm(METADATA_DIR + id, true);
                await SD_FILE_HELPER.rm(ENTRIES_DIR + id + '.json');
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
                SD_FILE_HELPER.rm(METADATA_DIR + identifier + "/" + (older_save.fields[input_name] as string));
            }
            return FILE_HELPER.rm(METADATA_DIR + identifier + "/" + (older_save.fields[input_name] as string));
        }
    
        async function saveBlobToFile(filename: string, input_name: string, blob: Blob) : Promise<void> {
            const full_path = METADATA_DIR + identifier + '/' + filename;
    
            try {
                await FILE_HELPER.write(full_path, blob);
                if (device.platform === 'Android' && SD_FILE_HELPER) {
                    SD_FILE_HELPER.write(full_path, blob).then(() => {}).catch(e => Logger.info("Unable to save a file to SD card", e));
                }
                // Enregistre le nom du fichier sauvegardé dans le formulaire,
                // dans la valeur du champ field
                form_values.fields[input_name] = form_values.metadata[input_name] = filename;
                
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
                showToast("A file couldn't be saved. Check your storage capacity.");
                return Promise.reject(error);
            }
        }
    
        // Récupère les images et les fichiers du formulaire
        const files_and_images_from_form = document.querySelectorAll('.input-image-element, .input-fileitem-element');
    
        // Sauvegarde les images !
        const promises = [];
    
        for (const item of files_and_images_from_form) {
            let file = (item as HTMLInputElement).files[0];
            const input_name = (item as HTMLInputElement).name;
    
            // Si on a pris une image avec takeAPicture()
            if ((item as HTMLInputElement).dataset.imagemanualurl) {
                const url = (item as HTMLInputElement).dataset.imagemanualurl;
                // Il y a une URL vers fichier qui a été précisée
                // Regarde si le fichier existe encore
                try {
                    const image_file_entry = await FILE_HELPER.absoluteGet(url) as FileEntry;
                    file = await FILE_HELPER.getFile(image_file_entry);
                } catch (e) {
                    // URL invalide !
                }
            }
            
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
                        if ((item as HTMLInputElement).dataset.toremove === "true") {
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
    
        await FILE_HELPER.write(ENTRIES_DIR + identifier + '.json', form_values);
    
        if (device.platform === 'Android' && SD_FILE_HELPER) {
            SD_FILE_HELPER.write(ENTRIES_DIR + identifier + '.json', form_values).catch((e) => Logger.info("Unable to save a file to SD card", e));
        }

        // Vide le cache de la caméra
        cleanTakenPictures().catch(() => {});
    
        console.log(form_values);
        return form_values;
    }
}

export const FormSaves = new _FormSaves;
