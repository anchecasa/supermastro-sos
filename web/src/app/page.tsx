import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "SuperMastro — AncheCasa",
  description: "Il tuo problema di casa, un mastro in zona. Gratis per te.",
};

export default function HomePage() {
  redirect("/supermastro");
}
