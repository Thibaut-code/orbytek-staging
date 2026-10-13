# Module Peppol — Facture-Facile

Le nouvel onglet `#peppol` propose factures émises, factures fournisseurs, historique, tableau de bord et activation. Les douze thèmes réutilisent leurs propres variables de couleurs et de typographie. Le bouton et la fonction `invoice-integrations` de test existants sont conservés.

## Configuration réutilisée

Les nouvelles fonctions lisent le secret serveur **INTEGRATION_ACCOUNTS** existant. Pour chaque responsable d’entreprise :

- `recommandKey` et `recommandSecret` : authentification Recommand existante ; jamais envoyées au navigateur.
- `peppolEnvironment: "test"` (ou `"playground"`) et `testCompanyId` : entreprise de test actuelle, automatiquement associée lors du premier chargement.
- Pour la production, configuration serveur explicite `peppolEnvironment: "production"` et `companyId`. Le navigateur ne peut pas choisir l’environnement. Les données restent séparées.
- Une plateforme peut aussi utiliser les secrets serveur `RECOMMAND_KEY`, `RECOMMAND_SECRET`, `RECOMMAND_ENVIRONMENT` pour les entreprises sans entrée individuelle. Aucune bascule automatique en production.

Le test historique utilise `/generate`, qui valide/génère le XML sans transmission. Le nouvel envoi valide avec `/generate`, puis transmet avec `/send`, après confirmation de l’utilisateur. Il ne faut pas confondre les deux résultats.

## Installation et activation

1. Appliquer `supabase/migrations/20261012_peppol.sql`, puis `202610120001_peppol_locking.sql` et `202610120002_peppol_corrections.sql`, après les migrations existantes.
2. Déployer `peppol` et `peppol-webhook`. Leur configuration `verify_jwt=false` est intentionnelle : `peppol` vérifie le JWT utilisateur avec `auth.getUser`, le webhook exige une signature HMAC SHA-256.
3. Publier les fichiers frontend mis à jour, dont `peppol.js` et `peppol.css`.
4. Ouvrir Peppol > Paramètres. L’entreprise de test existante est reprise automatiquement. Si aucune entreprise n’est associée, l’assistant crée une entreprise via Recommand, puis ouvre la vérification du représentant.
5. Activer la réception si nécessaire. Une inscription chez un autre prestataire nécessite un transfert préalable ; l’application ne désinscrit jamais une entreprise ailleurs.
6. Au premier chargement par le responsable, le service connecte automatiquement les notifications pour l’entreprise existante. **Connecter les notifications** permet de réessayer ou reconnecter après une rotation de clés. Le service crée/met à jour un webhook limité à cette entreprise. Son secret de signature est dérivé côté serveur du secret Recommand et de l’identifiant entreprise ; aucun nouveau secret n’est à recopier dans le navigateur. Après rotation des clés, reconnecter les notifications.
7. Dans **Webhooks and rules** de Recommand, vérifier que les événements `document.received`, `document.sent`, `document.delivery_status_changed`, `company.verification` sont acheminés vers `https://<projet>.supabase.co/functions/v1/peppol-webhook`, avec signature. Le endpoint public `/webhooks` souscrit aux événements pris en charge (abonnement large). Vérifier leur arrivée réelle pendant les essais ; les règles avancées restent gérées dans le tableau de bord Recommand. Le bouton **Synchroniser** réconcilie aussi les états depuis l’API.

L’URL publique du site doit figurer dans `APP_ORIGIN` (liste séparée par des virgules acceptée par le nouveau module). `orbytek.be` et `www.orbytek.be` sont déjà autorisés. Le secret historique et la fonction existante ne sont pas modifiés.

## Sécurité et cohérence

- Chaque accès est lié au responsable renvoyé par `company_members`, jamais à un propriétaire fourni par le navigateur. Activation et configuration des webhooks sont réservées au responsable.
- RLS en lecture uniquement pour les membres de l’entreprise sur les tables du module. Les écritures passent par le serveur. Aucune lecture publique des factures ni des événements webhook.
- Verrou SQL avant l’envoi et comparaison des instantanés de facture/lignes. Les documents en transmission, envoyés, livrés ou d’état inconnu ne peuvent plus être réécrits. Les notes de crédit conservent la facture d’origine.
- Un refus explicite avant transmission peut être corrigé et réessayé. Un timeout ou résultat ambigu devient **Statut inconnu**, jamais un renvoi automatique. Un document ayant déjà un identifiant fournisseur n’est pas retransmis par un second clic.
- En cas de timeout, **Synchroniser** parcourt l’historique du fournisseur et rattache le document retrouvé à son numéro et à son entreprise. Une demande `sending` sans confirmation depuis deux minutes devient `unknown`.
- La livraison est fondée sur les tentatives **Peppol**, jamais sur un e-mail. Les réponses métier ne marquent pas automatiquement une facture comme payée.
- Les webhooks vérifient `X-Signature: sha256=…` sur le corps exact, vérifient l’entreprise/l’équipe et dédupliquent le corps signé. Un événement non traité retourne une erreur pour permettre une nouvelle tentative. L’état courant est relu chez Recommand pour ne pas appliquer un ancien événement arrivé en retard.
- Bucket Storage privé `peppol-archive`. XML et PDF archivés ; URL de téléchargement signée valable 60 secondes. Un échec PDF est signalé et peut être réessayé. La boîte Recommand n’est acquittée qu’après archivage du XML. Le statut local « Non lue » reste indépendant.
- Le journal conserve erreurs et requêtes des tentatives. Aucun secret API n’est inclus dans les événements.

