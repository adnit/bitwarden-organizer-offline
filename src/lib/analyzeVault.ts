import { v4 as uuidv4 } from 'uuid';
import type {
  VaultItem,
  BitwardenExport,
  VaultAnalysis,
  AutoMergeGroup,
  ConflictGroup,
  PasswordReuseGroup,
} from '../types/bitwarden';
import { extractBaseDomain } from './domainUtils';

/** Returns the primary URI string for a login item, or null. */
function primaryUri(item: VaultItem): string | null {
  return item.login?.uris?.[0]?.uri ?? null;
}

/** Returns a stable string key for auto-merge detection. */
function autoMergeKey(domain: string, username: string, password: string): string {
  return `${domain}||${username.toLowerCase().trim()}||${password}`;
}

/**
 * Merges multiple VaultItems into a single item.
 * Combines all unique URIs and picks the most-recently-created item as the base.
 */
function mergeItems(items: VaultItem[]): VaultItem {
  // Sort by creation date descending – newest first
  const sorted = [...items].sort((a, b) => {
    const da = a.creationDate ? new Date(a.creationDate).getTime() : 0;
    const db = b.creationDate ? new Date(b.creationDate).getTime() : 0;
    return db - da;
  });

  const base = sorted[0];
  const allUriStrings = new Set<string>();
  for (const item of sorted) {
    for (const u of item.login?.uris ?? []) {
      if (u.uri) allUriStrings.add(u.uri);
    }
  }

  const mergedUris = Array.from(allUriStrings).map((uri) => ({ match: null, uri }));

  return {
    ...base,
    id: uuidv4(),
    login: base.login
      ? {
          ...base.login,
          uris: mergedUris,
        }
      : null,
    // Keep the earliest creation date
    creationDate: items
      .map((i) => i.creationDate)
      .filter(Boolean)
      .sort()[0] ?? null,
    revisionDate: new Date().toISOString(),
  };
}

/**
 * Main vault analysis function.
 *
 * Categorizes all login items into:
 *   1. Auto-merge groups (exact domain + username + password match)
 *   2. Conflict groups (same domain, different username/password)
 *   3. Password reuse groups (same password across different domains)
 *   4. Clean items (no issues)
 */
