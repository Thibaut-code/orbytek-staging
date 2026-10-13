# Collection premium Orbytek

Trois sites de démonstration créés avec Next.js, React, Tailwind CSS et Framer Motion, exportés pour l’hébergement statique actuel d’Orbytek. Marques et contenu commercial fictifs, explicitement identifiés.

## Ouvrir les sites

Depuis ce dossier, lancer `npm run serve`, puis ouvrir :

- Portfolio : http://localhost:4173/creations.html
- Aurelia : http://localhost:4173/demos/immobilier/
- Maison Braise : http://localhost:4173/demos/restaurant/
- Vert & Pierre : http://localhost:4173/demos/paysagiste/

Le serveur doit rester ouvert. Ces URL fonctionnent sur l’ordinateur local. Les liens publics deviennent disponibles après publication du dossier `demos` et des fichiers de portfolio sur l’hébergement existant. Aucun déploiement ni push n’a été réalisé.

## Développement et export

`npm ci` installe les dépendances verrouillées. `npm run dev` lance le développement à http://localhost:3000/demos/. `npm test` vérifie les règles de recherche, calculs, agenda et l’API. `npm run build` compile, vérifie TypeScript et pré-rend les pages. `npm run export` copie `out` et les médias vers `../demos`, met à jour les trois aperçus et ajoute les cartes au portfolio sans les dupliquer.

Le `basePath` est `/demos`. Les sites sont prévus pour un domaine à la racine, comme l’hébergement actuel. Un déploiement GitHub Pages dans un sous-chemin de dépôt nécessiterait de modifier ce chemin et de reconstruire. Les exports React se consultent via HTTP ; ouvrir directement leur HTML avec `file://` ne permet pas de charger correctement tous les composants.

## Fonctionnalités livrées

**Aurelia** : recherche instantanée combinant commune, prix, type, surface et chambres ; six pages statiques de biens ; galerie agrandissable ; favoris locaux persistants ; comparateur de trois biens ; carte schématique interactive avec liens Google Maps ; panorama 360° réel avec Pannellum ; formulaires estimation/visite ; mode clair/sombre ; articles et FAQ ; équipe et exemples de ventes.

**Maison Braise** : menu par catégories et filtre végétarien ; indication des allergènes ; carte des vins filtrable ; panier avec quantités et total ; réservation avec contrôle des jours de fermeture ; horaires calculés à l’heure de Bruxelles ; galerie ; événements ; composition d’un bon cadeau ; accès Google Maps chargé à la demande ; carnet visuel préparant l’intégration Instagram.

**Vert & Pierre** : neuf services ; comparaison avant/après accessible au clavier ; réalisations filtrables et fiches en fenêtre ; carte des communes ; calculateur de budget ; formulaire de projet en deux étapes adapté au service ; demande de visite ; équipe, étapes et conseils jardin.

**Commun** : mises en page mobile, tablette et ordinateur ; navigation mobile ; animations respectant la réduction des mouvements ; dialogues avec focus et fermeture clavier ; formulaires validés ; état de démonstration explicite ; rappel agenda téléchargeable ; mentions du concept.

## Architecture

- `app/` : pages Next.js et métadonnées, routes de biens pré-rendues.
- `components/shared.tsx` : en-tête, animations, galeries, formulaire, fenêtres, FAQ, cartes, pied de page.
- `components/estate.tsx`, `restaurant.tsx`, `garden.tsx` : parcours et états propres à chaque métier.
- `lib/data.ts` : collection de biens, menu, vins, projets, médias.
- `lib/logic.mjs` : règles pures de recherche, budget, panier et agenda.
- `server/lead-api.mjs` : API Node indépendante, facultative, préparée pour Resend.
- `public/` : photos locales, films d’ambiance, lecteur 360° et licences.
- `scripts/` : téléchargement des médias, préparation des films, export et serveur statique.
- `tests/` : tests des règles et de la validation/transmission API.
- `reports/` : rapports Lighthouse locaux.

