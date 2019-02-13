import { getDir } from "./helpers";

// Objet Logger
// Sert à écrire dans un fichier de log formaté
// à la racine du système de fichiers

export enum LogLevel {
    debug = "debug", info = "info", warn = "warn", error = "error"
}

/**
 * Logger
 * Permet de logger dans un fichier texte des messages.
 */
export const Logger = new class {
    protected fileEntry: any;
    protected _onWrite: boolean = false;
    protected delayed: [string, LogLevel][] = [];
    protected waiting_callee: Function[] = [];

    protected init_done = false;
    protected init_waiting_callee: Function[] = [];

    constructor() { /* YOU MUST CALL init() WHEN APP IS READY */ }

    /**
     * Initialise le logger. Doit être réalisé après app.init() et changeDir().
     * Pour vérifier si le logger est initialisé, utilisez onReady(). 
     */
    public init() : void {
        getDir((dirEntry) => {
            // Creates a new file or returns the file if it already exists.
            dirEntry.getFile("log.txt", {create: true}, (fileEntry) => {
                this.fileEntry = fileEntry;
                this.init_done = true;
                this.onWrite = false;

                let func: Function;
                while (func = this.init_waiting_callee.pop()) {
                    func();
                }
            }, function(err) {
                console.log("Unable to create file log.", err);
            });
        }, null, function(err) {
            console.log("Unable to enable log.", err);
        });
    }

    /**
     * Vrai si le logger est prêt à écrire / lire dans le fichier de log.
     */
    protected isInit() : boolean {
        return this.init_done;
    }

    /**
     * Si aucun callback n'est précisé, renvoie une Promise qui se résout quand
     * le logger est prêt à recevoir des instructions. 
     * @param callback? Function Si précisé, la fonction ne renvoie rien et le callback sera exécuté quand le logger est prêt
     */
    public onReady(callback?: (any?) => void) : Promise<void> {
        const oninit: Promise<void> = new Promise((resolve, reject) => {
            if (this.isInit()) {
                resolve();
            }
            else {
                this.init_waiting_callee.push(resolve);
            }
        });

        if (callback) {
            oninit.then(callback);
        }
        else {
            return oninit;
        }
    }

    protected get onWrite() : boolean {
        return this._onWrite;
    }

    protected set onWrite(value: boolean) {
        this._onWrite = value;

        if (!value && this.delayed.length) {
            // On lance une tâche "delayed" avec le premier élément de la liste (le premier inséré)
            this.write(...this.delayed.shift());
        }
        else if (!value && this.waiting_callee.length) {
            // Si il n'y a aucune tâche en attente, on peut lancer les waiting function
            let func: Function;
            while (func = this.waiting_callee.pop()) {
                func();
            }
        }
    }

    /**
     * Écrit dans le fichier de log le contenu de text avec le niveau level.
     * Ajoute automatique date et heure au message ainsi qu'un saut de ligne à la fin.
     * Si level vaut debug, rien ne sera affiché dans la console.
     * @param text Message
     * @param level Niveau de log
     */
    public write(text: any, level: LogLevel = LogLevel.warn) : void {
        // Create a FileWriter object for our FileEntry (log.txt).
        if (!this.isInit()) {
            this.delayWrite(text, level);
            return;
        }

        this.fileEntry.createWriter((fileWriter) => {
            fileWriter.onwriteend = () => {
                this.onWrite = false;
            };
    
            fileWriter.onerror = (e) => {
                console.log("Logger: Failed file write: " + e.toString());
                this.onWrite = false;
            };
    
            // Append to file
            try {
                fileWriter.seek(fileWriter.length);
            }
            catch (e) {
                console.log("Logger: File doesn't exist!", e);
                return;
            }

            if (!this.onWrite) {


                if (level === LogLevel.info) {
                    console.log(text);
                }
                else if (level === LogLevel.warn) {
                    console.warn(text);
                }
                else if (level === LogLevel.error) {
                    console.error(text);
                }
                text = this.createDateHeader(level) + " " + JSON.stringify(text);
                text += "\n";

                this.onWrite = true;
                fileWriter.write(new Blob([text]));
            }
            else {
                this.delayWrite(text, level);
            }
        });
    }

    /**
     * Crée une date formatée
     * @param level 
     */
    protected createDateHeader(level: LogLevel) : string {
        const date = new Date();

        const m = ((date.getMonth() + 1) < 10 ? "0" : "") + String(date.getMonth() + 1);
        const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
    
        const hour = ((date.getHours()) < 10 ? "0" : "") + String(date.getHours());
        const min = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
        const sec = ((date.getSeconds()) < 10 ? "0" : "") + String(date.getSeconds());

        return `[${level}] [${d}/${m}/${date.getFullYear()} ${hour}:${min}:${sec}]`;
    }

    protected delayWrite(text: any, level: LogLevel) : void {
        this.delayed.push([text, level]);
    }

    /**
     * Si aucun callback n'est précisé, renvoie une Promise qui se résout quand
     * le logger a fini toutes ses opérations d'écriture. 
     * @param callbackSuccess? Function Si précisé, la fonction ne renvoie rien et le callback sera exécuté quand toutes les opérations d'écriture sont terminées.
     */
    public onWriteEnd(callbackSuccess?: (any?) => void) : Promise<void> {
        const onwriteend: Promise<void> = new Promise((resolve, reject) => {
            if (!this.onWrite && this.isInit()) {
                resolve();
            }
            else {
                this.waiting_callee.push(resolve);
            }
        });

        if (callbackSuccess) {
            onwriteend.then(callbackSuccess)
        }
        else {
            return onwriteend;
        }
    }

    /**
     * Vide le fichier de log.
     * @returns Promise La promesse est résolue quand le fichier est vidé, rompue si échec
     */
    public clearLog() : Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isInit()) {
                reject("Logger must be initialized");
            }

            this.fileEntry.createWriter((fileWriter) => {
                fileWriter.onwriteend = () => {
                    this.onWrite = false;
                    resolve();
                };
        
                fileWriter.onerror = (e) => {
                    console.log("Logger: Failed to truncate.");
                    this.onWrite = false;
                    reject();
                };
    
                if (!this.onWrite) {
                    fileWriter.truncate(0);
                }
                else {
                    console.log("Please call this function when log is not writing.");
                    reject();
                }
            });
        });   
    }

    /**
     * Affiche tout le contenu du fichier de log dans la console via console.log()
     * @returns Promise La promesse est résolue avec le contenu du fichier si lecture réussie, rompue si échec
     */
    public consoleLogLog() : Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.isInit()) {
                reject("Logger must be initialized");
            }

            this.fileEntry.file(function (file) {
                const reader = new FileReader();
        
                reader.onloadend = function() {
                    console.log(this.result);
                    resolve(this.result as string);
                };
        
                reader.readAsText(file);
            }, function() {
                console.log("Logger: Unable to open file.");
                reject();
            });
        });
    }

    /// Méthodes d'accès rapide
    public debug(text: any) : void {
        this.write(text, LogLevel.debug);
    }

    public info(text: any) : void {
        this.write(text, LogLevel.info);
    }

    public warn(text: any) : void {
        this.write(text, LogLevel.warn);
    }

    public error(text: any) : void {
        this.write(text, LogLevel.error);
    }
};
