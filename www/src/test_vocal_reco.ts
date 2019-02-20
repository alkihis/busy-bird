import { prompt } from "./vocal_recognition";

/// FICHIER DE TEST DE LA RECONNAISSANCE VOCALE
export function talk(sentence: string) {
    const u = new SpeechSynthesisUtterance();
    u.text = sentence;
    u.lang = 'fr-FR';
    speechSynthesis.speak(u);
}

export function launchQuizz(base: HTMLElement) : void {
    const if_bad_answer = [
        "Oups, mauvaise réponse",
        "Vous vous êtes planté !"
    ];
    
    const if_good_answer = [
        "Bravo, vous avez trouvé la bonne réponse !",
        "Excellent, vous avez trouvé !"
    ];
    
    const list_question_rep = {
        "Combien font 4 x 8 ?": "32",
        "Qui est l'actuel premier ministre?": "édouard Philippe",
        "Quel pays a remporté la coupe du monde de football en 2014?": "Allemagne",
        "Dans quelle ville italienne se situe l'action de Roméo et Juliette?": "Vérone",
        "Comment désigne-t-on une belle-mère cruelle?": "Marâtre",
        "Qui était le dieu de la guerre dans la mythologie grecque?": "Arès",
        "Quel est le plus long fleuve de France?": "Loire",
        "Quel animal est Pan-pan dans Bambi?": "Lapin",
        "Avec la laine de quel animal fait-on du cachemire?": "Chèvre",
        "Quelle est la première ville du monde à s'être dotée d'un métro?": "Londres",
        "Dans quel état des Etats-Unis le Grand Canyon se trouve-t-il?": "Arizona",
        "Combien de paires de côtes possède-t-on?": "Douze",
        "Quel os du squelette humain est le plus long et le plus solide?": "Fémur",
        "Quel arbre est connu pour être le plus grand au monde?": "Séquoia",
        "Quelle est l'unité de la tension électrique?": "Volt",
        "De quel animal le Sphinx de Gizeh a-t-il le corps?": "Lion",
        "Quel est le premier long métrage d'animation de Disney?": "Blanche-neige",
        "Quelle partie de l'oeil est colorée?": "Iris",
        "Quel pays a décidé de quitter l'Union Européenne en 2016?": ["Angleterre", "Royaume-Uni"],
        "Quelle est la plus grande planète du système solaire?": "Jupiter",
        "Quelle est la plus grande artère du corps?": "Aorte",
        "Quelle est la capitale de l’Inde?": "New Delhi",
        "Quel est le nom du principal indice boursier de la place de Paris ?": "CAC 40",
        "Qu’est-ce qu’un ouistiti ?": "singe",
        "Qui etait le président français en 1995 ?": ["Jacques Chirac", "Chirac"],
        "Quel légume entre dans la composition du tzatziki ?": "concombre",
        "De quel pays, les Beatles sont-ils originaires ?": ["Angleterre", "Royaume-Uni"],
        "Quel acteur français a été l’image de la marque de pâtes Barilla dans les années 90 ?": "Depardieu",
        "Quel animal est l'emblème de la marque automobile Ferrari ?": "cheval",
        "Dans la mythologie grecque qui est le maitre des dieux ?": "Zeus",
        "De quel pays la pizza est elle originaire ?": "Italie",
        "Quel est le dessert préféré d’Homer Simpson ?": "donuts",
        "Que trouve-t-on généralement au fond d'un verre de Martini ?": "Olive",
    };

    base.innerHTML = `
    <div class="container">
    <h4 class="center">RomuQuizz</h4>
    <div class="divider divider-margin"></div>

    <div class="card-panel card-perso flow-text">
        <span class="blue-text text-darken-2">Question:</span>
        <span class="orange-text text-darken-3" id="__question_visual"></span>
    </div>

    <p class="flow-text center" id="__question_tip"></p>

    <div class="center center-block">
        <div class="btn red" id="__question_speak"><i class="material-icons left">mic</i>Parler</div>
    </div>

    <div class="clearb"></div>
    <div class="divider divider-margin"></div>

    <div class="center center-block">
        <div class="btn green" id="__question_other">Autre question !</div>
    </div>
    </div>
    `;

    const question_text = document.getElementById('__question_visual');
    const answer_btn = document.getElementById('__question_speak');
    const message_block = document.getElementById('__question_tip');
    const new_question = document.getElementById('__question_other');

    let actual_question = "";

    answer_btn.onclick = function() {
        prompt(actual_question, true)
            .then(values => {
                message_block.classList.remove('blue-text', 'red-text');

                if (parseAnswer(values as string[])) {
                    // Trouvé !
                    talk(if_good_answer[Math.floor(Math.random() * if_good_answer.length)]);
                    message_block.classList.add('blue-text');
                    message_block.innerText = "Bravo, vous avez trouvé la bonne réponse : " +
                    (typeof list_question_rep[actual_question] === 'string' ? list_question_rep[actual_question] :
                     list_question_rep[actual_question].join('/'))
                    + " !";
                }
                else {
                    talk(if_bad_answer[Math.floor(Math.random() * if_bad_answer.length)]);
                    message_block.classList.add('red-text');
                    message_block.innerText = "Mauvaise réponse !";
                }
            })
            .catch(() => {
                talk("Veuillez répéter");
                message_block.classList.remove('blue-text');
                message_block.classList.add('red-text');
                message_block.innerText = "J'ai eu du mal à vous entendre...";
            });
    }

    new_question.onclick = newQuestion;

    function parseAnswer(possible_responses: string[]) : boolean {
        console.log(possible_responses);

        if (typeof list_question_rep[actual_question] === 'string') {
            for (const rep of possible_responses) {
                if (rep.toLowerCase() === list_question_rep[actual_question].toLowerCase()) {
                    return true;
                }
            }
        }
        else {
            for (const rep of possible_responses) {
                for (const answ of list_question_rep[actual_question]) {
                    if (rep.toLowerCase() === answ.toLowerCase()) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    function newQuestion() : void {
        const keys = Object.keys(list_question_rep);

        let position: number;
        do {
            position = Math.floor(Math.random() * ((keys.length - 1) + 1));
        } while (actual_question === keys[position]);

        actual_question = keys[position];

        question_text.innerText = actual_question;
        message_block.innerText = "";
        talk(actual_question);
    }

    newQuestion();
}
