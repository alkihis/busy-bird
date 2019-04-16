<?php

require 'cst.php';
require 'helpers.php';

$path = FORM_DATA_FILE_PATH . "__parts__";

$objects = scandir($path);

// Supprime toutes les parties expirées
foreach ($objects as $object) {
    if ($object != "." && $object != "..") {
        if (filetype($dir . "/" . $object) == "dir") {
            // lecture du fichier infos
            if (file_exists($dir . "/" . $object . "/infos.json")) {
                $infos = json_decode(file_get_contents($dir . "/" . $object . "/infos.json"));

                if ($infos->expiration < time()) {
                    deleteParts($media_id);
                }
            }
            else {
                deleteParts($media_id);
            }
        } 
    }
}
