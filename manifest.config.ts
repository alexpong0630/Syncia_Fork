import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";
const { version } = packageJson;

const [major, minor, patch, label = "0"] = version
  .replace(/[^\d.-]+/g, "")
  .split(/[.-]/);

export default defineManifest(async (env) => ({
  name: env.mode === "staging" ? "[INTERNAL] ChatDock X" : "ChatDock X",
  description:
    "A simple chrome extension for interacting with Chat GPT with in your comfort",
  version: `${major}.${minor}.${patch}.${label}`,
  version_name: version,
  commands: {
    "open-sidebar": {
      suggested_key: {
        default: "Ctrl+Shift+I",
      },
      description: "Open the sidebar",
    },
  },
  manifest_version: 3,
  icons: {
    "16": "images/icon-16.png",
    "32": "images/icon-32.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png",
  },
  permissions: ["storage"],
  background: {
    service_worker: "src/pages/background/index.ts",
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*", "<all_urls>"],
      js: ["src/pages/content-script/index.tsx"],
    },
  ],
  web_accessible_resources: [
    {
      resources: ["src/pages/sidebar/index.html"],
      matches: ["http://*/*", "https://*/*"],
    },
  ],
}));