<?php

// Retourne les formulaires disponibles pour souscription
function loadEndpoint(string $method) : array {
    if ($method !== 'GET') {
        EndPointManager::error(4);
    }

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    $forms = getAvailableSubscriptions();

    // Recherche quel formulaire l'utilisateur a souscrit
    foreach ($forms as $key => &$f) {
        $f = [$f, in_array($key, $user_obj->subscriptions)];
    }

    return $forms;
}
