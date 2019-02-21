<?php

function deleteNotRelatableExistingMetadata(string $path, array $to_not_delete) : void {
    if (file_exists($path)) {
        $dir = scandir($path);

        foreach ($dir as $file) {
            if ($file !== '.' && $file !== '..') {
                if (!isset($to_not_delete[basename($file)])) {
                    unlink($path . basename($file));
                    // On supprime !
                }
            }
        }
    }
}

function checkRequired() : array {
    if (isset($_POST['id'], $_POST['form'])) {
        return [$_POST['id'], $_POST['form']];
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

    list($id, $str_form) = checkRequired();

    $json = @json_decode($str_form, true);

    if (!$json || !isset($json['type'], $json['metadata'])) {
        EndPointManager::error(14);
    }
    $type = $json['type'];

    if (!file_exists(UPLOAD_FILE_PATH . $type)) {
        @mkdir(UPLOAD_FILE_PATH . $type);
    }

    $path = UPLOAD_FILE_PATH . "$type/$id.json";

    if (file_exists($path)) {
        // Le formulaire existe déjà
        if (md5_file($path) === md5($str_form)) {
            return ['status' => true, 'send_metadata' => false];
        }
    }

    // On écrit le form
    file_put_contents($path, $str_form);

    $to_not_delete = [];
    $path = FORM_DATA_FILE_PATH . $type . "/$id/";

    // Vérification des métadonnées, demande celles à envoyer
    if (count($json['metadata']) > 0) {
        // Vérification si les métadonnées existent
        $to_send = [];

        $diff = false;
        foreach ($json['metadata'] as $key => $m) {
            if (!file_exists($path . "$m")) {
                $to_send[] = $key;
            }
            else {
                // Le fichier existe. On ne doit pas le supprimer
                // le nom du fichier est en clé
                $to_not_delete[$m] = true;
            }
        }

        if ($to_send) {
            deleteNotRelatableExistingMetadata($path, $to_not_delete);
            
            return ['status' => true, 'send_metadata' => $to_send];
        }
    }

    deleteNotRelatableExistingMetadata($path, $to_not_delete);
    
    // Il n'y a pas de métadonnées à envoyer
    return ['status' => true, 'send_metadata' => false];
}
