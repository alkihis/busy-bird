# API de Busy Bird, l'application du LBBE
## Introduction

Cette API est à destination d'une utilisation avec l'application Busy Bird uniquement. Les endpoints REST disponibles ne sont pensés que pour servir l'application, excepté les endpoints de récupération `GET forms/sended.json` et `GET forms/id.json`.

Ce serveur permet de connecter un utilisateur dans Busy Bird, ainsi que de recevoir des entrées de formulaires saisies via l'application.

## Fonctionnement

Tout d'abord, un utilisateur doit posséder un token d'accès pour interagir avec le serveur.
Ce token est obtenable via `POST users/login.json`.
Chaque requête doit contenir le token dans l'entête HTTP "Authorization" sous la forme: "Authorization: Bearer xxxxxxx".

Les réponses serveur > client s'effectuent uniquement au format JSON (format `application/json`), excepté `GET forms/id.json` qui peut renvoyer un ZIP (format `application/octet-stream`).

## Erreurs
Les erreurs sont renvoyées avec le code HTTP approprié (`400 Bad Request` pour une requête mal formée, `403 Forbidden` pour une requête non authentifiée et `404 Not Found` pour un endpoint invalide / un fichier demandé inexistant).
Dans le corps de la réponse se trouve un JSON explicitant le code d'erreur et son message associé.

Exemple : `{"error_code":8,"message":"You must be logged to do that"}` 

### Codes d'erreurs
TODO

# Endpoints
Si aucune précision n'est faite lors de la description d'un argument, cet argument est **obligatoire**.

## Gestion utilisateur "users"

### POST users/create.json

#### Description
Créé un nouvel utilisateur et renvoie son token d'accès créé.
Un mot de passe administrateur (disponible dans les constantes du serveur) est nécessaire pour créer un compte.

#### Arguments
| Nom            | Valeur attendue                    | Exemple |
| -------------  |----------------:                   |---------|
| username       | Nom d'utilisateur du compte à créer| jeanne  |
| password       | Mot du passe du compte à créer     | test    |
| admin_password | Mot de passe administrateur        | xxxxxx  |

#### Réponse
| Clé            | Valeur           | Exemple            | Type      |
| -------------  |----------------: |---------           |----------:|
| access_token   | Token d'accès    | xxxxxxxxxxxxxxxxx  | string    |

#### Exemple
`POST https://busybird.lbbe.univ-lyon1.fr/users/create.json`

[Body] `username=jeanne&password=test&admin_password=xxxxxx`

[HTTP Response] `{"access_token": "xxxxxxxxxxxxxxxxxxxxxxx"}`

---

### POST users/login.json

#### Description
Connecte un utilisateur via son identifiant/mot de passe et renvoie un token d'accès.

#### Arguments
| Nom            | Valeur attendue  | Exemple |
| -------------  |----------------: |---------|
| username       | Nom d'utilisateur| jeanne  |
| password       | Mot du passe     | test    |

#### Réponse
| Clé            | Valeur           | Exemple            | Type      |
| -------------  |----------------: |---------           |----------:|
| access_token   | Token d'accès    | xxxxxxxxxxxxxxxxx  | string    |

#### Exemple
`POST https://busybird.lbbe.univ-lyon1.fr/users/login.json`

[Body] `username=jeanne&password=test`

[HTTP Response] `{"access_token": "xxxxxxxxxxxxxxxxxxxxxxx"}`

## Endpoints pour gestion de formulaire "forms"

**Tous les endpoints "forms" doivent comporter le header Authorization formé correctement, comprenant l'`access_token` pour être utilisés.**

### GET forms/available.json

#### Description
Renvoie les schémas de formulaires enregistrés sur le serveur.

#### Arguments
Aucun.

#### Réponse
Objet de type `{[formName: string] : Form}`.

#### Exemple
`GET https://busybird.lbbe.univ-lyon1.fr/forms/available.json`

