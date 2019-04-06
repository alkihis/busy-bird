<?php

/// HELPERS FUNCTIONS
function randomToken(int $length = 32) : string {
    if ($length <= 8){
        $length = 32;
    }

    return bin2hex(random_bytes($length));
}

/** 
 * Get header Authorization
 * */
function getAuthorizationHeader() {
    $headers = null;
    if (isset($_SERVER['Authorization'])) {
        $headers = trim($_SERVER["Authorization"]);
    }
    else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { //Nginx or fast CGI
        $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
    } elseif (function_exists('getallheaders')) {
        $requestHeaders = getallheaders();
        // Server-side fix for bug in old Android versions (a nice side-effect of this fix means we don't care about capitalization for Authorization)
        $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
        //print_r($requestHeaders);
        if (isset($requestHeaders['Authorization'])) {
            $headers = trim($requestHeaders['Authorization']);
        }
    }
    return $headers;
}

/**
 * get access token from header
 * */
function getBearerToken() : ?string {
    $headers = getAuthorizationHeader();
    // HEADER: Get the access token from the header
    if (!empty($headers)) {
        $matches = [];
        if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
            return $matches[1];
        }
    }
    return null;
}

/**
 * Get a user from Bearer Token
 *
 * @return User|null
 */
function userLogger() : ?User {
    $token = getBearerToken();

    if ($token) {
        if (ENTRIES_STORAGE === MODE_FILES) {
            $users = json_decode(file_get_contents(USERS_FILE_PATH), true);

            if ($users && array_key_exists($token, $users)) {
                return new User($users[$token], $token);
            }
        }
        else if (ENTRIES_STORAGE === MODE_SQL) {
            return User::getFromSQLToken($token);
        }
    }

    return null;
}

/**
 * Find if $username exists and returns it
 *
 * @param string $username
 * @return array [null, null] | [$token, User]
 */
function userLooker(string $username) : array {
    if (ENTRIES_STORAGE === MODE_FILES) {
        $users = json_decode(file_get_contents(USERS_FILE_PATH), true);

        foreach ($users as $token => $u) {
            if ($u['username'] === $username) {
                return [$token, new User($u, $token)];
            }
        }
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        $user = User::getFromSQLUsername($username);

        if ($user) {
            return [$user->token, $user];
        }
    }

    return [null, null];
}

/**
 * Get all available models
 *
 * @return array
 */
function getAvailableSubscriptions() : array {
    $forms = [];

    if (ENTRIES_STORAGE === MODE_FILES) {
        // Listage des formulaires disponibles
        $files = scandir(FORMS_FILE_PATH);

        if (!$files) {
            EndPointManager::error(3);
        }
    
        foreach ($files as $file) {
            if ($file === "." || $file === "..") {
                continue;
            }

            $name = str_replace('.json', '', basename($file));
            // Lie son ID $name à son nom à afficher ['name'] dans le JSON
            $forms[$name] = json_decode(file_get_contents(FORMS_FILE_PATH . '/' . $file), true)['name'];
        }
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        $link = SQLLink::get();

        if ($link) {
            // Récupère les derniers modèles de chaque type
            $models = getLastModels();

            foreach ($models as $model) {
                $forms[$model['type']] = $model['label'];
            }
        }
    }

    return $forms;
}

/**
 * Get a sub array for a sub list (array of string of "type")
 *
 * @param array $subs
 * @return array
 */
