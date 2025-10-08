import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Shield, CheckCircle, QrCode, Key, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MFAManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MFAStatus {
  enabled: boolean;
  setupDate: string | null;
  lastVerified: string | null;
}

type EnrollmentStep = 'intro' | 'qr-code' | 'verify' | 'success';
type ManagementStep = 'status' | 'disable-confirm' | 'disabled-success';

export const MFAManagementModal = ({ open, onOpenChange }: MFAManagementModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [qrCodeURL, setQrCodeURL] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [enrollmentStep, setEnrollmentStep] = useState<EnrollmentStep>('intro');
  const [managementStep, setManagementStep] = useState<ManagementStep>('status');

  // Check MFA status when modal opens
  useEffect(() => {
    if (open) {
      checkMFAStatus();
    }
  }, [open]);

  const checkMFAStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-status');
      
      if (error) throw error;
      
      setMfaStatus(data);
      
      // Reset steps based on status
      if (data.enabled) {
        setManagementStep('status');
      } else {
        setEnrollmentStep('intro');
      }
    } catch (error) {
      console.error('Error checking MFA status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check MFA status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-enroll-start');
      
      if (error) throw error;
      
      setQrCodeURL(data.qrCodeURL);
      setEnrollmentStep('qr-code');
    } catch (error) {
      console.error('Error starting MFA enrollment:', error);
      toast({
        title: 'Error',
        description: 'Failed to start MFA setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter a valid 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-verify-code', {
        body: { code: verificationCode, enable: true }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setEnrollmentStep('success');
        setMfaStatus(prev => prev ? { ...prev, enabled: true } : null);
        toast({
          title: 'Success',
          description: 'Two-Factor Authentication enabled successfully!',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Invalid verification code',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error verifying MFA code:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const disableMFA = async () => {
    if (!password) {
      toast({
        title: 'Error',
        description: 'Password is required to disable MFA',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-disable', {
        body: { password }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setManagementStep('disabled-success');
        setMfaStatus(prev => prev ? { ...prev, enabled: false } : null);
        toast({
          title: 'Success',
          description: 'Two-Factor Authentication disabled successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to disable MFA',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error disabling MFA:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable MFA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setVerificationCode('');
    setPassword('');
    setQrCodeURL('');
    setEnrollmentStep('intro');
    setManagementStep('status');
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  if (loading && !mfaStatus) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Enrollment Flow
  if (!mfaStatus?.enabled) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Two-Factor Authentication Setup
            </DialogTitle>
          </DialogHeader>

          {enrollmentStep === 'intro' && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Two-Factor Authentication (2FA) adds an extra layer of security to your account by requiring a code from your phone in addition to your password.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Benefits of 2FA:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Protects against unauthorized access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Secures sensitive barangay data
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Works with popular authenticator apps
                  </li>
                </ul>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={startEnrollment} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Started'}
                </Button>
              </div>
            </div>
          )}

          {enrollmentStep === 'qr-code' && (
            <div className="space-y-4">
              <div className="text-center">
                <QrCode className="h-8 w-8 mx-auto text-primary mb-2" />
                <h4 className="font-semibold">Scan QR Code</h4>
                <p className="text-sm text-muted-foreground">
                  Use your authenticator app to scan this QR code
                </p>
              </div>

              {qrCodeURL && (
                <div className="bg-background border-2 border-border rounded-lg p-4 text-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeURL)}`}
                    alt="MFA QR Code"
                    className="mx-auto"
                  />
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Download an authenticator app like Google Authenticator or Authy if you haven't already.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={() => setEnrollmentStep('intro')} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setEnrollmentStep('verify')} className="flex-1">
                  Next
                </Button>
              </div>
            </div>
          )}

          {enrollmentStep === 'verify' && (
            <div className="space-y-4">
              <div className="text-center">
                <Key className="h-8 w-8 mx-auto text-primary mb-2" />
                <h4 className="font-semibold">Enter Verification Code</h4>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg font-mono"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setEnrollmentStep('qr-code')} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={verifyAndEnable} disabled={loading || verificationCode.length !== 6} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable 2FA'}
                </Button>
              </div>
            </div>
          )}

          {enrollmentStep === 'success' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <div>
                <h4 className="font-semibold text-lg">Two-Factor Authentication Enabled!</h4>
                <p className="text-sm text-muted-foreground">
                  Your account is now protected with an additional layer of security.
                </p>
              </div>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Management Flow (MFA already enabled)
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Two-Factor Authentication
          </DialogTitle>
        </DialogHeader>

        {managementStep === 'status' && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Two-Factor Authentication is currently <strong>active</strong> on your account.
              </AlertDescription>
            </Alert>

            {mfaStatus.setupDate && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Setup Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enabled on:</span>
                    <span>{new Date(mfaStatus.setupDate).toLocaleDateString()}</span>
                  </div>
                  {mfaStatus.lastVerified && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last used:</span>
                      <span>{new Date(mfaStatus.lastVerified).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Close
              </Button>
              <Button 
                onClick={() => setManagementStep('disable-confirm')} 
                variant="destructive" 
                className="flex-1"
              >
                Disable 2FA
              </Button>
            </div>
          </div>
        )}

        {managementStep === 'disable-confirm' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Warning:</strong> Disabling 2FA will reduce your account security. Please enter your password to confirm.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Current Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setManagementStep('status')} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={disableMFA} 
                disabled={loading || !password} 
                variant="destructive" 
                className="flex-1"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disable 2FA'}
              </Button>
            </div>
          </div>
        )}

        {managementStep === 'disabled-success' && (
          <div className="space-y-4 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-500" />
            <div>
              <h4 className="font-semibold text-lg">Two-Factor Authentication Disabled</h4>
              <p className="text-sm text-muted-foreground">
                Your account is no longer protected by 2FA. You can re-enable it anytime.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};