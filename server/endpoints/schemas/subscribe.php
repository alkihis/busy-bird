<?php

function checkRequired() : array {
    if (isset($_POST['ids'])) {
        return [$_POST['ids']];
    }
    else {
        EndPointManager::error(5);
    }
}

// Souscrit l'utilisateur a un ou à plusieurs formulaires
function loadEndpoint(string $method) : ?array {
    if ($method !== 'POST') {
        EndPointManager::error(4);
    }

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    list($ids) = checkRequired();

    $ids = explode(',', $ids);

    $user_obj->subscriptions = refreshSubs($user_obj->subscriptions, $ids, true);

    // Sauvegarde l'utilisateur
    updateUser($user_obj);

    if (isset($_POST['trim_subs']) && isActive($_POST['trim_subs'])) {
        return null;
    }
    
    return getListOfSubscriptions($user_obj->subscriptions);
}
