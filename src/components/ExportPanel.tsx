import { useState } from 'react';
import {
  Download,
  CheckCircle2,
  GitMerge,
  FileText,
  Shield,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import type { VaultAnalysis, BitwardenExport, ConflictGroup, AppStep, AutoMergeGroup } from '../types/bitwarden';
import { buildCleanExport, downloadExport } from '../lib/exportVault';

interface ExportPanelProps {
  rawExport: BitwardenExport;
  analysis: VaultAnalysis;
  autoMergeGroups: AutoMergeGroup[];
  resolvedConflicts: ConflictGroup[];
  fileName: string;
  onNavigate: (step: AppStep) => void;
  onReset: () => void;
}

export function ExportPanel({
  rawExport,
  analysis,
  autoMergeGroups,
  resolvedConflicts,
  fileName,
  onNavigate,
  onReset,
}: ExportPanelProps) {
  const [downloaded, setDownloaded] = useState(false);

  const approvedMerges = autoMergeGroups.filter(g => g.resolution !== 'skipped');
  const duplicatesRemoved = approvedMerges.reduce((s, g) => s + g.items.length - 1, 0);
  const pendingConflicts = resolvedConflicts.filter((g) => g.resolution === 'pending').length;

  const cleanExport = buildCleanExport({
    rawExport,
    analysis,
    autoMergeGroups, // New: Pass the actual groups with resolutions
    resolvedConflicts,
    applyAutoMerges: true,
  });

  const outputFileName = fileName.replace(/\.json$/i, '_clean.json');
  const finalItemCount = cleanExport.items.length;

  const handleDownload = () => {
    downloadExport(cleanExport, outputFileName);
    setDownloaded(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          onClick={() => onNavigate('dashboard')}
        >
          ← Back to Dashboard
        </Button>
        <h2 className="text-2xl font-bold text-foreground mb-1">Export Clean Vault</h2>
        <p className="text-muted-foreground text-sm">
          Review your export summary and download the clean vault file.
        </p>
      </div>

      {/* Summary Card */}
      <Card className="border-border mb-6">
        <CardContent className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Export Summary
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                Original items
              </div>
              <span className="font-semibold text-foreground">{analysis.totalItems}</span>
            </div>

            {approvedMerges.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-green-400">
                  <GitMerge className="w-4 h-4" />
                  Duplicates removed
                </div>
                <Badge variant="success">−{duplicatesRemoved}</Badge>
              </div>
            )}

            {pendingConflicts > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Unresolved conflicts (kept all)
                </div>
                <Badge variant="warning">{pendingConflicts}</Badge>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Shield className="w-4 h-4 text-primary" />
                Final item count
              </div>
              <span className="font-bold text-primary text-base">{finalItemCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Reminder */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">🔒 Privacy Reminder</p>
        <p>
          The exported file is unencrypted. Store it securely and delete it after re-importing into
          Bitwarden. Never share this file.
        </p>
      </div>

      {/* Download Button */}
      <div className="flex flex-col gap-4">
        <Button
          size="lg"
          onClick={handleDownload}
          className={
            downloaded
              ? 'bg-green-600 hover:bg-green-700 text-white glow-green'
              : 'glow-blue'
          }
        >
          {downloaded ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Downloaded! ({outputFileName})
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download Clean Vault
            </>
          )}
        </Button>

        {downloaded && (
          <Button variant="ghost" onClick={onReset} className="animate-fade-in">
            <ArrowLeft className="w-4 h-4" />
            Start Over with Another File
          </Button>
        )}
      </div>
    </div>
  );
}
