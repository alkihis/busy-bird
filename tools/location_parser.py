#!/usr/bin/env python3

import argparse;
import json;

parser = argparse.ArgumentParser(description='Stocke les informations de localisation contenues dans un TSV dans le JSON demandé.')
parser.add_argument('--json', dest='json', action='store', required=True,
                    help='Fichier de schéma de formulaire au format JSON')
parser.add_argument('--tsv', dest='tsv', action='store', required=True, help='Fichier séparé par des tabulations. Le séparateur DOIT être "\\t" et le fichier DOIT être encodé en UTF-8 !')
parser.add_argument('--id', dest='id_field', action='store', required=True, help='Nom de la colonne référençant l\'identifiant de l\'habitat')
parser.add_argument('--lat', dest='lat_field', action='store', required=True, help='Nom de la colonne référençant la latitude')
parser.add_argument('--long', dest='long_field', action='store', required=True, help='Nom de la colonne référençant la longitude')
parser.add_argument('--label', dest='label_field', help='Nom de la colonne référençant le texte complet de l\'emplacement. Si non précisé, le champ ID sera utilisé comme label.')

args = parser.parse_args()

print("")

def error(msg: str, warn: bool = False) -> None:
    print(f"Erreur: {msg}\n");

    if not warn:
        exit();


### DEBUT SCRIPT
try:
    tsv = open(args.tsv, "r");
    f_json = open(args.json, "r+");
except IOError:
    error("Impossible de lire les fichiers d'entrée TSV ou JSON.");

# Load JSON
p_json = json.load(f_json);

# Réinitialise les localisations
p_json["locations"] = {};

# Lecture de la première ligne du TSV pour voir si on trouve les colonnes voulues
num_id = None;
num_lat = None;
num_long = None;
num_label = None;

first_line = tsv.readline().strip().split('\t');

i = 0;
for colomn in first_line: 
    word: str;
    word = colomn.lower();

    if word == args.id_field.lower():
        num_id = i;
        if args.label_field == None:
            num_label = i;

    if word == args.lat_field.lower():
        num_lat = i;
    if word == args.long_field.lower():
        num_long = i;
    if args.label_field != None and word == args.label_field.lower():
        num_label = i;

    i += 1;


# Vérification que tous les nums sont définis
for var in (num_id, num_label, num_lat, num_long):
    if var == None:
        error("Un champ requis n'est pas défini dans le TSV. Vérifiez le nom des colonnes.");

line = tsv.readline().strip();
i = 2;
while line:
    # print (i)
    line = line.split('\t');
    # print(line[num_lat].replace(',', '.'), line[num_long].replace(',', '.'))
    
    try:
        p_json["locations"][line[num_id]] = {
            'label': line[num_label],
            'latitude': float(line[num_lat].replace(',', '.')),
            'longitude': float(line[num_long].replace(',', '.'))
        };
    except IndexError:
        error(f"La ligne {i} n'est pas conforme au schéma donné dans le header du TSV.");
    except ValueError:
        error(f"La ligne {i} contient une valeur invaide dans le champ latitude / longitude.");

    i += 1;
    try:
        line = tsv.readline().strip();
    except UnicodeDecodeError as e:
        error(f"La ligne {i} contient des caractères invalides. [Essayez de supprimer les guillemets \"] ({e})");

# i - 2: Enlever le header et la ligne vide finale
print("Nombres de lignes parsées: " + str(i-2) + ", nombres d'entrées de localisation dans le JSON: " + str(len(p_json["locations"])) + "\n");

# Save JSON
f_json.truncate(0);
f_json.seek(0);
json.dump(p_json, f_json);

