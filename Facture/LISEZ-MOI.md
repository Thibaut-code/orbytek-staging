# Facture Facile avec Supabase

## Récupération du mot de passe — version 2026.10.08.2

Le lien envoyé avec **Authentication > Users > Send password recovery** ouvre désormais un formulaire de nouveau mot de passe avec confirmation. L’événement Supabase `PASSWORD_RECOVERY` est traité même si l’utilisateur est déjà connecté. Les liens invalides ou expirés proposent de demander un nouveau lien. Le bouton **Mot de passe oublié ?** est également disponible sur la connexion.

Publiez `app.js` et `index.html` ensemble. Dans **Authentication > URL Configuration**, vérifiez que la **Site URL** mène à Facture Facile. Ajoutez aussi l’URL publique exacte de sa page avec `?reset=1` dans **Redirect URLs** (par exemple `https://votre-domaine/Facture/index.html?reset=1`). Le lien envoyé depuis l’application utilise cette adresse ; celui envoyé depuis le tableau de bord Supabase utilise la redirection configurée sur le projet. Si un modèle d’e-mail personnalisé est utilisé, son lien doit conserver `{{ .ConfirmationURL }}` pour que Supabase valide la récupération.

Après publication, envoyez un nouveau lien, choisissez et confirmez un mot de passe, puis vérifiez la connexion avec ce mot de passe. Les tests locaux couvrent les réponses Supabase simulées ; aucun e-mail réel n’est envoyé par les tests.

## Thème 12 Orbytek · Horizon bleu — version 2026.10.02.3

L'apparence 12 reprend la maquette Orbytek : noir profond, bleu électrique, horizon terrestre, trois indicateurs et dernières factures. Les boutons utilisent les parcours habituels, y compris le choix de continuer ou d'abandonner le brouillon. Le nom d'accueil vient du profil de la personne connectée ; les montants viennent des documents du compte.

Publiez aussi `orbytek.css` et `assets/orbytek-earth.webp` dans le dossier Facture. Pour synchroniser cette apparence entre appareils, appliquez `supabase/migrations/20261002_orbytek_interface.sql` après `20261002_original_interface.sql`. La migration est fournie, mais n'est pas exécutée automatiquement sur la base réelle.

## Mail, brouillons et thème original — version 2026.10.02.2

Le contact Orbytek et le destinataire du formulaire utilisent `thibaut@orbytek.be`.
Passer d'une facture en cours aux devis (ou inversement) propose de continuer le brouillon, de l'abandonner pour ouvrir la destination demandée, ou d'annuler. Continuer conserve les champs et l'étape ; abandonner un brouillon de modification ne supprime pas le document enregistré.

Le thème Graphite et vert terminal remplace le jaune par un vert lumineux sur fond sombre. L'apparence **11. Original · Vert et terracotta** reprend l'accueil initial avec son radiateur. Publiez aussi `radiateur.png` et exécutez **`supabase/migrations/20261002_original_interface.sql`**, après la migration équipe, pour permettre la sauvegarde du thème 11 sur les comptes. La migration est fournie et doit être appliquée à la base Supabase ; elle n'est pas exécutée par le navigateur.

## Interfaces, recherche et équipes — version 2026.10.02.1

Les dix apparences reprennent davantage les compositions des maquettes : marques et icônes propres, cartes colorées, navigation horizontale ou latérale, colonnes d’actions, tableaux et graphiques différents. Le menu horizontal n’a plus de hauteur minimale d’un écran. Les graphiques utilisent uniquement les données enregistrées, sans exemples ajoutés aux comptes.

La recherche dans l’accueil, les factures, devis, paiements, clients et la sélection du client filtre par nom ou référence sans tenir compte des accents ni des majuscules. Le logo de l’aperçu facture/devis est agrandi de 15 %. Le code pays final est masqué dans l’adresse imprimée, mais reste enregistré pour les contrôles TVA. Enregistrer Mon entreprise ramène à l’accueil.

### Installation des comptes employés

