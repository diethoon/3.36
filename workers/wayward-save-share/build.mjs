import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const cloudMode = resolve(root, "Wayward_MOD_v4.0_WML_검수완료/wml/mods/cloud-save");

await build({
  entryPoints: [resolve(here, "index.src.js")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "eof",
  outfile: resolve(here, "index.js"),
});

await build({
  entryPoints: [resolve(cloudMode, "opaque-client-entry.js")],
  nodePaths: [resolve(here, "node_modules")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "eof",
  outfile: resolve(cloudMode, "opaque-client.bundle.js"),
});

console.log("Built standalone Worker and WML OPAQUE client bundles.");
