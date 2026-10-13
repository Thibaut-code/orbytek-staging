# Orbytek — Site vitrine

Site statique avec apparences claire et sombre, sans dépendances à installer pour la publication. Ouvrir index.html dans un navigateur, ou lancer `node premium-sites/scripts/serve.mjs` pour une prévisualisation locale.

## Améliorations SEO du 6 octobre 2026

Le récapitulatif complet, les vérifications, les 48 pistes de mots-clés, les idées d’articles et le plan sur 90 jours sont dans [README-SEO.md](README-SEO.md).

Quatre pages de services et une présentation du projet Facture Facile ont été ajoutées. Les métadonnées, les liens internes, le sitemap et les images ont été améliorés en conservant le style du site. Les changements sont locaux ; aucune publication n’a été effectuée.

- index.html : accueil, services, support IT, présentation et contact.
- tarifs.html : grille existante de tarifs indicatifs, avec support affiché à 59 €/h ; montant confirmé par le propriétaire.
- creations.html : portfolio de projets et démonstrations, à distinguer des références clients.
- creation-sites-web.html : création et refonte de sites.
- applications-sur-mesure.html : développement d’applications métiers.
- integrations-automatisations.html : intégrations API et automatisations.
- support-informatique.html : assistance informatique.
- projet-facture-facile.html : présentation du projet personnel et familial à l’origine d’Orbytek.
- styles.css : thème commun et affichage mobile.
- seo.css : styles des liens de services, FAQ et nouveaux contenus.
- orbytek-logo.png : logo original fourni.

Le formulaire de contact conserve le service FormSubmit et les coordonnées existants. Le bon fonctionnement de l’envoi dépend de son activation côté destinataire.

Les tarifs sont indicatifs ; le devis précise le périmètre et les conditions.

Les fichiers peuvent être publiés ensemble sur l’hébergement statique existant. Aucun déploiement automatique n’est effectué par ces modifications.

`scripts/check-seo.py` vérifie les pages du sitemap, les métadonnées, le JSON-LD, les liens et les fichiers locaux, avec Python 3.9 ou plus et sans dépendance externe.

## Trois nouvelles démonstrations premium

Aurelia (immobilier), Maison Braise (restaurant) et Vert & Pierre (paysagisme) sont ajoutés à `creations.html`. Les exports publiables sont dans `demos/`, et les sources Next.js / Tailwind / Framer Motion dans `premium-sites/`.

Pour les ouvrir localement : `cd premium-sites`, puis `npm run serve`, et visiter http://localhost:4173/creations.html. Les détails de construction, fonctions et raccordements clients sont dans `premium-sites/README.md`.
