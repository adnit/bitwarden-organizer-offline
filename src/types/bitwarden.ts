// ============================================================
// Bitwarden Export JSON Schema Types
// ============================================================

export type BitwardenItemType = 1 | 2 | 3 | 4; // Login=1, SecureNote=2, Card=3, Identity=4

export interface BitwardenUri {
  match: number | null;
  uri: string;
}

export interface BitwardenLogin {
  uris: BitwardenUri[] | null;
  username: string | null;
  password: string | null;
  totp: string | null;
}

export interface BitwardenCard {
  cardholderName: string | null;
  brand: string | null;
  number: string | null;
  expMonth: string | null;
  expYear: string | null;
  code: string | null;
}

export interface BitwardenIdentity {
  title: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  ssn: string | null;
  username: string | null;
  passportNumber: string | null;
  licenseNumber: string | null;
}

export interface BitwardenField {
  name: string | null;
  value: string | null;
  type: number;
  linkedId: null;
}

export interface BitwardenPasswordHistory {
  lastUsedDate: string;
  password: string;
}

export interface BitwardenSecureNote {
  type: number;
}

export interface VaultItem {
  id: string;
  organizationId: string | null;
  folderId: string | null;
  type: BitwardenItemType;
  name: string;
  notes: string | null;
  favorite: boolean;
  fields: BitwardenField[] | null;
  login: BitwardenLogin | null;
  secureNote: BitwardenSecureNote | null;
  card: BitwardenCard | null;
  identity: BitwardenIdentity | null;
  reprompt: number;
  passwordHistory: BitwardenPasswordHistory[] | null;
  revisionDate: string | null;
  creationDate: string | null;
  deletedDate: string | null;
  collectionIds: string[] | null;
}

export interface BitwardenFolder {
  id: string;
  name: string;
}

export interface BitwardenExport {
  encrypted: boolean;
  passwordProtected?: boolean;
  salt?: string;
  kdfIterations?: number;
  kdfMemory?: number;
  kdfParallelism?: number;
  kdfType?: number;
  encKeyValidation_DO_NOT_EDIT?: string;
  data?: string; // encrypted payload
  folders: BitwardenFolder[];
  items: VaultItem[];
}

// ============================================================
// Internal Analysis Types
// ============================================================

export type AutoMergeResolution = 'approved' | 'skipped' | 'manual';

/** A group of items with the EXACT same domain + username + password → auto-merged */
export interface AutoMergeGroup {
  id: string; // synthetic group ID
  baseDomain: string;
  username: string;
  password: string;
  items: VaultItem[];
  /** The merged result item (pre-computed default) */
  mergedItem: VaultItem;
  /** User-edited merged result if resolution is 'manual' */
  customItem: VaultItem | null;
  /** Whether to merge or keep separate */
  resolution: AutoMergeResolution;
}

/** A conflict group: same base domain, different username OR password */
export interface ConflictGroup {
  id: string;
  baseDomain: string;
  items: VaultItem[];
  /** The item the user selects to keep / the edited merge result */
  resolvedItem: VaultItem | null;
  /** 'keep-a' | 'keep-b' | 'keep-all' | 'custom' | 'skipped' */
  resolution: ConflictResolution;
}

export type ConflictResolution = 'keep-a' | 'keep-b' | 'keep-all' | 'custom' | 'skipped' | 'pending';

/** A group of items sharing the same password across DIFFERENT base domains */
export interface PasswordReuseGroup {
  id: string;
  password: string;
  items: VaultItem[];
}

export interface VaultAnalysis {
  totalItems: number;
  autoMergeGroups: AutoMergeGroup[];
  conflictGroups: ConflictGroup[];
  passwordReuseGroups: PasswordReuseGroup[];
  /** Items that had no issues at all */
  cleanItems: VaultItem[];
}

// ============================================================
// App Step / State Types
// ============================================================

export type AppStep =
  | 'upload'
  | 'dashboard'
  | 'auto-merge'
  | 'conflicts'
  | 'password-reuse'
  | 'export';

export interface AppState {
  step: AppStep;
  rawExport: BitwardenExport | null;
  analysis: VaultAnalysis | null;
  fileName: string;
}
