
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export const useChatbotSettings = () => {
  const { user } = useAuth();
  const [chatbotSettings, setChatbotSettings] = useState({
    enabled: true, // default to true
    mode: 'offline' // default to offline
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    if (!user?.id) {
      // If no user, use localStorage defaults
      const enabled = localStorage.getItem('chatbot-enabled') !== 'false';
      const mode = localStorage.getItem('chatbot-mode') || 'offline';
      setChatbotSettings({ enabled, mode });
      setIsLoading(false);
      return;
    }

    try {
      // Fetch both settings from the database
      const { data: settings } = await supabase
        .from('settings')
        .select('key, value')
        .eq('userid', user.id)
        .in('key', ['chatbot_enabled', 'chatbot_mode']);

      let enabled = true; // default
      let mode = 'offline'; // default

      if (settings) {
        const enabledSetting = settings.find(s => s.key === 'chatbot_enabled');
        const modeSetting = settings.find(s => s.key === 'chatbot_mode');
        
        if (enabledSetting) enabled = enabledSetting.value === 'true';
        if (modeSetting) mode = modeSetting.value;
      }

      setChatbotSettings({ enabled, mode });
    } catch (error) {
      console.error('Error fetching chatbot settings:', error);
      // Fall back to localStorage on error
      const enabled = localStorage.getItem('chatbot-enabled') !== 'false';
      const mode = localStorage.getItem('chatbot-mode') || 'offline';
      setChatbotSettings({ enabled, mode });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Set up real-time subscription for settings changes
    let channel;
    if (user?.id) {
      channel = supabase
        .channel(`chatbot-settings-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'settings',
            filter: `userid=eq.${user.id}`
          },
          (payload) => {
            console.log('Settings changed:', payload);
            // Refetch settings when they change
            fetchSettings();
          }
        )
        .subscribe();
    }

    // Listen for custom events to force re-render
    const handleSettingsChange = () => {
      console.log('Custom settings change event received');
      fetchSettings();
    };

    window.addEventListener('chatbot-settings-changed', handleSettingsChange);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('chatbot-settings-changed', handleSettingsChange);
    };
  }, [user?.id]);

  const updateChatbotEnabled = async (enabled: boolean) => {
    console.log('Updating chatbot enabled to:', enabled);
    
    // Update local state immediately for responsive UI
    setChatbotSettings(prev => ({ ...prev, enabled }));
    
    if (!user?.id) {
      // If no user, use localStorage
      localStorage.setItem('chatbot-enabled', enabled.toString());
      // Dispatch custom event for localStorage users too
      window.dispatchEvent(new CustomEvent('chatbot-settings-changed'));
      return;
    }

    try {
      // Check if setting exists first
      const { data: existingSetting } = await supabase
        .from('settings')
        .select('id')
        .eq('userid', user.id)
        .eq('key', 'chatbot_enabled')
        .maybeSingle();

      let result;
      if (existingSetting) {
        // Update existing setting
        result = await supabase
          .from('settings')
          .update({
            value: enabled.toString(),
            updated_at: new Date().toISOString()
          })
          .eq('userid', user.id)
          .eq('key', 'chatbot_enabled');
      } else {
        // Insert new setting
        result = await supabase
          .from('settings')
          .insert({
            userid: user.id,
            key: 'chatbot_enabled',
            value: enabled.toString(),
            description: 'Enable or disable the chatbot'
          });
      }

      if (result.error) {
        console.error('Database error:', result.error);
        throw result.error;
      }

      console.log('Chatbot enabled setting updated successfully:', enabled);
      
      // Dispatch custom event to trigger re-render of FloatingChatButton
      window.dispatchEvent(new CustomEvent('chatbot-settings-changed'));
      
    } catch (error) {
      console.error('Error updating chatbot enabled setting:', error);
      // Revert local state on error
      setChatbotSettings(prev => ({ ...prev, enabled: !enabled }));
    }
  };

  const updateChatbotMode = async (mode: string) => {
    console.log('Updating chatbot mode to:', mode);
    
    // Update local state immediately for responsive UI
    setChatbotSettings(prev => ({ ...prev, mode }));
    
    if (!user?.id) {
      // If no user, use localStorage
      localStorage.setItem('chatbot-mode', mode);
      // Dispatch custom event for localStorage users too
      window.dispatchEvent(new CustomEvent('chatbot-settings-changed'));
      return;
    }

    try {
      // Check if setting exists first
      const { data: existingSetting } = await supabase
        .from('settings')
        .select('id')
        .eq('userid', user.id)
        .eq('key', 'chatbot_mode')
        .maybeSingle();

      let result;
      if (existingSetting) {
        // Update existing setting
        result = await supabase
          .from('settings')
          .update({
            value: mode,
            updated_at: new Date().toISOString()
          })
          .eq('userid', user.id)
          .eq('key', 'chatbot_mode');
      } else {
        // Insert new setting
        result = await supabase
          .from('settings')
          .insert({
            userid: user.id,
            key: 'chatbot_mode',
            value: mode,
            description: 'Chatbot mode: online or offline'
          });
      }

      if (result.error) {
        console.error('Database error:', result.error);
        throw result.error;
      }

      console.log('Chatbot mode setting updated successfully:', mode);
      
      // Dispatch custom event to trigger re-render of FloatingChatButton
      window.dispatchEvent(new CustomEvent('chatbot-settings-changed'));
      
    } catch (error) {
      console.error('Error updating chatbot mode setting:', error);
      // Revert local state on error
      const previousMode = chatbotSettings.mode;
      setChatbotSettings(prev => ({ ...prev, mode: previousMode }));
    }
  };

  return {
    chatbotSettings,
    updateChatbotEnabled,
    updateChatbotMode,
    isLoading
  };
};