function getListOfSubscriptions(array $subs) : array {
    // Conversion de subs en tab associatif
    $sub = [];
    foreach ($subs as $s) {
        $sub[$s] = true;
    }
    
    if (ENTRIES_STORAGE === MODE_FILES) {
        // Listage des formulaires disponibles
        $files = scandir(FORMS_FILE_PATH);

        if (!$files) {
            EndPointManager::error(3);
        }

        $forms = [];
        foreach ($files as $file) {
            if ($file === "." || $file === "..") {
                continue;
            }

            $name = str_replace('.json', '', basename($file));

            if (isset($sub[$name])) {
                // Si on a souscrit à ce form
                $forms[$name] = json_decode(file_get_contents(FORMS_FILE_PATH . '/' . $file), true);
            }
        }
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        $forms = [];

        // Récupération des derniers modèles
        $link = SQLLink::get();

        if ($link) {
            // Récupère les derniers modèles de chaque type
            $models = getLastModels();

            foreach ($models as $model) {
                if (isset($sub[$model['type']])) {
                    // Si on a souscrit à ce form
                    $forms[$model['type']] = json_decode($model['model'], true);
                }
            }
        }
    }

    return $forms;
}

function getLastModels() : ?mysqli_result {
    $link = SQLLink::get();

    if ($link) {
        $models = $link->query("SELECT *
        FROM    Models m1
        WHERE   m1.model_time = (
            SELECT  MAX(m2.model_time)
            FROM    Models m2
            WHERE   m2.type = m1.type
        )");

        if ($models) {
            return $models;
        }
    }
    
    return null;
}

/**
 * Récupère un type de schéma
 *
 * @param string $type
 * @return array|null
 */
function getSchema(string $type) : ?array {
    if (ENTRIES_STORAGE === MODE_FILES) {
        // Tente de lire le schéma correspondant
        $fileschema = $type . ".json";

        if (!file_exists(FORMS_FILE_PATH . $fileschema)) {
            return null;
        }

        $schema = json_decode(file_get_contents(FORMS_FILE_PATH . $fileschema), true);

        return $schema;
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        $link = SQLLink::get();

        if ($link) {
            $type = $link->escape_string($type);
            $q = $link->query("SELECT * FROM Models WHERE type='$type' ORDER BY model_time LIMIT 1");

            if ($q->num_rows) {
                return json_decode($q->fetch_assoc()['model'], true);
            }
        }
    }

    return null;
}

/**
 * Get a specific entry
 *
 * @param string $type Form type
 * @param integer|null $id SQL ID
 * @param string|null $uuid UUID (JSON key or SQL UUID)
 * @return array|null Return entry or null if not found
 */
function getEntry(string $type, ?int $id, ?string $uuid) : ?array {
    if ($id && ENTRIES_STORAGE === MODE_SQL) {
        $link = SQLLink::get();

        if ($link) {
            $type = $link->escape_string($type);

            $q = $link->query("SELECT * FROM Entries WHERE id_e=$id AND type='$type'");

            if ($q->num_rows) {
                return json_decode($q->fetch_assoc()['entry'], true);
            }
        }
    }
    else if ($uuid) {
        if (ENTRIES_STORAGE === MODE_FILES) {
            if (file_exists(UPLOAD_FILE_PATH . "$type/$id.json")) {
                return json_decode(file_get_contents(UPLOAD_FILE_PATH . "$type/$id.json"), true);
            }
        }
        else if (ENTRIES_STORAGE === MODE_SQL) {
            $link = SQLLink::get();

            if ($link) {
                $type = $link->escape_string($type);
                $uuid = $link->escape_string($uuid);

                $q = $link->query("SELECT * FROM Entries WHERE uuid='$uuid' AND type='$type' ORDER BY date_e DESC LIMIT 1");

                if ($q->num_rows) {
                    return json_decode($q->fetch_assoc()['entry'], true);
                }
            }
        }
    }

    return null;
}

/**
 * Récupère les formulaires envoyés (dernières versions)
 *
 * @return void
 */
function getSendedForms() : ?mysqli_result {
    $link = SQLLink::get();

    if ($link) {
        // Récupère les envoi les plus récents
        $sended = $link->query("SELECT *
        FROM    Entries e1
        WHERE   e1.date_e = (
            SELECT  MAX(e2.date_e)
            FROM    Entries e2
            WHERE   e2.uuid = e1.uuid
        )");

        if ($sended) {
            return $sended;
        }
    }
    
    return null;
}

function isActive(string $v) {
    return $v === "1" || $v === "t" || $v === "true";
}

/**
 * Refresh actuals subs $subs with new data $new_data, specifing if
 * we should add or remove $new_data from $subs with $add boolean
 *
 * @param array $subs
 * @param array $new_data
 * @param boolean $add
 * @return array
 */
function refreshSubs(array $subs, array $new_data, bool $add = true) : array {
    // Conversion de entrées en tab associatif
    $news = [];
    foreach ($new_data as $s) {
        $news[trim($s)] = true;
    }

    // Conversion de subs actuels en tab associatif
    $sub = [];
    foreach ($subs as $s) {
        $sub[$s] = true;
    }

    if ($add) {
        return array_keys($sub + $news);
    }
    else {
        $new_subs = [];

        foreach ($sub as $key => $s) {
            if (!isset($news[$key])) {
                // Si on ne doit pas supprimer
                $new_subs[] = $key;
            }
        }

        return $new_subs;
    }
}

/**
 * If $user has changed, modify $user in database too.
 *
 * @param User $user
 * @return void
 */
function updateUser(User $user) : void {
    if (ENTRIES_STORAGE === MODE_FILES) {
        $fp = fopen(USERS_FILE_PATH, "r+");
        $size = filesize(USERS_FILE_PATH);
        flock($fp, LOCK_EX);
    
        $users_file = json_decode(fread($fp, $size), true);
    
        // Mise à jour de l'utilisateur
        $users_file[$user->token] = $user->formatToJson();
    
        ftruncate($fp, 0);     // effacement du contenu
        fseek($fp, 0);
        fwrite($fp, json_encode($users_file));  
        fflush($fp);           // libère le contenu avant d'enlever le verrou
        flock($fp, LOCK_UN);
        fclose($fp);
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        $link = SQLLink::get();

        if ($link) {
            // Met à jour les données
            $stmt = $link->prepare("UPDATE Users SET name=?, token=?, password=?");

            $stmt->bind_param("sss", $user->username, $user->token, $user->password);
            $stmt->execute();

            // Met à jour les souscriptions
            // Les retire toutes
            $link->autocommit(false);

            $link->query("DELETE FROM UsersSubs WHERE id_u={$user->id}");

            // Ajoute tout
            foreach ($user->subscriptions as $sub) {
                $sub = $link->escape_string($sub);
                $link->query("INSERT INTO UsersSubs (id_u, type) VALUES ({$user->id}, '$sub')");
            }

            $link->commit();
            $link->autocommit(true);
        }
    }
}

function connectBD() : ?mysqli {
    $sql = mysqli_connect(SQL_ADDRESS, SQL_USER, SQL_PASSWORD, SQL_DATABASE);
    if (mysqli_connect_errno()) {
        printf("Échec de la connexion : %s\n", mysqli_connect_error());
    }
    else {
        mysqli_query($sql, 'SET NAMES UTF8mb4');
    }

    if (!$sql) {
        return null;
    }

    return $sql;
}

class SQLLink {
    /**
     * Link to MYSQL
     *
     * @var mysqli
     */
    protected static $link = null;

    public static function get() : ?mysqli {
        if (self::$link === null) {
            self::$link = connectBD();
        }

        return self::$link;
    }
}

class User {
    public $username = null;
    public $password = null;
    public $subscriptions = null;
    public $token = null;
    public $id = null;
    public $status = null;

    /**
     * Get a user from username.
     * Null if user not found.
     *
     * @param string $username
     * @return User|null
     */
    public static function get(string $username) : ?User {
        if (ENTRIES_STORAGE === MODE_FILES) {
            $users_file = json_decode(file_get_contents(USERS_FILE_PATH), true);

            foreach ($users_file as $token => $user) {
                if ($user['username'] === $username) {
                    return new User($user, $token);
                }
            }
        }
        else if (ENTRIES_STORAGE === MODE_SQL) {
            return self::getFromSQLUsername($username);
        }

        return null;
    }

    /**
     * Get a user from token.
     * Null if user not found.
     *
     * @param string $token
     * @return User|null
     */
    public static function tget(string $token) : ?User {
        if (ENTRIES_STORAGE === MODE_FILES) {
            $users_file = json_decode(file_get_contents(USERS_FILE_PATH), true);

            if (array_key_exists($token, $users_file)) {
                return new User($users_file[$token], $token);
            }
        }
        else if (ENTRIES_STORAGE === MODE_SQL) {
            return self::getFromSQLToken($token);
        }

        return null;
    }

    protected static function createUser(mysqli_result $user) : User {
        $link = SQLLink::get();

        $user = $user->fetch_assoc();
        $subs = $link->query("SELECT type FROM UsersSubs WHERE id_u='{$user['id_u']}'");

        $subs_user = [];

        foreach ($subs as $s) {
            $subs_user[] = $s['type'];
        }

        return new User([
            'username' => $user['name'],
            'password' => $user['password'],
            'sub' => $subs_user,
            'id_u' => $user['id_u'],
            'status' => $user['status']
        ], $user['token']);
    }

    public static function getFromSQLId(int $id) : ?User {
        $link = SQLLink::get();

        if ($link) {
            $user = $link->query("SELECT * FROM Users WHERE id_u=$id");
            if ($user->num_rows) {
                return self::createUser($user);
            }
        }

        return null;
    }

    public static function getFromSQLUsername(string $username) : ?User {
        $link = SQLLink::get();

        if ($link) {
            $name = $link->escape_string($username);

            $user = $link->query("SELECT * FROM Users WHERE name='$name'");
            if ($user->num_rows) {
                return self::createUser($user);
            }
        }

        return null;
    }

    public static function getFromSQLToken(string $token) : ?User {
        $link = SQLLink::get();

        if ($link) {
            $token = $link->escape_string($token);

            $user = $link->query("SELECT * FROM Users WHERE token='$token'");
            if ($user->num_rows) {
                return self::createUser($user);
            }
        }

        return null;
    }

    /**
     * Create a new user. Do NOT check if username is taken.
     * Returns access token.
     *
     * @param string $username
     * @param string $password
     * @return string User's access token
     */
    public static function newUser(string $username, string $password) : string {
        $new_token = randomToken(32);
    
        while (self::tget($new_token)) {
            $new_token = randomToken(32);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        if (ENTRIES_STORAGE === MODE_FILES) {
            $users_file = json_decode(file_get_contents(USERS_FILE_PATH), true);
            $users_file[$new_token] = ["username" => $username, "password" => $hash, 'sub' => []];
            file_put_contents(USERS_FILE_PATH, json_encode($users_file));
        }
        else if (ENTRIES_STORAGE === MODE_SQL) {
            // Insère le nouveau utilisateur
            $link = SQLLink::get();

            if ($link) {
                $stmt = $link->prepare("INSERT INTO Users (name, token, password, status) VALUES (?, ?, ?, ?)");

                $level = DEFAULT_USER_LEVEL;
                $stmt->bind_param("sssi", $username, $new_token, $hash, $level);

                if (!$stmt->execute()) {
                    throw new Exception("SQL error when inserting new user");
                }
            }
            else {
                throw new Exception("SQL not accessible");
            }
        }

        return $new_token;
    }

    public function __construct(array $user, string $token) {
        $this->username = $user['username'];
        $this->password = $user['password'];
        $this->subscriptions = $user['sub'] ?? [];
        $this->token = $token;
        $this->id = $user['id_u'] ?? null;
        $this->status = $user['status'] ?? DEFAULT_USER_LEVEL;
    }

    public function formatToJson() : array {
        return ['username' => $this->username, 'password' => $this->password, 'sub' => $this->subscriptions, 'status' => $this->status];
    }
}
