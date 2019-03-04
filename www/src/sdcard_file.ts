import { SDCARD_PATH } from "./main";
import { writeFileFromEntry } from "./helpers";

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

export function resolveFSURL(url: string) : Promise<Entry> {
    return new Promise((resolve, reject) => {
        window.resolveLocalFileSystemURL(url, resolve, reject);
    });
}

export function getDirectoryFromEntry(entry: DirectoryEntry, name: string, create = true) : Promise<DirectoryEntry> {
    return new Promise((resolve, reject) => {
        entry.getDirectory(name, { create, exclusive: false }, resolve, reject);
    });
}

export function getFileFromEntry(entry: DirectoryEntry, name: string, create = true) : Promise<FileEntry> {
    return new Promise((resolve, reject) => {
        entry.getFile(name, { create, exclusive: false }, resolve, reject);
    });
}

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

export async function writeSdCardFile(path: string, content: Blob) : Promise<void> {
    const file = await getSdCardFile(path);

    console.log(file);
    if (file) {
        return writeFileFromEntry(file, content);
    }
}

export async function removeSdCardFile(path: string) : Promise<void> {
    const file = await getSdCardFile(path);

    return new Promise((resolve, reject) => {
        file.remove(resolve, reject);
    });
}

export function getSdCardFolder() : Promise<{path: string, filePath: string, canWrite: boolean}[]> {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        cordova.plugins.diagnostic.external_storage.getExternalSdCardDetails(resolve, reject);
    });
}
