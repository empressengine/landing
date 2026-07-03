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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMPR_LIBS = path.resolve(__dirname, '../../../es-taller/libs/empr');
const DEST_ROOT = path.resolve(__dirname, '../docs/features');

/** @type {Array<{ id: string; srcDir: string; destDir: string; title: string; layers: Record<string, string[]> }>} */
const PACKAGES = [
  {
    id: 'es',
    srcDir: path.join(EMPR_LIBS, 'es'),
    destDir: DEST_ROOT,
    title: '@empr/es',
    layers: {
      shared: ['deferred-promise', 'object-pool', 'prng', 'signal', 'utils'],
      core: ['component', 'dependency', 'entity', 'filtered', 'store', 'update-loop'],
      features: ['fsm', 'signal-service'],
      widgets: ['entity-storage', 'lifecycle', 'pools'],
      bootstrap: ['empr'],
    },
  },
  {
    id: 'es-sistema',
    srcDir: path.join(EMPR_LIBS, 'es-sistema'),
    destDir: path.join(DEST_ROOT, 'es-sistema'),
    title: '@empr/es-sistema',
    layers: {
      core: ['system'],
      features: ['composer', 'executor'],
    },
  },
  {
    id: 'es-componente',
    srcDir: path.join(EMPR_LIBS, 'es-componente'),
    destDir: path.join(DEST_ROOT, 'es-componente'),
    title: '@empr/es-componente',
    layers: {},
  },
  {
    id: 'es-lienzo',
    srcDir: path.join(EMPR_LIBS, 'es-lienzo'),
    destDir: path.join(DEST_ROOT, 'es-lienzo'),
    title: '@empr/es-lienzo',
    layers: {
      shared: ['ref'],
      core: ['entity', 'object-pool', 'update-loop'],
      features: [
        'assets-loader',
        'assets-storage',
        'scene',
        'tree-builder',
        'view',
      ],
      widgets: [
        'interaction-service',
        'layers-service',
        'particle-service',
        'pixi-pools',
        'prefab-service',
        'timer',
      ],
      bootstrap: ['empr'],
    },
  },
];

/** @param {string} body */
function fixLinks(body) {
  return body
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
}

/**
 * @param {string} destPath
 * @param {string} body
 * @param {Record<string, string | number>} frontmatter
 */
function writeDoc(destPath, body, frontmatter) {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
    .join('\n');
  const content = `---\n${fm}\n---\n\n${fixLinks(body.trimStart())}\n`;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, content, 'utf8');
}

/**
 * @param {typeof PACKAGES[number]} pkg
 */
function copyPackage(pkg) {
  const readmePath = path.join(pkg.srcDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.warn(`Skip ${pkg.id}: no README.md`);
    return;
  }

  const readme = fs.readFileSync(readmePath, 'utf8');
  writeDoc(path.join(pkg.destDir, 'index.md'), readme, {
    sidebar_position: 1,
    title: pkg.title,
  });

  let layerPosition = 10;

  for (const [layer, features] of Object.entries(pkg.layers)) {
    const layerSrc = path.join(pkg.srcDir, 'src', layer, 'layer_responsibility.md');
    const layerDest = path.join(pkg.destDir, layer, 'index.md');
    const layerLabel = layer === 'features' ? 'features (layer)' : layer;

    if (fs.existsSync(layerSrc)) {
      const layerBody = fs.readFileSync(layerSrc, 'utf8');
      writeDoc(layerDest, layerBody, {
        sidebar_position: layerPosition,
        sidebar_label: layerLabel,
      });
    }

    let featurePosition = 1;
    for (const feature of features) {
      const featureSrc =
        layer === 'bootstrap'
          ? path.join(pkg.srcDir, 'src', layer, 'feature_description.md')
          : path.join(pkg.srcDir, 'src', layer, feature, 'feature_description.md');
      const featureDest = path.join(pkg.destDir, layer, `${feature}.md`);

      if (!fs.existsSync(featureSrc)) {
        console.warn(`Missing: ${featureSrc}`);
        continue;
      }

      const featureBody = fs.readFileSync(featureSrc, 'utf8');
      writeDoc(featureDest, featureBody, {
        sidebar_position: featurePosition,
        sidebar_label: feature,
      });
      featurePosition += 1;
    }

    layerPosition += 10;
  }

  console.log(`Copied ${pkg.id} → ${pkg.destDir}`);
}

const filterId = process.argv[2];
const selected = filterId ? PACKAGES.filter((p) => p.id === filterId) : PACKAGES;

if (filterId && selected.length === 0) {
  console.error(`Unknown package: ${filterId}`);
  process.exit(1);
}

for (const pkg of selected) {
  copyPackage(pkg);
}
