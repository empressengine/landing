/**
 * Scan @empr/* package src trees for API_DOC.md and copy into docs-site/docs/api/.
 *
 * Usage:
 *   node scripts/copy-api-docs.mjs              # all configured packages
 *   node scripts/copy-api-docs.mjs es-sistema   # one package
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYER_ORDER, buildPackageSidebarItems } from './lib/empr-sidebar.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMPR_LIBS = path.resolve(__dirname, '../../../es-taller/libs/empr');
const DEST_ROOT = path.resolve(__dirname, '../docs/api');

/** @type {Array<{ id: string; srcDir: string; title: string }>} */
const PACKAGES = [
  { id: 'es', srcDir: path.join(EMPR_LIBS, 'es'), title: '@empr/es' },
  { id: 'es-sistema', srcDir: path.join(EMPR_LIBS, 'es-sistema'), title: '@empr/es-sistema' },
  { id: 'es-componente', srcDir: path.join(EMPR_LIBS, 'es-componente'), title: '@empr/es-componente' },
  { id: 'es-lienzo', srcDir: path.join(EMPR_LIBS, 'es-lienzo'), title: '@empr/es-lienzo' },
];

const DOCS_BASE = '/docs';

/**
 * @param {string} targetPkg
 * @param {string} targetPath
 */
function apiUrl(targetPkg, targetPath) {
  let clean = targetPath.replace(/\/$/, '').replace(/\/API_DOC\.md$/, '');
  if (clean === 'index') {
    return `${DOCS_BASE}/api/${targetPkg}/`;
  }
  if (clean.endsWith('/index')) {
    return `${DOCS_BASE}/api/${targetPkg}/${clean.slice(0, -'/index'.length)}/`;
  }
  return `${DOCS_BASE}/api/${targetPkg}/${clean}`;
}

/**
 * @param {string} packageId
 * @param {string} [layer]
 * @param {string} [feature]
 */
function featuresUrl(packageId, layer, feature) {
  const prefix =
    packageId === 'es' ? `${DOCS_BASE}/features` : `${DOCS_BASE}/features/${packageId}`;
  if (!layer) {
    return prefix;
  }
  if (feature) {
    return `${prefix}/${layer}/${feature}`;
  }
  return `${prefix}/${layer}/`;
}

/**
 * @param {string} body
 * @param {string} packageId
 * @param {string} docRelPath
 */
