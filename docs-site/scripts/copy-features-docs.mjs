/**
 * Copy @empr/* package docs from es-taller into docs-site/docs/features/.
 * Re-run manually when framework docs change (variant A sync).
 *
 * Usage:
 *   node scripts/copy-features-docs.mjs           # all packages
 *   node scripts/copy-features-docs.mjs es-sistema   # one package
 *   node scripts/copy-features-docs.mjs es-componente
 *   node scripts/copy-features-docs.mjs es-lienzo
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYER_ORDER, sortLayerFeatures } from './lib/empr-sidebar.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMPR_LIBS = path.resolve(__dirname, '../../../es-taller/libs/empr');
const DEST_ROOT = path.resolve(__dirname, '../docs/features');

/** @type {Array<{ id: string; srcDir: string; destDir: string; title: string }>} */
const PACKAGES = [
  {
    id: 'es',
    srcDir: path.join(EMPR_LIBS, 'es'),
    destDir: DEST_ROOT,
    title: '@empr/es',
  },
  {
    id: 'es-sistema',
    srcDir: path.join(EMPR_LIBS, 'es-sistema'),
    destDir: path.join(DEST_ROOT, 'es-sistema'),
    title: '@empr/es-sistema',
  },
  {
    id: 'es-componente',
    srcDir: path.join(EMPR_LIBS, 'es-componente'),
    destDir: path.join(DEST_ROOT, 'es-componente'),
    title: '@empr/es-componente',
  },
  {
    id: 'es-lienzo',
    srcDir: path.join(EMPR_LIBS, 'es-lienzo'),
    destDir: path.join(DEST_ROOT, 'es-lienzo'),
    title: '@empr/es-lienzo',
  },
];

