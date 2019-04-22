<?php

// Make an user administrator

function checkRequired() : array {
    if (isset($_POST['old'], $_POST['new'])) {
        return [$_POST['old'], $_POST['new']];
    }
    else {
        EndPointManager::error(5);
    }
}

function loadEndpoint(string $method) : void {
    if ($method !== 'POST') {
        EndPointManager::error(4);
    }

    list($old, $new) = checkRequired();

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    // Vérification si old password == stocké
    if (!password_verify($old, $user_obj->password)) {
        EndPointManager::error(11);
    }

    // Modification du mot de passe
    $user_obj->password = password_hash($new, PASSWORD_DEFAULT);

    updateUser($user_obj);
}
