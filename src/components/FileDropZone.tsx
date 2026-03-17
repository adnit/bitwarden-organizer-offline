import React, { useCallback, useState } from 'react';
import { Upload, Shield, Lock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { parseVaultJson, type VaultParseResult } from '../lib/parseVault';

interface FileDropZoneProps {
  onVaultLoaded: (data: VaultParseResult, fileName: string) => void;
}

export function FileDropZone({ onVaultLoaded }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (!file.name.endsWith('.json')) {
        setError('Please upload a Bitwarden JSON export file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const data = parseVaultJson(text);
          onVaultLoaded(data, file.name);
        } catch (err) {
          setError((err as Error).message);
        }
      };
      reader.onerror = () => setError('Failed to read file.');
      reader.readAsText(file);
    },
    [onVaultLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6 glow-blue">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold gradient-text mb-3">Bitwarden Optimizer</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Clean your vault — remove duplicates, resolve conflicts, and audit password reuse.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Lock className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-medium">
            100% offline · Zero data leaves your browser
          </span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          'relative w-full max-w-lg cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center animate-fade-in',
          isDragging
            ? 'border-primary bg-primary/10 glow-blue scale-[1.01]'
            : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('vault-file-input')?.click()}
      >
        <input
          id="vault-file-input"
          type="file"
          accept=".json"
          className="sr-only"
          onChange={handleFileInput}
        />
        <Upload
          className={cn(
            'mx-auto mb-4 w-12 h-12 transition-all duration-300',
            isDragging ? 'text-primary scale-110' : 'text-muted-foreground',
          )}
        />
        <p className="text-foreground font-semibold text-lg mb-1">
          {isDragging ? 'Drop your vault here' : 'Drop your Bitwarden export'}
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          or click to browse — only .json files are accepted
        </p>
        <Button variant="outline" className="pointer-events-none">
          Choose File
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 w-full max-w-lg rounded-xl border border-destructive/30 bg-destructive/10 text-red-300 p-4 flex gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm mb-1 text-red-200">Import Error</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="mt-10 text-center text-xs text-muted-foreground max-w-sm animate-fade-in">
        <p>
          This tool runs entirely in your browser. Your vault data is never uploaded,
          transmitted, or stored anywhere outside of this tab.
        </p>
      </div>
    </div>
  );
}
