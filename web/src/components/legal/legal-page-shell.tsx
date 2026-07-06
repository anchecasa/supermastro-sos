import { LEGAL_LAST_UPDATED } from "@/lib/legal/constants";

type Props = {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  title,
  subtitle,
  lastUpdated = LEGAL_LAST_UPDATED,
  children,
}: Props) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          Ultimo aggiornamento: {lastUpdated} · Documento informativo ai sensi del Regolamento UE
          2016/679 (GDPR) e normativa italiana applicabile
        </p>
      </header>
      <div className="legal-prose space-y-8 text-sm leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-medium [&_strong]:text-foreground [&_table]:w-full [&_table]:text-left [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--background)] [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-brand [&_a]:underline-offset-2 hover:[&_a]:underline">
        {children}
      </div>
    </article>
  );
}
