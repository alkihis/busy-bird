<?php

function checkRequired() : array {
    if (isset($_GET['type'])) {
        return [$_GET['type']];
    }
    else {
        EndPointManager::error(5);
    }
}

// Souscrit l'utilisateur a un ou à plusieurs formulaires
function loadEndpoint(string $method) : array {
    if ($method !== 'GET') {
        EndPointManager::error(4);
    }

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    list($type) = checkRequired();

    // Vérification que le type est OK
    if (!preg_match("/^[a-z0-9_-]+$/i", $type)) {
        EndPointManager::error(7);
    }

    if (ENTRIES_STORAGE === MODE_FILES) {
        // Cherche le modèle "type"
        if (file_exists(FORMS_FILE_PATH . $type . ".json")) {
            return json_decode(file_get_contents(FORMS_FILE_PATH . $type . ".json"));
        }
        else {
            EndPointManager::error(28);
        }
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        // Cherche le modèle
        $link = SQLLink::get();

        if (!$link) {
            EndPointManager::error(3);
        }

        $stmt = $link->prepare("SELECT model FROM Models WHERE type=?");

        $stmt->bind_param("s", $type);

        if (!$stmt->execute()) {
            EndPointManager::error(3);
        }

        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            EndPointManager::error(28);
        }

        return json_decode($result->fetch_assoc()['model']);
    }
}
