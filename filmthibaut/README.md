# Films de Thibaut

Version actuelle : `index.html` utilise `filmthibaut-son-nettoye-v3.mp4`. La réduction supplémentaire appliquée à la naissance est désormais étendue à tout le film en repartant de la même base audio. Les versions précédentes sont conservées. L’en-tête utilise une étiquette encadrée portant « Les souvenirs de Thibaut », « Archive de famille » et « 1981 — 2001 ». Vérifications : `analysis/all-denoise-report.json` et `analysis/all-denoise-verification.json`. Pour publier la version actuelle, transférer ce MP4 v3, les fichiers HTML/JS/CSS actuels et les vignettes.

Page autonome destinée à être intégrée au site Orbytek. Présentation « Au fil des années » : fond crème, onglets par année et chronologie verticale avec années, photos et titres. Les onglets masquent les chapitres précédant la première séquence de l’année choisie et conservent les souvenirs suivants. L’onglet Sans date affiche les séquences non datées. Une vignette lance le passage et ramène au lecteur. Les 13 chapitres importés et le texte complet du remerciement sont conservés. La vidéo originale est conservée. Le lecteur utilise `filmthibaut-son-nettoye.mp4`, une copie avec le volume corrigé et une réduction modérée du bruit de fond. Les images sont copiées sans réencodage et les chapitres gardent leurs positions.

## Prévisualiser

Depuis ce dossier, exécuter `node server.cjs`, puis ouvrir http://127.0.0.1:8080. Le serveur gère les requêtes partielles nécessaires à la navigation dans une longue vidéo.

Les boutons **−5 s** et **+5 s** permettent de naviguer par pas de cinq secondes, en conservant l’état lecture/pause.

## Son corrigé

Le niveau intégré mesuré passe d’environ −37,73 à −17,99 LUFS avant l’encodage AAC de la première version. La normalisation en deux passes limite les crêtes à −1,5 dBTP. Le son est encodé en AAC à 192 kb/s et 48 kHz. Le fichier source `filmthibaut.mp4` reste intact. Les rapports de cette étape sont dans `analysis/audio-report.json` et `analysis/audio-verification.json`.

La version `filmthibaut-son-nettoye.mp4` applique ensuite une réduction spectrale adaptative modérée (réduction demandée : 9 dB), un filtre passe-haut à 60 Hz, un passe-bas à 10 kHz et une limitation des crêtes. Les essais sur six extraits montrent une baisse d’environ 0,9 à 3,6 dB du niveau des fenêtres les plus calmes ; ces fenêtres peuvent contenir des voix et ne constituent pas une mesure de bruit isolé. Le traitement ne garantit pas la disparition de tout grésillement ni une absence totale d’effet sur les voix.

Le lecteur utilise directement le son nettoyé, sans sélecteur de version audio. La copie avec le volume corrigé seul reste conservée dans le projet. Les données vidéo sont identiques à celles de l’original. Sur trois extraits, la corrélation des pistes mesure un retard de traitement de 25 ms (moins d’une image à 25 images/s). Le pic audio décodé est de −1,4 dBFS. Voir `analysis/denoise-report.json`, `analysis/noise-excerpts.json` et `analysis/denoise-verification.json`.

## Identifier les anniversaires

Le menu contient 19 séquences regroupées après inspection d’images de la vidéo, puis vérification des transitions au voisinage des limites. Les dates sont celles incrustées par la caméra. Les journées sans date, la maternité et le séjour à Disneyland restent partiellement incertains. La vidéo dure 3 h 43 min 21 s. Voir analysis/chapitres.md pour le relevé.

Cliquer sur **Modifier les chapitres**. Se déplacer dans le film, saisir le nom de l’événement et cliquer sur **Ajouter au temps actuel**. Supprimer les repères inutiles. Les modifications sont enregistrées dans le navigateur uniquement.

Cliquer sur **Exporter les chapitres**, puis remplacer le fichier `chapters.js` par le fichier téléchargé. Ce fichier diffuse les chapitres à tous les visiteurs. L’import accepte aussi un tableau JSON de la forme `[{"time":0,"title":"Le début"}]` ; l’export produit directement le fichier JavaScript destiné au site. Les données locales du navigateur ont priorité sur le fichier publié ; pour voir ce dernier, effacer la clé `orbytek-thibaut-chapters-v1` du stockage local ou utiliser un autre navigateur.

## Intégrer à Orbytek

Déposer `index.html`, `pellicule.css`, `app.js`, `chapters.js`, le dossier `thumbnails/`, `filmthibaut-son-nettoye.mp4` et `filmthibaut-son-ameliore.mp4` dans un même dossier de l’hébergement, par exemple `/souvenirs/`. L’original et les outils d’analyse ne sont pas nécessaires à la publication. Ouvrir ensuite `/souvenirs/` ou intégrer cette adresse dans une iframe avec un titre et l’autorisation plein écran. Aucun framework ni compilation nécessaires. Les polices Google sont facultatives : des polices de remplacement sont prévues.

L’hébergement doit accepter le fichier d’environ 2,5 Go, servir les MP4 avec `Content-Type: video/mp4` et prendre en charge les requêtes HTTP Range (réponse 206). Les 19 vignettes sont des fichiers JPEG extraits du film. Elles s’affichent sans décoder la vidéo. Seuls les nouveaux chapitres ajoutés par l’éditeur génèrent leur vignette dans le navigateur. Le film et le menu ne sont pas publiés par la création de ces fichiers : ils doivent être transférés sur l’hébergement Orbytek.

Cette page ne comporte pas d’authentification. Pour réserver les souvenirs à la famille, utiliser le contrôle d’accès de l’hébergement.


## Réduction supplémentaire sur la naissance

Le lecteur utilise désormais filmthibaut-son-nettoye-v2.mp4. Une réduction supplémentaire du bruit est appliquée uniquement entre 32 min 22 s et 40 min 28 s (naissance de Thibaut). La copie précédente est conservée. Les extraits calmes mesurés baissent encore de 3 à 4 dB ; cette mesure inclut les sons faibles éventuels et ne représente pas du bruit isolé. Images copiées sans réencodage, timings conservés. Rapports : analysis/birth-denoise-report.json et analysis/birth-denoise-verification.json. Pour publier la version actuelle, transférer le fichier v2 et index.html.
