# Formulaire principal Orbytek : deux envois parallèles

## Fonctionnement actuel

`index.html` charge `contact-config.js` et `contact.js`. Une soumission valide
lance immédiatement deux POST indépendants, vers **thibaut@orbytek.be** :

- FormSubmit.co : `https://formsubmit.co/ajax/thibaut@orbytek.be` (fetch AJAX).
- FormSubmit.io : `https://formsubmit.io/f/4382ad7d-2454-4cc2-bf13-3991d13cc309`
  (formulaire natif ciblant une iframe masquée).

Le formulaire .io s'appelle « Orbytek — Contact », distinct du chauffagiste.
Il est activé. Son retour « After submitting » dans le tableau de bord est :
`https://orbytek.be/contact-receipt.html`.

La première confirmation positive affiche l'écran existant `merci.html` en
plein écran dans une iframe. La page qui lance les demandes reste active pour
que le second envoi continue. Les liens de l'écran de remerciement permettent
de quitter cette vue. Un simple HTTP 200 ou un chargement d'iframe ne confirme
jamais une demande.

Pour .co, il faut une réponse HTTP positive avec `success: true` ou `"true"`.
Pour .io, le service refuse la lecture AJAX depuis orbytek.be (CORS). Le POST
natif suit son retour après succès jusqu'à `contact-receipt.html`. Le script
`contact-receipt.js` envoie alors un signal à la fenêtre parente. Le contrôleur
vérifie le type du signal, l'origine du reçu et la fenêtre iframe source avant
d'afficher la confirmation. Aucun nom, e-mail ou message ne transite par postMessage.

Chaque prestataire dispose de 30 secondes. Si les deux échouent ou expirent,
les champs sont conservés pour réessayer. Une même référence accompagne les
deux copies et les nouvelles tentatives sans modification des champs. C'est
une aide au rapprochement, pas une déduplication : les doubles notifications
sont acceptées. Le double clic est bloqué pendant l'envoi.

Le champ piège `website` bloque les soumissions suspectes avant envoi. Chaque
service reçoit aussi son propre champ piège vide. Les protections antispam des
prestataires restent applicables. Aucun secret n'est publié dans le navigateur.
La mention sous le formulaire indique la transmission aux deux prestataires.

## Publication

Publier ensemble les fichiers suivants :

- `index.html`, `styles.css`, `contact.js`, `contact-config.js` ;
- `contact-receipt.html`, `contact-receipt.js` ;
- `merci.html`, `merci.js`, avec `merci.css` déjà présent.

Le reçu doit être accessible à l'URL configurée sur .io. Avant cette publication,
le retour ne peut pas confirmer le parcours navigateur complet. Si le domaine
change, modifier à la fois `ioReceipt` dans la configuration et le retour .io.

Faire ensuite un test identifiable depuis le site publié, vérifier les deux
envois, l'écran de confirmation, la demande .io et les mails reçus.
Une confirmation signifie l'acceptation par au moins un prestataire, pas une
preuve de livraison dans la boîte mail. L'offre gratuite .io regroupe les
notifications dans un récapitulatif différé. .co est utilisé pour la notification
à chaque demande. Si seul .io accepte, l'écran s'affiche sans attendre le mail.

## Vérification du 4 novembre 2026

- Formulaire « Orbytek — Contact » affiché Live.
- Test multipart JSON .io : HTTP 202, `received: true`, identifiant
  `1e0dfa97-9434-4c40-bd8f-5d38752280d4`.
- Lecture AJAX cross-origin refusée : pré-vérification OPTIONS HTTP 400,
  « Disallowed CORS origin ». Le code utilise donc le POST natif.
- Test natif .io : HTTP 303, Location `https://orbytek.be/contact-receipt.html`.
- Dernier test réel .co : erreur Cloudflare 522.
- Réception du mail et parcours complet sur le site publié non vérifiés.

`node --test tests/contact-browser.test.mjs tests/contact.test.mjs` : 21 tests.
Le contrôleur est vérifié avec DOM et réseau simulés : chaque service gagnant,
second envoi encore en cours, pannes, champs conservés, nouvelle tentative,
double clic, honeypot, messages de confirmation d'origine/source incorrectes,
script du reçu et taille du corps keepalive .co. Ces tests n'envoient aucun mail.

## Ancien backend Supabase / Resend

Les fichiers `Facture/supabase/functions/orbytek-contact*`, la migration et les
scripts Resend restent présents, mais le formulaire principal ne les appelle
plus. Cette modification ne déploie, n'active ni ne supprime ces services.
`tests/contact.test.mjs` couvre séparément ce code serveur conservé.
