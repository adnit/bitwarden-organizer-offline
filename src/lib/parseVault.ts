import type { BitwardenExport, VaultItem } from '../types/bitwarden';

export interface EncryptedVaultMetadata {
  encrypted: true;
  data: string;
  salt: string;
  kdfIterations: number;
  kdfMemory: number;
  kdfParallelism: number;
  kdfType: number;
}

export type VaultParseResult = BitwardenExport | EncryptedVaultMetadata;

/**
 * Parses raw JSON text from a Bitwarden export file.
 */
export function parseVaultJson(jsonText: string): VaultParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Invalid JSON: The file could not be parsed.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid format: Expected a JSON object.');
  }

  const data = parsed as Record<string, any>;

  // Detect Password-Protected encrypted export
  if (data.encrypted === true && data.data && typeof data.data === 'string') {
    return {
      encrypted: true,
      data: data.data,
      salt: data.salt || '',
      kdfIterations: typeof data.kdfIterations === 'number' ? data.kdfIterations : 100000,
      kdfMemory: typeof data.kdfMemory === 'number' ? data.kdfMemory : 64,
      kdfParallelism: typeof data.kdfParallelism === 'number' ? data.kdfParallelism : 4,
      kdfType: typeof data.kdfType === 'number' ? data.kdfType : 0, // 0 = PBKDF2
    };
  }

  // Detect Account-Restricted encrypted export (items are encrypted)
  if (data.encrypted === true && Array.isArray(data.items)) {
    throw new Error(
      'ACCOUNT_RESTRICTED: This vault uses Account-Restricted encryption. ' +
      'Please export as a password-protected JSON or an Unencrypted JSON for compatibility.'
    );
  }

  // Validate unencrypted items
  if (!Array.isArray(data.items)) {
    throw new Error('Invalid format: Missing "items" array.');
  }

  return {
    encrypted: false,
    folders: Array.isArray(data.folders) ? data.folders : [],
    items: data.items as VaultItem[],
  };
}