La configuration actuelle utilise l’[export statique Next.js](https://nextjs.org/docs/app/guides/static-exports). L’API de contact est un service séparé afin de rester compatible avec l’hébergement statique du portfolio.

## Raccordement pour un vrai client

1. Remplacer marques, coordonnées, équipe, biens, projets, prix et horaires par des informations validées. Fournir les vraies photos, avis autorisés, documents, assurances, agréments et mentions légales.
2. Choisir un outil de réservation réel et son API. La demande actuelle n’est pas une disponibilité ni une confirmation de table ou de visite. Le fichier agenda est un rappel « à confirmer ».
3. Configurer `NEXT_PUBLIC_REQUEST_ENDPOINT` avant compilation. Le frontend envoie alors les demandes à cette URL et indique une réussite uniquement après réponse HTTP valide.
4. Pour l’API fournie : renseigner `ALLOWED_ORIGINS`, `RESEND_API_KEY`, `LEAD_TO`, `LEAD_FROM` puis lancer `node --env-file=.env.local server/lead-api.mjs`. La clé reste côté serveur. Placer cette API derrière HTTPS. Elle vérifie les champs, le consentement, la taille du corps, l’origine et limite la fréquence ; pour une exploitation distribuée, utiliser un stockage partagé de limitation et une protection anti-abus adaptée. Sans identifiants, elle retourne 503 et n’invente aucun envoi.
5. Pour commande et cadeaux : brancher le prestataire de paiement côté serveur, recalculer les prix depuis le catalogue serveur, traiter les webhooks vérifiés et n’émettre les bons qu’après paiement. Le panier actuel ne débite rien et le cadeau affiché est uniquement un aperçu.
6. WhatsApp : les liens actuels préparent un texte sans destinataire. Ajouter le numéro professionnel du client. Instagram : le carnet est éditorial ; raccorder le compte professionnel via un service côté serveur, sans exposer les jetons.
7. Cartes : les schémas utilisent des positions illustratives. Remplacer par des coordonnées exactes et un fournisseur cartographique si nécessaire. La visite 360° utilise un panorama d’exemple indépendant du bien.
8. SEO de production : fournir domaine canonique, données locales vérifiées, pages de services, sitemap et données structurées exactes. Les démonstrations restent volontairement `noindex` pour éviter l’indexation d’entreprises fictives. Les métadonnées de chaque page sont déjà rédigées.

## Médias

Photos d’inspiration téléchargées depuis Unsplash ; identifiants dans `public/images/credits.json`. Certaines photos illustrent une ambiance et ne reproduisent pas exactement le plat ou le projet nommé. Les photos avant/après sont deux inspirations distinctes, et ne prétendent pas documenter un chantier.

Les vidéos de fond sont des films locaux de 10 secondes, préparés à partir des photos avec un mouvement lent. Il ne s’agit pas de tournages du lieu ni de témoignages réels. `node scripts/videos.mjs` les régénère. Remplacer par des films clients pour la production.

Les photographies sont également préparées en WebP et en tailles 640/960/1280/1920 px par `scripts/optimize-images.py` (Python + Pillow). Le héros choisit la taille adaptée à l’écran. La vidéo se charge à la première interaction pour préserver le premier affichage et respecte le réglage de réduction des animations.

La visite 360° emploie Pannellum 2.5.6 et le panorama « Alma » de Matthew Petroff, crédité dans la visite. La licence du lecteur est conservée dans `public/vendor/LICENSE-pannellum`.

## Performance

Les scores Lighthouse doivent être lus dans les rapports enregistrés, avec leur configuration et leur date. Un score local ne garantit pas un score identique sur l’hébergement du client : réseau, médias définitifs et services tiers ont un impact. L’objectif 95+ est vérifié sur la version exportée, jamais annoncé à partir de la seule apparence du site.
