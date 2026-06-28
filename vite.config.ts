import { defineConfig } from "vite";

export default defineConfig({
  // Change this to your GitHub Pages repo name, e.g. "/world-cup-bracket/"
  // Leave as "/" if deploying to a custom domain or the root of your org page
  base: "/WorldCupBracket/",
  publicDir: "res",
  build: {
    outDir: "dist",
  },
});
