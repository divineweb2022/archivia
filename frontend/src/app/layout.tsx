import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARCHIVIA — Votre patrimoine documentaire, organisé et sécurisé",
  description: "Plateforme universelle de gestion documentaire et d’archivage électronique et physique.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
