import type { Metadata } from "next";

import Link from "next/link";

import { ArtigianoPrivacyContent } from "@/components/legal/artigiano-privacy-content";

import { LegalPageShell } from "@/components/legal/legal-page-shell";

import { ContentPage } from "@/components/layout/content-page";



export const metadata: Metadata = {

  title: "Informativa Privacy — Artigiani",

  description: "Informativa privacy per artigiani iscritti alla piattaforma AncheCasa.",

};



export default function ArtigianoPrivacyPage() {

  return (

    <ContentPage>

      <Link href="/artigiano" className="text-sm text-brand hover:underline">

        ← Area mastri

      </Link>

      <LegalPageShell

        title="Informativa sulla privacy"

        subtitle="Programma Artigiano / Mastri — AncheCasa"

      >

        <ArtigianoPrivacyContent />

      </LegalPageShell>

    </ContentPage>

  );

}

