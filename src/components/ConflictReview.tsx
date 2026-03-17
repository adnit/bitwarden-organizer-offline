import { useState } from 'react';
import { Check, Copy, User, Key, Globe, SkipForward, LayoutGrid, ListChecks, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

import type { ConflictGroup, ConflictResolution, AppStep, VaultItem } from '../types/bitwarden';
import { cn } from '../lib/utils';
import { PasswordDisplay } from './PasswordDisplay';
import { UrlDisplay } from './UrlDisplay';
import { ManualResolutionModal } from './ManualResolutionModal';

interface ConflictReviewProps {
  groups: ConflictGroup[];
  onUpdate: (updatedGroups: ConflictGroup[]) => void;
  onNavigate: (step: AppStep) => void;
}

function ItemCard({
  item,
  isSelected,
  onSelect,
  label,
}: {
  item: VaultItem;
  isSelected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <div
      className={cn(
        'min-w-[240px] flex-1 rounded-xl border-2 p-4 cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-primary bg-primary/10 glow-blue'
          : 'border-border bg-secondary/30 hover:border-border/80',
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <Badge variant={isSelected ? 'default' : 'secondary'}>{label}</Badge>
        {isSelected && <Check className="w-4 h-4 text-primary" />}
      </div>
      <p className="font-semibold text-foreground mb-3 truncate" title={item.name}>{item.name}</p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-xs text-foreground/80 truncate" title={item.login?.username || ''}>
            {item.login?.username || <em className="not-italic text-muted-foreground">none</em>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <PasswordDisplay value={item.login?.password} />
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <UrlDisplay url={item.login?.uris?.[0]?.uri} />
        </div>
      </div>
    </div>
  );
}

function ConflictCard({
  group,
  index,
  onUpdate,
  onManualResolve,
}: {
  group: ConflictGroup;
  index: number;
  onUpdate: (updated: ConflictGroup) => void;
  onManualResolve: (group: ConflictGroup) => void;
}) {
  const [resolution, setResolution] = useState<ConflictResolution>(group.resolution);

  const setRes = (r: ConflictResolution) => {
    setResolution(r);
    onUpdate({ ...group, resolution: r, resolvedItem: r === 'keep-a' ? group.items[0] : r === 'keep-b' ? group.items[1] : null });
  };

  const isPending = resolution === 'pending';

  return (
    <Card
      className={cn(
        'animate-fade-in border',
        isPending ? 'border-amber-500/30' : resolution === 'skipped' ? 'border-muted' : resolution === 'custom' ? 'border-primary/40' : 'border-green-500/30',
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Badge
            variant={isPending ? 'warning' : resolution === 'skipped' ? 'secondary' : 'success'}
          >
            {isPending ? 'Pending' : resolution === 'skipped' ? 'Skipped' : resolution === 'custom' ? 'Custom Fixed' : 'Resolved'}
          </Badge>
          <span className="font-semibold truncate">{group.baseDomain}</span>
          <span className="text-muted-foreground text-sm ml-auto shrink-0">
            {group.items.length} items
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3 mb-4">
          {group.items.map((item, i) => (
            <ItemCard
              key={item.id}
              item={item}
              label={i === 0 ? 'Option A' : i === 1 ? 'Option B' : `Option ${String.fromCharCode(65 + i)}`}
              isSelected={
                (resolution === 'keep-a' && i === 0) ||
                (resolution === 'keep-b' && i === 1)
              }
              onSelect={() => setRes(i === 0 ? 'keep-a' : 'keep-b')}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="sm"
            variant={resolution === 'keep-all' ? 'default' : 'outline'}
            onClick={() => setRes('keep-all')}
          >
            <Copy className="w-3.5 h-3.5" />
            Keep All
          </Button>
          <Button
            size="sm"
            variant={resolution === 'custom' ? 'default' : 'outline'}
            onClick={() => onManualResolve(group)}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Manually Resolve
          </Button>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant={resolution === 'skipped' ? 'secondary' : 'ghost'}
              onClick={() => setRes('skipped')}
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConflictReview({ groups, onUpdate, onNavigate }: ConflictReviewProps) {
  const [localGroups, setLocalGroups] = useState<ConflictGroup[]>(groups);
  const [resolvingGroup, setResolvingGroup] = useState<ConflictGroup | null>(null);

  const handleGroupUpdate = (updated: ConflictGroup) => {
    const next = localGroups.map((g) => (g.id === updated.id ? updated : g));
    setLocalGroups(next);
    onUpdate(next);
  };

  const handleManualResolve = (item: VaultItem) => {
    if (!resolvingGroup) return;
    handleGroupUpdate({
      ...resolvingGroup,
      resolution: 'custom',
      resolvedItem: item,
    });
    setResolvingGroup(null);
  };

  const handleBulkAction = (action: 'keep-all' | 'skipped') => {
    const next = localGroups.map((g) => {
      if (g.resolution === 'pending') {
        return { ...g, resolution: action, resolvedItem: null };
      }
      return g;
    });
    setLocalGroups(next);
    onUpdate(next);
  };

  const pendingCount = localGroups.filter((g) => g.resolution === 'pending').length;
  const resolvedCount = localGroups.length - pendingCount;

  return (
    <>
      {resolvingGroup && (
        <ManualResolutionModal
          group={resolvingGroup}
          onResolve={handleManualResolve}
          onCancel={() => setResolvingGroup(null)}
        />
      )}

      <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => onNavigate('dashboard')}>
            ← Back to Dashboard
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Conflict Review</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Review items with domain/credential overlaps. Choose a version or craft a custom one.
              </p>
              <div className="flex items-center gap-3">
                <Badge variant="success">{resolvedCount} resolved</Badge>
                <Badge variant="warning">{pendingCount} pending</Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="bg-primary/5 border-primary/20 hover:bg-primary/10"
                onClick={() => handleBulkAction('keep-all')}
                disabled={pendingCount === 0}
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-2" />
                Keep All Items
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="hover:bg-secondary"
                onClick={() => handleBulkAction('skipped')}
                disabled={pendingCount === 0}
              >
                <ListChecks className="w-3.5 h-3.5 mr-2" />
                Skip All
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {localGroups.map((group, i) => (
            <ConflictCard
              key={group.id}
              group={group}
              index={i}
              onUpdate={handleGroupUpdate}
              onManualResolve={setResolvingGroup}
            />
          ))}
        </div>

        <div className="flex justify-end mt-8 gap-3">
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            ← Dashboard
          </Button>
          <Button onClick={() => onNavigate('password-reuse')}>
            Next: Password Audit →
          </Button>
        </div>
      </div>
    </>
  );
}

