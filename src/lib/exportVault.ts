import type {
  BitwardenExport,
  VaultItem,
  VaultAnalysis,
  ConflictGroup,
  AutoMergeGroup,
} from '../types/bitwarden';

interface ExportOptions {
  rawExport: BitwardenExport;
  analysis: VaultAnalysis;
  autoMergeGroups: AutoMergeGroup[];
  resolvedConflicts: ConflictGroup[];
  applyAutoMerges: boolean;
  encrypted?: boolean;
  password?: string;
}

/**
 * Builds a clean Bitwarden-compatible export object.
 *
 * Logic:
 *  - Auto-merge groups → handled based on individual resolution (approved/skipped/manual)
 *  - Conflicts → use resolvedItem if set, otherwise keep all (skip if 'skipped')
 *  - PasswordReuse → untouched (user is just informed)
 *  - Clean items → kept as-is
 */
export async function buildCleanExport(options: ExportOptions): Promise<any> {
  const { rawExport, analysis, autoMergeGroups, resolvedConflicts, applyAutoMerges, encrypted, password } = options;

  const finalItems: VaultItem[] = [];

  // 1. Clean items
  for (const item of analysis.cleanItems) {
    finalItems.push(item);
  }

  // 2. Auto-merge groups
  const groupsToUse = autoMergeGroups.length > 0 ? autoMergeGroups : analysis.autoMergeGroups;
  
  for (const group of groupsToUse) {
    if (applyAutoMerges && group.resolution === 'approved') {
      finalItems.push(group.mergedItem);
    } else if (applyAutoMerges && group.resolution === 'manual' && group.customItem) {
      finalItems.push(group.customItem);
    } else {
      // Skipped or manual (without custom item) or applyAutoMerges is false
      finalItems.push(...group.items);
    }
  }

  // 3. Conflicts — use resolved items
  const resolvedMap = new Map<string, ConflictGroup>(
    resolvedConflicts.map((g) => [g.id, g]),
  );

  for (const group of analysis.conflictGroups) {
    const resolved = resolvedMap.get(group.id) ?? group;
    switch (resolved.resolution) {
      case 'keep-item':
        if (resolved.resolvedItem) {
          finalItems.push(resolved.resolvedItem);
        }
        break;
      case 'keep-all':
        finalItems.push(...resolved.items);
        break;
      case 'custom':
        if (resolved.resolvedItem) {
          finalItems.push(resolved.resolvedItem);
        } else {
          finalItems.push(...resolved.items);
        }
        break;
      case 'delete-all':
        // Do not push anything -> items are deleted
        break;
      case 'skipped':
      case 'pending':
      default:
        // Keep all when skipped or pending
        finalItems.push(...resolved.items);
        break;
    }
  }

  const cleanPayload = {
    encrypted: false,
    folders: rawExport.folders,
    items: finalItems,
  };

  if (encrypted && password) {
    // Dynamic import to avoid circular dependencies or bloating non-crypto paths
    const { encryptVault } = await import('./bitwardenCrypto');
    const plaintextJson = JSON.stringify(cleanPayload);
    return await encryptVault(plaintextJson, password);
  }

  return cleanPayload;
}

/**
 * Serializes the export to JSON and triggers a browser download.
 */
export function downloadExport(exportData: BitwardenExport, fileName: string): void {
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke the object URL after a short delay to free memory
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
