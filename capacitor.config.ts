import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.3b6b5bca8ab541ceab6887b41400c0de',
  appName: 'baranex',
  webDir: 'dist',
  server: {
    url: 'https://3b6b5bca-8ab5-41ce-ab68-87b41400c0de.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;