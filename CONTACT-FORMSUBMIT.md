# Formulaire actuellement actif : FormSubmit

Le site actuel utilise FormSubmit.co et FormSubmit.io. Les fonctions Supabase/Resend du dépôt ne sont pas le formulaire actif.

## Retour direct à la confirmation

Pour le formulaire Orbytek `4382ad7d-2454-4cc2-bf13-3991d13cc309`, ouvrir son édition dans le tableau de bord FormSubmit.io. Dans l'étape finale, champ **After submitting**, enregistrer :

```
https://test.orbytek.be/merci.html
```

Ce champ correspond au réglage `successUrl` du prestataire. Laisser ce champ vide utilise sa page de confirmation par défaut, qui ne peut pas communiquer le succès au site Orbytek.

Le POST natif s'effectue dans un cadre masqué ; lorsqu'il revient réellement à `merci.html`, le script de cette page avertit le formulaire, qui vérifie l'origine et le cadre puis navigue directement vers `merci.html` dans la fenêtre principale. Les champs ne sont jamais considérés comme reçus uniquement parce que le cadre a chargé une page. Un succès FormSubmit.co provoque également une navigation directe.

Pour la production, le réglage After submitting doit correspondre à `https://orbytek.be/merci.html`. Un formulaire partagé avec un seul successUrl ne peut pas avoir simultanément deux retours différents selon le domaine : utiliser deux formulaires si staging et production doivent rester actifs en parallèle avec cette confirmation. Ne pas modifier le formulaire Chauffage Dupuis, qui a un autre identifiant.

## Vérifications

- Ouvrir le site HTTPS publié et recharger complètement la page (Ctrl+F5).
- Le paragraphe sur les deux prestataires ne figure plus sous le bouton.
- Confirmer le réglage After submitting, puis tester une demande identifiable.
- Après succès, vérifier l'adresse `/merci.html` et l'illustration.
- Vérifier séparément la présence dans les soumissions et la livraison du mail : la page merci confirme la réception par le prestataire, pas la livraison dans la boîte mail.

L'ouverture directe d'un fichier local n'est pas une preuve que les prestataires accepteront les requêtes du navigateur. Les tests automatisés locaux simulent les réponses ; ils ne valident pas les réglages du compte FormSubmit.io.
