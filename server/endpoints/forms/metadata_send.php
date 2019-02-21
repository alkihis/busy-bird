<?php

function checkRequired() : array {
    if (isset($_POST['id'], $_POST['filename'], $_POST['type'], $_POST['data'])) {
        return [$_POST['id'], $_POST['filename'], $_POST['type'], $_POST['data']];
    }
    else {
        EndPointManager::error(5);
    }
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
    
    if (!file_exists(UPLOAD_FILE_PATH . "$type/$id.json")) {
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
