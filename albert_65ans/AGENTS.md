# Préparation de la BD d’Albert

## Règle permanente pour tous les personnages — confirmée le 22 octobre 2026

- Pour toutes les futures planches, utiliser automatiquement les modèles BD de référence fournis par l’utilisateur pour CHAQUE personnage : planche des 10 expressions et vues debout de face et de profil. L’utilisateur ne doit pas devoir répéter cette consigne.
- Inspecter puis fournir les modèles pertinents comme références à la génération. Conserver leur identité dessinée : visage, forme de tête, coiffure, yeux, lunettes, moustache/barbe, silhouette et proportions. Choisir l’expression adaptée à chaque case et utiliser le profil pour les vues de côté ; ne pas réinventer la tête pour suivre le style d’un décor.
- Les parents de l’utilisateur sont ici Albert et Marianne. Ils possèdent chacun deux versions d’époque : 20–30 ans et âge actuel/2026. Choisir la bonne version selon la scène ; ne pas mélanger leurs traits jeunes et actuels. Chaque version comprend ses expressions et ses vues face/profil. Albert possède aussi un modèle adolescent distinct, à utiliser pour cette période.
- Les modèles locaux d’Albert et Marianne à 20–30 ans sont `output/personnages/albert-20-30-ans-expressions-v1.png`, `output/personnages/albert-20-30-ans-face-profil-en-pied-v1.png`, `output/personnages/marianne-20-30-ans-expressions-v1.png` et `output/personnages/marianne-20-30-ans-face-profil-en-pied-v1.png`. Pour les versions actuelles et les autres personnages, consulter leurs fiches à jour et les références privées locales. Une correction ou un modèle explicitement désigné ensuite par l’utilisateur remplace l’ancienne référence.
- Adapter les poses et les vêtements à l’époque et à l’action sans changer l’identité du modèle. Les photographies documentent les détails historiques et les âges encore dépourvus de modèle. Si le modèle nécessaire manque ou si le choix d’époque est ambigu, le signaler ; aucun remplacement discret par un visage générique.
- Cette règle s’applique aux scènes composées. Pour une demande explicite de transposition fidèle d’une photographie, conserver les visages et la composition de cette photo, conformément à la correction spécifique ci-dessous. Elle n’autorise aucune nouvelle génération de planche ni publication des références privées.

- Avant d’illustrer une personne nommée (Albert, Renaud, etc.), consulter sa fiche dans l’onglet « Personnages de la BD » de l’administration ou dans `characters` de la sauvegarde complète JSON.
- Lire ses indications et inspecter ses photos. Utiliser les photos adaptées à l’âge et à l’époque de la scène comme références pour la génération d’image. Ne pas se fier à un visage inventé dans une première proposition.
- Si la fiche manque, si le nom est ambigu ou si aucune photo n’est disponible, le signaler à l’utilisateur au lieu de prétendre avoir identifié la personne.
- Les fiches sont chargées par `albert_admin_snapshot` (voir `README.md` et `admin.js`). Ne pas publier les exports, photos ou souvenirs privés dans le dépôt ou les fichiers statiques du site.

## Style graphique préféré — choix du 21 octobre 2026

- Ambiance, textures et mise en page : `output/planches/exemples/neuf-ans-en-pension-exemple-v1.png`. Pour les visages, les têtes BD déjà créées et chargées dans les fiches sont prioritaires. Lire `output/planches/STYLE-PREFERE.md`.
- L'utilisateur préfère ce premier rendu de pension : BD franco-belge semi-réaliste, ressemblances fidèles aux photos, proportions naturelles, modelés doux, trait fin, couleurs chaudes, textures détaillées, papier crème et cartouches pâles.
- Ce choix remplace la priorité graphique de l'ancienne planche du vélo et du rendu de pension v2 plus cartoon. Les photographies restent les références d'identité à l'âge de la scène.
- Le choix du style n'autorise pas la génération des autres planches et ne valide pas les détails historiques d'un exemple.

## Modèles BD existants — priorité confirmée le 21 octobre 2026

