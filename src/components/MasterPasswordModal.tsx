import { useState } from 'react';
import { Lock, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { decryptVault } from '../lib/bitwardenCrypto';
import type { EncryptedVaultMetadata } from '../lib/parseVault';
import type { BitwardenExport } from '../types/bitwarden';
import { parseVaultJson } from '../lib/parseVault';

interface MasterPasswordModalProps {
  metadata: EncryptedVaultMetadata;
  onSuccess: (data: BitwardenExport) => void;
  onCancel: () => void;
}

export function MasterPasswordModal({ metadata, onSuccess, onCancel }: MasterPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError(null);
    setIsLoading(true);

    // Give the UI a chance to show the loader before heavy crypto starts
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const plaintext = await decryptVault(
        metadata.data,
        password,
        metadata.kdfType,
        metadata.kdfIterations,
        metadata.kdfMemory,
        metadata.kdfParallelism,
        metadata.salt
      );

      const parsed = parseVaultJson(plaintext);
      
      if ('encrypted' in parsed && parsed.encrypted === false) {
        onSuccess(parsed as BitwardenExport);
      } else {
        throw new Error('Successfully decrypted but the resulting data is not a valid Bitwarden vault.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md animate-fade-in">
      <Card className="w-full max-w-md border-primary/20 glow-blue overflow-hidden">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Vault Locked</CardTitle>
          <CardDescription>
            This export is password-protected. Enter your Bitwarden Master Password to continue.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="master-password" className="text-sm font-medium text-muted-foreground">
                Master Password
              </label>
              <Input
                id="master-password"
                type="password"
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                disabled={isLoading}
                className="text-center font-mono"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-red-400 text-sm flex gap-2 animate-slide-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!password || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Unlock Vault
                  </>
                )}
              </Button>
            </div>
            
            <p className="text-[10px] text-center text-muted-foreground pt-2">
              Processing is 100% local. Your password is never sent anywhere.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
