
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Settings, User, Shield, Bell, Eye, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MFAManagementModal } from '@/components/security/MFAManagementModal';

const UserSettingsPage = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Settings state
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotMode, setChatbotMode] = useState('offline');
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  // MFA management modal state
  const [showMFAModal, setShowMFAModal] = useState(false);

  // Load chatbot settings from settings table
  useEffect(() => {
    const loadChatbotSettings = async () => {
      if (!userProfile?.id) return;

      try {
        const { data: settings, error } = await supabase
          .from('settings')
          .select('key, value')
          .eq('userid', userProfile.id)
          .in('key', ['chatbot_enabled', 'chatbot_mode']);

        if (error) {
          console.error('Error loading settings:', error);
        } else {
          // Process settings data
          const settingsMap = settings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
          }, {} as Record<string, string>);

          setChatbotEnabled(settingsMap.chatbot_enabled === 'true' || settingsMap.chatbot_enabled === undefined);
          setChatbotMode(settingsMap.chatbot_mode || 'offline');
        }
      } catch (error) {
        console.error('Error in loadChatbotSettings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };

    if (!authLoading && userProfile?.id) {
      loadChatbotSettings();
    }
  }, [userProfile?.id, authLoading]);

  const updateChatbotEnabled = async (enabled: boolean) => {
    if (!userProfile?.id) return;

    try {
      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            userid: userProfile.id,
            key: 'chatbot_enabled',
            value: enabled.toString(),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'userid,key' }
        );

      if (error) throw error;

      setChatbotEnabled(enabled);
      toast({
        title: "Success",
        description: "Chatbot setting updated successfully"
      });
    } catch (error) {
      console.error('Error updating chatbot enabled:', error);
      toast({
        title: "Error",
        description: "Failed to update chatbot setting",
        variant: "destructive"
      });
    }
  };

  const updateChatbotMode = async (mode: string) => {
    if (!userProfile?.id) return;

    try {
      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            userid: userProfile.id,
            key: 'chatbot_mode',
            value: mode,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'userid,key' }
        );

      if (error) throw error;

      setChatbotMode(mode);
      toast({
        title: "Success",
        description: "Chatbot mode updated successfully"
      });
    } catch (error) {
      console.error('Error updating chatbot mode:', error);
      toast({
        title: "Error",
        description: "Failed to update chatbot mode",
        variant: "destructive"
      });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully"
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isLoading = authLoading || settingsLoading;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Chatbot Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Alexander Cabalan (Chatbot)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="chatbot-enabled">Enable Chatbot</Label>
                <p className="text-sm text-muted-foreground">Show or hide the floating chatbot button</p>
              </div>
              {isLoading ? (
                <div className="w-11 h-6 bg-muted rounded-full animate-pulse" />
              ) : (
                <Switch 
                  id="chatbot-enabled" 
                  checked={chatbotEnabled}
                  onCheckedChange={updateChatbotEnabled}
                />
              )}
            </div>
            
            {!isLoading && chatbotEnabled && (
              <div className="space-y-3 pt-2 border-t">
                <Label>Chatbot Mode</Label>
                <RadioGroup 
                  value={chatbotMode} 
                  onValueChange={updateChatbotMode}
                  className="grid grid-cols-1 gap-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="offline" id="offline-mode" />
                    <Label htmlFor="offline-mode" className="cursor-pointer">
                      <div>
                        <div className="font-medium">🟠 Offline Mode</div>
                        <div className="text-xs text-muted-foreground">Local responses only</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online-mode" />
                    <Label htmlFor="online-mode" className="cursor-pointer">
                      <div>
                        <div className="font-medium">🟢 Online Mode</div>
                        <div className="text-xs text-muted-foreground">AI-powered responses</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input value={userProfile?.firstname || ''} disabled />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={userProfile?.lastname || ''} disabled />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={userProfile?.email || ''} disabled />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={userProfile?.role || ''} disabled />
            </div>
            <p className="text-sm text-muted-foreground">
              To update your profile information, please contact your barangay administrator.
            </p>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button 
                  onClick={() => setShowMFAModal(true)}
                  variant="outline"
                  size="sm"
                >
                  Manage
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred theme
                </p>
              </div>
              <ThemeToggle isCollapsed={false} />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Notification preferences are managed by your barangay administrator.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Announcements</span>
                  <span className="text-sm text-muted-foreground">Enabled</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Emergency Alerts</span>
                  <span className="text-sm text-muted-foreground">Enabled</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Forum Updates</span>
                  <span className="text-sm text-muted-foreground">Enabled</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* MFA Management Modal */}
      <MFAManagementModal open={showMFAModal} onOpenChange={setShowMFAModal} />
    </div>
  );
};

export default UserSettingsPage;
