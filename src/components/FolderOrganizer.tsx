import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FolderX,
  Inbox,
  Layers,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  Check,
  X,
  GripVertical,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { AppStep, BitwardenFolder, FolderAssignments, VaultItem } from '../types/bitwarden';
import { PasskeyBadge } from './PasskeyBadge';
import { extractBaseDomain } from '../lib/domainUtils';
import { suggestCategory } from '../lib/folderSuggestions';
import { cn } from '../lib/utils';

interface FolderOrganizerProps {
  items: VaultItem[];
  folders: BitwardenFolder[];
  assignments: FolderAssignments;
  onFoldersChange: (folders: BitwardenFolder[]) => void;
  onAssignmentsChange: (assignments: FolderAssignments) => void;
  onNavigate: (step: AppStep) => void;
}

/** Sidebar selection: every item, items without a folder, or one folder's ID. */
type FolderFilter = 'all' | 'none' | string;

const DRAG_MIME = 'application/x-bw-item-ids';

function itemSubtitle(item: VaultItem): string {
  const uri = item.login?.uris?.[0]?.uri;
  const domain = uri ? extractBaseDomain(uri) ?? uri : null;
  return [domain, item.login?.username].filter(Boolean).join(' · ') || ['', 'Login', 'Secure Note', 'Card', 'Identity'][item.type];
}

