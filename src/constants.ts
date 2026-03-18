import versionJson from '../version.json'

export const SYSTEM_CONFIG = {
  name: 'AdminSys',
  version: versionJson.version,
  build: '2026.03.18-stable-v1',
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  copyright: '© 2026 AdminSys Inc.',
};
