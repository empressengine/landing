/**
 * One-time copy of @empr/es feature docs from es-taller into docs-site.
 * Re-run manually when framework docs change (variant A sync).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, '../../../es-taller/libs/empr/es');
const DEST_ROOT = path.resolve(__dirname, '../docs/features');

const LAYERS = {
  shared: ['deferred-promise', 'object-pool', 'prng', 'signal', 'utils'],
  core: ['component', 'dependency', 'entity', 'filtered', 'store', 'update-loop'],
  features: ['fsm', 'signal-service'],
  widgets: ['entity-storage', 'lifecycle', 'pools'],
  bootstrap: ['empr'],
};

/** @param {string} body */
function fixLinks(body) {
  return body
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

// Root README → features/index.md
const readme = fs.readFileSync(path.join(SRC_ROOT, 'README.md'), 'utf8');
writeDoc(path.join(DEST_ROOT, 'index.md'), readme, {
  sidebar_position: 1,
  title: '@empr/es',
});

let layerPosition = 10;

for (const [layer, features] of Object.entries(LAYERS)) {
  const layerSrc = path.join(SRC_ROOT, 'src', layer, 'layer_responsibility.md');
  const layerDest = path.join(DEST_ROOT, layer, 'index.md');
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
        ? path.join(SRC_ROOT, 'src', layer, 'feature_description.md')
        : path.join(SRC_ROOT, 'src', layer, feature, 'feature_description.md');
    const featureDest = path.join(DEST_ROOT, layer, `${feature}.md`);

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

console.log(`Copied feature docs to ${DEST_ROOT}`);
