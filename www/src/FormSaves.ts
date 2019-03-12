import { FormSave } from "./form_schema";
import { FILE_HELPER, SD_FILE_HELPER } from "./main";
import { FileHelperReadMode } from "./file_helper";
import { SyncManager } from "./SyncManager";

export const FormSaves = new class {
    public get(id: string) : Promise<FormSave> {
        return FILE_HELPER.read("forms/" + id + ".json", FileHelperReadMode.json);
    }

    public async getMetadata(id: string) : Promise<{ [fieldName: string]: [string, File] }> {
        const save = await FILE_HELPER.read("forms/" + id + ".json", FileHelperReadMode.json) as FormSave;

        const files: { [fieldName: string]: [string, File] } = {};
        for (const field in save.metadata) {
            files[field] = [
                save.metadata[field],
                await FILE_HELPER.getFile(await FILE_HELPER.get("form_data/" + id + "/" + save.metadata[field]) as FileEntry)
            ];
        }

        return files;
    }

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
};