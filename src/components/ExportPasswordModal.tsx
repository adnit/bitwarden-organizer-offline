import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AlertCircle, Lock, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

interface ExportPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
}

export function ExportPasswordModal({ isOpen, onClose, onConfirm }: ExportPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsExporting(true);
      setError('');
      // Give UI a chance to show the spinner before expensive crypto operations
      setTimeout(() => {
        onConfirm(password);
        setIsExporting(false); // Only useful if onConfirm is sync, but onConfirm triggers outer async state usually.
      }, 50);
    } catch (err: any) {
      setError(err.message || 'Export failed.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
        <form onSubmit={handleConfirm}>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-indigo-500" />
              </div>
              <CardTitle>Password Protect Export</CardTitle>
            </div>
            <CardDescription>
              Create a new master password for this exported JSON file. You will need this password to import the file back into Bitwarden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter a strong password"
                  className="pl-9"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  disabled={isExporting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  className="pl-9"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  disabled={isExporting}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-md">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground flex gap-2">
              <Lock className="w-4 h-4 shrink-0 text-indigo-400" />
              <p>Your vault will be encrypted locally using AES-256-CBC and PBKDF2 (600,000 iterations), perfectly matching Bitwarden's standard password-protected export format.</p>
            </div>
            
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isExporting || !password || !confirmPassword}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
            >
              {isExporting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Encrypting...
                </div>
              ) : (
                'Export Vault'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