function fixApiDocLinks(body, packageId, docRelPath) {
  const docParts = docRelPath.replace(/\.md$/, '').split('/');
  const layer = docParts[1];
  const feature = docParts[2];
  const inFeaturesLayer = layer === 'features' && Boolean(feature);
  const inLayerModule = docParts.length >= 3;

  let result = body;

  result = result.replace(/\]\((\.\.?\/[^)]*?)API_DOC\.md\)/g, ']($1)');

  result = result.replace(/\]\((\.\.?\/[^)]*?)\/\)/g, ']($1)');

  result = result.replace(
    /\[`features\/([^`]+)`\]\(\.\.\/([^)]+)\/?\)/g,
    (_, feat) => `](${apiUrl(packageId, `features/${feat}`)})`,
  );

  result = result.replace(
    /\[`core\/([^`]+)`\]\(\.\.\/([^)]+)\/?\)/g,
    (_, feat) => `](${apiUrl(packageId, `core/${feat}`)})`,
  );

  result = result.replace(/\[`([^`]+)`\]\(\.\/[^)]+\.(?:ts|types\.ts)\)/g, '`$1`');
  result = result.replace(/\[`([^`]+)`\]\(\.\.\/[^)]+\.(?:ts|types\.ts)\)/g, '`$1`');
  result = result.replace(/\[`([^`]+)`\]\(\.\.\/\.\.\/[^)]+\.(?:ts|types\.ts)\)/g, '`$1`');

  result = result.replace(
    /\[`([^`]+)`\]\(\.\/[^)]*(?:extension_manifest|feature_description|layer_responsibility|\.artifacts\/[^)]+)\.md\)/g,
    '`$1`',
  );
  result = result.replace(
    /\[`([^`]+)`\]\(\.\.\/[^)]*(?:extension_manifest|feature_description|layer_responsibility|\.artifacts\/[^)]+)\.md\)/g,
    '`$1`',
  );

  result = result.replace(/\]\(\.\/feature_description\.md\)/g, () => {
    if (!layer) {
      return '](./feature_description.md)';
    }
    return `](${featuresUrl(packageId, layer, feature)})`;
  });

  result = result.replace(/\]\(\.\/layer_responsibility\.md\)/g, () => {
    if (!layer) {
      return '](./layer_responsibility.md)';
    }
    return `](${featuresUrl(packageId, layer)})`;
  });

  result = result.replace(/\]\(\.\.\/layer_responsibility\.md\)/g, () => {
    if (!layer) {
      return '](../layer_responsibility.md)';
    }
    return `](${featuresUrl(packageId, layer)})`;
  });

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)es\/README\.md\)/g,
    `](${featuresUrl('es')})`,
  );

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)es-componente\/README\.md\)/g,
    `](${featuresUrl('es-componente')})`,
  );

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)es-sistema\/README\.md\)/g,
    `](${apiUrl('es-sistema', 'index')})`,
  );

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)README\.md\)/g,
    `](${apiUrl(packageId, 'index')})`,
  );

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)(?:empr\/)?es\/src\/([^)]+)\)/g,
    (_, subpath) => `](${apiUrl('es', subpath)})`,
  );

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)es\/src\/([^)]+)\)/g,
    (_, subpath) => `](${apiUrl('es', subpath)})`,
  );

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)es\/([^)]+)\)/g,
    (_, subpath) => {
      if (subpath.endsWith('README.md')) {
        return `](${featuresUrl('es')})`;
      }
      if (subpath.endsWith('.ts')) {
        return `](${subpath})`;
      }
      return `](${apiUrl('es', subpath)})`;
    },
  );

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)(?:empr\/)?es-sistema\/src\/([^)]+)\)/g,
    (_, subpath) => `](${apiUrl('es-sistema', subpath)})`,
  );

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)(?:empr\/)?es-componente\/src\/([^)]+)\)/g,
    (_, subpath) => `](${apiUrl('es-componente', subpath)})`,
  );

  result = result.replace(
    /\]\((?:(?:\.\.\/)+)(?:empr\/)?es-lienzo\/src\/([^)]+)\)/g,
    (_, subpath) => `](${apiUrl('es-lienzo', subpath)})`,
  );

  if (inFeaturesLayer) {
    result = result.replace(/\]\(\.\.\/([a-z0-9-]+)\)/g, (match, name) => {
      if (['core', 'shared', 'widgets', 'bootstrap', 'features'].includes(name)) {
        return `](${apiUrl(packageId, `${name}/index`)})`;
      }
      return `](${apiUrl(packageId, `features/${name}`)})`;
    });
    result = result.replace(
      /\]\(\.\.\/core\/([^)]+)\)/g,
      (_, mod) => `](${apiUrl(packageId, `core/${mod}`)})`,
    );
    result = result.replace(/\]\(\.\/([a-z0-9-]+)\)/g, (_, name) => {
      return `](${apiUrl(packageId, `features/${name}`)})`;
    });
  }

  if (inLayerModule && layer) {
    result = result.replace(/\]\(\.\.\/([a-z][a-z0-9-]*)\)(?!\/.)/g, (match, name) => {
      if (['core', 'shared', 'widgets', 'features', 'bootstrap', 'es'].includes(name)) {
        return `](${apiUrl(packageId, `${name}/index`)})`;
      }
      return `](${apiUrl(packageId, `${layer}/${name}`)})`;
    });
    result = result.replace(
      /\]\(\.\.\/([a-z]+)\/([^)]+)\)/g,
      (_, targetLayer, mod) => `](${apiUrl(packageId, `${targetLayer}/${mod}`)})`,
    );
  }

  result = result.replace(
    /\[`([^`]+)`\]\(\.\.\/\.\.\/\.\.\/docs\/plans\/[^)]+\)/g,
    '`$1` (internal monorepo design doc)',
  );
  result = result.replace(
    /\[`([^`]+)`\]\(\.\.\/\.\.\/\.\.\/apps\/[^)]+\)/g,
    '`$1`',
  );
  result = result.replace(
    /\[`([^`]+)`\]\(\.\.\/\.\.\/\.\.\/\.\.\/apps\/[^)]+\)/g,
    '`$1`',
  );

  result = result.replace(
    /\[`([^`]+)`\]\([^)]*\/(?:features|core|widgets|shared|bootstrap)\/[^)]+\.(?:ts|types\.ts)\)/g,
    '`$1`',
  );

  result = result.replace(/\]\([^)]+\.ts\)/g, (match) => {
    const label = match.match(/\[`([^`]+)`\]/)?.[1] ?? match;
    return label.startsWith('`') ? label : `\`${label.replace(/^\[|\]$/g, '')}\``;
  });

  result = result.replace(/\]\(\.\.?\/[^)]*(?:behaviours|apps\/|\.artifacts)[^)]*\)/g, (match) => {
    const text = match.slice(2, -1).split('/').pop() ?? match;
    return `\`${text}\``;
  });

  result = result.replace(/\]\(\/docs\/api\/[^)]+\/(?:behaviours|[^/]+\.ts)(?:\/[^)]*)?\)/g, (match) => {
    const segment = match.split('/').pop()?.replace(/\)$/, '') ?? 'source';
    return `\`${segment}\``;
  });

  result = result.replace(/\]\(\.\.?\/[^)]+\)/g, (match) => {
    const href = match.slice(2, -1);
    const segment = href.split('/').filter(Boolean).pop() ?? href;
    return `\`${segment}\``;
  });

  return result;
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
  const content = `---\n${fm}\n---\n\n${body.trimStart()}\n`;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, content, 'utf8');
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function findApiDocs(dir) {
  /** @type {string[]} */
  const found = [];
  if (!fs.existsSync(dir)) {
    return found;
  }

  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'API_DOC.md') {
        found.push(full);
      }
    }
  };

  walk(dir);
  return found.sort();
}

