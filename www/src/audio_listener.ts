import { getModal, initModal, getModalPreloader, blobToBase64 } from "./helpers";
import { Logger } from "./logger";
import { MP3_BITRATE } from "./main";

export interface RecordResult {
    /** base64 représentant le fichier audio */
    content: string;
    /** Durée (en secondes) du fichier */
    duration: number
}

/**
 * Crée un modal pour enregistrer du son.
 * Retourne une promesse réussie avec RecordResult si un nouvel enregistrement est généré.
 * Si aucun changement n'est fait ou annulation, rejette la promesse.
 * 
 * @param title Titre à donner au modal
 * @param default_value Fichier base64 pour faire écouter un enregistrement effectuée précédemment
 */
export function newModalRecord(title: string, default_value?: string) : Promise<RecordResult> {
    let recorder: any = null;

    const modal = getModal();
    const instance = initModal({}, getModalPreloader("Chargement"));

    instance.open();
    let audioContent: string | null = null;
    let blobSize = 0;

    modal.innerHTML = `
    <div class="modal-content">
        <h5 style="margin-top: 0;">${title}</h5>
        <p style="margin-top: 0; margin-bottom: 25px;">Approchez votre micro de la source, puis appuyez sur enregistrer.</p>
        <a href="#!" class="btn col s12 orange" id="__media_record_record">Enregistrer</a>
        <a href="#!" class="btn hide col s12 red" id="__media_record_stop">Arrêter</a>
        <div class=clearb></div>
        <div id="__media_record_player" class="modal-record-audio-player">${default_value ? `
            <figure>
                <figcaption>Enregistrement</figcaption>
                <audio controls src="${default_value}"></audio>
            </figure>
        ` : ''}</div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat green-text right ${default_value ? "" : "hide"}" id="__media_record_save">Sauvegarder</a>
        <a href="#!" class="btn-flat red-text left" id="__media_record_cancel">Annuler</a>
        <div class="clearb"></div>
    </div>
    `;

    const btn_start = document.getElementById('__media_record_record');
    const btn_stop = document.getElementById('__media_record_stop');
    const btn_confirm = document.getElementById('__media_record_save');
    const btn_cancel = document.getElementById('__media_record_cancel');
    const player = document.getElementById('__media_record_player');
    
    function startRecording() {
        btn_start.classList.add('hide');
        player.innerHTML = `<p class='flow-text center'>
            Initialisation...
        </p>`;

        // @ts-ignore MicRecorder, credit to https://github.com/closeio/mic-recorder-to-mp3
        recorder = new MicRecorder({
            bitRate: MP3_BITRATE
        });

        recorder.start().then(function() {
            player.innerHTML = `<p class='flow-text center'>
                <i class='material-icons blink fast v-bottom red-text'>mic</i><br>
                Enregistrement en cours
            </p>`;
            btn_stop.classList.remove('hide');
        }).catch((e: Error) => {
            Logger.error("Impossible de lancer l'écoute.", e);
            player.innerHTML = "<p class='flow-text center red-text bold-text'>Impossible de lancer l'écoute.</p>";
        });
    }
    
    function stopRecording() {
        // Once you are done singing your best song, stop and get the mp3.
        btn_stop.classList.add('hide');
        player.innerHTML = "<p class='flow-text center'>Conversion en cours...</p>";

        recorder
            .stop()
            .getMp3()
            .then(([, blob]: [ArrayBuffer, Blob]) => {
                blobSize = blob.size;

                return blobToBase64(blob);
            })
            .then((base64: string) => {
                audioContent = base64;
    
                btn_confirm.classList.remove('hide');
                player.innerHTML = `<figure>
                    <figcaption>Enregistrement</figcaption>
                    <audio controls src="${base64}"></audio>
                </figure>`;
    
                btn_start.classList.remove('hide');
            })
            .catch((e: Error) => {
                M.toast({html:'Impossible de lire votre enregistrement'});
                Logger.error("Enregistrement échoué:", e.message);
            });
    }

    //add events to those 2 buttons
    btn_start.addEventListener("click", startRecording);
    btn_stop.addEventListener("click", stopRecording);

    return new Promise((resolve, reject) => {
        btn_confirm.onclick = function () {
            instance.close();
            // Clean le modal et donc les variables associées
            modal.innerHTML = "";

            if (audioContent) {
                const duration = (blobSize / (MP3_BITRATE * 1000)) * 8;

                resolve({
                    content: audioContent,
                    duration
                });
            }

            // Rien n'a changé.
            reject();
        }
    
        btn_cancel.onclick = function () {
            instance.close();
            // Clean le modal et donc les variables associées
            modal.innerHTML = "";
    
            try {
                if (recorder)
                    recorder.stop();
            } catch (e) { }

            reject();
        }
    });
}
