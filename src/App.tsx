import { useState, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { FileDropZone } from './components/FileDropZone';
import { Dashboard } from './components/Dashboard';
import { AutoMergePanel } from './components/AutoMergePanel';
import { ConflictReview } from './components/ConflictReview';
import { PasswordReusePanel } from './components/PasswordReusePanel';
import { ExportPanel } from './components/ExportPanel';
import { SwipeReview } from './components/SwipeReview';
import { FolderOrganizer } from './components/FolderOrganizer';
import { analyzeVault } from './lib/analyzeVault';
import { computeResolvedItems } from './lib/exportVault';
import type {
  BitwardenExport,
  VaultAnalysis,
  AppStep,
  ConflictGroup,
  AutoMergeGroup,
  BitwardenFolder,
  FolderAssignments,
  SwipeDecisions,
} from './types/bitwarden';

import { MasterPasswordModal } from './components/MasterPasswordModal';
import type { EncryptedVaultMetadata, VaultParseResult } from './lib/parseVault';

function App() {
  const [step, setStep] = useState<AppStep>('upload');
  const [rawExport, setRawExport] = useState<BitwardenExport | null>(null);
  const [analysis, setAnalysis] = useState<VaultAnalysis | null>(null);
  const [autoMergeGroups, setAutoMergeGroups] = useState<AutoMergeGroup[]>([]);
  const [resolvedConflicts, setResolvedConflicts] = useState<ConflictGroup[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [folders, setFolders] = useState<BitwardenFolder[]>([]);
  const [folderAssignments, setFolderAssignments] = useState<FolderAssignments>({});
  const [swipeDecisions, setSwipeDecisions] = useState<SwipeDecisions>({});
  const [pendingEncryptedVault, setPendingEncryptedVault] = useState<{
    metadata: EncryptedVaultMetadata;
    fileName: string;
  } | null>(null);

  const loadVault = (data: BitwardenExport) => {
    const analysisResult = analyzeVault(data);
    setRawExport(data);
    setAnalysis(analysisResult);
    setAutoMergeGroups(analysisResult.autoMergeGroups);
    setResolvedConflicts(analysisResult.conflictGroups);
    setFolders(data.folders);
    setFolderAssignments({});
    setSwipeDecisions({});
    setStep('dashboard');
  };

  const handleVaultLoaded = useCallback(
    (result: VaultParseResult, name: string) => {
      setFileName(name);
      
      if ('encrypted' in result && result.encrypted === true && 'data' in result) {
        setPendingEncryptedVault({ metadata: result as EncryptedVaultMetadata, fileName: name });
        return;
      }

      loadVault(result as BitwardenExport);
    },
    [],
  );

  const handleDecryptSuccess = useCallback((data: BitwardenExport) => {
    loadVault(data);
    setPendingEncryptedVault(null);
  }, []);

  const handleDecryptCancel = useCallback(() => {
    setPendingEncryptedVault(null);
    setStep('upload');
  }, []);

  const handleAutoMergeUpdated = useCallback((updated: AutoMergeGroup[]) => {
    setAutoMergeGroups(updated);
  }, []);

  const handleConflictsUpdated = useCallback((updated: ConflictGroup[]) => {
    setResolvedConflicts(updated);
  }, []);

  const handleReset = useCallback(() => {
    setStep('upload');
    setRawExport(null);
    setAnalysis(null);
    setAutoMergeGroups([]);
    setResolvedConflicts([]);
    setFileName('');
    setPendingEncryptedVault(null);
    setFolders([]);
    setFolderAssignments({});
    setSwipeDecisions({});
  }, []);

  // Items after merges & conflict resolutions — what the swipe and folder steps work on
  const resolvedItems = useMemo(
    () => (analysis ? computeResolvedItems({ analysis, autoMergeGroups, resolvedConflicts }) : []),
    [analysis, autoMergeGroups, resolvedConflicts],
  );
  const keptItems = useMemo(
    () => resolvedItems.filter((i) => swipeDecisions[i.id] !== 'delete'),
    [resolvedItems, swipeDecisions],
  );

  const handleNavigate = useCallback((s: AppStep) => {
    if (s === 'upload') {
      handleReset();
    } else {
      setStep(s);
    }
  }, [handleReset]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        currentStep={step}
        onNavigate={handleNavigate}
        hasVault={rawExport !== null}
      />

      <main>
        {pendingEncryptedVault && (
          <MasterPasswordModal
            metadata={pendingEncryptedVault.metadata}
            onSuccess={handleDecryptSuccess}
            onCancel={handleDecryptCancel}
          />
        )}

        {step === 'upload' && !pendingEncryptedVault && (
          <FileDropZone onVaultLoaded={handleVaultLoaded} />
        )}

        {step === 'dashboard' && analysis && (
          <Dashboard
            analysis={analysis}
            fileName={fileName}
            onNavigate={handleNavigate}
          />
        )}

        {step === 'auto-merge' && analysis && (
          <AutoMergePanel
            groups={autoMergeGroups}
            onUpdate={handleAutoMergeUpdated}
            onNavigate={handleNavigate}
          />
        )}

        {step === 'conflicts' && analysis && (
          <ConflictReview
            groups={resolvedConflicts}
            onUpdate={handleConflictsUpdated}
            onNavigate={handleNavigate}
          />
        )}

        {step === 'password-reuse' && analysis && (
          <PasswordReusePanel
            groups={analysis.passwordReuseGroups}
            onNavigate={handleNavigate}
          />
        )}

        {step === 'swipe' && analysis && (
          <SwipeReview
            items={resolvedItems}
            folders={folders}
            decisions={swipeDecisions}
            onDecisionsChange={setSwipeDecisions}
            onNavigate={handleNavigate}
          />
        )}

        {step === 'folders' && analysis && (
          <FolderOrganizer
            items={keptItems}
            folders={folders}
            assignments={folderAssignments}
            onFoldersChange={setFolders}
            onAssignmentsChange={setFolderAssignments}
            onNavigate={handleNavigate}
          />
        )}

        {step === 'export' && rawExport && analysis && (
          <ExportPanel
            rawExport={rawExport}
            analysis={analysis}
            autoMergeGroups={autoMergeGroups}
            resolvedConflicts={resolvedConflicts}
            folders={folders}
            folderAssignments={folderAssignments}
            swipeDecisions={swipeDecisions}
            fileName={fileName}
            onNavigate={handleNavigate}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}

export default App;
