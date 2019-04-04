<?php

function loadEndpoint(string $method) : array {
    if ($method !== 'GET') {
        EndPointManager::error(4);
    }

    $user_obj = userLogger();

    if (!$user_obj) {
        EndPointManager::error(8);
    }

    $forms = [];

    if (ENTRIES_STORAGE === MODE_FILES) {
        // Listage des formulaires disponibles
        $files = scandir(FORMS_FILE_PATH);

        if (!$files) {
            EndPointManager::error(3);
        }

        foreach ($files as $file) {
            if ($file === "." || $file === "..") {
                continue;
            }

            $name = str_replace('.json', '', basename($file));
            $forms[$name] = json_decode(file_get_contents(FORMS_FILE_PATH . '/' . $file), true);
        }
    }
    else if (ENTRIES_STORAGE === MODE_SQL) {
        // Récupération de tous les formulaires dispo
        $models = getLastModels();

        if ($models) {
            foreach ($models as $model) {
                $forms[$model['type']] = json_decode($model['model'], true);
            }
        }
    }

    return $forms;
}
