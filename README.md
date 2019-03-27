# Busy Bird

Busy Bird est une application destinée à faciliter la rédaction de fiches de terrain dans le domaine biologique.

Elle permet, sous la forme d'un formulaire simulant une fiche suivant un schéma donné, d'enregistrer des entrées et de les synchroniser avec un serveur centralisé distant.

Les entrées sont liées à un utilisateur qui se connecte dans l'application, permettant d'identifier la personne rédigeant les fiches.

L'application sait gérer de multiples schémas de formulaire pour effectuer des relevés à propos de différentes espèces.

Busy Bird est programmée en [TypeScript](https://www.typescriptlang.org/), JavaScript, HTML & CSS, et utilise le framework libre [Adobe PhoneGap](https://phonegap.com/) / [Apache Cordova](https://cordova.apache.org/) pour être intégrée dans une application native Android.
Pour sa partie serveur, Busy Bird se repose sur le couple PHP + Apache.
La partie spécifique au développement est détaillée dans la partie sus-nommée.

# Sommaire

1. [Introduction]()
2. [Utilisation]()
   1. [Compte utilisateur]()
      1. [Connexion]()
      2. [Création de compte]()
   2. [Souscrire à des schémas]()
   3. [Saisir une entrée]()
      1. [Lieu de saisie]()
      2. [Formulaire]()
      3. [Validation et sauvegarde]()
   4. [Consulter et modifier des entrées]()
      1. [Lister les entrées sauvegardées]()
      2. [Modifier une entrée]()
      3. [Supprimer des entrées]()
   5. [Synchronisation]()
      1. [Standard]()
      2. [Arrière-plan]()
      3. [Globale]()
3. [Maintenance et développement de l'application]()
   1. [Introduction à Cordova]()
   2. [Plugins utilisés]()
   3. [Organisation du code et bases structurantes]()
      1. [Organisation générale]()
      2. [Gestion des pages]()
      3. [Gestion des utilisateurs]()
      4. [Gestion des schémas de formulaire]()
      5. [Interactions avec le système de fichiers]()
   4. [Synchronisation]()
   5. [Paramètres de l'application]()
4. [Maintenance du serveur Busy Bird]()
   1. [Introduction à l'API Busy Bird]()
   2. [Organisation]()
   3. [Ajouter un endpoint]()
   4. [Schémas, entrées et utilisateurs]()
   5. [Informations fonctionnelles sur les endpoints]()

# Introduction

L'application Busy Bird compte un certain nombre de termes dont la signification doit être claire :

- Un schéma de formulaire est une base listant les champs d'un formulaire un à un.
- Une entrée de formulaire est le fait de remplir un formulaire généré via son schéma et le stocker dans un fichier
- La synchronisation est le fait d'envoyer les entrées ainsi que leurs fichiers attachés vers un serveur, et ainsi de créer ou mettre à jour les entrées déjà stockées sur le serveur.
- Une souscription à un schéma est le fait qu'un utilisateur soit apte à créer une entrée d'un type de schéma donné.

# Utilisation

Les étapes d'utilisation de l'application mobile sont décrites ici.

## Compte utilisateur

L'application nécessite de se connecter à son compte utilisateur pour pouvoir enregistrer des entrées et télécharger les schémas de formulaire sur l'appareil.
Vous pouvez retrouver les options relatives au compte dans les paramètres.

### Connexion

La connexion s'effectue via un système nom d'utilisateur + mot de passe.
Le mot de passe est choisi par l'utilisateur à la création de compte.

### Créer un compte

Si vous n'avez pas encore de compte, vous pouvez créer un compte via les paramètres. Pour que le bouton de création de compte apparaisse, vous devez être déconnecté.
Pour pouvoir créer son compte, vous devez connaître le mot de passe administrateur, censé être connu de l'administrateur du serveur Busy Bird.

## Souscrire à des schémas

Pour pouvoir commencer à effectuer des entrées, vous devez être abonné à des schémas une fois connecté.
Ouvrez la boîte de dialogue disponible dans les paramètres pour souscrire ou vous désabonner de schémas. Cocher pour vous abonner, décochez pour vous désabonner, puis confirmez votre saisie avec le bouton lié à cet effet.

## Saisir une entrée

### Lieu de saisie

Si le schéma le suggère, vous devrez préciser le lieu de votre saisie avec le sélecteur de localisation dédié. Merci d'activer la géolocalisation sur votre téléphone pour qu'elle puisse fonctionner correctement. Si le lieu que vous recherchez n'est pas disponible dans le sélecteur, un joker "Lieu inconnu" est toujours disponible, il vous suffit de rechercher "**unknown**" dans la barre de recherche.

### Formulaire

Remplissez les champs nécessaires. Si un champ est invalide, il est affiché en rouge et une suggestion aidant l'utilisateur à comprendre son erreur peut être affichée.

### Validation et sauvegarde

Un récapitulatif des possibles erreurs est présenté à l'utilisateur lorsqu'un enregistrement est demandé.
Si un champ est invalide, l'utilisateur en est informé.

## Consulter et modifier des entrées

Pour consulter les entrées, rendez-vous dans le menu "Entrées" disponible dans le menu principal.

### Lister les entrées sauvegardées

Les entrées sont présentées sous la forme:

```
[icône précisant l'état de synchronisation du formulaire] [type de formulaire] [identifiant du formulaire]

[date de dernière modification]
```

Une icône de synchronisation verte signifie que le serveur a déjà reçu cette entrée et la version présente sur le serveur est également la version présente sur cet appareil.
Si elle est grise, l'entrée présente sur l'appareil ne dispose pas d'une version synchronisée avec le serveur.

Cliquez sur une entrée pour afficher le menu d'options de celle-ci.

### Modifier une entrée

Lors d'un clic sur modifier dans le menu d'options, le formulaire correspondant au schéma adapté est affiché, vous permettant de modifier le formulaire comme si vous soumettiez une nouvelle entrée.

### Supprimer des entrées

Vous pouvez supprimer une entrée individuellement en choisissant l'option "supprimer" dans son menu d'options.

Pour supprimer toutes les entrées en même temps, cliquez sur le bouton rouge en bas à droite de l'écran.

Une confirmation sera demandée dans les deux cas.

## Synchronisation

### Standard

La synchronisation standard envoie les entrées encore non envoyées au serveur ou n'étant pas à jour. Elle s'effectue via le bouton vert, en bas à droite de la page des entrées.

### Arrière-plan

La synchronisation d'arrière-plan s'active dans les paramètres. À chaque pas de temps configuré, une synchronisation standard est lancée si la connexion à Internet est considérée comme bonne.

### Globale

La synchronisation globale, ou forcée, force le téléphone à envoyer toutes les entrées, même déjà synchronisées, vers le serveur. Vous pouvez déclencher ce type de synchronisation dans les paramètres, bouton "forcer synchronisation".

# Maintenance et développement de l'application

## Introduction à Cordova

Cordova étant un framework permettant de programmer avec les technologies du web pour développer des applications mobiles, cette application est intégralement écrite en HTML+CSS+JS+TS.
Cordova utilise également un système de plugins pour y ajouter des fonctions supplémentaires comme la reconnaissance vocale.

### CLI PhoneGap

Ce projet utilise PhoneGap. Pour installer un plugin, utilisez `phonegap plugin add <nomplugin>`.
Pour compiler l'application, utilisez `phonegap build android`.

Lorsque vous arrivez sur votre projet, après l'avoir récupéré de git, vous pouvez initialiser votre espace de travail avec: 
```bash
npm i -g phonegap

phonegap platform add browser android --force
phonegap prepare --force

## Si un plugin manque, ce sera sûrement speech-synthesis
# Vous pouvez l'ajouter manuellement au dossier plugins de cordova, il se trouve dans hooks/

## puis
phonegap prepare

# Pour lancer l'émulation via navigateur, utilisez
phonegap serve
# Lancez un navigateur (Chrome de préférence) à l'adresse http://localhost:3000
```

Si PhoneGap râle, parce que mon dieu ça arrive, utilisez cet enchaînememnt de commandes:

```bash
phonegap platform remove android
phonegap platform remove browser

phonegap platform add browser --force
phonegap prepare browser

# À ce moment, il y a de fortes chances qu'un plugin râle. Utilisez
phonegap platform add android --force
phonegap prepare android

phonegap build android

## Pour le lancer sur un appareil android connecté, en débogage USB, lancez
phonegap run android --device
```

### Développer et prévisualiser l'application dans le navigateur

Pour lancer le serveur web intégré, utilisez `phonegap serve`.

N'oubliez pas de lancer aussi dans une autre instance de bash un `tsc -w` pour compiler le TypeScript à la volée lors d'une modification.
Ne modifiez **JAMAIS** le fichier `app.js` manuellement !

Lancez ensuite un navigateur web (Chrome ou Chromium, le seul à supporter la reconnaissance vocale), et accédez à l'adresse `http://localhost:3000`.

## Plugins utilisés

Veillez bien à vous assurer que ces plugins sont installés avant de compiler l'application.

- cordova-plugin-device (pour savoir si c'est Android ou le navigateur web)
- cordova-plugin-media-capture (pour avoir accès à l'APN)
- cordova-plugin-dialogs (pour utiliser les alert() natives)
- cordova-plugin-geolocation (pour accéder au GPS)
- cordova-plugin-inappbrowser (pour ouvrir des pages externes, oui oui)
- cordova-plugin-network-information (pour savoir sur quel réseau on se trouve)
- phonegap-plugin-speech-synthesis (pour faire parler le téléphone)
- cordova-plugin-speechrecognition (pour parler au téléphone)
- cordova-plugin-file (sans doute le meilleur, pour avoir accès au système de fichiers)
- phonegap-plugin-media-recorder (pour enregistrer du son)
- cordova-plugin-android-permissions (pour demander des autorisations)
- cordova-plugin-whitelist (pour avoir accès à l'extérieur)
- phonegap-plugin-mobile-accessibility (pour désactiver l'ajustement de la police par android)
- cordova-plugin-splashscreen (pour afficher un splashscreen)
- cordova-plugin-multi-window (pour désactiver le multi-window qui fait reboot l'application)
- cordova-plugin-x-toast (pour afficher des toast Android)
- cordova-plugin-background-fetch (pour synchroniser en arrière-plan)
- cordova.plugins.diagnostic (pour avoir accès au chemin de la carte SD)

La liste complète des plugins est disponible dans config.xml.

## Organisation du code et bases structurantes

Le code est organisé en modules TypeScript, dans ses parties principales.
Pour fonctionner sur Cordova, les modules se compilent pour se charger avec `RequireJS`, qui charge `app.js`.
Le point d'entrée de l'application se fait dans `app.ts` qui charge `main.ts`. Depuis main, les fichiers sont chargés de façon classique, par module.

### Organisation générale

L'application se structure autour de plusieurs bases importantes, représentés sous la forme d'objets.

Ces objets sont:

- `Forms` de `form_schema.ts`, un objet qui gère les schémas de formulaire
- `PageManager` de `PageManager.ts`, un objet qui gère les pages de l'application (changer de page, empiler/dépiler le stack de pages)
- `UserManager` dans `user_manager.ts`, un objet pour gérer la connexion utilisateur
- `SyncManager` dans `SyncManager.ts`, un objet qui gère la synchronisation des entrées et tient à jour une liste d'entrées à synchroniser
- `FormSaves` dans `FormSaves.ts`, un objet pour récupérer et supprimer des formulaires sauvegardés
- `FILE_HELPER`, un objet de type `FileHelper`, pour interagir avec le système de fichiers, instancié dans `main.ts`

De nombreuses fonctions d'aide au développement sont disponibles dans `helpers.ts`.

Vous trouverez aussi dans `vocal_recognition.ts` les fonctions `prompt()` et `talk()` qui permettent respectivement de faire de l'écoute de l'utilisateur par reconnaissance vocale et de parler via synthèse vocale.

### Gestion des pages

Les pages de l'application en fait un simple objet `AppPageObj` (voir `PageManager.ts`).
Cet objet lie à une clé de page une fonction d'appel lorsque la page est chargée, un nom à afficher dans la barre de menu, et d'autres paramètres.

Les pages sont gérées avec une pile qui permet de pousser des pages dans la pile et dépiler lors de l'appui sur le bouton retour.
Pour ouvrir une nouvelle page et l'insérer dans la pile, utilisez `PageMananger.pushPage(app_page_name)`.
Pour dépiler, utilisez `PageManager.popPage()`.
Pour simuler l'appui du bouton retour, utilisez `PageManager.goBack()`.

Consulter le fichier `PageManager.ts` pour connaître la documentation fonction par fonction.

### Gestion des utilisateurs

Les utilisateurs sont gérés depuis `UserManager`, présent dans `user_manager.ts`.
Pour savoir si un utilisateur est connecté, utilisez `.logged`. Pour connaître son nom d'utilisateur, utilisez `.username`.

Pour connecter un utilisateur, utilisez `.login(username, password)`. Pour logger artificiellement, depuis un token, utilisez `.logSomeone(username, token)`. Pour créer un utilisateur, utilisez `.createUser(username, password, admin_password)`.

Vous pouvez également vous déconnecter avec `.unlog()`.

### Gestion des schémas de formulaire

Les schémas de formulaire se gèrent avec l'objet `Forms`.

Obtenez la clé du schéma chargé avec `.current_key`. Attention, vaut `null` si aucun schéma chargé.
Obtenez le formulaire chargé actuellement avec `.current`. Attention, si `current_key` vaut `null`, `.current` aura une valeur non nulle !

Toutes les autres fonctions sont disponibles et documentés dans la classe elle-même, voir le fichier `form_schema.ts`.

### Interactions avec le système de fichiers

Utilisez `FILE_HELPER` pour manipuler le système de fichiers applicatif, et `SD_FILE_HELPER` pour manipuler la carte SD (attention, vérifiez qu'il ne soit pas `null`).

La documentation du type `FileHelper` est disponible dans `README_file_helper.md`.

## Synchronisation

La synchro est gérée par `SyncManager`. Le fonctionnement interne n'a pas lieu d'être plus documenté que dans la classe elle-même.

Pour ajouter une nouvelle entrée dans la liste à synchro, utilisez `SyncManager.add(id, FormSave)`.
Pour supprimer une entrée de la liste, utilisez `SyncManager.remove(id)`.

- `SyncManager.available()` Liste les entrées classifiées comme attendant une synchronisation
- `SyncManager.has(id)` Répond `true` si l'entrée `id` est présente dans la liste de sync
- `SyncManager.sync(force_all, clear_cache, force_specific_elements, receiver)` Lance une synchronisation.
  - `force_all` Si `true`, force à synchroniser tout l'appareil
  - `clear_cache` Si `true`, force à vider le cache de synchro puis synchronise tout l'appareil
  - `force_specific_elements` Si `string[]`, ne synchronisera que les id passés dans le tableau
  - `receiver` Un `SyncEvent` sur lequel on pourra attacher des événements qui se délencheront à certaines phases de la synchronisation (voir événements)

`SyncManager` a de nombreuses autres méthodes décrites dans la définition de la classe par du JSDoc.

### Événements de synchronisation

Vous pouvez instancier un `SyncEvent` sur lequel vous attacherez des événements, puis vous pouvez appeler `sync()` avec ce `SyncEvent` dans le paramètre `receiver`.

```js
const receiver = new SyncEvent;

receiver.addEventListener("error", err => {
    console.log(err.detail);
});

await SyncManager.sync(false, false, undefined, receiver);
```
#### error
Une erreur est survenue et la synchronisation s'est arrêtée. 
Un paramètre `err` est joint dans le détail de l'événement qui contient un objet { code: "message" }.

#### abort
La synchronisation a été arrêtée manuellement.

#### begin
Émis lorsque la synchronisation commence.

#### beforesend
Émis lorsque la liste des fichiers à envoyer a été construite, juste avant l'envoi.

#### groupsend
Émis lorsqu'un groupe d'entrées est paré à être envoyé.
Un paramètre `subset` de type `string[]` est passé dans le détail de l'événement et contient l'ID des formulaires allant être envoyé.

#### send
Émis lorsqu'une entrée est paré à être envoyée.
Le détail contient `{ id: id_entry, data: SList, number: current_iterator_number, total: total_entries_to_send }`.

#### sended
Émis lorsqu'une entrée a été envoyée.
Le détail contient l'identifiant `id` de l'entrée envoyée.

#### groupsended
Émis lorsqu'un groupe d'entrées a été envoyé.
Un paramètre `subset` de type `string[]` est passé dans le détail de l'événement et contient l'ID des formulaires étant envoyé.

#### groupsenderror
Émis lorsqu'un groupe d'entrées a échoué à être envoyé.
Un paramètre `subset` de type `string[]` est passé dans le détail de l'événement et contient l'ID des formulaires devant être envoyés.

#### senderrorfailer
Émis lorsqu'une entrée n'a pas pu être envoyée.
Le détail contient l'identifiant `id` de l'entrée dont l'envoi a échoué.

#### complete
Émis lorsque la synchronisation se termine (et que tout s'est bien passé).

## Paramètres de l'application

# Maintenance du serveur Busy Bird

## Introduction à l'API Busy Bird

## Organisation

## Ajouter un endpoint

## Schémas, entrées et utilisateurs

### Schémas

### Entrées

### Utilisateurs

## Informations fonctionnelles sur les endpoints
