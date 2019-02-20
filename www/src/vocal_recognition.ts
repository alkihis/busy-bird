// options de la reconnaissance vocale
const options = {
    language: "fr-FR",
    prompt: "Parlez maintenant"
};

/**
 * Récupère le texte dicté par l'utilisateur
 * @param prompt_text Message affiché à l'utilisateur expliquant ce qu'il est censé dire
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
                function(error) {
                    // @ts-ignore Polyfill pour le navigateur web
                    if (device.platform === "browser") {
                        // @ts-ignore
                        const speech_reco = window.webkitSpeechRecognition || window.SpeechRecognition;

                        const recognition = new speech_reco();
                        recognition.onresult = (event) => {
                            if (event.results && event.results.length > 0) {
                                if (as_array) {
                                    const array = [];
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

// export function oldPrompt(text: string = "", options: string[] = ["*"]) : Promise<string> {
//     return new Promise(function(resolve, reject) {
//         const j = Jarvis.Jarvis;
//         j.fatality();
        
//         j.initialize({
//             lang:"fr-FR",
//             debug: true, // Show what recognizes in the Console
//             listen: true, // Start listening after this
//             speed: 1,
//             continuous: false
//         });

//         try {
//             j.newPrompt({
//                 question: text,
//                 //We set the smart property to true to accept wildcards
//                 smart: true,
//                 options,
//                 beforePrompt: () => {
//                     setTimeout(function() {
//                         M.toast({html: "Parlez maintenant"})
//                     }, 400);
//                 },
//                 onMatch: (i, wildcard) => { // i returns the index of the given options    
//                     let action;
            
//                     action = () => {
//                         resolve(wildcard);
//                     };
            
//                     // A function needs to be returned in onMatch event
//                     // in order to accomplish what you want to execute
//                     return action;                       
//                 }
//             });
//         } catch (e) {
//             // Artyom crashes on Cordova. Catching error.
//             // Logger.error(e.stack, e.message);
//         }
//     });
// }
