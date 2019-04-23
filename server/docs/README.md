# Busy Bird API, the LBBE application
## Introduction

This API is only meant to be used with the Busy Bird application. Available REST endpoints are designed to fit with the app, except the `GET forms/sended.json` endpoint.

This server allows to connect one user in the app, and permit to upload form entries registered by Busy Bird.

Referenced types in this documentation (like `Schema`) refers to TypeScript types defined in the application's code.

In all `POST` requests, body formatting is a developer choice between `application/x-www-form-urlencoded` and `multipart/form-data`. However, `multipart/form-data` is recommanded to send a large amount of data.

## How it works

First of all, a user must have a access token to interact with the server.
This token is fetchable with `POST users/login.json`.
Each request must contain the token in HTTP header `Authorization` under the form `Authorizarion: Bearer xxxxxxx` where `xxxxxxx` is the user token.
Unless it is explicitly specified, every request requires authentification.

Server to client responses are always served in JSON format (header `Content-Type: application/json` is set).

## Errors
Errors are sended with the appropriated HTTP code (`400 Bad Request` for a unwell-formed request, `403 Forbidden` for a non-authentificated request, or `404 Not Found` for a request inexistant file).
Response's body contains a JSON object that explains the error message and give an error code.

Example : 
```json
{
    "error_code": 8,
    "message": "You must be logged to do that"
}
```

Erros will *never* be sended with a similar-OK HTTP code (2xx).

### Error codes
| Code| HTTP code | Meaning          |                 
| --- |-----|----------------------------------|
| 1   | 500 | The server has encountered an unrecoverable error during request. This is not normal at all, you should report it to the developers of Busy Bird |
| 2   | 404 | Requested endpoint does not exists |
| 3   | 500 | The server has encountered an error during your request. Please try again later |
| 4   | 400 | You try to request an endpoint with a invalid HTTP method, check the docs |
| 5   | 400 | Some required arguments are not specified in your request |
| 6   | 404 | Specified master password is invalid |
| 7   | 400 | You have specified an ID or an username that is not alphanumerical-only |
| 8   | 403 | You request is not authentificated or use a token that does refer to any user |
| 9   | 400 | You try to send a file to a form that does not exists |
| 10  | 403 | User does not exists |
| 11  | 403 | Token or password is invalid |
| 12  | 400 | You can't create an account with this username: It already exists |
| 13  | 400 | Your account should have a password |
| 14  | 400 | You have sent a form with a unwell-formed JSON |
| 15  | 403 | You try to login with a token that does not refer to the requested username |
| 16  | 403 | Same as error code 10 |
| 17  | 403 | You try to do something that you're not allowed to do. Check your status |
| 18  | 400 | Specified command parameter does not match with any existing command |
| 19  | 400 | Specified media ID does not exists or has expired |
| 20  | 400 | You try to send a part that is bigger than the total size |
| 21  | 400 | Segment index is invalid |
| 22  | 400 | Sended part is bigger than 5 MB |
| 23  | 403 | You're not the owner of this media ID |
| 24  | 400 | At least one part of the file is missing |
| 25  | 400 | Announced size of file does not match the actual file size |
| 26  | 400 | Media ID is expired |
| 27  | 400 | You try to set a invalid status |
| 28  | 404 | Requested form does not exists |


# Endpoints
If any precision is made about the fact that an argument is optional, this argument is **required**.

## User management "users"

### POST users/create.json

#### Description

Create a new user and returns his created access token.
A master password (available in the server constants) is required to create an account.

*This request does not require authentification.*

#### Arguments
| Name            | Excepted value                    | Example |
| -------------  |----------------:                   |---------|
| username       | Username of the created account    | jeanne  |
| password       | Password of the created account    | café    |
| admin_password | Master password                    | xxxxxx  |

#### Response
| Key            | Value            | Example            | Type      |
| -------------  |----------------: |---------           |----------:|
| access_token   | Access token     | xxxxxxxxxxxxxxxxx  | string    |

#### Example
`POST {{api_url}}/users/create.json`

[Body] `username=jeanne&password=test&admin_password=xxxxxx`

[HTTP Response] `{"access_token": "xxxxxxxxxxxxxxxxxxxxxxx"}`

---

### POST users/login.json

#### Description
Log a user with a username/password couple and returns an access token.

*This request does not require authentification.*

#### Arguments
| Name           | Expected value   | Example |
| -------------  |----------------: |---------|
| username       | Username         | jeanne  |
| password       | Password         | test    |

#### Response
| Key            | Value            | Example            | Type      |
| -------------  |----------------: |---------           |----------:|
| access_token   | Access token     | xxxxxxxxxxxxxxxxx  | string    |
| subscriptions  | Subscriptions of the logged user    | {"cincle_plongeur": Schema}  | FormSchema    |

