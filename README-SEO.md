# Orbytek — Améliorations SEO et suivi

Date : 6 octobre 2026. Travail effectué dans les fichiers locaux du site.

## Résultat

### Stabilisation du chargement — 7 octobre 2026

Le rapport PageSpeed Insights de l’accueil en ligne indiquait un CLS ordinateur de 0,228, dont 0,226 associé au bloc d’accueil, et signalait les polices Inter et Space Grotesk. Les neuf pages utilisant le sélecteur d’apparence incluent désormais ses boutons dans le HTML initial ; le script active les contrôles existants au lieu de les ajouter après chargement. L’espace du bouton d’animation est réservé dès le départ. Les polices Google utilisent `display=optional` : une police arrivée trop tard ne remplace pas le texte déjà affiché. Sur une connexion lente, la police de secours peut donc rester utilisée pour cette visite.

Mesure locale via PerformanceObserver : CLS de 0 sur les chargements testés de l’accueil en thème clair et sombre sur ordinateur, et en thème clair sur mobile. Ce test local sans limitation réseau n’est pas comparable directement au test Lighthouse distant ; le nouveau score en ligne reste à mesurer après publication. Détails : `reports/seo/stabilite-chargement.json`. Aperçu : `reports/seo/affichage-stable.jpg`.

### Lien du salon de coiffure

Les deux liens du portfolio vers Maison Élégance utilisent désormais `coiffeur/index.html`, conformément au chemin enregistré dans Git. Le précédent `Coiffeur/index.html` fonctionnait sous Windows mais ne correspondait pas à la casse du dossier publié. La correction doit être publiée pour réparer les liens du site en ligne.

### Formules de suivi mensuel

La page Tarifs présente trois cartes : Essentiel à 29 € HTVA/mois (sauvegarde mensuelle), Pro à 49 € HTVA/mois (sauvegarde hebdomadaire et 1 heure d’intervention) et Business à 99 € HTVA/mois (sauvegarde quotidienne et 2 heures au total). Hébergement, DNS, un domaine .be/.com/.fr et surveillance de disponibilité 24 h/24 sont inclus dès Essentiel. Pro porte le badge « Recommandé » et un bouton mis en avant. Le délai de corrections techniques de 24 heures ouvrées reprend le texte demandé par le propriétaire. Les boutons renvoient au contact. Les cartes s’empilent sur mobile.

### Tarif et icône dans Google

Le tarif du support est confirmé à 59 €/h par le propriétaire. La description SEO de l’accueil et sa description de partage mentionnent ce montant. L’ancienne version de l’accueil indiquait 60 €/h dans sa description, son bandeau de support et le choix du formulaire ; ces mentions ne figurent plus dans les pages locales actuelles.

Le favicon local est bien la planète bleue : PNG et ICO de 64 × 64 px, icône Apple de 180 × 180 px. Les fichiers sont déclarés dans l’accueil et ne sont pas bloqués par robots.txt. Après publication, inspecter `https://orbytek.be/` dans Google Search Console et demander l’indexation. Google doit explorer à nouveau l’accueil et le favicon ; l’affichage de l’icône et la description finale restent à sa discrétion. Le site en ligne n’a pas pu être vérifié lors de ce contrôle.

### Localisation intégrée

Rixensart est maintenant présent dans les titres de l’accueil, de la création de sites et du support. Le Brabant wallon est ciblé dans les titres des applications et des intégrations. Les textes visibles et les données structurées précisent les communes voisines : Waterloo, La Hulpe, Ottignies–Louvain-la-Neuve et Lasne. Aucun sous-menu Services n’est réintroduit.

### Adaptation aux grands écrans

Un lien « Retour en haut ↑ » est ajouté à la fin des sections Services, À propos de Thibaut et Comment ça se passe. Il pointe vers le début de l’accueil, comme le lien du pied de page. La zone cliquable mesure au moins 44 px de haut pour faciliter son utilisation sur mobile.

