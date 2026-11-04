# Formulaire de devis

Le formulaire de `index.html` envoie les demandes par POST à FormSubmit.io,
à destination de **thibaut@orbytek.be**. Aucune clé API n'est nécessaire.
Endpoint : `https://formsubmit.io/f/5448c996-26a1-4821-b105-0aed8e687f85`.
Les champs du tableau de bord correspondent aux noms du formulaire :
`prenom`, `nom`, `tel`, `email`, `prestation`, `bien`, `message`, `consentement`.
Le filtrage antispam du service et un champ piège `_formsubmit_id` limitent le spam.

## Mise en service

1. Ouvrir le mail de confirmation FormSubmit.io reçu sur `thibaut@orbytek.be`
   après la création du formulaire et cliquer sur son lien.
2. Vérifier que le formulaire est actif dans https://formsubmit.io/dashboard/.
3. Publier les fichiers `index.html` et `script.js` modifiés.
4. Soumettre une demande de test, vérifier sa présence dans le tableau de bord,
   puis la réception du récapitulatif par mail.

Le formulaire reste en brouillon et refuse les demandes avant la confirmation
du destinataire, même si la connexion au compte a déjà été validée.
L'offre gratuite utilise un récapitulatif différé et autorise 300 demandes
par mois : la réception du mail n'est pas immédiate. Le 4 novembre 2026,
le tableau de bord « Plan & usage » indique toutes les 4 heures, tandis que
la page publique annonce aussi 12 heures à certains endroits. Le délai
exact et la livraison en boîte mail restent à confirmer.
Après soumission, le visiteur passe par la page de confirmation
de FormSubmit.io. Le site n'affiche plus de confirmation simulée et ne vide
plus les champs avant leur transmission. Le POST fonctionne aussi sans JavaScript.

Service : https://formsubmit.io/

## Vérification du 4 novembre 2026

- Destinataire confirmé et formulaire affiché « Live » dans le tableau de bord.
- POST de test avec les huit champs et le honeypot vide : HTTP 202,
  `received: true` (traitement asynchrone).
- Demande `ef337b08-7fc7-4132-9369-6580cdc69814` visible dans « Submissions »,
  statut « New », classée « Not spam ». Les huit valeurs ont été vérifiées.
- Message : « TEST TECHNIQUE ORBYTEK — vérification FormSubmit.io du 04/11/2026.
  Aucune intervention demandée. »
- Réception dans la boîte mail non vérifiée ; l'offre gratuite utilise un
  récapitulatif différé. Test du service par POST, sans parcours navigateur
  complet sur le site publié. Les fichiers locaux restent à publier.
