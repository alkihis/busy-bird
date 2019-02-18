import Artyom from './arytom/artyom';

export const KEYWORD = "Jarvis";
export const Jarvis = new class {
    protected _Jarvis: Artyom;

    constructor() {
        this.Jarvis = null;
    }

    get Jarvis() {
        return this._Jarvis;
    }

    set Jarvis(ary: any) {
        this._Jarvis = new Artyom();
    }
};

export function prompt(text: string = "Valeur ?", options: string[] = ["*"]) : Promise<string> {
    return new Promise(function(resolve, reject) {
        const j = Jarvis.Jarvis;
        j.fatality();
        
        j.initialize({
            lang:"fr-FR",
            debug: true, // Show what recognizes in the Console
            listen: true, // Start listening after this
            speed: 1,
            continuous: false
        });

        try {
            j.newPrompt({
                question: text,
                //We set the smart property to true to accept wildcards
                smart: true,
                options,
                beforePrompt: () => {
                    setTimeout(function() {
                        M.toast({html: "Parlez maintenant"})
                    }, 400);
                },
                onMatch: (i, wildcard) => { // i returns the index of the given options    
                    let action;
            
                    action = () => {
                        resolve(wildcard);
                    };
            
                    // A function needs to be returned in onMatch event
                    // in order to accomplish what you want to execute
                    return action;                       
                }
            });
        } catch (e) {
            // Artyom crashes on Cordova. Catching error.
            // Logger.error(e.stack, e.message);
        }
    });
}