/** @param {string} body @param {string} packageId */
function fixLinks(body, packageId) {
  let result = body
    .replace(/\[`(@empr\/es)`\]\(\.\.\/es\/README\.md\)/g, '[@empr/es](../)')
    .replace(/\[`(@empr\/es)`\]\(\.\.\/\.\.\/es\/README\.md\)/g, '[@empr/es](../../)')
    .replace(
      /\[`(@empr\/es-sistema)`\]\(\.\.\/es-sistema\/README\.md\)/g,
      '[@empr/es-sistema](./es-sistema/)',
    )
    .replace(
      /\[`(@empr\/es-componente)`\]\(\.\.\/es-componente\/README\.md\)/g,
      '[@empr/es-componente](./es-componente/)',
    )
    .replace(
      /\[`(@empr\/es-[^`]+)`\]\(\.\.\/[^)]+\/README\.md\)/g,
      '`$1`',
    )
    .replace(
      /\[`(@empr\/es-[^`]+)`\]\(\.\.\/\.\.\/\.\.\/[^)]+\/README\.md\)/g,
      '`$1`',
    )
    .replace(
      /\[`([^`]+)`\]\(\.\.\/\.\.\/\.\.\/docs\/plans\/[^)]+\)/g,
      '`$1` (internal monorepo design doc)',
    )
    .replace(
      /\[`([^`]+)`\]\(\.\.\/\.\.\/\.\.\/apps\/[^)]+\)/g,
      '`$1`',
    )
    .replace(
      /\[`([^`]+)`\]\(\.\.\/\.\.\/\.\.\/apps\/slot-cd-client\/\.\.\.\/empr\.game\.ts\)/g,
      '`$1`',
    );

  if (packageId !== 'es') {
    result = result
      .replace(/\]\(\.\/es-sistema\/\)/g, '](../es-sistema/)')
      .replace(/\]\(\.\/es-componente\/\)/g, '](../es-componente/)')
      .replace(/\]\(\.\/es-lienzo\/\)/g, '](../es-lienzo/)');
  }

  return result;
}

/**
 * @description Resolves feature_description.md including `.artifacts` fallback.
 * @param {string} featureDir Absolute path to `src/{layer}/{feature}`.
 * @returns {string | null} Resolved source path or null when missing.
 */
function resolveFeatureDescription(featureDir) {
  const standard = path.join(featureDir, 'feature_description.md');
  if (fs.existsSync(standard)) {
    return standard;
  }

  const artifacts = path.join(featureDir, '.artifacts', 'feature_description.md');
  if (fs.existsSync(artifacts)) {
    return artifacts;
  }

  return null;
}

/**
 * @description Scans package source tree for feature docs and layer indexes.
 * @param {string} srcRoot Absolute path to package `src/`.
 * @returns {Record<string, string[]>} Layer name to feature slugs.
 */
function scanFeatureDocs(srcRoot) {
  /** @type {Record<string, string[]>} */
  const layerFeatures = {};

  for (const layer of LAYER_ORDER) {
    const layerDir = path.join(srcRoot, layer);
    if (!fs.existsSync(layerDir)) {
      continue;
    }

    if (fs.existsSync(path.join(layerDir, 'layer_responsibility.md'))) {
      layerFeatures[layer] = layerFeatures[layer] ?? [];
      if (!layerFeatures[layer].includes('index')) {
        layerFeatures[layer].push('index');
      }
    }

    if (layer === 'bootstrap') {
      if (fs.existsSync(path.join(layerDir, 'feature_description.md'))) {
        layerFeatures[layer] = layerFeatures[layer] ?? [];
        layerFeatures[layer].push('empr');
      }
      continue;
    }

    for (const entry of fs.readdirSync(layerDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue;
      }

      const featureDir = path.join(layerDir, entry.name);
      if (resolveFeatureDescription(featureDir)) {
        layerFeatures[layer] = layerFeatures[layer] ?? [];
        layerFeatures[layer].push(entry.name);
      }
    }
  }

  return sortLayerFeatures(layerFeatures);
}

/**
 * @param {string} destPath
 * @param {string} body
 * @param {Record<string, string | number>} frontmatter
 */
function writeDoc(destPath, body, frontmatter, packageId) {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
    .join('\n');
  const content = `---\n${fm}\n---\n\n${fixLinks(body.trimStart(), packageId)}\n`;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, content, 'utf8');
}

/**
 * @param {typeof PACKAGES[number]} pkg
 * @returns {Record<string, string[]>}
 */
function copyPackage(pkg) {
  const readmePath = path.join(pkg.srcDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.warn(`Skip ${pkg.id}: no README.md`);
    return {};
  }

  const readme = fs.readFileSync(readmePath, 'utf8');
  writeDoc(path.join(pkg.destDir, 'index.md'), readme, {
    sidebar_position: 1,
    title: pkg.title,
  }, pkg.id);

  const srcRoot = path.join(pkg.srcDir, 'src');
  const layerFeatures = scanFeatureDocs(srcRoot);
  let layerPosition = 10;

  for (const layer of LAYER_ORDER) {
    const features = layerFeatures[layer];
    if (!features?.length) {
      continue;
    }

    const layerSrc = path.join(srcRoot, layer, 'layer_responsibility.md');
    const layerDest = path.join(pkg.destDir, layer, 'index.md');
    const layerLabel = layer === 'features' ? 'features (layer)' : layer;

    if (features.includes('index') && fs.existsSync(layerSrc)) {
      const layerBody = fs.readFileSync(layerSrc, 'utf8');
      writeDoc(layerDest, layerBody, {
        sidebar_position: layerPosition,
        sidebar_label: layerLabel,
      }, pkg.id);
    }

    let featurePosition = 1;
    for (const feature of features) {
      if (feature === 'index') {
        continue;
      }

      const featureSrc =
        layer === 'bootstrap'
          ? path.join(srcRoot, layer, 'feature_description.md')
          : resolveFeatureDescription(path.join(srcRoot, layer, feature));
      const featureDest = path.join(pkg.destDir, layer, `${feature}.md`);

      if (!featureSrc || !fs.existsSync(featureSrc)) {
        console.warn(`Missing: ${featureSrc ?? `${layer}/${feature}`}`);
        continue;
      }

      const featureBody = fs.readFileSync(featureSrc, 'utf8');
      writeDoc(featureDest, featureBody, {
        sidebar_position: featurePosition,
        sidebar_label: feature,
      }, pkg.id);
      featurePosition += 1;
    }

    layerPosition += 10;
  }

  console.log(`Copied ${pkg.id} → ${pkg.destDir}`);
  return layerFeatures;
}

const filterId = process.argv[2];
const selected = filterId ? PACKAGES.filter((p) => p.id === filterId) : PACKAGES;

if (filterId && selected.length === 0) {
  console.error(`Unknown package: ${filterId}`);
  process.exit(1);
}

/** @type {Record<string, Record<string, string[]>>} */
const scanSummary = {};

for (const pkg of selected) {
  scanSummary[pkg.id] = copyPackage(pkg);
}

console.log('\nLayer scan summary:');
console.log(JSON.stringify(scanSummary, null, 2));
