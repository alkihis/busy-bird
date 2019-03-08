export enum FileHelperReadMode {
    text, array, url, binarystr, json, internalURL
}

/**
 * Represent informations about a file.
 */
export interface FileStats {
    mtime: number | undefined;
    mdate: Date | undefined;
    size: number;
    name: string;
}

/**
 * Simplify file access and directory navigation with native Promise support
 */
export class FileHelper {
    protected ready: Promise<void> | null = null;
    protected root: string | null = null;

    /**
     * Create a new FileHelper object using a root path.
     * Root are automatically setted to cordova.file.externalDataDirectory || cordova.file.dataDirectory on mobile devices,
     * and to "cdvfile://localhost/temporary/" on browser.
     * 
     * You can create a new FileHelper instance using a FileHelper instance, working directory will be used as root.
     * 
     * You can also create a new FileHelper instance using a DirectoryEntry, 
     * returned by cordova-plugin-file's callbacks or by FileHelper.mkdir(). 
     * DirectoryEntry's URL will be used as root.
     * 
     * @param root Root directory of the new instance
     */
    public constructor(root: string | FileHelper | DirectoryEntry = "") {
        /** CHECK IF FH IS READY WITH waitInit(). */ 
        this.ready = new Promise((resolve, reject) => {
            document.addEventListener('deviceready', async () => {
                if (root instanceof FileHelper) {
                    root = root.pwd();
                }
                else if (typeof (root as DirectoryEntry).isDirectory !== 'undefined') {
                    // C'est une DirectoryEntry
                    root = (root as DirectoryEntry).toInternalURL();
                }

                try {
                    await this.cd(root as string, false);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    /**
     * Returns a resolved promise when FileHelper is ready.
     */
    public waitInit() : Promise<void> {
        if (this.ready === null) {
            return Promise.reject(new Error("File Helper constructor not called"));
        }
        else {
            return this.ready;
        }
    }

    /**
     * Return parent directory of current path. Must NOT have trailing slash !
     * @param path 
     */
    protected getDirUrlOfPath(path: string) : string {
        const a = path.split('/');
        a.pop();
        return a.join('/');
    }

    /**
     * Return basename (filename or foldername) of current path. Must NOT have trailing slash !
     */
    protected getBasenameOfPath(path: string) : string {
        const basename = path.split('/').pop();

        if (basename === undefined) {
            return path;
        }
        else {
            return basename;
        }
    }

    /**
     * Check if path exists (either a file or a directory)
     * @param path 
     */
    public exists(path: string) : Promise<boolean> {
        return this.get(path)
            .then(() => true)
            .catch(() => false);
    }

    /**
     * Check if path exists and is a file
     * @param path 
     */
    public async isFile(path: string) : Promise<boolean> {
        return this.get(path)
            .then(e => e.isFile)
            .catch(() => false);
    }

    /**
     * Check if path exists and is a directory
     * @param path 
     */
    public async isDir(path: string): Promise<boolean> {
        return this.get(path)
            .then(e => e.isDirectory)
            .catch(() => false);
    }

    /**
     * Rename entry / Move file or directory to another directory.
     * 
     * @param path Path of the actual entry
     * @param dest Destination directory. Keep it undefined if you want to keep the same directory.
     * Can be a string-path, a FileHelper instance, or a DirectoryEntry
     * 
     * @param new_name New name of the entry. Keep it undefined if you want to keep the same name
     */
    public async mv(path: string, dest: string | undefined | FileHelper | DirectoryEntry, new_name: string | undefined) : Promise<void> {
        const entry = await this.get(path);
        path = entry.isDirectory ? path.replace(/\/$/, '') : path;

        let dir_dest: DirectoryEntry = dest as DirectoryEntry;

        if (typeof dest === 'string') {
            dir_dest = await this.mkdir(dest);
        }
        else if (dest instanceof FileHelper) {
            dir_dest = await this.absoluteGet(dest.pwd()) as DirectoryEntry;
        }
        else if (dest === undefined) {
            dir_dest = await this.get(this.getDirUrlOfPath(path)) as DirectoryEntry;
        }
        // Sinon, c'est bien un DirectoryEntry

        entry.moveTo(dir_dest, new_name || this.getBasenameOfPath(path));
    }

    /**
     * Copy file or directory to another directory.
     * 
     * @param path Path of the actual entry
     * @param dest Destination directory. Keep it undefined if you want to keep the same directory. 
     * Can be a string-path, a FileHelper instance, or a DirectoryEntry
     * 
     * @param new_name New name, after copy, of the entry. Keep it undefined if you want to keep the same name
     */
    public async cp(path: string, dest: string | undefined | FileHelper | DirectoryEntry, new_name: string | undefined) : Promise<void> {
        const entry = await this.get(path);
        path = entry.isDirectory ? path.replace(/\/$/, '') : path;

        let dir_dest: DirectoryEntry = dest as DirectoryEntry;

        if (typeof dest === 'string') {
            dir_dest = await this.mkdir(dest);
        }
        else if (dest instanceof FileHelper) {
            dir_dest = await this.absoluteGet(dest.pwd()) as DirectoryEntry;
        }
        else if (dest === undefined) {
            dir_dest = await this.get(this.getDirUrlOfPath(path)) as DirectoryEntry;
        }
        // Sinon, c'est bien un DirectoryEntry

        entry.copyTo(dir_dest, new_name || this.getBasenameOfPath(path));
    }

    /**
     * Create a directory. Automatically create all the parent directories needed.
     * @param path Path to the new directory
     */
    public async mkdir(path: string) : Promise<DirectoryEntry> {
        const steps = path.split('/');

        let cur_entry = await this.get() as DirectoryEntry;

        for (const step of steps) {
            if (step.trim() === ".") {
                continue;
            }

            cur_entry = await new Promise((resolve, reject) => {
                cur_entry.getDirectory(step, {
                    create: true,
                    exclusive: false
                }, resolve, reject);
            });
        }

        return cur_entry;
    }

    /**
     * Write a file containing content.
     * File and containing folder(s) are created automatically.
     * If file already exists, by default, file content are truncated and replaced by content.
     * 
     * @param path Path of the file relative to working directory
     * @param content Content of the file. Can be a string, File instance, Blob or ArrayBuffer. 
     * Other types will be serialized automatically using JSON.stringify()
     * 
     * @param append Determine that the function should write at the end of the file.
     */
    public async write(path: string | FileEntry, content: any, append = false) : Promise<FileEntry> {
        content = this.toBlob(content);
        let entry: FileEntry = path as FileEntry;

        if (typeof path === 'string') {
            const dirname = this.getDirUrlOfPath(path);
            const filename = this.getBasenameOfPath(path);
    
            entry = await this.getFileEntryOfDirEntry(
                dirname ? await this.mkdir(dirname) : await this.get() as DirectoryEntry, 
                filename
            );
        }

        return new Promise((resolve, reject) => {
            // Fonction pour écrire le fichier après vidage
            const finally_write = () => {
                entry.createWriter((fileWriter) => {
                    fileWriter.onerror = function (e) {
                        reject(e);
                    };

                    if (append) {
                        fileWriter.seek(fileWriter.length);
                    }
    
                    // @ts-ignore
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

    /**
     * Read a existing file located in path
     * @param path Path to the file or file via FileEntry
     * @param mode Read mode. Should be a FileHelperReadMode instance. By default, read as classic text.
     */
    public async read(path: string | FileEntry, mode = FileHelperReadMode.text) : Promise<any | string | ArrayBuffer> {
        if (mode === FileHelperReadMode.internalURL) {
            return (typeof path === 'string' ? 
                (await this.get(path) as FileEntry).toInternalURL() : 
                path.toInternalURL()
            );
        }
        
        let file = await this.getFileOfEntry(
            typeof path === 'string' ? await this.get(path) as FileEntry : path
        );
        
        return this.readFileAs(file, mode);
    }

    public readJSON(path: string | FileEntry) : Promise<any> {
        return this.read(path, FileHelperReadMode.json);
    }

    public toInternalURL(path: string | FileEntry) : Promise<string> {
        return this.read(path, FileHelperReadMode.internalURL);
    }

    public readDataURL(path: string | FileEntry) : Promise<string> {
        return this.read(path, FileHelperReadMode.url);
    }

    /**
     * Get an existing file or directory using an absolute path
     * @param path Complete path
     */
    public absoluteGet(path: string) : Promise<Entry> {
        return new Promise((resolve, reject) => {
            window.resolveLocalFileSystemURL(path, resolve, reject);
        }); 
    }

    /**
     * Get an entry from a path.
     * If you want to read a file, use read() instead.
     * @param path Path to file or directory
     */
    public get(path: string = "") : Promise<Entry> {
        return this.absoluteGet(this.pwd() + "/" + path);
    }

    /**
     * Create / get a file and return FileEntry of it. Autocreate need parent directories.
     * @param path Path to file
     */
    public async touch(path: string) : Promise<FileEntry> {
        const dirname = this.getDirUrlOfPath(path);
        const filename = this.getBasenameOfPath(path);

        const dir = dirname ? await this.mkdir(dirname) : await this.get() as DirectoryEntry;

        return this.getFileEntryOfDirEntry(dir, filename);
    }

    /**
     * Get content of a directory.
     * 
     * @param path Path of thing to explore
     * @param option_string Options. Can be e, l, d or f. See docs.
     */
    public async ls(path: string = "", option_string: string = "") : Promise<string[] | FileStats[] | Entry[]> {
        const entry = await this.get(path);

        if (entry.isFile) {
            return [path];
        }

        const e = option_string.includes("e");
        const l = option_string.includes("l");
        const f = option_string.includes("f");
        const d = option_string.includes("d");

        path = path.replace(/\/$/, '');

        if (path) {
            path += "/";
        }

        let entries = await new Promise((resolve, reject) => {
            const reader = (entry as DirectoryEntry).createReader();
            reader.readEntries(resolve, reject);
        }) as Entry[];

        entries = entries.filter(ele => {
            if (f) {
                return ele.isFile;
            }
            else if (d) {
                return ele.isDirectory;
            }
            return true;
        });

        if (e) {
            return entries;
        }

        if (l) {
            const paths: FileStats[] = [];

            for (const e of entries) {
                if (e.isDirectory) {
                    paths.push({
                        name: path + e.name,
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
                paths.push(path + e.name); 
            }
    
            return paths;
        }
    }

    /**
     * Remove a file or a directory.
     * @param path Path of the file to remove. Do **NOT** remove root, use empty() !
     * @param r Make rm recursive. 
     * If r = false and path contains a directory that is not empty, remove will fail
     */
    public async rm(path: string, r = false) : Promise<void> {
        const entry = await this.get(path);

        if (entry.toInternalURL().replace(/\/$/, '') === this.pwd()) {
            return Promise.reject(new Error("Can't remove root directory !"));
        }

        if (entry.isDirectory && r) {
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

    /**
     * Remove all content of a directory.
     * @param path Path of the directory
     * @param r Make empty recursive. 
     * If r = false and path contains a directory that is not empty, empty will fail
     */
    public async empty(path: string, r = false) : Promise<void> {
        const entries = await this.ls(path) as string[];

        for (const e of entries) {
            const entry = await this.get(e);

            if (entry.isDirectory && r) {
                await new Promise((resolve, reject) => {
                    (entry as DirectoryEntry).removeRecursively(resolve, reject);
                }); 
            }
            else {
                await new Promise((resolve, reject) => {
                    (entry as FileEntry).remove(resolve, reject);
                });
            }
        }
    }

    /**
     * Get information about a file
     * @param path Path to a file
     */
    public async stats(path: string) : Promise<FileStats> {
        const entry = await this.getFileOfEntry(await this.get(path) as FileEntry);

        return this.getStatsFromFile(entry);
    }

    /**
     * Change current instance root to another directory
     * @param path **DIRECTORY** path (must NOT be a file)
     * @param relative Specify if path is relative to current directory
     */
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

        if (new_root.isFile) {
            throw new Error("New root can't be a file !");
        }
        
        this.root = new_root.toInternalURL().replace(/\/$/, '');
    }

    /**
     * Get current root directory of this instance
     */
    public pwd() : string {
        if (this.root === null) {
            throw new Error("Object is not initialized");
        }
        return this.root;
    }

    /**
     * see pwd()
     */
    public toString() : string {
        return this.pwd();
    }

    /* FUNCTIONS WITH DIRECTORY ENTRIES, FILE ENTRIES */

    /**
     * Get a FileEntry from a DirectoryEntry. File will be created if "filename" does not exists in DirectoryEntry
     * @param dir DirectoryEntry
     * @param filename Name a the file to get
     */
    public getFileEntryOfDirEntry(dir: DirectoryEntry, filename: string) : Promise<FileEntry> {
        return new Promise((resolve, reject) => {
            dir.getFile(filename, { create: true, exclusive: false }, resolve, reject);
        });
    }

    /**
     * Get a File object from a FileEntry
     * @param file FileEntry
     */
    public getFileOfEntry(file: FileEntry) : Promise<File> {
        return new Promise((resolve, reject) => {
            file.file(resolve, reject);
        });
    }
    
    /**
     * Read a file object as selected mode
     * @param file File obj
     * @param mode Mode
     */
    public readFileAs(file: File, mode = FileHelperReadMode.text) : Promise<any | string | ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
    
            r.onload = function() {
                if (mode === FileHelperReadMode.array) {
                    resolve(this.result as ArrayBuffer);
                }
                if (mode === FileHelperReadMode.json) {
                    resolve(JSON.parse(this.result as string));
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

    /**
     * Get informations about a single file using a File instance
     * @param entry File
     */
    protected getStatsFromFile(entry: File) : FileStats {
        return {
            mtime: entry.lastModified,
            mdate: new Date(entry.lastModified),
            size: entry.size,
            name: entry.name
        };
    }

    /* HELPERS */

    /**
     * Convert string, ArrayBuffer, File, classic objects to a Blob instance
     * @param s 
     */
    public toBlob(s: any) : Blob {
        if (s instanceof Blob || s instanceof File) {
            return s;
        }
        else if (typeof s === 'string' || s instanceof ArrayBuffer) {
            return new Blob([s]);
        }
        else if (typeof s === "object") {
            return this.toBlob(JSON.stringify(s));
        }
        else {
            return this.toBlob(String(s));
        }
    }
}
