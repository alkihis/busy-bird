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
   4. [Créer une entrée]()
   5. [Synchronisation]()
   6. [Paramètres de l'application]()
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

Si le schéma le suggère, vous devrez préciser le lieu de votre saisie avec le sélecteur de localisation dédié. Merci d'activer la géolocalisation sur votre téléphone pour qu'elle puisse fonctionner correctement. Si le lieu que vous recherchez n'est pas disponible dans le sélecteur, un joker "Lieu inconnu" est toujours disponible, il vous suffit de rechercher "__unknown__" dans la barre de recherche.

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

### Organisation générale

### Gestion des pages

### Gestion des utilisateurs

### Gestion des schémas de formulaire

### Interactions avec le système de fichiers

## Créer une entrée

## Synchronisation

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

