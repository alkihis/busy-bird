<?php

// PAGE DE BASE DE L'API
// TRAITE LES REQUETES ENTRANTES

ini_set('display_errors', '1');

require_once 'inc/cst.php';
require_once 'inc/helpers.php';
require_once 'endpoints/manager.php';

$manager = new EndPointManager;

if ($_SERVER['REQUEST_METHOD'] === "OPTIONS") {
    // Si c'est une requête CORS
    return;
}

EndPointManager::run();
