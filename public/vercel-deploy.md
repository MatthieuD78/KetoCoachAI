# Force Vercel Deployment

## Instructions pour forcer le déploiement Vercel

### Option 1: Via le dashboard Vercel
1. Allez sur https://vercel.com/matthieud78s-projects/keto-coach-ai
2. Cliquez sur "Deployments"
3. Cliquez sur "Redeploy" pour le dernier commit
4. Ou cliquez sur "New Deployment" et sélectionnez le dernier commit

### Option 2: Via les paramètres du projet
1. Dans le dashboard Vercel, allez dans "Settings"
2. Vérifiez "Git Integration"
3. Confirmez que la branch est "main"
4. Vérifiez que le webhook GitHub est actif

### Option 3: Recréer le projet (dernier recours)
Si rien ne fonctionne, recréez le projet Vercel:
1. Supprimez le projet actuel
2. Recréez-le avec le repo GitHub
3. Configurez les variables d'environnement

## Variables d'environnement à configurer
- GOOGLE_API_KEY=AIzaSyBxLrPvUq5O2KI4sfsbMLTF856V8Uf7TUQ
- GEMINI_MODEL=gemini-2.5-flash
- GEMINI_EMBEDDING_MODEL=text-embedding-004
