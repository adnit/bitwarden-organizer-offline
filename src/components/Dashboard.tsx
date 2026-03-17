import React from 'react';
import {
  Database,
  GitMerge,
  AlertTriangle,
  KeyRound,
  ChevronRight,
  CheckCircle2,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import type { VaultAnalysis, AppStep } from '../types/bitwarden';

interface DashboardProps {
  analysis: VaultAnalysis;
  fileName: string;
  onNavigate: (step: AppStep) => void;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  description: string;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  onClick?: () => void;
  actionLabel?: string;
  disabled?: boolean;
}

const colorMap = {
  blue: {
    icon: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    badge: 'text-blue-400',
    glow: 'hover:glow-blue',
  },
  green: {
    icon: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    badge: 'text-green-400',
    glow: 'hover:glow-green',
  },
  amber: {
    icon: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    badge: 'text-amber-400',
    glow: 'hover:glow-amber',
  },
  red: {
    icon: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    badge: 'text-red-400',
    glow: 'hover:glow-red',
  },
  purple: {
    icon: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    badge: 'text-purple-400',
    glow: '',
  },
};

function StatCard({ icon, label, value, description, color, onClick, actionLabel, disabled }: StatCardProps) {
  const c = colorMap[color];
  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 ${c.border} ${!disabled && onClick ? `cursor-pointer ${c.glow} hover:scale-[1.02]` : ''} ${disabled ? 'opacity-50' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border}`}>{icon}</div>
          {onClick && !disabled && (
            <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
          )}
        </div>
        <div className={`text-3xl font-bold mb-1 ${c.badge}`}>{value}</div>
        <div className="font-medium text-foreground text-sm mb-1">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
        {actionLabel && !disabled && (
          <div className={`mt-3 text-xs font-medium ${c.badge} flex items-center gap-1`}>
            {actionLabel} <ArrowRight className="w-3 h-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard({ analysis, fileName, onNavigate }: DashboardProps) {
  const autoMergeCount = analysis.autoMergeGroups.reduce((s, g) => s + g.items.length, 0);
  const autoMergeGroups = analysis.autoMergeGroups.length;
  const conflictCount = analysis.conflictGroups.length;
  const reuseGroups = analysis.passwordReuseGroups.length;
  const pendingConflicts = analysis.conflictGroups.filter(
    (g) => g.resolution === 'pending',
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
          <FileText className="w-4 h-4" />
          <span>{fileName}</span>
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Vault Dashboard</h2>
        <p className="text-muted-foreground">
          Analysis complete. Review the findings below and take action.
        </p>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Database className="w-5 h-5 text-blue-400" />}
          label="Total Items"
          value={analysis.totalItems}
          description="Total vault entries"
          color="blue"
        />
        <StatCard
          icon={<GitMerge className="w-5 h-5 text-green-400" />}
          label="Auto-Merges"
          value={autoMergeGroups}
          description={`${autoMergeCount} duplicate items → ${autoMergeGroups} merged`}
          color="green"
          onClick={autoMergeGroups > 0 ? () => onNavigate('auto-merge') : undefined}
          actionLabel={autoMergeGroups > 0 ? 'Review merges' : undefined}
          disabled={autoMergeGroups === 0}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
          label="Conflicts"
          value={conflictCount}
          description={`${pendingConflicts} needing manual review`}
          color="amber"
          onClick={conflictCount > 0 ? () => onNavigate('conflicts') : undefined}
          actionLabel={conflictCount > 0 ? 'Resolve conflicts' : undefined}
          disabled={conflictCount === 0}
        />
        <StatCard
          icon={<KeyRound className="w-5 h-5 text-red-400" />}
          label="Reused Passwords"
          value={reuseGroups}
          description="Password groups shared across domains"
          color="red"
          onClick={reuseGroups > 0 ? () => onNavigate('password-reuse') : undefined}
          actionLabel={reuseGroups > 0 ? 'View security audit' : undefined}
          disabled={reuseGroups === 0}
        />
      </div>

      {/* All-Clear Banner */}
      {autoMergeGroups === 0 && conflictCount === 0 && reuseGroups === 0 && (
        <Card className="border-green-500/30 bg-green-500/5 mb-8">
          <CardContent className="p-5 flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <p className="font-semibold text-green-300">Vault looks clean!</p>
              <p className="text-sm text-muted-foreground">
                No duplicates, conflicts, or password reuse detected. You can export directly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Actions */}
      <div className="flex flex-wrap gap-3">
        {autoMergeGroups > 0 && (
          <Button onClick={() => onNavigate('auto-merge')}>
            <GitMerge className="w-4 h-4" />
            Review Auto-Merges ({autoMergeGroups})
          </Button>
        )}
        {conflictCount > 0 && (
          <Button variant="outline" onClick={() => onNavigate('conflicts')}>
            <AlertTriangle className="w-4 h-4" />
            Resolve Conflicts ({conflictCount})
          </Button>
        )}
        {reuseGroups > 0 && (
          <Button variant="ghost" onClick={() => onNavigate('password-reuse')}>
            <KeyRound className="w-4 h-4" />
            Password Audit ({reuseGroups})
          </Button>
        )}
        <Button
          variant={autoMergeGroups === 0 && conflictCount === 0 ? 'default' : 'secondary'}
          onClick={() => onNavigate('export')}
          className="ml-auto"
        >
          Export Clean Vault
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
