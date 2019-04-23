<?php

function checkRequired() : array {
    if (isset($_POST['type'], $_POST['model'])) {
        return [$_POST['type'], $_POST['model']];
    }
    else {
        EndPointManager::error(5);
    }
}

// Souscrit l'utilisateur a un ou à plusieurs formulaires
function loadEndpoint(string $method) : void {
    if ($method !== 'POST') {
        EndPointManager::error(4);
    }

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    // Insérer ici des vérifications de statut

    list($type, $model_str) = checkRequired();

    // Vérification que le type est OK
    if (!preg_match("/^[a-z0-9_-]+$/i", $type)) {
        EndPointManager::error(7);
    }

    // Vérification qu'on a les droits
    if ($user_obj->status < ADMIN_USER) {
        EndPointManager::error(17);
    }

    // Lecture du modèle
    $model_obj = @json_decode($model_str, true);

    if (!$model_obj || !isset($model_obj['name'], $model_obj['fields'], $model_obj['locations'])) {
        EndPointManager::error(14);
    }

    if (ENTRIES_STORAGE === MODE_FILES) {
        // Ecrase ou crée le model $type
        file_put_contents(FORMS_FILE_PATH . $type . ".json", $model_str);
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        // Insère un nouveau modèle
        $link = SQLLink::get();

        if (!$link) {
            EndPointManager::error(3);
        }

        $stmt = $link->prepare("INSERT INTO Models (type, label, model) VALUES (?, ?, ?)");

        $stmt->bind_param("sss", $type, $model_obj['name'], $model_str);

        if (!$stmt->execute()) {
            EndPointManager::error(3);
        }
    }
}
