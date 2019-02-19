import { UserManager } from "./user_manager";
import { SyncManager } from "./SyncManager";
import { hasGoodConnection, toValidUrl, getDirP, dirEntries } from "./helpers";
import { APP_VERSION } from "./main";
import { Forms } from "./form_schema";
import { createLocationInputSelector } from "./location";

export const APP_NAME = "Busy Bird";

export async function initHomePage(base: HTMLElement) {
    base.innerHTML = `
    <div class="flex-center-aligner home-top-element">
        <img src="img/logo.png" class="home-logo">
    </div>
    <div class="container relative-container">
        <span class="very-tiny-text version-text">Version ${APP_VERSION}</span>
        <p class="flow-text center">
            Bienvenue dans ${APP_NAME}, l'application qui facilite le suivi d'espèces sur le terrain !
        </p>
        <p class="flow-text red-text">
            ${!UserManager.logged ? `
                Vous n'êtes pas connecté dans l'application. Vous ne serez pas en mesure de
                saisir de nouvelles entrées sans être authentifié. Veuillez vous connecter via
                les paramètres de l'application.
            ` : ''}
        </p>
        <div id="__home_container"></div>
    </div>
    `;

    const home_container = document.getElementById('__home_container');
    
    // Calcul du nombre de formulaires en attente de synchronisation
    try {
        const remaining_count = await SyncManager.remainingToSync();

        if (hasGoodConnection()) {
            if (remaining_count > 15) {
                home_container.innerHTML = createCardPanel(
                    `<span class="blue-text text-darken-2">Vous avez beaucoup d'éléments à synchroniser (${remaining_count} entrées).</span><br>
                    <span class="blue-text text-darken-2">Rendez-vous dans les paramètres pour lancer la synchronisation.</span>`,
                    "Synchronisation"
                );
            }
            else if (remaining_count > 0) {
                home_container.innerHTML = createCardPanel(
                    `<span class="blue-text text-darken-2">
                        Vous avez ${remaining_count} entrée${remaining_count > 1 ? 's' : ''} en attente de synchronisation.
                    </span>`
                );
            }
        }
        else if (remaining_count > 0) {
            home_container.innerHTML = createCardPanel(`
                <span class="blue-text text-darken-2">Vous avez des éléments en attente de synchronisation.</span><br>
                <span class="red-text text-darken-2">Lorsque vous retrouverez une bonne connexion Internet,</span>
                <span class="blue-text text-darken-2">lancez une synchronisation dans les paramètres.</span>`
            );
        }
    } catch (e) {
        home_container.innerHTML = createCardPanel(
            `<span class="red-text text-darken-2">Impossible de relever les entrées disponibles.</span><br>
            <span class="red-text text-darken-2">Cette erreur est possiblement grave. 
            Nous vous conseillons de ne pas enregistrer de formulaire.</span>`,
            "Erreur"
        );
    }

    // Montre l'utilisateur connecté
    if (UserManager.logged) {
        home_container.insertAdjacentHTML('beforeend', createCardPanel(
            `<span class="grey-text text-darken-1">${UserManager.username}</span>
            <span class="blue-text text-darken-2">est connecté-e.</span>`
        ));
    }

    // Nombre de formulaires enregistrés sur l'appareil
    try {
        const nb_files = (await getDirP('forms').then(dirEntries)).length;

        home_container.insertAdjacentHTML('beforeend', createCardPanel(
            `<span class="blue-text text-darken-2">${nb_files === 0 ? 'Aucune' : nb_files} entrée${nb_files > 1 ? 's' : ''} 
            ${nb_files > 1 ? 'sont' : 'est'} stockée${nb_files > 1 ? 's' : ''} sur cet appareil.</span>`
        ));
    } catch (e) {
        // Impossible d'obtenir les fichiers
        home_container.insertAdjacentHTML('beforeend', createCardPanel(
            `<span class="red-text text-darken-2">Impossible d'obtenir la liste des fichiers présents sur l'appareil.</span><br>
            <span class="red-text text-darken-2">Cette erreur est probablement grave. 
            Nous vous conseillons de ne pas tenter d'enregistrer un formulaire et de vérifier votre stockage interne.</span>`
        ));
    }

    Forms.onReady(function(available, current) {
        if (Forms.current_key === null) {
            return;
        }

        const locations = current.locations;

        // Navigation vers nichoir
        home_container.insertAdjacentHTML('beforeend',
            `<div class="divider divider-margin big"></div>
            <h6 style="margin-left: 10px; font-size: 1.25rem">Naviguer vers un habitat de ${current.name.toLowerCase()}</h6>`
        );

        createLocationInputSelector(home_container, document.createElement('input'), locations, true);
    });

    // Initialise les champs materialize et le select
    M.updateTextFields();
    $('select').formSelect();
}

function createCardPanel(html_text: string, title?: string) : string {
    return `
        <div class="card-panel card-perso">
            ${title ? `<h6 class="no-margin-top">${title}</h6>`: ''}
            <p class="flow-text no-margin-top no-margin-bottom">${html_text}</p>
        </div>
    `;
}


