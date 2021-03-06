<?php

function checkRequired() : array {
    if (isset($_GET['type'])) {
        return [$_GET['type']];
    }
    else {
        EndPointManager::error(5);
    }
}

function loadEndpoint(string $method) : array {
    if ($method !== 'GET') {
        EndPointManager::error(4);
    }

    $user_obj = userLogger();
    list($type) = checkRequired();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    $forms = [];

    if (ENTRIES_STORAGE === MODE_FILES) {
        $path = UPLOAD_FILE_PATH . $type . '/';

        if (!file_exists($path)) {
            return [];
        }
    
        // Listage des formulaires disponibles
        $files = scandir($path);
    
        if (!$files) {
            EndPointManager::error(3);
        }
    
        foreach ($files as $file) {
            if ($file === "." || $file === "..") {
                continue;
            }
    
            $name = str_replace('.json', '', basename($file));
            $forms[$name] = true;
        }
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        $entries = getSendedForms();

        foreach ($entries as $e) {
            $forms[$e['uuid']] = true;
        }
    }

    return $forms;

    // if (!isset($_GET['id'])) {
        
    // }
    // else {
    //     // Récupération du formulaire id avec ses métadonnées, au format ZIP

    //     // TODO dans forms/id.json
    // }
}
