"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
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
define("artyom", ["require", "exports"], function (require, exports) {
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
define("default_form", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Type à préciser dans le JSON, clé "type"
     */
    var FormEntityType;
    (function (FormEntityType) {
        FormEntityType["integer"] = "integer";
        FormEntityType["float"] = "float";
        FormEntityType["select"] = "select";
        FormEntityType["string"] = "string";
        FormEntityType["bigstring"] = "textaera";
        FormEntityType["checkbox"] = "checkbox";
        FormEntityType["file"] = "file";
        FormEntityType["date"] = "date";
        FormEntityType["time"] = "time";
        FormEntityType["divider"] = "divider";
    })(FormEntityType = exports.FormEntityType || (exports.FormEntityType = {}));
    exports.default_form_name = "Cincle plongeur";
    let form_ready = false;
    let on_forms_ready = [];
    // Exécute une fonction quand le formulaire est chargé
    function onFormReady(callback) {
        if (form_ready) {
            callback();
        }
        else {
            on_forms_ready.push(callback);
        }
    }
    exports.onFormReady = onFormReady;
    // Initialise les formulaires disponibles via le fichier JSON contenant les formulaires
    // La clé du formulaire par défaut est contenu dans "default_form_name"
    (function () {
        $.get('assets/form.json', {}, function (json) {
            // Si jamais le JSON arrive sous forme de string (pas parsé), on le parse
            if (typeof json === 'string') {
                json = JSON.parse(json);
            }
            // Le JSON est reçu, on l'enregistre dans available_forms
            exports.available_forms = json;
            // On met le form à ready
            form_ready = true;
            // On enregistre le formulaire par défaut
            exports.current_form = exports.available_forms[exports.default_form_name];
            console.log(exports.available_forms, exports.current_form);
            // On exécute les fonctions en attente
            for (const func of on_forms_ready) {
                func();
            }
            // On les supprime
            on_forms_ready = [];
        });
    })();
});
define("test_aytom", ["require", "exports", "artyom"], function (require, exports, artyom_1) {
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
define("form", ["require", "exports", "test_aytom", "default_form", "default_form"], function (require, exports, test_aytom_1, FORMS, default_form_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    FORMS = __importStar(FORMS);
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
     * @param htmle
     * @param ele
     * @param label
     */
    function fillStandardInputValues(htmle, ele, label) {
        htmle.id = "id_" + ele.name;
        htmle.name = ele.name;
        htmle.required = ele.required;
        if (htmle.tagName === "INPUT" && ele.placeholder) {
            htmle.placeholder = ele.placeholder;
        }
        if (label) {
            label.htmlFor = htmle.id;
            label.innerText = ele.label;
        }
        htmle.dataset.valid = ele.required ? "0" : "1";
        htmle.value = ele.default_value;
        return htmle;
    }
    /**
     * Construit le formulaire automatiquement passé via "c_f"
     * @param placeh Élement HTML dans lequel écrire le formulaire
     * @param c_f Tableau d'éléments de formulaire
     * @param jarvis Instance d'Arytom à configurer
     */
    function constructForm(placeh, c_f, jarvis) {
        for (const ele of c_f) {
            let element_to_add = null;
            if (ele.type === default_form_1.FormEntityType.divider) {
                // C'est un titre
                let htmle = document.createElement('h4');
                htmle.innerText = ele.label;
                htmle.id = "id_" + ele.name;
                placeh.appendChild(htmle);
                continue;
            }
            if (ele.type === default_form_1.FormEntityType.integer || ele.type === default_form_1.FormEntityType.float) {
                const wrapper = createInputWrapper();
                const htmle = document.createElement('input');
                const label = document.createElement('label');
                fillStandardInputValues(htmle, ele, label);
                htmle.type = "number";
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
                        if (ele.type === default_form_1.FormEntityType.float) {
                            if (ele.float_precision) {
                                // Si on a demandé à avoir un nombre de flottant précis
                                const floating_point = this.value.split('.');
                                if (floating_point.length < 2 || floating_point[1].length !== ele.float_precision) {
                                    // Si il n'y a pas de . ou si le nombre de chiffres après la virgule n'est pas le bon
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
            if (ele.type === default_form_1.FormEntityType.string) {
                const wrapper = createInputWrapper();
                const htmle = document.createElement('input');
                const label = document.createElement('label');
                fillStandardInputValues(htmle, ele, label);
                htmle.type = "text";
                wrapper.appendChild(label);
                wrapper.appendChild(htmle);
                createTip(wrapper, ele);
                // Attachage de l'évènement de vérification
                htmle.addEventListener('change', function () {
                    let valid = true;
                    let value = this.value;
                    if (typeof value === 'string') {
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
            if (ele.type === default_form_1.FormEntityType.select) {
                const wrapper = createInputWrapper();
                const htmle = document.createElement('select');
                const label = document.createElement('label');
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
                wrapper.appendChild(htmle);
                wrapper.appendChild(label);
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            if (ele.type === default_form_1.FormEntityType.checkbox) {
                const wrapper = document.createElement('p');
                const label = document.createElement('label');
                const input = document.createElement('input');
                const span = document.createElement('span');
                fillStandardInputValues(input, ele, span);
                wrapper.classList.add('row', 'col', 's12');
                input.classList.add('filled-in');
                input.type = "checkbox";
                input.checked = ele.default_value;
                wrapper.appendChild(label);
                label.appendChild(input);
                label.appendChild(span);
                // Pas de tip ni d'évènement pour le select; les choix se suffisent à eux mêmes
                // Il faudra par contrer créer (plus tard les input vocaux)
                element_to_add = wrapper;
            }
            if (element_to_add)
                placeh.appendChild(element_to_add);
        }
    }
    /**
     * Fonction qui va faire attendre l'arrivée du formulaire,
     * puis charger la page
     * @param base
     */
    function initFormPage(base) {
        FORMS.onFormReady(function () { loadFormPage(base); });
    }
    exports.initFormPage = initFormPage;
    /**
     * Charge la page de formulaire (point d'entrée)
     * @param base Element dans lequel écrire la page
     */
    function loadFormPage(base) {
        // Construction du formulaire
        let c_f = FORMS.current_form;
        base.innerHTML = "";
        const base_block = document.createElement('div');
        base_block.classList.add('row', 'container');
        const placeh = document.createElement('form');
        placeh.classList.add('col', 's12');
        base_block.appendChild(placeh);
        // Appelle la fonction pour construire
        constructForm(placeh, c_f, test_aytom_1.Jarvis.Jarvis);
        base.appendChild(base_block);
        base.insertAdjacentHTML('beforeend', `<div class="fixed-action-btn">
        <a class="btn-floating btn-large red" id="operate_listen">
            <i class="large material-icons">mic</i>
        </a>
    </div>`);
        M.updateTextFields();
        $('select').formSelect();
        document.getElementById('operate_listen').onclick = function () {
            test_aytom_1.test_jarvis();
        };
    }
    exports.loadFormPage = loadFormPage;
});
define("settings_page", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function initSettingsPage(base) {
        base.innerHTML = "";
    }
    exports.initSettingsPage = initSettingsPage;
});
define("saved_forms", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function initSavedForm(base) {
        base.innerHTML = "";
    }
    exports.initSavedForm = initSavedForm;
});
define("interface", ["require", "exports", "helpers", "form", "settings_page", "saved_forms", "main"], function (require, exports, helpers_1, form_1, settings_page_1, saved_forms_1, main_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.APP_NAME = "Busy Bird";
    /**
     * Déclaration des pages possibles
     * Chaque clé de AppPages doit être une possibilité de AppPageName
     */
    exports.AppPages = {
        form: {
            name: "Nouvelle entrée",
            callback: form_1.initFormPage
        },
        settings: {
            name: "Paramètres",
            callback: settings_page_1.initSettingsPage
        },
        saved: {
            name: "Entrées",
            callback: saved_forms_1.initSavedForm
        },
        home: {
            name: "Accueil",
            callback: initHomePage
        }
    };
    /**
     * Change l'affichage et charge la page "page" dans le bloc principal
     * @param AppPageName page
     */
    function changePage(page) {
        const base = helpers_1.getBase();
        base.innerHTML = helpers_1.getPreloader("Chargement");
        if (window.history) {
            window.history.pushState({}, "", "/?" + page);
        }
        if (page in exports.AppPages) {
            if (!exports.AppPages[page].not_sidenav_close) {
                main_1.SIDENAV_OBJ.close();
            }
            exports.AppPages[page].callback(base);
            document.getElementById('nav_title').innerText = exports.AppPages[page].name;
        }
        else {
            throw new ReferenceError("Page does not exists");
        }
    }
    exports.changePage = changePage;
    function initHomePage(base) {
        base.innerHTML = "<h2 class='center'>" + exports.APP_NAME + "</h2>" + `
    <!-- <div class="row">
        <form class="col s12">
            <div class="row">
                <div class="input-field col s6">
                    <input id="last_name" type="number" class="validate">
                    <label for="last_name">Identifiant</label>
                </div>
                <div class="input-field col s6">
                    <input placeholder="Pipou" id="first_name" type="text" class="validate">
                    <label for="first_name">Nom</label>
                </div>
            </div>
            <div class="row">
                <div class="input-field col s12">
                    <input value="" id="disabled2" type="number" class="validate">
                    <label for="disabled2">Poids</label>
                </div>

                <div class="input-field col s12">
                    <select name="lieu">
                        <option value="1">Près du ruisseau</option>
                        <option value="2">Vers le gros chêne</option>
                    </select>
                    <label>Lieux</label>
                </div>
            </div>
        </form>
    </div>
    <div class="row">
        <a class="blue-text btn-flat right">Enregistrer</a>
        <a class="red-text btn-flat left">Réinitialiser</a>
    </div>
    <div class="fixed-action-btn">
        <a class="btn-floating btn-large red" id="operate_listen">
            <i class="large material-icons">mic</i>
        </a>
    </div> -->

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
});
define("main", ["require", "exports", "interface", "helpers"], function (require, exports, interface_1, helpers_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PRELOADER = `
<div class="preloader-wrapper active">
    <div class="spinner-layer spinner-blue-only">
        <div class="circle-clipper left">
            <div class="circle"></div>
        </div><div class="gap-patch">
            <div class="circle"></div>
        </div><div class="circle-clipper right">
            <div class="circle"></div>
        </div>
    </div>
</div>
`;
    exports.SIDENAV_OBJ = null;
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
        // Initialise le sidenav
        const elem = document.querySelector('.sidenav');
        exports.SIDENAV_OBJ = M.Sidenav.init(elem, {});
        // Bind des éléments du sidenav
        // Home
        document.getElementById('nav_home').onclick = function () {
            interface_1.changePage("home");
        };
        // Form
        document.getElementById('nav_form_new').onclick = function () {
            interface_1.changePage("form");
        };
        // Saved
        document.getElementById('nav_form_saved').onclick = function () {
            interface_1.changePage("saved");
        };
        // Settigns
        document.getElementById('nav_settings').onclick = function () {
            interface_1.changePage("settings");
        };
        exports.app.initialize();
        initDebug();
        // Check si on est à une page spéciale
        let href = "";
        if (window.location) {
            href = location.href.split('#')[0].split('?');
            // Récupère la partie de l'URL après la query string et avant le #
            href = href[href.length - 1];
        }
        if (href && href in interface_1.AppPages) {
            interface_1.changePage(href);
        }
        else {
            interface_1.changePage("home");
        }
        // (function() {
        //     getLocation(function(position: Position) {
        //         document.body.insertAdjacentText('beforeend', `Lat: ${position.coords.latitude}; long: ${position.coords.longitude}`);
        //     }, function(error) {
        //         document.body.insertAdjacentText('beforeend', "Error while fetching coords" + JSON.stringify(error));
        //     });
        // })();
    }
    function initDebug() {
        window["DEBUG"] = {
            changePage: interface_1.changePage,
            readFromFile: helpers_2.readFromFile,
            listDir: helpers_2.listDir,
            saveDefaultForm: helpers_2.saveDefaultForm,
            createDir: helpers_2.createDir,
            getLocation: helpers_2.getLocation,
            testDistance: helpers_2.testDistance
        };
    }
    document.addEventListener('deviceready', initApp, false);
});
define("helpers", ["require", "exports", "main", "default_form"], function (require, exports, main_2, default_form_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function getBase() {
        return document.getElementById('main_block');
    }
    exports.getBase = getBase;
    function getPreloader(text) {
        return `
    <center style="margin-top: 35vh;">
        ${main_2.PRELOADER}
    </center>
    <center class="flow-text" style="margin-top: 10px">${text}</center>
    `;
    }
    exports.getPreloader = getPreloader;
    function saveDefaultForm() {
        writeFile('schemas/', 'default.json', new Blob([JSON.stringify(default_form_2.current_form)], { type: "application/json" }));
    }
    exports.saveDefaultForm = saveDefaultForm;
    const FOLDER = "cdvfile://localhost/persistent/";
    let DIR_ENTRY = null;
    function readFromFile(fileName, callback, callbackIfFailed) {
        // @ts-ignore
        const pathToFile = FOLDER + fileName;
        // @ts-ignore
        window.resolveLocalFileSystemURL(pathToFile, function (fileEntry) {
            fileEntry.file(function (file) {
                const reader = new FileReader();
                reader.onloadend = function (e) {
                    callback(this.result);
                };
                reader.readAsText(file);
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
    function getDir(callback, dirName) {
        // @ts-ignore
        window.resolveLocalFileSystemURL(FOLDER, function (dirEntry) {
            DIR_ENTRY = dirEntry;
            if (callback) {
                callback(dirEntry);
            }
        }, function (err) { console.log("Persistent not available", err.message); });
    }
    exports.getDir = getDir;
    function writeFile(dirName, fileName, blob, callback) {
        getDir(function (dirEntry) {
            dirEntry.getFile(fileName, { create: true }, function (fileEntry) {
                write(fileEntry, blob).then(function () {
                    if (callback) {
                        callback();
                    }
                });
            }, function (err) { console.log("Error in writing file", err.message); });
        }, dirName);
        function write(fileEntry, dataObj) {
            return new Promise(function (resolve, reject) {
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function () {
                        resolve();
                    };
                    fileWriter.onerror = function (e) {
                        reject(e);
                    };
                    fileWriter.write(dataObj);
                });
            });
        }
    }
    exports.writeFile = writeFile;
    function createDir(name, onSuccess, onError) {
        getDir(function (dirEntry) {
            dirEntry.getDirectory(name, { create: true }, onSuccess, onError);
        });
    }
    exports.createDir = createDir;
    function listDir(path = FOLDER) {
        // @ts-ignore
        window.resolveLocalFileSystemURL(path, function (fileSystem) {
            var reader = fileSystem.createReader();
            reader.readEntries(function (entries) {
                console.log(entries);
            }, function (err) {
                console.log(err);
            });
        }, function (err) {
            console.log(err);
        });
    }
    exports.listDir = listDir;
    function getLocation(onSuccess, onFailed) {
        navigator.geolocation.getCurrentPosition(onSuccess, onFailed, { timeout: 30 * 1000, maximumAge: 5 * 60 * 1000 });
    }
    exports.getLocation = getLocation;
    function calculateDistance(coords1, coords2) {
        // @ts-ignore
        return geolib.getDistance({ latitude: coords1.latitude, longitude: coords1.longitude }, { latitude: coords2.latitude, longitude: coords2.longitude });
    }
    exports.calculateDistance = calculateDistance;
    function testDistance(latitude = 45.353421, longitude = 5.836441) {
        getLocation(function (res) {
            console.log(calculateDistance(res.coords, { latitude, longitude }));
        }, function (error) {
            console.log(error);
        });
    }
    exports.testDistance = testDistance;
});