[HTTP Response] `{"cincle_plongeur": Form, "cerf_plongeur": Form, ...}`

---

### GET forms/sended.json

#### Description
Renvoie les entrées enregistrées sur le serveur pour un type de formulaire donné.

#### Arguments
| Nom            | Valeur attendue   | Exemple          |
| -------------  |----------------:  |---------         |
| type           | Type de formulaire| cincle_plongeur  |

#### Réponse
Set d'ID de formulaire, représentés sous la forme `{[formId: string]: true}` 


#### Exemple
`GET https://busybird.lbbe.univ-lyon1.fr/forms/sended.json?type=cincle_plongeur`

[HTTP Response] `{"AANUD18uziqu61253Dads": true, "UBD782ddnuaeAy576": true, ...}`


---

### GET forms/id.json

#### Description
Renvoie un formulaire et ses fichiers associés dans un archive ZIP.

#### Arguments
| Nom            | Valeur attendue   | Exemple            |
| -------------  |----------------:  |---------           |
| type           | Type de formulaire| cincle_plongeur    |
| id             | ID du formulaire  | UBD782ddnuaeAy576  |

#### Réponse
Archive ZIP (format binaire)


#### Exemple
`GET https://busybird.lbbe.univ-lyon1.fr/forms/id.json?type=cincle_plongeur&id=UBD782ddnuaeAy576`

---

### POST forms/send.json

#### Description
Envoie une entrée de formulaire sur le serveur.

#### Arguments
| Nom            | Valeur attendue   | Exemple          |
| -------------  |----------------:  |---------         |
| id             | ID du formulaire  | UBD782ddnuaeAy576|
| form           | Formulaire au format JSON (type FormSave) | {"location": "xx", "fields": {...}}  |

#### Réponse
| Clé            | Valeur                   | Exemple                    | Type                 |
| -------------  |----------------:         |---------                   |----------:           |
| status         | true                     | true                       | bool                 |
| send_metadata  | Métadonnées à envoyer    | ["pic_eye", "card_rythm"]  | false OU string[]    |

`send_metadata` peut être `false` (aucune métadonnée à envoyer) ou peut valoir un tableau de chaînes de caractères représentant le nom des champs liés à des fichiers encore non présents sur le serveur.

Si `send_metadata` est un tableau de chaînes de caractères, vous devez envoyer les fichiers demandés via `POST forms/metadata_send.json`.


#### Exemple
`POST https://busybird.lbbe.univ-lyon1.fr/forms/send.json`

[Body] `id=UBD782ddnuaeAy576&form={"location": "xx", "fields": {...}}`

[HTTP Response] `{"status": true, "send_metadata": false}`

---

### POST forms/metadata_send.json

#### Description
Envoie un fichier lié à un formulaire sur le serveur.
Le formulaire `id` doit exister sur le serveur pour pouvoir envoyer des données.

#### Arguments
| Nom            | Valeur attendue                    | Exemple               |
| -------------  |----------------:                   |---------              |
| id             | ID du formulaire                   | UBD782ddnuaeAy576     |
| type           | Type de formulaire                 | cincle_plongeur       |
| filename       | Nom du fichier à envoyer           | IMG_DSC0001.jpg       |
| data           | Contenu du fichier encodé en base64| dGVzdCBwb3VyIGwnQVBJ  |

#### Réponse
| Clé            | Valeur                   | Exemple                    | Type                 |
| -------------  |----------------:         |---------                   |----------:           |
| status         | true                     | true                       | bool                 |


#### Exemple
`POST https://busybird.lbbe.univ-lyon1.fr/forms/sended.json?type=cincle_plongeur`

[Body] `id=UBD782ddnuaeAy576&type=cincle_plongeur&filename=IMG_DSC0001.jpg&data=dGVzdCBwb3VyIGwnQVBJ`

[HTTP Response] `{"status": true}`
