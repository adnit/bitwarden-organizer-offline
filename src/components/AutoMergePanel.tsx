import { useState } from 'react';
import { GitMerge, Link, User, Key, CheckCircle2, ChevronDown, ChevronUp, Edit2, ListX } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import type { AutoMergeGroup, AppStep, VaultItem } from '../types/bitwarden';
import { PasswordDisplay } from './PasswordDisplay';
import { UrlDisplay } from './UrlDisplay';
import { cn } from '../lib/utils';
import { EditMergedItemModal } from './EditMergedItemModal';

interface AutoMergePanelProps {
  groups: AutoMergeGroup[];
  onUpdate: (updatedGroups: AutoMergeGroup[]) => void;
  onNavigate: (step: AppStep) => void;
}

function GroupCard({ 
  group, 
  index, 
  onUpdate,
  onEdit
}: { 
  group: AutoMergeGroup; 
  index: number;
  onUpdate: (updated: AutoMergeGroup) => void;
  onEdit: (group: AutoMergeGroup) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = group.resolution;
  const allUris = (group.resolution === 'manual' ? group.customItem : group.mergedItem)?.login?.uris ?? [];

  const updateStatus = (res: AutoMergeGroup['resolution']) => {
    onUpdate({ ...group, resolution: res });
  };

  return (
    <Card 
      className={cn(
        'animate-fade-in transition-all',
        status === 'approved' ? 'border-green-500/20' : status === 'skipped' ? 'border-muted opacity-80' : 'border-primary/40'
      )} 
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={status === 'approved' ? 'success' : status === 'skipped' ? 'secondary' : 'default'}>
              {status === 'skipped' ? (
                <>Skip Merge</>
              ) : (
                <>
                  <GitMerge className="w-3 h-3 mr-1" />
                  {group.items.length} → 1
                </>
              )}
            </Badge>
            <span className="font-semibold text-foreground truncate">{group.baseDomain}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Collapse' : 'Details'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 text-sm">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span className="font-mono text-foreground/80 text-xs">
              {group.username || <em className="not-italic text-muted-foreground">(no username)</em>}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Key className="w-3.5 h-3.5" />
            <PasswordDisplay value={group.password} iconSize={12} />
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Link className="w-3.5 h-3.5" />
            <span className="text-xs">{allUris.length} URI{allUris.length !== 1 ? 's' : ''} merged</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="sm"
            variant={status === 'approved' ? 'default' : 'outline'}
            onClick={() => updateStatus('approved')}
            className={cn(status === 'approved' && "bg-green-600 hover:bg-green-700")}
          >
            {status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
            Approve Merge
          </Button>
          
          <Button
            size="sm"
            variant={status === 'manual' ? 'default' : 'outline'}
            onClick={() => onEdit(group)}
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />
            Edit Merged Item
          </Button>

          <div className="ml-auto">
            <Button
              size="sm"
              variant={status === 'skipped' ? 'secondary' : 'ghost'}
              onClick={() => updateStatus('skipped')}
            >
              <ListX className="w-3.5 h-3.5 mr-1.5" />
              Skip Merge
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="animate-slide-in">
            <Separator className="my-4" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">
              Source Items
            </p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-secondary/30 border border-border/50 px-3 py-2"
                >
                  <p className="font-medium text-foreground text-xs truncate" title={item.name}>{item.name}</p>
                  <UrlDisplay url={item.login?.uris?.[0]?.uri} className="opacity-80" />
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">
              Merged URI Set
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allUris.map((uri, i) => (
                <UrlDisplay key={i} url={uri.uri} className="bg-primary/5 px-2 py-1 rounded border border-primary/10 max-w-full" />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AutoMergePanel({ groups, onUpdate, onNavigate }: AutoMergePanelProps) {
  const [localGroups, setLocalGroups] = useState(groups);
  const [editingGroup, setEditingGroup] = useState<AutoMergeGroup | null>(null);

  const handleGroupUpdate = (updated: AutoMergeGroup) => {
    const next = localGroups.map(g => g.id === updated.id ? updated : g);
    setLocalGroups(next);
    onUpdate(next);
  };

  const handleManualEdit = (item: VaultItem) => {
    if (!editingGroup) return;
    handleGroupUpdate({
      ...editingGroup,
      resolution: 'manual',
      customItem: item,
    });
    setEditingGroup(null);
  };

  const skipCount = localGroups.filter(g => g.resolution === 'skipped').length;
  const mergeCount = localGroups.length - skipCount;

  return (
    <>
      {editingGroup && (
        <EditMergedItemModal
          group={editingGroup}
          onResolve={handleManualEdit}
          onCancel={() => setEditingGroup(null)}
        />
      )}

      <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => onNavigate('dashboard')}>
            ← Back to Dashboard
          </Button>
          <h2 className="text-2xl font-bold text-foreground mb-1">Duplicate Merge Review</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Review items with identical domains and credentials. You can approve the merge, edit the result, or skip to keep them separate.
          </p>
          <div className="flex items-center gap-3">
            <Badge variant="success">{mergeCount} Merges Approved</Badge>
            {skipCount > 0 && <Badge variant="secondary">{skipCount} Skips</Badge>}
          </div>
        </div>

        {localGroups.length === 0 ? (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-green-300 font-medium">No auto-mergeable duplicates found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {localGroups.map((group, i) => (
              <GroupCard key={group.id} group={group} index={i} onUpdate={handleGroupUpdate} onEdit={setEditingGroup} />
            ))}
          </div>
        )}

        <div className="flex justify-end mt-8 gap-3">
          <Button variant="outline" onClick={() => onNavigate('dashboard')}>
            ← Dashboard
          </Button>
          <Button onClick={() => onNavigate('conflicts')}>
            Next: Resolve Conflicts →
          </Button>
        </div>
      </div>
    </>
  );
}

