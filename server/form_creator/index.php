<html>

<head>
    <!--Import Google Icon Font-->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <!--Import materialize.css-->
    <link type="text/css" rel="stylesheet" href="css/materialize.min.css" media="screen,projection" />
    <link type="text/css" rel="stylesheet" href="css/perso.css" media="screen,projection" />

    <!--Let browser know website is optimized for mobile-->
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body>
    <main>
        <div id="main_block" class="container">
            <h1>Créateur de formulaire</h1>
            <p class="flow-text">
                Insérer les champs souhaités avec le sélecteur de champ, puis exportez votre formulaire
                grâce au bouton en bas de page.
            </p>

            <ul class="collection" id="form_collection"></ul>

            <div id="new_item"></div>

            <div class="divider divider-margin"></div>
            
            <h4>Charger localisations</h4>
            <p>
                Importer des localisations depuis un fichier TSV.
            </p>
            <div class="file-field input-field">
                <div class="btn">
                    <span>Localisations TSV</span>
                    <input type="file" id="__tsv_file_input">
                </div>
                <div class="file-path-wrapper">
                    <input class="file-path validate" type="text">
                </div>
            </div>
            <div class="clearb"></div>

            <div class="divider divider-margin"></div>

            <!-- File input for file loading -->
            <h4>Charger formulaire existant</h4>
            <p>
                Charger un formulaire écrasera vos précédentes modifications sur la page active.
            </p>
            <p id="__newfile_info"></p>

            <div class="file-field input-field">
                <div class="btn">
                    <span>Formulaire JSON</span>
                    <input type="file" id="__newfile_input" accept="application/json">
                </div>
                <div class="file-path-wrapper">
                    <input class="file-path validate" type="text">
                </div>
            </div>
            <div class="clearb"></div>

            <div class="divider divider-margin"></div>

            <div class="row right-align">
                <button class="btn blue" id="__export_form_btn">Exporter le formulaire</button>
            </div>
        </div>
        <div class="row no-margin-bottom">
            <div class="modal" id="modal_placeholder"></div>
            <div class="modal bottom-sheet" id="bottom_modal_placeholder"></div>
        </div>
    </main>

    <footer class="page-footer">
        <div class="footer-copyright">
            <div class="container">
                LBBE - Busy Bird
            </div>
        </div>
    </footer>

    <script src="js/jquery.min.js"></script>
    <script src="js/materialize.min.js"></script>
    <script src="js/Sortable.min.js"></script>
    <script src="js/helpers.js"></script>
    <script src="js/elements.js"></script>
    <script src="js/export.js"></script>
    <script src="js/form.js"></script>
</body>

</html> 