export function analyzeVault(exportData: BitwardenExport): VaultAnalysis {
  const loginItems = exportData.items.filter((item) => item.type === 1 && item.login);
  const nonLoginItems = exportData.items.filter((item) => item.type !== 1 || !item.login);

  // --- Step 1: Group by base domain ---
  const domainMap = new Map<string, VaultItem[]>();

  for (const item of loginItems) {
    const uri = primaryUri(item);
    const domain = uri ? extractBaseDomain(uri) : null;

    if (!domain) {
      // No parseable domain → treat as clean
      continue;
    }

    const bucket = domainMap.get(domain) ?? [];
    bucket.push(item);
    domainMap.set(domain, bucket);
  }

  const autoMergeGroups: AutoMergeGroup[] = [];
  const conflictGroups: ConflictGroup[] = [];
  const processedItemIds = new Set<string>();

  // --- Step 2: Within each domain, handle auto-merges and conflicts ---
  for (const [domain, items] of domainMap.entries()) {
    if (items.length === 1) continue;

    const subGroups = new Map<string, VaultItem[]>();
    for (const item of items) {
      const username = (item.login?.username ?? '').toLowerCase().trim();
      const password = item.login?.password ?? '';
      const key = autoMergeKey(domain, username, password);
      const bucket = subGroups.get(key) ?? [];
      bucket.push(item);
      subGroups.set(key, bucket);
    }

    // itemsToProcess will contain one "representative" item per auto-merge group
    const representatives: VaultItem[] = [];
    const representativeToOriginals = new Map<string, VaultItem[]>();

    for (const [key, groupItems] of subGroups.entries()) {
      if (groupItems.length > 1) {
        const merged = mergeItems(groupItems);
        const [, username, password] = key.split('||');
        autoMergeGroups.push({
          id: uuidv4(),
          baseDomain: domain,
          username,
          password,
          items: groupItems,
          mergedItem: merged,
          customItem: null,
          resolution: 'approved',
        });
        for (const i of groupItems) processedItemIds.add(i.id);
        
        // We use the merged item as the representative for conflict checking
        representatives.push(merged);
        representativeToOriginals.set(merged.id, groupItems);
      } else {
        representatives.push(groupItems[0]);
        representativeToOriginals.set(groupItems[0].id, groupItems);
      }
    }

    if (representatives.length < 2) continue;

    // Build adjacency list for conflicts between representatives
    const adj = new Map<string, string[]>();
    for (let i = 0; i < representatives.length; i++) {
      for (let j = i + 1; j < representatives.length; j++) {
        const a = representatives[i];
        const b = representatives[j];
        
        const userA = (a.login?.username ?? '').toLowerCase().trim();
        const userB = (b.login?.username ?? '').toLowerCase().trim();
        const passA = a.login?.password ?? '';
        const passB = b.login?.password ?? '';

        const sameUser = userA !== '' && userA === userB;
        const samePass = passA !== '' && passA === passB;

        if (sameUser || samePass) {
          const adjA = adj.get(a.id) ?? [];
          adjA.push(b.id);
          adj.set(a.id, adjA);

          const adjB = adj.get(b.id) ?? [];
          adjB.push(a.id);
          adj.set(b.id, adjB);
        }
      }
    }

    // Find connected components
    const visited = new Set<string>();
    for (const rep of representatives) {
      if (visited.has(rep.id)) continue;
      if (!adj.has(rep.id)) continue; // No conflicts for this item

      const component: VaultItem[] = [];
      const queue = [rep.id];
      visited.add(rep.id);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        // Add all original items belonging to this representative
        component.push(...(representativeToOriginals.get(currentId) || []));

        for (const neighborId of adj.get(currentId) || []) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }

      if (component.length > 1) {
        conflictGroups.push({
          id: uuidv4(),
          baseDomain: domain,
          items: component,
          resolvedItem: null,
          resolution: 'pending',
        });
        for (const i of component) processedItemIds.add(i.id);
      }
    }
  }

  // --- Step 3: Password Reuse Detection ---
  // All login items that have a non-empty password
  const passwordMap = new Map<string, VaultItem[]>();
  for (const item of loginItems) {
    const pw = item.login?.password;
    if (!pw) continue;
    const uri = primaryUri(item);
    const domain = uri ? extractBaseDomain(uri) : null;
    const bucket = passwordMap.get(pw) ?? [];
    bucket.push({ ...item, _domain: domain } as VaultItem & { _domain: string | null });
    passwordMap.set(pw, bucket);
  }

  const passwordReuseGroups: PasswordReuseGroup[] = [];
  for (const [password, items] of passwordMap.entries()) {
    // Get unique domains
    const domains = new Set(
      items
        .map((i) => {
          const uri = primaryUri(i);
          return uri ? extractBaseDomain(uri) : null;
        })
        .filter(Boolean),
    );
    if (domains.size > 1) {
      // Password used across multiple different domains
      passwordReuseGroups.push({
        id: uuidv4(),
        password,
        items,
      });
    }
  }

  // --- Step 4: Collect clean items ---
  const cleanItems = [
    ...loginItems.filter((i) => !processedItemIds.has(i.id) && (() => {
      const uri = primaryUri(i);
      const domain = uri ? extractBaseDomain(uri) : null;
      return domainMap.get(domain ?? '') === undefined || (domainMap.get(domain ?? '') ?? []).length === 1;
    })()),
    ...nonLoginItems,
  ];

  return {
    totalItems: exportData.items.length,
    autoMergeGroups,
    conflictGroups,
    passwordReuseGroups,
    cleanItems,
  };
}
