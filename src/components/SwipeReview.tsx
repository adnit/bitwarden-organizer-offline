import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Heart,
  Undo2,
  User,
  Key,
  Globe,
  Folder,
  Star,
  Timer,
  StickyNote,
  CreditCard,
  IdCard,
  LogIn,
  CheckCircle2,
  Trash2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { AppStep, BitwardenFolder, SwipeDecision, SwipeDecisions, VaultItem } from '../types/bitwarden';
import { PasswordDisplay } from './PasswordDisplay';
import { UrlDisplay } from './UrlDisplay';
import { PasskeyBadge } from './PasskeyBadge';
import { hasPasskey } from '../lib/passkeys';
import { cn } from '../lib/utils';

interface SwipeReviewProps {
  items: VaultItem[];
  folders: BitwardenFolder[];
  decisions: SwipeDecisions;
  onDecisionsChange: (decisions: SwipeDecisions) => void;
  onNavigate: (step: AppStep) => void;
}

type SortMode = 'oldest' | 'az' | 'original';

/** Horizontal drag distance (px) past which a release counts as a swipe. */
const SWIPE_THRESHOLD = 110;
const FLY_OUT_MS = 220;

const TYPE_META: Record<number, { label: string; icon: typeof LogIn }> = {
  1: { label: 'Login', icon: LogIn },
  2: { label: 'Secure Note', icon: StickyNote },
  3: { label: 'Card', icon: CreditCard },
  4: { label: 'Identity', icon: IdCard },
};

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const days = Math.round((ms - Date.now()) / 86_400_000);
  if (Math.abs(days) < 30) return relativeTime.format(days, 'day');
  if (Math.abs(days) < 365) return relativeTime.format(Math.round(days / 30), 'month');
  return relativeTime.format(Math.round(days / 365), 'year');
}

function sortItems(items: VaultItem[], mode: SortMode): VaultItem[] {
  if (mode === 'original') return items;
  const sorted = [...items];
  if (mode === 'az') {
    sorted.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  } else {
    // Least recently updated first — stale entries are the likeliest to delete
    const t = (i: VaultItem) => new Date(i.revisionDate ?? i.creationDate ?? 0).getTime() || 0;
    sorted.sort((a, b) => t(a) - t(b));
  }
  return sorted;
}

/** Stops a pointer press inside the card from starting a drag (e.g. the reveal button). */
const stopDrag = (e: React.PointerEvent) => e.stopPropagation();

function ItemDetails({ item, folderName }: { item: VaultItem; folderName: string | null }) {
  const meta = TYPE_META[item.type] ?? TYPE_META[1];
  const TypeIcon = meta.icon;
  const updated = timeAgo(item.revisionDate);
  const created = timeAgo(item.creationDate);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Badge variant="secondary" className="gap-1">
          <TypeIcon className="w-3 h-3" />
          {meta.label}
        </Badge>
        <PasskeyBadge item={item} />
        {item.login?.totp && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Timer className="w-3 h-3" /> TOTP
          </Badge>
        )}
        {item.favorite && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
      </div>

      <h3 className="text-2xl font-bold text-foreground break-words mb-1">{item.name || 'Untitled'}</h3>
      {item.type === 1 && <UrlDisplay url={item.login?.uris?.[0]?.uri} className="max-w-full mb-5" />}
      {item.type === 3 && item.card && (
        <p className="text-sm text-muted-foreground mb-5">
          {item.card.brand ?? 'Card'} {item.card.number ? `•••• ${item.card.number.slice(-4)}` : ''}
        </p>
      )}
      {item.type === 4 && item.identity && (
        <p className="text-sm text-muted-foreground mb-5">
          {[item.identity.firstName, item.identity.lastName].filter(Boolean).join(' ') || item.identity.email}
        </p>
      )}

      <div className="space-y-2.5 text-sm">
        {item.type === 1 && (
          <>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-mono text-xs truncate">
                {item.login?.username || <em className="not-italic text-muted-foreground">no username</em>}
              </span>
            </div>
            <div className="flex items-center gap-2" onPointerDown={stopDrag}>
              <Key className="w-4 h-4 text-muted-foreground shrink-0" />
              {item.login?.password ? (
                <PasswordDisplay value={item.login.password} />
              ) : (
                <em className="not-italic text-xs text-muted-foreground">no password</em>
              )}
            </div>
            {(item.login?.uris?.length ?? 0) > 1 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="w-4 h-4 shrink-0" />
                +{item.login!.uris!.length - 1} more URI{item.login!.uris!.length > 2 ? 's' : ''}
              </div>
            )}
          </>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Folder className="w-4 h-4 shrink-0" />
          {folderName ?? 'No folder'}
        </div>
      </div>

      {item.notes && (
        <p className="mt-4 text-xs text-muted-foreground line-clamp-3 whitespace-pre-line border-l-2 border-border pl-3">
          {item.notes}
        </p>
      )}

      {hasPasskey(item) && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-purple-500/30 bg-purple-500/5 p-2.5 text-[11px] text-purple-200">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Deleting this removes its passkey permanently.
        </div>
      )}

      <div className="mt-auto pt-4 flex justify-between text-[11px] text-muted-foreground">
        <span>{updated ? `Updated ${updated}` : 'Never updated'}</span>
        {created && <span>Created {created}</span>}
      </div>
    </div>
  );
}

