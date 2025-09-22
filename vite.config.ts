import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep original names for PNG files (element cards)
          if (assetInfo.name && assetInfo.name.endsWith(".png")) {
            return "assets/[name][extname]";
          }
          // Use hash for other assets (CSS, JS, etc.)
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
