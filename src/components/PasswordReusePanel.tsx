import { useState } from 'react';
import { ShieldAlert, Globe, User, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import type { PasswordReuseGroup, AppStep } from '../types/bitwarden';
import { extractBaseDomain } from '../lib/domainUtils';

interface PasswordReusePanelProps {
  groups: PasswordReuseGroup[];
  onNavigate: (step: AppStep) => void;
}

import { PasswordDisplay } from './PasswordDisplay';

function ReuseCard({ group, index }: { group: PasswordReuseGroup; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="border-red-500/20 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">
              <ShieldAlert className="w-3 h-3 mr-1" />
              {group.items.length} accounts
            </Badge>
            <span className="text-sm text-muted-foreground">share this password</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? 'Collapse' : 'Accounts'}
            </Button>
          </div>
        </div>
        <div className="mt-2">
          <div className="bg-secondary/60 rounded-lg px-3 py-2">
            <PasswordDisplay value={group.password} className="w-full" />
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          <div className="space-y-2">
            {group.items.map((item) => {
              const domain =
                item.login?.uris?.[0]?.uri
                  ? extractBaseDomain(item.login.uris[0].uri) ?? item.login.uris[0].uri
                  : 'Unknown';
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2"
                >
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{domain}</p>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-xs">
                    <User className="w-3 h-3" />
                    <span className="font-mono truncate max-w-[120px]">
                      {item.login?.username ?? '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function PasswordReusePanel({ groups, onNavigate }: PasswordReusePanelProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => onNavigate('dashboard')}>
          ← Back to Dashboard
        </Button>
        <h2 className="text-2xl font-bold text-foreground mb-1">Password Security Audit</h2>
        <p className="text-muted-foreground text-sm mb-2">
          These passwords are reused across multiple sites. If one site is breached, all accounts
          using the same password are at risk.
        </p>
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          ⚠ Consider updating these passwords to unique values. This tool does not modify passwords —
          this audit is informational only.
        </div>
      </div>

      {groups.length === 0 ? (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-6 text-center">
            <ShieldAlert className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-green-300 font-medium">No password reuse detected.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group, i) => (
            <ReuseCard key={group.id} group={group} index={i} />
          ))}
        </div>
      )}

      <div className="flex justify-end mt-8 gap-3">
        <Button variant="outline" onClick={() => onNavigate('dashboard')}>
          ← Dashboard
        </Button>
        <Button onClick={() => onNavigate('export')}>
          Export Clean Vault →
        </Button>
      </div>
    </div>
  );
}
