import fs from 'node:fs';
import path from 'node:path';

export const LAYER_ORDER = ['shared', 'core', 'features', 'widgets', 'bootstrap'];

/**
 * @description Maps framework layer folder names to Docusaurus sidebar labels.
 * @param {string} layer Layer folder name.
 * @returns {string} Sidebar category label.
 */
export function layerSidebarLabel(layer) {
  return layer === 'features' ? 'features (layer)' : layer;
}

/**
 * @description Builds nested sidebar categories for one @empr package from a layer scan map.
 * @param {string} docIdPrefix Doc ID prefix without trailing slash (e.g. `features/es-lienzo`, `api/es`).
 * @param {Record<string, string[]>} layerFeatures Layer name to feature slug list (`index` = layer overview).
 * @returns {import('@docusaurus/plugin-content-docs').SidebarsConfig[string]} Sidebar category items.
 * @example
 * buildPackageSidebarItems('api/es-lienzo', {
 *   widgets: ['index', 'timer', 'tween-service'],
 * });
 */
export function buildPackageSidebarItems(docIdPrefix, layerFeatures) {
  /** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig[string]} */
  const items = [];

  for (const layer of LAYER_ORDER) {
    const features = layerFeatures[layer];
    if (!features?.length) {
      continue;
    }

    const docIds = features
      .filter((feature) => feature !== 'index')
      .map((feature) => `${docIdPrefix}/${layer}/${feature}`);

    if (features.includes('index') && docIds.length === 0) {
      items.push({
        type: 'category',
        label: layerSidebarLabel(layer),
        link: { type: 'doc', id: `${docIdPrefix}/${layer}/index` },
        items: [],
      });
      continue;
    }

    if (features.includes('index')) {
      items.push({
        type: 'category',
        label: layerSidebarLabel(layer),
        link: { type: 'doc', id: `${docIdPrefix}/${layer}/index` },
        items: docIds,
      });
    } else if (docIds.length > 0) {
      items.push({
        type: 'category',
        label: layerSidebarLabel(layer),
        items: docIds,
      });
    }
  }

  return items;
}

/**
 * @description Scans a copied docs package directory and returns layer → feature slugs.
 * @param {string} packageDir Absolute path to `docs/features/{pkg}` or `docs/api/{pkg}`.
 * @returns {Record<string, string[]>} Layer name to sorted feature slugs (`index` when `index.md` exists).
 * @example
 * scanDocsPackageDir('/repo/docs-site/docs/api/es-lienzo');
 */
export function scanDocsPackageDir(packageDir) {
  /** @type {Record<string, string[]>} */
  const layerFeatures = {};

  if (!fs.existsSync(packageDir)) {
    return layerFeatures;
  }

  for (const layer of LAYER_ORDER) {
    const layerDir = path.join(packageDir, layer);
    if (!fs.existsSync(layerDir)) {
      continue;
    }

    const entries = fs.readdirSync(layerDir);
    if (entries.includes('index.md')) {
      layerFeatures[layer] = layerFeatures[layer] ?? [];
      if (!layerFeatures[layer].includes('index')) {
        layerFeatures[layer].push('index');
      }
    }

    for (const entry of entries) {
      if (entry === 'index.md' || !entry.endsWith('.md')) {
        continue;
      }
      const slug = entry.slice(0, -3);
      layerFeatures[layer] = layerFeatures[layer] ?? [];
      layerFeatures[layer].push(slug);
    }
  }

  for (const layer of Object.keys(layerFeatures)) {
    layerFeatures[layer] = [
      ...layerFeatures[layer].filter((feature) => feature === 'index'),
      ...layerFeatures[layer].filter((feature) => feature !== 'index').sort(),
    ];
  }

  return layerFeatures;
}

/**
 * @description Sorts feature slugs with `index` first, then alphabetically.
 * @param {Record<string, string[]>} layerFeatures Layer scan map to normalize in place.
 * @returns {Record<string, string[]>} The same map reference after sorting.
 */
export function sortLayerFeatures(layerFeatures) {
  for (const layer of Object.keys(layerFeatures)) {
    layerFeatures[layer] = [
      ...layerFeatures[layer].filter((feature) => feature === 'index'),
      ...layerFeatures[layer].filter((feature) => feature !== 'index').sort(),
    ];
  }
  return layerFeatures;
}
