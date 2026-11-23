import type { Metadata } from "next";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { authService } from "@/services/auth.service";
import type { SessionUserDTO } from "@/types/user";
import "./globals.css";

// Serif editorial para titulares, sans geométrica para interfaz y mono para datos.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Encuentra Campus",
  description:
    "Plataforma universitaria para reportar, buscar y reclamar objetos encontrados en el campus.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let currentUser: SessionUserDTO | null = null;
  try {
    currentUser = await authService.getCurrentSessionUser();
  } catch {
    currentUser = null;
  }

  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">
        <Navbar initialUser={currentUser} />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-rule bg-bone py-5 text-center font-mono text-[11px] tracking-wide text-sepia">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            Encuentra Campus · Fundación Universitaria Tecnológico Comfenalco —
            Sede B (Cedesarrollo)
          </div>
        </footer>
      </body>
    </html>
  );
}
