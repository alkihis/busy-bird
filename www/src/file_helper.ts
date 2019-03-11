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

export type EntryObject = { [path: string]: Entry[] };

/**
 * Glob to regex function.
 * Credit to [Nick Fitzgerald](https://github.com/fitzgen/glob-to-regexp).
 * NOT used as package to limit dependencies
 * 
 * COPYRIGHT NOTICE
 * see above function
 * 
 * @param glob 
 * @param flags 
 */
function globToRegex(glob: string, flags: string = "") : RegExp {
    let str = glob;

    // The regexp we are building, as a string.
    let reStr = "";

    // Whether we are matching so called "extended" globs (like bash) and should
    // support single character matching, matching ranges of characters, group
    // matching, etc.
    const extended = true;
    const globstar = true;

    // If we are doing extended matching, this boolean is true when we are inside
    // a group (eg {*.html,*.js}), and false otherwise.
    let inGroup = false;

    let c: string;
    for (let i = 0, len = str.length; i < len; i++) {
        c = str[i];

        switch (c) {
            case "/":
            case "$":
            case "^":
            case "+":
            case ".":
            case "(":
            case ")":
            case "=":
            case "!":
            case "|":
                reStr += "\\" + c;
                break;

            case "?":
                if (extended) {
                    reStr += ".";
                    break;
                }

            case "[":
            case "]":
                if (extended) {
                    reStr += c;
                    break;
                }

            case "{":
                if (extended) {
                    inGroup = true;
                    reStr += "(";
                    break;
                }

            case "}":
                if (extended) {
                    inGroup = false;
                    reStr += ")";
                    break;
                }

            case ",":
                if (inGroup) {
                    reStr += "|";
                    break;
                }
                reStr += "\\" + c;
                break;

            case "*":
                // Move over all consecutive "*"'s.
                // Also store the previous and next characters
                const prevChar = str[i - 1];
                let starCount = 1;
                while (str[i + 1] === "*") {
                    starCount++;
                    i++;
                }
                const nextChar = str[i + 1];

                if (!globstar) {
                    // globstar is disabled, so treat any number of "*" as one
                    reStr += ".*";
                } else {
                    // globstar is enabled, so determine if this is a globstar segment
                    const isGlobstar = starCount > 1                      // multiple "*"'s
                        && (prevChar === "/" || prevChar === undefined)   // from the start of the segment
                        && (nextChar === "/" || nextChar === undefined)   // to the end of the segment

                    if (isGlobstar) {
                        // it's a globstar, so match zero or more path segments
                        reStr += "((?:[^/]*(?:\/|$))*)";
                        i++; // move over the "/"
                    } else {
                        // it's not a globstar, so only match one path segment
                        reStr += "([^/]*)";
                    }
                }
                break;
            default:
                reStr += c;
        }
    }

    // When regexp 'g' flag is specified don't
    // constrain the regular expression with ^ & $
    if (!flags || !~flags.indexOf('g')) {
        reStr = "^" + reStr + "$";
    }

    return new RegExp(reStr, flags);
}
/**
*  Copyright notice for globToRegex
*   All rights reserved.
*
*   Redistribution and use in source and binary forms, with or without modification, 
*   are permitted provided that the following conditions are met:
*
*   Redistributions of source code must retain the above copyright notice, 
*   this list of conditions and the following disclaimer.
*
*   Redistributions in binary form must reproduce the above copyright notice, this list of conditions and 
*   the following disclaimer in the documentation and/or other materials provided with the distribution.
*
*   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
*   AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, 
*   THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. 
*   IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, 
*   INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES 
*   (
*       INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; 
*       LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION
*   ) 
*   HOWEVER CAUSED 
*   AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
*   (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, 
*   EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

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
                (await this.get(path)).toInternalURL() : 
                path.toInternalURL()
            );
        }
        
        let file = await this.getFileOfEntry(
            typeof path === 'string' ? await this.get(path) as FileEntry : path
        );
        
        return this.readFileAs(file, mode);
    }

    /**
     * Read a file and parse content as JSON
     * @param path 
     */
    public readJSON(path: string | FileEntry) : Promise<any> {
        return this.read(path, FileHelperReadMode.json);
    }

    /**
     * Returns internal URL (absolute file path to the file/dir)
     * @param path 
     */
    public toInternalURL(path: string | Entry) : Promise<string> {
        return this.read(path as FileEntry, FileHelperReadMode.internalURL);
    }

    /**
     * Read file content as base64 data URL (url that begin with data:xxx/xxxx;base64,)
     * @param path 
     */
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
     * @param option_string Options. Can be e, l, d, r or f. See docs. Warning: recursive can be very slow.
     */
    public async ls(path: string = "", option_string: string = "") : Promise<string[] | FileStats[] | EntryObject> {
        const entry = await this.get(path);

        if (entry.isFile) {
            return [path];
        }

        const e = option_string.includes("e");
        const l = option_string.includes("l");
        const f = option_string.includes("f");
        const d = option_string.includes("d");
        const r = option_string.includes("r");

        // Enlève le slash terminal et le slash initial (les chemins ne doivent jamais commencer par /)
        path = path.replace(/\/$/, '');
        path = path.replace(/^\//, '');

        let entries = await this.entriesOf(entry as DirectoryEntry);

        let obj_entries: EntryObject = { [path]: entries };

        if (r) {
            // Si la func est récursive, on recherche dans tous les dossiers
            // L'appel sera fait récursivement dans les nouveaux ls
            for (const e of entries) {
                if (e.isDirectory) {
                    obj_entries = {...obj_entries, ...(await this.ls(path + "/" + e.name, "re") as EntryObject)};
                }
            }
        }

        // On filtre en fonction de directory/file only ou non
        for (const rel_path in obj_entries) {
            obj_entries[rel_path] = obj_entries[rel_path].filter(ele => {
                if (f) {
                    return ele.isFile;
                }
                else if (d) {
                    return ele.isDirectory;
                }
                return true;
            });
        }

        // On a demandé les entrées
        if (e) {
            return obj_entries;
        }

        // Demande les stats du fichier
        if (l) {
            const paths: FileStats[] = [];

            for (const rel_path in obj_entries) {
                for (const e of obj_entries[rel_path]) {
                    if (e.isDirectory) {
                        paths.push({
                            name: (rel_path ? rel_path + "/" : "") + e.name,
                            mdate: undefined,
                            mtime: undefined,
                            size: 4096
                        });
                    }
                    else {
                        const entry = await this.getFileOfEntry(e as FileEntry);
                        const stats = this.getStatsFromFile(entry);
                        stats.name = (rel_path ? rel_path + "/" : "") + stats.name;

                        paths.push(stats);
                    }
                }
            }

            return paths;
        }
        // Sinon, on traite les entrées comme un string[]
        else {
            const paths: string[] = [];
            
            for (const rel_path in obj_entries) {
                for (const e of obj_entries[rel_path]) {
                    // Enregistrement du bon nom
                    paths.push((rel_path ? rel_path + "/" : "") + e.name); 
                }
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
     * Find files into a directory using a glob bash pattern.
     * @param pattern 
     * @param recursive Make glob function recursive. To use ** pattern, you MUST use recursive mode.
     * @param regex_flags Add additionnal flags to regex pattern matching
     */
    public async glob(pattern: string, recursive = false, regex_flags = "") : Promise<string[]> {
        const entries = await this.ls(undefined, "e" + (recursive ? "r" : "")) as EntryObject;

        const matched: string[] = [];

        const regex = globToRegex(pattern, regex_flags);

        for (const path in entries) {
            for (const e of entries[path]) {
                const real_name = (path ? path + "/" : "") + e.name;

                if (real_name.match(regex)) {
                    matched.push(real_name);
                }
            }  
        }

        return matched;
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
     * Get entries presents in a directory via a DirectoryEntry or via directory path.
     * @param entry 
     */
    public async entriesOf(entry: DirectoryEntry | string) : Promise<Entry[]> {
        if (typeof entry === 'string') {
            entry = await this.get(entry) as DirectoryEntry;

            if (!entry.isDirectory) {
                throw new Error("Path is not a directory path");
            }
        }

        return new Promise((resolve, reject) => {
            const reader = (entry as DirectoryEntry).createReader();
            reader.readEntries(resolve, reject);
        });
    }

    /**
     * Get entries from numerous paths
     * @param paths Array of string paths
     */
    public entries(...paths: string[]) : Promise<Entry[]> {
        const e: Promise<Entry>[] = [];

        for (const p of paths) {
            e.push(this.get(p));
        }

        return Promise.all(e);
    }

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
                    try {
                        resolve(JSON.parse(this.result as string));
                    } catch (e) {
                        reject(e);
                    }
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
            else if (mode === FileHelperReadMode.text || mode === FileHelperReadMode.json) {
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
