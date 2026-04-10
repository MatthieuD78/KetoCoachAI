# Guide de Déploiement KetoCoachAI

## Problème Vercel Actuel

Vercel est bloqué sur le commit `7fb63d9` et ignore les nouveaux commits. Voici les solutions :

## Solution 1 : Forcer le déploiement manuel (Recommandé)

### Étape 1 : Via le dashboard Vercel
1. Allez sur https://vercel.com/matthieud78s-projects/keto-coach-ai
2. Cliquez sur l'onglet "Deployments"
3. Trouvez le dernier commit `4e1aa99` ou plus récent
4. Cliquez sur les trois points (···) à côté
5. Sélectionnez "Redeploy"

### Étape 2 : Si le bouton Redeploy n'existe pas
1. Dans le dashboard, cliquez sur "New Deployment"
2. Sélectionnez le repository GitHub
3. Choisissez la branch "main"
4. Sélectionnez le dernier commit manuellement
5. Cliquez sur "Deploy"

## Solution 2 : Reconnecter GitHub

### Étape 1 : Vérifier la connexion Git
1. Allez dans "Settings" > "Git Integration"
2. Vérifiez que le repository est bien connecté
3. Confirmez que la branch est "main"
4. Vérifiez que le webhook GitHub est actif

### Étape 2 : Reconnecter si nécessaire
1. Cliquez "Disconnect Git Repository"
2. Reconnectez le repository GitHub
3. Sélectionnez la branch "main"
4. Configurez les variables d'environnement

## Solution 3 : Variables d'environnement

Configurez ces variables dans le dashboard Vercel :

```
GOOGLE_API_KEY=AIzaSyBxLrPvUq5O2KI4sfsbMLTF856V8Uf7TUQ
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
NODE_ENV=production
```

## Solution 4 : Alternative - Netlify

Si Vercel ne fonctionne pas, déployez sur Netlify :

1. Allez sur https://netlify.com
2. Connectez votre compte GitHub
3. Sélectionnez le repository `KetoCoachAI`
4. Configurez :
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `api`

## Solution 5 : Alternative - GitHub Pages

1. Activez GitHub Pages dans les settings du repo
2. Choisissez la branch `main`
3. Configurez le dossier `public`
4. Les API functions ne fonctionneront pas (statique uniquement)

## Vérification du déploiement

Une fois déployé, testez :
- URL principale : https://keto-coach-ai.vercel.app
- API : https://keto-coach-ai.vercel.app/api/gemini-25-rag-cjs

## Support

Si rien ne fonctionne :
1. Contactez le support Vercel
2. Expliquez le problème de commit bloqué
3. Fournissez l'ID du projet : keto-coach-ai

## Notes importantes

- Le problème est côté Vercel, pas dans votre code
- Tous les commits sont bien sur GitHub
- La configuration `vercel.json` est correcte
- Le dossier `public/` existe et contient les fichiers
