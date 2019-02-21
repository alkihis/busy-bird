<?php

// Retourne les formulaires auquel l'utilisateur a souscrit
function loadEndpoint(string $method) : array {
    if ($method !== 'GET') {
        EndPointManager::error(4);
    }

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    return getListOfSubscriptions($user_obj->subscriptions);
}
