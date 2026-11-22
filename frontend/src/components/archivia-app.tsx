"use client";

import Image from "next/image";
import {
  Archive, ArrowLeftRight, Bell, Boxes, BriefcaseBusiness,
  Building2, CalendarClock, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, ClipboardCheck, Clock3, Command, Database, Download, Eye,
  FileArchive, FileClock, FilePlus2, FileSearch, FileText, FolderClosed, FolderOpen,
  Gauge, HardDrive, History, LayoutDashboard, LockKeyhole, LogOut, Menu, MoreHorizontal,
  PackageOpen, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Upload, Users,
  X, XCircle,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  archiveLocations, categories, createDemoState, demoUsers, departments, DemoState,
  DocumentRecord, FolderRecord, organizations, retentionPolicies,
} from "@/lib/demo-data";

type IconType = typeof LayoutDashboard;
type UserProfile = (typeof demoUsers)[number];
type ModalKind = "folder" | "document" | "loan" | "details" | "role" | null;
type ViewKey = "dashboard" | "folders" | "documents" | "scan" | "physical" | "loans" | "workflows" | "search" | "users" | "organizations" | "retention" | "audit" | "reports" | "settings";
const formSchema = z.object({
  title: z.string().max(240),
  category: z.string().min(1),
  department: z.string().min(1),
  folderId: z.string(),
  requester: z.string().max(180),
  reason: z.string().max(240),
  due: z.string(),
});
type FormValues = z.infer<typeof formSchema>;
const emptyFormValues: FormValues = {
  title: "",
  category: categories[0],
  department: departments[0],
  folderId: "",
  requester: "",
  reason: "",
  due: "2026-11-30",
};

const navigation: { label: string; key: ViewKey; icon: IconType; group: string }[] = [
  { label: "Tableau de bord", key: "dashboard", icon: LayoutDashboard, group: "Espace de travail" },
  { label: "Dossiers", key: "folders", icon: FolderOpen, group: "Gestion documentaire" },
  { label: "Documents", key: "documents", icon: FileText, group: "Gestion documentaire" },
  { label: "Numérisation", key: "scan", icon: FilePlus2, group: "Gestion documentaire" },
  { label: "Recherche", key: "search", icon: FileSearch, group: "Gestion documentaire" },
  { label: "Archives physiques", key: "physical", icon: Archive, group: "Archives physiques" },
  { label: "Prêts & retours", key: "loans", icon: ArrowLeftRight, group: "Archives physiques" },
  { label: "Validations", key: "workflows", icon: ClipboardCheck, group: "Pilotage" },
  { label: "Conservation", key: "retention", icon: CalendarClock, group: "Pilotage" },
  { label: "Rapports", key: "reports", icon: Gauge, group: "Pilotage" },
  { label: "Journal d'audit", key: "audit", icon: History, group: "Administration" },
  { label: "Utilisateurs", key: "users", icon: Users, group: "Administration" },
  { label: "Organisations", key: "organizations", icon: Building2, group: "Administration" },
  { label: "Paramètres", key: "settings", icon: Settings2, group: "Administration" },
];

const chartColors = ["#183b5b", "#2563eb", "#16845b", "#d97706", "#7c8da3", "#5a7b98"];
const formatNumber = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function readStoredData(organizationId: string): DemoState {
  const raw = window.localStorage.getItem(`archivia-demo-${organizationId}`);
  if (!raw) return createDemoState(organizationId);
  const parsed = JSON.parse(raw) as DemoState;
  if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.documents) || !Array.isArray(parsed.loans) || !Array.isArray(parsed.activities)) {
    throw new Error("Les données locales de démonstration sont illisibles. Réinitialisez la démonstration.");
  }
  return parsed;
}

function StatCard({ title, value, note, icon: Icon, tone, action }: {
  title: string; value: string; note: string; icon: IconType; tone: string; action?: () => void;
}) {
  const content = <>
      <div className="stat-top"><span>{title}</span><span className={`stat-icon ${tone}`}><Icon size={18} /></span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
  </>;
  return action
    ? <button className="stat-card stat-card-action" onClick={action} type="button">{content}</button>
    : <div className="stat-card">{content}</div>;
}

