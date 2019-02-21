<?php

function checkRequired() : array {
    if (isset($_POST['username'], $_POST['password'])) {
        return [$_POST['username'], $_POST['password']];
    }
    else {
        EndPointManager::error(5);
    }
}

function loadEndpoint(string $method) : array {
    if ($method !== 'POST') {
        EndPointManager::error(4);
    }

    list($username, $password) = checkRequired();

    list($token, $user_obj) = userLooker($username);

    if (!$token) {
        EndPointManager::error(10);
    }

    if (password_verify($password, $user_obj->password)) {
        return ['access_token' => $token, 'subscriptions' => getListOfSubscriptions($user_obj->subscriptions)];
    }
    else {
        EndPointManager::error(11);
    }
}
