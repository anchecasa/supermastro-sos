import {
  SKILL_SECTOR_LABELS,
  WORKER_SKILL_CATALOG,
  type SkillSector,
} from "@/lib/worker-skills";

export type SectorRow = {
  skill_slug: string;
  skill_label: string;
  sos_enabled: boolean;
  talent_count: number;
  talent_active: number;
  talent_pending: number;
  talent_suspended: number;
  annunci_total: number;
  annunci_pending: number;
  annunci_open: number;
  annunci_matched: number;
  sos_total: number;
  sos_active: number;
};

export type SituationCounts = {
  pending_verification: number;
  sos_active: number;
  jobs_pending_review: number;
  open_disputes: number;
  suspended_workers: number;
  active_workers: number;
  open_jobs: number;
  active_employers: number;
};

export type SectorGroup = {
  id: SkillSector;
  label: string;
  slugs: string[];
  talent_count: number;
  talent_pending: number;
  annunci_open: number;
  annunci_pending: number;
  sos_active: number;
};

const SLUG_TO_SECTOR = new Map(
  WORKER_SKILL_CATALOG.map((s) => [s.slug, s.sector] as const)
);

export function getSkillSector(slug: string): SkillSector | null {
  return SLUG_TO_SECTOR.get(slug) ?? null;
}

export function isSkillSectorSlug(slug: string): slug is SkillSector {
  return slug in SKILL_SECTOR_LABELS;
}

export function resolveSkillFilter(slug: string): {
  sector: SkillSector | null;
  skillSlug: string | null;
  title: string;
} {
  if (isSkillSectorSlug(slug)) {
    return {
      sector: slug,
      skillSlug: null,
      title: SKILL_SECTOR_LABELS[slug],
    };
  }
  const sector = getSkillSector(slug);
  const label =
    WORKER_SKILL_CATALOG.find((s) => s.slug === slug)?.label ?? slug;
  return {
    sector,
    skillSlug: slug,
    title: label,
  };
}

export function aggregateSectorGroups(rows: SectorRow[]): SectorGroup[] {
  const sectors = Object.keys(SKILL_SECTOR_LABELS) as SkillSector[];

  return sectors.map((sector) => {
    const slugs = WORKER_SKILL_CATALOG.filter((s) => s.sector === sector).map(
      (s) => s.slug
    );
    const sectorRows = rows.filter((r) => slugs.includes(r.skill_slug));

    return {
      id: sector,
      label: SKILL_SECTOR_LABELS[sector],
      slugs,
      talent_count: sectorRows.reduce((a, r) => a + r.talent_count, 0),
      talent_pending: sectorRows.reduce((a, r) => a + r.talent_pending, 0),
      annunci_open: sectorRows.reduce(
        (a, r) => a + r.annunci_open + r.annunci_matched,
        0
      ),
      annunci_pending: sectorRows.reduce((a, r) => a + r.annunci_pending, 0),
      sos_active: sectorRows.reduce((a, r) => a + r.sos_active, 0),
    };
  });
}

export function urgencyLevel(count: number): "ok" | "warn" | "urgent" {
  if (count === 0) return "ok";
  if (count <= 5) return "warn";
  return "urgent";
}

export const SITUATION_PILLS: {
  key: keyof SituationCounts;
  label: string;
  href: string;
  urgentKeys?: (keyof SituationCounts)[];
}[] = [
  {
    key: "pending_verification",
    label: "Verifica in attesa",
    href: "/admin/verifica",
  },
  {
    key: "sos_active",
    label: "SOS attivi",
    href: "/admin/monitor",
  },
  {
    key: "jobs_pending_review",
    label: "Annunci da approvare",
    href: "/admin/annunci?status=pending_review",
  },
  {
    key: "open_disputes",
    label: "Dispute aperte",
    href: "/admin/dispute",
  },
  {
    key: "suspended_workers",
    label: "Talent sospesi",
    href: "/admin/talent?status=suspended",
  },
];