For more informations about subscriptions, see endpoints `GET schemas/subscribed.json` and `GET schemas/available.json`.

#### Example
`POST {{api_url}}/users/login.json`

[Body] `username=jeanne&password=test`

[HTTP Response] `{"access_token": "xxxxxxxxxxxxxxxxxxxxxxx", "subscriptions": FormSchema}`

---

### POST users/upgrade.json

#### Description
Change an user status.

Available status are `basic` or `admin`.
Users are `basic` by default.

*This request require an administrator status if `admin_password` is not specified.*

#### Arguments
| Name            | Expected value  | Example |
| -------------  |----------------: |---------|
| username       | Username         | jeanne  |
| status         | New status       | basic   |
| admin_password         | Master password (optional)      | xxxx   |

#### Response
Empty HTTP 200 response if success.

#### Example
`POST {{api_url}}/users/upgrade.json`

[Body] `username=jeanne&status=basic`

---

### POST users/validate.json

#### Description
Endpoint used Busy Bird server signature. 
User and token can be joined to request. 

If user & token are not specified, return an empty array.

If user does not exists, return error code 16.

If user does exists but token mismatched with stored token, return error code 15.

Otherwise, return the same data as `POST users/login.json`.

*This request does not require authentification.*

#### Arguments
| Name           | Excepted value  | Example |
| -------------  |----------------:|---------|
| username       | Username        | jeanne  |
| token          | Token linked to username     | xxxxxxxx    |


#### Example
`POST {{api_url}}/users/validate.json`

[Body] `username=jeanne&token=xxxxxxxxxxxx`


## Endpoints for form sync "forms"

### GET forms/sended.json

#### Description
Return saved entries in the server for a given form type.

#### Arguments
| Name            | Excepted value   | Example          |
| -------------  |----------------:  |---------         |
| type           | Form type | cincle_plongeur  |

#### Response
Set of form IDs, returned in a string array.


#### Example
`GET {{api_url}}/forms/sended.json?type=cincle_plongeur`

[HTTP Response] `["AANUD18uziqu61253Dads", "UBD782ddnuaeAy576", ...]`

---

### POST forms/send.json

#### Description
Send a form entry to the server.

#### Arguments
| Name           | Expected value   | Example          |
| -------------  |----------------:  |---------         |
| id             | Form ID  | UBD782ddnuaeAy576|
| form           | JSON-formatted form (FormSave type) | {"location": "xx", "fields": {...}}  |

#### Response
| Key            | Value                    | Example                    | Type                 |
| -------------  |----------------:         |---------                   |----------:           |
| status         | true                     | true                       | boolean              |
| send_metadata  | Metadata to send         | ["pic_eye", "card_rythm"]  | false OU string[]    |

`send_metadata` can be `false` (any metadata to send) or can be an string array containing field names linked to files that are not present in the server.

If `send_metadata` is a string array, you must send asked files through `POST forms/metadata_send.json` or `POST forms/metadata_chunk_send.json`.


#### Example
`POST {{api_url}}/forms/send.json`

[Body] `id=UBD782ddnuaeAy576&form={"location": "xx", "fields": {...}}`

[HTTP Response] `{"status": true, "send_metadata": false}`

---

### POST forms/metadata_send.json

#### Description
Send a file linked to a form entry present in the server.

**Warning**: Max file size is fixed to *10 MB* **after base64 encoding**.
To send larger files, you **must** use `POST forms/metadata_chunk_send.json` endpoint.

#### Arguments
| Name            | Expected value                    | Example               |
| -------------  |----------------:                   |---------              |
| id             | Form ID                   | UBD782ddnuaeAy576     |
| type           | Form type                 | cincle_plongeur       |
| filename       | Name of the file to send           | IMG_DSC0001.jpg       |
| data           | File content base64-encoded        | dGVzdCBwb3VyIGwnQVBJ  |

#### Response
| Key            | Value                   | Example                    | Type                 |
| -------------  |----------------:         |---------                   |----------:           |
| status         | true                     | true                       | boolean              |


#### Example
`POST {{api_url}}/forms/metadata_send.json`

[Body] `id=UBD782ddnuaeAy576&type=cincle_plongeur&filename=IMG_DSC0001.jpg&data=dGVzdCBwb3VyIGwnQVBJ`

[HTTP Response] `{"status": true}`

---

### POST forms/metadata_chunk_send.json **[INIT]**

#### Description
Send a file linked to a form to the server, but using a chunked upload method.
*This is **INIT** command, used to start an upload process*.

