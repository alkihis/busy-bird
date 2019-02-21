<?php

function checkRequired() : array {
    if (isset($_POST['username'], $_POST['password'], $_POST['admin_password'])) {
        return [$_POST['username'], $_POST['password'], $_POST['admin_password']];
    }
    else {
        EndPointManager::error(5);
    }
}

function loadEndpoint(string $method) : array {
    if ($method !== 'POST') {
        EndPointManager::error(4);
    }

    list($username, $password, $admin) = checkRequired();

    if ($admin !== ADMIN_PASSWORD_AUTH) {
        EndPointManager::error(6);
    }

    if (!preg_match("/^[a-z0-9_-]+$/i", $username)) {
        EndPointManager::error(7);
    }

    $password = trim($password);
    if ($password === "") {
        EndPointManager::error(13);
    }

    $new_token = randomToken(32);

    $fp = fopen(USERS_FILE_PATH, "r+");
    $size = filesize(USERS_FILE_PATH);
    flock($fp, LOCK_EX);

    $users_file = json_decode(fread($fp, $size), true);

    foreach ($users_file as $u) {
        if ($u['username'] === $username) {
            flock($fp, LOCK_UN);
            fclose($fp);
            EndPointManager::error(12);
        }
    }
    
    while (array_key_exists($new_token, $users_file)) {
        $new_token = randomToken(32);
    }

    $users_file[$new_token] = ["username" => $username, "password" => password_hash($password, PASSWORD_BCRYPT), 'sub' => []];

    ftruncate($fp, 0);     // effacement du contenu
    fseek($fp, 0);
    fwrite($fp, json_encode($users_file));  
    fflush($fp);           // libère le contenu avant d'enlever le verrou
    flock($fp, LOCK_UN);
    fclose($fp);

    return ['access_token' => $new_token];
}
