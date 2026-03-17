import { useState } from 'react';
import { X, Check, ArrowRight, User, Key, Globe, Layout, Edit3 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import type { VaultItem, AutoMergeGroup } from '../types/bitwarden';

interface EditMergedItemModalProps {
  group: AutoMergeGroup;
  onResolve: (resolvedItem: VaultItem) => void;
  onCancel: () => void;
}

export function EditMergedItemModal({
  group,
  onResolve,
  onCancel,
}: EditMergedItemModalProps) {
  const [editedItem, setEditedItem] = useState<VaultItem>({
    ...(group.customItem || group.mergedItem),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
      <Card className="relative w-full max-w-2xl shadow-2xl border-primary/20 bg-card overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Edit Merged Item</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Current domain: <span className="font-mono text-xs">{group.baseDomain}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground px-1 flex items-center gap-2">
                <Layout className="w-3 h-3" />
                Display Name
              </label>
              <Input
                value={editedItem.name}
                onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                placeholder="Item Name"
                className="bg-secondary/20"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1 flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Username
                </label>
                <Input
                  value={editedItem.login?.username || ''}
                  onChange={(e) => setEditedItem({
                    ...editedItem,
                    login: { ...editedItem.login!, username: e.target.value }
                  })}
                  placeholder="Username"
                  className="bg-secondary/20 font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1 flex items-center gap-2">
                  <Key className="w-3 h-3" />
                  Password
                </label>
                <Input
                  value={editedItem.login?.password || ''}
                  onChange={(e) => setEditedItem({
                    ...editedItem,
                    login: { ...editedItem.login!, password: e.target.value }
                  })}
                  placeholder="Password"
                  className="bg-secondary/20 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground px-1 flex items-center gap-2">
                <Globe className="w-3 h-3" />
                Primary URI
              </label>
              <Input
                value={editedItem.login?.uris?.[0]?.uri || ''}
                readOnly
                disabled
                className="bg-secondary/10 opacity-60 font-mono text-xs cursor-not-allowed"
                title="URIs are merged from all duplicates"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground px-1 flex items-center gap-2">
                <ArrowRight className="w-3 h-3" />
                Notes
              </label>
              <Input
                value={editedItem.notes || ''}
                onChange={(e) => setEditedItem({ ...editedItem, notes: e.target.value })}
                placeholder="Add internal notes..."
                className="bg-secondary/20"
              />
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] text-amber-200/70 leading-relaxed">
            <span className="font-bold mr-1">NOTE:</span>
            Editing these values will apply to the final merged result. All unique URIs from the {group.items.length} original items will still be preserved in the merged output.
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3 bg-secondary/10">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onResolve(editedItem)} className="glow-blue bg-primary hover:bg-primary/90 text-primary-foreground">
            <Check className="w-4 h-4 mr-2" />
            Apply Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
