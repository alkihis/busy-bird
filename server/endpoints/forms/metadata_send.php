<?php

function checkRequired() : array {
    if (isset($_POST['id'], $_POST['filename'], $_POST['type'], $_POST['data'])) {
        return [$_POST['id'], $_POST['filename'], $_POST['type'], $_POST['data']];
    }
    else {
        EndPointManager::error(5);
    }
}

function checkIfInMetadata(string $type, string $id, string $filename) : bool {
    if (!file_exists(UPLOAD_FILE_PATH . "$type/$id.json")) {
        EndPointManager::error(9);
    }
    
    $entry = json_decode(file_get_contents(UPLOAD_FILE_PATH . "$type/$id.json"), true);

    foreach ($entry['metadata'] as $m) {
        if ($m === $filename) {
            return true;
        }
    }

    return false;
}

function loadEndpoint(string $method) : array {
    if ($method !== 'POST') {
        EndPointManager::error(4);
    }

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    list($id, $name, $type, $data) = checkRequired();

    // Vérifie que le nom du fichier existe dans les métadonnées du JSON concerné
    if (!checkIfInMetadata($type, $id, $name)) {
        EndPointManager::error(9);
    }

    $path = FORM_DATA_FILE_PATH . $type;
    if (!file_exists($path)) {
        @mkdir($path);
    }

    $path .= "/$id";
    if (!file_exists($path)) {
        @mkdir($path);
    }

    $path .= "/$name";

    file_put_contents($path, base64_decode($data));
    
    return ['status' => true];
}
