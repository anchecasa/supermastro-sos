export type UserRole = "client" | "worker" | "admin";

export const REGISTRATION_CONSENT_PURPOSE = "terms_and_privacy";

const ROLE_HOME: Record<UserRole, string> = {
  client: "/supermastro",
  worker: "/supermastro/profilo",
  admin: "/admin",
};

const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  client: ["/supermastro", "/lavoro"],
  worker: ["/artigiano", "/supermastro", "/lavoro"],
  admin: ["/admin"],
};

export function getDefaultHomePath(role: UserRole): string {
  return ROLE_HOME[role];
}

/** Consente solo path interni coerenti con il ruolo (open redirect safe). */
export function sanitizeAuthNextPath(
  next: string | null | undefined,
  role: UserRole
): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  const allowed = ROLE_ALLOWED_PREFIXES[role];
  if (!allowed.some((prefix) => next === prefix || next.startsWith(`${prefix}/`))) {
    return null;
  }

  return next;
}

export function getAuthCallbackUrl(
  role: UserRole,
  origin: string,
  next?: string | null
): string {
  const base = role === "worker" ? "/artigiano" : "/supermastro";
  const callback = `${origin}${base}/auth/callback`;
  const safeNext = sanitizeAuthNextPath(next, role);

  if (safeNext) {
    return `${callback}?next=${encodeURIComponent(safeNext)}`;
  }

  return callback;
}

export type AvailabilityType = "full_time" | "part_time" | "seasonal" | "flexible";

export const AVAILABILITY_OPTIONS: { value: AvailabilityType; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "seasonal", label: "Stagionale" },
  { value: "flexible", label: "Flessibile" },
];

export type OrganizationType = "condominium" | "hotel" | "company" | "other";

export const ORGANIZATION_TYPE_OPTIONS: { value: OrganizationType; label: string }[] = [
  { value: "condominium", label: "Condominio" },
  { value: "hotel", label: "Hotel / struttura ricettiva" },
  { value: "company", label: "Ditta / azienda" },
  { value: "other", label: "Altro" },
];
