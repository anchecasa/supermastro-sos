export const TALENT_SIGNUP_DRAFT_KEY = "supermastro_talent_signup_draft";

export type TalentType = "artisan" | "employee";

export type TalentSignupDraft = {
  talentType: TalentType;
  skill: string;
  cap: string;
  comune?: string;
};

export function saveTalentSignupDraft(draft: TalentSignupDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TALENT_SIGNUP_DRAFT_KEY, JSON.stringify(draft));
}

export function readTalentSignupDraft(): TalentSignupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TALENT_SIGNUP_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TalentSignupDraft;
  } catch {
    return null;
  }
}

export function clearTalentSignupDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TALENT_SIGNUP_DRAFT_KEY);
}

/** @deprecated use TALENT_SIGNUP_DRAFT_KEY */
export const WORKER_SIGNUP_DRAFT_KEY = TALENT_SIGNUP_DRAFT_KEY;

/** @deprecated use TalentSignupDraft */
export type WorkerSignupDraft = TalentSignupDraft;

export function saveWorkerSignupDraft(draft: TalentSignupDraft) {
  saveTalentSignupDraft(draft);
}

export function readWorkerSignupDraft(): TalentSignupDraft | null {
  return readTalentSignupDraft();
}

export function clearWorkerSignupDraft() {
  clearTalentSignupDraft();
}