## Fonctionnalités et limites explicites

- Envoi des factures enregistrées ; TVA 6/12/21 %, et taux 0 % avec catégorie fiscale et motif expressément saisis. Le traitement choisi s’applique à toutes les lignes à 0 % ; des catégories différentes dans un même document nécessitent une extension du modèle de lignes. La validation Recommand reste obligatoire avant transmission.
- Notes de crédit **totales**, une par facture d’origine et par environnement (`NC-<numéro facture>`). Les avoirs partiels et le remboursement bancaire ne sont pas automatisés.
- Réception des factures et avoirs, consultation, PDF/XML, suivi vérifiée/à contester/payée. Ce suivi ne déclenche aucun paiement ni envoi d’une contestation au fournisseur.
- Codes de réponse affichables AB/IP/UQ/CA/RE/AP/PD, uniquement s’ils sont réellement reçus et corrélés. Recommand documente notamment les Message Level Responses AB/AP/RE ; cela ne garantit pas la réception de l’ensemble des Invoice Responses Peppol.
- Recherche, filtres et pagination ; indicateurs calculés par devise ; avoirs déduits. Historique affiché limité aux 200 événements les plus récents, données plus anciennes conservées en base.
- Actualisation des notifications dans l’onglet ouvert toutes les 60 secondes. Sans navigateur ouvert, les webhooks continuent d’archiver les documents côté serveur. Pas de notification système ni d’e-mail ajouté.
- Pas de déclaration « 100 % opérationnel en production » tant qu’un cycle réel de playground (envoi, réception, webhook signé, réconciliation, avoir, erreur, téléchargement) n’a pas été vérifié avec l’entreprise configurée et que son activation n’est pas confirmée.

## État de livraison au 13 octobre 2026

- Les trois migrations sont appliquées au projet Supabase lié et les fonctions `peppol` / `peppol-webhook` sont déployées avec leur dernière version.
- Les 51 tests automatisés passent, ainsi que les contrôles navigateur des douze thèmes et du mobile. Les appels déployés sans connexion ou sans signature sont refusés (HTTP 401).
- L’interface est modifiée dans le dépôt local ; elle n’a pas encore été publiée sur le site. Le test historique est conservé et la configuration réutilise les secrets existants.
- Le cycle réel avec une session utilisateur playground connectée reste à vérifier : envoi, livraison, réception, webhook signé, téléchargement et avoir. Les tests simulés ne prouvent pas ce cycle réel.

## Vérifications

`node --test tests/*.test.cjs` : tests existants + contrats et sécurité Peppol (clé existante, statuts, TVA, signatures, accès, doublons, timeout et réception idempotente).

`node tests/peppol-browser.cjs` : navigateur headless avec données **fictives**, aucun réseau Supabase/Recommand. Nécessite Playwright. Vérifie les douze thèmes, mobile, recherche, pagination, échappement des champs fournisseur et confirmation sans envoi. Captures dans `output/peppol/`.

`tests/peppol-migration-check.sql` : test initial transactionnel (création des objets, invariants et privilèges, puis ROLLBACK), à utiliser sur une base sans le module installé. Ne pas exécuter comme migration en production après installation.

## Sources officielles consultées le 12 octobre 2026

- [Plateformes belges, envoi et réception](https://docs.recommand.eu/getting-started/belgium/platform/sending-and-receiving)
- [Envoi](https://docs.recommand.eu/reference/sending/send-document)
- [Réception, XML/PDF et pagination](https://docs.recommand.eu/docs/receiving-documents)
- [Signature et événements webhook](https://docs.recommand.eu/docs/working-with-webhooks)
- [Vérification d’un destinataire](https://docs.recommand.eu/reference/recipients/verify-recipient)
- [Notes de crédit](https://docs.recommand.eu/docs/sending-credit-notes)
- [Motifs d’exonération](https://docs.recommand.eu/reference/models/vat-totals-auto-calculation)
