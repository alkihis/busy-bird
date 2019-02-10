////// FICHIER D'INITIALISATION DE
////// TYPESCRIPT POUR REQUIREJS
// normally you would use a .d.ts file for RequireJS instead of declare
declare var require: (deps: string[]) => void;

// Lance main.ts
require(['main']);
