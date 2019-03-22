<?php

function checkRequired() : array {
    if (isset($_POST['username'], $_POST['token'])) {
        return [$_POST['username'], $_POST['token']];
    }
    else {
        return [null, null];
    }
}

function loadEndpoint(string $method) : array {
    if ($method !== 'POST') {
        EndPointManager::error(4);
    }

    list($username, $sended_token) = checkRequired();

    if ($username) {
        list($token, $user_obj) = userLooker($username);

        if (!$token) {
            EndPointManager::error(16);
        }
        else if ($token !== $sended_token) {
            EndPointManager::error(15);
        }
        else {
            return ['access_token' => $token, 'subscriptions' => getListOfSubscriptions($user_obj->subscriptions)];
        }
    }
    else {
        return [];
    }
}
