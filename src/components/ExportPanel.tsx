import { useState } from 'react';
import {
  CheckCircle2,
  GitMerge,
  FileText,
  Shield,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Unlock
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import type { VaultAnalysis, BitwardenExport, ConflictGroup, AppStep, AutoMergeGroup } from '../types/bitwarden';
import { buildCleanExport, downloadExport } from '../lib/exportVault';
import { ExportPasswordModal } from './ExportPasswordModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadName, setDownloadName] = useState('');

  const approvedMerges = autoMergeGroups.filter(g => g.resolution !== 'skipped');
  const duplicatesRemoved = approvedMerges.reduce((s, g) => s + g.items.length - 1, 0);
  const pendingConflicts = resolvedConflicts.filter((g) => g.resolution === 'pending').length;

  // Manually compute final item count for performance (instead of building entire payload on render)
  let finalItemCount = analysis.cleanItems.length;
  const groupsToUse = autoMergeGroups.length > 0 ? autoMergeGroups : analysis.autoMergeGroups;
  for (const group of groupsToUse) {
    if (group.resolution === 'approved') finalItemCount += 1;
    else if (group.resolution === 'manual' && group.customItem) finalItemCount += 1;
    else finalItemCount += group.items.length;
  }
  const resolvedMap = new Map<string, ConflictGroup>(resolvedConflicts.map((g) => [g.id, g]));
  for (const group of analysis.conflictGroups) {
    const resolved = resolvedMap.get(group.id) ?? group;
    if (['keep-item', 'custom'].includes(resolved.resolution!)) {
      finalItemCount += 1;
    } else if (resolved.resolution === 'delete-all') {
      // Add nothing
    } else {
      finalItemCount += resolved.items.length; // keep-all, skipped, pending
    }
  }

  const outputFileName = fileName.replace(/\.json$/i, '_clean.json');

  const handleDownload = async (encrypted: boolean, password?: string) => {
    setIsExporting(true);
    try {
      const exportData = await buildCleanExport({
        rawExport,
        analysis,
        autoMergeGroups,
        resolvedConflicts,
        applyAutoMerges: true,
        encrypted,
        password
      });

      const actualFileName = encrypted 
        ? fileName.replace(/\.json$/i, '_clean_encrypted.json') 
        : outputFileName;
        
      downloadExport(exportData, actualFileName);
      setDownloadName(actualFileName);
      setDownloaded(true);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to generate export file.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in relative">
      
      <ExportPasswordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={(pwd) => handleDownload(true, pwd)} 
      />

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
          Review your export summary and choose how to save your cleaned vault.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Secure Option */}
        <Card className="border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer transition-colors" onClick={() => setIsModalOpen(true)}>
           <CardContent className="p-5 flex flex-col h-full justify-between items-start gap-4">
             <div>
               <div className="flex items-center gap-2 mb-2">
                 <Lock className="w-5 h-5 text-indigo-400" />
                 <h3 className="font-semibold text-indigo-100">Password Protected</h3>
               </div>
               <p className="text-sm text-indigo-200/70">
                 Securely encrypts your clean vault using AES-256-CBC and PBKDF2. Recommended by Bitwarden.
               </p>
             </div>
             <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isExporting}>
               {isExporting ? 'Encrypting...' : 'Export Secure JSON'}
             </Button>
           </CardContent>
        </Card>

        {/* Unsecure Option */}
        <Card className="border-border hover:bg-muted/50 transition-colors">
           <CardContent className="p-5 flex flex-col h-full justify-between items-start gap-4">
             <div>
               <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                 <Unlock className="w-5 h-5" />
                 <h3 className="font-semibold text-foreground">Unencrypted JSON</h3>
               </div>
               <p className="text-sm text-muted-foreground">
                 Saves your clean vault as plain text. Only use this if you immediately re-import and delete it.
               </p>
             </div>
             <Button variant="outline" className="w-full" onClick={() => handleDownload(false)} disabled={isExporting}>
                {isExporting ? 'Processing...' : 'Export Plain JSON'}
             </Button>
           </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {downloaded && (
          <div className="flex flex-col items-center justify-center p-6 bg-green-500/10 border border-green-500/20 rounded-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-green-400 font-medium text-lg">
              <CheckCircle2 className="w-6 h-6" />
              Download Complete!
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Your file <strong>{downloadName}</strong> is ready. You can now import it back into your Bitwarden account.
            </p>
            <Button variant="outline" onClick={onReset} className="mt-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
