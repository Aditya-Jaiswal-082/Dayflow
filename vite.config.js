import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
 
export default defineConfig({
  plugins: [react()],
 
  // Fix 1: base must be "/" for Vercel — NOT "./"
  base: "/",
 
  build: {
    outDir: "dist",
 
    // Fix 2: suppress the chunk size warning (recharts is large)
    chunkSizeWarningLimit: 1000,
 
    rollupOptions: {
      output: {
        // Fix 3: split recharts into its own chunk so main bundle stays small
        manualChunks: {
          recharts: ["recharts"],
          react:    ["react", "react-dom"],
        },
      },
    },
  },
});