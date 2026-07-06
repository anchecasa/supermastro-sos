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
    <article className="min-w-0">
      <header className="mb-8 border-b border-[var(--border)] pb-6">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
        ) : null}
        <p className="mt-3 break-words text-xs leading-relaxed text-muted">
          Ultimo aggiornamento: {lastUpdated} · Documento informativo ai sensi del Regolamento UE
          2016/679 (GDPR) e normativa italiana applicabile
        </p>
      </header>
      <div className="legal-prose min-w-0 space-y-8 text-sm leading-relaxed text-muted [&_a]:break-words [&_a]:text-brand [&_a]:underline-offset-2 [&_h2]:mt-8 [&_h2]:text-balance [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:mt-3 [&_section]:min-w-0 [&_strong]:font-medium [&_strong]:text-foreground [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:text-left [&_td]:break-words [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-2 [&_td]:py-2 [&_td]:align-top [&_td]:sm:px-3 [&_th]:break-words [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--background)] [&_th]:px-2 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-foreground [&_th]:sm:px-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 hover:[&_a]:underline">
        {children}
      </div>
    </article>
  );
}
