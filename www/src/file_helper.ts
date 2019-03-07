export enum FileHelperReadMode {
    text, array, url, binarystr
}

export interface FileStats {
    mtime: number;
    mdate: Date;
    size: number;
    name: string;
}

export class FileHelper {
    protected ready: Promise<void> = null;
    protected root: string = null;

    public constructor(root: string = undefined) {
        /** CHECK IF FH IS READY WITH waitInit(). */ 

        this.ready = new Promise((resolve, reject) => {
            document.addEventListener('deviceready', async () => {
                try {
                    await this.cd(root, false);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public waitInit() : Promise<void> {
        if (this.ready === null) {
            return Promise.reject(new Error("File Helper constructor not called"));
        }
        else {
            return this.ready;
        }
    }

    protected getDirUrlOfPath(path: string) : string {
        const a = path.split('/');
        a.pop();
        return a.join('/');
    }

    protected getBasenameOfPath(path: string) : string {
        return path.split('/').pop();
    }

    public exists(path: string) : Promise<boolean> {
        return this.get(path)
            .then(() => true)
            .catch(() => false);
    }

    public async isFile(path: string) {
        return (await this.get(path)).isFile;
    }

    public async isDir(path: string) {
        return (await this.get(path)).isDirectory;
    }

    /**
     * Rename entry / Move file or directory to another directory.
     * 
     * @param path Path of the actual entry
     * @param dest Destination directory. Keep it undefined if you want to keep the same directory
     * @param new_name New name of the entry. Keep it undefined if you want to keep the same name
     */
    public async move(path: string, dest: string | undefined, new_name: string | undefined) {
        const entry = await this.get(path);
        path = entry.isDirectory ? path.replace(/\/$/, '') : path;

        const dir_dest = dest ? await this.mkdir(dest) : await this.get(this.getDirUrlOfPath(path)) as DirectoryEntry;

        entry.moveTo(dir_dest, new_name || this.getBasenameOfPath(path));
    }

    /**
     * Copy file or directory to another directory.
     * 
     * @param path Path of the actual entry
     * @param dest Destination directory
     * @param new_name New name, after copy, of the entry. Keep it undefined if you want to keep the same name
     */
    public async copy(path: string, dest: string, new_name: string | undefined) {
        const entry = await this.get(path);
        path = entry.isDirectory ? path.replace(/\/$/, '') : path;

        const dir_dest = await this.mkdir(dest);

        entry.copyTo(dir_dest, new_name || this.getBasenameOfPath(path));
    }

    public async mkdir(path: string) : Promise<DirectoryEntry> {
        const steps = path.split('/');

        let cur_entry = await this.get() as DirectoryEntry;

        for (const step of steps) {
            cur_entry = await new Promise((resolve, reject) => {
                cur_entry.getDirectory(step, {
                    create: true,
                    exclusive: false
                }, resolve, reject);
            });
        }

        return cur_entry;
    }

    public async write(path: string, content: Blob, append = false) : Promise<FileEntry> {
        const dirname = this.getDirUrlOfPath(path);
        const filename = this.getBasenameOfPath(path);

        const entry = await this.getFileEntryOfDirEntry(await this.mkdir(dirname), filename);

        return new Promise((resolve, reject) => {
            // Fonction pour écrire le fichier après vidage
            const finally_write = () => {
                entry.createWriter((fileWriter) => {
                    fileWriter.onerror = function (e) {
                        reject(e);
                    };
    
                    fileWriter.onwriteend = null;
                    fileWriter.write(content);
    
                    fileWriter.onwriteend = () => {
                        resolve(entry);
                    };
                });
            };
    
            if (append) {
                finally_write();
            }
            else {
                // Vide le fichier
                entry.createWriter((fileWriter) => {
                    fileWriter.onerror = function (e) {
                        reject(e);
                    };

                    // Vide le fichier
                    fileWriter.truncate(0);

                    // Quand le fichier est vidé, on écrit finalement dedans
                    fileWriter.onwriteend = finally_write;
                });
            }
        });
    }

    public async read(path: string, mode = FileHelperReadMode.text) : Promise<string | ArrayBuffer> {
        const file = await this.getFileOfEntry(await this.get(path) as FileEntry);

        return new Promise((resolve, reject) => {
            const r = new FileReader();
    
            r.onload = function() {
                if (mode === FileHelperReadMode.array) {
                    resolve(this.result as ArrayBuffer);
                }
                else {
                    resolve(this.result as string);
                }
            }
    
            r.onerror = function(error) {
                // Erreur de lecture du fichier => on rejette
                reject(error);
            }
    
            if (mode === FileHelperReadMode.array) {
                r.readAsArrayBuffer(file);
            }
            else if (mode === FileHelperReadMode.text) {
                r.readAsText(file);
            }
            else if (mode === FileHelperReadMode.url) {
                r.readAsDataURL(file);
            }
            else if (mode === FileHelperReadMode.binarystr) {
                r.readAsBinaryString(file);
            }
        });
    }

    protected absoluteGet(path: string) : Promise<Entry> {
        return new Promise((resolve, reject) => {
            window.resolveLocalFileSystemURL(path, resolve, reject);
        }); 
    }

    public get(path: string = "") : Promise<Entry> {
        return this.absoluteGet(this.root + "/" + path);
    }

    /**
     * Get content of a directory.
     * 
     * @param path Path of thing to explore
     * @param l Equivalent of -l parameter of ls command. Command will return FileStats[] instead of string[] with -l.
     */
    public async ls(path: string = "", l = false) : Promise<string[] | FileStats[]> {
        const entry = await this.get(path);

        if (entry.isFile) {
            return [path];
        }

        path = path.replace(/\/$/, '');

        const entries = await new Promise((resolve, reject) => {
            const reader = (entry as DirectoryEntry).createReader();
            reader.readEntries(resolve, reject);
        }) as Entry[];

        if (l) {
            const paths: FileStats[] = [];

            for (const e of entries) {
                if (e.isDirectory) {
                    paths.push({
                        name: e.name,
                        mdate: undefined,
                        mtime: undefined,
                        size: 4096
                    });
                }
                else {
                    const entry = await this.getFileOfEntry(e as FileEntry);

                    paths.push(this.getStatsFromFile(entry));
                }
            }

            return paths;
        }
        else {
            const paths: string[] = [];
            
            for (const e of entries) {
                paths.push(e.name); 
            }
    
            return paths;
        }
    }

    public async remove(path: string) : Promise<void> {
        const entry = await this.get(path);

        if (entry.isDirectory) {
            return new Promise((resolve, reject) => {
                (entry as DirectoryEntry).removeRecursively(resolve, reject);
            });
        }
        else {
            return new Promise((resolve, reject) => {
                (entry as FileEntry).remove(resolve, reject);
            });
        }
    }

    public async stats(path: string) : Promise<FileStats> {
        const entry = await this.getFileOfEntry(await this.get(path) as FileEntry);

        return this.getStatsFromFile(entry);
    }

    public async cd(path: string, relative = true) : Promise<void> {
        if (!path) {
            if (device.platform === "browser") {
                path = "cdvfile://localhost/temporary/";
            }
            else {
                path = cordova.file.externalDataDirectory || cordova.file.dataDirectory;
            }
        }

        // Teste si le chemin est valide (échouera sinon)
        const new_root = await (relative ? this.get(path) : this.absoluteGet(path));
        
        this.root = new_root.toInternalURL().replace(/\/$/, '');
    }

    public pwd() : string {
        return this.root;
    }

    /****** FUNCTIONS WITH DIRECTORY ENTRIES, FILE ENTRIES */
    public getFileEntryOfDirEntry(dir: DirectoryEntry, filename: string) : Promise<FileEntry> {
        return new Promise((resolve, reject) => {
            dir.getFile(filename, { create: true, exclusive: false }, resolve, reject);
        });
    }

    public getFileOfEntry(file: FileEntry) : Promise<File> {
        return new Promise((resolve, reject) => {
            file.file(resolve, reject);
        });
    }

    protected getStatsFromFile(entry: File) : FileStats {
        return {
            mtime: entry.lastModified,
            mdate: new Date(entry.lastModified),
            size: entry.size,
            name: entry.name
        };
    }

    /****** HELPERS */
    public stringToBlob(s: string) : Blob {
        return new Blob([s]);
    }
};

export const fs = new FileHelper;