- Albert adolescent : les deux modèles BD directement fournis le 22 octobre sont désormais prioritaires, dans `output/references-personnages/albert-adolescent-bd/expressions.png` et `face-et-profil.png`. Les inspecter avant usage ; ne plus recréer sa tête à partir d'une photo ou du modèle adulte. Pour le vélo : case 1 surpris, 2 heureux, 6 inquiet, 7 triste. Le pull bleu et les scènes sont conservés. Dernière version : `output/planches/une-elocution-sur-le-velo-v5.png`.

Actualisation du 22 octobre : le relevé `_private/snapshot-velo-2026-10-22.json` contient 19 fiches et 50 images. Il remplace le relevé du 21 octobre pour vérifier la disponibilité des personnages : Arnaud est désormais présent. Les références pertinentes pour le vélo ont été extraites et inspectées dans `output/references-personnages/velo-2026-10-22/`. Ne pas considérer les autres nouvelles images comme inspectées automatiquement.

- Utiliser les têtes, profils et expressions déjà chargés par l'utilisateur dans l'administration. Préserver leur identité dessinée ; adapter le rendu des scènes à ces modèles plutôt que de recréer de nouveaux visages pour imiter un exemple de planche.
- Relevé privé à jour : `_private/snapshot-personnages-2026-10-21.json`. Catalogue local : `output/references-personnages/administration/README.md` et `catalogue.json` (10 fiches, 24 images à ce relevé). Reconsulter les fiches en ligne avant illustration pour prendre les ajouts en compte.
- Choisir le modèle selon l'époque. Albert vers 1975 et Thibaut à 2 et 6 ans sont des photographies. Les versions 2026 sont des références adultes ; adapter les autres âges avec les vraies photos. Margaux est dessinée à 11 mois dans une référence : ne pas l'utiliser telle quelle comme nouveau-née.
- Arnaud n'a pas de fiche dans ce relevé ; signaler une référence manquante avant son illustration. Aucun visage absent ne doit être remplacé discrètement par un modèle générique.

## Parents d'Albert — référence fournie le 22 octobre 2026

- Pour Maurice et Marie-Anne, utiliser en priorité `output/references-personnages/maurice/parents-modele-bd-prioritaire.png`, fourni et identifié par l'utilisateur : Maurice à gauche, Marie-Anne à droite. Cette référence guide leurs visages sur les planches 1 et 2.
- Planche 1, case 3 : conserver au maximum la composition, les poses et les visages de `output/references-personnages/maurice/maurice-piano-atelier-source.jpg`, redressée ; appliquer le dessin BD sans réinventer la scène. Le deuxième homme n'est pas identifié.
- Correction explicite du 22 octobre : pour transposer une photo, conserver les visages photographiés, même si un autre modèle BD du personnage existe. Appliquer uniquement le rendu graphique à la photo source, sans recomposer les mains, outils, personnages ou décors. La source confirmée pour cette case est `output/references-personnages/maurice/maurice-piano-photo-source-confirmee.jpg`. Le rendu séparé `output/planches/01-enfance/01-case3-photo-rendu-bd-v1.png` est une proposition, pas une reproduction garantie à l'identique ; la case 3 de la planche v3 a été rejetée pour ses changements de détails.
- Le rendu séparé a ensuite été validé (« parfait ») et inséré par collage direct dans `output/planches/01-enfance/01-tout-commence-a-couillet-v4.png`. Réutiliser cet asset validé sans le régénérer pour un simple placement.
- Dernière correction du 22 octobre : l'utilisateur confirme finalement un CANARD à bascule en case 6, et retire sa précision temporaire de cheval. La v6 rétablit le canard original à l'identique et conserve la case 3 remplie sans marges de la v5. Dernière page : `output/planches/01-enfance/01-tout-commence-a-couillet-v6.png`.

## Chapitre 5 — corrections explicites du 22 octobre 2026
- Le portrait extrait de la réponse s0q3, nommé thibaut-s0q3-4.jpg (homme au pull bleu avec cravate), représente JEAN-PAUL, pas Albert. Ne jamais l’utiliser comme référence d’Albert. La première génération du kicker utilisant ce portrait a été rejetée pour cette confusion.
- Devoirs : l’enfant est Arnaud. Suie : Thibaut est couvert de suie. Voisine du garage : l’utilisateur autorise une femme blonde.
- Photo du garage fournie : output/references-personnages/chapitre5-2026-10-22/garage-voisins-source.png.
- Aucune planche du chapitre 5 n’était déjà faite au début de cette demande.


