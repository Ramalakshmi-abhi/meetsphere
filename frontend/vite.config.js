import { defineConfig } from 'vite';
import os from 'node:os';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const getLocalIpv4Domains = () => {
  const networkInterfaces = os.networkInterfaces();
  const domains = new Set(['localhost', '127.0.0.1']);

  Object.values(networkInterfaces).forEach((addresses) => {
    (addresses || []).forEach((address) => {
      if (address?.family === 'IPv4' && !address.internal && address.address) {
        domains.add(address.address);
      }
    });
  });

  return Array.from(domains);
};

export default defineConfig({
  plugins: [
    basicSsl({
      name: 'meetsphere-lan',
      certDir: 'node_modules/.vite/basic-ssl-lan',
      domains: getLocalIpv4Domains(),
    }),
    react(),
    nodePolyfills({
      include: ['buffer', 'events', 'process', 'util', 'stream'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000
  }
});
