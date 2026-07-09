import Image from "next/image";
import { HardLink } from "@/components/layout/hard-link";
import { cn } from "@/lib/utils";

const SUPERMASTRO_HOME_LOGO = "/images/supermastro-mezzobusto.png";

type SiteHeaderProps = {
  product: "supermastro" | "artigiano" | "lavoro";
  subtitle?: string;
  className?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function SiteHeader({
  product,
  subtitle,
  className,
  ctaHref,
  ctaLabel,
}: SiteHeaderProps) {
  const home =
    product === "supermastro"
      ? "/supermastro"
      : product === "lavoro"
        ? "/lavoro"
        : "/artigiano";
  const label =
    product === "supermastro"
      ? "SuperMastro"
      : product === "lavoro"
        ? "AncheCasa Lavoro"
        : "Area Mastri";
  const secondaryHref =
    product === "supermastro"
      ? "/supermastro/lavoro"
      : product === "lavoro"
        ? "/supermastro"
        : "/supermastro";
  const secondaryLabel =
    product === "supermastro"
      ? "Cerco lavoro"
      : product === "lavoro"
        ? "SOS casa"
        : "Problema in casa?";
  const hideSecondaryLink =
    Boolean(ctaHref && ctaLabel) &&
    ctaHref === secondaryHref &&
    ctaLabel === secondaryLabel;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-[var(--border)] bg-white/95 backdrop-blur-sm",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <HardLink
          href={home}
          className="group flex shrink-0 items-center"
          aria-label={product === "supermastro" ? "SuperMastro" : label}
        >
          {product === "supermastro" ? (
            <Image
              src={SUPERMASTRO_HOME_LOGO}
              alt="SuperMastro"
              width={56}
              height={56}
              className="h-12 w-auto sm:h-14"
              priority
            />
          ) : (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
                {label}
              </span>
              <span className="block truncate text-[11px] text-muted">
                {subtitle ?? "by AncheCasa"}
              </span>
            </span>
          )}
        </HardLink>

        <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
          {!hideSecondaryLink && (
            <HardLink
              href={secondaryHref}
              className="hidden text-xs font-medium text-muted transition-colors hover:text-foreground sm:inline"
            >
              {secondaryLabel}
            </HardLink>
          )}
          {ctaHref && ctaLabel && (
            <HardLink
              href={ctaHref}
              className={cn(
                "inline-flex h-9 max-w-[9.5rem] shrink items-center justify-center rounded-full px-3 text-center text-xs font-semibold leading-tight text-white shadow-sm transition sm:max-w-none sm:px-4",
                product === "artigiano"
                  ? "bg-worker hover:bg-amber-600"
                  : "bg-brand hover:bg-blue-700"
              )}
            >
              {ctaLabel}
            </HardLink>
          )}
        </div>
      </div>
    </header>
  );
}
