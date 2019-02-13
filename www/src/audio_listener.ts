import { getModal, initModal, getModalPreloader } from "./helpers";
import { Logger } from "./logger";

export function startRecorderModal() {
    const modal = getModal();
    const instance = initModal({}, getModalPreloader("Chargement"));

    instance.open();

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            // @ts-ignore
            const mediaRecorder = new MediaRecorder(stream);
            let audioChunks = [];
            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            modal.innerHTML = `
            <div class="modal-content">
                <a href="#!" class="btn" id="record">Enregistrer</a>
                <a href="#!" class="btn" id="stop">Arrêter</a>
            </div>
            `;

            document.getElementById('record').onclick = function() {
                audioChunks = [];
                mediaRecorder.start();
            }
            
           
            mediaRecorder.addEventListener("stop", () => {
                const audioBlob = new Blob(audioChunks);
                const audioUrl = URL.createObjectURL(audioBlob);

                Logger.info(audioBlob.size.toString());
                // const audio = new Audio(audioUrl);
                // audio.play();
            });

            document.getElementById('stop').onclick = function() {
                console.log('stopeed');
                mediaRecorder.stop();
            }
        });
}
