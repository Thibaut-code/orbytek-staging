# Atelier — démo Orbytek

Ouvrir index.html par double-clic dans un navigateur. Aucune installation ni commande nécessaire.

Sur Orbytek : déposer index.html dans un dossier de votre hébergement, puis créer un lien vers ce dossier.

Réservation, agenda, recherche, modification et annulation sont simulés dans le navigateur. Utiliser des coordonnées fictives. Aucun rendez-vous réel ni message envoyé. Données conservées uniquement dans ce navigateur, lorsque le stockage local est disponible.

## Parcours de démonstration

- L’espace salon contient 30 rendez-vous fictifs répartis sur cinq jours d’ouverture, avec Camille et Alex. Les essais de l’ancienne démo sont conservés si le navigateur permet de les retrouver.
- Le planning affiche les rendez-vous à leur horaire, avec une couleur par professionnel. La vue Liste présente les coordonnées et les actions. La recherche couvre toutes les dates.
- Les indicateurs affichent les rendez-vous de la journée choisie, le montant fictif des prestations et le temps réservé, pour les deux professionnels réunis.
- Pour réserver, choisir une prestation, un professionnel et un horaire, puis cliquer sur Continuer. « Remplir avec un exemple » insère un profil fictif ; cocher ensuite la case de simulation et confirmer.
- Après confirmation, « Voir dans le planning » ouvre la bonne journée. « Modifier ce rendez-vous », une carte du planning ou le bouton Modifier de la liste ouvrent le formulaire de modification.
- La modification permet de changer date, prestation, professionnel, horaire et coordonnées. La référence reste identique. L’ancien créneau est libéré uniquement après enregistrement ; un conflit conserve le rendez-vous d’origine.
- Le bouton « Réinitialiser la démo » efface les essais et recrée les cinq journées fictives à partir du prochain jour disponible. Les modifications et annulations restent enregistrées au rechargement.

Ouverture du mardi au samedi, 9 h à 18 h, heure de Bruxelles. Créneaux sur les 89 prochains jours, avec un préavis d’une heure. Un jour d’ouverture est sélectionné par défaut.

Styles et JavaScript inclus dans le HTML. Photo et polices chargées depuis Internet.

L’ancienne application, ses dépendances et sa base locale ont été supprimées. L’historique Git est conservé.

Le HTML contient tout le code de la démo, sans bibliothèque, installation ni compilation.

## Présentation

Le parcours propose un calendrier mensuel avec indicateurs de disponibilité, des portraits illustrés des professionnels, les créneaux regroupés matin/après-midi et un récapitulatif détaillé. Sur mobile, une barre fixe affiche le choix et le bouton pour continuer. La confirmation prend la forme d’un billet avec la date et l’heure ; le planning et les fenêtres de modification reprennent la même présentation.

La confirmation par e-mail à l’utilisateur est présentée comme une fonctionnalité prévue pour la version client. Aucun e-mail n’est envoyé par cette démo : cette fonction nécessitera une intégration lors de la réalisation du projet client.

La page Créations d’Orbytek propose une fiche Atelier avec un lien vers `rendezvous/index.html`. Elle précise que la démo et ses fonctionnalités sont personnalisables et modifiables selon les besoins du client. `preview.html` est un aperçu illustratif statique de la démo utilisé uniquement pour cette fiche ; le fichier `index.html` reste autonome.

Vérifications du code intégré au HTML : exemples sans chevauchement, disponibilités et limites de dates, création, modification et référence conservée, refus des conflits sans perte de données, recherche, annulation, persistance, rechargement et fonctionnement sans stockage local. Le script complet et ses actions ont aussi été exécutés sur un DOM simulé pour vérifier le préremplissage, la réservation, le planning, la modification et la réinitialisation. Le rendu visuel réel n’a pas été vérifié : l’accès au fichier local est bloqué par la politique du navigateur intégré.
