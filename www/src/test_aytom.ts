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

export function test_jarvis() {
    let j: Artyom = Jarvis.Jarvis;
    j.fatality();

    setTimeout(function(){
        j.addCommands([{
            smart: true,
            indexes: ["Test *"],
            action: function(i, w){
                alert(w);
            }
        }, {
            smart: true,
            indexes: ["Busy bird *", "hello *"],
            action: function(i, w) {
                alert(w);
            }
        }]);

        j.initialize({
            lang:"fr-FR",
            debug: true, // Show what recognizes in the Console
            listen: true, // Start listening after this
            speed: 1,
            continuous: false
        });

        M.toast({html: "écoute"});

        // let last_text = "";

        // const d = j.newDictation({
        //     continuous: false,
        //     onResult:function(text){
        //         // Show the Recognized text in the console
        //         if (text === "") {
        //             M.toast({html: "Fin d'écoute. Texte final: " + last_text});
        //             console.log("Final", last_text);
        //             d.stop();
        //             return;
        //         }
        //         else {
        //             M.toast({html: "Texte reconnu: "+text});
        //             last_text = text;
        //         }
        //     },
        //     onStart:function(){
        //         console.log("Dictation started by the user");
        //     }
        // });

        // d.start();
    }, 250);
}