/**
 * @param {typeof PACKAGES[number]} pkg
 * @returns {Record<string, string[]>}
 */
function copyPackage(pkg) {
  const srcRoot = path.join(pkg.srcDir, 'src');
  const destPkg = path.join(DEST_ROOT, pkg.id);
  const apiFiles = findApiDocs(srcRoot);

  /** @type {Record<string, string[]>} */
  const layerFeatures = {};

  for (const apiFile of apiFiles) {
    const relFromSrc = path.relative(srcRoot, apiFile).replace(/\\/g, '/');
    const segments = relFromSrc.split('/');
    const layer = segments[0];
    const isLayerRoot = segments.length === 2 && segments[1] === 'API_DOC.md';
    const feature = isLayerRoot ? null : segments[1];

    const destRel = isLayerRoot
      ? `${pkg.id}/${layer}`
      : `${pkg.id}/${layer}/${feature}.md`;
    const destFull = path.join(destPkg, isLayerRoot ? `${layer}/index.md` : `${layer}/${feature}.md`);

    const raw = fs.readFileSync(apiFile, 'utf8');
    const fixed = fixApiDocLinks(raw, pkg.id, destRel);

    const layerIndex = LAYER_ORDER.indexOf(layer);
    const sidebarLabel = isLayerRoot ? layer : feature;

    writeDoc(destFull, fixed, {
      sidebar_position: isLayerRoot
        ? (layerIndex >= 0 ? layerIndex + 1 : 1) * 10
        : (layerIndex >= 0 ? layerIndex + 1 : 1) * 10 + 1,
      sidebar_label: sidebarLabel,
    });

    if (!layerFeatures[layer]) {
      layerFeatures[layer] = [];
    }
    layerFeatures[layer].push(isLayerRoot ? 'index' : feature);
  }

  writeDoc(
    path.join(destPkg, 'index.md'),
    `# ${pkg.title} API\n\nAPI reference organized by framework layer. Select a module in the sidebar.\n`,
    { sidebar_position: 1, title: pkg.title },
  );

  console.log(`Copied ${pkg.id}: ${apiFiles.length} API_DOC.md → ${destPkg}`);

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
