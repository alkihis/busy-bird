import { APP_NAME } from "./home";
import { APP_VERSION } from "../main";
import { convertHTMLToElement } from "../utils/helpers";

const used_softwares = [
    ["Apache Cordova", "https://cordova.apache.org/"],
    ["Adobe PhoneGap", "https://phonegap.com/"],
    ["TypeScript", "https://www.typescriptlang.org/"],
    ["Localforage", "https://github.com/localForage/localForage"],
    ["RequireJS", "https://requirejs.org/"],
    ["File Helper", "https://www.npmjs.com/package/cordova-file-helper"],
    ["Android Permissions plugin", "https://github.com/NeoLSN/cordova-plugin-android-permissions"],
    ["Background sync plugin", "https://github.com/transistorsoft/cordova-plugin-background-fetch"],
    ["Speech recognition plugin", "https://github.com/pbakondy/cordova-plugin-speechrecognition"],
    ["Native toast plugin", "https://www.npmjs.com/package/cordova-plugin-x-toast"],
    ["Diagnostic plugin", "https://github.com/dpa99c/cordova-diagnostic-plugin"],
    ["Accessibility plugin", "https://github.com/phonegap/phonegap-mobile-accessibility"],
    ["Speech synthesis plugin", "https://www.npmjs.com/package/phonegap-plugin-speech-synthesis"],
    ["Geolib", "https://www.npmjs.com/package/geolib"],
];

export function loadCredits(base: HTMLElement) : void {
    const container = convertHTMLToElement("<div class='container relative-container'></div>");

    container.innerHTML = `
        <h4 class="right-align">${APP_NAME}</h4>
        <h6 class="right-align">version ${APP_VERSION}</h6>

        <img src="img/logo.png" style="position: absolute; top: -20px; left: -10px; height: 7rem; z-index: -1;">

        <p class="flow-text">
            ${APP_NAME} is an application made my three students,
            Louis Béranger, Romuald Marin and Émilien N'Guyen,
            for biologists who do specie tracking, 
            initially destined to the LBBE laboratory.
        </p>

        <h5>License</h5>

        <p class="flow-text">
            This software is distributed "as it", without any warrany,
            under "Attribution-NonCommercial-ShareAlike" (CC BY-NC-SA 4.0)
            license.
        </p>

        <h5>Used softwares</h5>

        <p class="flow-text">
            The following list will present used softwares in this project.
        </p>
        <ul class="flow-text">
            ${used_softwares.map(val => "<li><a data-href='" + val[1] + "'>" + val[0] + "</a></li>").join('')}
        </ul>

        <h5>Partners</h5>

        <a data-href="https://lbbe.univ-lyon1.fr/"><img class="lbbe-logo" src="img/lbbe.png"></a>
        <a data-href="https://www.univ-lyon1.fr/"><img class="lbbe-logo" src="img/ucbl.png"></a>

        <div class="clearb" style="margin-bottom: 50px"></div>
    `;

    for (const link of container.querySelectorAll('a[data-href]')) {
        (link as HTMLElement).onclick = () => {
            window.open((link as HTMLElement).dataset.href, '_system');
        };
    }

    base.innerHTML = "";
    base.appendChild(container);
}
