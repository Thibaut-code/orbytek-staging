# Liseuse Albert

La page `404.html` à la racine du site redirige les variantes de casse du chemin `/BD/albert/` (y compris sans barre finale et avec `index.html`) vers l’adresse canonique. Les autres adresses introuvables conservent une page 404. Cette redirection utilise JavaScript, comme le déverrouillage de la liseuse.

Le dossier `publication` est le contenu à publier sous `/BD/albert/` sur orbytek.be. Il contient uniquement le lecteur et les fichiers chiffrés. Ne pas publier ce dossier de travail complet ni les originaux PNG.

Les 51 pages proviennent du dossier imprimeur du 24 octobre 2026, dans le même ordre. Les planches 19 et 37 absentes de cette édition n’ont pas été ajoutées. La planche 44 utilise la v3 disponible.

Protection : PBKDF2-SHA256 (600 000 itérations, sel aléatoire) et AES-256-GCM avec nonce distinct par fichier. Aucun mot de passe ni clé n’est enregistré dans la publication. Les images, le catalogue et le PDF sont chiffrés. Le navigateur nécessite HTTPS (ou localhost pour les essais). Seule la progression est conservée dans localStorage. Fermer l’album efface la clé du contexte de lecture.

Le mot de passe partagé choisi étant un mot courant, cette protection ne remplace pas une authentification serveur avec limitation des tentatives : un téléchargement des fichiers chiffrés permet des essais hors ligne. Les lecteurs autorisés peuvent enregistrer les pages et le PDF déchiffrés.

Le PDF de lecture est une copie allégée d’environ 30 Mo générée à partir des pages web. Le PDF original d’impression reste inchangé dans le dossier imprimeur.

Pour actualiser : exécuter `prepare.py` avec Pillow, puis `encrypt.cjs` en fournissant le mot de passe sur stdin. Publier tous les fichiers ensemble et invalider les anciennes copies du cache. Ne pas publier les fichiers temporaires. Le PDF est volumineux et n’est téléchargé qu’à la demande.
