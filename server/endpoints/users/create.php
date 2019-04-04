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

    // teste si l'utilisateur existe déjà
    if (User::get($username)) {
        EndPointManager::error(12);
    }

    return ['access_token' => User::newUser($username, $password)];
}
