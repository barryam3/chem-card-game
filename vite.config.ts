import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import proxy from "http2-proxy";

// Use HTTPS if certificate is found. Otherwise, use HTTP and log a warning.
const https = (() => {
  try {
    return {
      key: fs.readFileSync("./localhost-key.pem"),
      cert: fs.readFileSync("./localhost.pem"),
    };
  } catch {
    console.warn(
      "No HTTPS certificate found, using HTTP.\n" +
        "To enable HTTPS, run `mkcert localhost`"
    );
    return undefined;
  }
})();

// Firestore emulator doesn't support HTTPS directly. If HTTPS is enabled, the
// client should send Firestore requests to the Vite dev server, which proxies
// them to the Firestore emulator. The Vite dev server disables HTTP/2 if the
// built-in proxy is used, so we need to proxy manually. HTTP/2 is neeced to
// avoid the 6 connection per browser per domain limit for multi-tab testing.
const firestoreProxy: Plugin | undefined = https && {
  name: "firestore-proxy",
  configureServer: ({ middlewares }) => {
    middlewares.use("/google.firestore.v1.Firestore", (req, res) => {
      proxy.web(req, res, {
        hostname: "localhost",
        port: 8080,
        path: req.originalUrl,
      });
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    firestoreProxy,
  ],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep original names for PNG files (element cards)
          if (assetInfo.names.some((name) => name.endsWith(".png"))) {
            return "assets/[name][extname]";
          }
          // Use hash for other assets (CSS, JS, etc.)
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  server: {
    https,
  },
});
