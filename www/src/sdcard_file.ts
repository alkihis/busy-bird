import { SDCARD_PATH } from "./main";
import { writeFileFromEntry } from "./helpers";

/**
 * Fonction de test
 * @param path Répertoire à lister
 * @param prefix Base / racine
 */
export async function listSdCard(path: string = "", prefix: string = SDCARD_PATH) : Promise<void> {
    const dir = await getSdCardDir(path, prefix) as DirectoryEntry;

    const reader = dir.createReader();
    reader.readEntries(
        function (entries) {
            console.log(entries);
        },
        function (err) {
            console.log(err);
        }
    );
}

/**
 * resolveLocalFileSystemURL version Promise
 * @param url URL à résoudre
 */
export function resolveFSURL(url: string) : Promise<Entry> {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(url, resolve, reject);
    });
}

/**
 * Obtient un répertoire depuis une entrée. Le crée si besoin.
 * @param entry Entrée de répertoire parent
 * @param name Nom du répertoire à obtenir
 * @param create Créer le répertoire
 */
export function getDirectoryFromEntry(entry: DirectoryEntry, name: string, create = true) : Promise<DirectoryEntry> {
    return new Promise((resolve, reject) => {
        entry.getDirectory(name, { create, exclusive: false }, resolve, reject);
    });
}

/**
 * Obtient un fichier depuis une entrée de répertoire. Le crée si besoin
 * @param entry Entrée du répertoire parent
 * @param name Nom du fichier
 * @param create Créer le fichier
 */
export function getFileFromEntry(entry: DirectoryEntry, name: string, create = true) : Promise<FileEntry> {
    return new Promise((resolve, reject) => {
        entry.getFile(name, { create, exclusive: false }, resolve, reject);
    });
}

/**
 * Obtenir un répertoire. Retourne null si le répertoire ne peut pas être atteint (pas une promesse rompue !)
 * @param name Nom du répertoire à récupérer
 * @param root Racine de la carte SD (automatiquement définie par défaut)
 */
export async function getSdCardDir(name: string = "", root: string = SDCARD_PATH) : Promise<DirectoryEntry> {
    let folder: DirectoryEntry;

    try {
        folder = await resolveFSURL(root) as DirectoryEntry;
    } catch (e) {
        return null;
    }
    
    if (folder === null) {
        return null;
    }

    if (name) {
        return getDirectoryFromEntry(folder, name);
    }
    else {
        return folder;
    }
}

/**
 * Obtient un fichier présent dans la carte SD
 * @param name Nom complet du fichier (répertoire compris)
 */
export async function getSdCardFile(name: string) : Promise<FileEntry> {
    const path = name.split('/');
    name = path.pop();
    const foldername = path.join('/');

    const folder = await getSdCardDir(foldername);

    if (folder === null || !name) {
        return null;
    }

    return getFileFromEntry(folder, name);
}

/**
 * Ecrit un fichier sur la carte SD. Le crée si besoin.
 * @param path Chemin du fichier
 * @param content Contenu du fichier
 */
export async function writeSdCardFile(path: string, content: Blob) : Promise<void> {
    const file = await getSdCardFile(path);

    if (file) {
        return writeFileFromEntry(file, content);
    }
}

/**
 * Supprime un fichier de la carte SD
 * @param path Chemin du fichier
 */
export async function removeSdCardFile(path: string) : Promise<void> {
    const file = await getSdCardFile(path);

    return new Promise((resolve, reject) => {
        file.remove(resolve, reject);
    });
}

/**
 * Obtient les répertoires sur cartes SD montés. 
 * Attention, depuis KitKat, la racine de la carte SD n'est PAS accessible en écriture !
 */
export function getSdCardFolder() : Promise<{path: string, filePath: string, canWrite: boolean}[]> {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        cordova.plugins.diagnostic.external_storage.getExternalSdCardDetails(resolve, reject);
    });
}
