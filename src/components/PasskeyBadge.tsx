import { Fingerprint } from 'lucide-react';
import type { VaultItem } from '../types/bitwarden';
import { getPasskeys } from '../lib/passkeys';
import { cn } from '../lib/utils';

/** Small indicator shown when an item stores a passkey. Renders nothing otherwise. */
export function PasskeyBadge({ item, className }: { item: VaultItem | null | undefined; className?: string }) {
  const passkeys = getPasskeys(item);
  if (passkeys.length === 0) return null;
  const rp = passkeys[0].rpId || passkeys[0].rpName;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300',
        className,
      )}
      title={`Passkey${rp ? ` for ${rp}` : ''}${passkeys[0].userName ? ` (${passkeys[0].userName})` : ''}`}
    >
      <Fingerprint className="w-3 h-3" />
      {passkeys.length > 1 ? `${passkeys.length} passkeys` : 'Passkey'}
    </span>
  );
}
