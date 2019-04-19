<?php

function checkRequired() : array {
    if (isset($_POST['command'])) {
        return [$_POST['command']];
    }
    else {
        EndPointManager::error(5);
    }
}

function checkIfInMetadata(string $type, string $id, string $filename) : bool {
    $entry = getEntry($type, null, $id);

    if (!$entry) {
        EndPointManager::error(9);
    }

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

    list($command) = checkRequired();

    if ($command === "INIT") {
        return initCommand($user_obj);
    }
    else if ($command === "APPEND") {
        return appendCommand($user_obj);
    }
    else if ($command === "FINALIZE") {
        return finishCommand($user_obj);
    }
    else {
        EndPointManager::error(18);
    }
}

function initCommand(User $user_obj) {
    // Récupération de nom, form id, form type et taille du fichier à envoyer
    if (isset($_POST['type'], $_POST['filename'], $_POST['size'], $_POST['id'])) {
        list($type, $name, $size, $id) = [$_POST['type'], $_POST['filename'], $_POST['size'], $_POST['id']];
    }
    else {
        EndPointManager::error(5);
    }

    // Vérifie que le nom du fichier existe dans les métadonnées du JSON concerné
    if (!checkIfInMetadata($type, $id, $name)) {
        EndPointManager::error(9);
    }

    // Création des parties
    do {
        $media_id = random_int(1, PHP_INT_MAX);

        $path = FORM_DATA_FILE_PATH . "__parts__/$media_id";
    } while (file_exists($path));
    
    @mkdir($path, 0777, true);

    // Création du fichier contenant les infos de ce média
    // Deux heures pour envoyer le fichier
    $infos = [ "filename" => $name, "form_type" => $type, "total_size" => (int)$size, "form_id" => $id, "owner" => $user_obj->username, "expiration" => time() + (60 * 120) ];
    $infos_str = json_encode($infos);

    file_put_contents($path . "/infos.json", $infos_str);

    return ['media_id' => $media_id, 'media_id_str' => (string)$media_id];
}

function appendCommand(User $user_obj) {
    if (isset($_POST['media_id'], $_POST['segment_index'], $_POST['data'])) {
        list($media_id, $index, $data) = [$_POST['media_id'], $_POST['segment_index'], $_POST['data']];
    }
    else {
        EndPointManager::error(5);
    }

    $path = FORM_DATA_FILE_PATH . "__parts__/$media_id";

    if (!file_exists($path)) {
        EndPointManager::error(19);
    }

    $infos = json_decode(file_get_contents($path . "/infos.json"));

    if ($infos->expiration < time()) {
        deleteParts($media_id);
        EndPointManager::error(26);
    }

    if ($infos->owner !== $user_obj->username) {
        EndPointManager::error(23);
    }

    $data_bin = base64_decode($data);
    if (strlen($data_bin) > $infos->total_size) {
        EndPointManager::error(20);
    }
    else if (strlen($data_bin) > 5 * 1024 * 1024) {
        // Supérieur à 5 Mo
        EndPointManager::error(22);
    }

    $index = (int)$index;

    if ($index < 0 || $index > 999) {
        EndPointManager::error(21);
    }

    // Écriture de la partie
    $path_file = $path . "/$index.bin";

    $handle = fopen($path_file, "wb");
    fwrite($handle, $data_bin);
    fclose($handle);

    return ['status' => true];
}

function finishCommand(User $user_obj) {
    if (isset($_POST['media_id'])) {
        list($media_id) = [$_POST['media_id']];
    }
    else {
        EndPointManager::error(5);
    }

    $path = FORM_DATA_FILE_PATH . "__parts__/$media_id";

    if (!file_exists($path)) {
        EndPointManager::error(19);
    }

    $infos = json_decode(file_get_contents($path . "/infos.json"));

    if ($infos->expiration < time()) {
        deleteParts($media_id);
        EndPointManager::error(26);
    }

    if ($infos->owner !== $user_obj->username) {
        EndPointManager::error(23);
    }

    // Assemblage des parties
    $files_bin = glob($path . "/*.bin");

    usort($files_bin, function($a, $b) {
        $b_a = (int)(explode('.bin', basename($a))[0]);
        $b_b = (int)(explode('.bin', basename($b))[0]);

        return $b_a - $b_b;
    });

    // Regarde si aucune partie ne manque
    $total_size = 0;
    $last = 0;
    foreach ($files_bin as $file) {
        $basename = (int)(explode('.bin', basename($file))[0]);
        if ($basename !== $last) {
            EndPointManager::error(24);
        } 
        $last++;

        $total_size += filesize($file);
    }

    // Regarde si la taille correspond avec ce qui a été annoncé
    if ($total_size < $infos->total_size - 1000 || $total_size > $infos->total_size + 1000) {
        EndPointManager::error(25);
    }

    // Création du fichier définitif !
    $type = $infos->form_type;
    $id = $infos->form_id;
    $filename = $infos->filename;


    $finalpath = FORM_DATA_FILE_PATH . "$type/$id";
    if (!file_exists($finalpath)) {
        @mkdir($finalpath, 0777, true);
    }

    $finalpath .= "/$filename";

    // Ecriture des parties dans un seul et même fichier
    $handle = fopen($finalpath, "wb");

    foreach ($files_bin as $file) {
        fwrite($handle, file_get_contents($file));
    }

    fclose($handle);

    // Suppression des parties
    deleteParts($media_id);

    return ['status' => true];
}
