# Les Petits Horizons — démonstration d’école

Le site de l’école est servi directement sous `https://orbytek.be/ecole/index.html`.
La carte et le lien du portfolio dans `../creations.html` pointent vers ce fichier.

Les trois fichiers `index.html`, `style.css` et `app.js` sont les sources statiques
d’origine, reprises sans modification visuelle ou fonctionnelle du commit
`bacbd3baa2943e111df28fbafab0960a13ad144c` du projet Sites
`appgprj_6ac65487cf0c8191a82b4841f0dfcb5d`.

Aucun build ni backend n’est nécessaire. Les ressources CSS/JS sont relatives et
les pages utilisent des fragments (`#ecole`, `#parents`, `#contact`, etc.).
Les photos d’illustration et les polices sont chargées depuis Unsplash et Google Fonts.
L’école est fictive ; les formulaires prévisualisent les saisies sans envoi ni stockage.

Prévisualisation depuis la racine du dépôt :
`node premium-sites/scripts/serve.mjs`, puis `http://127.0.0.1:4173/ecole/index.html`.
