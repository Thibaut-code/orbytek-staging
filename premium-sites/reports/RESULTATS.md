# Vérifications — 1 octobre 2026

Audit Lighthouse mobile de l’export statique, servi à http://localhost:4173 avec compression gzip. Scores conservés dans les fichiers JSON adjacents.

| Site | Performance | Accessibilité | Bonnes pratiques |
| --- | ---: | ---: | ---: |
| Aurelia | 96 | 100 | 100 |
| Maison Braise | 96 | 100 | 100 |
| Vert & Pierre | 97 | 100 | 100 |

Le score SEO des concepts est 66 : les démonstrations sont volontairement `noindex`, afin de ne pas indexer des entreprises fictives. Les métadonnées des pages sont présentes. L’indexation, les données locales vérifiées et le domaine canonique seront configurés sur le site du client.

Construction Next.js et contrôle TypeScript réussis. Huit tests passent : recherche multicritère, calcul du budget, unités d’élagage, panier, rappel agenda, validation des demandes, refus d’une origine externe et absence de faux envoi sans fournisseur configuré.

Vérification interactive : filtre immobilier, favori, comparateur, fiche de bien, panorama 360°, panier, formulaire de réservation avec résultat explicite de démonstration, avant/après au clavier, filtre des jardins, recalcul du budget et formulaire en deux étapes. Vérification des trois largeurs mobiles sans débordement horizontal ni image cassée, menu mobile, et contrôle visuel sur ordinateur.

Ces scores décrivent cette version locale. Ils seront à recontrôler avec les médias et les intégrations définitifs du client, sur son hébergement.
