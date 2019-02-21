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

function userLogger() : ?User {
    $token = getBearerToken();

    if ($token) {
        $users = json_decode(file_get_contents(USERS_FILE_PATH), true);

        if ($users && array_key_exists($token, $users)) {
            return new User($users[$token], $token);
        }
    }

    return null;
}

function userLooker(string $username) : array {
    $users = json_decode(file_get_contents(USERS_FILE_PATH), true);

    foreach ($users as $token => $u) {
        if ($u['username'] === $username) {
            return [$token, new User($u, $token)];
        }
    }

    return [null, null];
}

function getAvailableSubscriptions() : array {
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
        // Lie son ID $name à son nom à afficher ['name'] dans le JSON
        $forms[$name] = json_decode(file_get_contents(FORMS_FILE_PATH . '/' . $file), true)['name'];
    }

    return $forms;
}

function getListOfSubscriptions(array $subs) : array {
    // Listage des formulaires disponibles
    $files = scandir(FORMS_FILE_PATH);

    // Conversion de subs en tab associatif
    $sub = [];
    foreach ($subs as $s) {
        $sub[$s] = true;
    }

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

    return $forms;
}

function isActive(string $v) {
    return $v === "1" || $v === "t" || $v === "true";
}

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

function updateUser(User $user) : void {
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

class User {
    public $username = null;
    public $password = null;
    public $subscriptions = null;
    public $token = null;

    public function __construct(array $user, string $token) {
        $this->username = $user['username'];
        $this->password = $user['password'];
        $this->subscriptions = $user['sub'] ?? [];
        $this->token = $token;
    }

    public function formatToJson() : array {
        return ['username' => $this->username, 'password' => $this->password, 'sub' => $this->subscriptions];
    }
}
