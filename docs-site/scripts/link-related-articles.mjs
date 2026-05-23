import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_ARCH = path.join(__dirname, '../docs/architecture');

/** @type {Record<string, string>} doc id (under architecture/) without .md */
const ARTICLE_TARGETS = {
  'What is empr.es?': 'core-concepts/what-is-empr-es',
  '1.1. What is empr.es?': 'core-concepts/what-is-empr-es',
  'ECS in empr.es': 'core-concepts/ecs-in-empr-es',
  '1.2. ECS in empr.es': 'core-concepts/ecs-in-empr-es',
  'Entity and Component Model': 'core-concepts/entity-and-component-model',
  '1.3. Entity and Component Model': 'core-concepts/entity-and-component-model',
  'EntityStorage and Component Filtering': 'core-concepts/entity-storage-and-component-filtering',
  '1.4. EntityStorage and Component Filtering': 'core-concepts/entity-storage-and-component-filtering',
  'Systems': 'execution/systems',
  '2.1. Systems': 'execution/systems',
  'Pipelines': 'execution/pipelines',
  '2.2. Pipelines': 'execution/pipelines',
  '2.3. Pipeline Composition': 'execution/pipeline-composition',
  '2.4. Modifying Existing Pipelines': 'execution/modifying-existing-pipelines',
  '2.5. MVC Comparison': 'execution/mvc-comparison',
  '2.6. What is Component Driven?': 'execution/what-is-component-driven',
  '2.7. ECS vs Component Driven': 'execution/ecs-vs-component-driven',
  'ECS vs Component Driven': 'execution/ecs-vs-component-driven',
  '3.1. Execution Initiators': 'flow-control/execution-initiators',
  '3.2. Signal and SignalService': 'flow-control/signal-and-signalservice',
  'Signal and SignalService': 'flow-control/signal-and-signalservice',
  '3.3. Signal Ownership': 'flow-control/signal-ownership',
  '3.4. Custom Signal Owners': 'flow-control/signal-ownership',
  '3.5. Listening to Update Loop via SignalService':
    'flow-control/listening-to-update-loop-via-signalservice',
  '3.6. Game Flow with FSM': 'flow-control/game-flow-with-fsm',
  'FSM and Runtime Flow': 'core-concepts/what-is-empr-es#fsm-and-runtime-flow',
  '3.7. FSM + Pipeline + Signal Architecture': 'flow-control/fsm-pipeline-signal-architecture',
  '4.1. DI Container': 'runtime-services/di-container',
  '4.2. DI inside Systems and Pipelines': 'runtime-services/di-inside-systems-and-pipelines',
  '4.3. ObjectPool and Pools': 'runtime-services/object-pool-and-pools',
  'ObjectPool and Pools': 'runtime-services/object-pool-and-pools',
  '4.4. Entity Lifecycle and Pool-aware Storage':
    'runtime-services/entity-lifecycle-and-pool-aware-storage',
  '4.5. Reactive Store': 'runtime-services/reactive-store',
  '4.6. LifecycleTracker and TrackedSignal':
    'runtime-services/lifecycle-tracker-and-tracked-signal',
  'LifecycleTracker and TrackedSignal': 'runtime-services/lifecycle-tracker-and-tracked-signal',
  'Renderer Agnostic Architecture': 'core-concepts/what-is-empr-es',
  'Official PixiJS Runtime (`@empr/es-lienzo`)': 'core-concepts/what-is-empr-es',
  '4.2. EntityStorage': 'core-concepts/entity-storage-and-component-filtering',
  '4.3. SignalService': 'flow-control/signal-and-signalservice',
  '4.4. FSMService': 'flow-control/game-flow-with-fsm',
};

/**
 * @param {string} target doc path under architecture/ (optional #anchor)
 * @returns {string} Docusaurus doc URL path (routeBasePath is `/`)
 */
function toDocLink(target) {
  const [docPath, anchor] = target.split('#');
  if (docPath === 'core-concepts/what-is-empr-es') {
    return anchor ? `/#${anchor}` : '/';
  }
  let link = `/architecture/${docPath}`;
  if (anchor) {
    link += `#${anchor}`;
  }
  return link;
}

/**
 * @param {string} line
 * @returns {string | null} label text
 */
function parseRelatedLine(line) {
  const linked = line.match(/^- \[(.+?)\]\([^)]+\)\s*$/);
  if (linked) {
    return linked[1];
  }
  const plain = line.match(/^- (.+)$/);
  if (!plain) {
    return null;
  }
  const text = plain[1].trim();
  const backtick = text.match(/^`(.+)`$/);
  return backtick ? backtick[1] : text;
}

/**
 * @param {string} content
 * @param {string} filePath
 */
function transformRelatedSection(content, filePath) {
  const headingPattern = /^# Related Articles\s*$/m;
  const altHeadingPattern = /^## Related articles\s*$/m;
  const match = content.match(headingPattern) ?? content.match(altHeadingPattern);
  if (!match) {
    return content;
  }

  const start = match.index;
  const afterHeading = start + match[0].length;
  const rest = content.slice(afterHeading);
  const nextSection = rest.search(/\n#+ /);
  const sectionEnd = nextSection === -1 ? content.length : afterHeading + nextSection;
  const section = content.slice(afterHeading, sectionEnd);

  const lines = section.split('\n');
  const newLines = lines.map((line) => {
    const label = parseRelatedLine(line);
    if (!label) {
      return line;
    }
    const target = ARTICLE_TARGETS[label];
    if (!target) {
      throw new Error(`${filePath}: unknown related article "${label}"`);
    }
    const href = toDocLink(target);
    return `- [${label}](${href})`;
  });

  return content.slice(0, afterHeading) + newLines.join('\n') + content.slice(sectionEnd);
}

function walk(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

let updated = 0;
for (const file of walk(DOCS_ARCH)) {
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes('Related Articles') && !original.includes('Related articles')) {
    continue;
  }
  const next = transformRelatedSection(original, file);
  if (next !== original) {
    fs.writeFileSync(file, next);
    updated += 1;
    console.log('updated:', path.relative(DOCS_ARCH, file));
  }
}

console.log(`Done. ${updated} file(s) updated.`);
