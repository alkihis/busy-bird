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

    $path = UPLOAD_FILE_PATH . $type . '/';

    if (!file_exists($path)) {
        return [];
    }

    // Listage des formulaires disponibles
    $files = scandir($path);

    if (!$files) {
        EndPointManager::error(3);
    }

    $forms = [];
    foreach ($files as $file) {
        if ($file === "." || $file === "..") {
            continue;
        }

        $forms[] = str_replace('.json', '', basename($file));
    }

    return $forms;
}