function SectionHeading({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2><p>{description}</p></div><div className="heading-actions">{children}</div></div>;
}

export default function ArchiviaApp() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile>(demoUsers[0]);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [orgId, setOrgId] = useState(organizations[0].id);
  const [data, setData] = useState<DemoState>(() => createDemoState(organizations[0].id));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [profileMenu, setProfileMenu] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("Tous les services");
  const [statusFilter, setStatusFilter] = useState("Tous les statuts");
  const [formError, setFormError] = useState("");
  const [chosenFile, setChosenFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFiles, setPreviewFiles] = useState<Record<string, string>>({});
  const currentOrg = organizations.find((organization) => organization.id === orgId) ?? organizations[0];
  const validationSchema = useMemo(() => formSchema.superRefine((values, context) => {
    if ((modal === "folder" || modal === "document") && values.title.trim().length < 3) {
      context.addIssue({ code: "custom", path: ["title"], message: "Le titre doit contenir au moins 3 caractères." });
    }
    if (modal === "loan") {
      if (!values.folderId) context.addIssue({ code: "custom", path: ["folderId"], message: "Sélectionnez un dossier." });
      if (!values.requester.trim()) context.addIssue({ code: "custom", path: ["requester"], message: "Le demandeur est obligatoire." });
      if (!values.reason.trim()) context.addIssue({ code: "custom", path: ["reason"], message: "Le motif est obligatoire." });
      if (!values.due) context.addIssue({ code: "custom", path: ["due"], message: "La date de retour est obligatoire." });
    }
  }), [modal]);
  const form = useForm<FormValues>({ resolver: zodResolver(validationSchema), defaultValues: emptyFormValues });
  const formValues = useWatch({ control: form.control, defaultValue: emptyFormValues });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedOrg = window.localStorage.getItem("archivia-demo-organization");
        const savedOrg = organizations.some((organization) => organization.id === storedOrg) ? storedOrg as string : organizations[0].id;
        setOrgId(savedOrg);
        setData(readStoredData(savedOrg));
        setSignedIn(window.localStorage.getItem("archivia-demo-session") === "active");
        const savedProfileKey = window.localStorage.getItem("archivia-demo-profile");
        if (savedProfileKey) setSelectedProfile(demoUsers.find((profile) => profile.key === savedProfileKey) ?? demoUsers[0]);
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Impossible de charger les données de démonstration.");
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let timer: number | undefined;
    try {
      window.localStorage.setItem(`archivia-demo-${orgId}`, JSON.stringify(data));
      window.localStorage.setItem("archivia-demo-organization", orgId);
    } catch {
      timer = window.setTimeout(() => setToast("Le navigateur ne peut pas enregistrer les changements locaux."), 0);
    }
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, [data, orgId, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredFolders = useMemo(() => data.folders.filter((folder) => {
    const text = `${folder.reference} ${folder.title} ${folder.category} ${folder.department}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase()))
      && (departmentFilter === "Tous les services" || folder.department === departmentFilter)
      && (statusFilter === "Tous les statuts" || folder.status === statusFilter);
  }), [data.folders, query, departmentFilter, statusFilter]);
  const filteredDocuments = useMemo(() => data.documents.filter((document) => {
    const text = `${document.reference} ${document.title} ${document.category} ${document.department}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase()))
      && (departmentFilter === "Tous les services" || document.department === departmentFilter)
      && (statusFilter === "Tous les statuts" || document.status === statusFilter);
  }), [data.documents, query, departmentFilter, statusFilter]);
  const pendingDocuments = data.documents.filter((document) => document.status === "En attente");
  const archivedDocuments = data.documents.filter((document) => document.status === "Archivé");
  const openLoans = data.loans.filter((loan) => loan.status === "En circulation" || loan.status === "En retard");
  const folderFor = (id: string) => data.folders.find((folder) => folder.id === id);

  function notify(message: string) {
    setToast(message);
  }

  function changeOrganization(id: string) {
    try {
      setOrgId(id);
      setData(readStoredData(id));
      setView("dashboard");
      notify(`Espace ${organizations.find((organization) => organization.id === id)?.name ?? "organisation"} ouvert.`);
    } catch {
      setToast("Impossible de charger cet espace de démonstration.");
    }
  }

  function switchView(next: ViewKey) {
    setView(next);
    setQuery("");
    setMobileMenu(false);
  }

  function openModal(kind: ModalKind, document?: DocumentRecord) {
    setFormError("");
    setEditingFolderId(null);
    setEditingDocumentId(null);
    form.reset(emptyFormValues);
    setChosenFile(null);
    setSelectedDocument(document ?? null);
    setModal(kind);
  }

  function closeModal() {
    setModal(null);
    setFormError("");
    setChosenFile(null);
    setEditingFolderId(null);
    setEditingDocumentId(null);
  }

  function editFolder(folder: FolderRecord) {
    setSelectedDocument(null);
    setEditingFolderId(folder.id);
    form.reset({ ...emptyFormValues, title: folder.title, category: folder.category, department: folder.department });
    setModal("folder");
  }

  function editDocument(document: DocumentRecord) {
    setEditingDocumentId(document.id);
    form.reset({ ...emptyFormValues, title: document.title, category: document.category, department: document.department, folderId: document.folderId });
    setChosenFile(null);
    setSelectedDocument(null);
    setModal("document");
  }

  function addActivity(action: string, subject: string) {
    setData((current) => ({
      ...current,
      activities: [{ actor: selectedProfile.name, action, subject, time: "À l'instant" }, ...current.activities].slice(0, 20),
    }));
  }

  function onCreate(values: FormValues) {
    setFormError("");
    if (modal === "folder") {
      if (editingFolderId) {
        setData((current) => ({
          ...current,
          folders: current.folders.map((folder) => folder.id === editingFolderId
            ? { ...folder, title: values.title.trim(), category: values.category, department: values.department, updated: "À l'instant" }
            : folder),
        }));
        addActivity("a modifié le dossier", values.title.trim());
        notify("Métadonnées du dossier modifiées.");
        closeModal();
        return;
      }
      const id = `${orgId}-folder-${crypto.randomUUID()}`;
      const folder: FolderRecord = {
        id,
        reference: `ARCH-2026-ADM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        title: values.title.trim(),
        category: values.category,
        department: values.department,
        owner: selectedProfile.name,
        status: "Ouvert",
        confidentiality: "Interne",
        updated: "À l'instant",
      };
      setData((current) => ({ ...current, folders: [folder, ...current.folders] }));
      addActivity("a créé", folder.title);
      notify(`Dossier ${folder.reference} créé.`);
      closeModal();
      return;
    }
    if (modal === "document") {
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];
      if (chosenFile && (!allowedTypes.includes(chosenFile.type) || chosenFile.size > 20 * 1024 * 1024)) {
        setFormError("Formats acceptés : PDF, JPG, PNG ou TIFF (20 Mo maximum).");
        return;
      }
      if (editingDocumentId) {
        const existing = data.documents.find((document) => document.id === editingDocumentId);
        if (!existing) {
          setFormError("Ce document n'est plus disponible dans cet espace.");
          return;
        }
        const previewUrl = chosenFile ? URL.createObjectURL(chosenFile) : null;
        if (previewUrl) setPreviewFiles((current) => ({ ...current, [editingDocumentId]: previewUrl }));
        setData((current) => ({
          ...current,
          documents: current.documents.map((document) => document.id === editingDocumentId
            ? {
              ...document, title: values.title.trim(), category: values.category,
              folderId: values.folderId, department: values.department,
              fileName: chosenFile?.name ?? document.fileName,
              version: chosenFile ? `v${Number(document.version.match(/^v(\d+)/)?.[1] ?? 1) + 1}.0` : document.version,
              status: chosenFile ? "En attente" : document.status,
            }
            : document),
        }));
        addActivity(chosenFile ? "a ajouté une version de" : "a modifié", values.title.trim());
        notify(chosenFile ? "Nouvelle version soumise au circuit de validation." : "Métadonnées du document modifiées.");
        closeModal();
        return;
      }
      if (!chosenFile) {
        setFormError("Sélectionnez un fichier à importer.");
        return;
      }
      const id = `${orgId}-document-${crypto.randomUUID()}`;
      const document: DocumentRecord = {
        id,
        reference: `DOC-2026-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        title: values.title.trim(),
        category: values.category,
        folderId: values.folderId,
        department: values.department,
        date: new Intl.DateTimeFormat("fr-FR").format(new Date()),
        version: "v1.0",
        confidentiality: "Interne",
        status: "En attente",
        fileName: chosenFile.name,
      };
      const previewUrl = URL.createObjectURL(chosenFile);
      setPreviewFiles((current) => ({ ...current, [id]: previewUrl }));
      setData((current) => ({ ...current, documents: [document, ...current.documents] }));
      addActivity("a importé", document.title);
      notify(`${document.reference} ajouté au circuit de validation.`);
      closeModal();
    }
    if (modal === "loan") {
      const loan = {
        id: `PRET-${crypto.randomUUID().slice(0, 5).toUpperCase()}`,
        folderId: values.folderId,
        requester: values.requester.trim(),
        service: values.department,
        due: new Intl.DateTimeFormat("fr-FR").format(new Date(`${values.due}T12:00:00`)),
        status: "En attente" as const,
      };
      setData((current) => ({ ...current, loans: [loan, ...current.loans] }));
      addActivity("a demandé le prêt de", folderFor(loan.folderId)?.title ?? "un dossier");
      notify("Demande de prêt enregistrée et transmise pour validation.");
      closeModal();
    }
  }

  function decideDocument(document: DocumentRecord, decision: "approve" | "correction") {
    if (!["organization_admin", "validator", "archive_manager", "superadmin"].includes(selectedProfile.key)) {
      notify("Votre profil de démonstration ne dispose pas du droit de validation.");
      return;
    }
    setData((current) => ({
      ...current,
      documents: current.documents.map((item) => item.id === document.id
        ? { ...item, status: decision === "approve" ? "Archivé" : "Correction demandée" }
        : item),
    }));
    addActivity(decision === "approve" ? "a validé" : "a demandé une correction pour", document.title);
    notify(decision === "approve" ? "Document validé et archivé dans les données locales." : "Correction demandée et historisée localement.");
    closeModal();
  }

  function updateLoan(loanId: string, status: "En circulation" | "Retourné" | "En attente") {
    setData((current) => ({
      ...current,
      loans: current.loans.map((loan) => loan.id === loanId ? { ...loan, status } : loan),
    }));
    addActivity(status === "Retourné" ? "a enregistré le retour de" : status === "En circulation" ? "a remis" : "a transmis", loanId);
    notify(status === "Retourné" ? "Retour enregistré." : status === "En circulation" ? "Sortie de l'archive enregistrée." : "Demande transmise pour validation.");
  }

  function updateFolderStatus(folder: FolderRecord, status: FolderRecord["status"]) {
    setData((current) => ({
      ...current,
      folders: current.folders.map((item) => item.id === folder.id ? { ...item, status, updated: "À l'instant" } : item),
    }));
    addActivity(status === "Clôturé" ? "a clôturé le dossier" : "a réactivé le dossier", folder.title);
    notify(status === "Clôturé" ? "Dossier clôturé." : "Dossier réactivé.");
    closeModal();
  }

  function exportCsv() {
    const rows = view === "folders" ? filteredFolders : filteredDocuments;
    const headers = view === "folders"
      ? ["Référence", "Intitulé", "Catégorie", "Service", "Responsable", "Statut"]
      : ["Référence", "Titre", "Catégorie", "Service", "Date", "Version", "Statut"];
    const body = rows.map((row) => view === "folders"
      ? [(row as FolderRecord).reference, (row as FolderRecord).title, (row as FolderRecord).category, (row as FolderRecord).department, (row as FolderRecord).owner, (row as FolderRecord).status]
      : [(row as DocumentRecord).reference, (row as DocumentRecord).title, (row as DocumentRecord).category, (row as DocumentRecord).department, (row as DocumentRecord).date, (row as DocumentRecord).version, (row as DocumentRecord).status]);
    const csv = [headers, ...body].map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    link.download = `archivia-${view}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify("Export CSV généré à partir des données affichées.");
  }

  function resetDemo() {
    const confirmed = window.confirm("Réinitialiser les données de présentation de cet espace ? Vos dossiers, imports et prêts locaux seront effacés.");
    if (!confirmed) return;
    setData(createDemoState(orgId));
    setQuery("");
    notify("Jeu de démonstration réinitialisé pour cet espace.");
  }

  function enterDemo() {
    window.localStorage.setItem("archivia-demo-session", "active");
    window.localStorage.setItem("archivia-demo-profile", selectedProfile.key);
    setSignedIn(true);
  }

  function signOut() {
    window.localStorage.removeItem("archivia-demo-session");
    setSignedIn(false);
    setProfileMenu(false);
    notify("Session locale terminée.");
  }

  if (!ready) return <div className="loading-screen"><div className="brand-mark"><Archive size={23} /></div><span>Préparation de l’espace de démonstration…</span></div>;
  if (!signedIn) {
    return (
      <main className="login-screen">
        <div className="login-aside">
          <div className="brand-lockup light"><div className="brand-mark"><Archive size={22} /></div><span>ARCHIVIA</span></div>
          <div className="login-hero">
            <div className="eyebrow-light">PLATEFORME DOCUMENTAIRE UNIVERSELLE</div>
            <h1>La mémoire de votre organisation,<br /><em>maîtrisée.</em></h1>
            <p>Un espace unique pour organiser, retrouver et préserver votre patrimoine documentaire — physique et numérique.</p>
            <div className="login-promise"><ShieldCheck size={18} /><span>Un espace de démonstration pour organiser votre patrimoine documentaire.</span></div>
          </div>
          <div className="login-footer">© 2026 ARCHIVIA · Démonstration commerciale</div>
        </div>
        <div className="login-panel">
          <div className="login-form-wrap">
            <div className="login-welcome"><div className="eyebrow">ESPACE DE DÉMONSTRATION</div><h2>Bienvenue sur ARCHIVIA</h2><p>Choisissez un profil fictif pour découvrir l’interface.</p></div>
            <div className="demo-login">
                <div className="demo-callout"><LockKeyhole size={17} /><div><strong>Accès de présentation locale</strong><span>Cette session de démonstration n’est pas une authentification de production.</span></div></div>
                <label>Profil à présenter
                  <select value={selectedProfile.key} onChange={(event) => setSelectedProfile(demoUsers.find((user) => user.key === event.target.value) ?? demoUsers[0])}>
                    {demoUsers.map((user) => <option value={user.key} key={user.key}>{user.name} — {user.role}</option>)}
                  </select>
                </label>
                <button className="button-primary button-wide" onClick={enterDemo} type="button">Entrer en mode démonstration<ChevronRight size={17} /></button>
            </div>
            <div className="login-product"><div className="product-icon"><FileArchive size={19} /></div><span><strong>Un produit, plusieurs secteurs.</strong><small>Administration · Finance · Santé · Entreprise</small></span></div>
          </div>
          <div className="mobile-login-brand">Votre patrimoine documentaire, organisé et sécurisé.</div>
        </div>
      </main>
    );
  }

  const pageTitle = navigation.find((item) => item.key === view)?.label ?? "Tableau de bord";
  const pageDescription: Record<ViewKey, string> = {
    dashboard: "Vue d'ensemble de votre patrimoine documentaire.",
    folders: "Structurez et suivez les dossiers de votre organisation.",
    documents: "Retrouvez, consultez et gérez les documents autorisés.",
    scan: "Préparez vos lots de numérisation et indexez les pièces.",
    physical: "Localisez vos fonds et maîtrisez leur occupation.",
    loans: "Suivez le cycle de vie des demandes et des archives prêtées.",
    workflows: "Examinez les documents soumis à votre validation.",
    search: "Croisez vos critères pour retrouver la bonne pièce.",
    users: "Gérez les profils de démonstration et leurs responsabilités.",
    organizations: "Une plateforme, plusieurs espaces sectoriels isolés en démonstration.",
    retention: "Pilotez les durées de conservation et les échéances.",
    audit: "Consultez les opérations enregistrées dans cet espace local.",
    reports: "Explorez les indicateurs calculés à partir des données présentes.",
    settings: "Configuration de l’espace de démonstration ARCHIVIA.",
  };

  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Fermer le menu" />}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><Archive size={21} strokeWidth={2.2} /></div>
          {!collapsed && <div className="brand-name">ARCHIVIA<span>GESTION DOCUMENTAIRE</span></div>}
          {collapsed && <span className="collapsed-wordmark">A</span>}
        </div>
        {!collapsed && (
          <button className="organization-switcher" onClick={() => switchView("organizations")} type="button">
            <span className="org-avatar">{currentOrg.initials}</span>
            <span className="org-switcher-copy"><strong>{currentOrg.name}</strong><small>{currentOrg.sector}</small></span>
            <ChevronDown size={15} />
          </button>
        )}
        {collapsed && <button className="organization-switcher compact" onClick={() => switchView("organizations")} title={currentOrg.name} type="button"><span className="org-avatar">{currentOrg.initials}</span></button>}
        <nav className="sidebar-nav" aria-label="Navigation principale">
          {Array.from(new Set(navigation.map((item) => item.group))).map((group) => (
            <div className="nav-group" key={group}>
              {!collapsed && <div className="nav-group-label">{group}</div>}
              {navigation.filter((item) => item.group === group).map(({ label, key, icon: Icon }) => (
                <button key={key} onClick={() => switchView(key)} className={`nav-item ${view === key ? "active" : ""}`} title={collapsed ? label : undefined} type="button">
                  <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                  {key === "workflows" && pendingDocuments.length > 0 && !collapsed && <span className="nav-count">{pendingDocuments.length}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        {!collapsed && <div className="sidebar-storage"><div className="storage-heading"><HardDrive size={15} /><span>Stockage de démonstration</span></div><div className="storage-meter"><span style={{ width: "43%" }} /></div><small>4,3 Go <span>sur 10 Go</span></small><div className="storage-footnote">Capacité illustrative · mode local</div></div>}
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} type="button" aria-label={collapsed ? "Développer le menu" : "Réduire le menu"}>
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}<span>{collapsed ? "" : "Réduire le menu"}</span>
        </button>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileMenu(true)} type="button" aria-label="Ouvrir le menu"><Menu size={20} /></button>
          <div className="breadcrumb"><span>ARCHIVIA</span><ChevronRight size={14} /><strong>{pageTitle}</strong></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); if (view !== "search" && view !== "documents" && view !== "folders") setView("search"); }} placeholder="Rechercher un document…" /></label>
            <button className="icon-button notification-button" onClick={() => switchView("workflows")} type="button" aria-label="Notifications"><Bell size={18} /><span /></button>
            <button className="icon-button help-button" onClick={() => switchView("settings")} type="button" aria-label="Aide"><CircleHelp size={18} /></button>
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileMenu(!profileMenu)} type="button">
                <span className="user-avatar">{initials(selectedProfile.name)}</span><span className="profile-copy"><strong>{selectedProfile.name}</strong><small>{selectedProfile.role}</small></span><ChevronDown size={15} />
              </button>
              {profileMenu && <div className="profile-menu"><div className="profile-menu-heading">Session de démonstration</div><button onClick={() => { openModal("role"); setProfileMenu(false); }} type="button"><Users size={15} />Changer de profil</button><button onClick={signOut} type="button"><LogOut size={15} />Se déconnecter</button></div>}
            </div>
          </div>
        </header>
        <main className="page-content">
          <div className="mode-banner"><span className="mode-dot" /><span><strong>MODE DÉMONSTRATION LOCAL</strong><i> Données fictives conservées dans ce navigateur · sans serveur ni base de données</i></span><button onClick={resetDemo} type="button">Réinitialiser les données</button></div>
          <SectionHeading title={pageTitle} description={pageDescription[view]}>
            {view === "folders" && <button className="button-secondary" onClick={exportCsv} type="button"><Download size={16} />Exporter</button>}
            {view === "documents" && <button className="button-secondary" onClick={exportCsv} type="button"><Download size={16} />Exporter</button>}
            {view === "folders" && <button className="button-primary" onClick={() => openModal("folder")} type="button"><Plus size={17} />Nouveau dossier</button>}
            {(view === "documents" || view === "scan") && <button className="button-primary" onClick={() => openModal("document")} type="button"><Upload size={16} />Importer un document</button>}
            {view === "loans" && <button className="button-primary" onClick={() => openModal("loan")} type="button"><Plus size={17} />Nouvelle demande</button>}
          </SectionHeading>

          {view === "dashboard" && <Dashboard
            data={data} folders={data.folders} archived={archivedDocuments.length}
            pending={pendingDocuments} openLoans={openLoans.length}
            onNavigate={switchView} onDocument={openModal}
          />}
          {view === "folders" && <FoldersPage folders={filteredFolders} department={departmentFilter} setDepartment={setDepartmentFilter} status={statusFilter} setStatus={setStatusFilter} onDetails={(folder) => { setSelectedDocument(null); form.reset({ ...emptyFormValues, title: folder.title, category: folder.category, department: folder.department, folderId: folder.id }); setModal("details"); }} />}
          {view === "documents" && <DocumentsPage documents={filteredDocuments} folders={data.folders} department={departmentFilter} setDepartment={setDepartmentFilter} status={statusFilter} setStatus={setStatusFilter} onDetails={(document) => { setSelectedDocument(document); setModal("details"); }} />}
          {view === "search" && <SearchPage query={query} setQuery={setQuery} department={departmentFilter} setDepartment={setDepartmentFilter} status={statusFilter} setStatus={setStatusFilter} documents={filteredDocuments} folders={filteredFolders} onOpenDocument={(document) => openModal("details", document)} onOpenFolder={(folder) => { setSelectedDocument(null); form.reset({ ...emptyFormValues, title: folder.title, category: folder.category, department: folder.department, folderId: folder.id }); setModal("details"); }} />}
          {view === "physical" && <PhysicalPage loans={data.loans} onNavigate={switchView} />}
          {view === "loans" && <LoansPage loans={data.loans} folders={data.folders} onUpdate={updateLoan} />}
          {view === "workflows" && <WorkflowPage pending={pendingDocuments} archived={archivedDocuments} corrections={data.documents.filter((document) => document.status === "Correction demandée")} folders={data.folders} onDecide={decideDocument} onOpen={(document) => openModal("details", document)} />}
          {view === "scan" && <ScanningPage onImport={() => openModal("document")} />}
          {view === "users" && <UsersPage onProfile={(profile) => { setSelectedProfile(profile); window.localStorage.setItem("archivia-demo-profile", profile.key); notify(`Profil de démonstration : ${profile.role}.`); }} />}
          {view === "organizations" && <OrganizationsPage activeId={orgId} onSwitch={changeOrganization} />}
          {view === "retention" && <RetentionPage />}
          {view === "audit" && <AuditPage activities={data.activities} />}
          {view === "reports" && <ReportsPage data={data} />}
          {view === "settings" && <SettingsPage org={currentOrg} />}
        </main>
        <footer className="app-footer"><span>ARCHIVIA <i>·</i> {currentOrg.name}</span><span><span className="footer-status-dot" /> Environnement local de démonstration</span></footer>
      </div>

      {modal && modal !== "role" && <Modal title={modal === "folder" ? editingFolderId ? "Modifier un dossier" : "Créer un dossier" : modal === "document" ? editingDocumentId ? "Modifier un document" : "Importer un document" : modal === "loan" ? "Nouvelle demande de prêt" : "Détail de l’enregistrement"} subtitle={modal === "details" ? selectedDocument ? selectedDocument.reference : formValues.folderId ?? "" : "Les changements sont enregistrés dans ce navigateur."} onClose={closeModal}>
        {modal === "details" && selectedDocument ? <DocumentDetail document={selectedDocument} folder={folderFor(selectedDocument.folderId)} fileUrl={previewFiles[selectedDocument.id]} onEdit={editDocument} onDecide={decideDocument} /> :
          modal === "details" ? <FolderDetail folder={data.folders.find((folder) => folder.id === formValues.folderId)} documents={data.documents.filter((document) => document.folderId === formValues.folderId)} onDocument={(document) => openModal("details", document)} onEdit={editFolder} onToggleStatus={updateFolderStatus} /> :
            <form className="modal-form" onSubmit={form.handleSubmit(onCreate)}>
              {modal === "folder" && <>
                <label>Intitulé du dossier<input {...form.register("title")} autoFocus maxLength={240} placeholder="Ex. Marché de fournitures — exercice 2026" value={formValues.title} onChange={(event) => form.setValue("title", event.target.value, { shouldValidate: true })} /></label>
                <div className="form-grid"><label>Catégorie<select {...form.register("category")} value={formValues.category} onChange={(event) => form.setValue("category", event.target.value, { shouldValidate: true })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Service responsable<select {...form.register("department")} value={formValues.department} onChange={(event) => form.setValue("department", event.target.value, { shouldValidate: true })}>{departments.map((department) => <option key={department}>{department}</option>)}</select></label></div>
                <div className="form-hint"><ShieldCheck size={15} />{editingFolderId ? "Référence conservée · modification locale des métadonnées." : "Référence générée automatiquement · Confidentialité : Interne"}</div>
              </>}
              {modal === "document" && <>
                <label>Titre du document<input {...form.register("title")} autoFocus maxLength={240} placeholder="Ex. Rapport de suivi du projet" value={formValues.title} onChange={(event) => form.setValue("title", event.target.value, { shouldValidate: true })} /></label>
                <div className="form-grid"><label>Catégorie<select {...form.register("category")} value={formValues.category} onChange={(event) => form.setValue("category", event.target.value, { shouldValidate: true })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Dossier associé<select {...form.register("folderId")} value={formValues.folderId} onChange={(event) => form.setValue("folderId", event.target.value, { shouldValidate: true })}><option value="">Aucun dossier</option>{data.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.reference} · {folder.title}</option>)}</select></label></div>
                <label className="upload-field"><input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,application/pdf,image/jpeg,image/png,image/tiff" onChange={(event) => setChosenFile(event.target.files?.[0] ?? null)} /><span className="upload-placeholder"><Upload size={20} /><strong>{chosenFile ? chosenFile.name : editingDocumentId ? "Ajouter une nouvelle version (facultatif)" : "Choisir un fichier à importer"}</strong><small>PDF, JPEG, PNG ou TIFF · 20 Mo maximum</small></span></label>
                <div className="form-hint"><LockKeyhole size={15} />{editingDocumentId ? "Le fichier est temporaire au navigateur. Une nouvelle version repasse en validation." : "Le fichier est temporaire dans le navigateur et disponible uniquement pour cette session."}</div>
              </>}
              {modal === "loan" && <>
                <label>Dossier à emprunter<select {...form.register("folderId")} value={formValues.folderId} onChange={(event) => form.setValue("folderId", event.target.value, { shouldValidate: true })}><option value="">Sélectionner un dossier</option>{data.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.reference} · {folder.title}</option>)}</select></label>
                <div className="form-grid"><label>Demandeur<input {...form.register("requester")} placeholder="Nom et prénom" value={formValues.requester} onChange={(event) => form.setValue("requester", event.target.value, { shouldValidate: true })} /></label><label>Service<select {...form.register("department")} value={formValues.department} onChange={(event) => form.setValue("department", event.target.value, { shouldValidate: true })}>{departments.map((department) => <option key={department}>{department}</option>)}</select></label></div>
                <label>Motif de la demande<input {...form.register("reason")} placeholder="Consultation, instruction d’un dossier…" value={formValues.reason} onChange={(event) => form.setValue("reason", event.target.value, { shouldValidate: true })} /></label>
                <label>Date de retour prévue<input {...form.register("due")} type="date" value={formValues.due} onChange={(event) => form.setValue("due", event.target.value, { shouldValidate: true })} /></label>
              </>}
              {(formError || form.formState.errors.title?.message || form.formState.errors.folderId?.message || form.formState.errors.requester?.message || form.formState.errors.reason?.message || form.formState.errors.due?.message) && <p className="form-error">{formError || form.formState.errors.title?.message || form.formState.errors.folderId?.message || form.formState.errors.requester?.message || form.formState.errors.reason?.message || form.formState.errors.due?.message}</p>}
              <div className="modal-actions"><button className="button-secondary" onClick={closeModal} type="button">Annuler</button><button className="button-primary" type="submit">{modal === "folder" ? editingFolderId ? "Enregistrer les modifications" : "Créer le dossier" : modal === "document" ? editingDocumentId ? "Enregistrer le document" : "Importer et soumettre" : "Enregistrer la demande"}</button></div>
            </form>}
      </Modal>}
      {modal === "role" && <Modal title="Changer de profil de démonstration" subtitle="Le changement de profil local n’est pas une gestion de permission de production." onClose={closeModal}>
        <div className="role-picker">{demoUsers.map((profile) => <button className={`role-option ${selectedProfile.key === profile.key ? "selected" : ""}`} key={profile.key} onClick={() => { setSelectedProfile(profile); window.localStorage.setItem("archivia-demo-profile", profile.key); closeModal(); notify(`Profil de démonstration : ${profile.role}.`); }} type="button"><span className="user-avatar">{profile.initials}</span><span><strong>{profile.name}</strong><small>{profile.role}</small></span>{selectedProfile.key === profile.key && <Check size={16} />}</button>)}</div>
      </Modal>}
      {toast && <div className="toast-message"><CheckCheck size={17} /><span>{toast}</span><button onClick={() => setToast("")} aria-label="Fermer" type="button"><X size={15} /></button></div>}
    </div>
  );
}

function Dashboard({ data, folders, archived, pending, openLoans, onNavigate, onDocument }: {
  data: DemoState; folders: FolderRecord[]; archived: number; pending: DocumentRecord[]; openLoans: number;
  onNavigate: (view: ViewKey) => void; onDocument: (kind: ModalKind, document?: DocumentRecord) => void;
}) {
  const monthlyData = Array.from({ length: 12 }, (_, index) => {
    const monthIndex = 11 - index;
    const date = new Date(2026, monthIndex, 1);
    const month = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date);
    const count = data.documents.filter((document) => {
      const [day, monthNumber, year] = document.date.split("/").map(Number);
      return day && new Date(year, monthNumber - 1, day).getMonth() === date.getMonth()
        && new Date(year, monthNumber - 1, day).getFullYear() === date.getFullYear()
        && document.status === "Archivé";
    }).length;
    return { month: month.replace(".", ""), count };
  });
  const categoryData = categories.map((category) => ({ name: category, total: data.documents.filter((document) => document.category === category).length })).filter((item) => item.total).slice(0, 6);
  const departmentData = departments.slice(0, 6).map((department) => ({ name: department.replace("Direction ", "Dir. ").replace("générale", "gén."), count: data.folders.filter((folder) => folder.department === department).length }));
  const tasks = [
    { title: "Valider les nouveaux documents", count: pending.length, icon: ClipboardCheck, view: "workflows" as ViewKey, tone: "blue" },
    { title: "Demandes de prêt à examiner", count: data.loans.filter((loan) => loan.status === "En attente").length, icon: ArrowLeftRight, view: "loans" as ViewKey, tone: "amber" },
    { title: "Dossiers ouverts", count: folders.filter((folder) => folder.status === "Ouvert").length, icon: FolderOpen, view: "folders" as ViewKey, tone: "green" },
  ];
  return <>
    <div className="welcome-strip"><div><div className="eyebrow">EXERCICE 2026 <span>·</span> VUE ORGANISATIONNELLE</div><h2>Bonjour, votre patrimoine est sous contrôle.</h2><p>Voici les mouvements et éléments à suivre dans votre espace.</p></div><div className="welcome-mark"><Archive size={28} /><span>ESPACE ACTIF</span></div></div>
    <div className="stats-grid">
      <StatCard title="Dossiers" value={formatNumber(folders.length)} note="Données de démonstration" icon={FolderClosed} tone="icon-blue" action={() => onNavigate("folders")} />
      <StatCard title="Documents indexés" value={formatNumber(data.documents.length)} note={`${archived} archivés définitivement`} icon={FileText} tone="icon-slate" action={() => onNavigate("documents")} />
      <StatCard title="À traiter" value={String(pending.length + data.loans.filter((loan) => loan.status === "En attente").length).padStart(2, "0")} note={`${pending.length} documents · ${data.loans.filter((loan) => loan.status === "En attente").length} prêts`} icon={FileClock} tone="icon-amber" action={() => onNavigate("workflows")} />
      <StatCard title="Dossiers physiques" value={formatNumber(archiveLocations.reduce((sum, location) => sum + location.contents, 0))} note="8 emplacements fictifs suivis" icon={Boxes} tone="icon-green" action={() => onNavigate("physical")} />
    </div>
    <div className="dashboard-grid">
      <section className="panel trend-panel">
        <div className="panel-heading"><div><h3>Activité documentaire</h3><p>Documents archivés · 12 derniers mois</p></div><span className="select-compact">Déc. 2025 – nov. 2026</span></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f4" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8290a1" }} /><Tooltip cursor={{ fill: "#f3f6f9" }} contentStyle={{ border: "1px solid #e8edf2", borderRadius: 9, fontSize: 12 }} formatter={(value) => [`${value} documents`, "Archivés"]} /><Bar dataKey="count" fill="#183b5b" radius={[4, 4, 0, 0]} maxBarSize={27} /></BarChart></ResponsiveContainer></div>
        <div className="chart-caption"><span><i className="legend-dot navy" />Documents archivés dans le jeu local</span><span>{formatNumber(archived)} <small>documents</small></span></div>
      </section>
      <section className="panel category-panel">
        <div className="panel-heading"><div><h3>Répartition par catégorie</h3><p>Documents indexés dans cet espace</p></div><button className="more-button" onClick={() => onNavigate("reports")} aria-label="Voir les rapports" type="button"><MoreHorizontal size={19} /></button></div>
        <div className="category-chart">
          <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="total" nameKey="name" innerRadius={45} outerRadius={62} paddingAngle={3} stroke="none">{categoryData.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip contentStyle={{ border: "1px solid #e8edf2", borderRadius: 9, fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{formatNumber(data.documents.length)}</strong><small>documents</small></div></div>
          <div className="category-legend">{categoryData.slice(0, 5).map((category, index) => <div key={category.name}><span><i style={{ backgroundColor: chartColors[index] }} />{category.name}</span><strong>{category.total}</strong></div>)}</div>
        </div>
      </section>
      <section className="panel tasks-panel">
        <div className="panel-heading"><div><h3>Mes tâches</h3><p>Suivi des actions à réaliser</p></div><button className="text-button" onClick={() => onNavigate("workflows")} type="button">Tout voir <ChevronRight size={14} /></button></div>
        <div className="task-list">{tasks.map(({ title, count, icon: Icon, view, tone }) => <button className="task-row" key={title} onClick={() => onNavigate(view)} type="button"><span className={`task-icon ${tone}`}><Icon size={17} /></span><span className="task-title">{title}</span><strong>{String(count).padStart(2, "0")}</strong><ChevronRight size={15} /></button>)}</div>
        <button className="task-footer" onClick={() => onNavigate("loans")} type="button"><Clock3 size={15} /><span>{openLoans} prêts actuellement en circulation</span><ChevronRight size={15} /></button>
      </section>
      <section className="panel department-panel">
        <div className="panel-heading"><div><h3>Dossiers par direction</h3><p>Volume de dossiers actifs</p></div><button className="more-button" onClick={() => onNavigate("reports")} aria-label="Voir les rapports" type="button"><MoreHorizontal size={19} /></button></div>
        <div className="department-bars">{departmentData.map((department) => <div className="department-bar-row" key={department.name}><span title={department.name}>{department.name}</span><div className="mini-bar"><i style={{ width: `${Math.min(100, department.count * 14)}%` }} /></div><strong>{department.count}</strong></div>)}</div>
      </section>
      <section className="panel recent-panel">
        <div className="panel-heading"><div><h3>Documents récemment ajoutés</h3><p>Dernières entrées dans le fonds documentaire</p></div><button className="text-button" onClick={() => onNavigate("documents")} type="button">Bibliothèque <ChevronRight size={14} /></button></div>
        <div className="recent-list">{data.documents.slice(0, 4).map((document) => <button className="recent-row" onClick={() => onDocument("details", document)} key={document.id} type="button"><span className={`file-icon ${document.fileName.endsWith(".xlsx") ? "excel" : "pdf"}`}><FileText size={17} /></span><span className="recent-title"><strong>{document.title}</strong><small>{document.reference} · {document.category}</small></span><span className={`status-pill ${document.status === "Archivé" ? "status-green" : "status-amber"}`}>{document.status}</span><span className="recent-date">{document.date}</span></button>)}</div>
      </section>
      <section className="panel activity-panel">
        <div className="panel-heading"><div><h3>Activité récente</h3><p>Les dernières opérations documentaires</p></div><button className="text-button" onClick={() => onNavigate("audit")} type="button">Journal complet <ChevronRight size={14} /></button></div>
        <div className="activity-list">{data.activities.slice(0, 4).map((item, index) => <div className="activity-row" key={`${item.subject}-${index}`}><span className={`activity-avatar avatar-${index % 4}`}>{initials(item.actor)}</span><p><strong>{item.actor}</strong> {item.action}<br /><b>{item.subject}</b></p><time>{item.time}</time></div>)}</div>
      </section>
    </div>
  </>;
}

function FilterBar({ query, department, setDepartment, status, setStatus }: {
  query?: string; department: string; setDepartment: (value: string) => void; status: string; setStatus: (value: string) => void;
}) {
  return <div className="filter-bar"><div className="filter-search"><Search size={15} /><span>{query ? `Filtre actif : « ${query} »` : "Rechercher dans les résultats"}</span></div><label><SlidersHorizontal size={14} /><select value={department} onChange={(event) => setDepartment(event.target.value)}><option>Tous les services</option>{departments.map((departmentName) => <option key={departmentName}>{departmentName}</option>)}</select></label><label><span>Statut</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>Tous les statuts</option><option>Ouvert</option><option>Clôturé</option><option>Archivé</option><option>En attente</option><option>Correction demandée</option></select></label></div>;
}

function FoldersPage({ folders, department, setDepartment, status, setStatus, onDetails }: {
  folders: FolderRecord[]; department: string; setDepartment: (value: string) => void; status: string; setStatus: (value: string) => void; onDetails: (folder: FolderRecord) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(folders.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = folders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <>
    <div className="list-summary"><div className="summary-count"><strong>{folders.length}</strong><span>dossiers affichés</span></div><span className="summary-separator" /><span className="summary-muted">Structure documentaire · {departments.length} directions</span></div>
    <section className="panel data-panel"><FilterBar department={department} setDepartment={setDepartment} status={status} setStatus={setStatus} /><div className="table-scroll"><table><thead><tr><th>Référence / Intitulé</th><th>Catégorie</th><th>Service responsable</th><th>Responsable</th><th>Confidentialité</th><th>Statut</th><th /></tr></thead><tbody>
      {pageRows.map((folder) => <tr key={folder.id}><td><button className="table-main-cell" onClick={() => onDetails(folder)} type="button"><strong>{folder.title}</strong><small>{folder.reference}</small></button></td><td>{folder.category}</td><td>{folder.department}</td><td><span className="table-person"><span className="tiny-avatar">{initials(folder.owner)}</span>{folder.owner}</span></td><td><span className={`confidentiality ${folder.confidentiality === "Confidentiel" ? "confidential" : ""}`}><LockKeyhole size={12} />{folder.confidentiality}</span></td><td><span className={`status-pill ${folder.status === "Ouvert" ? "status-blue" : "status-gray"}`}>{folder.status}</span></td><td><button className="row-action" onClick={() => onDetails(folder)} aria-label={`Ouvrir ${folder.title}`} type="button"><ChevronRight size={17} /></button></td></tr>)}
      {!folders.length && <tr><td className="empty-row" colSpan={7}>Aucun dossier ne correspond à ces critères.</td></tr>}
    </tbody></table></div><div className="table-footer"><span>{folders.length ? `Affichage de ${(currentPage - 1) * pageSize + 1} à ${Math.min(currentPage * pageSize, folders.length)} sur ${folders.length}` : "Aucun dossier"}</span><div><button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Page précédente" type="button"><ChevronLeft size={15} /></button><span>{currentPage} / {pageCount}</span><button onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Page suivante" type="button"><ChevronRight size={15} /></button></div></div></section>
  </>;
}

function DocumentsPage({ documents, folders, department, setDepartment, status, setStatus, onDetails }: {
  documents: DocumentRecord[]; folders: FolderRecord[]; department: string; setDepartment: (value: string) => void; status: string; setStatus: (value: string) => void;
  onDetails: (document: DocumentRecord) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(documents.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const waiting = documents.filter((document) => document.status === "En attente").length;
  return <>
    <div className="list-summary"><div className="summary-count"><strong>{documents.length}</strong><span>documents</span></div><span className="summary-separator" /><span className="summary-muted">{waiting} en attente de traitement · {folders.length} dossiers liés</span></div>
    <section className="panel data-panel"><FilterBar department={department} setDepartment={setDepartment} status={status} setStatus={setStatus} /><div className="table-scroll"><table><thead><tr><th>Document</th><th>Catégorie</th><th>Dossier associé</th><th>Date / Version</th><th>Confidentialité</th><th>Statut</th><th /></tr></thead><tbody>
      {pageRows.map((document) => <tr key={document.id}><td><button className="table-main-cell document-cell" onClick={() => onDetails(document)} type="button"><span className="file-icon pdf"><FileText size={16} /></span><span><strong>{document.title}</strong><small>{document.reference}</small></span></button></td><td>{document.category}</td><td><span className="folder-link">{folders.find((folder) => folder.id === document.folderId)?.title ?? "Document non classé"}</span></td><td>{document.date}<small className="cell-subline">{document.version}</small></td><td><span className={`confidentiality ${document.confidentiality === "Confidentiel" ? "confidential" : ""}`}><LockKeyhole size={12} />{document.confidentiality}</span></td><td><span className={`status-pill ${document.status === "Archivé" ? "status-green" : document.status === "En attente" ? "status-amber" : "status-red"}`}>{document.status}</span></td><td><button className="row-action" onClick={() => onDetails(document)} aria-label={`Consulter ${document.title}`} type="button"><Eye size={16} /></button></td></tr>)}
      {!documents.length && <tr><td className="empty-row" colSpan={7}>Aucun document ne correspond à ces critères.</td></tr>}
    </tbody></table></div><div className="table-footer"><span>{documents.length ? `Affichage de ${(currentPage - 1) * pageSize + 1} à ${Math.min(currentPage * pageSize, documents.length)} sur ${documents.length}` : "Aucun document"}</span><div><button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Page précédente" type="button"><ChevronLeft size={15} /></button><span>{currentPage} / {pageCount}</span><button onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Page suivante" type="button"><ChevronRight size={15} /></button></div></div></section>
    {waiting > 0 && <div className="inline-notice"><ClipboardCheck size={17} /><span><strong>{waiting} document(s)</strong> attendent une décision de validation.</span><span>Accédez au centre depuis le menu latéral.</span></div>}
  </>;
}

function SearchPage({ query, setQuery, department, setDepartment, status, setStatus, documents, folders, onOpenDocument, onOpenFolder }: {
  query: string; setQuery: (value: string) => void; department: string; setDepartment: (value: string) => void; status: string; setStatus: (value: string) => void; documents: DocumentRecord[]; folders: FolderRecord[];
  onOpenDocument: (document: DocumentRecord) => void; onOpenFolder: (folder: FolderRecord) => void;
}) {
  return <div className="search-page">
    <section className="search-hero panel"><div className="search-hero-icon"><FileSearch size={23} /></div><h3>Interrogez votre fonds documentaire</h3><p>La recherche est exécutée localement dans les dossiers et métadonnées de cet espace de démonstration.</p><div className="search-large"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Référence, titre, catégorie, service…" /><kbd>↵</kbd></div><div className="search-suggestions"><span>Suggestions :</span>{["marché", "budget", "convention", "trésor"].map((item) => <button key={item} onClick={() => setQuery(item)} type="button">{item}</button>)}</div></section>
    <div className="search-filter-bar"><FilterBar query={query} department={department} setDepartment={setDepartment} status={status} setStatus={setStatus} /></div>
    {query && <div className="search-results"><div className="results-heading"><h3>Résultats de recherche</h3><span>{documents.length + folders.length} résultat(s) dans les données locales</span></div>
      {documents.length > 0 && <section className="panel search-result-panel"><div className="result-group-title"><FileText size={16} />Documents <span>{documents.length}</span></div>{documents.slice(0, 12).map((document) => <button className="search-result-row" onClick={() => onOpenDocument(document)} key={document.id} type="button"><span className="file-icon pdf"><FileText size={15} /></span><span><strong>{document.title}</strong><small>{document.reference} · {document.category} · {document.department}</small></span><span className={`status-pill ${document.status === "Archivé" ? "status-green" : "status-amber"}`}>{document.status}</span><ChevronRight size={16} /></button>)}</section>}
      {folders.length > 0 && <section className="panel search-result-panel"><div className="result-group-title"><FolderOpen size={16} />Dossiers <span>{folders.length}</span></div>{folders.slice(0, 10).map((folder) => <button className="search-result-row" onClick={() => onOpenFolder(folder)} key={folder.id} type="button"><span className="folder-search-icon"><FolderOpen size={16} /></span><span><strong>{folder.title}</strong><small>{folder.reference} · {folder.category} · {folder.department}</small></span><span className="status-pill status-blue">{folder.status}</span><ChevronRight size={16} /></button>)}</section>}
      {!documents.length && !folders.length && <div className="empty-search"><FileSearch size={28} /><strong>Aucun résultat</strong><span>Essayez une autre référence, un titre ou un service.</span></div>}
    </div>}
    {!query && <div className="search-tip"><ShieldCheck size={17} />Les résultats sont fictifs et restent dans ce navigateur. Les profils de présentation ne protègent pas les données.</div>}
  </div>;
}

function PhysicalPage({ loans, onNavigate }: { loans: DemoState["loans"]; onNavigate: (view: ViewKey) => void }) {
  const [activeLocation, setActiveLocation] = useState(archiveLocations[0]);
  const [locationQuery, setLocationQuery] = useState("");
  const shown = archiveLocations.filter((location) => `${location.code} ${location.place}`.toLowerCase().includes(locationQuery.toLowerCase()));
  const occupiedCapacity = archiveLocations.reduce((sum, location) => sum + location.contents, 0);
  const totalCapacity = archiveLocations.reduce((sum, location) => sum + location.capacity, 0);
  const activeLoans = loans.filter((loan) => loan.status === "En circulation" || loan.status === "En retard").length;
  return <>
    <div className="physical-metrics"><div className="physical-metric"><span className="metric-square navy"><Archive size={17} /></span><span><strong>{archiveLocations.length}</strong><small>emplacements</small></span></div><div className="physical-metric"><span className="metric-square green"><Boxes size={17} /></span><span><strong>{occupiedCapacity}</strong><small>dossiers inventoriés</small></span></div><div className="physical-metric"><span className="metric-square amber"><ArrowLeftRight size={17} /></span><span><strong>{activeLoans}</strong><small>prêts actifs</small></span></div><div className="physical-metric"><span className="metric-square slate"><HardDrive size={17} /></span><span><strong>{Math.round(occupiedCapacity / totalCapacity * 100)} %</strong><small>capacité occupée</small></span></div></div>
    <div className="physical-layout"><section className="panel location-panel"><div className="panel-heading"><div><h3>Inventaire des emplacements</h3><p>SIÈGE CENTRAL <ChevronRight size={12} /> ARCHIVES CENTRALES</p></div><button className="more-button" aria-label="Options d'inventaire" onClick={() => onNavigate("reports")} type="button"><MoreHorizontal size={19} /></button></div><label className="location-search"><Search size={15} /><input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Rechercher une boîte ou un rayon…" /></label><div className="location-list">{shown.map((location) => <button className={`location-row ${activeLocation.code === location.code ? "selected" : ""}`} key={location.code} onClick={() => setActiveLocation(location)} type="button"><span className="box-symbol"><PackageOpen size={17} /></span><span className="location-row-copy"><strong>Boîte {location.code}</strong><small>{location.place}</small></span><span className="location-capacity"><span><i style={{ width: `${Math.min(location.contents / location.capacity * 100, 100)}%` }} /></span><small>{location.contents} / {location.capacity}</small></span><ChevronRight size={15} /></button>)}{!shown.length && <div className="empty-row">Aucun emplacement trouvé.</div>}</div><div className="location-note"><LockKeyhole size={14} />Les emplacements présentés sont des données de démonstration.</div></section>
      <section className="panel location-detail"><div className="location-map-header"><div><div className="eyebrow">EMPLACEMENT SÉLECTIONNÉ</div><h3>Boîte {activeLocation.code}</h3></div><span className={`status-pill ${activeLocation.status === "Pleine" ? "status-red" : activeLocation.status === "Presque pleine" ? "status-amber" : "status-green"}`}>{activeLocation.status}</span></div><div className="location-crumb"><span>Siège central</span><ChevronRight size={14} /><span>Salle des archives A</span><ChevronRight size={14} /><span>Rayonnage R03</span><ChevronRight size={14} /><strong>{activeLocation.code}</strong></div><div className="shelf-visual"><div className="shelf-label">RAYONNAGE R03 <span>· ÉTAGÈRE E02</span></div><div className="shelf-boxes">{archiveLocations.slice(0, 5).map((location) => <button key={location.code} onClick={() => setActiveLocation(location)} className={`shelf-box ${activeLocation.code === location.code ? "selected" : ""} ${location.status === "Pleine" ? "full" : ""}`} type="button"><PackageOpen size={18} /><span>{location.code}</span></button>)}</div><div className="shelf-board" /></div><div className="location-details-grid"><div><small>Capacité</small><strong>{activeLocation.contents} <span>/ {activeLocation.capacity} dossiers</span></strong></div><div><small>Taux d’occupation</small><strong>{Math.round(activeLocation.contents / activeLocation.capacity * 100)} %</strong></div><div><small>Dernier inventaire</small><strong>18 nov. 2026</strong></div><div><small>Responsable</small><strong>A. Adjovi</strong></div></div><button className="button-secondary location-action" onClick={() => onNavigate("search")} type="button"><FileSearch size={15} />Rechercher dans cet emplacement</button></section>
    </div>
  </>;
}

function LoansPage({ loans, folders, onUpdate }: { loans: DemoState["loans"]; folders: FolderRecord[]; onUpdate: (id: string, status: "En circulation" | "Retourné" | "En attente") => void }) {
  const [tab, setTab] = useState("Toutes les demandes");
  const filtered = loans.filter((loan) => tab === "Toutes les demandes" || loan.status === tab);
  const overdue = loans.filter((loan) => loan.status === "En retard").length;
  return <>
    <div className="loan-stats"><div><span>Demandes ouvertes</span><strong>{loans.filter((loan) => loan.status === "En attente").length + loans.filter((loan) => loan.status === "En circulation").length}</strong><small>à examiner ou en cours</small></div><div className="loan-alert"><span>Retards à régulariser</span><strong>{overdue}</strong><small>retour prévu dépassé</small></div><div><span>Retours enregistrés</span><strong>{loans.filter((loan) => loan.status === "Retourné").length}</strong><small>dans cet espace local</small></div></div>
    <section className="panel data-panel"><div className="tab-row">{["Toutes les demandes", "En attente", "En circulation", "En retard", "Retourné"].map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)} type="button">{item}{item === "En retard" && overdue > 0 && <i>{overdue}</i>}</button>)}</div><div className="table-scroll"><table><thead><tr><th>Dossier emprunté</th><th>Demandeur / Service</th><th>Date de retour prévue</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{filtered.map((loan) => <tr key={loan.id}><td><div className="table-main-cell"><strong>{folders.find((folder) => folder.id === loan.folderId)?.title ?? "Dossier archivé"}</strong><small>{folders.find((folder) => folder.id === loan.folderId)?.reference ?? loan.id} · {loan.id}</small></div></td><td><strong className="plain-strong">{loan.requester}</strong><small className="cell-subline">{loan.service}</small></td><td>{loan.due}</td><td><span className={`status-pill ${loan.status === "Retourné" ? "status-green" : loan.status === "En retard" ? "status-red" : loan.status === "En attente" ? "status-amber" : "status-blue"}`}>{loan.status}</span></td><td><div className="row-actions">{loan.status === "En attente" && <button className="text-action" onClick={() => onUpdate(loan.id, "En circulation")} type="button"><Check size={14} />Approuver</button>}{loan.status === "En circulation" || loan.status === "En retard" ? <button className="text-action" onClick={() => onUpdate(loan.id, "Retourné")} type="button"><CheckCheck size={14} />Enregistrer retour</button> : null}{loan.status === "Retourné" && <span className="done-label"><Check size={14} />Clos</span>}</div></td></tr>)}{!filtered.length && <tr><td className="empty-row" colSpan={5}>Aucune demande dans cette catégorie.</td></tr>}</tbody></table></div><div className="table-footer"><span>{filtered.length} demande(s) · circulation tracée localement</span><span className="table-info"><History size={14} />Les changements sont historisés dans l’activité.</span></div></section>
  </>;
}

function WorkflowPage({ pending, archived, corrections, folders, onDecide, onOpen }: {
  pending: DocumentRecord[];
  archived: DocumentRecord[];
  corrections: DocumentRecord[];
  folders: FolderRecord[];
  onDecide: (document: DocumentRecord, decision: "approve" | "correction") => void;
  onOpen: (document: DocumentRecord) => void;
}) {
  const [tab, setTab] = useState("À valider");
  const rows = tab === "À valider" ? pending : tab === "Validés récemment" ? archived : corrections;
  return <>
    <div className="workflow-kpis"><div><span>À valider</span><strong>{pending.length}</strong><small>documents en attente</small></div><div><span>Archivés</span><strong>{archived.length}</strong><small>documents dans cet espace</small></div><div><span>Corrections</span><strong>{corrections.length}</strong><small>demandes enregistrées</small></div><div className="workflow-progress"><span>Votre circuit documentaire</span><div className="workflow-steps"><i className="done" /><i className="done" /><i className="current" /><i /><i /></div><small>Création → Indexation → Contrôle → Validation → Archivage</small></div></div>
    <section className="panel data-panel"><div className="workflow-header"><div className="tab-row">{["À valider", "Validés récemment", "Corrections demandées"].map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}</div><span className="workflow-policy"><ShieldCheck size={14} />Les décisions sont consignées dans l’historique local.</span></div>
      <div className="table-scroll"><table><thead><tr><th>Document</th><th>Dossier</th><th>Service</th><th>Statut</th><th>{tab === "À valider" ? "Décision" : "Consultation"}</th></tr></thead><tbody>{rows.map((document) => <tr key={document.id}><td><button className="table-main-cell document-cell" onClick={() => onOpen(document)} type="button"><span className="file-icon pdf"><FileText size={16} /></span><span><strong>{document.title}</strong><small>{document.reference} · {document.category}</small></span></button></td><td>{folders.find((folder) => folder.id === document.folderId)?.title ?? "—"}</td><td>{document.department}</td><td><span className={`status-pill ${document.status === "Archivé" ? "status-green" : document.status === "En attente" ? "status-amber" : "status-red"}`}>{document.status}</span></td><td>{tab === "À valider" ? <div className="decision-actions"><button onClick={() => onDecide(document, "approve")} aria-label="Approuver" title="Approuver" type="button"><Check size={15} /></button><button onClick={() => onDecide(document, "correction")} aria-label="Demander une correction" title="Demander une correction" type="button"><XCircle size={15} /></button></div> : <button className="text-action" onClick={() => onOpen(document)} type="button"><Eye size={14} />Ouvrir</button>}</td></tr>)}{!rows.length && <tr><td className="empty-row" colSpan={5}>{tab === "À valider" ? "Aucun document en attente de validation." : "Aucune donnée dans cette catégorie pour le moment."}</td></tr>}</tbody></table></div>
      <div className="table-footer"><span>Workflow de démonstration · données locales</span><span>Dernière actualisation à l’instant</span></div></section>
  </>;
}

function ScanningPage({ onImport }: { onImport: () => void }) {
  return <div className="scan-layout"><section className="panel scan-main"><div className="scan-stepper"><span className="current"><i>1</i> Préparer le lot</span><b /><span><i>2</i> Indexer</span><b /><span><i>3</i> Soumettre</span></div><button className="scan-dropzone" onClick={onImport} type="button"><span><Upload size={23} /></span><strong>Ajouter des documents au lot</strong><small>PDF, JPEG, PNG ou TIFF · 20 Mo maximum par fichier</small><em>Parcourir les fichiers</em></button><div className="scan-guidance"><ShieldCheck size={17} /><span><strong>Indexation maîtrisée</strong>Associez chaque fichier à un dossier et une catégorie avant soumission au circuit de validation.</span></div></section><aside className="panel scan-aside"><div className="panel-heading"><div><h3>À propos de la numérisation</h3><p>Traitement du lot de démonstration</p></div></div><div className="scan-aside-list"><div><span className="scan-aside-icon"><FileText size={16} /></span><span><strong>Fichiers acceptés</strong><small>PDF, JPG, PNG, TIFF</small></span></div><div><span className="scan-aside-icon"><LockKeyhole size={16} /></span><span><strong>Contrôle de format</strong><small>Rejet des formats exécutables et non pris en charge</small></span></div><div><span className="scan-aside-icon"><ClipboardCheck size={16} /></span><span><strong>Étape suivante</strong><small>Indexation puis examen par un validateur</small></span></div></div><div className="scan-mode-note"><strong>Mode local</strong><span>Le fichier sélectionné est prévisualisable dans cette session uniquement. Aucune copie n’est envoyée à un serveur.</span></div></aside></div>;
}

function UsersPage({ onProfile }: { onProfile: (profile: UserProfile) => void }) {
  return <>
    <div className="admin-notice"><ShieldCheck size={17} /><span><strong>Huit profils de démonstration</strong> · le changement de profil illustre l’interface et ne constitue pas un contrôle d’accès.</span></div>
    <section className="panel data-panel"><div className="panel-heading standalone-heading"><div><h3>Profils de démonstration</h3><p>Profils fictifs · Ministère des Finances</p></div><button className="button-secondary small-button" onClick={() => onProfile(demoUsers[0])} type="button"><Users size={15} />Changer de profil actif</button></div><div className="user-grid">{demoUsers.map((user, index) => <div className="user-card" key={user.key}><span className={`user-avatar user-avatar-${index % 5}`}>{user.initials}</span><span className="user-card-copy"><strong>{user.name}</strong><small>{user.role}</small><small>{index === 0 || index === 1 ? "Administration centrale" : departments[index % departments.length]}</small></span><span className={`status-pill ${index === 6 ? "status-gray" : "status-green"}`}>{index === 6 ? "Lecture seule" : "Actif"}</span><button className="row-action" title="Utiliser ce profil de démonstration" onClick={() => onProfile(user)} type="button"><ArrowLeftRight size={15} /></button></div>)}</div><div className="table-footer"><span>Profils fictifs · sans authentification ni contrôle d’accès</span><span>Les changements de profil servent uniquement à la présentation.</span></div></section>
  </>;
}

function OrganizationsPage({ activeId, onSwitch }: { activeId: string; onSwitch: (id: string) => void }) {
  return <><div className="admin-notice"><Building2 size={17} /><span><strong>Espaces de présentation isolés dans le navigateur</strong> · chaque organisation a ses propres jeux de données fictifs.</span></div><div className="organization-grid">{organizations.map((organization) => <article className={`organization-card ${organization.id === activeId ? "active" : ""}`} key={organization.id}><div className="organization-card-top"><span className="organization-large-avatar">{organization.initials}</span>{organization.id === activeId && <span className="status-pill status-green"><Check size={12} />Espace actif</span>}</div><div className="eyebrow">{organization.sector}</div><h3>{organization.name}</h3><p><Building2 size={14} />{organization.location}</p><div className="organization-card-footer"><span><Database size={14} />Jeu de données de démonstration</span><button className={organization.id === activeId ? "button-secondary" : "button-primary"} disabled={organization.id === activeId} onClick={() => onSwitch(organization.id)} type="button">{organization.id === activeId ? "Espace actuel" : "Ouvrir l’espace"}{organization.id !== activeId && <ChevronRight size={15} />}</button></div></article>)}</div></>;
}

function RetentionPage() {
  return <><div className="retention-banner"><span><CalendarClock size={19} /></span><div><strong>Cycle de conservation</strong><p>Les durées affichées sont des exemples configurables. Aucune élimination automatique n’est déclenchée.</p></div><span className="status-pill status-blue">5 politiques actives</span></div><section className="panel data-panel"><div className="table-scroll"><table><thead><tr><th>Politique</th><th>Catégorie documentaire</th><th>Durée</th><th>Échéance de référence</th><th>Responsable</th><th>Statut</th></tr></thead><tbody>{retentionPolicies.map((policy) => <tr key={policy.name}><td><strong className="plain-strong">{policy.name}</strong></td><td>{policy.category}</td><td><span className="retention-duration">{policy.duration}</span></td><td>{policy.date}</td><td>{policy.owner}</td><td><span className={`status-pill ${policy.status === "En vigueur" ? "status-green" : "status-amber"}`}>{policy.status}</span></td></tr>)}</tbody></table></div><div className="retention-safety"><LockKeyhole size={15} /><span>Tout processus d’élimination exige une revue et une approbation explicites ; aucun fichier ne sera supprimé automatiquement.</span></div></section></>;
}

function AuditPage({ activities }: { activities: DemoState["activities"] }) {
  return <><div className="admin-notice"><History size={17} /><span>Journal local de la session · les créations, imports, validations et prêts réalisés ici sont ajoutés à cette liste.</span></div><section className="panel data-panel"><div className="table-scroll"><table><thead><tr><th>Utilisateur</th><th>Action</th><th>Objet</th><th>Date / heure</th><th>Résultat</th></tr></thead><tbody>{activities.map((activity, index) => <tr key={`${activity.subject}-${index}`}><td><span className="table-person"><span className="tiny-avatar">{initials(activity.actor)}</span>{activity.actor}</span></td><td>{activity.action}</td><td><strong className="plain-strong">{activity.subject}</strong></td><td>{activity.time}</td><td><span className="status-pill status-green"><Check size={12} />Succès local</span></td></tr>)}</tbody></table></div><div className="table-footer"><span>{activities.length} opérations récentes</span><span>Non modifiable depuis cette interface</span></div></section></>;
}

function ReportsPage({ data }: { data: DemoState }) {
  const rows = categories.map((category) => ({ category, count: data.documents.filter((document) => document.category === category).length })).filter((row) => row.count).sort((a, b) => b.count - a.count);
  return <><div className="stats-grid report-stats"><StatCard title="Dossiers" value={formatNumber(data.folders.length)} note="Dans l’espace courant" icon={FolderClosed} tone="icon-blue" /><StatCard title="Documents" value={formatNumber(data.documents.length)} note="Indexés localement" icon={FileText} tone="icon-slate" /><StatCard title="Prêts en cours" value={formatNumber(data.loans.filter((loan) => loan.status === "En circulation").length)} note="Données de démonstration" icon={ArrowLeftRight} tone="icon-green" /><StatCard title="Activité tracée" value={formatNumber(data.activities.length)} note="Dernières opérations" icon={History} tone="icon-amber" /></div><section className="panel report-panel"><div className="panel-heading"><div><h3>Documents par catégorie</h3><p>Comptage calculé à partir des documents de cet espace</p></div><span className="report-source"><Database size={14} />Source : données locales</span></div><div className="report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 18, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#edf0f4" /><XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8290a1" }} /><Tooltip contentStyle={{ border: "1px solid #e8edf2", borderRadius: 9, fontSize: 12 }} /><Bar dataKey="count" fill="#183b5b" radius={[0, 4, 4, 0]} maxBarSize={20} /></BarChart></ResponsiveContainer></div><div className="report-category-list">{rows.map((row) => <div key={row.category}><span>{row.category}</span><strong>{row.count}</strong><div><i style={{ width: `${Math.max(3, row.count / Math.max(...rows.map((item) => item.count)) * 100)}%` }} /></div></div>)}</div></section><button className="button-secondary" onClick={() => { const csv = ["Catégorie;Documents", ...rows.map((row) => `${row.category};${row.count}`)].join("\r\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })); link.download = "archivia-rapport-categories.csv"; link.click(); URL.revokeObjectURL(link.href); }} type="button"><Download size={15} />Exporter les indicateurs en CSV</button></>;
}

function SettingsPage({ org }: { org: (typeof organizations)[number] }) {
  return <div className="settings-layout"><section className="panel settings-main"><div className="panel-heading"><div><h3>Configuration de l’espace</h3><p>Identité et paramètres de démonstration</p></div><span className="status-pill status-amber">Local</span></div><div className="settings-row"><span className="settings-icon"><Building2 size={17} /></span><span><strong>Organisation active</strong><small>{org.name}</small></span><span>{org.sector}</span></div><div className="settings-row"><span className="settings-icon"><GlobeIcon /></span><span><strong>Localisation</strong><small>Fuseau horaire de présentation</small></span><span>Africa / Porto-Novo</span></div><div className="settings-row"><span className="settings-icon"><HardDrive size={17} /></span><span><strong>Stockage</strong><small>Indicateur visuel, sans mesure réelle</small></span><span>Non connecté</span></div><div className="settings-row"><span className="settings-icon"><ShieldCheck size={17} /></span><span><strong>Mode de session</strong><small>Profil fictif enregistré dans ce navigateur</small></span><span>Démonstration locale</span></div><div className="settings-note"><LockKeyhole size={16} /><span><strong>Cette démo n’est pas un système de production.</strong><br />Les profils, permissions et données sont fictifs et ne fournissent aucune protection d’accès.</span></div></section><section className="panel settings-side"><div className="panel-heading"><div><h3>Configuration sectorielle</h3><p>Modèle adapté à l’organisation</p></div></div><div className="sector-preview"><div className="sector-icon"><BriefcaseBusiness size={19} /></div><strong>{org.sector}</strong><span>Référentiels documentaires configurables par organisation</span><div className="sector-chips"><i>Dossiers</i><i>Catégories</i><i>Workflows</i><i>Conservation</i></div></div><div className="settings-placeholder"><Settings2 size={17} /><span>Les paramètres modifiables sont illustratifs dans cette version de démonstration.</span></div></section></div>;
}

function DocumentDetail({ document: item, folder, fileUrl, onEdit, onDecide }: {
  document: DocumentRecord;
  folder?: FolderRecord;
  fileUrl?: string;
  onEdit: (document: DocumentRecord) => void;
  onDecide: (document: DocumentRecord, decision: "approve" | "correction") => void;
}) {
  const isImage = /\.(png|jpe?g|tiff?)$/i.test(item.fileName);
  return <div className="document-detail"><div className="document-preview">{fileUrl ? isImage ? <Image src={fileUrl} alt={`Aperçu de ${item.title}`} width={600} height={400} unoptimized /> : <iframe src={fileUrl} title={`Aperçu de ${item.title}`} /> : <div className="preview-unavailable"><FileText size={32} /><strong>Aucun fichier binaire disponible</strong><span>Ce document provient du jeu de données local. Les fichiers d’exemple sont des métadonnées fictives.</span></div>}</div><div className="document-metadata"><div><small>Titre</small><strong>{item.title}</strong></div><div><small>Référence</small><strong>{item.reference}</strong></div><div><small>Catégorie</small><strong>{item.category}</strong></div><div><small>Dossier associé</small><strong>{folder?.title ?? "Non classé"}</strong></div><div><small>Service responsable</small><strong>{item.department}</strong></div><div><small>Version</small><strong>{item.version}</strong></div><div><small>Confidentialité</small><strong><LockKeyhole size={13} />{item.confidentiality}</strong></div><div><small>Statut</small><strong>{item.status}</strong></div></div><div className="detail-actions"><button className="button-secondary" onClick={() => onEdit(item)} type="button"><Settings2 size={15} />Modifier les métadonnées</button>{fileUrl && <a className="button-secondary" href={fileUrl} download={item.fileName}><Download size={15} />Télécharger</a>}{item.status === "En attente" && <><button className="button-secondary" onClick={() => onDecide(item, "correction")} type="button"><XCircle size={15} />Demander une correction</button><button className="button-primary" onClick={() => onDecide(item, "approve")} type="button"><Check size={15} />Valider et archiver</button></>}</div><div className="detail-local-note"><LockKeyhole size={14} />Consultation locale de démonstration · historique réel de fichier non disponible pour ce document fictif.</div></div>;
}

function FolderDetail({ folder, documents, onDocument, onEdit, onToggleStatus }: {
  folder?: FolderRecord;
  documents: DocumentRecord[];
  onDocument: (document: DocumentRecord) => void;
  onEdit: (folder: FolderRecord) => void;
  onToggleStatus: (folder: FolderRecord, status: FolderRecord["status"]) => void;
}) {
  if (!folder) return <div className="empty-search"><FolderOpen size={25} /><strong>Dossier introuvable</strong><span>Ce dossier n’est plus disponible dans cet espace.</span></div>;
  return <div className="folder-detail"><div className="folder-detail-hero"><span className="folder-detail-icon"><FolderOpen size={21} /></span><div><h3>{folder.title}</h3><p>{folder.reference}</p></div><span className={`status-pill ${folder.status === "Ouvert" ? "status-blue" : "status-gray"}`}>{folder.status}</span></div><div className="document-metadata"><div><small>Catégorie</small><strong>{folder.category}</strong></div><div><small>Service responsable</small><strong>{folder.department}</strong></div><div><small>Responsable</small><strong>{folder.owner}</strong></div><div><small>Confidentialité</small><strong>{folder.confidentiality}</strong></div><div><small>Dernière activité</small><strong>{folder.updated}</strong></div><div><small>Documents associés</small><strong>{documents.length}</strong></div></div><div className="detail-actions"><button className="button-secondary" onClick={() => onEdit(folder)} type="button"><Settings2 size={15} />Modifier le dossier</button><button className="button-secondary" onClick={() => { if (window.confirm(folder.status === "Ouvert" ? "Clôturer ce dossier ?" : "Réactiver ce dossier ?")) onToggleStatus(folder, folder.status === "Ouvert" ? "Clôturé" : "Ouvert"); }} type="button">{folder.status === "Ouvert" ? "Clôturer" : "Réactiver"}</button></div><div className="folder-documents-heading"><strong>Documents associés</strong><span>{documents.length} pièce(s)</span></div>{documents.map((document) => <button className="search-result-row" key={document.id} onClick={() => onDocument(document)} type="button"><span className="file-icon pdf"><FileText size={15} /></span><span><strong>{document.title}</strong><small>{document.reference} · {document.category}</small></span><span className={`status-pill ${document.status === "Archivé" ? "status-green" : "status-amber"}`}>{document.status}</span><ChevronRight size={15} /></button>)}{!documents.length && <div className="empty-documents">Aucun document associé pour le moment.</div>}<div className="detail-local-note"><History size={14} />Cette activité récente est conservée localement dans le navigateur.</div></div>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><h3 id="modal-title">{title}</h3><p>{subtitle}</p></div><button onClick={onClose} className="modal-close" aria-label="Fermer" type="button"><X size={18} /></button></div>{children}</section></div>;
}

function GlobeIcon() {
  return <Command size={17} />;
}
