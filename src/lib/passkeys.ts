import type { BitwardenFido2Credential, VaultItem } from '../types/bitwarden';

/** Returns the passkeys stored on an item (empty array if none). */
export function getPasskeys(item: VaultItem | null | undefined): BitwardenFido2Credential[] {
  return item?.login?.fido2Credentials ?? [];
}

export function hasPasskey(item: VaultItem | null | undefined): boolean {
  return getPasskeys(item).length > 0;
}

/** Stable identity for a passkey: the same credential copied across items shares an ID. */
function passkeyKey(cred: BitwardenFido2Credential): string {
  return cred.credentialId || JSON.stringify(cred);
}

/** Collects all passkeys from the given items, de-duplicated by credential ID. */
export function collectDistinctPasskeys(items: VaultItem[]): BitwardenFido2Credential[] {
  const seen = new Map<string, BitwardenFido2Credential>();
  for (const item of items) {
    for (const cred of getPasskeys(item)) {
      const key = passkeyKey(cred);
      if (!seen.has(key)) seen.set(key, cred);
    }
  }
  return Array.from(seen.values());
}

/** Items in `items` (other than `kept`) whose passkeys are not present on `kept`. */
export function itemsWithLostPasskeys(items: VaultItem[], kept: VaultItem | null): VaultItem[] {
  const keptKeys = new Set(getPasskeys(kept).map(passkeyKey));
  return items.filter(
    (i) => i.id !== kept?.id && getPasskeys(i).some((c) => !keptKeys.has(passkeyKey(c))),
  );
}
