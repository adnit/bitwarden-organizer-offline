import { useState } from 'react';
import { X, Check, ArrowRight, User, Key, Globe, Type } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import type { VaultItem, ConflictGroup } from '../types/bitwarden';
import { cn } from '../lib/utils';
import { PasswordDisplay } from './PasswordDisplay';

interface ManualResolutionModalProps {
  group: ConflictGroup;
  onResolve: (resolvedItem: VaultItem) => void;
  onCancel: () => void;
}

export function ManualResolutionModal({
  group,
  onResolve,
  onCancel,
}: ManualResolutionModalProps) {
  const [editedItem, setEditedItem] = useState<VaultItem>({
    ...group.items[0],
    id: crypto.randomUUID(),
  });

  const selectFieldFrom = (item: VaultItem, field: 'name' | 'username' | 'password' | 'uris' | 'folderId') => {
    setEditedItem(prev => {
      const next = { ...prev };
      if (field === 'name') next.name = item.name;
      if (field === 'folderId') next.folderId = item.folderId;
      if (field === 'username' && next.login) {
        next.login = { ...next.login, username: item.login?.username ?? '' };
      }
      if (field === 'password' && next.login) {
        next.login = { ...next.login, password: item.login?.password ?? '' };
      }
      if (field === 'uris' && next.login) {
        next.login = { ...next.login, uris: item.login?.uris ?? [] };
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
      <Card className="relative w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border-primary/20 bg-card overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-xl font-bold text-foreground">Manually Resolve Conflict</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select fields from conflicting items or edit them directly to create a custom entry.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Comparison Table */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Type className="w-4 h-4" />
              Field Selection
            </h4>
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <div 
                className="grid gap-4" 
                style={{ gridTemplateColumns: `140px repeat(${group.items.length}, minmax(260px, 1fr))` }}
              >
                <div className="pt-2"></div>
                {group.items.map((item, idx) => (
                  <div key={item.id} className="text-center">
                    <Badge variant="secondary" className="mb-2">
                      Option {String.fromCharCode(65 + idx)}
                    </Badge>
                  </div>
                ))}

                {/* Name Field */}
                <div className="text-sm font-medium pt-2">Item Name</div>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "h-auto py-2 px-3 justify-start text-left font-normal border-2 transition-all rounded-md cursor-pointer ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center",
                      editedItem.name === item.name ? "border-primary bg-primary/5" : "hover:border-primary/40"
                    )}
                    onClick={() => selectFieldFrom(item, 'name')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectFieldFrom(item, 'name');
                      }
                    }}
                  >
                    <span className="truncate w-full">{item.name}</span>
                  </div>
                ))}

                {/* Username Field */}
                <div className="text-sm font-medium pt-2">Username</div>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "h-auto py-2 px-3 justify-start text-left font-normal border-2 transition-all rounded-md cursor-pointer ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center",
                      editedItem.login?.username === item.login?.username ? "border-primary bg-primary/5" : "hover:border-primary/40"
                    )}
                    onClick={() => selectFieldFrom(item, 'username')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectFieldFrom(item, 'username');
                      }
                    }}
                  >
                    <User className="w-3.5 h-3.5 mr-2 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-xs">{item.login?.username || '(none)'}</span>
                  </div>
                ))}

                {/* Password Field */}
                <div className="text-sm font-medium pt-2">Password</div>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "h-auto py-2 px-3 justify-start text-left font-normal border-2 transition-all rounded-md cursor-pointer ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center",
                      editedItem.login?.password === item.login?.password ? "border-primary bg-primary/5" : "hover:border-primary/40"
                    )}
                    onClick={() => selectFieldFrom(item, 'password')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectFieldFrom(item, 'password');
                      }
                    }}
                  >
                    <Key className="w-3.5 h-3.5 mr-2 shrink-0 text-muted-foreground" />
                    <PasswordDisplay value={item.login?.password} className="w-full justify-start" />
                  </div>
                ))}
                
                {/* URIs Field */}
                <div className="flex flex-col justify-start pt-2 gap-2 pr-4">
                  <span className="text-sm font-medium">URIs</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] px-2 w-max"
                    onClick={() => {
                      const allUris = new Set<string>();
                      group.items.forEach(item => {
                        item.login?.uris?.forEach(u => u.uri && allUris.add(u.uri));
                      });
                      const merged = Array.from(allUris).map(uri => ({ match: null, uri }));
                      setEditedItem(prev => ({
                        ...prev,
                        login: prev.login ? { ...prev.login, uris: merged } : prev.login
                      }));
                    }}
                  >
                    Merge All
                  </Button>
                </div>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "h-auto py-2 px-3 justify-start text-left font-normal border-2 transition-all rounded-md cursor-pointer ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-input bg-background hover:bg-accent hover:text-accent-foreground flex flex-col items-start gap-1.5",
                      JSON.stringify(editedItem.login?.uris) === JSON.stringify(item.login?.uris) ? "border-primary bg-primary/5" : "hover:border-primary/40"
                    )}
                    onClick={() => selectFieldFrom(item, 'uris')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectFieldFrom(item, 'uris');
                      }
                    }}
                  >
                    <div className="flex items-center text-xs text-muted-foreground pb-1 border-b border-border/50 w-full">
                      <Globe className="w-3.5 h-3.5 mr-2 shrink-0" />
                      {(item.login?.uris?.length ?? 0)} URI(s)
                    </div>
                    {item.login?.uris && item.login.uris.length > 0 ? (
                      <div className="flex flex-col gap-1 w-full mt-1">
                        {item.login.uris.map((u, i) => (
                          <span key={i} className="truncate text-xs font-mono w-[220px]" title={u.uri || ''}>
                            {u.uri}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs mt-1">None</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Final Result Editor */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Customized Merged Entry
            </h4>
            <div className="grid grid-cols-2 gap-6 bg-secondary/20 p-6 rounded-xl border border-border">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Item Title</label>
                <Input
                  value={editedItem.name}
                  onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                  placeholder="Item Name"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Username</label>
                <Input
                  value={editedItem.login?.username || ''}
                  onChange={(e) => setEditedItem({
                    ...editedItem,
                    login: { ...editedItem.login!, username: e.target.value }
                  })}
                  placeholder="Username"
                  className="bg-background font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Password</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={editedItem.login?.password || ''}
                    onChange={(e) => setEditedItem({
                      ...editedItem,
                      login: { ...editedItem.login!, password: e.target.value }
                    })}
                    placeholder="Password"
                    className="bg-background font-mono text-sm pr-10"
                  />
                  <Key className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground opacity-50" />
                </div>
              </div>
              <div className="space-y-2 flex flex-col justify-start">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1 flex items-center justify-between">
                  <span>URIs ({editedItem.login?.uris?.length || 0})</span>
                </label>
                <div 
                  className="flex flex-col gap-1 min-h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-xs font-mono opacity-70 cursor-not-allowed overflow-y-auto max-h-[100px]"
                  title="Combined URIs for this item"
                >
                  {editedItem.login?.uris && editedItem.login.uris.length > 0 ? (
                    editedItem.login.uris.map((u, idx) => (
                      <span key={idx} className="truncate w-full block">
                        {u.uri}
                      </span>
                    ))
                  ) : (
                    <span className="italic text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Note (Optional)</label>
                <Input
                  value={editedItem.notes || ''}
                  onChange={(e) => setEditedItem({ ...editedItem, notes: e.target.value })}
                  placeholder="Notes..."
                  className="bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-3 bg-secondary/10">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onResolve(editedItem)} className="glow-blue">
            <Check className="w-4 h-4 mr-2" />
            Save & Resolve
          </Button>
        </div>
      </Card>
    </div>
  );
}