Publiez ensemble `index.html`, `app.js`, `vat.js`, `style.css`, `interface.js`, `interface.css`, **`refinement.css`** et **`team.js`**. Conservez votre `config.js` et `vendor`.

Exécutez les migrations dans cet ordre si elles ne sont pas encore appliquées :

1. `supabase/migrations/20260926_upgrade.sql` (sauvegarde transactionnelle et numérotation).
2. `supabase/migrations/20260930_vat.sql`.
3. `supabase/migrations/20261001_interface.sql`.
4. **`supabase/migrations/20261002_team.sql`**.

La dernière migration conserve les données existantes sous l’identifiant du responsable de la société. Les comptes employés y accèdent par leur appartenance à l’équipe. Les règles d’accès sont remplacées pour partager les données à l’intérieur de la société. Les compteurs et verrous de numérotation sont communs à la société. Chaque nouveau document enregistre également l’identifiant de son créateur. Les documents anciens restent conservés sans inventer leur auteur.

Après connexion, le responsable renseigne la société puis ouvre **Paramètres > Équipe > Gérer les employés et les invitations**. Il crée une invitation pour l’adresse e-mail de l’employé et transmet lui-même le lien. L’employé crée son propre compte, confirme son e-mail, se connecte puis ouvre le lien pour accepter. Un lien expire après sept jours, ne s’utilise qu’une fois et ne fonctionne que pour l’adresse invitée. L’application n’envoie pas automatiquement ces invitations. Le responsable peut retirer l’accès d’un employé ; les documents de la société restent conservés.

Chaque personne renseigne son nom dans Paramètres et choisit son apparence personnelle, synchronisée avec son compte. Les clients, prestations, documents, abonnements, relances, coordonnées de société et achats TVA sont partagés. Les membres ont les mêmes fonctions de gestion dans l’espace partagé ; la gestion des invitations et des accès est réservée au responsable. Une personne appartient à une seule société active à la fois. Son ancien espace personnel est conservé lorsqu’elle rejoint une équipe.

Si Peppol de test est utilisé, redéployez aussi **`supabase/functions/invoice-integrations`** : la fonction vérifie désormais l’équipe et utilise la configuration du responsable de la société.

Sans la migration équipe, l’application garde le fonctionnement individuel et affiche l’étape nécessaire dans Paramètres. La migration n’est pas exécutée automatiquement depuis le navigateur. Avant ouverture aux employés, validez sur Supabase deux comptes de la même société, un compte extérieur, une invitation expirée/réutilisée, le retrait d’accès et deux sauvegardes simultanées. Les tests locaux ne remplacent pas ces vérifications de base réelle.

