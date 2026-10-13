# AutoPrime — stock Supabase

Site statique compatible GitHub Pages et avec un sous-dossier `/voiture/`.
L’administration est accessible via `admin.html`. Les liens et fichiers locaux sont relatifs.

## Activation (une seule fois)

1. Dans le projet Supabase lié à `supabase-config.js`, ouvrir **SQL Editor**, coller le contenu de `supabase/setup.sql` et l’exécuter. Ce script crée les tables `voitures`, `vehicle_admins`, `vehicle_photo_cleanup`, les fonctions et le bucket public `vehicle-photos`. Il ne migre pas une éventuelle table existante d’un autre schéma : vérifier les noms avant exécution.
2. Dans **Authentication → Users → Add user**, créer le compte du propriétaire avec email et mot de passe (compte confirmé). Désactiver l’inscription publique si elle n’est pas utile aux autres applications du projet.
3. Dans SQL Editor, autoriser ce compte en remplaçant l’email :

   ```sql
   insert into public.vehicle_admins(user_id)
   select id from auth.users where email = 'proprietaire@exemple.be'
   on conflict (user_id) do nothing;
   ```

   Vérifier que le compte figure dans `vehicle_admins`. Un utilisateur connecté sans cette autorisation ne peut modifier ni le stock ni les fichiers. Seul SQL Editor / un accès serveur privilégié peut ajouter un administrateur.
4. Publier les fichiers du site sur GitHub Pages suivant le déploiement habituel. Puis ouvrir `https://orbytek.be/voiture/admin.html` pour se connecter et ajouter la première voiture.

La clé de `supabase-config.js` est publique (publishable / anon). **Ne jamais y placer de clé secret / service_role.** Les droits sont imposés par Supabase, pas par la visibilité des boutons. Utiliser un projet dont les tables et le bucket n’ont pas d’autres policies permissives : PostgreSQL combine les policies permissives avec OR. Le script remplace uniquement ses propres policies.

## Utilisation

- Ajouter ou modifier une voiture avec le formulaire ; enregistrer pour publier.
- Choisir jusqu’à 10 photos JPG, PNG ou WebP, jusqu’à 25 Mo par fichier original. Les fichiers HEIC doivent être exportés en JPG.
- Les flèches des miniatures changent l’ordre. La première image est la photo du catalogue.
- Retirer une photo puis enregistrer ; marquer vendue ou supprimer une voiture depuis la liste.
- Les visiteurs voient les changements à la prochaine consultation / actualisation.

## Photos et performances

- Traitement dans le navigateur, séquentiel pour limiter la mémoire.
- Galerie : WebP de 1 600 px maximum sur le côté le plus long, objectif ≤ 400 Kio.
- Miniature : WebP de 600 px maximum, objectif ≤ 100 Kio.
- Qualité puis dimensions réduites si nécessaire ; rejet si le résultat dépasse 1 Mio. Le bucket refuse les autres MIME et les fichiers > 1 Mio.
- Pas de stockage des originaux. Les tables contiennent uniquement les chemins, dimensions et informations des voitures.
- Noms de fichiers uniques, cache de 1 an. Une nouvelle photo obtient une nouvelle URL.
- Catalogue par lots de 12 avec filtres côté base, images différées, grandes images seulement à l’ouverture de la galerie.

Les photos et fiches sont publiques. Ne pas importer de documents privés dans ce bucket. Les limites de quantité et les chemins des photos sont aussi validés côté base. La taille d’entrée et le redimensionnement sont vérifiés par l’interface ; un administrateur peut contourner l’interface, mais les limites du bucket restent appliquées.

## Nettoyage

Chaque envoi est inscrit avant upload dans `vehicle_photo_cleanup`. Une sauvegarde réussie retire les chemins conservés de la file au sein de la même transaction. Les fichiers d’un import abandonné deviennent supprimables après 24 h. Les photos retirées ou celles d’une voiture supprimée deviennent supprimables immédiatement.

L’administration traite jusqu’à 100 fichiers éligibles à la connexion et après chaque sauvegarde / suppression. En cas d’erreur, ils restent en file pour la prochaine tentative. Une policy empêche la suppression de fichiers encore référencés par une voiture. Il n’y a pas de tâche serveur automatique : si le garage ne se reconnecte pas, les fichiers en attente restent stockés. Pour un nettoyage indépendant des visites, ajouter ultérieurement une tâche serveur utilisant l’API Storage.

Surveiller **Storage usage** et **Egress** dans Supabase. À 400 Kio + 100 Kio par photo, 100 voitures avec 10 photos utilisent environ 488 Mio, hors fichiers en attente. Le trafic dépend des consultations, même si la base reste légère.

## Vérification

`npm install` puis `npm test` vérifient les erreurs d’import, le redimensionnement, la compression, les protections de l’affichage, et exécutent le SQL dans PostgreSQL local via PGlite pour vérifier les droits et le nettoyage. `npm run preview` démarre une prévisualisation locale sur `http://127.0.0.1:4173/` ; les routes `/__test__/` remplacent le SDK par un faux backend en mémoire pour les tests d’interface, sans appel à la base réelle.

La connexion réelle, les policies et le stockage doivent être vérifiés après l’exécution SQL, avec le compte administrateur et un compte sans autorisation. Aucune voiture n’est importée automatiquement.

Les formulaires publics de contact / estimation conservent leur comportement de démonstration antérieur ; leur envoi n’est pas connecté à Supabase par cette modification.
