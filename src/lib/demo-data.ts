export type Organization = {
  id: string;
  name: string;
  sector: string;
  location: string;
  initials: string;
};

export type FolderRecord = {
  id: string;
  reference: string;
  title: string;
  category: string;
  department: string;
  owner: string;
  status: "Ouvert" | "Clôturé";
  confidentiality: string;
  updated: string;
};

export type DocumentRecord = {
  id: string;
  reference: string;
  title: string;
  category: string;
  folderId: string;
  department: string;
  date: string;
  version: string;
  confidentiality: string;
  status: "Archivé" | "En attente" | "Correction demandée";
  fileName: string;
};

export type LoanRecord = {
  id: string;
  folderId: string;
  requester: string;
  service: string;
  due: string;
  status: "En attente" | "En circulation" | "Retourné" | "En retard";
};

export type ActivityRecord = {
  actor: string;
  action: string;
  subject: string;
  time: string;
};

export type DemoState = {
  folders: FolderRecord[];
  documents: DocumentRecord[];
  loans: LoanRecord[];
  activities: ActivityRecord[];
};

export const organizations: Organization[] = [
  { id: "ministere-finances", name: "Ministère des Finances", sector: "Administration publique", location: "Cotonou, Bénin", initials: "MF" },
  { id: "banque-atlantique", name: "Banque Atlantique Démo", sector: "Banque & finance", location: "Cotonou, Bénin", initials: "BA" },
  { id: "hopital-international", name: "Hôpital International Démo", sector: "Santé", location: "Porto-Novo, Bénin", initials: "HI" },
];

export const departments = [
  "Cabinet du ministre",
  "Direction générale du Trésor",
  "Direction générale des Impôts",
  "Direction des Ressources humaines",
  "Direction des Affaires administratives",
  "Direction des Systèmes d'information",
  "Direction du Budget",
];

export const categories = [
  "Correspondance", "Marchés publics", "Ressources humaines", "Finances",
  "Conventions", "Missions", "Projets", "Juridique", "Comptabilité",
  "Patrimoine", "Rapports", "Notes de service",
];

const folderTitles = [
  "Dossier de marché public 2026", "Recrutement — campagne cadres", "Convention de coopération administrative",
  "Suivi budgétaire — exercice 2026", "Contrat fournisseur — équipements", "Mission officielle à Parakou",
  "Projet de modernisation des archives", "Correspondance administrative — T2",
  "Réforme de la chaîne de dépense", "Plan de formation des agents",
];

const documentTitles = [
  "Note de cadrage — exercice 2026.pdf", "Rapport d'exécution trimestriel.pdf",
  "Convention de partenariat signée.pdf", "Procès-verbal de réception.pdf",
  "Bordereau de transmission.pdf", "Décision administrative n° 024.pdf",
  "État récapitulatif des engagements.xlsx", "Compte rendu de mission.pdf",
  "Avis de consultation restreinte.pdf", "Fiche de suivi de projet.pdf",
  "Correspondance — demande d'arbitrage.pdf", "Ordre de service n° 018.pdf",
];

const people = ["A. Adjovi", "M. Hounkpatin", "S. Dossou", "E. Kiki", "R. Azon", "C. Ahouansou"];

