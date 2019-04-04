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
    unset($str_form);

    if (!$json || !isset($json['type'], $json['metadata'])) {
        EndPointManager::error(14);
    }
    $type = $json['type'];

    // Vérification du JSON. Par sécurité, copie les champs
    $new_json = ['fields' => [], 'type' => $type, 'metadata' => [], 'location' => $json['location'], 'owner' => $json['owner']];
    
    // Obtient le schéma
    $schema = getSchema($type);

    if (!$schema) {
        EndPointManager::error(14);
    }

    // Construit le JSON
    foreach ($schema['fields'] as $field) {
        $id_fieldkey = $field['name'];

        if (array_key_exists($id_fieldkey, $json['fields'])) {
            $new_json['fields'][$id_fieldkey] = $json['fields'][$id_fieldkey];
        }
        if (array_key_exists($id_fieldkey, $json['metadata'])) {
            $new_json['metadata'][$id_fieldkey] = $json['metadata'][$id_fieldkey];
        }
    }

    $new_json_str = json_encode($new_json);

    if (ENTRIES_STORAGE === MODE_FILES) {
        if (!file_exists(UPLOAD_FILE_PATH . $type)) {
            @mkdir(UPLOAD_FILE_PATH . $type);
        }

        $path = UPLOAD_FILE_PATH . "$type/$id.json";

        // On écrit le form
        file_put_contents($path, $new_json_str);
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        // Insère l'entrée dans la base SQL
        $link = SQLLink::get();

        if (!$link) {
            EndPointManager::error(3);
        }
        
        $stmt = $link->prepare("INSERT INTO Entries (uuid, type, entry, id_field, owner) VALUES (?, ?, ?, ?, ?)");

        $id_field = isset($schema['id_field']) ? $new_json['fields'][$schema['id_field']] ?? null : null;

        $stmt->bind_param("ssssi", $id, $type, $new_json_str, $id_field, $user_obj->id);

        if (!$stmt->execute()) {
            EndPointManager::error(3);
        }

        $id_sql_entry = $link->insert_id;

        // Insère les fichiers à envoyer dans la table (même si ils ne le sont pas encore)
        foreach ($json['metadata'] as $filename) {
            $stmt = $link->prepare("SELECT id_f FROM Files WHERE uuid=? AND filename=?");
            $stmt->bind_param("ss", $id, $filename);
            
            if (!$stmt->execute()) {
                EndPointManager::error(3);
            }

            $res = $stmt->get_result();

            if ($res->num_rows) {
                $file_id = $res->fetch_assoc()['id_f'];
            }
            else {
                // On doit insérer la liaison
                $stmt = $link->prepare("INSERT INTO Files (uuid, filename) VALUES (?, ?)");
                $stmt->bind_param("ss", $id, $filename);
                $stmt->execute();

                $file_id = $link->insert_id;
            }

            // Insertion de la liaison
            $stmt = $link->prepare("INSERT INTO EntriesFiles (id_f, id_e) VALUES (?, ?)");
            $stmt->bind_param("ii", $file_id, $id_sql_entry);
            $stmt->execute();
        }
    }

    $to_not_delete = [];
    $path = FORM_DATA_FILE_PATH . $type . "/$id/";

    // Vérification des métadonnées, demande celles à envoyer
    if (count($json['metadata']) > 0) {
        // Vérification si les métadonnées existent
        $to_send = [];

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
            if (DELETE_OUTDATED_METADATA) {
                deleteNotRelatableExistingMetadata($path, $to_not_delete);
            }
            
            return ['status' => true, 'send_metadata' => $to_send];
        }
    }

    if (DELETE_OUTDATED_METADATA) {
        deleteNotRelatableExistingMetadata($path, $to_not_delete);
    }
    
    // Il n'y a pas de métadonnées à envoyer
    return ['status' => true, 'send_metadata' => false];
}
