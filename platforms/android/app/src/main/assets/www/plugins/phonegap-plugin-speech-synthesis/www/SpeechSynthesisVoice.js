cordova.define("phonegap-plugin-speech-synthesis.SpeechSynthesisVoice", function(require, exports, module) {

var SpeechSynthesisVoice = function() {
  this.voiceURI;
  this.name;
  this.lang;
  this.localService;
  this._default;
};

module.exports = SpeechSynthesisVoice;
});
