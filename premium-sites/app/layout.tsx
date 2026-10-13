import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { default: "Les univers Orbytek", template: "%s" },
  description:
    "Trois expériences digitales premium : immobilier, restauration et paysage.",
  robots: { index: false, follow: true },
  icons: { icon: "/demos/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr-BE">
      <body>{children}</body>
    </html>
  );
}
