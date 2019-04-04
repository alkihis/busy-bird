-- Prototype proposé pour gérer des entrées avec une base SQL plutôt qu'avec des fichiers (versionning possible)
DROP DATABASE IF EXISTS busybird;
CREATE DATABASE busybird;

USE busybird;

CREATE TABLE Users(
    id_u INT NOT NULL AUTO_INCREMENT, -- Identifiant unique
    name VARCHAR(32) NOT NULL, -- Nom d'utilisateur
    token VARCHAR(255) NOT NULL, -- Token d'accès à l'application
    password VARCHAR(255) NOT NULL, -- Mot de passe (hashé)
    status INT NOT NULL DEFAULT 0, -- Statut : 0 utilisateur, 1 admin, par exemple
    PRIMARY KEY (id_u)
);

CREATE TABLE Entries (
    id_e INT NOT NULL AUTO_INCREMENT, -- Identifiant unique
    uuid VARCHAR(32) NOT NULL, -- Identifiant "unique" généré par l'application (utilisé pour reconnaître les versions)
    type VARCHAR(255) NOT NULL, -- Type de formulaire
    entry MEDIUMTEXT NOT NULL, -- Entrée, au format JSON
    id_field TEXT, -- Optionnel: Identifiant relatif au "id_field" du formulaire. Utilisé pour des recherches plus rapides
    date_e DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Date d'envoi
    owner INT NOT NULL, -- Personne ayant envoyé ce modèle
    PRIMARY KEY (id_e),
    FOREIGN KEY Entries(owner) REFERENCES Users(id_u) ON DELETE CASCADE
);

CREATE TABLE Files(
    id_f INT NOT NULL AUTO_INCREMENT, -- Identifiant unique
    uuid VARCHAR(32) NOT NULL, -- Identifant UUID liant une entrée
    filename VARCHAR(255) NOT NULL, -- Nom du fichier relié
    PRIMARY KEY (id_f)
);

CREATE TABLE EntriesFiles(
    id_f INT NOT NULL, -- Identifiant du fichier visé
    id_e INT NOT NULL, -- Identifiant relié au fichier    
    FOREIGN KEY (id_f) REFERENCES Files(id_f) ON DELETE CASCADE,
    FOREIGN KEY (id_e) REFERENCES Entries(id_e) ON DELETE CASCADE
);

CREATE TABLE UsersSubs(
    id_s INT NOT NULL AUTO_INCREMENT, -- Identifiant unique
    id_u INT NOT NULL, -- Identifant de l'utilisateur ayant souscrit
    type VARCHAR(255) NOT NULL, -- Type de formulaire souscrit; PAS de foreign key: type est non-unique. 
    -- Il réfère à la version la plus récente de type dans Models.
    PRIMARY KEY (id_s),
    FOREIGN KEY (id_u) REFERENCES Users(id_u) ON DELETE CASCADE
);

CREATE TABLE Models(
    id_m INT NOT NULL AUTO_INCREMENT, -- Identifiant unique
    type VARCHAR(255) NOT NULL, -- Nom formel du modèle
    label VARCHAR(255) NOT NULL, -- Nom affiché du modèle
    model MEDIUMTEXT NOT NULL, -- Contenu du modèle (format JSON) > 
    -- Flemme de faire des tables pour les modèles. Pas d'utilité de faire des recherches dans un modèle. >> JSON
    model_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Permet de faire du versionning de modèle
    PRIMARY KEY (id_m)
);