## Chapitre 5 - corrections supplémentaires du 22 octobre 2026
- Cheveux d'Albert NOIRS sur toutes les planches composées (sujet interprété : Albert, pas les autres personnages). Conserver la moustache et les coiffures ; les photos transposées fidèlement conservent leurs visages photographiés.
- Téléphone : appliquer les six cases actualisées dans output/planches/scripts/petits-travers.md ; il appelle une cliente. Les dialogues exacts, surprise gênée, paume vers le haut et expressions de râleur sont fournis directement par l'utilisateur.
- Football : intégrer les deux photos privées dans output/references-personnages/chapitre5-2026-10-22/ ; suivre output/planches/scripts/football-thibaut.md. Six cases, parents immédiatement après première case, puis équipe en grande case. Nouvelle tenue sport noire/orange, expression fâchée avec gros yeux pour la réplique en rejeux.


## Planche 1 — ajouts de maison et photo d'enfance, 22 octobre 2026
- Dernière proposition complète : `output/planches/01-enfance/01-tout-commence-a-couillet-v7.png`, huit cases. La v6 reste archivée.
- Case 2 : porte brune et maçonnerie blanche du domicile montré dans la référence ; cartouche « Il grandit à Couillet. ».
- Vue entière de la maison immédiatement après la case 2 : « À la rue du Petit Pige n°8 ». Elle remplace le placement ancien avant la naissance.
- Dernière case : photo d'Albert en 1963 devant le garage transposée en BD, « Les premières photos ». Références privées dans `output/references-personnages/planche1-ajouts-2026-10-22/`.
- Montage direct des cases conservées ; piano, naissance, mère, frères et canard identiques aux pixels de la v6. Script `01-tout-commence-a-couillet-v7-montage.ps1`. Pour de simples déplacements, réutiliser ces assets sans régénérer la page entière.

## Derniers formats des planches 1 et 2
- Planche 1 : v8, grille 2 colonnes x 4 rangées, maison en case 3 et photo ancienne en case 8 chacune de taille classique. Voitures de la vue de maison adaptées aux années 1960. Remplace le format étendu de la v7.
- Son père : v6, titre noir manuscrit sans grand encadré, sur papier crème comme le titre de la planche 1. Les mots SON PÈRE restent inchangés.

Planche 1 : dernière version v9 (01-tout-commence-a-couillet-v9.png), cartouche Les premières photos harmonisé avec les autres cases. Tous les pixels hors de la zone de cette étiquette restent identiques à la v8.


Planche 1 : dernière proposition v10, format 1024 x 1536 identique aux autres planches, huit cases réassemblées proportionnellement sans génération. Remplace le format 1024 x 2048 de la v9.


## Beaumont - nouvelle correction du22octobre2026
- Carrefour : Albert est à la DROITE de l'autre conducteur ; celui-ci freine fort pour le laisser passer. Ancienne position inversée rejetée.
- Case1 : un soir, en allant au kot de thibaut a mons.
- Conserver case3 ; après elle, montrer Albert freinant au milieu de la route ; ancienne case4 du frein à main déplacée en case5, ancienne case5 supprimée.
- Cases6et7 : vitre presque fermée, seulement quelques centimètres en haut. Case6 : grands yeux ronds blancs et pupilles noires centrées pour Albert.
- Case8 : les deux rient. Thibaut2006 ressemble à la photo privée thibaut-2006-photo-source.png (cheveux courts en pointes, sans lunettes ni barbe, polo brun revers blancs), à adapter en BD. Ancienne tête d'écolier rejetée.


Planche 1 : dernière proposition v12, 1024 x 1536, huit images remplissant leurs cases bord à bord. La v10 avec marges intérieures est rejetée, la v11 recadrée abandonnée. V12 prolonge les décors latéraux et recolle les dessins centraux existants ; ces extensions sont graphiques, non documentaires.


Planche 1 : dernière version v13, accent grave rétabli dans premières en case 8 ; format 1024 x 1536 et cases remplies de la v12 conservés.


Planche 1 : dernière version v14 ; tous les cartouches originaux sont placés dans le coin supérieur gauche de leur case, à environ 10 pixels des bords. Format 1024 x 1536 et huit cases remplies. Accent de premières conservé. Déplacement par collage, fonds des anciens emplacements retouchés séparément.

