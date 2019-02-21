# API de Busy Bird, l'application du LBBE
## Introduction

Cette API est à destination d'une utilisation avec l'application Busy Bird uniquement. Les endpoints REST disponibles ne sont pensés que pour servir l'application, excepté les endpoints de récupération `GET forms/sended.json` et `GET forms/id.json`.

Ce serveur permet de connecter un utilisateur dans Busy Bird, ainsi que de recevoir des entrées de formulaires saisies via l'application.

Les types présentés dans cette documentation (tels que `FormSchema`) font référence aux types TypeScript définis dans l'application Busy Bird.

Dans toutes les requêtes `POST` à effectuer, le formatage du corps de la requête est laissé à votre choix entre `application/x-www-form-urlencoded` et `multipart/form-data`.

## Fonctionnement

Tout d'abord, un utilisateur doit posséder un token d'accès pour interagir avec le serveur.
Ce token est obtenable via `POST users/login.json`.
Chaque requête doit contenir le token dans l'entête HTTP `Authorization` sous la forme `Authorization`: `Bearer xxxxxxx` où `xxxxxxx` est le token renvoyé par `POST users/login.json`.

Les réponses serveur > client s'effectuent uniquement au format JSON (format `application/json`).

## Erreurs
Les erreurs sont renvoyées avec le code HTTP approprié (`400 Bad Request` pour une requête mal formée, `403 Forbidden` pour une requête non authentifiée et `404 Not Found` pour un endpoint invalide / un fichier demandé inexistant).
Dans le corps de la réponse se trouve un JSON explicitant le code d'erreur et son message associé.

Exemple : `{"error_code":8,"message":"You must be logged to do that"}` 

### Codes d'erreurs
**TODO**

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
| subscriptions  | Souscriptions de l'utilisateur connecté    | {"cincle_plongeur": Form}  | FormSchema    |

Pour plus d'informations sur les souscriptions, voir les endpoints `GET schemas/subscribed.json` et `GET schemas/available.json`

#### Exemple
`POST https://busybird.lbbe.univ-lyon1.fr/users/login.json`

[Body] `username=jeanne&password=test`

[HTTP Response] `{"access_token": "xxxxxxxxxxxxxxxxxxxxxxx", "subscriptions": FormSchema}`

## Endpoints pour synchronisation de formulaire "forms"

**Tous les endpoints "forms" doivent comporter le header Authorization formé correctement, comprenant l'`access_token` pour être utilisés.**

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
`POST https://busybird.lbbe.univ-lyon1.fr/forms/metadata_send.json`

[Body] `id=UBD782ddnuaeAy576&type=cincle_plongeur&filename=IMG_DSC0001.jpg&data=dGVzdCBwb3VyIGwnQVBJ`

[HTTP Response] `{"status": true}`


## Endpoints pour gestions des schémas de formulaire "schemas"

**Tous les endpoints "schemas" doivent comporter le header Authorization formé correctement, comprenant l'`access_token` pour être utilisés.**

### GET schemas/available.json

#### Description
Renvoie les schémas de formulaires disponibles sur le serveur et si l'utilisateur est abonné à ceux-ci.

#### Arguments
Aucun.

#### Réponse
Objet de type `{[formName: string]: [string, bool]}`.

L'objet associe nom du formulaire (clé unique, comme `cincle_plongeur`) à un tuple de deux valeurs. 
La première valeur du tuple est le label du formulaire (champ `name` de l'objet `Form`), la seconde est un booléen précisant si l'utilisateur connecté a souscrit ou non à ce formulaire.

#### Exemple
`GET https://busybird.lbbe.univ-lyon1.fr/schemas/available.json`

[HTTP Response] `{"cincle_plongeur": ["Cincle Plongeur", true], "cerf_plongeur": ["Cerf Plongeur", false], ...}`

---

### GET schemas/subscribed.json

#### Description
Renvoie les schémas de formulaires auquel l'utilisateur connecté est abonné.

#### Arguments
Aucun.

#### Réponse
Objet de type `FormSchema`.

#### Exemple
`GET https://busybird.lbbe.univ-lyon1.fr/schemas/subscribed.json`

[HTTP Response] `{"cincle_plongeur": Form, "cerf_plongeur": Form, ...}`

---

### POST schemas/subscribe.json

#### Description
Lance la souscription d'un ou plusieurs schémas de formulaire par l'utilisateur connecté.

#### Arguments
| Nom            | Valeur attendue   | Exemple          |
| -------------  |----------------:  |---------         |
| ids            | Noms de formulaire, séparés par une virgule  | cincle_plongeur,cerf_plongeur,marmotte_terree|
| trim_subs (optionnel)| Détermine si les souscriptions actuelles suite aux abonnements doivent être renvoyés  | true |

Attention, si `ids` comprend plusieurs noms de formulaire séparés par une virgule `,`, aucun espace ne doit être inséré entre la virgule et les noms.

Si `trim_subs` vaut `true`, les souscriptions ne seront **PAS** renvoyées par l'endpoint. `null` sera renvoyé à la place.

#### Réponse
Objet de type `FormSchema` si `trim_subs` vaut `false`, `null` sinon.

#### Exemple
*L'utilisateur est est abonné à `cincle_plongeur` avant la requête.*

`POST https://busybird.lbbe.univ-lyon1.fr/schemas/subscribe.json`

[Body] `ids=marmotte_terree,cerf_plongeur&trim_subs=false`

[HTTP Response] `{"cincle_plongeur": Form, "cerf_plongeur": Form, "marmotte_terree": Form}`

---

### POST schemas/unsubscribe.json

#### Description
Retire la ou les souscription(s) de l'utilisateur connecté d'un ou plusieurs schémas de formulaire.

#### Arguments
| Nom            | Valeur attendue   | Exemple          |
| -------------  |----------------:  |---------         |
| ids            | Noms de formulaire, séparés par une virgule  | cincle_plongeur,cerf_plongeur|
| trim_subs (optionnel)| Détermine si les souscriptions actuelles suite aux désabonnements doivent être renvoyés  | true |

Attention, si `ids` comprend plusieurs noms de formulaire séparés par une virgule `,`, aucun espace ne doit être inséré entre la virgule et les noms.

Si `trim_subs` vaut `true`, les souscriptions ne seront **PAS** renvoyées par l'endpoint. `null` sera renvoyé à la place.

#### Réponse
Objet de type `FormSchema` si `trim_subs` vaut `false`, `null` sinon.

#### Exemple
*L'utilisateur est abonné à `cerf_plongeur` et à `cincle_plongeur` avant la requête.*

`POST https://busybird.lbbe.univ-lyon1.fr/schemas/unsubscribe.json`

[Body] `ids=cincle_plongeur&trim_subs=false`

[HTTP Response] `{"cerf_plongeur": Form}`
