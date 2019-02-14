import { getModal, initModal, getModalPreloader, blobToBase64 } from "./helpers";
import { FormEntity } from "./form_schema";
import { Logger } from "./logger";

export function newModalRecord(button: HTMLButtonElement, input: HTMLInputElement, ele: FormEntity) {
    let recorder = null;

    const modal = getModal();
    const instance = initModal({}, getModalPreloader("Chargement", ''));

    instance.open();
    let audioContent = null;
    let blobSize = 0;

    modal.innerHTML = `
    <div class="modal-content">
        <h5 style="margin-bottom: 25px;margin-top: 0;">${ele.label}</h5>
        <a href="#!" class="btn col s12 orange" id="__media_record_record">Enregistrer</a>
        <a href="#!" class="btn hide col s12 red" id="__media_record_stop">Arrêter</a>
        <div class=clearb></div>
        <div id="__media_record_player" class="modal-record-audio-player">${input.value ? `
            <figure>
                <figcaption>Enregistrement</figcaption>
                <audio controls src="${input.value}"></audio>
            </figure>
        ` : ''}</div>
    </div>
    <div class="modal-footer">
        <a href="#!" class="btn-flat green-text right ${input.value ? "" : "hide"}" id="__media_record_save">Sauvegarder</a>
        <a href="#!" class="btn-flat red-text left" id="__media_record_cancel">Annuler</a>
        <div class="clearb"></div>
    </div>
    `;

    const btn_start = document.getElementById('__media_record_record');
    const btn_stop = document.getElementById('__media_record_stop');
    const btn_confirm = document.getElementById('__media_record_save');
    const btn_cancel = document.getElementById('__media_record_cancel');
    const player = document.getElementById('__media_record_player');

    //add events to those 2 buttons
    btn_start.addEventListener("click", startRecording);
    btn_stop.addEventListener("click", stopRecording);

    btn_confirm.onclick = function() {
        if (audioContent) {
            input.value = audioContent;
            input.dataset.duration = ((blobSize / 256000) * 8).toString();

            // Met à jour le bouton
            const duration = (blobSize / 256000) * 8;
            button.innerText = "Enregistrement (" + duration.toFixed(0) + "s" + ")";
            button.classList.remove('blue');
            button.classList.add('green');
        }
        
        instance.close();
        // Clean le modal et donc les variables associées
        modal.innerHTML = "";
    }

    btn_cancel.onclick = function() {
        instance.close();
        // Clean le modal et donc les variables associées
        modal.innerHTML = "";
    }
    
    function startRecording() {
        btn_start.classList.add('hide');
        btn_stop.classList.remove('hide');

        player.innerHTML = "<p class='flow-text center'>Enregistrement en cours</p>";

        // @ts-ignore MicRecorder, credit to https://github.com/closeio/mic-recorder-to-mp3
        recorder = new MicRecorder({
            bitRate: 256
        });

        recorder.start().catch((e) => {
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
            .getMp3().then(([buffer, blob]) => {
                blobSize = blob.size;

                blobToBase64(blob).then(function(base64) {
                    audioContent = base64;
        
                    btn_confirm.classList.remove('hide');
                    player.innerHTML = `<figure>
                        <figcaption>Enregistrement</figcaption>
                        <audio controls src="${base64}"></audio>
                    </figure>`;
        
                    btn_start.classList.remove('hide');
                });
            }).catch((e) => {
                M.toast({html:'Impossible de lire votre enregistrement'});
                Logger.error("Enregistrement échoué:", e.message);
            });
    }
}