// ////// DEPRECATED
// /**
//  * Initie la sauvegarde: présente et vérifie les champs
//  *  @param type
//  */
// function initFormSave(type: string, force_name?: string, form_save?: FormSave): any {
//     console.log("Demarrage initFormSave")
//     // Ouverture du modal de verification
//     const modal = getModal();
//     const instance = initModal({ dismissible: true }, getModalPreloader(
//         "La vérification a probablement planté.<br>Merci de patienter quand même, on sait jamais.",
//         `<div class="modal-footer">
//             <a href="#!" id="cancel_verif" class="btn-flat red-text">Annuler</a>
//         </div>`
//     ));

//     modal.classList.add('modal-fixed-footer');

//     // Ouverture du premiere modal de chargement
//     instance.open();

//     // creation de la liste d'erreurs
//     let list_erreur = document.createElement("div");
//     list_erreur.classList.add("modal-content");

//     let element_erreur = document.createElement("ul");
//     element_erreur.classList.add("collection")
//     list_erreur.appendChild(element_erreur);

//     //Ajouter verification avant d'ajouter bouton valider
//     let erreur_critique: boolean = false;

//     //Parcours tous les elements remplits ou non
//     for (const input of document.getElementsByClassName('input-form-element')) {
//         //Attribution du label plutot que son nom interne
//         const i = input as HTMLInputElement;
//         const label = document.querySelector(`label[for="${i.id}"]`);
//         let name = i.name;
//         if (label) {
//             name = label.textContent;
//         };

//         const contraintes: any = {};
//         if (i.dataset.constraints) {
//             i.dataset.constraints.split(';').map((e: string) => {
//                 const [name, value] = e.split('=');
//                 contraintes[name] = value;
//             });
//         }

//         //Si l'attribut est obligatoirement requis et qu'il est vide -> erreur critique impossible de sauvegarder
//         if (i.required && !i.value) {
//             let erreur = document.createElement("li");
//             erreur.classList.add("collection-item");
//             erreur.innerHTML = "<strong style='color: red;' >" + name + "</strong> : Champ requis";
//             element_erreur.insertBefore(erreur, element_erreur.firstChild);
//             erreur_critique = true;
//             continue;
//         }

//         if (input.tagName === "SELECT" && (input as HTMLSelectElement).multiple) {
//             const selected = [...(input as HTMLSelectElement).options].filter(option => option.selected).map(option => option.value);
//             if (selected.length == 0) {
//                 let erreur = document.createElement("li");
//                 erreur.classList.add("collection-item");
//                 erreur.innerHTML = "<strong>" + name + "</strong> : Non renseigné";
//                 element_erreur.appendChild(erreur);
//             }
//         }
//         else if (i.type !== "checkbox") {
//             if (!i.value) {
//                 let erreur = document.createElement("li");
//                 erreur.classList.add("collection-item");
//                 erreur.innerHTML = "<strong>" + name + "</strong> : Non renseigné";
//                 element_erreur.appendChild(erreur);
//             }
//             else if (i.type === "number") {
//                 if (contraintes) {
//                     if ((Number(i.value) <= Number(contraintes['min'])) || (Number(i.value) >= Number(contraintes['max']))) {
//                         let erreur = document.createElement("li");
//                         erreur.classList.add("collection-item");
//                         erreur.innerHTML = "<strong>" + name + "</strong> : Intervale non respecté";
//                         element_erreur.appendChild(erreur);
//                     }
//                     // ajouter precision else if ()
//                 }
//             }
//             else if (i.type === "text") {
//                 if (contraintes) {
//                     if ((i.value.length < Number(contraintes['min'])) || (i.value.length > Number(contraintes['max']))) {
//                         let erreur = document.createElement("li");
//                         erreur.classList.add("collection-item");
//                         erreur.innerHTML = "<strong>" + name + "</strong> : Taille non respecté";
//                         element_erreur.appendChild(erreur);
//                     };
//                 }
//             }
//         }
//     }


//     modal.innerHTML = "";
//     modal.appendChild(list_erreur);
//     let footer = document.createElement("div");
//     footer.classList.add("modal-footer");
//     if (erreur_critique) {
//         footer.innerHTML = `<a href="#!" id="cancel_verif" class="btn-flat red-text">Corriger</a>
//         </div>`;
//     }
//     else {
//         footer.innerHTML = `<a href="#!" id="cancel_verif" class="btn-flat red-text">Corriger</a><a href="#!" id="valid_verif" class="btn-flat green-text">Valider</a>
//         </div>`;
//     }

//     modal.appendChild(footer);
//     document.getElementById("cancel_verif").onclick = function() {
//         getModalInstance().close();
//     };
//     if (!erreur_critique) {
//         document.getElementById("valid_verif").onclick = function() {
//             getModalInstance().close();
//             saveForm(type, force_name, form_save);
//         }


//     };
//     // Si champ invalide suggéré (dépassement de range, notamment) ou champ vide, message d'alerte, mais

// }


