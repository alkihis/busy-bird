// options de la reconnaissance vocale
const options = {
    language: "fr-FR",
    prompt: "Parlez maintenant"
};

export function talk(sentence: string) : Promise<void> {
    const u = new SpeechSynthesisUtterance();
    u.text = sentence;
    u.lang = 'fr-FR';

    return new Promise((resolve) => {
        u.onend = () => { resolve() };

        speechSynthesis.speak(u);
    });
}

/**
 * Récupère le texte dicté par l'utilisateur
 * @param prompt_text Message affiché à l'utilisateur expliquant ce qu'il est censé dire
 * @param as_array Au lieu de renvoyer la phrase la plus probable dite par l'utilisateur, renvoie toutes les possibilités
 * @returns Promesse résolue contenant le texte dicté si réussi. Dans tous les autres cas, promesse rompue.
 */
export function prompt(prompt_text = "Parlez maintenant", as_array = false) : Promise<string | string[]> {
    return new Promise(function(resolve, reject) {
        options.prompt = prompt_text;

        // @ts-ignore
        if (window.plugins && window.plugins.speechRecognition) {
            // @ts-ignore
            window.plugins.speechRecognition.startListening(
                function(matches: string[]) {
                    // Le premier match est toujours le meilleur
                    if (matches.length > 0) {
                        if (as_array) {
                            resolve(matches);
                            return;
                        }
                        resolve(matches[0]);
                    }
                    else {
                        // La reconnaissance a échoué
                        reject();
                    }
                }, 
                function() {
                    // Polyfill pour le navigateur web
                    if (device.platform === "browser") {
                        // @ts-ignore
                        const speech_reco = window.webkitSpeechRecognition || window.SpeechRecognition;

                        const recognition = new speech_reco();
                        recognition.onresult = (event: any) => {
                            if (event.results && event.results.length > 0) {
                                if (as_array) {
                                    const array: string[] = [];
                                    for (const r of event.results) {
                                        for (const e of r) {
                                            array.push(e.transcript);
                                        }
                                    }

                                    resolve(array);
                                    return;
                                }

                                const speechToText = event.results[0][0].transcript;
                            
                                recognition.stop();
                                resolve(speechToText);
                            }
                            else {
                                reject();
                            }
                        }
                        recognition.onerror = reject;

                        recognition.start();
                        M.toast({html: prompt_text});
                    }
                    else {
                        reject();
                    }
                }, 
                options
            )
        }
        else {
            reject();
        }
    });
}  

export function testOptionsVersusExpected(options: [string, string][], dicted: string[], match_all = false) : string | string[] {
    const matches: string[] = [];
    // Conversion des choses dictées et corrections mineures (genre le a toujours détecté en à)
    dicted = dicted.map(match => match.toLowerCase().replace(/à/g, 'a').replace(/ /g, ''));
    
    for (const opt of options) {
        const cur_val = opt[0].toLowerCase().replace(/à/g, 'a').replace(/ /g, '');
        
        for (const match of dicted) {
            // Si les valeurs sans espace sont identiques
            if (cur_val === match) {
                if (match_all) {
                    matches.push(opt[1]);
                }
                else {
                    return opt[1];
                }
            }
        }
    }

    if (matches.length > 0) {
        return matches;
    }

    return null;
}

export function testMultipleOptionsVesusExpected(options: [string, string][], dicted: string[], keyword = "stop") : string[] {
    // Explose en fonction du keyword
    const possibilities: string[][] = dicted.map(match => match.toLowerCase().split(new RegExp('\\b' + keyword + '\\b', 'i')));

    const finded_possibilities: string[][] = [];

    for (const p of possibilities) {
        // On va de la plus probable à la moins probable
        const vals = testOptionsVersusExpected(options, p, true) as string[];

        if (vals) {
            finded_possibilities.push(vals);
        }
    }

    if (finded_possibilities.length > 0) {
        // Tri en fonction de la taille du tableau (plus grand en premier) et récupère celui qui a le plus de match
        return finded_possibilities.sort((a, b) => b.length - a.length)[0];
    }

    return null;
}
