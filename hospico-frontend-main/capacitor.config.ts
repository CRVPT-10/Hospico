import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.hospico.app',
    appName: 'Hospico',
    webDir: 'dist',
    server: {
        url: 'https://hospico.onrender.com',
        cleartext: true
    }
};

export default config;