À partir de 1 101 px, le contenu s’élargit progressivement jusqu’à 1 600 px. La planète grandit avec sa colonne. Les paragraphes de l’accueil et la navigation utilisent des tailles fluides, plafonnées pour conserver une lecture confortable. Les lignes des textes longs restent limitées en largeur. Le titre principal augmente sur les écrans de 1 440 px et plus.

Les règles mobiles sont conservées. Vérification de l’accueil sur ordinateur, tablette et mobile : aucun débordement horizontal aux largeurs testées (390, 820, 1 101, 1 440, 1 920 et 2 560 px). Aperçu : `reports/seo/grand-ecran.jpg`. La version du fichier CSS est actualisée dans les pages pour renouveler son cache après publication.

Le site possède maintenant quatre pages de services et une page consacrée à Facture Facile. L’accueil, les tarifs et le portfolio disposent de titres plus explicites, de descriptions uniques et de liens vers ces contenus. Les données structurées et le sitemap sont complétés. Les logos et le portrait sont servis dans des fichiers WebP plus légers.

L’identité visuelle, la planète animée, les apparences claire et sombre, les principales sections de l’accueil et le fournisseur du formulaire sont conservés. Les ajouts visibles sont les textes corrigés, les liens de services, la FAQ et les nouvelles pages.

**Ces changements ne sont pas encore publiés.** Aucun compte Google, fiche d’établissement, annuaire ou hébergement n’a été modifié. Aucune demande de contact n’a été envoyée pendant les vérifications.

## Informations utilisées et limites

Sources locales : `index.html`, `tarifs.html`, `creations.html`, `CNAME`, le sitemap et les fichiers associés.

- Nom : Orbytek ; interlocuteur : Thibaut Courtois.
- Activités présentes : sites web, applications web, API/intégrations et support informatique.
- Téléphone et e-mail : coordonnées déjà affichées sur le site, conservées.
- Domaine de référence : `https://orbytek.be/`, cohérent avec CNAME et les anciennes canoniques.
- Public : indépendants et entreprises ; les nouvelles pages ciblent les usages de petites structures.
- Langue publiée : français, avec `lang="fr-BE"`. Langues d’échange confirmées : français et anglais, indiquées dans le contact et les données structurées. Le site n’a pas été traduit en anglais.
- L’histoire de Facture Facile et l’expérience annoncée de plus de 15 ans existaient dans l’accueil. Elles n’ont pas été inventées ; elles restent à valider par le propriétaire.
- Les budgets cités viennent de la grille existante. Leur caractère HTVA/TVAC reste à préciser par le propriétaire.

Ville confirmée par le propriétaire : Rixensart. Zone ciblée : Rixensart — Brabant wallon, avec Waterloo, La Hulpe, Ottignies–Louvain-la-Neuve et Lasne comme communes voisines confirmées. Cette zone remplace la précédente mention de Charleroi et Namur. L’adresse privée ne doit pas être publiée ; seule la ville est mentionnée. Le numéro BCE et les modalités de déplacement restent à compléter. Les lieux des démonstrations ne servent pas à localiser Orbytek.

Aucune donnée Search Console, mesure de trafic ou recherche locale détaillée n’a été disponible. Aucun volume de recherche, score de concurrence ou résultat commercial n’est annoncé. Les priorités de mots-clés ci-dessous sont des hypothèses éditoriales.

## 1. Audit local : dix améliorations par impact

