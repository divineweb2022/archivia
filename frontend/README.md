# ARCHIVIA — application Next.js

Ce dossier contient l’application Next.js utilisée par la démonstration ARCHIVIA.

## Développement

```powershell
npm install
npm run dev
```

Ouvrir http://localhost:3000. Pour les vérifications, exécuter `npm run lint`, `npm run typecheck` et `npm run build`.

## Vercel

Dans les paramètres du projet Vercel, choisir `frontend` comme **Root Directory**. Next.js est déjà déclaré dans `package.json`; aucune variable d’environnement n’est nécessaire.

Voir le [guide de déploiement](../documentation/deployment.md) et le [README du projet](../README.md).

La démo conserve les changements localement dans le navigateur; les profils ne sont pas une authentification.