**Notice**: This couple of endpoints use *commands* (`INIT`, `APPEND`, `FINALIZE` and optional `STATUS`), like the [Twitter API](https://developer.twitter.com/en/docs/media/upload-media/api-reference/post-media-upload-init). The global concept of this chunk send endpoint is the same.

`media_id` is returned in number form and in string form. 
For a JavaScript usage, it is fairly recommanded to use *only* the **string** form: `media_id` can be a 64-bit integer.

#### Arguments
| Name           | Expected value                     | Example               |
| -------------  |----------------:                   |---------              |
| id             | Form unique identifier             | UBD782ddnuaeAy576     |
| type           | Form type                          | cincle_plongeur       |
| filename       | Name of the file to send           | IMG_DSC0001.jpg       |
| size           | Size of the file to send, in bytes | 4204102               |
| command        | Command name (case sensitive)      | INIT                  |

#### Result
| Key            | Value                       | Example                    | Type                 |
| -------------  |----------------:            |---------                   |----------:           |
| media_id       | Media ID for other commands | 239583902084908            | integer              |
| media_id_str   | Media ID for other commands | "239583902084908"          | string               |
| expiration     | Timestamp when media ID will become invalid | 1555924902 | integer              |


#### Example
`POST {{api_url}}/forms/metadata_chunk_send.json`

[Body] `command=INIT&id=UBD782ddnuaeAy576&type=cincle_plongeur&filename=IMG_DSC0001.jpg&size=4204102`

[HTTP Response] 
```json
{
    "media_id": 239583902084908, 
    "media_id_str": "239583902084908", 
    "expiration": 1555924902
}
```

---

### POST forms/metadata_chunk_send.json **[APPEND]**

#### Description
Send a file linked to a form to the server, but with a chunked upload method.
*This is **APPEND** command, used to push a file part to the server*.

`data` must be base64-encoded. **EACH FILE PART SHOULD BE BASE64-ENCODED SEPARATELY**.

Order of the segments (given by `segment_index` parameter) is not important, you can send multiple parts without having to deal with a particular order.

*Warning*: `data` parameter must not exceed 5 MB (before base64-encoding).

#### Arguments
| Name           | Expected value                           | Example               |
| -------------  |----------------:                         |---------              |
| data           | Data of the file part (base64 encoded)   | dGVzdCBwb3VyIGwnQVBJ       |
| media_id       | Media ID returned by INIT command        | 239583902084908       |
| segment_index  | Which part of the final file it is (starting at 0, to 999 maximum) | 0               |
| command        | Command name (case sensitive)            | APPEND                |

#### Result
May be an empty HTTP 200 response, or a `{"status": true}` 200 response.


#### Example
`POST {{api_url}}/forms/metadata_chunk_send.json`

[Body] `command=APPEND&media_id=239583902084908&segment_index=0&data=dGVzdCBwb3VyIGwnQVBJ`

---

### POST forms/metadata_chunk_send.json **[FINALIZE]**

#### Description
Send a file linked to a form to the server, but using a chunked upload method.
*This is **FINALIZE** command, used to complete the file upload*.

When `FINALIZE` command is complete, file has been successfully uploaded.

#### Arguments
| Name           | Expected value                     | Example               |
| -------------  |----------------:                   |---------              |
| media_id       | Media ID returned by INIT command  | 239583902084908       |
| command        | Command name (case sensitive)      | FINALIZE              |

#### Result
May be an empty HTTP 200 response, or a `{"status": true}` 200 response.


#### Example
`POST {{api_url}}/forms/metadata_chunk_send.json`

[Body] `command=FINALIZE&media_id=239583902084908`

---

### GET forms/metadata_chunk_send.json **[STATUS]**

#### Description
Send a file linked to a form to the server, but using a chunked upload method.
*This is **STATUS** command, used to get infos about sended file*.

`STATUS`, unlike other commands, use **HTTP GET** method.

#### Arguments
| Name           | Expected value                     | Example               |
| -------------  |----------------:                   |---------              |
| media_id       | Media ID returned by INIT command  | 239583902084908       |
| command        | Command name (case sensitive)      | STATUS                |

#### Result
| Key            | Value                         | Example                    | Type                 |
| -------------  |----------------:              |---------                   |----------:           |
| id             | Form ID                            | 117EUDHZ72            | string              |
| type           | Form type                          | cincle_plongeur       | string |
| filename       | Name of the file to send           | IMG_DSC0001.jpg       | string |
| size           | Size of the file to send, in bytes | 4204102               | integer |
| expiration     | Timestamp when media ID will become invalid | 1555924902 | integer              |
| sended_parts   | Parts sended to server | [{index: 0, size: 3294}, {index: 1, size: 4320}, ...] | Array of objects |
| sended_size    | Size (in bytes) sended to server | 2296110 | integer              |

#### Example
`GET {{api_url}}/forms/metadata_chunk_send.json?command=STATUS&media_id=239583902084908`

[HTTP Response] 
```json
{
    "id": "117EUDHZ72", 
    "type": "cincle_plongeur", 
    "filename": "IMG_DSC0001.jpg", 
    "size": 4204102, 
    "expiration": 1555924902, 
    "sended_parts": [ {
            "index": 0,
            "size": 1389
        }, {
            "index": 1,
            "size": 1442
    } ], 
    "sended_size": 32948
}
```

## Endpoints for handling form models "schemas"

### GET schemas/available.json

#### Description
Return form models available in the server and if user has subscribed to each model.

#### Arguments
None.

#### Response
Object of type `{[formName: string]: [string, boolean]}`.

Object link a unique key, like `cincle_plongeur` to a tuple of two values.
First value is the model label (field `name` of a `Schema` object), the second one is a boolean, that is `true` if logged user has subscribed to this model, and `false` otherwise.

#### Example

*Logged user has subscribed to `cincle_plongeur` in this example.*

`GET {{api_url}}/schemas/available.json`

[HTTP Response] 
```json
{
    "cincle_plongeur": [
        "Cincle Plongeur", true
    ], 
    "cerf_plongeur": [
        "Cerf Plongeur", false
    ], 
    ...
}
```

---

### GET schemas/subscribed.json

#### Description
Return form models subscribed by the authentificated user.

#### Arguments
None.

#### Response
Object that implements `FormSchema`.

#### Example
`GET {{api_url}}/schemas/subscribed.json`

[HTTP Response] 
```json
{
    "cincle_plongeur": Schema, 
    "cerf_plongeur": Schema, 
    ...
}
```

---

### POST schemas/subscribe.json

#### Description
Subscribes the user to one or multiple form models.

#### Arguments
| Name            | Expected value   | Example          |
| -------------  |----------------:  |---------         |
| ids            | Form types, separated by a comma  | cincle_plongeur,cerf_plongeur,marmotte_terree|
| trim_subs | Subscriptions should be returned after subscription (optional)  | true |

**Warning**: If `ids` hold multiple form types separated by a comma `,`, it shoud have any space between the comma and the form types.

If `trim_subs` is `true`, subscriptions are **NOT** returned by the endpoint. A empty HTTP 200 response will be returned.

#### Response
Object that implements `FormSchema` if `trim_subs` is `false`, empty HTTP 200 otherwise.

#### Example
*User has subscribed to `cincle_plongeur` before this request.*

`POST {{api_url}}/schemas/subscribe.json`

[Body] `ids=marmotte_terree,cerf_plongeur&trim_subs=false`

[HTTP Response] 
```json
{
    "cincle_plongeur": Schema, 
    "cerf_plongeur": Schema, 
    "marmotte_terree": Schema
}
```

---

### POST schemas/unsubscribe.json

#### Description
Unsubscribes the user to one or mutiple form models.

#### Arguments
| Name            | Expected value   | Example          |
| -------------  |----------------:  |---------         |
| ids            | Form types, separated by a comma  | cincle_plongeur,cerf_plongeur,marmotte_terree|
| trim_subs | Subscriptions should be returned after unsubscription (optional)  | true |

**Warning**: If `ids` hold multiple form types separated by a comma `,`, it shoud have any space between the comma and the form types.

If `trim_subs` is `true`, subscriptions are **NOT** returned by the endpoint. A empty HTTP 200 response will be returned.

#### Response
Object that implements `FormSchema` if `trim_subs` is `false`, empty HTTP 200 otherwise.

#### Example
*User has subscribed to `cerf_plongeur` and `cincle_plongeur` before this request.*

`POST {{api_url}}/schemas/unsubscribe.json`

[Body] `ids=cincle_plongeur&trim_subs=false`

[HTTP Response] 
```json
{
    "cerf_plongeur": Schema
}
```

### POST schemas/insert.json

#### Description
Add or update a form model.

#### Arguments
| Name            | Expected value   | Example          |
| -------------  |----------------:  |---------         |
| type           | Form type (must be unique)  | cincle_plongeur |
| model          | Entire form model, in JSON format. Must implement `Schema` interface  | '{"name": "Cincle Plongeur", ...}' |

If `type` refer to an existing schema, it will be updated (and served to users the next time they'll fetch it).

#### Response
Empty HTTP 200 response if success.

#### Example

`POST {{api_url}}/schemas/insert.json`

[Body] `type=cincle_plongeur&model={"name": "Cincle Plongeur", ...}`

### GET schemas/get.json

#### Description
Get an existing form schema.
Does not refer to subscriptions. 
Use it to get a form schema in order to modify it or check if it exists.

#### Arguments
| Name            | Expected value   | Example          |
| -------------  |----------------:  |---------         |
| type           | Form type  | cincle_plongeur |

#### Response
Object that implement `Schema` interface, HTTP 404 if schema does not exists.

#### Example

`GET {{api_url}}/schemas/get.json?type=cincle_plongeur`

[HTTP Response] `{"name": "Cincle Plongeur", ...}`
