# Déploiement d’ARCHIVIA sur Vercel

## Architecture

Cette démonstration utilise uniquement Next.js et les technologies frontend incluses dans le dossier `frontend/`. Elle ne contient pas de backend Python, de route API dédiée, de base de données ni de stockage distant. Il n’y a aucun service externe à configurer et aucune variable d’environnement à renseigner.

Les données de démonstration sont enregistrées dans le `localStorage` du navigateur. Chaque navigateur dispose de ses propres changements, non partagés avec les autres visiteurs. Les fichiers importés sont gardés en mémoire dans l’onglet et ne sont pas téléversés.

## Déploiement

1. Importer le dépôt Git dans un projet Vercel.
2. Dans **Project Settings → Build and Deployment**, définir `frontend` comme **Root Directory**.
3. Garder le preset **Next.js** et les commandes de build détectées automatiquement.
4. Ne pas ajouter de variables d’environnement pour cette démo.
5. Cliquer sur **Deploy**. Vercel construit et héberge l’application Next.js.
6. Ouvrir l’URL `https://<projet>.vercel.app` attribuée par Vercel et tester la sélection de profil ainsi que les modules.

Après chaque modification, pousser le commit sur la branche configurée ou déclencher un nouveau déploiement depuis Vercel. Les environnements Preview conviennent aux essais; utiliser le domaine Production pour la présentation finale.

## Exécution locale

Depuis le dossier `frontend/` :

```powershell
npm install
npm run dev
```

Commandes de vérification avant déploiement :

```powershell
npm run lint
npm run typecheck
npm run build
```

## Limites et évolution

Ce déploiement est une démo navigateur, pas une GED de production. Les profils ne sont pas authentifiés, les rôles ne sont pas des contrôles d’accès, et les informations du `localStorage` peuvent être modifiées par l’utilisateur. Ne pas saisir de documents confidentiels ni de données personnelles.

Pour partager les données entre utilisateurs ou protéger des documents, une prochaine version devra relier Next.js à une persistance distante avec authentification, autorisations côté serveur et stockage privé. Cela nécessitera alors des ressources externes et des variables d’environnement, mais n’est pas requis pour cette démo Vercel.

**Aucune URL Vercel n’est annoncée ici :** aucun compte ou déploiement n’a été configuré ni vérifié depuis le dépôt.
