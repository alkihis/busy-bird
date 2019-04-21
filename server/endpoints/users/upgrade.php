<?php

// Make an user administrator

function checkRequired() : array {
    if (isset($_POST['username'], $_POST['status'])) {
        return [$_POST['username'], $_POST['status']];
    }
    else {
        EndPointManager::error(5);
    }
}

function loadEndpoint(string $method) : void {
    if ($method !== 'POST') {
        EndPointManager::error(4);
    }

    list($username, $status) = checkRequired();

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    // Check si l'user est admin
    if ($user_obj->status < ADMIN_USER && !isset($_POST['admin_password'])) {
        EndPointManager::error(17);
    }
    else if ($user_obj->status < ADMIN_USER) {
        // Vérification du mot de passe
        $psw = $_POST['admin_password'];
        if ($psw !== ADMIN_PASSWORD_AUTH) {
            EndPointManager::error(17);
        }
    }

    // Check si l'user existe
    $user_to_change = User::get($username);

    if (!$user_to_change) {
        EndPointManager::error(10);
    }

    // Met à jour l'utilisateur
    if ($status === "admin") {
        $user_to_change->status = ADMIN_USER;
    }
    else if ($status === "basic") {
        $user_to_change->status = BASIC_USER;
    }
    else {
        EndPointManager::error(27);
    }

    updateUser($user_to_change);
}
