import { defineConfig } from 'vite';

export default defineConfig({
  // root: 'public', // Removed, project root is now the default
  // base: './', // Use for relative paths if deploying to a subdirectory
  server: {
    open: true, // Automatically open in browser on dev start
  },
  build: {
    outDir: 'dist', // Output to project-root/dist
    assetsDir: 'assets',
    sourcemap: true, // Generate source maps for debugging
    rollupOptions: {
        input: '/home/ubuntu/project-root/index.html' // Explicitly point to index.html in project root
    }
  },
  resolve: {
    alias: {
      '@': '/src', // Alias for /src directory from project root
    },
  },
});

