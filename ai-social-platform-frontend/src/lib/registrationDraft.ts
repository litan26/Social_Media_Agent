export interface RegistrationDraft {
  email: string;
  phone: string;
  password: string;
}

const STORAGE_KEY = 'registration_draft';

export function saveRegistrationDraft(draft: RegistrationDraft): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function getRegistrationDraft(): RegistrationDraft | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RegistrationDraft;
  } catch {
    return null;
  }
}

export function clearRegistrationDraft(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
