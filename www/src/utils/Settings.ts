/**
 * Représente les paramètres globaux de l'application.
 * Ils sont stockés dans le localStorage.
 */
class AppSettings {
    protected _sync_freq = 30; /** En minutes */
    protected _sync_bg = true; /** Activer la sync en arrière plan */

    constructor() {
        if (localStorage.getItem('_settings_sync_freq')) {
            this._sync_freq = Number(localStorage.getItem('_settings_sync_freq'));
        }
        if (localStorage.getItem('_settings_sync_bg')) {
            this._sync_bg = localStorage.getItem('_settings_sync_bg') === 'true';
        }
    }

    public set sync_bg(val: boolean) {
        this._sync_bg = val;

        localStorage.setItem('_settings_sync_bg', String(val));
    }

    public get sync_bg() : boolean {
        return this._sync_bg;
    }

    public set sync_freq(val: number) {
        this._sync_freq = val;

        localStorage.setItem('_settings_sync_freq', String(val));
    }

    public get sync_freq() : number {
        return this._sync_freq;
    }
}

export const Settings = new AppSettings;

/**
 * Permet de sauvegarder en arrière-plan.
 * Cette classe ne doit pas être utilisée seule. SyncManager s'en occupe.
 */
class BgSyncObj {
    //// credit to https://github.com/transistorsoft/cordova-plugin-background-fetch
    protected background_sync: any = null;
    protected fetchCb: Function = null;
    protected failCb: Function = null;

    public isInit() {
        return this.background_sync !== null;
    }

    /**
     * Initialise le module de background sync. Cette fonction ne doit être appelée qu'une seule fois !
     * @param fetchCb Fonction à appeler lors du fetch
     * @param failCb Fonction à appeler si échec
     * @param interval Intervalle entre deux synchronisations (en minutes)
     */
    public init(fetchCb: Function, failCb: Function, interval: number = Settings.sync_freq) : boolean {
        this.background_sync = ("BackgroundFetch" in window) ? window["BackgroundFetch"] : null;

        return this.initBgSync(fetchCb, failCb, interval);
    }

    /**
     * Modifie le module de background sync en cours d'exécution
     * @param fetchCb Fonction à appeler lors du fetch
     * @param failCb Fonction à appeler si échec
     * @param interval Intervalle entre deux synchronisations (en minutes)
     */
    public initBgSync(fetchCb: Function, failCb: Function, interval: number = Settings.sync_freq) : boolean {
        if (this.background_sync) {
            this.stop();

            console.log("Starting sync with interval: " + interval);

            this.failCb = failCb;
            this.fetchCb = fetchCb;

            this.background_sync.configure(
                fetchCb, 
                () => {
                    // Désinitialise l'objet
                    Settings.sync_bg = false;
                    this.background_sync = null;
                    failCb();
                }, {
                    minimumFetchInterval: interval, // <-- default is 15
                    stopOnTerminate: false   // <-- Android only
                }
            );  

            return true;
        }
        else {
            return false;
        }
    }

    public finish() {
        if (this.background_sync) {
            this.background_sync.finish();
        }
    }

    /**
     * Change la fréquence de synchronisation
     * @param interval Intervalle entre deux synchronisations (en minutes)
     */
    public changeBgSyncInterval(interval: number) : boolean {
        if (this.background_sync) {
            return this.initBgSync(this.fetchCb, this.failCb, interval);
        }

        return false;
    }

    public start() {
        if (this.background_sync) {
            this.background_sync.start(() => {
                console.log("Starting fetch");
            }, () => {
                console.log("Failed to start fetch");
            });
        }
    }

    public stop() {
        try {
            if (this.background_sync) {
                this.background_sync.stop(() => {
                    console.log("Stopping sync");
                }, () => {
                    console.log("Failed to stop sync");
                });
            }
        } catch (e) { /** Ne fait rien si échoue à stopper (ce n'était pas lancé) */ }
    }
}

export const BackgroundSync = new BgSyncObj;