export function createDemoState(orgId: string): DemoState {
  const departmentOffset = orgId === "banque-atlantique" ? 1 : orgId === "hopital-international" ? 3 : 0;
  const folderLabels = orgId === "banque-atlantique"
    ? ["Dossier de crédit institutionnel", "Conformité — revue annuelle", "Contrat de financement", ...folderTitles.slice(2)]
    : orgId === "hopital-international"
      ? ["Projet d'équipement biomédical", "Convention de soins", "Gestion des ressources humaines", ...folderTitles.slice(2)]
      : folderTitles;
  const folders = Array.from({ length: 30 }, (_, index): FolderRecord => ({
    id: `${orgId}-folder-${index + 1}`,
    reference: `ARCH-2026-${String(index + 1).padStart(2, "0")}-${String(index + 1).padStart(6, "0")}`,
    title: `${folderLabels[index % folderLabels.length]}${index >= folderLabels.length ? ` — série ${Math.floor(index / folderLabels.length) + 1}` : ""}`,
    category: categories[(index + departmentOffset) % categories.length],
    department: departments[(index + departmentOffset) % departments.length],
    owner: people[index % people.length],
    status: index % 9 === 0 ? "Clôturé" : "Ouvert",
    confidentiality: index % 7 === 0 ? "Confidentiel" : "Interne",
    updated: `${String(21 - (index % 18)).padStart(2, "0")} nov. 2026`,
  }));
  const documents = Array.from({ length: 60 }, (_, index): DocumentRecord => ({
    id: `${orgId}-document-${index + 1}`,
    reference: `DOC-2026-${String(index + 1).padStart(6, "0")}`,
    title: `${documentTitles[(index + departmentOffset) % documentTitles.length].replace(".pdf", "").replace(".xlsx", "")} — ${String(2026 - (index % 3))}`,
    category: categories[(index * 3 + departmentOffset) % categories.length],
    folderId: folders[index % folders.length].id,
    department: departments[(index + departmentOffset) % departments.length],
    date: `${String(1 + (index % 27)).padStart(2, "0")}/${String(((10 - index % 12 + 12) % 12) + 1).padStart(2, "0")}/${index % 12 === 11 ? "2025" : "2026"}`,
    version: `v${1 + (index % 3)}.0`,
    confidentiality: index % 8 === 0 ? "Confidentiel" : "Interne",
    status: index % 12 === 0 ? "En attente" : index % 17 === 0 ? "Correction demandée" : "Archivé",
    fileName: documentTitles[(index + departmentOffset) % documentTitles.length],
  }));
  const loans: LoanRecord[] = Array.from({ length: 6 }, (_, index) => ({
    id: `PRET-${String(index + 1).padStart(4, "0")}`,
    folderId: folders[(index * 3) % folders.length].id,
    requester: people[index],
    service: departments[(index + departmentOffset) % departments.length],
    due: index === 1 ? "18/11/2026" : `${String(24 + index).padStart(2, "0")}/11/2026`,
    status: index === 0 ? "En circulation" : index === 1 ? "En retard" : index === 2 ? "En attente" : "En circulation",
  }));
  const activities = [
    { actor: "A. Adjovi", action: "a validé", subject: "Convention de coopération administrative", time: "Il y a 12 min" },
    { actor: "M. Hounkpatin", action: "a ajouté", subject: "Note de cadrage — exercice 2026", time: "Il y a 38 min" },
    { actor: "S. Dossou", action: "a créé", subject: "Dossier de marché public 2026", time: "Il y a 1 h" },
    { actor: "E. Kiki", action: "a enregistré le retour de", subject: "Dossier de suivi budgétaire", time: "Il y a 2 h" },
    { actor: "R. Azon", action: "a déplacé", subject: "Boîte B-014 · Rayonnage R03", time: "Il y a 3 h" },
  ];
  return { folders, documents, loans, activities };
}

export const demoUsers = [
  { name: "Sophie Dossou", initials: "SD", role: "Administratrice d'organisation", key: "organization_admin" },
  { name: "André Adjovi", initials: "AA", role: "Responsable des archives", key: "archive_manager" },
  { name: "Mariam Hounkpatin", initials: "MH", role: "Archiviste", key: "archivist" },
  { name: "Éric Kiki", initials: "EK", role: "Agent de service", key: "agent" },
  { name: "Claudine Ahouansou", initials: "CA", role: "Validatrice", key: "validator" },
  { name: "Richard Azon", initials: "RA", role: "Auditeur", key: "auditor" },
  { name: "Nadia Soglo", initials: "NS", role: "Lectrice", key: "reader" },
  { name: "Administrateur plateforme", initials: "AP", role: "Superadministrateur", key: "superadmin" },
];

export const archiveLocations = [
  { code: "B-014", place: "Siège central · Salle A · R03 · E02", contents: 38, capacity: 60, status: "Disponible" },
  { code: "B-021", place: "Siège central · Salle A · R03 · E03", contents: 54, capacity: 60, status: "Presque pleine" },
  { code: "B-033", place: "Annexe administrative · Salle B · R01 · E01", contents: 21, capacity: 48, status: "Disponible" },
  { code: "B-047", place: "Siège central · Salle A · R05 · E01", contents: 42, capacity: 60, status: "Disponible" },
  { code: "B-052", place: "Annexe administrative · Salle C · R02 · E04", contents: 60, capacity: 60, status: "Pleine" },
  { code: "B-066", place: "Centre de conservation · Salle A · R02 · E02", contents: 16, capacity: 48, status: "Disponible" },
  { code: "B-073", place: "Siège central · Salle B · R04 · E03", contents: 29, capacity: 48, status: "Disponible" },
  { code: "B-081", place: "Centre de conservation · Salle C · R01 · E02", contents: 33, capacity: 60, status: "Disponible" },
];

export const retentionPolicies = [
  { name: "Marchés et contrats publics", category: "Marchés publics", duration: "10 ans", date: "31 déc. 2026", owner: "Direction des Affaires administratives", status: "En vigueur" },
  { name: "Dossiers de ressources humaines", category: "Ressources humaines", duration: "30 ans", date: "31 déc. 2031", owner: "Direction des Ressources humaines", status: "En vigueur" },
  { name: "Correspondance administrative", category: "Correspondance", duration: "5 ans", date: "30 juin 2027", owner: "Cabinet du ministre", status: "À examiner" },
  { name: "Pièces budgétaires", category: "Finances", duration: "10 ans", date: "31 déc. 2028", owner: "Direction du Budget", status: "En vigueur" },
  { name: "Rapports de mission", category: "Missions", duration: "5 ans", date: "31 mars 2027", owner: "Direction générale du Trésor", status: "En vigueur" },
];
