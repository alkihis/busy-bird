<?php

function loadEndpoint(string $method) : array {
    if ($method !== 'GET') {
        EndPointManager::error(4);
    }

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    // Listage des formulaires disponibles
    $files = scandir(FORMS_FILE_PATH);

    if (!$files) {
        EndPointManager::error(3);
    }
    
    $forms = [];
    foreach ($files as $file) {
        if ($file === "." || $file === "..") {
            continue;
        }

        $name = str_replace('.json', '', basename($file));
        $forms[$name] = json_decode(file_get_contents(FORMS_FILE_PATH . '/' . $file), true);
    }

    return $forms;
}