Références techniques pour les contrôles serveur : [sécurité des fonctions PostgreSQL](https://www.postgresql.org/docs/16/sql-createfunction.html), [règles d’accès aux lignes](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

## E-mail avec PDF joint — parcours simplifié du 3 octobre 2026

Le bouton **Ouvrir ma messagerie** génère le PDF et un fichier `.eml` contenant le destinataire, l’objet, le message et la pièce jointe. Pour une relance, le bouton **Envoyer un rappel** fait la même chose et enregistre seulement la préparation dans l’historique. Aucun envoi n’est automatique.

Ouvrez le fichier depuis les téléchargements, puis choisissez **Transférer** dans le nouvel Outlook. Renseignez l’adresse indiquée dans Facture, vérifiez que le PDF est joint et envoyez. Enfin, confirmez l’envoi dans Facture. Les anciennes étapes et boutons de téléchargement séparé ont été retirés. Un navigateur ne peut pas garantir l’ouverture automatique d’une application locale avec une pièce jointe. Le fichier est un message normal (sans `X-Unsent`) pour éviter les pertes de pièces jointes signalées avec certains brouillons du nouvel Outlook. L’ouverture et le transfert réels restent à vérifier sur votre poste. Documentation : https://support.microsoft.com/en-us/outlook/mail/open-eml-msg-and-oft-files-in-new-outlook-and-outlook-on-the-web

## TVA belge trimestrielle — mise à jour du 30 septembre 2026

Exécutez `supabase/migrations/20260930_vat.sql` dans le SQL Editor de Supabase, puis publiez `vat.js`, `app.js`, `index.html` et `style.css` ensemble. La migration ajoute `documents.vat_date` et la table `vat_purchases`, avec accès isolé par utilisateur. Sans migration, le dashboard affiche un message et ne présente pas de solde calculé à partir d’achats manquants.

Dans le dashboard, **Préparer ma TVA** possède son propre sélecteur d’année et de trimestre. Les factures enregistrées, payées ou non, alimentent les ventes ; les devis sont exclus. La date de facture est utilisée par défaut. **Journal des ventes / dates TVA** permet de renseigner la date d’exigibilité sans modifier la facture. Vérifiez cette date selon l’opération et les éventuels acomptes.

Saisissez les achats nationaux ordinaires avec référence fournisseur, date de facture, date de déduction, montant HT, TVA facturée, pourcentage de déduction et catégorie 81/82/83. Les montants de TVA sont ceux du justificatif, pour respecter ses arrondis. Pour plusieurs taux ou catégories, ajoutez plusieurs lignes de même référence. Les achats sont modifiables et supprimables après confirmation. Conservez les justificatifs séparément ; ils ne sont pas téléversés ici.

La préparation propose les grilles 01/02/03, 54, 59, 81/82/83 et un solde estimé 71 **ou** 72. La TVA non déductible est incluse dans les grilles d’achats 81–83. Les ventes à 0 %, clients étrangers identifiés et lignes non prises en charge sont signalées et exclues des grilles. Un pays absent doit être vérifié : le taux ne prouve pas à lui seul une vente nationale. Les avoirs, opérations intracommunautaires, autoliquidations, importations, acomptes et régularisations demandent un traitement complémentaire avec votre comptable. Le solde affiché est limité aux données prises en charge, et ne tient pas compte du compte TVA auprès du SPF Finances.

L’export CSV contient les grilles proposées, les ventes (y compris celles à examiner) et les achats du trimestre. C’est un document de travail pour contrôle, pas un fichier de déclaration importable dans Intervat. Utilisez les liens vers Intervat, les notices et le calendrier officiel pour finaliser le dépôt et le paiement. Aucun dépôt automatique n’est effectué.

Références : [modèles et notices SPF Finances](https://finances.belgium.be/fr/E-services/Intervat/modeles-des-declarations-et-notices), [calendrier TVA](https://financien.belgium.be/nl/node/1593).

1. Exécuter dans Supabase le SQL des tables `companies`, `clients`, `documents`, `document_lines`, puis celui de `profiles` si vous souhaitez les profils utilisateurs.
2. Dans **Project Settings > API Keys**, relever l'URL du projet et la clé **publishable** (`sb_publishable_...`) ou l'ancienne clé **anon**. Les renseigner dans `config.js`. Ne jamais utiliser de clé **secret** ou **service_role** dans un site GitHub Pages.
3. Dans **Authentication > Providers > Email**, activer la connexion par e-mail. Dans **Authentication > URL Configuration**, définir l'URL publique GitHub Pages comme `Site URL` et l'ajouter dans `Redirect URLs` (par exemple `https://UTILISATEUR.github.io/DEPOT/`). Conserver la confirmation e-mail si souhaitée.
4. Mettre `index.html`, `style.css`, `app.js`, `interface.css`, `interface.js`, `vat.js`, le dossier `vendor` et `config.js` à la racine du dépôt GitHub Pages, puis ouvrir le site en HTTPS. La bibliothèque Supabase est chargée depuis jsDelivr.
5. Créer un compte, confirmer l'e-mail si demandé, se connecter et renseigner « Mon entreprise » avant de créer un document.

Les données de démonstration précédentes ne sont pas importées. Les documents existants dans les anciennes sessions n'étaient pas persistés. Le brouillon en cours reste seulement dans la page jusqu'à l'enregistrement..

**Avant d'émettre de vraies factures** : mettre en place une attribution transactionnelle des numéros côté serveur, vérifier les mentions obligatoires et les règles de TVA applicables, puis contrôler les besoins de facturation électronique. Les numéros générés ici dans le navigateur peuvent se heurter entre deux appareils ou être réutilisés après suppression. Le document est enregistré avant ses lignes ; si l'enregistrement des lignes échoue, l'application tente de supprimer le document incomplet.

Pour mettre à jour un site déjà configuré, conservez votre `config.js` existant : le fichier dans cette archive est un exemple. Les illustrations de métiers ont été retirées.

## Dix apparences et métier indépendant — 1 octobre 2026

Le bouton **Thème** ouvre les dix apparences avec un aperçu. Couleurs, polices, icônes et agencement changent. La police de l'apparence choisie est chargée à la demande ; les maquettes PNG ne sont pas chargées dans l'application.

Dans **Paramètres > Métier et prestations**, choisissez votre métier parmi les dix métiers existants et gérez vos prestations personnalisées. Le métier ne modifie plus l'apparence. Les catalogues existants et les documents enregistrés sont conservés. La colonne historique `companies.theme` conserve la clé du métier afin de préserver les catalogues par métier.

Pour synchroniser l'apparence entre appareils, exécutez `supabase/migrations/20261001_interface.sql` dans le SQL Editor de Supabase. Elle ajoute `companies.ui_theme`. Sans cette migration, l'apparence fonctionne et reste mémorisée dans ce navigateur, séparément pour chaque compte. Le métier utilise la colonne historique `theme` et son stockage local de secours.

Publiez ensemble `index.html`, `app.js`, `style.css`, `interface.js`, `interface.css`, `vat.js`, `accueil.html` et le dossier `vendor`. Conservez votre `config.js`. Les anciens thèmes visuels métiers, leurs images et le dossier de copie « theme vert de base » ont été supprimés. Les migrations et les tests restent utiles et sont conservés.

Vérification : `node --test tests/*.test.cjs`. Aperçu isolé avec données fictives : `node tests/interface-preview.cjs`, puis `http://127.0.0.1:4175`. Cet aperçu n'effectue aucun accès à Supabase.
## Mise à jour — prestations, abonnements, relances, QR et logo

### Installation sur votre site existant

1. Sauvegardez votre dossier actuel et votre base Supabase.
2. Dans Supabase > SQL Editor, exécutez **migration-suivi.sql**. Elle ajoute deux colonnes à `companies`, une à `documents` et la table `payment_reminders`, avec isolation des relances par utilisateur. Les tables d'origine doivent déjà exister avec leurs politiques de sécurité par utilisateur.
3. Remplacez **index.html**, **app.js**, **style.css** et ajoutez le dossier **vendor** dans le dossier `Facture` de votre site.
4. Conservez **config.js** et publiez également **interface.js** et **interface.css**. Les images de métiers ne sont plus nécessaires.
5. Rechargez avec Ctrl+F5, puis vérifiez une facture de test avant utilisation.

### Prestations

À l'étape « Les travaux », ouvrez **Gérer mes prestations** pour ajouter/supprimer les raccourcis et définir leurs quantités et prix. Le catalogue est propre au compte et au métier sélectionné, et se synchronise via Supabase. Les lignes de vos anciens documents ne changent pas. **Autre prestation** ajoute toujours une ligne libre. **Retirer** supprime une ligne du brouillon uniquement.

### Abonnements

Activez la récurrence à l'étape « Les travaux », ou depuis une facture enregistrée avec **Ajouter une récurrence**. Choisissez une fréquence mensuelle, trimestrielle ou annuelle et la prochaine date (par exemple 2026-12-20 pour chaque 20 décembre).

L'accueil affiche les facturations arrivées à échéance ; l'onglet **Abonnements** affiche aussi les prochaines. **Préparer la facture** crée un nouveau brouillon sans modifier l'ancienne facture. Relisez-le, enregistrez-le et envoyez-le. Revenez ensuite dans Abonnements et cliquez sur **Échéance traitée** pour avancer d'une période. Cette action confirme uniquement votre suivi : elle ne prouve aucun envoi. Vous pouvez préparer un brouillon en avance. Une échéance oubliée reste visible jusqu'à son traitement. Pour arrêter, décochez la récurrence dans **Modifier / arrêter**.

Les rappels sont affichés dans l'application lorsqu'elle est ouverte ou rechargée. Aucun e-mail automatique, notification en arrière-plan ni tâche serveur n'est installé.

### Relances des impayés

Sur une facture non payée dont la date limite est dépassée, choisissez **Relancer : retard de paiement**. Vous pouvez corriger le destinataire, l'objet et le message. **Envoyer un rappel** crée le fichier e-mail avec la facture PDF jointe et enregistre la préparation. Ouvrez le fichier dans Outlook et transférez-le au destinataire indiqué, puis confirmez l’envoi dans l’application.

Après l'envoi, cliquez sur **J’ai envoyé cette relance**. L'historique conserve le destinataire, le texte, la date de préparation et la date de confirmation. Une confirmation est déclarative : il ne s'agit pas d'une preuve de livraison. Fermer la fenêtre ne confirme pas l'envoi. Chaque nouvelle préparation produit une entrée distincte. La suppression d'une facture supprime aussi ses relances.

### QR de paiement SEPA

Le QR est créé localement, sans transmission des coordonnées bancaires à un générateur tiers, puis affiché sur les factures enregistrées non payées et dans l'impression PDF. Il contient le bénéficiaire, l'IBAN belge, le total en EUR et le numéro de facture en communication. Il n'est pas affiché sur les devis, les brouillons non numérotés ou les factures payées. Une application bancaire compatible EPC / SEPA est nécessaire ; la compatibilité dépend de la banque. Le statut payé doit être mis à jour manuellement.

**L'IBAN fourni BE12 4567 1245 1245 est invalide (contrôle modulo 97 : 40 au lieu de 1). Aucun QR n'est généré avec ce compte.** Renseignez votre IBAN correct dans **Mon entreprise**. Aucun compte existant n'est remplacé arbitrairement. Les anciennes factures conservent les coordonnées bancaires enregistrées lors de leur création. Cette version prend en charge les comptes belges.

Format : EPC069-12 v3.1, BCD/002, UTF-8, correction M, maximum 331 octets/version 13. Source : https://www.europeanpaymentscouncil.eu/document-library/guidance-documents/quick-response-code-guidelines-enable-data-capture-initiation
La bibliothèque locale qrcode-generator 1.4.4 est distribuée sous licence MIT, incluse dans vendor/LICENSE-qrcode.

### Logo

Dans **Mon entreprise**, sélectionnez un PNG, JPEG ou WebP (maximum 2 Mo). L'aperçu apparaît avant l'enregistrement. Cliquez sur **Enregistrer mes coordonnées**. L'image est réduite à 640 × 320 au maximum et conservée dans Supabase. **Retirer le logo**, puis enregistrer, supprime le logo des prochaines factures. Les factures et devis déjà enregistrés gardent leur logo d'origine.

### Limites conservées de l'application initiale

La numérotation reste générée dans le navigateur et l'enregistrement du document/de ses lignes n'est pas transactionnel. Aucun envoi Peppol ni envoi d'e-mail serveur n'est ajouté. Ces points doivent être traités avant d'en faire une solution complète de facturation professionnelle.

### Vérifications de cette livraison

Tests exécutés avec un DOM et des réponses Supabase simulés : catalogue (ajout, suppression et sauvegarde), ajout de lignes, récurrence dans les données enregistrées, préparation mailto et confirmation des relances, aperçu et retrait du logo, passage d'une échéance à la suivante, création du brouillon récurrent, cas de fin de mois/année bissextile, validation IBAN. Le QR a été décodé avec un décodeur indépendant et comparé au bénéficiaire UTF-8, au montant et à la communication attendus.

La base Supabase réelle, la réception des e-mails, le chargement/redimensionnement d'un logo dans un navigateur et le rendu visuel mobile/PDF n'ont pas pu être validés dans cet environnement. Après installation, testez ces parcours avec une facture de test.
