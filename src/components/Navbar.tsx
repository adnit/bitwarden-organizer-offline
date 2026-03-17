import React from 'react';
import { Shield } from 'lucide-react';
import type { AppStep } from '../types/bitwarden';
import { cn } from '../lib/utils';

interface NavbarProps {
  currentStep: AppStep;
  onNavigate: (step: AppStep) => void;
  hasVault: boolean;
}

const steps: { id: AppStep; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'auto-merge', label: 'Duplicates' },
  { id: 'conflicts', label: 'Conflicts' },
  { id: 'password-reuse', label: 'Security' },
  { id: 'export', label: 'Export' },
];

export function Navbar({ currentStep, onNavigate, hasVault }: NavbarProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <nav className="sticky top-0 z-50 border-b border-border glass">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          onClick={() => onNavigate('upload')}
        >
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground text-sm hidden sm:block">BW Optimizer</span>
        </button>

        {/* Step Breadcrumbs */}
        {hasVault && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {steps.slice(1).map((step, i) => {
              const stepIndex = steps.findIndex((s) => s.id === step.id);
              const isActive = step.id === currentStep;
              const isComplete = stepIndex < currentIndex;
              return (
                <React.Fragment key={step.id}>
                  {i > 0 && (
                    <div className="w-4 h-px bg-border shrink-0" />
                  )}
                  <button
                    onClick={() => onNavigate(step.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 shrink-0 whitespace-nowrap',
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : isComplete
                        ? 'text-green-400 hover:bg-green-500/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                    )}
                  >
                    {step.label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Offline Badge */}
        <div className="flex items-center gap-1 text-green-400 text-xs font-medium shrink-0">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="hidden sm:block">Offline</span>
        </div>
      </div>
    </nav>
  );
}
