<?php

// Endpoint manager
class EndPointManager {
    static protected $page;

    // @var [int, string][]
    static protected $errors = [
        1 => [500, "Unable to fetch endpoint"],
        2 => [404, "Endpoint not found"],
        3 => [500, "Internal server error"],
        4 => [400, "Invalid HTTP method"],
        5 => [400, "Too few arguments"],
        6 => [403, "Invalid admin password"],
        7 => [400, "Username must be alphanumerical and must begin with a letter"],
        8 => [403, "You must be logged to do that"],
        9 => [400, "Referent form does not exists"],
        10 => [403, "User does not exists"],
        11 => [403, "Invalid credentials"],
        12 => [400, "User already exists"],
        13 => [400, "Password cant be empty"],
        14 => [400, "JSON is invalid"],
    ];

    public function __construct() {
        $request_without_query_string = explode('?', $_SERVER['REQUEST_URI'])[0];

        if ($request_without_query_string !== '/') {
            // Redirection par Apache, stockée dans cette variable
            // Possible par le .htaccess
            $page_arguments = explode('/', $request_without_query_string);
            $endpoint = $page_arguments[1];

            // Récupère les arguments après la page
            // Équivaut à $page_arguments[2:] en Python
            $page_arguments = array_slice($page_arguments, 2);
            if ($page_arguments) {
                // Si il y a un argument
                self::$page = str_replace('.json', '.php', $endpoint . '/' . $page_arguments[0]);
                self::$page = str_replace('../', '', self::$page);
            }
            else {
                self::httpError(400);
            }
        }
        else {
            self::httpError(404);
        }
    }

    static public function run() : void {
        header('Content-Type: application/json');

        try {
            if (file_exists('endpoints/' . self::$page)) {
                require_once 'endpoints/' . self::$page;

                echo json_encode(loadEndpoint($_SERVER['REQUEST_METHOD']));
            }
            else {
                self::error(2);
            }
        } catch (Throwable $e) {
            self::error(1);
        }
    }

    static public function designError(int $code, string $message, $additionnals = []) : array {
        $additionnals = (array)$additionnals;

        return array_merge(['error_code' => $code, 'message' => $message], $additionnals);
    }

    static public function error(int $code, $additionnals = []) : void {
        if (array_key_exists($code, self::$errors)) {
            self::httpError(self::$errors[$code][0], self::designError($code, self::$errors[$code][1], $additionnals));
        }
        else {
            self::error(3);
        }
    }

    static public function httpError(int $code, array $error_response = []) : void {
        http_response_code($code);
        if ($error_response)
            echo json_encode($error_response);

        die();
    }
}