export function SwipeReview({ items, folders, decisions, onDecisionsChange, onNavigate }: SwipeReviewProps) {
  const [sortMode, setSortMode] = useState<SortMode>('oldest');
  const [history, setHistory] = useState<string[]>([]);
  const [drag, setDrag] = useState<{ startX: number; startY: number; dx: number; dy: number } | null>(null);
  const [flyOut, setFlyOut] = useState<SwipeDecision | null>(null);
  const flyOutTimer = useRef<number | null>(null);

  const folderNames = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);
  const ordered = useMemo(() => sortItems(items, sortMode), [items, sortMode]);
  const deck = useMemo(() => ordered.filter((i) => !decisions[i.id]), [ordered, decisions]);
  const deleted = useMemo(() => items.filter((i) => decisions[i.id] === 'delete'), [items, decisions]);
  const keptCount = items.filter((i) => decisions[i.id] === 'keep').length;
  const reviewedCount = items.length - deck.length;
  const current = deck[0];

  useEffect(() => () => {
    if (flyOutTimer.current) window.clearTimeout(flyOutTimer.current);
  }, []);

  const decide = useCallback(
    (decision: SwipeDecision) => {
      if (!current || flyOut) return;
      setFlyOut(decision);
      const id = current.id;
      flyOutTimer.current = window.setTimeout(() => {
        onDecisionsChange({ ...decisions, [id]: decision });
        setHistory((h) => [...h, id]);
        setFlyOut(null);
        setDrag(null);
      }, FLY_OUT_MS);
    },
    [current, flyOut, decisions, onDecisionsChange],
  );

  const undo = useCallback(() => {
    if (flyOut) return;
    const last = history[history.length - 1];
    if (!last) return;
    const next = { ...decisions };
    delete next[last];
    onDecisionsChange(next);
    setHistory((h) => h.slice(0, -1));
  }, [history, decisions, flyOut, onDecisionsChange]);

  const restore = (id: string) => {
    const next = { ...decisions };
    delete next[id];
    onDecisionsChange(next);
    setHistory((h) => h.filter((x) => x !== id));
  };

  const resetAll = () => {
    onDecisionsChange({});
    setHistory([]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') decide('delete');
      else if (e.key === 'ArrowRight') decide('keep');
      else if (e.key === 'Backspace' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, undo]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (flyOut) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || flyOut) return;
    setDrag({ ...drag, dx: e.clientX - drag.startX, dy: e.clientY - drag.startY });
  };
  const onPointerUp = () => {
    if (!drag || flyOut) return;
    if (drag.dx > SWIPE_THRESHOLD) decide('keep');
    else if (drag.dx < -SWIPE_THRESHOLD) decide('delete');
    else setDrag(null);
  };

  const dx = flyOut === 'keep' ? 700 : flyOut === 'delete' ? -700 : (drag?.dx ?? 0);
  const dy = (drag?.dy ?? 0) * 0.3;
  const keepOpacity = Math.min(Math.max(dx / SWIPE_THRESHOLD, 0), 1);
  const deleteOpacity = Math.min(Math.max(-dx / SWIPE_THRESHOLD, 0), 1);
  const isDragging = drag !== null && !flyOut;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in overflow-x-hidden">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => onNavigate('dashboard')}>
          ← Back to Dashboard
        </Button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Quick Review</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Swipe right (→) to keep, left (←) to delete. Backspace undoes. Nothing is removed until you export.
            </p>
            <div className="flex items-center gap-3">
              <Badge variant="success">{keptCount} kept</Badge>
              <Badge variant="destructive">{deleted.length} to delete</Badge>
              <Badge variant="secondary">{deck.length} left</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="swipe-sort">Order</label>
            <select
              id="swipe-sort"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-8 rounded-md border border-input bg-input px-2 text-xs text-foreground"
            >
              <option value="oldest">Least recently updated</option>
              <option value="az">Name A–Z</option>
              <option value="original">Vault order</option>
            </select>
            {reviewedCount > 0 && (
              <Button size="sm" variant="ghost" onClick={resetAll}>
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${items.length ? (reviewedCount / items.length) * 100 : 100}%` }}
          />
        </div>
      </div>

      {current ? (
        <>
          <div className="relative mx-auto w-full max-w-sm h-[440px] select-none">
            {/* Cards waiting behind the top one */}
            {deck.slice(1, 3).reverse().map((item, i, arr) => {
              const depth = arr.length - i;
              return (
                <Card
                  key={item.id}
                  className="absolute inset-0 border-border/60"
                  style={{ transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`, opacity: 1 - depth * 0.25 }}
                />
              );
            })}

            <Card
              key={current.id}
              className={cn(
                'absolute inset-0 touch-none cursor-grab shadow-2xl',
                isDragging ? 'cursor-grabbing' : 'transition-transform duration-200 ease-out',
                keepOpacity > 0.5 && 'border-green-500/60',
                deleteOpacity > 0.5 && 'border-red-500/60',
              )}
              style={{ transform: `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`, opacity: flyOut ? 0 : 1 }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDrag(null)}
            >
              <div
                className="absolute top-6 left-6 z-10 -rotate-12 rounded-lg border-4 border-green-500 px-3 py-1 text-2xl font-black tracking-widest text-green-500 pointer-events-none"
                style={{ opacity: keepOpacity }}
              >
                KEEP
              </div>
              <div
                className="absolute top-6 right-6 z-10 rotate-12 rounded-lg border-4 border-red-500 px-3 py-1 text-2xl font-black tracking-widest text-red-500 pointer-events-none"
                style={{ opacity: deleteOpacity }}
              >
                DELETE
              </div>
              <CardContent className="p-6 h-full">
                <ItemDetails item={current} folderName={current.folderId ? folderNames.get(current.folderId) ?? null : null} />
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-center gap-5 mt-10">
            <button
              aria-label="Delete"
              onClick={() => decide('delete')}
              className="w-16 h-16 rounded-full border-2 border-red-500/50 bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 hover:scale-110 transition-all"
            >
              <X className="w-7 h-7" />
            </button>
            <button
              aria-label="Undo"
              onClick={undo}
              disabled={history.length === 0}
              className="w-11 h-11 rounded-full border border-border bg-secondary text-muted-foreground flex items-center justify-center hover:text-foreground disabled:opacity-30 transition-all"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              aria-label="Keep"
              onClick={() => decide('keep')}
              className="w-16 h-16 rounded-full border-2 border-green-500/50 bg-green-500/10 text-green-400 flex items-center justify-center hover:bg-green-500/20 hover:scale-110 transition-all"
            >
              <Heart className="w-7 h-7" />
            </button>
          </div>
        </>
      ) : (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-green-300 font-medium mb-1">
              {items.length === 0 ? 'No items to review.' : 'All items reviewed!'}
            </p>
            <p className="text-sm text-muted-foreground">
              {keptCount} kept · {deleted.length} marked for deletion
            </p>
            {history.length > 0 && (
              <Button size="sm" variant="ghost" className="mt-3" onClick={undo}>
                <Undo2 className="w-3.5 h-3.5" />
                Undo last
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {deleted.length > 0 && (
        <Card className="mt-10 border-destructive/20">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              Marked for deletion ({deleted.length})
            </p>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {deleted.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <PasskeyBadge item={item} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.login?.username || item.login?.uris?.[0]?.uri || TYPE_META[item.type]?.label}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => restore(item.id)}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end mt-8 gap-3">
        <Button variant="outline" onClick={() => onNavigate('dashboard')}>
          ← Dashboard
        </Button>
        <Button onClick={() => onNavigate('folders')}>
          Next: Organize Folders →
        </Button>
      </div>
    </div>
  );
}
