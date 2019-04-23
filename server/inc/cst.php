<?php

// FICHIER DE CONSTANTES
define('ROOT', $_SERVER['DOCUMENT_ROOT'] . '/');

// Utilisé si MODE_FILES
const USERS_FILE_PATH = "inc/users.json";
const FORMS_FILE_PATH = "inc/models/";
const UPLOAD_FILE_PATH = "inc/forms/";

// Utilisé si MODE_SQL
const SQL_USER = "root";
const SQL_PASSWORD = "password";
const SQL_ADDRESS = "localhost";
const SQL_DATABASE = "busybird";

const MODE_SQL = 0;
const MODE_FILES = 1;

const ENTRIES_STORAGE = MODE_FILES;

// Où stocker les fichiers joints aux formulaires
const FORM_DATA_FILE_PATH = "inc/form_data/";

// Où stocker le fichier de cleanup
const TIMESTAMP_FILE_PATH = "inc/date.timestamp";
const TIME_BEFORE_CLEANUP = 86400; // en secondes (un jour ici)

// Supprimer les vieux fichiers si ils ne correspondent pas à la dernière version de l'entrée
const DELETE_OUTDATED_METADATA = ENTRIES_STORAGE === MODE_FILES;

const ADMIN_PASSWORD_AUTH = "Busybird";

// Niveaux d'autorisation
const BASIC_USER = 0;
const ADMIN_USER = 1;
const DEFAULT_USER_LEVEL = BASIC_USER;
