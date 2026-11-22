# ARCHIVIA

**Votre patrimoine documentaire, organisé et sécurisé.**

ARCHIVIA est une démonstration commerciale d’une plateforme universelle de gestion documentaire et d’archivage électronique et physique. Le projet est conçu pour être déployé simplement sur Vercel : il utilise uniquement Next.js, React et TypeScript. Aucun serveur Python, API externe, base de données ou secret n’est requis.

> **Mode démo uniquement :** les dossiers, documents (métadonnées), prêts, décisions et activités sont conservés dans le `localStorage` du navigateur. Les profils et permissions sont fictifs et ne sécurisent pas l’accès. Les changements ne sont pas partagés entre navigateurs ou visiteurs. Ne pas utiliser avec des informations réelles ou sensibles.

## Contenu

- `frontend/` : application Next.js App Router, TypeScript, Tailwind CSS, Recharts et Lucide React.
- `documentation/deployment.md` : déploiement sur Vercel.
- `documentation/demo-guide.md` : parcours de présentation et limites de la démo.

## Lancer localement

Prérequis : Node.js 22 ou version compatible avec Next.js 16 et npm.

```powershell
Set-Location frontend
npm install
npm run dev
```

Ouvrir http://localhost:3000 et choisir un profil fictif. Les données de chaque organisation sont stockées séparément dans le navigateur. Le bouton « Réinitialiser les données » restaure le jeu de présentation de l’espace courant.

L’import de démonstration accepte PDF, JPEG, PNG et TIFF jusqu’à 20 Mo. Le fichier reste temporaire en mémoire dans l’onglet et n’est pas envoyé sur Internet; les métadonnées sont enregistrées localement.

## Contrôles

Depuis `frontend/` :

```powershell
npm run lint
npm run typecheck
npm run build
```

## Déployer sur Vercel

1. Importer le dépôt Git dans Vercel.
2. Choisir `frontend` comme **Root Directory**.
3. Laisser Vercel détecter Next.js et ses commandes de build.
4. Aucune variable d’environnement n’est nécessaire.
5. Déployer, puis ouvrir l’URL fournie par Vercel.

Voir le [guide Vercel](./documentation/deployment.md) et le [parcours de démonstration](./documentation/demo-guide.md). Aucun déploiement ou domaine Vercel n’a été créé dans ce dépôt.
