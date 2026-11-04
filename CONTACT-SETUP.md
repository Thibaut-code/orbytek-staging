# Formulaire Orbytek — Web3Forms

Créer un formulaire Web3Forms gratuit associé à thibaut@orbytek.be, vérifier l'adresse e-mail, puis copier son Access Key dans contact-config.js (accessKey). Cette clé de formulaire est publique ; une clé Resend ou un mot de passe SMTP ne doit jamais y figurer.

Le formulaire « Orbytek — Contact » a été créé le 4 novembre 2026 dans le compte thibaut@orbytek.be et sa clé publique est renseignée. Une vérification réelle depuis le navigateur reste nécessaire après publication ; les tests locaux seuls ne vérifient pas la livraison.

Une soumission valide envoie un seul POST JSON vers https://api.web3forms.com/submit. Dès que le service répond avec un statut HTTP positif et success: true, le navigateur ouvre directement merci.html sur le domaine courant. Aucun réglage de redirection dans le compte n'est nécessaire pour cette intégration AJAX.

L'adresse du visiteur sert de Reply-To. Sujet : Orbytek — Nouvelle demande de contact. Les champs name, email, phone, company, project et message sont transmis avec une référence. Le destinataire dépend de la clé du formulaire.

Le piège website bloque les bots localement ; les protections du prestataire s'appliquent aussi. Un double clic ne provoque pas deux envois. Une erreur, un refus, une réponse non JSON ou une absence de confirmation sous 12 secondes conserve les champs et propose Réessayer l'envoi. Le timeout ne prouve pas que le prestataire n'a rien reçu ; la référence ne garantit pas de déduplication serveur.

Les notifications sont demandées par soumission, sans récapitulatif programmé. L'acceptation du prestataire ne garantit pas la livraison ni le classement en boîte principale.

Publier ensemble index.html, contact-config.js, contact.js, merci.html et merci.js via develop, puis vérifier le déploiement et une demande de test dans la boîte OVH. Vérifier le Reply-To. Le forfait gratuit annonce 250 soumissions mensuelles. Les autres applications du dépôt restent indépendantes.

Tests locaux (réponses simulées, aucun mail envoyé) : node --test tests/contact-browser.test.mjs

Documentation : https://docs.web3forms.com/getting-started/installation
Clé publique : https://docs.web3forms.com/getting-started/faq
Tarifs : https://web3forms.com/pricing
