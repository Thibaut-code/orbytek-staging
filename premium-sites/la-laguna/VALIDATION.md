# Vérifications — 16 octobre 2026

Contrôle dans Microsoft Edge avec Playwright, sans commande ni réservation externe.

- Page servie avec HTTP 200 ; aucune erreur JavaScript ni erreur HTTP sur les ressources locales.
- Français et néerlandais : contrôle des largeurs 320, 390, 580, 768, 1024, 1536 et 1920 px, sans débordement horizontal de la page ni du titre.
- Toutes les images du contenu chargées ; revue visuelle de l’accueil ordinateur/mobile, de la page complète et du formulaire de réservation.
- Quatre catégories de carte, changement d’image et navigation au clavier avec flèches, Début et Fin.
- Ajout de plats, incrément, suppression et remise de 10 % : 41 € → 36,90 € ; 67 € → 60,30 € ; 15 € → 13,50 €.
- Préparation d’une réservation pour quatre personnes, résumé et lien Zenchef vérifiés. Aucune requête de réservation envoyée.
- Galerie : ouverture, navigation au clavier et fermeture par Échap.
- Menu mobile, fermeture après navigation et retour de focus.
- Changement FR/NL après usage du panier ; contenu et interactions conservés.
- Préférence de réduction des mouvements respectée.

Les images de contrôle sont dans `../reports/screenshots/la-laguna-*.png`.
