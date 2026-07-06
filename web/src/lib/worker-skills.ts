/** Catalogo talent — edilizia, ufficio, logistica, Horeca, condomini */

export type SkillSector =
  | "edilizia"
  | "ufficio"
  | "logistica"
  | "horeca"
  | "condomini";

export type WorkerSkillOption = {
  slug: string;
  label: string;
  sector: SkillSector;
  /** Riceve inviti SOS quando il profilo è active */
  sosEnabled: boolean;
  /** Disponibile per profilo dipendente */
  employeeEligible: boolean;
  /** Disponibile per profilo artigiano */
  artisanEligible: boolean;
};

export const SKILL_SECTOR_LABELS: Record<SkillSector, string> = {
  edilizia: "Edilizia e artigianato",
  ufficio: "Ufficio e amministrativo",
  logistica: "Logistica e trasporti",
  horeca: "Hotel e ristorazione",
  condomini: "Condomini e servizi",
};

export const WORKER_SKILL_CATALOG: WorkerSkillOption[] = [
  { slug: "idraulico", label: "Idraulico", sector: "edilizia", sosEnabled: true, employeeEligible: false, artisanEligible: true },
  { slug: "elettricista", label: "Elettricista", sector: "edilizia", sosEnabled: true, employeeEligible: false, artisanEligible: true },
  { slug: "fabbro", label: "Fabbro / serrature", sector: "edilizia", sosEnabled: true, employeeEligible: false, artisanEligible: true },
  { slug: "muratore", label: "Muratore", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "saldatore", label: "Saldatore", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "imbianchino", label: "Imbianchino", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "cartongesso", label: "Cartongesso", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "piastrellista", label: "Piastrellista", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "falegname", label: "Falegname", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "serramentista", label: "Serramentista", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "giardiniere", label: "Giardiniere", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "carpentiere", label: "Carpentiere", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "climatizzazione", label: "Climatizzazione", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "lattoniere", label: "Lattoniere / tetto", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "ristrutturazioni", label: "Ristrutturazioni", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "costruzioni", label: "Costruzioni", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "pulizie", label: "Pulizie professionali", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "disinfestazione", label: "Disinfestazione", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "geometra", label: "Geometra", sector: "edilizia", sosEnabled: false, employeeEligible: false, artisanEligible: true },
  { slug: "architetto", label: "Architetto", sector: "edilizia", sosEnabled: false, employeeEligible: false, artisanEligible: true },
  { slug: "ingegnere", label: "Ingegnere", sector: "edilizia", sosEnabled: false, employeeEligible: false, artisanEligible: true },
  { slug: "elettricista_industriale", label: "Elettricista industriale", sector: "edilizia", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "manutentore", label: "Manutentore condominio", sector: "condomini", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "portiere", label: "Portiere / custode", sector: "condomini", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "addetto_pulizie", label: "Addetto pulizie", sector: "condomini", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "segretaria", label: "Segretaria / amministrativo", sector: "ufficio", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "receptionist", label: "Receptionist", sector: "ufficio", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "commesso", label: "Commesso / vendita", sector: "ufficio", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "fattorino", label: "Fattorino / consegne", sector: "logistica", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "magazziniere", label: "Magazziniere", sector: "logistica", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "autista", label: "Autista", sector: "logistica", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "operaio_generico", label: "Operaio generico", sector: "logistica", sosEnabled: false, employeeEligible: true, artisanEligible: true },
  { slug: "cameriere", label: "Cameriere / sala", sector: "horeca", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "cuoco", label: "Cuoco / aiuto cucina", sector: "horeca", sosEnabled: false, employeeEligible: true, artisanEligible: false },
  { slug: "barista", label: "Barista", sector: "horeca", sosEnabled: false, employeeEligible: true, artisanEligible: false },
];

export type TalentType = "artisan" | "employee";

export const WORKER_SKILL_SLUGS = WORKER_SKILL_CATALOG.map((s) => s.slug);

export const SOS_SKILL_OPTIONS = WORKER_SKILL_CATALOG.filter((s) => s.sosEnabled);

export function getWorkerSkillLabel(slug: string): string {
  return WORKER_SKILL_CATALOG.find((s) => s.slug === slug)?.label ?? slug;
}

export function isSosSkill(slug: string): boolean {
  return WORKER_SKILL_CATALOG.some((s) => s.slug === slug && s.sosEnabled);
}

export function getSkillsForTalentType(talentType: TalentType): WorkerSkillOption[] {
  return WORKER_SKILL_CATALOG.filter((s) =>
    talentType === "artisan" ? s.artisanEligible : s.employeeEligible
  );
}

export function getSkillsBySector(talentType: TalentType): Record<SkillSector, WorkerSkillOption[]> {
  const skills = getSkillsForTalentType(talentType);
  const sectors = Object.keys(SKILL_SECTOR_LABELS) as SkillSector[];
  return sectors.reduce(
    (acc, sector) => {
      acc[sector] = skills.filter((s) => s.sector === sector);
      return acc;
    },
    {} as Record<SkillSector, WorkerSkillOption[]>
  );
}

export function validateItalianVat(vat: string): boolean {
  const digits = vat.replace(/\D/g, "");
  return digits.length === 11;
}