export function FolderOrganizer({
  items,
  folders,
  assignments,
  onFoldersChange,
  onAssignmentsChange,
  onNavigate,
}: FolderOrganizerProps) {
  const [filter, setFilter] = useState<FolderFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<FolderFilter | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [rejectedCategories, setRejectedCategories] = useState<Set<string>>(new Set());

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.name.localeCompare(b.name)),
    [folders],
  );
  const folderIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);

  const folderOf = (item: VaultItem): string | null => {
    const id = item.id in assignments ? assignments[item.id] : item.folderId;
    return id && folderIds.has(id) ? id : null;
  };

  const counts = useMemo(() => {
    const c = new Map<string | null, number>();
    for (const item of items) {
      const f = folderOf(item);
      c.set(f, (c.get(f) ?? 0) + 1);
    }
    return c;
    // folderOf only depends on assignments and folderIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, assignments, folderIds]);

  const query = search.trim().toLowerCase();
  const visibleItems = items
    .filter((item) => {
      if (filter === 'all') return true;
      const f = folderOf(item);
      return filter === 'none' ? f === null : f === filter;
    })
    .filter(
      (item) =>
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.login?.username?.toLowerCase().includes(query) ||
        item.login?.uris?.some((u) => u.uri?.toLowerCase().includes(query)),
    )
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

  const visibleSelectedCount = visibleItems.filter((i) => selected.has(i.id)).length;
  const allVisibleSelected = visibleItems.length > 0 && visibleSelectedCount === visibleItems.length;

  const moveItems = (ids: string[], folderId: string | null) => {
    if (ids.length === 0) return;
    const next = { ...assignments };
    for (const id of ids) next[id] = folderId;
    onAssignmentsChange(next);
    setSelected((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of visibleItems) {
        if (allVisibleSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
  };

  /** Returns the existing folder with this name (case-insensitive), or null. */
  const findFolderByName = (name: string, list = folders) =>
    list.find((f) => f.name.toLowerCase() === name.trim().toLowerCase()) ?? null;

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    const existing = findFolderByName(name);
    if (existing) {
      setFilter(existing.id);
    } else {
      const folder = { id: uuidv4(), name };
      onFoldersChange([...folders, folder]);
      setFilter(folder.id);
    }
    setNewFolderName('');
  };

  const commitRename = () => {
    if (!renaming) return;
    const name = renaming.name.trim();
    if (name) onFoldersChange(folders.map((f) => (f.id === renaming.id ? { ...f, name } : f)));
    setRenaming(null);
  };

  const deleteFolder = (folder: BitwardenFolder) => {
    const count = counts.get(folder.id) ?? 0;
    if (count > 0 && !window.confirm(`Delete "${folder.name}"? Its ${count} item(s) will move to "No folder". The items themselves are kept.`)) {
      return;
    }
    onFoldersChange(folders.filter((f) => f.id !== folder.id));
    if (filter === folder.id) setFilter('all');
  };

  // --- Suggestions: categorize items that don't have a folder yet ---
  const suggestions = useMemo(() => {
    if (!showSuggestions) return [];
    const byCategory = new Map<string, VaultItem[]>();
    for (const item of items) {
      if (folderOf(item) !== null) continue;
      const cat = suggestCategory(item);
      if (!cat) continue;
      byCategory.set(cat, [...(byCategory.get(cat) ?? []), item]);
    }
    return Array.from(byCategory.entries()).sort((a, b) => b[1].length - a[1].length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuggestions, items, assignments, folderIds]);

  const applySuggestions = () => {
    let nextFolders = folders;
    const nextAssignments = { ...assignments };
    for (const [category, catItems] of suggestions) {
      if (rejectedCategories.has(category)) continue;
      let folder = findFolderByName(category, nextFolders);
      if (!folder) {
        folder = { id: uuidv4(), name: category };
        nextFolders = [...nextFolders, folder];
      }
      for (const item of catItems) nextAssignments[item.id] = folder.id;
    }
    if (nextFolders !== folders) onFoldersChange(nextFolders);
    onAssignmentsChange(nextAssignments);
    setShowSuggestions(false);
    setRejectedCategories(new Set());
  };

  // --- Drag & drop: drag a row (or the whole selection) onto a folder ---
  const onDragStart = (e: React.DragEvent, item: VaultItem) => {
    const ids = selected.has(item.id) ? Array.from(selected) : [item.id];
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'move';
  };
  const dropProps = (target: FolderFilter) =>
    target === 'all'
      ? {}
      : {
          onDragOver: (e: React.DragEvent) => {
            if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
            e.preventDefault();
            setDropTarget(target);
          },
          onDragLeave: () => setDropTarget((t) => (t === target ? null : t)),
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            setDropTarget(null);
            const raw = e.dataTransfer.getData(DRAG_MIME);
            if (raw) moveItems(JSON.parse(raw) as string[], target === 'none' ? null : target);
          },
        };

  const sidebarRow = (
    target: FolderFilter,
    icon: React.ReactNode,
    label: string,
    count: number,
    actions?: React.ReactNode,
  ) => (
    <div
      key={target}
      role="button"
      tabIndex={0}
      onClick={() => setFilter(target)}
      onKeyDown={(e) => e.key === 'Enter' && setFilter(target)}
      {...dropProps(target)}
      className={cn(
        'group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm cursor-pointer transition-colors',
        filter === target ? 'bg-primary/15 text-primary' : 'text-foreground/80 hover:bg-secondary',
        dropTarget === target && 'ring-2 ring-primary bg-primary/10',
      )}
    >
      {icon}
      <span className="truncate flex-1" title={label}>{label}</span>
      {actions}
      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
    </div>
  );

  const unfiledCount = counts.get(null) ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => onNavigate('dashboard')}>
          ← Back to Dashboard
        </Button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Organize Folders</h2>
            <p className="text-muted-foreground text-sm">
              Create, rename and delete folders, then drag items onto a folder or select several and move them at once.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowSuggestions(true)} disabled={unfiledCount === 0}>
            <Sparkles className="w-4 h-4" />
            Suggest folders for {unfiledCount} unfiled
          </Button>
        </div>
      </div>

      {showSuggestions && (
        <Card className="mb-6 border-primary/30 bg-primary/5 animate-fade-in">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Suggested folders
              </p>
              <Button size="icon" variant="ghost" onClick={() => setShowSuggestions(false)} aria-label="Close suggestions">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No suggestions — none of the unfiled items match a known category.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Based on well-known sites. Untick any you don't want; existing folders with the same name are reused.
                </p>
                <div className="grid sm:grid-cols-2 gap-2 mb-4">
                  {suggestions.map(([category, catItems]) => {
                    const enabled = !rejectedCategories.has(category);
                    return (
                      <label
                        key={category}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                          enabled ? 'border-primary/40 bg-background' : 'border-border opacity-60',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 accent-[hsl(var(--primary))]"
                          checked={enabled}
                          onChange={() =>
                            setRejectedCategories((prev) => {
                              const next = new Set(prev);
                              if (next.has(category)) next.delete(category);
                              else next.add(category);
                              return next;
                            })
                          }
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {category}{' '}
                            <span className="text-muted-foreground font-normal">
                              ({catItems.length}){findFolderByName(category) ? ' · existing' : ' · new'}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {catItems.slice(0, 4).map((i) => i.name).join(', ')}
                            {catItems.length > 4 ? '…' : ''}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <Button onClick={applySuggestions} disabled={suggestions.every(([c]) => rejectedCategories.has(c))}>
                  <Check className="w-4 h-4" />
                  Apply suggestions
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <Card className="h-max md:sticky md:top-20">
          <CardContent className="p-3 space-y-0.5">
            {sidebarRow('all', <Layers className="w-4 h-4 shrink-0" />, 'All items', items.length)}
            {sidebarRow('none', <Inbox className="w-4 h-4 shrink-0" />, 'No folder', unfiledCount)}
            <div className="my-2 h-px bg-border" />
            {sortedFolders.map((folder) =>
              renaming?.id === folder.id ? (
                <div key={folder.id} className="flex items-center gap-1 px-1 py-0.5">
                  <Input
                    autoFocus
                    value={renaming.name}
                    onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    onBlur={commitRename}
                    className="h-7 text-xs"
                  />
                </div>
              ) : (
                sidebarRow(
                  folder.id,
                  filter === folder.id ? <FolderOpen className="w-4 h-4 shrink-0" /> : <Folder className="w-4 h-4 shrink-0" />,
                  folder.name,
                  counts.get(folder.id) ?? 0,
                  <span className="hidden group-hover:flex group-focus-within:flex items-center gap-0.5">
                    <button
                      aria-label={`Rename ${folder.name}`}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenaming({ id: folder.id, name: folder.name });
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      aria-label={`Delete ${folder.name}`}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFolder(folder);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>,
                )
              ),
            )}
            {folders.length === 0 && (
              <p className="px-2.5 py-1.5 text-xs text-muted-foreground italic">No folders yet</p>
            )}
            <div className="my-2 h-px bg-border" />
            <form
              className="flex gap-1.5 px-1"
              onSubmit={(e) => {
                e.preventDefault();
                createFolder();
              }}
            >
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder…"
                className="h-8 text-xs"
              />
              <Button type="submit" size="icon" variant="outline" className="h-8 w-8 shrink-0" disabled={!newFolderName.trim()} aria-label="Create folder">
                <FolderPlus className="w-4 h-4" />
              </Button>
            </form>
            <p className="px-2 pt-1.5 text-[10px] text-muted-foreground">
              Tip: name a folder "Parent/Child" to nest it in Bitwarden.
            </p>
          </CardContent>
        </Card>

        {/* Item list */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, username or URL…"
                className="pl-8"
              />
            </div>
            {selected.size > 0 && (
              <div className="flex items-center gap-2 animate-fade-in">
                <Badge>{selected.size} selected</Badge>
                <select
                  aria-label="Move selected items to folder"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) moveItems(Array.from(selected), v === '__none__' ? null : v);
                  }}
                  className="h-9 rounded-md border border-input bg-input px-2 text-sm text-foreground"
                >
                  <option value="" disabled>Move to…</option>
                  <option value="__none__">No folder</option>
                  {sortedFolders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </div>
            )}
          </div>

          <Card>
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border text-xs text-muted-foreground">
              <input
                type="checkbox"
                aria-label="Select all visible items"
                className="accent-[hsl(var(--primary))]"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = visibleSelectedCount > 0 && !allVisibleSelected;
                }}
                onChange={toggleAllVisible}
                disabled={visibleItems.length === 0}
              />
              <span>{visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}</span>
            </div>
            {visibleItems.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <FolderX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {query ? 'No items match your search.' : 'This folder is empty. Drag items here from "All items".'}
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {visibleItems.map((item) => {
                  const folderId = folderOf(item);
                  const isSelected = selected.has(item.id);
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, item)}
                      className={cn(
                        'group flex items-center gap-3 px-4 py-2.5 transition-colors',
                        isSelected ? 'bg-primary/10' : 'hover:bg-secondary/40',
                      )}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab shrink-0 hidden sm:block" />
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.name}`}
                        className="accent-[hsl(var(--primary))]"
                        checked={isSelected}
                        onChange={() => toggleSelected(item.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <PasskeyBadge item={item} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{itemSubtitle(item)}</p>
                      </div>
                      <select
                        aria-label={`Folder for ${item.name}`}
                        value={folderId ?? '__none__'}
                        onChange={(e) => moveItems([item.id], e.target.value === '__none__' ? null : e.target.value)}
                        className="h-8 max-w-[150px] rounded-md border border-input bg-input px-2 text-xs text-foreground"
                      >
                        <option value="__none__">No folder</option>
                        {sortedFolders.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="flex justify-end mt-8 gap-3">
        <Button variant="outline" onClick={() => onNavigate('swipe')}>
          ← Quick Review
        </Button>
        <Button onClick={() => onNavigate('export')}>
          Export Clean Vault →
        </Button>
      </div>
    </div>
  );
}