| Rang | Constat initial | Intervention ou suite | Impact attendu |
|---|---|---|---|
| 1 | Les trois services principaux étaient des sections de l’accueil, sans pages dédiées dans le sitemap | Création de pages distinctes et lien depuis chaque carte | Meilleure correspondance avec les recherches de services |
| 2 | H1 de l’accueil : « Votre projet web commence ici » | « Sites web et applications sur mesure » | Offre immédiatement identifiable |
| 3 | Les cartes de services n’avaient pas de lien vers une explication détaillée | Liens vers les nouveaux contenus, les tarifs et le contact | Navigation et demandes mieux préparées |
| 4 | Plusieurs textes contenaient « Un Simplicité » | Correction du sous-titre, du support et du titre À propos | Crédibilité et lisibilité |
| 5 | Pas de FAQ dans l’accueil | Questions sur budget, préparation, délais et suivi ; FAQ par service | Réponses aux objections avant contact |
| 6 | Facture Facile était présenté dans le portfolio et dans l’histoire personnelle, sans page explicative | Page de projet personnel et familial, sans résultats inventés | Preuve de démarche et de compétences |
| 7 | La description du portfolio était longue et les titres de pages peu précis | Titles et descriptions uniques sur les huit pages publiques | Meilleure compréhension du sujet de chaque page |
| 8 | Les logos et le portrait utilisaient de gros PNG | Copies WebP, originales conservées, changement des références et du sélecteur de thème | Moins de données à charger |
| 9 | Sitemap limité à trois pages ; pas de JSON-LD sur les pages principales | Huit URL ; Organization, Person, WebSite, WebPage, Service et fils d’Ariane | Description structurée et découverte des pages |
| 10 | Accueil : support à 60 €/h ; tarifs : 59 €/h ; certains aperçus indexables | Accueil renvoie à la grille sans répéter un montant ; aperçu interne en noindex | Cohérence commerciale et séparation des aperçus |

L’accès externe et l’indexation Google restent à contrôler après publication. L’échec d’accès rencontré par l’outil de navigation web ne prouve pas une panne publique du site.

## 2. Pages et requêtes travaillées

| Fichier | Sujet principal publié | Cible locale |
|---|---|---|
| `index.html` | Sites web et applications sur mesure ; marque Orbytek | Développeur web freelance Rixensart |
| `creation-sites-web.html` | Création de sites web pour indépendants | Création site web Rixensart |
| `applications-sur-mesure.html` | Applications web sur mesure pour PME | Développement application web PME Brabant wallon |
| `integrations-automatisations.html` | Intégrations API et automatisations PME | Automatisation PME Brabant wallon |
| `support-informatique.html` | Support et assistance informatique | Support informatique indépendant Rixensart |
| `creations.html` | Portfolio de projets et démonstrations | Recherches de marque et preuve |
| `projet-facture-facile.html` | Projet de facturation Facture Facile | Projet de facturation sur mesure |
| `tarifs.html` | Prix et conditions des services | Tarifs site web indépendant |

Les titres, descriptions, H1, introductions et H2 sont intégrés directement dans ces fichiers, et non laissés sous forme de maquettes. Les sections À propos, méthode et contact restent dans l’accueil afin de préserver sa navigation.

Maillage : accueil → services → tarifs/portfolio/contact ; application → Facture Facile ; Facture Facile → application ; tarifs → services. Les nouvelles pages proposent des services complémentaires. Toutes les nouvelles pages restent accessibles par des liens HTML, sans dépendre de JavaScript.

