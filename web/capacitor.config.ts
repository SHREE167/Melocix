import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.melocix.music',
  appName: 'Melocix',
  webDir: 'dist',
  server: {
    // Uncomment while developing against Vite:
    // url: 'http://YOUR_LAN_IP:5173',
    // cleartext: true,
  },
  android: {
    // Keep false to avoid MITM via mixed HTTP content in WebView
    allowMixedContent: false,
  },
}

export default config
