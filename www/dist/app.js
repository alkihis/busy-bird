"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// Lance main.ts
require(['main']);
/**
 * Artyom.js is a voice control, speech recognition and speech synthesis JavaScript library.
 *
 * @requires {webkitSpeechRecognition && speechSynthesis}
 * @license MIT
 * @version 1.0.6
 * @copyright 2017 Our Code World (www.ourcodeworld.com) All Rights Reserved.
 * @author Carlos Delgado (https://github.com/sdkcarlos) and Sema García (https://github.com/semagarcia)
 * @see https://sdkcarlos.github.io/sites/artyom.html
 * @see http://docs.ourcodeworld.com/projects/artyom-js
 */
define("arytom/artyom", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /// <reference path="artyom.d.ts" />
    // Remove "export default " keywords if willing to build with `npm run artyom-build-window`
    class Artyom {
        // Triggered at the declaration of 
        constructor() {
            this.ArtyomCommands = [];
            this.ArtyomVoicesIdentifiers = {
                // German
                "de-DE": ["Google Deutsch", "de-DE", "de_DE"],
                // Spanish
                "es-ES": ["Google español", "es-ES", "es_ES", "es-MX", "es_MX"],
                // Italian
                "it-IT": ["Google italiano", "it-IT", "it_IT"],
                // Japanese
                "jp-JP": ["Google 日本人", "ja-JP", "ja_JP"],
                // English USA
                "en-US": ["Google US English", "en-US", "en_US"],
                // English UK
                "en-GB": ["Google UK English Male", "Google UK English Female", "en-GB", "en_GB"],
                // Brazilian Portuguese
                "pt-BR": ["Google português do Brasil", "pt-PT", "pt-BR", "pt_PT", "pt_BR"],
                // Portugal Portuguese
                // Note: in desktop, there's no voice for portugal Portuguese
                "pt-PT": ["Google português do Brasil", "pt-PT", "pt_PT"],
                // Russian
                "ru-RU": ["Google русский", "ru-RU", "ru_RU"],
                // Dutch (holland)
                "nl-NL": ["Google Nederlands", "nl-NL", "nl_NL"],
                // French
                "fr-FR": ["Google français", "fr-FR", "fr_FR"],
                // Polish
                "pl-PL": ["Google polski", "pl-PL", "pl_PL"],
                // Indonesian
                "id-ID": ["Google Bahasa Indonesia", "id-ID", "id_ID"],
                // Hindi
                "hi-IN": ["Google हिन्दी", "hi-IN", "hi_IN"],
                // Mandarin Chinese
                "zh-CN": ["Google 普通话（中国大陆）", "zh-CN", "zh_CN"],
                // Cantonese Chinese
                "zh-HK": ["Google 粤語（香港）", "zh-HK", "zh_HK"],
                // Native voice
                "native": ["native"]
            };
            // Important: retrieve the voices of the browser as soon as possible.
            // Normally, the execution of speechSynthesis.getVoices will return at the first time an empty array.
            if (window.hasOwnProperty('speechSynthesis')) {
                speechSynthesis.getVoices();
            }
            else {
                console.error("Artyom.js can't speak without the Speech Synthesis API.");
            }
            // This instance of webkitSpeechRecognition is the one used by Artyom.
            if (window.hasOwnProperty('webkitSpeechRecognition')) {
                this.ArtyomWebkitSpeechRecognition = new window.webkitSpeechRecognition();
            }
            else {
                console.error("Artyom.js can't recognize voice without the Speech Recognition API.");
            }
            this.ArtyomProperties = {
                lang: 'en-GB',
                recognizing: false,
                continuous: false,
                speed: 1,
                volume: 1,
                listen: false,
                mode: "normal",
                debug: false,
                helpers: {
                    redirectRecognizedTextOutput: null,
                    remoteProcessorHandler: null,
                    lastSay: null,
                    fatalityPromiseCallback: null
                },
                executionKeyword: null,
                obeyKeyword: null,
                speaking: false,
                obeying: true,
                soundex: false,
                name: null
            };
            this.ArtyomGarbageCollection = [];
            this.ArtyomFlags = {
                restartRecognition: false
            };
            this.ArtyomGlobalEvents = {
                ERROR: "ERROR",
                SPEECH_SYNTHESIS_START: "SPEECH_SYNTHESIS_START",
                SPEECH_SYNTHESIS_END: "SPEECH_SYNTHESIS_END",
                TEXT_RECOGNIZED: "TEXT_RECOGNIZED",
                COMMAND_RECOGNITION_START: "COMMAND_RECOGNITION_START",
                COMMAND_RECOGNITION_END: "COMMAND_RECOGNITION_END",
                COMMAND_MATCHED: "COMMAND_MATCHED",
                NOT_COMMAND_MATCHED: "NOT_COMMAND_MATCHED"
            };
            this.Device = {
                isMobile: false,
                isChrome: true
            };
            if (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i)) {
                this.Device.isMobile = true;
            }
            if (navigator.userAgent.indexOf("Chrome") == -1) {
                this.Device.isChrome = false;
            }
            /**
             * The default voice of Artyom in the Desktop. In mobile, you will need to initialize (or force the language)
             * with a language code in order to find an available voice in the device, otherwise it will use the native voice.
             */
            this.ArtyomVoice = {
                default: false,
                lang: "en-GB",
                localService: false,
                name: "Google UK English Male",
                voiceURI: "Google UK English Male"
            };
        }
        /**
         * Add dinamically commands to artyom using
         * You can even add commands while artyom is active.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/addcommands
         * @since 0.6
         * @param {Object | Array[Objects]} param
         * @returns {undefined}
         */
        addCommands(param) {
            let _this = this;
            let processCommand = (command) => {
                if (command.hasOwnProperty("indexes")) {
                    _this.ArtyomCommands.push(command);
                }
                else {
                    console.error("The given command doesn't provide any index to execute.");
                }
            };
            if (param instanceof Array) {
                for (let i = 0; i < param.length; i++) {
                    processCommand(param[i]);
                }
            }
            else {
                processCommand(param);
            }
            return true;
        }
        ;
        /**
         * The SpeechSynthesisUtterance objects are stored in the artyom_garbage_collector variable
         * to prevent the wrong behaviour of artyom.say.
         * Use this method to clear all spoken SpeechSynthesisUtterance unused objects.
         *
         * @returns {Array<any>}
         */
        clearGarbageCollection() {
            return this.ArtyomGarbageCollection = [];
        }
        ;
        /**
         * Displays a message in the console if the artyom propery DEBUG is set to true.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/debug
         * @returns {undefined}
         */
        debug(message, type) {
            let preMessage = `[v${this.getVersion()}] Artyom.js`;
            if (this.ArtyomProperties.debug === true) {
                switch (type) {
                    case "error":
                        console.log(`%c${preMessage}:%c ${message}`, 'background: #C12127; color: black;', 'color:black;');
                        break;
                    case "warn":
                        console.warn(message);
                        break;
                    case "info":
                        console.log(`%c${preMessage}:%c ${message}`, 'background: #4285F4; color: #FFFFFF', 'color:black;');
                        break;
                    default:
                        console.log(`%c${preMessage}:%c ${message}`, 'background: #005454; color: #BFF8F8', 'color:black;');
                        break;
                }
            }
        }
        /**
         * Artyom have it's own diagnostics.
         * Run this function in order to detect why artyom is not initialized.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/detecterrors
         * @param {type} callback
         * @returns {}
         */
        detectErrors() {
            let _this = this;
            if ((window.location.protocol) == "file:") {
                let message = "Error: running Artyom directly from a file. The APIs require a different communication protocol like HTTP or HTTPS";
                console.error(message);
                return {
                    code: "artyom_error_localfile",
                    message: message
                };
            }
            if (!_this.Device.isChrome) {
                let message = "Error: the Speech Recognition and Speech Synthesis APIs require the Google Chrome Browser to work.";
                console.error(message);
                return {
                    code: "artyom_error_browser_unsupported",
                    message: message
                };
            }
            if (window.location.protocol != "https:") {
                console.warn(`Warning: artyom is being executed using the '${window.location.protocol}' protocol. The continuous mode requires a secure protocol (HTTPS)`);
            }
            return false;
        }
        /**
         * Removes all the added commands of artyom.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/emptycommands
         * @since 0.6
         * @returns {Array}
         */
        emptyCommands() {
            return this.ArtyomCommands = [];
        }
        /**
         * Returns an object with data of the matched element
         *
         * @private
         * @param {string} comando
         * @returns {MatchedCommand}
         */
        execute(voz) {
            let _this = this;
            if (!voz) {
                console.warn("Internal error: Execution of empty command");
                return;
            }
            // If artyom was initialized with a name, verify that the name begins with it to allow the execution of commands.
            if (_this.ArtyomProperties.name) {
                if (voz.indexOf(_this.ArtyomProperties.name) != 0) {
                    _this.debug(`Artyom requires with a name "${_this.ArtyomProperties.name}" but the name wasn't spoken.`, "warn");
                    return;
                }
                // Remove name from voice command
                voz = voz.substr(_this.ArtyomProperties.name.length);
            }
            _this.debug(">> " + voz);
            /** @3
             * Artyom needs time to think that
             */
            for (let i = 0; i < _this.ArtyomCommands.length; i++) {
                let instruction = _this.ArtyomCommands[i];
                let opciones = instruction.indexes;
                let encontrado = -1;
                let wildy = "";
                for (let c = 0; c < opciones.length; c++) {
                    let opcion = opciones[c];
                    if (!instruction.smart) {
                        continue; //Jump if is not smart command
                    }
                    // Process RegExp
                    if (opcion instanceof RegExp) {
                        // If RegExp matches 
                        if (opcion.test(voz)) {
                            _this.debug(">> REGEX " + opcion.toString() + " MATCHED AGAINST " + voz + " WITH INDEX " + c + " IN COMMAND ", "info");
                            encontrado = parseInt(c.toString());
                        }
                        // Otherwise just wildcards
                    }
                    else {
                        if (opcion.indexOf("*") != -1) {
                            ///LOGIC HERE
                            let grupo = opcion.split("*");
                            if (grupo.length > 2) {
                                console.warn("Artyom found a smart command with " + (grupo.length - 1) + " wildcards. Artyom only support 1 wildcard for each command. Sorry");
                                continue;
                            }
                            //START SMART COMMAND
                            let before = grupo[0];
                            let later = grupo[1];
                            // Wildcard in the end
                            if ((later == "") || (later == " ")) {
                                if ((voz.indexOf(before) != -1) || ((voz.toLowerCase()).indexOf(before.toLowerCase()) != -1)) {
                                    wildy = voz.replace(before, '');
                                    wildy = (wildy.toLowerCase()).replace(before.toLowerCase(), '');
                                    encontrado = parseInt(c.toString());
                                }
                            }
                            else {
                                if ((voz.indexOf(before) != -1) || ((voz.toLowerCase()).indexOf(before.toLowerCase()) != -1)) {
                                    if ((voz.indexOf(later) != -1) || ((voz.toLowerCase()).indexOf(later.toLowerCase()) != -1)) {
                                        wildy = voz.replace(before, '').replace(later, '');
                                        wildy = (wildy.toLowerCase()).replace(before.toLowerCase(), '').replace(later.toLowerCase(), '');
                                        wildy = (wildy.toLowerCase()).replace(later.toLowerCase(), '');
                                        encontrado = parseInt(c.toString());
                                    }
                                }
                            }
                        }
                        else {
                            console.warn("Founded command marked as SMART but have no wildcard in the indexes, remove the SMART for prevent extensive memory consuming or add the wildcard *");
                        }
                    }
                    if ((encontrado >= 0)) {
                        encontrado = parseInt(c.toString());
                        break;
                    }
                }
                if (encontrado >= 0) {
                    _this.triggerEvent(_this.ArtyomGlobalEvents.COMMAND_MATCHED);
                    let response = {
                        index: encontrado,
                        instruction: instruction,
                        wildcard: {
                            item: wildy,
                            full: voz
                        }
                    };
                    return response;
                }
            } //End @3
            /** @1
             * Search for IDENTICAL matches in the commands if nothing matches
             * start with a index match in commands
             */
            for (let i = 0; i < _this.ArtyomCommands.length; i++) {
                let instruction = _this.ArtyomCommands[i];
                let opciones = instruction.indexes;
                let encontrado = -1;
                /**
                 * Execution of match with identical commands
                 */
                for (let c = 0; c < opciones.length; c++) {
                    let opcion = opciones[c];
                    if (instruction.smart) {
                        continue; //Jump wildcard commands
                    }
                    if ((voz === opcion)) {
                        _this.debug(">> MATCHED FULL EXACT OPTION " + opcion + " AGAINST " + voz + " WITH INDEX " + c + " IN COMMAND ", "info");
                        encontrado = parseInt(c.toString());
                        break;
                    }
                    else if ((voz.toLowerCase() === opcion.toLowerCase())) {
                        _this.debug(">> MATCHED OPTION CHANGING ALL TO LOWERCASE " + opcion + " AGAINST " + voz + " WITH INDEX " + c + " IN COMMAND ", "info");
                        encontrado = parseInt(c.toString());
                        break;
                    }
                }
                if (encontrado >= 0) {
                    _this.triggerEvent(_this.ArtyomGlobalEvents.COMMAND_MATCHED);
                    let response = {
                        index: encontrado,
                        instruction: instruction
                    };
                    return response;
                }
            } //End @1
            /**
             * Step 3 Commands recognition.
             * If the command is not smart, and any of the commands match exactly then try to find
             * a command in all the quote.
             */
            for (let i = 0; i < _this.ArtyomCommands.length; i++) {
                let instruction = _this.ArtyomCommands[i];
                let opciones = instruction.indexes;
                let encontrado = -1;
                /**
                 * Execution of match with index
                 */
                for (let c = 0; c < opciones.length; c++) {
                    if (instruction.smart) {
                        continue; //Jump wildcard commands
                    }
                    let opcion = opciones[c];
                    if ((voz.indexOf(opcion) >= 0)) {
                        _this.debug(">> MATCHED INDEX EXACT OPTION " + opcion + " AGAINST " + voz + " WITH INDEX " + c + " IN COMMAND ", "info");
                        encontrado = parseInt(c.toString());
                        break;
                    }
                    else if (((voz.toLowerCase()).indexOf(opcion.toLowerCase()) >= 0)) {
                        _this.debug(">> MATCHED INDEX OPTION CHANGING ALL TO LOWERCASE " + opcion + " AGAINST " + voz + " WITH INDEX " + c + " IN COMMAND ", "info");
                        encontrado = parseInt(c.toString());
                        break;
                    }
                }
                if (encontrado >= 0) {
                    _this.triggerEvent(_this.ArtyomGlobalEvents.COMMAND_MATCHED);
                    let response = {
                        index: encontrado,
                        instruction: instruction
                    };
                    return response;
                }
            } //End Step 3
            /**
             * If the soundex options is enabled, proceed to process the commands in case that any of the previous
             * ways of processing (exact, lowercase and command in quote) didn't match anything.
             * Based on the soundex algorithm match a command if the spoken text is similar to any of the artyom commands.
             * Example :
             * If you have a command with "Open Wallmart" and "Open Willmar" is recognized, the open wallmart command will be triggered.
             * soundex("Open Wallmart") == soundex("Open Willmar") <= true
             *
             */
            if (_this.ArtyomProperties.soundex) {
                for (let i = 0; i < _this.ArtyomCommands.length; i++) {
                    let instruction = _this.ArtyomCommands[i];
                    let opciones = instruction.indexes;
                    let encontrado = -1;
                    for (let c = 0; c < opciones.length; c++) {
                        let opcion = opciones[c];
                        if (instruction.smart) {
                            continue; //Jump wildcard commands
                        }
                        if (_this.soundex(voz) == _this.soundex(opcion)) {
                            _this.debug(`>> Matched Soundex command '${opcion}' AGAINST '${voz}' with index ${c}`, "info");
                            encontrado = parseInt(c.toString());
                            _this.triggerEvent(_this.ArtyomGlobalEvents.COMMAND_MATCHED);
                            let response = {
                                index: encontrado,
                                instruction: instruction
                            };
                            return response;
                        }
                    }
                }
            }
            _this.debug(`Event reached : ${_this.ArtyomGlobalEvents.NOT_COMMAND_MATCHED}`);
            _this.triggerEvent(_this.ArtyomGlobalEvents.NOT_COMMAND_MATCHED);
            return;
        }
        /**
         * Force artyom to stop listen even if is in continuos mode.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/fatality
         * @returns {Boolean}
         */
        fatality() {
            let _this = this;
            //fatalityPromiseCallback
            return new Promise((resolve, reject) => {
                // Expose the fatality promise callback to the helpers object of Artyom.
                // The promise isn't resolved here itself but in the onend callback of
                // the speechRecognition instance of artyom
                _this.ArtyomProperties.helpers.fatalityPromiseCallback = resolve;
                try {
                    // If config is continuous mode, deactivate anyway.
                    _this.ArtyomFlags.restartRecognition = false;
                    _this.ArtyomWebkitSpeechRecognition.stop();
                }
                catch (e) {
                    reject(e);
                }
            });
        }
        /**
         * Returns an array with all the available commands for artyom.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/getavailablecommands
         * @readonly
         * @returns {Array}
         */
        getAvailableCommands() {
            return this.ArtyomCommands;
        }
        /**
         * Artyom can return inmediately the voices available in your browser.
         *
         * @readonly
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/getvoices
         * @returns {Array}
         */
        getVoices() {
            return window.speechSynthesis.getVoices();
        }
        /**
         * Verify if the browser supports speechSynthesis.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/speechsupported
         * @returns {Boolean}
         */
        speechSupported() {
            return 'speechSynthesis' in window;
        }
        /**
         * Verify if the browser supports webkitSpeechRecognition.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/recognizingsupported
         * @returns {Boolean}
         */
        recognizingSupported() {
            return 'webkitSpeechRecognition' in window;
        }
        /**
         * Stops the actual and pendings messages that artyom have to say.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/shutup
         * @returns {undefined}
         */
        shutUp() {
            if ('speechSynthesis' in window) {
                do {
                    window.speechSynthesis.cancel();
                } while (window.speechSynthesis.pending === true);
            }
            this.ArtyomProperties.speaking = false;
            this.clearGarbageCollection();
        }
        /**
         * Returns an object with the actual properties of artyom.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/getproperties
         * @returns {object}
         */
        getProperties() {
            return this.ArtyomProperties;
        }
        /**
         * Returns the code language of artyom according to initialize function.
         * if initialize not used returns english GB.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/getlanguage
         * @returns {String}
         */
        getLanguage() {
            return this.ArtyomProperties.lang;
        }
        /**
         * Retrieves the used version of Artyom.js
         *
         * @returns {String}
         */
        getVersion() {
            return '1.0.6';
        }
        /**
         * Artyom awaits for orders when this function
         * is executed.
         *
         * If artyom gets a first parameter the instance will be stopped.
         *
         * @private
         * @returns {undefined}
         */
        hey(resolve, reject) {
            let start_timestamp;
            let artyom_is_allowed;
            let _this = this;
            /**
             * On mobile devices the recognized text is always thrown twice.
             * By setting the following configuration, fixes the issue
             */
            if (this.Device.isMobile) {
                this.ArtyomWebkitSpeechRecognition.continuous = false;
                this.ArtyomWebkitSpeechRecognition.interimResults = false;
                this.ArtyomWebkitSpeechRecognition.maxAlternatives = 1;
            }
            else {
                this.ArtyomWebkitSpeechRecognition.continuous = true;
                this.ArtyomWebkitSpeechRecognition.interimResults = true;
            }
            this.ArtyomWebkitSpeechRecognition.lang = this.ArtyomProperties.lang;
            this.ArtyomWebkitSpeechRecognition.onstart = () => {
                _this.debug("Event reached : " + _this.ArtyomGlobalEvents.COMMAND_RECOGNITION_START);
                _this.triggerEvent(_this.ArtyomGlobalEvents.COMMAND_RECOGNITION_START);
                _this.ArtyomProperties.recognizing = true;
                artyom_is_allowed = true;
                resolve();
            };
            /**
             * Handle all artyom posible exceptions
             *
             * @param {type} event
             * @returns {undefined}
             */
            this.ArtyomWebkitSpeechRecognition.onerror = (event) => {
                // Reject promise on initialization
                reject(event.error);
                // Dispath error globally (artyom.when)
                _this.triggerEvent(_this.ArtyomGlobalEvents.ERROR, {
                    code: event.error
                });
                if (event.error == 'audio-capture') {
                    artyom_is_allowed = false;
                }
                if (event.error == 'not-allowed') {
                    artyom_is_allowed = false;
                    if (event.timeStamp - start_timestamp < 100) {
                        _this.triggerEvent(_this.ArtyomGlobalEvents.ERROR, {
                            code: "info-blocked",
                            message: "Artyom needs the permision of the microphone, is blocked."
                        });
                    }
                    else {
                        _this.triggerEvent(_this.ArtyomGlobalEvents.ERROR, {
                            code: "info-denied",
                            message: "Artyom needs the permision of the microphone, is denied"
                        });
                    }
                }
            };
            /**
             * Check if continuous mode is active and restart the recognition.
             * Throw events too.
             *
             * @returns {undefined}
             */
            _this.ArtyomWebkitSpeechRecognition.onend = function () {
                if (_this.ArtyomFlags.restartRecognition === true) {
                    if (artyom_is_allowed === true) {
                        _this.ArtyomWebkitSpeechRecognition.start();
                        _this.debug("Continuous mode enabled, restarting", "info");
                    }
                    else {
                        console.error("Verify the microphone and check for the table of errors in sdkcarlos.github.io/sites/artyom.html to solve your problem. If you want to give your user a message when an error appears add an artyom listener");
                    }
                    _this.triggerEvent(_this.ArtyomGlobalEvents.COMMAND_RECOGNITION_END, {
                        code: "continuous_mode_enabled",
                        message: "OnEnd event reached with continuous mode"
                    });
                }
                else {
                    // If the fatality promise callback was set, invoke it
                    if (_this.ArtyomProperties.helpers.fatalityPromiseCallback) {
                        // As the speech recognition doesn't finish really, wait 500ms
                        // to trigger the real fatality callback
                        setTimeout(() => {
                            _this.ArtyomProperties.helpers.fatalityPromiseCallback();
                        }, 500);
                        _this.triggerEvent(_this.ArtyomGlobalEvents.COMMAND_RECOGNITION_END, {
                            code: "continuous_mode_disabled",
                            message: "OnEnd event reached without continuous mode"
                        });
                    }
                }
                _this.ArtyomProperties.recognizing = false;
            };
            /**
             * Declare the processor dinamycally according to the mode of artyom
             * to increase the performance.
             *
             * @type {Function}
             * @return
             */
            let onResultProcessor;
            // Process the recognition in normal mode
            if (_this.ArtyomProperties.mode == "normal") {
                onResultProcessor = (event) => {
                    if (!_this.ArtyomCommands.length) {
                        _this.debug("No commands to process in normal mode.");
                        return;
                    }
                    let cantidadResultados = event.results.length;
                    _this.triggerEvent(_this.ArtyomGlobalEvents.TEXT_RECOGNIZED);
                    for (let i = event.resultIndex; i < cantidadResultados; ++i) {
                        let identificated = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            let comando = _this.execute(identificated.trim());
                            // Redirect the output of the text if necessary
                            if (typeof (_this.ArtyomProperties.helpers.redirectRecognizedTextOutput) === "function") {
                                _this.ArtyomProperties.helpers.redirectRecognizedTextOutput(identificated, true);
                            }
                            if ((comando) && (_this.ArtyomProperties.recognizing == true)) {
                                _this.debug("<< Executing Matching Recognition in normal mode >>", "info");
                                _this.ArtyomWebkitSpeechRecognition.stop();
                                _this.ArtyomProperties.recognizing = false;
                                // Execute the command if smart
                                if (comando.wildcard) {
                                    comando.instruction.action(comando.index, comando.wildcard.item, comando.wildcard.full);
                                    // Execute a normal command
                                }
                                else {
                                    comando.instruction.action(comando.index);
                                }
                                break;
                            }
                        }
                        else {
                            // Redirect output when necesary
                            if (typeof (_this.ArtyomProperties.helpers.redirectRecognizedTextOutput) === "function") {
                                _this.ArtyomProperties.helpers.redirectRecognizedTextOutput(identificated, false);
                            }
                            if (typeof (_this.ArtyomProperties.executionKeyword) === "string") {
                                if (identificated.indexOf(_this.ArtyomProperties.executionKeyword) != -1) {
                                    let comando = _this.execute(identificated.replace(_this.ArtyomProperties.executionKeyword, '').trim());
                                    if ((comando) && (_this.ArtyomProperties.recognizing == true)) {
                                        _this.debug("<< Executing command ordered by ExecutionKeyword >>", 'info');
                                        _this.ArtyomWebkitSpeechRecognition.stop();
                                        _this.ArtyomProperties.recognizing = false;
                                        //Executing Command Action
                                        if (comando.wildcard) {
                                            comando.instruction.action(comando.index, comando.wildcard.item, comando.wildcard.full);
                                        }
                                        else {
                                            comando.instruction.action(comando.index);
                                        }
                                        break;
                                    }
                                }
                            }
                            _this.debug("Normal mode : " + identificated);
                        }
                    }
                };
            }
            // Process the recognition in quick mode
            if (_this.ArtyomProperties.mode == "quick") {
                onResultProcessor = (event) => {
                    if (!_this.ArtyomCommands.length) {
                        _this.debug("No commands to process.");
                        return;
                    }
                    let cantidadResultados = event.results.length;
                    _this.triggerEvent(_this.ArtyomGlobalEvents.TEXT_RECOGNIZED);
                    for (let i = event.resultIndex; i < cantidadResultados; ++i) {
                        let identificated = event.results[i][0].transcript;
                        if (!event.results[i].isFinal) {
                            let comando = _this.execute(identificated.trim());
                            //Redirect output when necesary
                            if (typeof (_this.ArtyomProperties.helpers.redirectRecognizedTextOutput) === "function") {
                                _this.ArtyomProperties.helpers.redirectRecognizedTextOutput(identificated, true);
                            }
                            if ((comando) && (_this.ArtyomProperties.recognizing == true)) {
                                _this.debug("<< Executing Matching Recognition in quick mode >>", "info");
                                _this.ArtyomWebkitSpeechRecognition.stop();
                                _this.ArtyomProperties.recognizing = false;
                                //Executing Command Action
                                if (comando.wildcard) {
                                    comando.instruction.action(comando.index, comando.wildcard.item);
                                }
                                else {
                                    comando.instruction.action(comando.index);
                                }
                                break;
                            }
                        }
                        else {
                            let comando = _this.execute(identificated.trim());
                            //Redirect output when necesary
                            if (typeof (_this.ArtyomProperties.helpers.redirectRecognizedTextOutput) === "function") {
                                _this.ArtyomProperties.helpers.redirectRecognizedTextOutput(identificated, false);
                            }
                            if ((comando) && (_this.ArtyomProperties.recognizing == true)) {
                                _this.debug("<< Executing Matching Recognition in quick mode >>", "info");
                                _this.ArtyomWebkitSpeechRecognition.stop();
                                _this.ArtyomProperties.recognizing = false;
                                //Executing Command Action
                                if (comando.wildcard) {
                                    comando.instruction.action(comando.index, comando.wildcard.item);
                                }
                                else {
                                    comando.instruction.action(comando.index);
                                }
                                break;
                            }
                        }
                        _this.debug("Quick mode : " + identificated);
                    }
                };
            }
            // Process the recognition in remote mode
            if (_this.ArtyomProperties.mode == "remote") {
                onResultProcessor = (event) => {
                    let cantidadResultados = event.results.length;
                    _this.triggerEvent(_this.ArtyomGlobalEvents.TEXT_RECOGNIZED);
                    if (typeof (_this.ArtyomProperties.helpers.remoteProcessorHandler) !== "function") {
                        return _this.debug("The remoteProcessorService is undefined.", "warn");
                    }
                    for (let i = event.resultIndex; i < cantidadResultados; ++i) {
                        let identificated = event.results[i][0].transcript;
                        _this.ArtyomProperties.helpers.remoteProcessorHandler({
                            text: identificated,
                            isFinal: event.results[i].isFinal
                        });
                    }
                };
            }
            /**
             * Process the recognition event with the previously
             * declared processor function.
             *
             * @param {type} event
             * @returns {undefined}
             */
            _this.ArtyomWebkitSpeechRecognition.onresult = (event) => {
                if (_this.ArtyomProperties.obeying) {
                    onResultProcessor(event);
                }
                else {
                    // Handle obeyKeyword if exists and artyom is not obeying
                    if (!_this.ArtyomProperties.obeyKeyword) {
                        return;
                    }
                    let temporal = "";
                    let interim = "";
                    for (let i = 0; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            temporal += event.results[i][0].transcript;
                        }
                        else {
                            interim += event.results[i][0].transcript;
                        }
                    }
                    _this.debug("Artyom is not obeying", "warn");
                    // If the obeyKeyword is found in the recognized text
                    // enable command recognition again
                    if (((interim).indexOf(_this.ArtyomProperties.obeyKeyword) > -1) || (temporal).indexOf(_this.ArtyomProperties.obeyKeyword) > -1) {
                        _this.ArtyomProperties.obeying = true;
                    }
                }
            };
            if (_this.ArtyomProperties.recognizing) {
                _this.ArtyomWebkitSpeechRecognition.stop();
                _this.debug("Event reached : " + _this.ArtyomGlobalEvents.COMMAND_RECOGNITION_END);
                _this.triggerEvent(_this.ArtyomGlobalEvents.COMMAND_RECOGNITION_END);
            }
            else {
                try {
                    _this.ArtyomWebkitSpeechRecognition.start();
                }
                catch (e) {
                    _this.triggerEvent(_this.ArtyomGlobalEvents.ERROR, {
                        code: "recognition_overlap",
                        message: "A webkitSpeechRecognition instance has been started while there's already running. Is recommendable to restart the Browser"
                    });
                }
            }
        }
        /**
         * Set up artyom for the application.
         *
         * This function will set the default language used by artyom
         * or notice the user if artyom is not supported in the actual
         * browser
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/initialize
         * @param {Object} config
         * @returns {Boolean}
         */
        initialize(config) {
            let _this = this;
            if (typeof (config) !== "object") {
                return Promise.reject("You must give the configuration for start artyom properly.");
            }
            if (config.hasOwnProperty("lang")) {
                _this.ArtyomVoice = _this.getVoice(config.lang);
                _this.ArtyomProperties.lang = config.lang;
            }
            if (config.hasOwnProperty("continuous")) {
                if (config.continuous) {
                    this.ArtyomProperties.continuous = true;
                    this.ArtyomFlags.restartRecognition = true;
                }
                else {
                    this.ArtyomProperties.continuous = false;
                    this.ArtyomFlags.restartRecognition = false;
                }
            }
            if (config.hasOwnProperty("speed")) {
                this.ArtyomProperties.speed = config.speed;
            }
            if (config.hasOwnProperty("soundex")) {
                this.ArtyomProperties.soundex = config.soundex;
            }
            if (config.hasOwnProperty("executionKeyword")) {
                this.ArtyomProperties.executionKeyword = config.executionKeyword;
            }
            if (config.hasOwnProperty("obeyKeyword")) {
                this.ArtyomProperties.obeyKeyword = config.obeyKeyword;
            }
            if (config.hasOwnProperty("volume")) {
                this.ArtyomProperties.volume = config.volume;
            }
            if (config.hasOwnProperty("listen")) {
                this.ArtyomProperties.listen = config.listen;
            }
            if (config.hasOwnProperty("name")) {
                this.ArtyomProperties.name = config.name;
            }
            if (config.hasOwnProperty("debug")) {
                this.ArtyomProperties.debug = config.debug;
            }
            else {
                console.warn("The initialization doesn't provide how the debug mode should be handled. Is recommendable to set this value either to true or false.");
            }
            if (config.mode) {
                this.ArtyomProperties.mode = config.mode;
            }
            if (this.ArtyomProperties.listen === true) {
                return new Promise((resolve, reject) => {
                    _this.hey(resolve, reject);
                });
            }
            return Promise.resolve(true);
        }
        /**
         * Add commands like an artisan. If you use artyom for simple tasks
         * then probably you don't like to write a lot to achieve it.
         *
         * Use the artisan syntax to write less, but with the same accuracy.
         *
         * @disclaimer Not a promise-based implementation, just syntax.
         * @returns {Boolean}
         */
        on(indexes, smart) {
            let _this = this;
            return {
                then: (action) => {
                    let command = {
                        indexes: indexes,
                        action: action
                    };
                    if (smart) {
                        command.smart = true;
                    }
                    _this.addCommands(command);
                }
            };
        }
        /**
         * Generates an artyom event with the designed name
         *
         * @param {type} name
         * @returns {undefined}
         */
        triggerEvent(name, param) {
            let event = new CustomEvent(name, {
                'detail': param
            });
            document.dispatchEvent(event);
            return event;
        }
        /**
         * Repeats the last sentence that artyom said.
         * Useful in noisy environments.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/repeatlastsay
         * @param {Boolean} returnObject If set to true, an object with the text and the timestamp when was executed will be returned.
         * @returns {Object}
         */
        repeatLastSay(returnObject) {
            let last = this.ArtyomProperties.helpers.lastSay;
            if (returnObject) {
                return last;
            }
            else {
                if (last != null) {
                    this.say(last.text);
                }
            }
        }
        /**
         * Create a listener when an artyom action is called.
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/when
         * @param {type} event
         * @param {type} action
         * @returns {undefined}
         */
        when(event, action) {
            return document.addEventListener(event, (e) => {
                action(e["detail"]);
            }, false);
        }
        /**
         * Process the recognized text if artyom is active in remote mode.
         *
         * @returns {Boolean}
         */
        remoteProcessorService(action) {
            this.ArtyomProperties.helpers.remoteProcessorHandler = action;
            return true;
        }
        /**
         * Verify if there's a voice available for a language using its language code identifier.
         *
         * @return {Boolean}
         */
        voiceAvailable(languageCode) {
            return typeof (this.getVoice(languageCode)) !== "undefined";
        }
        /**
         * A boolean to check if artyom is obeying commands or not.
         *
         * @returns {Boolean}
         */
        isObeying() {
            return this.ArtyomProperties.obeying;
        }
        /**
         * Allow artyom to obey commands again.
         *
         * @returns {Boolean}
         */
        obey() {
            return this.ArtyomProperties.obeying = true;
        }
        /**
         * Pause the processing of commands. Artyom still listening in the background and it can be resumed after a couple of seconds.
         *
         * @returns {Boolean}
         */
        dontObey() {
            return this.ArtyomProperties.obeying = false;
        }
        /**
         * This function returns a boolean according to the speechSynthesis status
         * if artyom is speaking, will return true.
         *
         * Note: This is not a feature of speechSynthesis, therefore this value hangs on
         * the fiability of the onStart and onEnd events of the speechSynthesis
         *
         * @since 0.9.3
         * @summary Returns true if speechSynthesis is active
         * @returns {Boolean}
         */
        isSpeaking() {
            return this.ArtyomProperties.speaking;
        }
        /**
         * This function returns a boolean according to the SpeechRecognition status
         * if artyom is listening, will return true.
         *
         * Note: This is not a feature of SpeechRecognition, therefore this value hangs on
         * the fiability of the onStart and onEnd events of the SpeechRecognition
         *
         * @since 0.9.3
         * @summary Returns true if SpeechRecognition is active
         * @returns {Boolean}
         */
        isRecognizing() {
            return this.ArtyomProperties.recognizing;
        }
        /**
         * This function will return the webkitSpeechRecognition object used by artyom
         * retrieve it only to debug on it or get some values, do not make changes directly
         *
         * @readonly
         * @since 0.9.2
         * @summary Retrieve the native webkitSpeechRecognition object
         * @returns {Object webkitSpeechRecognition}
         */
        getNativeApi() {
            return this.ArtyomWebkitSpeechRecognition;
        }
        /**
         * Returns the SpeechSynthesisUtterance garbageobjects.
         *
         * @returns {Array}
         */
        getGarbageCollection() {
            return this.ArtyomGarbageCollection;
        }
        /**
         *  Retrieve a single voice of the browser by it's language code.
         *  It will return the first voice available for the language on every device.
         *
         * @param languageCode
         */
        getVoice(languageCode) {
            let voiceIdentifiersArray = this.ArtyomVoicesIdentifiers[languageCode];
            if (!voiceIdentifiersArray) {
                console.warn(`The providen language ${languageCode} isn't available, using English Great britain as default`);
                voiceIdentifiersArray = this.ArtyomVoicesIdentifiers["en-GB"];
            }
            let voice = undefined;
            let voices = speechSynthesis.getVoices();
            let voicesLength = voiceIdentifiersArray.length;
            for (let i = 0; i < voicesLength; i++) {
                // @ts-ignore
                if (voices._list) {
                    // @ts-ignore
                    voices = voices._list;
                }
                let foundVoice = voices.filter((voice) => {
                    return ((voice.name == voiceIdentifiersArray[i]) || (voice.lang == voiceIdentifiersArray[i]));
                })[0];
                if (foundVoice) {
                    voice = foundVoice;
                    break;
                }
            }
            return voice;
        }
        /**
         * Artyom provide an easy way to create a
         * dictation for your user.
         *
         * Just create an instance and start and stop when you want
         *
         * @returns Object | newDictation
         */
        newDictation(settings) {
            let _this = this;
            if (!_this.recognizingSupported()) {
                console.error("SpeechRecognition is not supported in this browser");
                return false;
            }
            let dictado = new window.webkitSpeechRecognition();
            dictado.continuous = true;
            dictado.interimResults = true;
            dictado.lang = _this.ArtyomProperties.lang;
            dictado.onresult = function (event) {
                let temporal = "";
                let interim = "";
                for (let i = 0; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        temporal += event.results[i][0].transcript;
                    }
                    else {
                        interim += event.results[i][0].transcript;
                    }
                }
                if (settings.onResult) {
                    settings.onResult(interim, temporal);
                }
            };
            return new function () {
                let dictation = dictado;
                let flagStartCallback = true;
                let flagRestart = false;
                this.onError = null;
                this.start = function () {
                    if (settings.continuous === true) {
                        flagRestart = true;
                    }
                    dictation.onstart = function () {
                        if (typeof (settings.onStart) === "function") {
                            if (flagStartCallback === true) {
                                settings.onStart();
                            }
                        }
                    };
                    dictation.onend = function () {
                        if (flagRestart === true) {
                            flagStartCallback = false;
                            dictation.start();
                        }
                        else {
                            flagStartCallback = true;
                            if (typeof (settings.onEnd) === "function") {
                                settings.onEnd();
                            }
                        }
                    };
                    dictation.start();
                };
                this.stop = function () {
                    flagRestart = false;
                    dictation.stop();
                };
                if (typeof (settings.onError) === "function") {
                    dictation.onerror = settings.onError;
                }
            };
        }
        /**
         * A voice prompt will be executed.
         *
         * @param {type} config
         * @returns {undefined}
         */
        newPrompt(config) {
            if (typeof (config) !== "object") {
                console.error("Expected the prompt configuration.");
            }
            let copyActualCommands = Object.assign([], this.ArtyomCommands);
            let _this = this;
            this.emptyCommands();
            let promptCommand = {
                description: "Setting the artyom commands only for the prompt. The commands will be restored after the prompt finishes",
                indexes: config.options,
                action: function (i, wildcard) {
                    _this.ArtyomCommands = copyActualCommands;
                    let toExe = config.onMatch(i, wildcard);
                    if (typeof (toExe) !== "function") {
                        console.error("onMatch function expects a returning function to be executed");
                        return;
                    }
                    toExe();
                }
            };
            if (config.smart) {
                promptCommand.smart = true;
            }
            this.addCommands(promptCommand);
            if (typeof (config.beforePrompt) !== "undefined") {
                config.beforePrompt();
            }
            let callbacks = {
                onStart: () => {
                    if (typeof (config.onStartPrompt) !== "undefined") {
                        config.onStartPrompt();
                    }
                },
                onEnd: () => {
                    if (typeof (config.onEndPrompt) !== "undefined") {
                        config.onEndPrompt();
                    }
                }
            };
            this.say(config.question, callbacks);
        }
        /**
         * Says a random quote and returns it's object
         *
         * @param {type} data
         * @returns {object}
         */
        sayRandom(data) {
            if (data instanceof Array) {
                let index = Math.floor(Math.random() * data.length);
                this.say(data[index]);
                return {
                    text: data[index],
                    index: index
                };
            }
            else {
                console.error("Random quotes must be in an array !");
                return null;
            }
        }
        /**
         * Shortcut method to enable the artyom debug on the fly.
         *
         * @returns {Array}
         */
        setDebug(status) {
            if (status) {
                return this.ArtyomProperties.debug = true;
            }
            else {
                return this.ArtyomProperties.debug = false;
            }
        }
        /**
         * Simulate a voice command via JS
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/simulateinstruction
         * @param {type} sentence
         * @returns {undefined}
         */
        simulateInstruction(sentence) {
            let _this = this;
            if ((!sentence) || (typeof (sentence) !== "string")) {
                console.warn("Cannot execute a non string command");
                return false;
            }
            let foundCommand = _this.execute(sentence); //Command founded object
            if (typeof (foundCommand) === "object") {
                if (foundCommand.instruction) {
                    if (foundCommand.instruction.smart) {
                        _this.debug('Smart command matches with simulation, executing', "info");
                        foundCommand.instruction.action(foundCommand.index, foundCommand.wildcard.item, foundCommand.wildcard.full);
                    }
                    else {
                        _this.debug('Command matches with simulation, executing', "info");
                        foundCommand.instruction.action(foundCommand.index); //Execute Normal command
                    }
                    return true;
                }
            }
            else {
                console.warn("No command founded trying with " + sentence);
                return false;
            }
        }
        /**
         * Javascript implementation of the soundex algorithm.
         * @see https://gist.github.com/shawndumas/1262659
         * @returns {String}
         */
        soundex(s) {
            let a = s.toLowerCase().split('');
            let f = a.shift();
            let r = '';
            let codes = { a: "", e: "", i: "", o: "", u: "", b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };
            r = f + a
                .map((v, i, a) => {
                return codes[v];
            })
                .filter((v, i, a) => {
                return ((i === 0) ? v !== codes[f] : v !== a[i - 1]);
            })
                .join('');
            return (r + '000').slice(0, 4).toUpperCase();
        }
        /**
         * Splits a string into an array of strings with a limited size (chunk_length).
         *
         * @param {String} input text to split into chunks
         * @param {Integer} chunk_length limit of characters in every chunk
         */
        splitStringByChunks(input, chunk_length) {
            input = input || "";
            chunk_length = chunk_length || 100;
            let curr = chunk_length;
            let prev = 0;
            let output = [];
            while (input[curr]) {
                if (input[curr++] == ' ') {
                    output.push(input.substring(prev, curr));
                    prev = curr;
                    curr += chunk_length;
                }
            }
            output.push(input.substr(prev));
            return output;
        }
        /**
         * Allows to retrieve the recognized spoken text of artyom
         * and do something with it everytime something is recognized
         *
         * @param {String} action
         * @returns {Boolean}
         */
        redirectRecognizedTextOutput(action) {
            if (typeof (action) != "function") {
                console.warn("Expected function to handle the recognized text ...");
                return false;
            }
            this.ArtyomProperties.helpers.redirectRecognizedTextOutput = action;
            return true;
        }
        /**
         * Restarts artyom with the initial configuration.
         *
         * @param configuration
         */
        restart() {
            let _this = this;
            let _copyInit = _this.ArtyomProperties;
            return new Promise((resolve, reject) => {
                _this.fatality().then(() => {
                    _this.initialize(_copyInit).then(resolve, reject);
                });
            });
        }
        /**
         * Talks a text according to the given parameters.
         *
         * @private This function is only to be used internally.
         * @param {String} text Text to be spoken
         * @param {Int} actualChunk Number of chunk of the
         * @param {Int} totalChunks
         * @returns {undefined}
         */
        talk(text, actualChunk, totalChunks, callbacks) {
            let _this = this;
            let msg = new SpeechSynthesisUtterance();
            msg.text = text;
            msg.volume = this.ArtyomProperties.volume;
            msg.rate = this.ArtyomProperties.speed;
            // Select the voice according to the selected
            let availableVoice = _this.getVoice(_this.ArtyomProperties.lang);
            if (callbacks) {
                // If the language to speak has been forced, use it
                if (callbacks.hasOwnProperty("lang")) {
                    availableVoice = _this.getVoice(callbacks.lang);
                }
            }
            // If is a mobile device, provide only the language code in the lang property i.e "es_ES"
            if (this.Device.isMobile) {
                // Try to set the voice only if exists, otherwise don't use anything to use the native voice
                if (availableVoice) {
                    msg.lang = availableVoice.lang;
                }
                // If browser provide the entire object
            }
            else {
                msg.voice = availableVoice;
            }
            // If is first text chunk (onStart)
            if (actualChunk == 1) {
                msg.addEventListener('start', function () {
                    // Set artyom is talking
                    _this.ArtyomProperties.speaking = true;
                    // Trigger the onSpeechSynthesisStart event
                    _this.debug("Event reached : " + _this.ArtyomGlobalEvents.SPEECH_SYNTHESIS_START);
                    _this.triggerEvent(_this.ArtyomGlobalEvents.SPEECH_SYNTHESIS_START);
                    // Trigger the onStart callback if exists
                    if (callbacks) {
                        if (typeof (callbacks.onStart) == "function") {
                            callbacks.onStart.call(msg);
                        }
                    }
                });
            }
            // If is final text chunk (onEnd)
            if ((actualChunk) >= totalChunks) {
                msg.addEventListener('end', function () {
                    // Set artyom is talking
                    _this.ArtyomProperties.speaking = false;
                    // Trigger the onSpeechSynthesisEnd event
                    _this.debug("Event reached : " + _this.ArtyomGlobalEvents.SPEECH_SYNTHESIS_END);
                    _this.triggerEvent(_this.ArtyomGlobalEvents.SPEECH_SYNTHESIS_END);
                    // Trigger the onEnd callback if exists.
                    if (callbacks) {
                        if (typeof (callbacks.onEnd) == "function") {
                            callbacks.onEnd.call(msg);
                        }
                    }
                });
            }
            // Notice how many chunks were processed for the given text.
            this.debug((actualChunk) + " text chunk processed succesfully out of " + totalChunks);
            // Important : Save the SpeechSynthesisUtterance object in memory, otherwise it will get lost
            this.ArtyomGarbageCollection.push(msg);
            window.speechSynthesis.speak(msg);
        }
        /**
         * Process the given text into chunks and execute the private function talk
         *
         * @tutorial http://docs.ourcodeworld.com/projects/artyom-js/documentation/methods/say
         * @param {String} message Text to be spoken
         * @param {Object} callbacks
         * @returns {undefined}
         */
        say(message, callbacks) {
            let artyom_say_max_chunk_length = 115;
            let _this = this;
            let definitive = [];
            if (this.speechSupported()) {
                if (typeof (message) != 'string') {
                    return console.warn(`Artyom expects a string to speak ${typeof message} given`);
                }
                if (!message.length) {
                    return console.warn("Cannot speak empty string");
                }
                // If the providen text is long, proceed to split it
                if (message.length > artyom_say_max_chunk_length) {
                    // Split the given text by pause reading characters [",",":",";",". "] to provide a natural reading feeling.
                    let naturalReading = message.split(/,|:|\. |;/);
                    naturalReading.forEach((chunk, index) => {
                        // If the sentence is too long and could block the API, split it to prevent any errors.
                        if (chunk.length > artyom_say_max_chunk_length) {
                            // Process the providen string into strings (withing an array) of maximum aprox. 115 characters to prevent any error with the API.
                            let temp_processed = _this.splitStringByChunks(chunk, artyom_say_max_chunk_length);
                            // Add items of the processed sentence into the definitive chunk.
                            definitive.push.apply(definitive, temp_processed);
                        }
                        else {
                            // Otherwise just add the sentence to being spoken.
                            definitive.push(chunk);
                        }
                    });
                }
                else {
                    definitive.push(message);
                }
                // Clean any empty item in array
                definitive = definitive.filter((e) => e);
                // Finally proceed to talk the chunks and assign the callbacks.
                definitive.forEach((chunk, index) => {
                    let numberOfChunk = (index + 1);
                    if (chunk) {
                        _this.talk(chunk, numberOfChunk, definitive.length, callbacks);
                    }
                });
                // Save the spoken text into the lastSay object of artyom
                _this.ArtyomProperties.helpers.lastSay = {
                    text: message,
                    date: new Date()
                };
            }
        }
    }
    exports.default = Artyom;
});
define("test_aytom", ["require", "exports", "arytom/artyom"], function (require, exports, artyom_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    artyom_1 = __importDefault(artyom_1);
    exports.KEYWORD = "Jarvis";
    exports.Jarvis = new class {
        constructor() {
            this.Jarvis = null;
        }
        get Jarvis() {
            return this._Jarvis;
        }
        set Jarvis(ary) {
            this._Jarvis = new artyom_1.default();
        }
    };
    function test_jarvis() {
        let j = exports.Jarvis.Jarvis;
        j.fatality();
        setTimeout(function () {
            j.addCommands([{
                    smart: true,
                    indexes: ["Test *"],
                    action: function (i, w) {
                        alert(w);
                    }
                }, {
                    smart: true,
                    indexes: ["Busy bird *", "hello *"],
                    action: function (i, w) {
                        alert(w);
                    }
                }]);
            j.initialize({
                lang: "fr-FR",
                debug: true,
                listen: true,
                speed: 1,
                continuous: false
            });
            M.toast({ html: "écoute" });
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
    exports.test_jarvis = test_jarvis;
});
////// LE JSON ECRIT DANS assets/form.json DOIT ÊTRE DE TYPE
/*
{
    "nom_formel/clé_du_formulaire": {
        "name": "Nom réel (possiblement à afficher à l'écran)"
        "fields": [
            {}: FormEntity
        ],
        "locations": [
            {}: FormLocation
        ]
    },
    "nom_d_un_autre_formulaire": Form
}

Le formulaire DOIT comporter un champ de type "datetime",
nommé "__date__" pour être affiché correctement dans
la liste des formulaires enregistrés.
Il peut être n'importe où dans le formulaire.
*/
define("form_schema", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Type à préciser dans le JSON, clé "type"
     * Le type à préciser est la chaîne de caractères
     */
    var FormEntityType;
    (function (FormEntityType) {
        FormEntityType["integer"] = "integer";
        FormEntityType["float"] = "float";
        FormEntityType["select"] = "select";
        FormEntityType["string"] = "string";
        FormEntityType["bigstring"] = "textarea";
        FormEntityType["checkbox"] = "checkbox";
        FormEntityType["file"] = "file";
        FormEntityType["slider"] = "slider";
        FormEntityType["datetime"] = "datetime";
        FormEntityType["divider"] = "divider";
        FormEntityType["audio"] = "audio";
    })(FormEntityType = exports.FormEntityType || (exports.FormEntityType = {}));
    // Clé du JSON à charger automatiquement
    exports.default_form_name = "cincle_plongeur";
    // Classe contenant le formulaire JSON chargé et parsé
    exports.Forms = new class {
        // Initialise les formulaires disponibles via le fichier JSON contenant les formulaires
        // La clé du formulaire par défaut est contenu dans "default_form_name"
        constructor() {
            this.form_ready = false;
            this.waiting_callee = [];
            this.current = null;
            this._current_key = null;
            $.get('assets/form.json', {}, (json) => {
                // Le JSON est reçu, on l'enregistre dans available_forms
                this.available_forms = json;
                // On met le form à ready
                this.form_ready = true;
                // On enregistre le formulaire par défaut (si la clé définie existe)
                if (exports.default_form_name in this.available_forms) {
                    this.current = this.available_forms[exports.default_form_name];
                    this._current_key = exports.default_form_name;
                }
                else {
                    this.current = { name: null, fields: [], locations: [] };
                }
                // On exécute les fonctions en attente
                let func;
                while (func = this.waiting_callee.pop()) {
                    func(this.available_forms, this.current);
                }
            }, 'json');
        }
        onReady(callback) {
            if (this.form_ready) {
                callback(this.available_forms, this.current);
            }
            else {
                this.waiting_callee.push(callback);
            }
        }
        formExists(name) {
            return name in this.available_forms;
        }
        /**
         * Change le formulaire courant renvoyé par onReady
         * @param name clé d'accès au formulaire
         */
        changeForm(name) {
            if (this.formExists(name)) {
                this.current = this.available_forms[name];
                this._current_key = name;
            }
            else {
                throw new Error("Form does not exists");
            }
        }
        /**
         * Renvoie un formulaire, sans modifier le courant
         * @param name clé d'accès au formulaire
         */
        getForm(name) {
            if (this.formExists(name)) {
                return this.available_forms[name];
            }
            else {
                throw new Error("Form does not exists");
            }
        }
        /**
         * Retourne un tableau de tuples contenant en
         * première position la clé d'accès au formulaire,
         * et en seconde position son nom textuel à présenter à l'utilisateur
         * @returns [string, string][]
         */
        getAvailableForms() {
            const keys = Object.keys(this.available_forms);
            const tuples = [];
            for (const key of keys) {
                tuples.push([key, this.available_forms[key].name]);
            }
            return tuples;
        }
        get current_key() {
            return this._current_key;
        }
    };
});
define("logger", ["require", "exports", "helpers"], function (require, exports, helpers_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Objet Logger
    // Sert à écrire dans un fichier de log formaté
    // à la racine du système de fichiers
    var LogLevel;
    (function (LogLevel) {
        LogLevel["debug"] = "debug";
        LogLevel["info"] = "info";
        LogLevel["warn"] = "warn";
        LogLevel["error"] = "error";
    })(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
    /**
     * Logger
     * Permet de logger dans un fichier texte des messages.
     */
    exports.Logger = new class {
        constructor() {
            this._onWrite = false;
            this.delayed = [];
            this.waiting_callee = [];
            this.init_done = false;
            this.init_waiting_callee = [];
            this.tries = 5;
        }
        /**
         * Initialise le logger. Doit être réalisé après app.init() et changeDir().
         * Pour vérifier si le logger est initialisé, utilisez onReady().
         */
        init() {
            this.init_done = false;
            if (this.tries === 0) {
                console.error("Too many init tries. Logger stays uninitialized.");
                return;
            }
            this.tries--;
            helpers_1.getDir((dirEntry) => {
                // Creates a new file or returns the file if it already exists.
                dirEntry.getFile("log.txt", { create: true }, (fileEntry) => {
                    this.fileEntry = fileEntry;
                    this.init_done = true;
                    this.onWrite = false;
                    this.tries = 5;
                    let func;
                    while (func = this.init_waiting_callee.pop()) {
                        func();
                    }
                }, function (err) {
                    console.log("Unable to create file log.", err);
                });
            }, null, function (err) {
                console.log("Unable to enable log.", err);
            });
        }
        /**
         * Vrai si le logger est prêt à écrire / lire dans le fichier de log.
         */
        isInit() {
            return this.init_done;
        }
        /**
         * Si aucun callback n'est précisé, renvoie une Promise qui se résout quand
         * le logger est prêt à recevoir des instructions.
         * @param callback? Function Si précisé, la fonction ne renvoie rien et le callback sera exécuté quand le logger est prêt
         */
        onReady(callback) {
            const oninit = new Promise((resolve, reject) => {
                if (this.isInit()) {
                    resolve();
                }
                else {
                    this.init_waiting_callee.push(resolve);
                }
            });
            if (callback) {
                oninit.then(callback);
            }
            else {
                return oninit;
            }
        }
        get onWrite() {
            return this._onWrite;
        }
        set onWrite(value) {
            this._onWrite = value;
            if (!value && this.delayed.length) {
                // On lance une tâche "delayed" avec le premier élément de la liste (le premier inséré)
                this.write(...this.delayed.shift());
            }
            else if (!value && this.waiting_callee.length) {
                // Si il n'y a aucune tâche en attente, on peut lancer les waiting function
                let func;
                while (func = this.waiting_callee.pop()) {
                    func();
                }
            }
        }
        /**
         * Écrit dans le fichier de log le contenu de text avec le niveau level.
         * Ajoute automatique date et heure au message ainsi qu'un saut de ligne à la fin.
         * Si level vaut debug, rien ne sera affiché dans la console.
         * @param text Message
         * @param level Niveau de log
         */
        write(data, level = LogLevel.warn) {
            if (!Array.isArray(data)) {
                data = [data];
            }
            if (!this.isInit()) {
                this.delayWrite(data, level);
                return;
            }
            // En debug, on écrit dans dans le fichier
            if (level === LogLevel.debug) {
                console.log(...data);
                return;
            }
            // Create a FileWriter object for our FileEntry (log.txt).
            this.fileEntry.createWriter((fileWriter) => {
                fileWriter.onwriteend = () => {
                    this.onWrite = false;
                };
                fileWriter.onerror = (e) => {
                    console.log("Logger: Failed file write: " + e.toString());
                    this.onWrite = false;
                };
                // Append to file
                try {
                    fileWriter.seek(fileWriter.length);
                }
                catch (e) {
                    console.log("Logger: File doesn't exist!", e);
                    return;
                }
                if (!this.onWrite) {
                    if (level === LogLevel.info) {
                        console.log(...data);
                    }
                    else if (level === LogLevel.warn) {
                        console.warn(...data);
                    }
                    else if (level === LogLevel.error) {
                        console.error(...data);
                    }
                    let final = this.createDateHeader(level) + " ";
                    for (const e of data) {
                        final += (typeof e === 'string' ? e : JSON.stringify(e)) + "\n";
                    }
                    this.onWrite = true;
                    fileWriter.write(new Blob([final]));
                }
                else {
                    this.delayWrite(data, level);
                }
            }, (error) => {
                console.error("Impossible d'écrire: ", error.message);
                this.delayWrite(data, level);
                this.init();
            });
        }
        /**
         * Crée une date formatée
         * @param level
         */
        createDateHeader(level) {
            const date = new Date();
            const m = ((date.getMonth() + 1) < 10 ? "0" : "") + String(date.getMonth() + 1);
            const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
            const hour = ((date.getHours()) < 10 ? "0" : "") + String(date.getHours());
            const min = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
            const sec = ((date.getSeconds()) < 10 ? "0" : "") + String(date.getSeconds());
            return `[${level}] [${d}/${m}/${date.getFullYear()} ${hour}:${min}:${sec}]`;
        }
        delayWrite(data, level) {
            this.delayed.push([data, level]);
        }
        /**
         * Si aucun callback n'est précisé, renvoie une Promise qui se résout quand
         * le logger a fini toutes ses opérations d'écriture.
         * @param callbackSuccess? Function Si précisé, la fonction ne renvoie rien et le callback sera exécuté quand toutes les opérations d'écriture sont terminées.
         */
        onWriteEnd(callbackSuccess) {
            const onwriteend = new Promise((resolve, reject) => {
                if (!this.onWrite && this.isInit()) {
                    resolve();
                }
                else {
                    this.waiting_callee.push(resolve);
                }
            });
            if (callbackSuccess) {
                onwriteend.then(callbackSuccess);
            }
            else {
                return onwriteend;
            }
        }
        /**
         * Vide le fichier de log.
         * @returns Promise La promesse est résolue quand le fichier est vidé, rompue si échec
         */
        clearLog() {
            return new Promise((resolve, reject) => {
                if (!this.isInit()) {
                    reject("Logger must be initialized");
                }
                this.fileEntry.createWriter((fileWriter) => {
                    fileWriter.onwriteend = () => {
                        this.onWrite = false;
                        resolve();
                    };
                    fileWriter.onerror = (e) => {
                        console.log("Logger: Failed to truncate.");
                        this.onWrite = false;
                        reject();
                    };
                    if (!this.onWrite) {
                        fileWriter.truncate(0);
                    }
                    else {
                        console.log("Please call this function when log is not writing.");
                        reject();
                    }
                });
            });
        }
        /**
         * Affiche tout le contenu du fichier de log dans la console via console.log()
         * @returns Promise La promesse est résolue avec le contenu du fichier si lecture réussie, rompue si échec
         */
        consoleLogLog() {
            return new Promise((resolve, reject) => {
                if (!this.isInit()) {
                    reject("Logger must be initialized");
                }
                this.fileEntry.file(function (file) {
                    const reader = new FileReader();
                    reader.onloadend = function () {
                        console.log(this.result);
                        resolve(this.result);
                    };
                    reader.readAsText(file);
                }, () => {
                    console.log("Logger: Unable to open file.");
                    this.init();
                    reject();
                });
            });
        }
        /// Méthodes d'accès rapide
        debug(...data) {
            this.write(data, LogLevel.debug);
        }
        info(...data) {
            this.write(data, LogLevel.info);
        }
        warn(...data) {
            this.write(data, LogLevel.warn);
        }
        error(...data) {
            this.write(data, LogLevel.error);
        }
    };
});
define("main", ["require", "exports", "interface", "helpers", "logger", "audio_listener", "form_schema"], function (require, exports, interface_1, helpers_2, logger_1, audio_listener_1, form_schema_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SIDENAV_OBJ = null;
    exports.MAX_LIEUX_AFFICHES = 20;
    exports.app = {
        // Application Constructor
        initialize: function () {
            this.bindEvents();
        },
        // Bind Event Listeners
        //
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function () {
            document.addEventListener('deviceready', this.onDeviceReady, false);
        },
        // deviceready Event Handler
        //
        // The scope of 'this' is the event. In order to call the 'receivedEvent'
        // function, we must explicitly call 'app.receivedEvent(...);'
        onDeviceReady: function () {
            exports.app.receivedEvent('deviceready');
        },
        // Update DOM on a Received Event
        receivedEvent: function (id) {
            // var parentElement = document.getElementById(id);
            // var listeningElement = parentElement.querySelector('.listening');
            // var receivedElement = parentElement.querySelector('.received');
            // listeningElement.setAttribute('style', 'display:none;');
            // receivedElement.setAttribute('style', 'display:block;');
            // console.log('Received Event: ' + id);
        }
    };
    function initApp() {
        // Change le répertoire de données
        // Si c'est un navigateur, on est sur cdvfile://localhost/persistent
        // Sinon, si mobile, on passe sur dataDirectory
        helpers_2.changeDir();
        logger_1.Logger.init();
        // @ts-ignore Force à demander la permission pour enregistrer du son
        const permissions = cordova.plugins.permissions;
        permissions.requestPermission(permissions.RECORD_AUDIO, status => {
            console.log(status);
        }, e => { console.log(e); });
        // Initialise le bouton retour
        document.addEventListener("backbutton", function () {
            interface_1.PageManager.goBack();
        }, false);
        // Initialise le sidenav
        const elem = document.querySelector('.sidenav');
        exports.SIDENAV_OBJ = M.Sidenav.init(elem, {});
        // Bind des éléments du sidenav
        // Home
        document.getElementById('nav_home').onclick = function () {
            interface_1.PageManager.pushPage(interface_1.AppPageName.home);
        };
        // Form
        document.getElementById('nav_form_new').onclick = function () {
            interface_1.PageManager.pushPage(interface_1.AppPageName.form);
        };
        // Saved
        document.getElementById('nav_form_saved').onclick = function () {
            interface_1.PageManager.pushPage(interface_1.AppPageName.saved);
        };
        // Settigns
        document.getElementById('nav_settings').onclick = function () {
            interface_1.PageManager.pushPage(interface_1.AppPageName.settings);
        };
        exports.app.initialize();
        initDebug();
        helpers_2.initModal();
        // Check si on est à une page spéciale
        let href = "";
        if (window.location) {
            href = location.href.split('#')[0].split('?');
            // Récupère la partie de l'URL après la query string et avant le #
            href = href[href.length - 1];
        }
        if (href && interface_1.PageManager.pageExists(href)) {
            interface_1.PageManager.changePage(href);
        }
        else {
            interface_1.PageManager.changePage(interface_1.AppPageName.home);
        }
    }
    function initDebug() {
        window["DEBUG"] = {
            PageManager: interface_1.PageManager,
            readFromFile: helpers_2.readFromFile,
            listDir: helpers_2.listDir,
            saveDefaultForm: helpers_2.saveDefaultForm,
            createDir: helpers_2.createDir,
            getLocation: helpers_2.getLocation,
            testDistance: helpers_2.testDistance,
            rmrf: helpers_2.rmrf,
            rmrfPromise: helpers_2.rmrfPromise,
            Logger: logger_1.Logger,
            modalBackHome: interface_1.modalBackHome,
            recorder: function () {
                audio_listener_1.newModalRecord(document.createElement('button'), document.createElement('input'), {
                    name: "__test__",
                    label: "Test",
                    type: form_schema_1.FormEntityType.audio
                });
            },
            dateFormatter: helpers_2.dateFormatter
        };
    }
    document.addEventListener('deviceready', initApp, false);
});
define("form", ["require", "exports", "form_schema", "helpers", "main", "interface", "logger", "audio_listener"], function (require, exports, form_schema_2, helpers_3, main_1, interface_2, logger_2, audio_listener_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function createInputWrapper() {
        const e = document.createElement('div');
        e.classList.add("row", "input-field", "col", "s12");
        return e;
    }
    function createTip(wrapper, ele) {
        if (ele.tip_on_invalid) {
            const tip = document.createElement('div');
            tip.classList.add('invalid-tip');
            tip.innerText = ele.tip_on_invalid;
            tip.style.display = 'none';
            wrapper.appendChild(tip);
        }
        return wrapper;
    }
    function showHideTip(current, show) {
        if (current.nextElementSibling && current.nextElementSibling.classList.contains("invalid-tip")) {
            // Si il y a un tip, on le fait appraître
            if (show)
                $(current.nextElementSibling).slideDown(200);
            else
                $(current.nextElementSibling).slideUp(200);
        }
    }
    /**
     * Classe le champ comme valide.
     * @param e Element input
     */
    function setValid(e) {
        e.classList.add('valid');
        e.classList.remove('invalid');
        e.dataset.valid = "1";
        showHideTip(e, false);
    }
    /**
     * Classe le champ comme invalide.
     * @param e Element input
     */
    function setInvalid(e) {
        if (e.value === "" && !e.required) {
            setValid(e);
            return;
        }
        e.classList.add('invalid');
        e.classList.remove('valid');
        e.dataset.valid = "0";
        showHideTip(e, true);
    }
    /**
     * Remplit les champs standards de l'input (id, name, required)...
     * @param htmle Input / Select dans lequel écrire
     * @param ele Champ de formulaire lié à l'input
     * @param label Label lié à l'input (optionnel)
     */
    function fillStandardInputValues(htmle, ele, label) {
        htmle.id = "id_" + ele.name;
        htmle.name = ele.name;
        htmle.required = ele.required;
        if (htmle.tagName !== "SELECT" && ele.placeholder) {
            htmle.placeholder = ele.placeholder;
        }
        if (label) {
            label.htmlFor = htmle.id;
            label.innerText = ele.label;
        }
        htmle.dataset.valid = ele.required ? "0" : "1";
        htmle.value = ele.default_value || "";
        return htmle;
    }
    /**
     * Polyfill for modulo (seems to work unproperly on flaoting point)
     * @param num1
     * @param num2
     */
    function isModuloZero(num1, num2) {
        let reste = num1;
        while (reste > 0.0001) {
            reste -= num2;
        }
        // Arrondit le nombre pour éviter les problèmes de précision
        return Number(reste.toFixed(5)) === 0;
    }
    /**
     * Construit le formulaire automatiquement passé via "current_form"
     * @param placeh Élement HTML dans lequel écrire le formulaire
     * @param current_form Formulaire courant
     * @param filled_form Formulaire déjà rempli (utilisé pour l'édition)
     */
    function constructForm(placeh, current_form, filled_form) {
        // Crée le champ de lieu
        const loc_wrapper = document.createElement('div');
        loc_wrapper.classList.add('input-field', 'row', 'col', 's12');
        const location = document.createElement('input');
        location.type = "text";
        location.readOnly = true;
        location.name = "__location__";
        location.id = "__location__id";
        location.addEventListener('click', function () {
            this.blur(); // Retire le focus pour éviter de pouvoir écrire dedans
            callLocationSelector(current_form); // Appelle le modal pour changer de lieu
        });
        if (filled_form) {
            location.value = location.dataset.reallocation = filled_form.location;
        }
        loc_wrapper.appendChild(location);
        const loc_title = document.createElement('h4');
        loc_title.innerText = "Lieu";
        placeh.appendChild(loc_title);
        placeh.appendChild(loc_wrapper);
        // Fin champ de lieu, itération sur champs
        for (const ele of current_form.fields) {
            let element_to_add = null;
            if (ele.type === form_schema_2.FormEntityType.divider) {
                // C'est un titre
                // On divide
                const clearer = document.createElement('div');
                clearer.classList.add('clearb');
                placeh.appendChild(clearer);
                const htmle = document.createElement('h4');
                htmle.innerText = ele.label;
                htmle.id = "id_" + ele.name;
                placeh.appendChild(htmle);
                continue;
            }
            else if (ele.type === form_schema_2.FormEntityType.integer || ele.type === form_schema_2.FormEntityType.float) {
                const wrapper = createInputWrapper();
                const htmle = document.createElement('input');
                htmle.autocomplete = "off";
                const label = document.createElement('label');
                fillStandardInputValues(htmle, ele, label);
                htmle.type = "number";
                htmle.classList.add('input-form-element');
                if (ele.range) {
                    if (typeof ele.range.min !== 'undefined') {
                        htmle.min = String(ele.range.min);
                    }
                    if (typeof ele.range.max !== 'undefined') {
                        htmle.max = String(ele.range.max);
                    }
                }
                wrapper.appendChild(label);
                wrapper.appendChild(htmle);
                createTip(wrapper, ele);
                if (filled_form && ele.name in filled_form.fields) {
                    htmle.value = filled_form.fields[ele.name];
                }
                // Calcul de nombre de décimales requises
                // si le nombre demandé est un float
                let NB_DECIMALES = 0;
                if (ele.type === form_schema_2.FormEntityType.float && ele.float_precision) {
                    // Récupération de la partie décimale sous forme de string
                    const dec_part = ele.float_precision.toString().split('.');
                    // Calcul du nombre de décimales
                    if (dec_part.length > 1) {
                        NB_DECIMALES = dec_part[1].length;
                    }
                    else {
                        throw new Error(`La précision pour la partie décimale spécifiée pour le champ "${ele.name}" est invalide: Elle ne comporte pas de décimales.`);
                    }
                }
                // Définition des contraintes
                const contraintes = [];
                if (typeof ele.range !== 'undefined') {
                    if (typeof ele.range.min !== 'undefined') {
                        contraintes.push(["min", ele.range.min]);
                    }
                    if (typeof ele.range.max !== 'undefined') {
                        contraintes.push(["max", ele.range.max]);
                    }
                }
                if (ele.type === form_schema_2.FormEntityType.float && ele.float_precision) {
                    contraintes.push(["precision", ele.float_precision]);
                }
                contraintes.push(['type', ele.type === form_schema_2.FormEntityType.float ? 'float' : 'int']);
                htmle.dataset.constraints = contraintes.map(e => e.join('=')).join(';');
                // Attachage de l'évènement de vérification
                htmle.addEventListener('change', function () {
                    let valid = true;
                    let value;
                    try {
                        value = Number(this.value);
                    }
                    catch (e) {
                        valid = false;
                    }
                    if (typeof value === 'number' && value === value) {
                        if (typeof ele.range.min !== 'undefined' && value < ele.range.min) {
                            valid = false;
                        }
                        else if (typeof ele.range.max !== 'undefined' && value > ele.range.max) {
                            valid = false;
                        }
                        // if différent, il est juste en else if pour éviter de faire les
                        // calculs si le valid est déjà à false
                        else if (ele.type === form_schema_2.FormEntityType.float) {
                            if (ele.float_precision) {
                                // Si on a demandé à avoir un nombre de flottant précis
                                const floating_point = this.value.split('.');
                                if (floating_point.length > 1) {
                                    // Récupération de la partie décimale avec le bon nombre de décimales
                                    // (round obligatoire, à cause de la gestion des float imprécise)
                                    const partie_decimale = Number((value % 1).toFixed(NB_DECIMALES));
                                    // Si le nombre de chiffres après la virgule n'est pas le bon
                                    // ou si la valeur n'est pas de l'ordre souhaité (précision 0.05 avec valeur 10.03 p.e.)
                                    if (floating_point[1].length !== NB_DECIMALES || !isModuloZero(partie_decimale, ele.float_precision)) {
                                        valid = false;
                                    }
                                }
                                else {
                                    //Il n'y a pas de . dans le nombre
                                    valid = false;
                                }
                            }
                        }
                        else if (this.value.indexOf(".") !== -1) {
                            // Ce doit forcément être un entier,
                            // donc si on trouve un point
                            valid = false;
                        }
                    }
                    else {
                        valid = false;
                    }
                    if (valid) {
                        setValid(this);
                    }
                    else {
                        setInvalid(this);
                    }
                });
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_2.FormEntityType.string || ele.type === form_schema_2.FormEntityType.bigstring) {
                const wrapper = createInputWrapper();
                let htmle;
                if (ele.type === form_schema_2.FormEntityType.string) {
                    htmle = document.createElement('input');
                    htmle.type = "text";
                    htmle.autocomplete = "off";
                }
                else {
                    htmle = document.createElement('textarea');
                    htmle.classList.add('materialize-textarea');
                }
                htmle.classList.add('input-form-element');
                const label = document.createElement('label');
                fillStandardInputValues(htmle, ele, label);
                if (filled_form && ele.name in filled_form.fields) {
                    htmle.value = filled_form.fields[ele.name];
                }
                wrapper.appendChild(label);
                wrapper.appendChild(htmle);
                createTip(wrapper, ele);
                // Définition des contraintes
                const contraintes = [];
                if (typeof ele.range !== 'undefined') {
                    if (typeof ele.range.min !== 'undefined') {
                        contraintes.push(["min", ele.range.min]);
                    }
                    if (typeof ele.range.max !== 'undefined') {
                        contraintes.push(["max", ele.range.max]);
                    }
                }
                htmle.dataset.constraints = contraintes.map(e => e.join('=')).join(';');
                // Attachage de l'évènement de vérification
                htmle.addEventListener('change', function () {
                    let valid = true;
                    let value = this.value;
                    if (typeof value === 'string') {
                        if (typeof ele.range !== 'undefined') {
                            if (typeof ele.range.min !== 'undefined' && value.length < ele.range.min) {
                                valid = false;
                            }
                            else if (typeof ele.range.max !== 'undefined' && value.length > ele.range.max) {
                                valid = false;
                            }
                            if (value.length === 0 && ele.suggested_not_blank) {
                                valid = false;
                            }
                        }
                    }
                    else {
                        valid = false;
                    }
                    if (valid) {
                        setValid(this);
                    }
                    else {
                        setInvalid(this);
                    }
                });
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_2.FormEntityType.select) {
                const wrapper = createInputWrapper();
                const htmle = document.createElement('select');
                const label = document.createElement('label');
                htmle.classList.add('input-form-element');
                fillStandardInputValues(htmle, ele, label);
                // Création des options
                htmle.multiple = ele.select_options.multiple;
                for (const opt of ele.select_options.options) {
                    const htmlopt = document.createElement('option');
                    htmlopt.selected = opt.selected;
                    htmlopt.value = opt.value;
                    htmlopt.innerText = opt.label;
                    htmle.appendChild(htmlopt);
                }
                if (filled_form && ele.name in filled_form.fields) {
                    if (ele.select_options.multiple) {
                        $(htmle).val(filled_form.fields[ele.name]);
                    }
                    else {
                        htmle.value = filled_form.fields[ele.name];
                    }
                }
                wrapper.appendChild(htmle);
                wrapper.appendChild(label);
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_2.FormEntityType.checkbox) {
                const wrapper = document.createElement('p');
                const label = document.createElement('label');
                const input = document.createElement('input');
                const span = document.createElement('span');
                fillStandardInputValues(input, ele, span);
                wrapper.classList.add('row', 'col', 's12', 'input-checkbox');
                input.classList.add('filled-in', 'input-form-element');
                input.type = "checkbox";
                input.checked = ele.default_value;
                if (filled_form && ele.name in filled_form.fields) {
                    input.checked = filled_form.fields[ele.name];
                }
                wrapper.appendChild(label);
                label.appendChild(input);
                label.appendChild(span);
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_2.FormEntityType.datetime) {
                const wrapper = createInputWrapper();
                const input = document.createElement('input');
                const label = document.createElement('label');
                // Pour que le label ne recouvre pas le texte du champ
                label.classList.add('active');
                input.type = "datetime-local";
                input.classList.add('input-form-element');
                fillStandardInputValues(input, ele, label);
                if (filled_form && ele.name in filled_form.fields) {
                    input.value = filled_form.fields[ele.name];
                }
                else {
                    // Problème: la date à entrer dans l'input est la date UTC
                    // On "corrige" ça par manipulation de la date (on rajoute l'offset)
                    let date_plus_timezone = new Date();
                    date_plus_timezone.setTime(date_plus_timezone.getTime() + (-date_plus_timezone.getTimezoneOffset() * 60 * 1000));
                    const date_str = date_plus_timezone.toISOString();
                    input.value = date_str.substring(0, date_str.length - 8);
                }
                wrapper.appendChild(label);
                wrapper.appendChild(input);
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_2.FormEntityType.file) {
                if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                    // L'input file est déjà présent dans le formulaire
                    // on affiche une miniature
                    const img_miniature = document.createElement('div');
                    img_miniature.classList.add('image-form-wrapper');
                    const img_balise = document.createElement('img');
                    img_balise.classList.add('img-form-element');
                    helpers_3.createImgSrc(filled_form.fields[ele.name], img_balise);
                    img_miniature.appendChild(img_balise);
                    placeh.appendChild(img_miniature);
                }
                // Input de type file
                const wrapper = document.createElement('div');
                wrapper.classList.add('file-field', 'input-field', 'row', 'col', 's12');
                const divbtn = document.createElement('div');
                divbtn.classList.add('btn');
                const span = document.createElement('span');
                span.innerText = "Fichier";
                const input = document.createElement('input');
                input.type = "file";
                input.id = "id_" + ele.name;
                input.name = ele.name;
                input.required = ele.required;
                input.accept = ele.file_type || "";
                input.classList.add('input-image-element');
                divbtn.appendChild(span);
                divbtn.appendChild(input);
                wrapper.appendChild(divbtn);
                const fwrapper = document.createElement('div');
                fwrapper.classList.add('file-path-wrapper');
                const f_input = document.createElement('input');
                f_input.type = "text";
                f_input.classList.add('file-path', 'validate');
                f_input.value = ele.label;
                if (filled_form && ele.name in filled_form) {
                    // Afficher un aperçu de l'image
                    // TODO
                }
                fwrapper.appendChild(f_input);
                wrapper.appendChild(fwrapper);
                placeh.appendChild(wrapper);
                // Sépare les champ input file
                placeh.insertAdjacentHTML('beforeend', "<div class='clearb'></div><div class='divider divider-margin'></div>");
            }
            else if (ele.type === form_schema_2.FormEntityType.audio) {
                // Création d'un bouton pour enregistrer du son
                const wrapper = document.createElement('div');
                wrapper.classList.add('input-field', 'row', 'col', 's12', 'no-margin-top');
                const label = document.createElement('p');
                label.classList.add('no-margin-top');
                label.innerText = ele.label;
                wrapper.appendChild(label);
                const button = document.createElement('button');
                button.classList.add('btn', 'blue', 'col', 's12', 'btn-perso');
                button.innerText = "Enregistrement audio";
                button.type = "button";
                const real_input = document.createElement('input');
                real_input.type = "hidden";
                real_input.classList.add('input-audio-element');
                // Création d'un label vide pour l'input
                const hidden_label = document.createElement('label');
                fillStandardInputValues(real_input, ele, hidden_label);
                hidden_label.classList.add('hide');
                wrapper.appendChild(hidden_label);
                ////// Définition si un fichier son existe déjà
                if (filled_form && ele.name in filled_form.fields && filled_form.fields[ele.name] !== null) {
                    helpers_3.readFromFile(filled_form.fields[ele.name], function (base64) {
                        button.classList.remove('blue');
                        button.classList.add('green');
                        real_input.value = base64;
                        const duration = ((base64.length * 0.7) / 256000) * 8;
                        button.innerText = "Enregistrement (" + duration.toFixed(0) + "s" + ")";
                    }, function (fail) {
                        console.log("Impossible de charger le fichier", fail);
                    }, true);
                }
                ////// Fin
                button.addEventListener('click', function () {
                    // Crée un modal qui sert à enregistrer de l'audio
                    audio_listener_2.newModalRecord(button, real_input, ele);
                });
                wrapper.appendChild(button);
                wrapper.appendChild(real_input);
                element_to_add = wrapper;
            }
            else if (ele.type === form_schema_2.FormEntityType.slider) {
                const wrapper = document.createElement('div');
                const label = document.createElement('label');
                const input = document.createElement('input');
                const span = document.createElement('span');
                fillStandardInputValues(input, ele);
                wrapper.classList.add('row', 'col', 's12', 'input-slider', 'switch');
                input.classList.add('input-form-element', 'input-slider-element');
                input.type = "checkbox";
                input.checked = ele.default_value;
                span.classList.add('lever');
                wrapper.appendChild(label);
                // Texte si not checked
                label.insertAdjacentText('afterbegin', ele.slider_options[0].label);
                label.appendChild(input);
                label.appendChild(span);
                // Texte si checked
                label.insertAdjacentText('beforeend', ele.slider_options[1].label);
                // Insertion des deux options dans l'input en data-
                input.dataset.ifunchecked = ele.slider_options[0].name;
                input.dataset.ifchecked = ele.slider_options[1].name;
                if (filled_form && ele.name in filled_form.fields) {
                    input.checked = ele.slider_options[1].name === filled_form.fields[ele.name];
                }
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            if (element_to_add)
                placeh.appendChild(element_to_add);
        }
    }
    exports.constructForm = constructForm;
    /**
     * Initie la sauvegarde: présente et vérifie les champs
     *  @param type
     */
    function initFormSave(type) {
        console.log("Demarrage initFormSave");
        // Ouverture du modal de verification
        const modal = helpers_3.getModal();
        helpers_3.initModal({ dismissible: true });
        modal.classList.add('modal-fixed-footer');
        helpers_3.getModalInstance().open();
        //Ouverture du premiere modal de chargement
        modal.innerHTML = helpers_3.getModalPreloader("Validation du formulaire...\nCeci peut prendre quelques secondes", `<div class="modal-footer">
            <a href="#!" id="cancel_verif" class="btn-flat red-text">Annuler</a>
        </div>`);
        // creation de la liste d'erreurs
        let list_erreur = document.createElement("div");
        list_erreur.classList.add("modal-content");
        let element_erreur = document.createElement("ul");
        element_erreur.classList.add("collection");
        list_erreur.appendChild(element_erreur);
        //Ajouter verification avant d'ajouter bouton valider
        let erreur_critique = false;
        //Parcours tous les elements remplits ou non
        for (const input of document.getElementsByClassName('input-form-element')) {
            //Attribution du label plutot que son nom interne
            const i = input;
            const label = document.querySelector(`label[for="${i.id}"]`);
            let name = i.name;
            if (label) {
                name = label.textContent;
            }
            ;
            console.log("definition des contraintes");
            const contraintes = {};
            if (i.dataset.constraints) {
                i.dataset.constraints.split(';').map((e) => {
                    const [name, value] = e.split('=');
                    contraintes[name] = value;
                });
            }
            console.log(contraintes);
            //Si l'attribut est obligatoirement requis et qu'il est vide -> erreur critique impossible de sauvegarder
            if (i.required && !i.value) {
                let erreur = document.createElement("li");
                erreur.classList.add("collection-item");
                erreur.innerHTML = "<b style='color: red;' >" + name + "</b> : Champ requis";
                element_erreur.insertBefore(erreur, element_erreur.firstChild);
                erreur_critique = true;
                continue;
            }
            if (input.tagName === "SELECT" && input.multiple) {
                const selected = [...input.options].filter(option => option.selected).map(option => option.value);
                if (selected.length == 0) {
                    let erreur = document.createElement("li");
                    erreur.classList.add("collection-item");
                    erreur.innerHTML = "<b>" + name + "</b> : Non renseigné";
                    element_erreur.appendChild(erreur);
                }
            }
            else if (i.type !== "checkbox") {
                if (!i.value) {
                    let erreur = document.createElement("li");
                    erreur.classList.add("collection-item");
                    erreur.innerHTML = "<b>" + name + "</b> : Non renseigné";
                    element_erreur.appendChild(erreur);
                }
            }
        }
        modal.innerHTML = "";
        modal.appendChild(list_erreur);
        let footer = document.createElement("div");
        footer.classList.add("modal-footer");
        if (erreur_critique) {
            footer.innerHTML = `<a href="#!" id="cancel_verif" class="btn-flat red-text">Corriger</a>
        </div>`;
        }
        else {
            footer.innerHTML = `<a href="#!" id="cancel_verif" class="btn-flat red-text">Corriger</a><a href="#!" id="valid_verif" class="btn-flat green-text">Valider</a>
        </div>`;
        }
        modal.appendChild(footer);
        document.getElementById("cancel_verif").onclick = function () {
            helpers_3.getModalInstance().close();
        };
        if (!erreur_critique) {
            document.getElementById("valid_verif").onclick = function () {
                helpers_3.getModalInstance().close();
                const current_form_key = form_schema_2.Forms.current_key;
                saveForm(current_form_key);
            };
        }
        ;
        // Si champ invalide suggéré (dépassement de range, notamment) ou champ vide, message d'alerte, mais
    }
    /**
     * Sauvegarde le formulaire actuel dans un fichier .json
     *  @param type
     *  @param force_name? Force un nom pour le formulaire
     */
    function saveForm(type, force_name, form_save) {
        const form_values = {
            fields: {},
            type,
            location: document.getElementById('__location__id').dataset.reallocation
        };
        for (const input of document.getElementsByClassName('input-form-element')) {
            const i = input;
            if (input.tagName === "SELECT" && input.multiple) {
                const selected = [...input.options].filter(option => option.selected).map(option => option.value);
                form_values.fields[i.name] = selected;
            }
            else if (i.type === "checkbox") {
                if (i.classList.contains("input-slider-element")) {
                    // C'est un slider
                    form_values.fields[i.name] = (i.checked ? i.dataset.ifchecked : i.dataset.ifunchecked);
                }
                else {
                    // C'est une checkbox classique
                    form_values.fields[i.name] = i.checked;
                }
            }
            else if (i.type === "number") {
                form_values.fields[i.name] = i.value === "" ? null : Number(i.value);
            }
            else {
                form_values.fields[i.name] = i.value;
            }
        }
        writeImagesThenForm(force_name || helpers_3.generateId(20), form_values, form_save);
    }
    exports.saveForm = saveForm;
    /**
     * Ecrit les images présentes dans le formulaire dans un dossier spécifique,
     * puis crée le formulaire
     * @param name Nom du formulaire (sans le .json)
     */
    function writeImagesThenForm(name, form_values, older_save) {
        function saveBlobToFile(resolve, reject, filename, input_name, blob) {
            helpers_3.writeFile('form_data/' + name, filename, blob, function () {
                // Enregistre le nom du fichier sauvegardé dans le formulaire,
                // dans la valeur du champ field
                form_values.fields[input_name] = 'form_data/' + name + '/' + filename;
                if (older_save && input_name in older_save.fields && older_save.fields[input_name] !== null) {
                    // Si une image était déjà présente
                    if (older_save.fields[input_name] !== form_values.fields[input_name]) {
                        // Si le fichier enregistré est différent du fichier actuel
                        // Suppression de l'ancienne image
                        const parts = older_save.fields[input_name].split('/');
                        const file_name = parts.pop();
                        const dir_name = parts.join('/');
                        helpers_3.removeFileByName(dir_name, file_name);
                    }
                }
                // Résout la promise
                resolve();
            }, function (error) {
                // Erreur d'écriture du fichier => on rejette
                M.toast({ html: "Un fichier n'a pas pu être sauvegardée. Vérifiez votre espace de stockage." });
                reject(error);
            });
        }
        helpers_3.getDir(function () {
            // Crée le dossier form_data si besoin
            // Récupère les images du formulaire
            const images_from_form = document.getElementsByClassName('input-image-element');
            // Sauvegarde les images !
            const promises = [];
            for (const img of images_from_form) {
                promises.push(new Promise(function (resolve, reject) {
                    const file = img.files[0];
                    const input_name = img.name;
                    if (file) {
                        const filename = file.name;
                        const r = new FileReader();
                        r.onload = function () {
                            saveBlobToFile(resolve, reject, filename, input_name, new Blob([this.result]));
                        };
                        r.onerror = function (error) {
                            // Erreur de lecture du fichier => on rejette
                            reject(error);
                        };
                        r.readAsArrayBuffer(file);
                    }
                    else {
                        if (older_save && input_name in older_save.fields) {
                            form_values.fields[input_name] = older_save.fields[input_name];
                        }
                        else {
                            form_values.fields[input_name] = null;
                        }
                        resolve();
                    }
                }));
            }
            // Récupère les données audio du formulaire
            const audio_from_form = document.getElementsByClassName('input-audio-element');
            for (const audio of audio_from_form) {
                promises.push(new Promise(function (resolve, reject) {
                    const file = audio.value;
                    const input_name = audio.name;
                    if (file) {
                        const filename = helpers_3.generateId(20) + '.mp3';
                        helpers_3.urlToBlob(file).then(function (blob) {
                            saveBlobToFile(resolve, reject, filename, input_name, blob);
                        });
                    }
                    else {
                        if (older_save && input_name in older_save.fields) {
                            form_values.fields[input_name] = older_save.fields[input_name];
                        }
                        else {
                            form_values.fields[input_name] = null;
                        }
                        resolve();
                    }
                }));
            }
            Promise.all(promises)
                .then(function () {
                // On écrit enfin le formulaire !
                helpers_3.writeFile('forms', name + '.json', new Blob([JSON.stringify(form_values)]), function () {
                    M.toast({ html: "Écriture du formulaire et de ses données réussie." });
                    if (older_save) {
                        // On vient de la page d'édition de formulaire déjà créés
                        interface_2.PageManager.popPage();
                        interface_2.PageManager.changePage(interface_2.AppPageName.saved, false);
                    }
                    else {
                        interface_2.PageManager.changePage(interface_2.AppPageName.form, false);
                    }
                    console.log(form_values);
                });
            })
                .catch(function (error) {
                console.log(error);
                M.toast({ html: "Impossible d'écrire le formulaire." });
            });
        }, 'form_data');
    }
    /**
     * Fonction qui va faire attendre l'arrivée du formulaire,
     * puis charger la page
     * @param base
     */
    function initFormPage(base, edition_mode) {
        if (edition_mode) {
            loadFormPage(base, edition_mode.form, edition_mode);
        }
        else {
            form_schema_2.Forms.onReady(function (available, current) {
                loadFormPage(base, current, edition_mode);
            });
        }
    }
    exports.initFormPage = initFormPage;
    /**
     * Charge la page de formulaire (point d'entrée)
     * @param base Element dans lequel écrire la page
     */
    function loadFormPage(base, current_form, edition_mode) {
        base.innerHTML = "";
        const base_block = document.createElement('div');
        base_block.classList.add('row', 'container');
        const placeh = document.createElement('form');
        placeh.classList.add('col', 's12');
        base_block.appendChild(placeh);
        // Appelle la fonction pour construire
        if (edition_mode) {
            constructForm(placeh, current_form, edition_mode.save);
        }
        else {
            constructForm(placeh, current_form);
        }
        base.appendChild(base_block);
        M.updateTextFields();
        $('select').formSelect();
        // Lance le sélecteur de localisation uniquement si on est pas en mode édition
        if (!edition_mode) {
            callLocationSelector(current_form);
        }
        // Autoredimensionnement des textaera si valeur par défaut
        const $textarea = $('textarea');
        if ($textarea.length > 0) {
            M.textareaAutoResize($textarea);
        }
        // Création du bouton de sauvegarde
        const btn = document.createElement('div');
        btn.classList.add('btn-flat', 'right', 'red-text');
        btn.innerText = "Enregistrer";
        const current_form_key = form_schema_2.Forms.current_key;
        btn.addEventListener('click', function () {
            if (edition_mode) {
                saveForm(current_form_key, edition_mode.name, edition_mode.save);
            }
            else {
                try {
                    initFormSave(current_form_key);
                }
                catch (e) {
                    logger_2.Logger.error(JSON.stringify(e));
                }
            }
        });
        base_block.appendChild(btn);
    }
    exports.loadFormPage = loadFormPage;
    function cancelGeoLocModal() {
        // On veut fermer; Deux possibilités.
        // Si le champ lieu est déjà défini et rempli, on ferme juste le modal
        if (document.getElementById("__location__id").value.trim() !== "") {
            // On ferme juste le modal
        }
        else {
            // Sinon, on ramène à la page précédente
            interface_2.PageManager.popPage();
        }
        helpers_3.getModalInstance().close();
        helpers_3.getModal().classList.remove('modal-fixed-footer');
    }
    function callLocationSelector(current_form) {
        // Obtient l'élément HTML du modal
        const modal = helpers_3.getModal();
        helpers_3.initModal({
            dismissible: false
        });
        // Ouvre le modal et insère un chargeur
        helpers_3.getModalInstance().open();
        modal.innerHTML = helpers_3.getModalPreloader("Recherche de votre position...\nCeci peut prendre jusqu'à 30 secondes.", `<div class="modal-footer">
            <a href="#!" id="dontloc-footer-geoloc" class="btn-flat blue-text left">Saisie manuelle</a>
            <a href="#!" id="close-footer-geoloc" class="btn-flat red-text">Annuler</a>
            <div class="clearb"></div>
        </div>`);
        let is_loc_canceled = false;
        document.getElementById("close-footer-geoloc").onclick = function () {
            is_loc_canceled = true;
            cancelGeoLocModal();
        };
        document.getElementById('dontloc-footer-geoloc').onclick = function () {
            is_loc_canceled = true;
            locationSelector(modal, current_form.locations, false);
        };
        // Cherche la localisation et remplit le modal
        helpers_3.getLocation(function (coords) {
            if (!is_loc_canceled)
                locationSelector(modal, current_form.locations, coords);
        }, function () {
            if (!is_loc_canceled)
                locationSelector(modal, current_form.locations);
        });
    }
    function textDistance(distance) {
        const unit = (distance >= 1000 ? "km" : "m");
        const str_distance = (distance >= 1000 ? (distance / 1000).toFixed(1) : distance.toString());
        return `${str_distance} ${unit}`;
    }
    function locationSelector(modal, locations, current_location) {
        // Met le modal en modal avec footer fixé
        modal.classList.add('modal-fixed-footer');
        // Crée le contenu du modal et son footer
        const content = document.createElement('div');
        content.classList.add('modal-content');
        const footer = document.createElement('div');
        footer.classList.add('modal-footer');
        // Création de l'input qui va contenir le lieu
        const input = document.createElement('input');
        input.autocomplete = "off";
        // Sélection manuelle
        const title = document.createElement('h5');
        title.innerText = "Sélection manuelle";
        content.appendChild(title);
        // Création du champ à autocompléter
        // Conteneur
        const row = document.createElement('div');
        row.classList.add('row');
        content.appendChild(row);
        // Input field
        const input_f = document.createElement('div');
        input_f.classList.add('input-field', 'col', 's12');
        row.appendChild(input_f);
        // Champ input réel et son label
        const label = document.createElement('label');
        input.type = "text";
        input.id = "autocomplete_field_id";
        label.htmlFor = "autocomplete_field_id";
        label.textContent = "Lieu";
        input.classList.add('autocomplete');
        input_f.appendChild(input);
        input_f.appendChild(label);
        // Initialisation de l'autocomplétion
        const auto_complete_data = {};
        for (const lieu of locations) {
            auto_complete_data[lieu.label] = null;
        }
        // Vide le modal actuel et le remplace par le contenu et footer créés
        modal.innerHTML = "";
        modal.appendChild(content);
        // Création d'un objet label => value
        const labels_to_name = {};
        for (const lieu of locations) {
            labels_to_name[lieu.label] = lieu.name;
        }
        // Lance l'autocomplétion materialize
        M.Autocomplete.init(input, {
            data: auto_complete_data,
            limit: 5,
            onAutocomplete: function () {
                // Remplacement du label par le nom réel
                const location = input.value;
                // Recherche le label sélectionné dans l'objet les contenants
                if (location in labels_to_name) {
                    input.value = location;
                }
            }
        });
        // Construction de la liste de lieux si la location est trouvée
        if (current_location) {
            // Création de la fonction qui va gérer le cas où l'on appuie sur un lieu
            function clickOnLocation() {
                input.value = this.dataset.label;
                M.updateTextFields();
            }
            // Calcul de la distance entre chaque lieu et le lieu actuel
            let lieux_dispo = [];
            for (const lieu of locations) {
                lieux_dispo.push({
                    name: lieu.name,
                    label: lieu.label,
                    distance: helpers_3.calculateDistance(current_location.coords, lieu)
                });
            }
            lieux_dispo = lieux_dispo.sort((a, b) => a.distance - b.distance);
            // Titre
            const title = document.createElement('h5');
            title.innerText = "Lieux disponibles";
            content.appendChild(title);
            // Construction de la liste des lieux proches
            const collection = document.createElement('div');
            collection.classList.add('collection');
            for (let i = 0; i < lieux_dispo.length && i < main_1.MAX_LIEUX_AFFICHES; i++) {
                const elem = document.createElement('a');
                elem.href = "#!";
                elem.classList.add('collection-item');
                elem.innerHTML = `
                ${lieux_dispo[i].label}
                <span class="right grey-text lighten-1">${textDistance(lieux_dispo[i].distance)}</span>
            `;
                elem.dataset.name = lieux_dispo[i].name;
                elem.dataset.label = lieux_dispo[i].label;
                elem.addEventListener('click', clickOnLocation);
                collection.appendChild(elem);
            }
            content.appendChild(collection);
        }
        else if (current_location === false) {
            // On affiche aucun texte dans ce cas.
            // (écran de sélection manuelle expréssément demandé)
        }
        else {
            // Affichage d'une erreur: géolocalisation impossible
            const error = document.createElement('h6');
            error.classList.add('red-text');
            error.innerText = "Impossible de vous géolocaliser.";
            const subtext = document.createElement('div');
            subtext.classList.add('red-text', 'flow-text');
            subtext.innerText = "Choisissez un lieu manuellement.";
            content.appendChild(error);
            content.appendChild(subtext);
        }
        // Création du footer
        const ok = document.createElement('a');
        ok.href = "#!";
        ok.innerText = "Confirmer";
        ok.classList.add("btn-flat", "green-text", "right");
        ok.addEventListener('click', function () {
            if (input.value.trim() === "") {
                M.toast({ html: "Vous devez préciser un lieu." });
            }
            else if (input.value in labels_to_name) {
                const loc_input = document.getElementById('__location__id');
                loc_input.value = input.value;
                loc_input.dataset.reallocation = labels_to_name[input.value];
                helpers_3.getModalInstance().close();
                modal.classList.remove('modal-fixed-footer');
            }
            else {
                M.toast({ html: "Le lieu entré n'a aucune correspondance dans la base de données." });
            }
        });
        footer.appendChild(ok);
        // Création du bouton annuler
        const cancel = document.createElement('a');
        cancel.href = "#!";
        cancel.innerText = "Annuler";
        cancel.classList.add("btn-flat", "red-text", "left");
        cancel.addEventListener('click', cancelGeoLocModal);
        footer.appendChild(cancel);
        modal.appendChild(footer);
    }
});
define("settings_page", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function initSettingsPage(base) {
        base.innerHTML = "";
    }
    exports.initSettingsPage = initSettingsPage;
});
define("saved_forms", ["require", "exports", "helpers", "form_schema", "interface"], function (require, exports, helpers_4, form_schema_3, interface_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function editAForm(form, name) {
        // Vérifie que le formulaire est d'un type disponible
        if (!form_schema_3.Forms.formExists(form.type)) {
            M.toast({ html: "Impossible de charger ce fichier: Le type de formulaire enregistré est indisponible." });
            return;
        }
        const current_form = form_schema_3.Forms.getForm(form.type);
        const base = helpers_4.getBase();
        interface_3.PageManager.pushPage(interface_3.AppPageName.form, "Modifier", { form: current_form, name, save: form });
    }
    function appendFileEntry(json, ph) {
        const save = json[1];
        const selector = document.createElement('li');
        selector.classList.add('collection-item');
        const container = document.createElement('div');
        let id = json[0].name;
        if (form_schema_3.Forms.formExists(save.type)) {
            const id_f = form_schema_3.Forms.getForm(save.type).id_field;
            if (id_f) {
                // Si un champ existe pour ce formulaire
                id = save.fields[id_f] || json[0].name;
            }
        }
        // Ajoute le texte de l'élément
        container.innerHTML = `
        <div class="left">
            ${id} <br> 
            Modifié le ${helpers_4.formatDate(new Date(json[0].lastModified), true)}
        </div>`;
        // Ajoute le bouton de suppression
        const delete_btn = document.createElement('a');
        delete_btn.href = "#!";
        delete_btn.classList.add('secondary-content');
        const im = document.createElement('i');
        im.classList.add('material-icons', 'red-text');
        im.innerText = "delete_forever";
        delete_btn.appendChild(im);
        container.appendChild(delete_btn);
        const file_name = json[0].name;
        delete_btn.addEventListener('click', function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            modalDeleteForm(file_name);
        });
        // Clear le float
        container.insertAdjacentHTML('beforeend', "<div class='clearb'></div>");
        // Définit l'événement d'édition
        selector.addEventListener('click', function () {
            editAForm(json[1], json[0].name.split(/\.json$/)[0]);
        });
        // Ajoute les éléments dans le conteneur final
        selector.appendChild(container);
        ph.appendChild(selector);
    }
    function readAllFilesOfDirectory(dirName) {
        const dirreader = new Promise(function (resolve, reject) {
            helpers_4.getDir(function (dirEntry) {
                // Lecture de tous les fichiers du répertoire
                const reader = dirEntry.createReader();
                reader.readEntries(function (entries) {
                    const promises = [];
                    for (const entry of entries) {
                        promises.push(new Promise(function (resolve, reject) {
                            entry.file(function (file) {
                                const reader = new FileReader();
                                console.log(file);
                                reader.onloadend = function () {
                                    try {
                                        resolve([file, JSON.parse(this.result)]);
                                    }
                                    catch (e) {
                                        console.log("JSON mal formé:", this.result);
                                        resolve([file, { fields: {}, type: "", location: "" }]);
                                    }
                                };
                                reader.onerror = function (err) {
                                    reject(err);
                                };
                                reader.readAsText(file);
                            }, function (err) {
                                reject(err);
                            });
                        }));
                    }
                    // Renvoie le tableau de promesses lancées
                    resolve(promises);
                }, function (err) {
                    reject(err);
                    console.log(err);
                });
            }, dirName, function (err) {
                reject(err);
            });
        });
        // @ts-ignore
        return dirreader;
    }
    function modalDeleteForm(id) {
        const modal = helpers_4.getBottomModal();
        helpers_4.initBottomModal({}, `<div class="modal-content">
            <h4>Supprimer ce formulaire ?</h4>
            <p>
                Vous ne pourrez pas le restaurer ultérieurement.
            </p>
        </div>
        <div class="modal-footer">
            <a href="#!" class="modal-close green-text btn-flat left">Annuler</a>
            <a href="#!" id="delete_form_modal" class="red-text btn-flat right">Supprimer</a>
        </div>
        `);
        const instance = helpers_4.getBottomModalInstance();
        document.getElementById('delete_form_modal').onclick = function () {
            deleteForm(id).then(function () {
                M.toast({ html: "Entrée supprimée." });
                interface_3.PageManager.changePage(interface_3.AppPageName.saved, false);
                instance.close();
            }).catch(function (err) {
                M.toast({ html: "Impossible de supprimer: " + err });
                instance.close();
            });
        };
        instance.open();
    }
    function deleteForm(id) {
        if (id.match(/\.json$/)) {
            id = id.substring(0, id.length - 5);
        }
        return new Promise(function (resolve, reject) {
            if (id) {
                // Supprime toutes les données (images, sons...) liées au formulaire
                helpers_4.rmrfPromise('form_data/' + id, true).catch(err => err).then(function () {
                    helpers_4.getDir(function (dirEntry) {
                        dirEntry.getFile(id + '.json', { create: false }, function (fileEntry) {
                            helpers_4.removeFilePromise(fileEntry).then(function () {
                                resolve();
                            }).catch(reject);
                        }, function () {
                            console.log("Impossible de supprimer");
                            reject("Impossible de supprimer");
                        });
                    }, 'forms', reject);
                });
            }
            else {
                reject("ID invalide");
            }
        });
    }
    function initSavedForm(base) {
        const placeholder = document.createElement('ul');
        placeholder.classList.add('collection', 'no-margin-top');
        readAllFilesOfDirectory('forms').then(function (all_promises) {
            Promise.all(all_promises).then(function (files) {
                files = files.sort((a, b) => b[0].lastModified - a[0].lastModified);
                for (const f of files) {
                    appendFileEntry(f, placeholder);
                }
                base.innerHTML = "";
                base.appendChild(placeholder);
                if (files.length === 0) {
                    base.innerHTML = "<h5 class='empty vertical-center'>Vous n'avez aucun formulaire sauvegardé.</h5>";
                }
            }).catch(function (err) {
                throw err;
            });
        }).catch(function (err) {
            console.log(err);
            base.innerHTML = "<h4 class='red-text'>Impossible de charger les fichiers.</h4>";
        });
    }
    exports.initSavedForm = initSavedForm;
});
define("interface", ["require", "exports", "helpers", "form", "settings_page", "saved_forms", "main"], function (require, exports, helpers_5, form_1, settings_page_1, saved_forms_1, main_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.APP_NAME = "Busy Bird";
    var AppPageName;
    (function (AppPageName) {
        AppPageName["form"] = "form";
        AppPageName["settings"] = "settings";
        AppPageName["saved"] = "saved";
        AppPageName["home"] = "home";
    })(AppPageName = exports.AppPageName || (exports.AppPageName = {}));
    exports.PageManager = new class {
        constructor() {
            /**
             * Déclaration des pages possibles
             * Chaque clé de AppPages doit être une possibilité de AppPageName
             */
            this.AppPages = {
                form: {
                    name: "Nouvelle entrée",
                    callback: form_1.initFormPage,
                    ask_change: true,
                    reload_on_restore: false
                },
                settings: {
                    name: "Paramètres",
                    callback: settings_page_1.initSettingsPage,
                    reload_on_restore: false
                },
                saved: {
                    name: "Entrées",
                    callback: saved_forms_1.initSavedForm,
                    reload_on_restore: true
                },
                home: {
                    name: "Accueil",
                    callback: initHomePage,
                    reload_on_restore: false
                }
            };
            this.pages_holder = [];
        }
        updateReturnBtn() {
            // @ts-ignore
            if (device.platform === "browser") {
                const back_btn = document.getElementById('__nav_back_button');
                if (this.isPageWaiting()) {
                    back_btn.classList.remove('hide');
                }
                else {
                    back_btn.classList.add('hide');
                }
            }
        }
        /**
         * Change l'affichage et charge la page "page" dans le bloc principal
         * @param AppPageName page
         * @param delete_paused supprime les pages sauvegardées
         */
        changePage(page, delete_paused = true, force_name, additionnals) {
            let pagename = "";
            if (typeof page === 'string') {
                // AppPageName
                if (!this.pageExists(page)) {
                    throw new ReferenceError("Page does not exists");
                }
                pagename = page;
                page = this.AppPages[page];
            }
            else {
                // Recherche de la clé correspondante
                for (const k in this.AppPages) {
                    if (this.AppPages[k] === page) {
                        pagename = k;
                        break;
                    }
                }
            }
            // Si on veut supprimer les pages en attente, on vide le tableau
            if (delete_paused) {
                this.pages_holder = [];
            }
            // On écrit le preloader dans la base et on change l'historique
            const base = helpers_5.getBase();
            base.innerHTML = helpers_5.getPreloader("Chargement");
            if (window.history) {
                window.history.pushState({}, "", "/?" + pagename);
            }
            // Si on a demandé à fermer le sidenav, on le ferme
            if (!page.not_sidenav_close) {
                main_2.SIDENAV_OBJ.close();
            }
            // On appelle la fonction de création de la page
            page.callback(base, additionnals);
            this.actual_page = page;
            this._should_wait = page.ask_change;
            // On met le titre de la page dans la barre de navigation
            document.getElementById('nav_title').innerText = force_name || page.name;
            this.updateReturnBtn();
        }
        cleanWaitingPages() {
            while (this.pages_holder.length >= 10) {
                this.pages_holder.shift();
            }
        }
        /**
         * Pousse une nouvelle page dans la pile de page
         * @param page
         */
        pushPage(page, force_name, additionnals) {
            if (!this.pageExists(page)) {
                throw new ReferenceError("Page does not exists");
            }
            // Si il y a plus de 10 pages dans la pile, clean
            this.cleanWaitingPages();
            // Récupère le contenu actuel du bloc mère
            const actual_base = helpers_5.getBase();
            // Sauvegarde de la base actuelle dans le document fragment
            // Cela supprime immédiatement le noeud du DOM
            // const save = new DocumentFragment(); // semble être trop récent
            const save = document.createDocumentFragment();
            save.appendChild(actual_base);
            // Insère la sauvegarde dans la pile de page
            this.pages_holder.push({
                save,
                ask: this._should_wait,
                name: document.getElementById('nav_title').innerText,
                page: this.actual_page
            });
            // Crée la nouvelle base mère avec le même ID
            const new_base = document.createElement('div');
            new_base.id = "main_block";
            // Insère la nouvelle base vide à la racine de main
            document.getElementsByTagName('main')[0].appendChild(new_base);
            // Appelle la fonction pour charger la page demandée dans le bloc
            this.changePage(page, false, force_name, additionnals);
        }
        /**
         * Revient à la page précédente.
         * Charge la page d'accueil si aucune page disponible
         */
        popPage() {
            if (this.pages_holder.length === 0) {
                this.changePage(AppPageName.home);
                return;
            }
            // Récupère la dernière page poussée dans le tableau
            const last_page = this.pages_holder.pop();
            // Supprime le main actuel
            helpers_5.getBase().remove();
            // Met le fragment dans le DOM
            document.getElementsByTagName('main')[0].appendChild(last_page.save.firstElementChild);
            // Remet le bon titre
            document.getElementById('nav_title').innerText = last_page.name;
            this.actual_page = last_page.page;
            this._should_wait = last_page.ask;
            if (this.actual_page.reload_on_restore) {
                if (typeof this.actual_page.reload_on_restore === 'boolean') {
                    this.changePage(this.actual_page, false);
                }
                else {
                    this.actual_page.reload_on_restore();
                }
            }
            this.updateReturnBtn();
        }
        /**
         * Retourne à la page précédente, et demande si à confirmer si la page a le flag "should_wait".
         */
        goBack() {
            const stepBack = () => {
                // Ferme le modal possiblement ouvert
                try {
                    helpers_5.getModalInstance().close();
                }
                catch (e) { }
                if (this.isPageWaiting()) {
                    this.popPage();
                }
                else {
                    this.changePage(AppPageName.home);
                }
            };
            if (this.should_wait) {
                modalBackHome(stepBack);
            }
            else {
                stepBack();
            }
        }
        get should_wait() {
            return this._should_wait;
        }
        set should_wait(v) {
            this._should_wait = v;
        }
        pageExists(name) {
            return name in this.AppPages;
        }
        isPageWaiting() {
            return this.pages_holder.length > 0;
        }
    };
    function initHomePage(base) {
        base.innerHTML = "<h2 class='center'>" + exports.APP_NAME + "</h2>" + `
    <div class="container">
        <p class="flow-text">
            Bienvenue dans Busy Bird, l'application qui facilite la prise de données de terrain
            pour les biologistes.
            Commencez en choisissant le "Nouvelle entrée" dans le menu de côté.
        </p>
    </div>
    `;
        // Initialise les champs materialize et le select
        M.updateTextFields();
        $('select').formSelect();
    }
    exports.initHomePage = initHomePage;
    function modalBackHome(callbackIfTrue) {
        const modal = helpers_5.getBottomModal();
        const instance = helpers_5.initBottomModal();
        modal.innerHTML = `
    <div class="modal-content">
        <h5 class="no-margin-top">Aller à la page précédente ?</h5>
        <p class="flow-text">Les modifications sur la page actuelle seront perdues.</p>
    </div>
    <div class="modal-footer">
        <a href="#!" id="__modal_back_home" class="btn-flat red-text right modal-close">Retour</a>
        <a href="#!" class="btn-flat blue-text left modal-close">Annuler</a>
        <div class="clearb"></div>
    </div>
    `;
        document.getElementById('__modal_back_home').onclick = callbackIfTrue;
        instance.open();
    }
    exports.modalBackHome = modalBackHome;
});
define("helpers", ["require", "exports", "interface"], function (require, exports, interface_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // PRELOADERS: spinners for waiting time
    exports.PRELOADER_BASE = `
<div class="spinner-layer spinner-blue-only">
    <div class="circle-clipper left">
        <div class="circle"></div>
    </div><div class="gap-patch">
        <div class="circle"></div>
    </div><div class="circle-clipper right">
        <div class="circle"></div>
    </div>
</div>`;
    exports.PRELOADER = `
<div class="preloader-wrapper active">
    ${exports.PRELOADER_BASE}
</div>`;
    exports.SMALL_PRELOADER = `
<div class="preloader-wrapper small active">
    ${exports.PRELOADER_BASE}
</div>`;
    /**
     * @returns HTMLElement Élément HTML dans lequel écrire pour modifier la page active
     */
    function getBase() {
        return document.getElementById('main_block');
    }
    exports.getBase = getBase;
    /**
     * Initialise le modal simple avec les options données (voir doc.)
     * et insère de l'HTML dedans avec content
     * @returns M.Modal Instance du modal instancié avec Materialize
     */
    function initModal(options = {}, content) {
        const modal = getModal();
        modal.classList.remove('modal-fixed-footer');
        if (content)
            modal.innerHTML = content;
        return M.Modal.init(modal, options);
    }
    exports.initModal = initModal;
    /**
     * Initialise le modal collé en bas avec les options données (voir doc.)
     * et insère de l'HTML dedans avec content
     * @returns M.Modal Instance du modal instancié avec Materialize
     */
    function initBottomModal(options = {}, content) {
        const modal = getBottomModal();
        if (content)
            modal.innerHTML = content;
        return M.Modal.init(modal, options);
    }
    exports.initBottomModal = initBottomModal;
    /**
     * @returns HTMLElement Élément HTML racine du modal
     */
    function getModal() {
        return document.getElementById('modal_placeholder');
    }
    exports.getModal = getModal;
    /**
     * @returns HTMLElement Élément HTML racine du modal fixé en bas
     */
    function getBottomModal() {
        return document.getElementById('bottom_modal_placeholder');
    }
    exports.getBottomModal = getBottomModal;
    /**
     * @returns M.Modal Instance du modal (doit être initialisé)
     */
    function getModalInstance() {
        return M.Modal.getInstance(getModal());
    }
    exports.getModalInstance = getModalInstance;
    /**
     * @returns M.Modal Instance du modal fixé en bas (doit être initialisé)
     */
    function getBottomModalInstance() {
        return M.Modal.getInstance(getBottomModal());
    }
    exports.getBottomModalInstance = getBottomModalInstance;
    /**
     * Génère un spinner centré sur l'écran avec un message d'attente
     * @param text Texte à insérer comme message de chargement
     * @returns string HTML à insérer
     */
    function getPreloader(text) {
        return `
    <center style="margin-top: 35vh;">
        ${exports.PRELOADER}
    </center>
    <center class="flow-text" style="margin-top: 10px">${text}</center>
    `;
    }
    exports.getPreloader = getPreloader;
    /**
     * Génère un spinner adapté à un modal avec un message d'attente
     * @param text Texte à insérer comme message de chargement
     * @returns string HTML à insérer dans la racine d'un modal
     */
    function getModalPreloader(text, footer) {
        return `<div class="modal-content">
    <center>
        ${exports.SMALL_PRELOADER}
    </center>
    <center class="flow-text pre-wrapper" style="margin-top: 10px">${text}</center>
    </div>
    ${footer}
    `;
    }
    exports.getModalPreloader = getModalPreloader;
    // dec2hex :: Integer -> String
    function dec2hex(dec) {
        return ('0' + dec.toString(16)).substr(-2);
    }
    /**
     * Génère un identifiant aléatoire
     * @param len Longueur de l'ID
     */
    function generateId(len) {
        const arr = new Uint8Array((len || 40) / 2);
        window.crypto.getRandomValues(arr);
        return Array.from(arr, dec2hex).join('');
    }
    exports.generateId = generateId;
    // USELESS
    function saveDefaultForm() {
        // writeFile('schemas/', 'default.json', new Blob([JSON.stringify(current_form)], {type: "application/json"}));
    }
    exports.saveDefaultForm = saveDefaultForm;
    // @ts-ignore 
    // Met le bon répertoire dans FOLDER. Si le stockage interne/sd n'est pas monté,
    // utilise le répertoire data (partition /data) de Android
    let FOLDER = cordova.file.externalDataDirectory || cordova.file.dataDirectory;
    /**
     * Change le répertoire actif en fonction de la plateforme et l'insère dans FOLDER.
     * Fonction appelée automatiquement au démarrage de l'application dans main.initApp()
     */
    function changeDir() {
        // @ts-ignore
        if (device.platform === "browser") {
            FOLDER = "cdvfile://localhost/temporary/";
            // Permet le bouton retour sur navigateur
            const back_btn = document.getElementById('__nav_back_button');
            back_btn.onclick = function () {
                interface_4.PageManager.goBack();
            };
            back_btn.classList.remove('hide');
        }
        // @ts-ignore
        else if (device.platform === "iOS") {
            // @ts-ignore
            FOLDER = cordova.file.dataDirectory;
        }
    }
    exports.changeDir = changeDir;
    let DIR_ENTRY = null;
    function readFromFile(fileName, callback, callbackIfFailed, asBase64 = false) {
        // @ts-ignore
        const pathToFile = FOLDER + fileName;
        // @ts-ignore
        window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
            fileEntry.file(function (file) {
                const reader = new FileReader();
                reader.onloadend = function (e) {
                    callback(this.result);
                };
                if (asBase64) {
                    reader.readAsDataURL(file);
                }
                else {
                    reader.readAsText(file);
                }
            }, function () {
                if (callbackIfFailed) {
                    callbackIfFailed();
                }
                else {
                    console.log("not readable");
                }
            });
        }, function () {
            if (callbackIfFailed) {
                callbackIfFailed();
            }
            else {
                console.log("not found");
            }
        });
    }
    exports.readFromFile = readFromFile;
    /**
     * Appelle le callback avec l'entrée de répertoire voulu par le chemin dirName précisé.
     * Sans dirName, renvoie la racine du système de fichiers.
     * @param callback Function(dirEntry) => void
     * @param dirName string
     * @param onError Function(error) => void
     */
    function getDir(callback, dirName = "", onError) {
        function callGetDirEntry(dirEntry) {
            DIR_ENTRY = dirEntry;
            if (dirName) {
                dirEntry.getDirectory(dirName, { create: true, exclusive: false }, (newEntry) => {
                    if (callback) {
                        callback(newEntry);
                    }
                }, (err) => {
                    console.log("Unable to create dir");
                    if (onError) {
                        onError(err);
                    }
                });
            }
            else if (callback) {
                callback(dirEntry);
            }
        }
        // par défaut, FOLDER vaut "cdvfile://localhost/persistent/"
        if (DIR_ENTRY === null) {
            // @ts-ignore
            window.resolveLocalFileSystemURL(FOLDER, callGetDirEntry, (err) => {
                console.log("Persistent not available", err.message);
                if (onError) {
                    onError(err);
                }
            });
        }
        else {
            callGetDirEntry(DIR_ENTRY);
        }
    }
    exports.getDir = getDir;
    /**
     * Écrit dans le fichier fileName situé dans le dossier dirName le contenu du Blob blob.
     * Après écriture, appelle callback si réussi, onFailure si échec dans toute opération
     * @param dirName string
     * @param fileName string
     * @param blob Blob
     * @param callback Function() => void
     * @param onFailure Function(error) => void | Généralement, error est une DOMException
     */
    function writeFile(dirName, fileName, blob, callback, onFailure) {
        getDir(function (dirEntry) {
            dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
                write(fileEntry, blob).then(function () {
                    if (callback) {
                        callback();
                    }
                }).catch(error => { if (onFailure)
                    onFailure(error); });
            }, function (err) { console.log("Error in writing file", err.message); if (onFailure) {
                onFailure(err);
            } });
        }, dirName);
        function write(fileEntry, dataObj) {
            // Prend l'entry du fichier et son blob à écrire en paramètre
            return new Promise(function (resolve, reject) {
                // Fonction pour écrire le fichier après vidage
                function finally_write() {
                    fileEntry.createWriter(function (fileWriter) {
                        fileWriter.onerror = function (e) {
                            reject(e);
                        };
                        fileWriter.onwriteend = null;
                        fileWriter.write(dataObj);
                        fileWriter.onwriteend = function () {
                            resolve();
                        };
                    });
                }
                // Vide le fichier
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onerror = function (e) {
                        reject(e);
                    };
                    // Vide le fichier
                    fileWriter.truncate(0);
                    // Quand le fichier est vidé, on écrit finalement... enfin.. dedans
                    fileWriter.onwriteend = finally_write;
                });
            });
        }
    }
    exports.writeFile = writeFile;
    /**
     * Crée un dossier name dans la racine du système de fichiers.
     * Si name vaut "dir1/dir2", le dossier "dir2" sera créé si et uniquement si "dir1" existe.
     * Si réussi, appelle onSuccess avec le dirEntry du dossier créé.
     * Si échec, appelle onError avec l'erreur
     * @param name string
     * @param onSuccess Function(dirEntry) => void
     * @param onError Function(error: DOMException) => void
     */
    function createDir(name, onSuccess, onError) {
        getDir(function (dirEntry) {
            dirEntry.getDirectory(name, { create: true }, onSuccess, onError);
        });
    }
    exports.createDir = createDir;
    /**
     * Fonction de test.
     * Affiche les entrées du répertoire path dans la console.
     * Par défaut, affiche la racine du système de fichiers.
     * @param path string
     */
    function listDir(path = "") {
        // @ts-ignore
        getDir(function (fileSystem) {
            const reader = fileSystem.createReader();
            reader.readEntries(function (entries) {
                console.log(entries);
            }, function (err) {
                console.log(err);
            });
        }, path);
    }
    exports.listDir = listDir;
    /**
     * Fonction de test.
     * Écrit l'objet obj sérialisé en JSON à la fin de l'élément HTML ele.
     * @param ele HTMLElement
     * @param obj any
     */
    function printObj(ele, obj) {
        ele.insertAdjacentText('beforeend', JSON.stringify(obj, null, 2));
    }
    exports.printObj = printObj;
    /**
     * Obtient la localisation de l'utilisation.
     * Si réussi, onSuccess est appelée avec en paramètre un objet de type Position
     * @param onSuccess Function(coords: Position) => void
     * @param onFailed Function(error) => void
     */
    function getLocation(onSuccess, onFailed) {
        navigator.geolocation.getCurrentPosition(onSuccess, onFailed, { timeout: 30 * 1000, maximumAge: 5 * 60 * 1000 });
    }
    exports.getLocation = getLocation;
    /**
     * Calcule la distance en mètres entre deux coordonnées GPS.
     * Les deux objets passés doivent implémenter l'interface CoordsLike
     * @param coords1 CoordsLike
     * @param coords2 CoordsLike
     * @returns number Nombre de mètres entre les deux coordonnées
     */
    function calculateDistance(coords1, coords2) {
        // @ts-ignore
        return geolib.getDistance({ latitude: coords1.latitude, longitude: coords1.longitude }, { latitude: coords2.latitude, longitude: coords2.longitude });
    }
    exports.calculateDistance = calculateDistance;
    /**
     * Fonction de test pour tester la géolocalisation.
     * @param latitude
     * @param longitude
     */
    function testDistance(latitude = 45.353421, longitude = 5.836441) {
        getLocation(function (res) {
            console.log(calculateDistance(res.coords, { latitude, longitude }));
        }, function (error) {
            console.log(error);
        });
    }
    exports.testDistance = testDistance;
    /**
     * Supprime un fichier par son nom de dossier dirName et son nom de fichier fileName.
     * Si le chemin du fichier est "dir1/file.json", dirName = "dir1" et fileName = "file.json"
     * @param dirName string
     * @param fileName string
     * @param callback Function() => void Fonction appelée quand le fichier est supprimé
     */
    function removeFileByName(dirName, fileName, callback) {
        getDir(function (dirEntry) {
            dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
                removeFile(fileEntry, callback);
            });
        }, dirName);
    }
    exports.removeFileByName = removeFileByName;
    /**
     * Supprime un fichier via son fileEntry
     * @param entry fileEntry
     * @param callback Function(any?) => void Fonction appelée quand le fichier est supprimé (ou pas)
     */
    function removeFile(entry, callback) {
        entry.remove(function () {
            // Fichier supprimé !
            if (callback)
                callback();
        }, function (err) {
            console.log("error", err);
            if (callback)
                callback(err);
        }, function () {
            console.log("file not found");
            if (callback)
                callback(false);
        });
    }
    exports.removeFile = removeFile;
    /**
     * Supprime un fichier via son fileEntry
     * @param entry fileEntry
     * @returns Promise Promesse tenue si le fichier est supprimé, rejetée sinon
     */
    function removeFilePromise(entry) {
        return new Promise(function (resolve, reject) {
            entry.remove(function () {
                // Fichier supprimé !
                resolve();
            }, function (err) {
                reject(err);
            }, function () {
                resolve();
            });
        });
    }
    exports.removeFilePromise = removeFilePromise;
    /**
     * Supprime tous les fichiers d'un répertoire, sans le répertoire lui-même.
     * @param dirName string Chemin du répertoire
     * @param callback NE PAS UTILISER. USAGE INTERNE.
     * @param dirEntry NE PAS UTILISER. USAGE INTERNE.
     */
    function rmrf(dirName, callback, dirEntry) {
        // Récupère le dossier dirName (ou la racine du système de fichiers)
        function readDirEntry(dirEntry) {
            const reader = dirEntry.createReader();
            // Itère sur les entrées du répertoire via readEntries
            reader.readEntries(function (entries) {
                // Pour chaque entrée du dossier
                for (const entry of entries) {
                    if (entry.isDirectory) {
                        // Si c'est un dossier, on appelle rmrf sur celui-ci,
                        rmrf(entry.fullPath, function () {
                            // Puis on le supprime lui-même
                            removeFile(entry, callback);
                        });
                    }
                    else {
                        // Si c'est un fichier, on le supprime
                        removeFile(entry, callback);
                    }
                }
            });
        }
        if (dirEntry) {
            readDirEntry(dirEntry);
        }
        else {
            getDir(readDirEntry, dirName, function () {
                if (callback)
                    callback();
            });
        }
    }
    exports.rmrf = rmrf;
    /**
     * Supprime le dossier dirName et son contenu. [version améliorée de rmrf()]
     * Utilise les Promise en interne pour une plus grande efficacité, au prix d'une utilisation mémoire plus importante.
     * Si l'arborescence est très grande sous la dossier, subdivisez la suppression.
     * @param dirName string Chemin du dossier à supprimer
     * @param deleteSelf boolean true si le dossier à supprimer doit également l'être
     * @returns Promise Promesse tenue si suppression réussie, rompue sinon
     */
    function rmrfPromise(dirName, deleteSelf = false) {
        function rmrfFromEntry(dirEntry) {
            return new Promise(function (resolve, reject) {
                const reader = dirEntry.createReader();
                // Itère sur les entrées du répertoire via readEntries
                reader.readEntries(function (entries) {
                    // Pour chaque entrée du dossier
                    const promises = [];
                    for (const entry of entries) {
                        promises.push(new Promise(function (resolve, reject) {
                            if (entry.isDirectory) {
                                // Si c'est un dossier, on appelle rmrf sur celui-ci,
                                rmrfFromEntry(entry).then(function () {
                                    // Quand c'est fini, on supprime le répertoire lui-même
                                    // Puis on résout
                                    removeFilePromise(entry).then(resolve).catch(reject);
                                });
                            }
                            else {
                                // Si c'est un fichier, on le supprime
                                removeFilePromise(entry).then(resolve).catch(reject);
                            }
                        }));
                    }
                    // Attends que tous les fichiers et dossiers de ce dossier soient supprimés
                    Promise.all(promises).then(function () {
                        // Quand ils le sont, résout la promesse
                        resolve();
                    }).catch(reject);
                });
            });
        }
        return new Promise(function (resolve, reject) {
            getDir(function (dirEntry) {
                // Attends que tous les dossiers soient supprimés sous ce répertoire
                rmrfFromEntry(dirEntry).then(function () {
                    // Si on doit supprimer le dossier et que ce n'est pas la racine
                    if (deleteSelf && dirName !== "") {
                        // On supprime puis on résout
                        removeFilePromise(dirEntry).then(resolve).catch(reject);
                    }
                    // On résout immédiatement
                    else {
                        resolve();
                    }
                }).catch(reject);
            }, dirName, reject);
        });
    }
    exports.rmrfPromise = rmrfPromise;
    /**
     * Formate un objet Date en chaîne de caractères potable.
     * @param date Date
     * @param withTime boolean Détermine si la chaîne de caractères contient l'heure et les minutes
     * @returns string La châine formatée
     */
    function formatDate(date, withTime = false) {
        const m = ((date.getMonth() + 1) < 10 ? "0" : "") + String(date.getMonth() + 1);
        const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
        const min = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
        return `${d}/${m}/${date.getFullYear()}` + (withTime ? ` ${date.getHours()}h${min}` : "");
    }
    exports.formatDate = formatDate;
    /**
     * Formate un objet Date en chaîne de caractères potable.
     * Pour comprendre les significations des lettres du schéma, se référer à : http://php.net/manual/fr/function.date.php
     * @param schema string Schéma de la chaîne. Supporte Y, m, d, h, H, i, s, n, N, v, z, w
     * @param date Date Date depuis laquelle effectuer le formatage
     * @returns string La châine formatée
     */
    function dateFormatter(schema, date = new Date()) {
        function getDayOfTheYear(now) {
            const start = new Date(now.getFullYear(), 0, 0);
            const diff = now.getTime() - start.getTime();
            const oneDay = 1000 * 60 * 60 * 24;
            const day = Math.floor(diff / oneDay);
            return day - 1; // Retourne de 0 à 364/365
        }
        const Y = date.getFullYear();
        const N = date.getDay() === 0 ? 7 : date.getDay();
        const n = date.getMonth() + 1;
        const m = (n < 10 ? "0" : "") + String(n);
        const d = ((date.getDate()) < 10 ? "0" : "") + String(date.getDate());
        const L = Y % 4 == 0 ? 1 : 0;
        const i = ((date.getMinutes()) < 10 ? "0" : "") + String(date.getMinutes());
        const H = ((date.getHours()) < 10 ? "0" : "") + String(date.getHours());
        const h = date.getHours();
        const s = ((date.getSeconds()) < 10 ? "0" : "") + String(date.getSeconds());
        const replacements = {
            Y, m, d, i, H, h, s, n, N, L, v: date.getMilliseconds(), z: getDayOfTheYear, w: date.getDay()
        };
        let str = "";
        // Construit la chaîne de caractères
        for (const char of schema) {
            if (char in replacements) {
                if (typeof replacements[char] === 'string') {
                    str += replacements[char];
                }
                else if (typeof replacements[char] === 'number') {
                    str += String(replacements[char]);
                }
                else {
                    str += String(replacements[char](date));
                }
            }
            else {
                str += char;
            }
        }
        return str;
    }
    exports.dateFormatter = dateFormatter;
    /**
     * Assigne la balise src de l'image element au contenu de l'image située dans path.
     * @param path string
     * @param element HTMLImageElement
     */
    function createImgSrc(path, element) {
        const parts = path.split('/');
        const file_name = parts.pop();
        const dir_name = parts.join('/');
        getDir(function (dirEntry) {
            dirEntry.getFile(file_name, { create: false }, function (fileEntry) {
                element.src = fileEntry.toURL();
            });
        }, dir_name);
    }
    exports.createImgSrc = createImgSrc;
    /**
     * Convertit un Blob en chaîne base64.
     * @param blob Blob Données binaires à convertir en base64
     */
    function blobToBase64(blob) {
        const reader = new FileReader();
        return new Promise(function (resolve, reject) {
            reader.onload = function () {
                resolve(reader.result);
            };
            reader.onerror = function (e) {
                reject(e);
            };
            reader.readAsDataURL(blob);
        });
    }
    exports.blobToBase64 = blobToBase64;
    /**
     * Convertit une URL (distante, locale, data:base64...) en objet binaire Blob
     * @param str string URL
     */
    function urlToBlob(str) {
        return fetch(str).then(res => res.blob());
    }
    exports.urlToBlob = urlToBlob;
});
define("audio_listener", ["require", "exports", "helpers", "logger"], function (require, exports, helpers_6, logger_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function newModalRecord(button, input, ele) {
        let recorder = null;
        const modal = helpers_6.getModal();
        const instance = helpers_6.initModal({}, helpers_6.getModalPreloader("Chargement", ''));
        instance.open();
        let audioContent = null;
        let blobSize = 0;
        modal.innerHTML = `
    <div class="modal-content">
        <h5 style="margin-top: 0;">${ele.label}</h5>
        <p style="margin-top: 0; margin-bottom: 25px;">Approchez votre micro de la source, puis appuyez sur enregistrer.</p>
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
        btn_confirm.onclick = function () {
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
        };
        btn_cancel.onclick = function () {
            instance.close();
            // Clean le modal et donc les variables associées
            modal.innerHTML = "";
        };
        function startRecording() {
            btn_start.classList.add('hide');
            player.innerHTML = `<p class='flow-text center'>
                Initialisation...
            </p>`;
            // @ts-ignore MicRecorder, credit to https://github.com/closeio/mic-recorder-to-mp3
            recorder = new MicRecorder({
                bitRate: 256
            });
            recorder.start().then(function () {
                player.innerHTML = `<p class='flow-text center'>
                <i class='material-icons blink fast v-bottom red-text'>mic</i><br>
                Enregistrement en cours
            </p>`;
                btn_stop.classList.remove('hide');
            }).catch((e) => {
                logger_3.Logger.error("Impossible de lancer l'écoute.", e);
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
                helpers_6.blobToBase64(blob).then(function (base64) {
                    audioContent = base64;
                    btn_confirm.classList.remove('hide');
                    player.innerHTML = `<figure>
                        <figcaption>Enregistrement</figcaption>
                        <audio controls src="${base64}"></audio>
                    </figure>`;
                    btn_start.classList.remove('hide');
                });
            }).catch((e) => {
                M.toast({ html: 'Impossible de lire votre enregistrement' });
                logger_3.Logger.error("Enregistrement échoué:", e.message);
            });
        }
    }
    exports.newModalRecord = newModalRecord;
});