Il n’y a pas de pages clonées par commune. Une future page locale doit apporter des informations ou des projets propres à la zone, conformément aux [règles Google sur les pages satellites](https://developers.google.com/search/docs/essentials/spam-policies).

## 3. Réserve de 48 mots-clés

Les requêtes utilisent désormais Rixensart comme ville de base et le Brabant wallon comme région principale. Tester ensuite les variantes Waterloo, La Hulpe, Ottignies–Louvain-la-Neuve et Lasne selon les recherches observées, sans créer de pages locales dupliquées. Garder les niches réellement souhaitées. Les noms d’outils sont des pistes de contenu, pas des compétences ajoutées aux pages.

P1 = intention commerciale précise, concurrence potentiellement plus accessible mais non mesurée. P2 = comparaison. P3 = information à traiter après les pages commerciales. La précision peut aussi signifier une demande très faible : valider les recherches avant d’y consacrer beaucoup de temps.

### Sites web — 16 requêtes

| Requête | Intention | Priorité |
|---|---|---|
| devis site vitrine indépendant Rixensart | Devis | P1 |
| création site web artisan Rixensart | Devis | P1 |
| création site internet restaurant Rixensart | Devis | P1 |
| création site web profession libérale Rixensart | Devis | P1 |
| développeur freelance site vitrine Rixensart | Devis | P1 |
| refonte site web PME Brabant wallon | Devis | P1 |
| création site web bilingue PME Brabant wallon | Devis | P1 si proposé |
| devis site internet petite entreprise Brabant wallon | Devis | P1 |
| prix site vitrine indépendant Belgique | Comparaison | P2 |
| freelance ou agence site web Rixensart | Comparaison | P2 |
| WordPress ou site sur mesure PME Belgique | Comparaison | P2 |
| coût refonte site restaurant Belgique | Comparaison | P2 |
| que prévoir avant de créer un site artisan Belgique | Information | P3 |
| délai création site vitrine indépendant Belgique | Information | P3 |
| quelles pages pour un site profession libérale Belgique | Information | P3 |
| site français néerlandais PME Belgique | Information | P3 |

### Applications — 16 requêtes

| Requête | Intention | Priorité |
|---|---|---|
| développeur application web PME Rixensart | Devis | P1 |
| devis application métier PME Brabant wallon | Devis | P1 |
| développeur freelance portail client Rixensart | Devis | P1 |
| développement outil de gestion artisan Brabant wallon | Devis | P1 |
| création application planning PME Rixensart | Devis | P1 |
| développement application devis PME Brabant wallon | Devis | P1 |
| application web sur mesure profession libérale Brabant wallon | Devis | P1 |
| développeur application gestion commandes Rixensart | Devis | P1 |
| prix application métier PME Belgique | Comparaison | P2 |
| logiciel existant ou application sur mesure PME Belgique | Comparaison | P2 |
| no code ou développement sur mesure PME Belgique | Comparaison | P2 |
| application web ou mobile petite entreprise Belgique | Comparaison | P2 |
| remplacer Excel par application PME Belgique | Information | P3 |
| comment créer un portail client PME Belgique | Information | P3 |
| préparer cahier des charges application métier PME | Information | P3 |
| maintenance application sur mesure PME Belgique | Information | P3 |

### Intégrations — 16 requêtes

| Requête | Intention | Priorité |
|---|---|---|
| freelance automatisation PME Rixensart | Devis | P1 |
| intégration API logiciel métier PME Brabant wallon | Devis | P1 |
| automatiser formulaire site vers CRM Rixensart | Devis | P1 |
| synchronisation CRM facturation PME Brabant wallon | Devis | P1 |
| développeur connexion API PME Rixensart | Devis | P1 |
| automatisation devis factures artisan Brabant wallon | Devis | P1 |
| connexion site web outil de réservation Rixensart | Devis | P1 |
| automatisation suivi prospects profession libérale Brabant wallon | Devis | P1 |
| prix intégration API PME Belgique | Comparaison | P2 |
| Make ou intégration API sur mesure PME | Comparaison | P2 |
| Zapier ou Make petite entreprise Belgique | Comparaison | P2 |
| connecteur standard ou API sur mesure CRM PME | Comparaison | P2 |
| comment relier formulaire site web et CRM | Information | P3 |
| automatiser double saisie PME Belgique | Information | P3 |
| pourquoi synchronisation CRM facturation échoue | Information | P3 |
| quelles tâches automatiser petite entreprise Belgique | Information | P3 |

Éviter comme objectifs initiaux : « création site web », « agence web Belgique », « développeur web », « développement application », « automatisation » et « WordPress ». Ces expressions sont larges ; leur concurrence est présumée plus forte, sans mesure locale à ce stade. Elles peuvent rester dans le texte naturel.

Choisir d’abord deux ou trois P1 par service. Examiner les résultats dans la zone et la langue concernées, puis ajuster avec les impressions et les requêtes Search Console. Ne pas créer une page pour chaque variante de mot-clé.

## 4. Données structurées

Le JSON-LD est statique dans le HTML. Il utilise les coordonnées existantes et ne contient ni adresse inventée, ni avis, ni chiffre de résultat. L’accueil définit Organization, Person et WebSite. Les pages de services décrivent Service et WebPage ; les nouvelles pages et les pages Tarifs/Créations possèdent un BreadcrumbList.

Organization convient à la description disponible, sans prétendre à un établissement physique connu. [Documentation Google Organization](https://developers.google.com/search/docs/appearance/structured-data/organization).

Le choix confirmé est de garder l’adresse privée masquée. Le balisage reste donc Organization et Service, sans adresse postale. ProfessionalService est [déprécié dans Schema.org](https://schema.org/ProfessionalService). La présence de JSON-LD ne garantit pas un affichage enrichi ou une progression de classement.

Modèle Organization sans adresse privée, à compléter si nécessaire :

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://orbytek.be/#organization",
  "name": "Orbytek",
  "legalName": "[NOM LÉGAL]",
  "url": "https://orbytek.be/",
  "description": "[DESCRIPTION CONFORME À L’ACTIVITÉ]",
  "logo": "https://orbytek.be/orbytek-logo-light.webp",
  "telephone": "+32479824183",
  "email": "Thibaut@orbytek.be",
  "identifier": {
    "@type": "PropertyValue",
    "propertyID": "BCE",
    "value": "[NUMÉRO BCE]"
  },
  "areaServed": {
    "@type": "AdministrativeArea",
    "name": "Rixensart et le Brabant wallon, Waterloo, La Hulpe, Ottignies-Louvain-la-Neuve et Lasne"
  },
  "founder": {
    "@type": "Person",
    "name": "Thibaut Courtois"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "telephone": "+32479824183",
    "availableLanguage": ["fr", "en"]
  },
  "sameAs": ["[URL PROFIL OFFICIEL]"]
}
```

Supprimer les propriétés inconnues et les placeholders avant publication. Ne pas ajouter d’adresse privée au JSON-LD : ces données sont publiques, même si aucune adresse n’est affichée visuellement.

## 5. SEO local : actions à effectuer dans les comptes

- [x] Ville et zone ciblée confirmées : Rixensart — Brabant wallon ; communes voisines : Waterloo, La Hulpe, Ottignies–Louvain-la-Neuve et Lasne.
- [x] Langues proposées confirmées : français et anglais, intégrées au site.
- [ ] Préciser les modalités de déplacement : déplacement chez les clients, prise en charge à distance et éventuels frais.
- [ ] Vérifier l’éligibilité Google Business Profile : accueil réel de clients ou déplacements chez eux ; une activité exclusivement en ligne n’est pas éligible.
- [ ] Si éligible, revendiquer et vérifier une seule fiche pour l’activité.
- [ ] Utiliser « Orbytek » sans ajout artificiel de mots-clés dans le nom.
- [ ] Choisir la catégorie disponible correspondant au service principal ; compléter les services.
- [x] Préférence confirmée : ne pas publier l’adresse privée sur le site ou la fiche Google.
- [ ] Si la fiche Google est éligible, y appliquer le masquage de l’adresse et définir la zone de service réelle. Cette modification du compte Google n’a pas encore été effectuée.
- [ ] Renseigner des modalités et disponibilités exactes, avec des photos authentiques.
- [ ] Vérifier téléphone, e-mail, URL et nom dans les différentes présences publiques.

Ces règles viennent des [consignes Google Business Profile](https://support.google.com/business/answer/3038177?hl=fr). Ne pas utiliser un bureau fictif pour obtenir une fiche.

Présences belges à contrôler : [Pages d’Or](https://www.pagesdor.be/) pour une fiche gratuite ; [BCE/SPF Économie](https://economie.fgov.be/fr/themes/entreprises/banque-carrefour-des/services-pour-tous/consultation-et-recherche-de) pour l’exactitude des données officielles ; annuaire gratuit de la commune et profil d’un réseau professionnel dont Orbytek est réellement membre. La BCE est un registre, pas une inscription destinée à fabriquer un lien SEO. Ne pas acheter de liens ou multiplier les annuaires sans audience.

### Avis clients

Demander un avis après une livraison ou une étape significative, sans sélectionner uniquement les clients satisfaits. Fournir le lien direct, ne proposer aucune contrepartie et faire au maximum une relance courtoise. Répondre aux avis sans divulguer d’informations privées. [Conseils Google](https://support.google.com/business/answer/3474122?hl=fr).

Message à envoyer personnellement :

> Bonjour [PRÉNOM], merci pour votre confiance sur [PROJET]. Si vous souhaitez partager votre expérience avec Orbytek, vous pouvez laisser un avis ici : [LIEN]. Votre retour sur le déroulement du projet et la solution livrée aidera les personnes qui envisagent de travailler avec moi. Merci !

## 6. Preuves et modèles réutilisables

La page Facture Facile documente un projet personnel et familial. Les autres exemples du portfolio ne sont pas automatiquement présentés comme des missions clients. Aucun témoignage n’a été créé.

### Prochaine étude de cas

1. Contexte : [CLIENT OU SECTEUR], [UTILISATEURS], [OUTILS].
2. Problème : [DIFFICULTÉ CONCRÈTE], avec les mots du client.
3. Contraintes : [PÉRIMÈTRE], [DÉLAI], [ACCÈS], [DÉPENDANCES].
4. Intervention : [TON RÔLE EXACT], y compris les contributions d’autres personnes.
5. Solution : [FONCTIONNEMENT] et raisons des choix.
6. Résultat : [MESURE], [SOURCE], [PÉRIODE] ; sinon décrire une fonction livrée sans gain chiffré.
7. Illustration et témoignage : uniquement avec autorisation et texte exact.
8. Suite : limites, suivi, évolutions et lien vers le service concerné.

Introduction : « [CLIENT OU SECTEUR] avait besoin de [BESOIN]. Mon intervention a porté sur [PÉRIMÈTRE]. Voici les contraintes rencontrées, la solution livrée et [RÉSULTAT DOCUMENTÉ OU USAGE CONSTATÉ]. »

### À propos

La section existante est conservée avec le vrai portrait et le parcours déjà écrit. Pour la compléter :

> Je suis Thibaut Courtois, indépendant derrière Orbytek. J’accompagne [CIBLE CONFIRMÉE] depuis Rixensart sur des projets de sites web, d’applications et de connexion entre outils. Mon parcours comprend [EXPÉRIENCE VÉRIFIABLE]. Ma façon de travailler : [PRATIQUE CONCRÈTE], [MODALITÉS D’ÉCHANGE] et [SUIVI RÉELLEMENT PROPOSÉ].

Ne pas publier les champs entre crochets. La zone et les langues sont maintenant confirmées. Présenter les compétences utiles au client plutôt qu’une liste de technologies sans explication.

Dans le portfolio, ajouter pour chaque projet : nature réelle (mission, projet personnel ou démonstration), besoin, contribution et lien vers le service. Pour un témoignage : accord de publication, propos exacts, auteur et projet si autorisés.

## 7. Quinze idées d’articles

Ces sujets constituent une réserve, pas quinze articles à publier immédiatement. Aucun blog vide n’a été ajouté au site. Commencer par un ou deux sujets liés au service le plus important commercialement, avec de vrais exemples.

| Article | Requête visée |
|---|---|
| Combien coûte un site vitrine pour un indépendant belge ? | prix site vitrine indépendant Belgique |
| Ce qu’un devis de site web doit préciser | comparer devis création site web |
| Combien de temps faut-il pour créer un site ? | délai création site vitrine |
| Quels contenus préparer avant de commencer ? | contenus à fournir création site web |
| WordPress ou site sur mesure : comment choisir ? | WordPress ou site sur mesure PME |
| Refaire son site ou améliorer l’existant ? | refonte site web ou amélioration |
| Site français et néerlandais : quoi prévoir ? | site web bilingue Belgique |
| À qui appartiennent le domaine, le site et les accès ? | propriété site web prestataire |
| Quand un fichier Excel ne suffit plus | remplacer Excel application PME |
| Logiciel existant ou application sur mesure ? | logiciel existant ou sur mesure PME |
| Préparer un cahier des charges sans être technicien | cahier des charges application métier |
| Combien coûte une application après sa livraison ? | coût maintenance application sur mesure |
| Relier un formulaire de contact à un CRM | connecter formulaire site CRM |
| Que peut-on automatiser dans une petite entreprise ? | automatisation tâches petite entreprise |
| Intégration API : budget, accès et erreurs à anticiper | prix intégration API PME |

## 8. Technique et images

Copies WebP créées avec conservation de la transparence des logos et des originaux :

| Usage | Fichier original utilisé avant | Poids original | Nouvelle copie | Poids |
|---|---|---:|---|---:|
| Logo clair | `orbytek-logobck.png` | 422 206 octets | `orbytek-logo-light.webp` | 31 748 octets |
| Logo sombre | `orbytek-logo-dark.png` | 1 134 335 octets | `orbytek-logo-dark.webp` | 16 590 octets |
| Portrait | `thibaut-courtois.png` | 1 976 525 octets | `thibaut-courtois.webp` | 39 994 octets |

Le script de changement de thème utilise les nouveaux logos. Les dimensions HTML du portrait, le chargement différé et le décodage asynchrone sont conservés. Les pages ajoutées n’incluent pas le moteur d’animation de la planète puisqu’elles n’en affichent pas.

Les préconnexions des polices ont été ajoutées aux pages publiques. Les huit pages publiques possèdent chacune un title ≤ 60 caractères, une description ≤ 155 caractères, un H1 et une canonique cohérente. Ces longueurs sont des limites éditoriales, pas une garantie d’affichage Google. [Titles](https://developers.google.com/search/docs/appearance/title-link), [descriptions](https://developers.google.com/search/docs/appearance/snippet).

Les sept aperçus `creation-preview-*.html` et la page de remerciement sont en `noindex,follow` et absents du sitemap. Le robots.txt laisse leur exploration possible : Google doit pouvoir lire la directive noindex. [Documentation Google](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

Les sites de démonstration dans les sous-dossiers n’ont pas été refondus. Leur statut public/indexation reste à examiner séparément si nécessaire ; les trois exports premium étaient déjà en noindex.

À vérifier sur l’hébergement après publication :

- [ ] HTTPS valide et absence de contenu mixte.
- [ ] Redirection de www vers la version sans www, si cette version est confirmée.
- [ ] Cohérence entre `/`, `/index.html` et la canonique de l’accueil.
- [ ] Pages publiques accessibles avec un statut HTTP 200.
- [ ] Aucune directive noindex involontaire ni blocage Googlebot.
- [ ] Compression et cache des fichiers statiques configurés.
- [ ] Sitemap accessible et soumis dans Search Console.
- [ ] Inspection Google de l’accueil et des quatre services.
- [ ] Validation avec [Schema.org](https://validator.schema.org/) et le [test Google](https://search.google.com/test/rich-results).
- [ ] Mesure mobile avec PageSpeed Insights puis données réelles lorsque disponibles.
- [ ] Réception réelle du formulaire FormSubmit, après activation côté destinataire.

Aucun score Lighthouse ou gain de chargement n’a été mesuré. Les seuils Google de référence sont LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 au 75e percentile. Ce ne sont pas des résultats d’Orbytek. [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals).

## 9. Vérifications effectuées

Contrôle statique réussi : huit pages du sitemap, unicité et longueur des métadonnées, un H1 par page, canoniques, absence de noindex sur les pages publiques, JSON-LD analysable, URL Open Graph, IDs uniques, 264 références locales (liens et fichiers), ancres et dimensions des images. Les pages exclues attendues sont contrôlées en noindex.

Commande reproductible, avec Python 3.9 ou plus :

```powershell
python scripts/check-seo.py
```

Si Python n’est pas dans PATH, utiliser son chemin installé. Ce contrôle n’a aucune dépendance externe. Il ne valide pas à lui seul toutes les règles Google relatives aux données structurées.

Vérifications navigateur : huit pages ouvertes à une largeur mobile de 390 px, sans débordement horizontal détecté et sans image chargée en erreur. Accueil et page de création examinés visuellement ; passage du service vers le contact vérifié ; formulaire ouvert et fermé sur mobile. Le changement clair/sombre charge les nouveaux logos et la FAQ s’ouvre correctement. L’envoi externe n’a pas été effectué.

Résultats et captures : [contrôles mobile](reports/seo/mobile-checks.json), [accueil](reports/seo/accueil.jpg), [service mobile](reports/seo/service-mobile.jpg).

## 10. Plan de suivi sur 90 jours

Hypothèse de capacité : environ trois heures par semaine, à adapter à la disponibilité réelle. Les durées sont des estimations de travail et non des résultats attendus.

| Période après livraison | Tâches ordonnées | Temps estimé |
|---|---|---:|
| Semaine 1 | Valider zone, langues, chiffres existants et tarif support ; relire les nouveaux contenus | 2 h |
| Semaine 2 | Publier, vérifier HTTPS/URL/formulaire ; connecter Search Console et soumettre le sitemap | 3 h |
| Semaine 3 | Inspecter les pages, choisir les premiers mots-clés locaux et adapter les services | 3 h |
| Semaine 4 | Examiner l’éligibilité Google Business Profile et compléter la fiche si possible | 2–3 h |
| Semaine 5 | Vérifier les coordonnées publiques et quelques annuaires pertinents | 1–2 h |
| Semaine 6 | Ajouter une autre réalisation documentée et distinguer les démonstrations | 3 h |
| Semaine 7 | Demander des avis aux clients concernés et préparer un premier article | 2–3 h |
| Semaine 8 | Publier l’article, ajouter les liens vers le service correspondant | 3 h |
| Semaine 9 | Analyser Search Console et les premiers contacts ; améliorer une page | 2 h |
| Semaine 10 | Mesurer la vitesse publique et traiter le principal problème réel | 2–3 h hors incident complexe |
| Semaine 11 | Rédiger un second article selon les questions commerciales observées | 3 h |
| Semaine 12 | Publier, vérifier les liens, enrichir les réponses des services | 2 h |
| Semaine 13 | Bilan et choix du prochain trimestre | 2 h |

Si une correction technique demande davantage de temps, reporter le second article. Les pages commerciales et les preuves restent prioritaires.

À relever au départ, puis aux jours 30, 60 et 90 : impressions, clics et positions moyennes par page/requête ; distinguer marque Orbytek et recherches de services. Comparer des périodes de même durée. La position moyenne n’est pas un rang fixe universel.

Tenir un tableau des demandes effectivement reçues : date, page/source si connue, besoin, qualification, devis et mission obtenue. Un clic sur un bouton n’est pas une demande reçue. Aucun objectif chiffré n’est fixé sans situation initiale.

## Publication et maintenance

Publier les HTML modifiés et nouveaux, `seo.css`, `appearance.js`, les trois WebP, le sitemap et les aperçus modifiés ensemble avec les fichiers existants. Les PNG originaux restent disponibles pour d’autres usages. Pas de nouvelle dépendance JavaScript à installer.

Prévisualisation locale :

```powershell
node premium-sites/scripts/serve.mjs
```

Puis ouvrir `http://localhost:4173/`.

`Set-SiteUrl.ps1` inclut maintenant les huit pages et maintient leurs canoniques, URL de partage et JSON-LD lorsqu’il remplace une base existante. Pour un changement de domaine, contrôler aussi CNAME, les pages hors sitemap et la redirection du formulaire. Ne pas le lancer sur une URL temporaire avant une publication de production.

Points encore à compléter : [MODALITÉS DE DÉPLACEMENT], [BCE], [HTVA/TVAC], [TARIF SUPPORT CONFIRMÉ], [TEMPS SEO HEBDOMADAIRE]. Langues confirmées : français et anglais. Adresse privée à garder masquée. Aucun de ces placeholders n’a été publié dans les pages commerciales.
