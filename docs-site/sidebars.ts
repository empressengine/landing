import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  architectureSidebar: [
    {
      type: 'category',
      label: 'Core architecture overview',
      collapsible: false,
      items: [
        {
          type: 'category',
          label: '1. Core concepts',
          items: [
            'architecture/core-concepts/what-is-empr-es',
            'architecture/core-concepts/ecs-in-empr-es',
            'architecture/core-concepts/entity-and-component-model',
            'architecture/core-concepts/entity-storage-and-component-filtering',
          ],
        },
        {
          type: 'category',
          label: '2. Execution',
          items: [
            'architecture/execution/systems',
            'architecture/execution/pipelines',
            'architecture/execution/pipeline-composition',
            'architecture/execution/modifying-existing-pipelines',
            'architecture/execution/mvc-comparison',
            'architecture/execution/what-is-component-driven',
            'architecture/execution/ecs-vs-component-driven',
          ],
        },
        {
          type: 'category',
          label: '3. Flow control',
          items: [
            'architecture/flow-control/execution-initiators',
            'architecture/flow-control/signal-and-signalservice',
            'architecture/flow-control/signal-ownership',
            'architecture/flow-control/listening-to-update-loop-via-signalservice',
            'architecture/flow-control/game-flow-with-fsm',
            'architecture/flow-control/fsm-pipeline-signal-architecture',
          ],
        },
        {
          type: 'category',
          label: '4. Runtime services',
          items: [
            'architecture/runtime-services/di-container',
            'architecture/runtime-services/di-inside-systems-and-pipelines',
            'architecture/runtime-services/object-pool-and-pools',
            'architecture/runtime-services/entity-lifecycle-and-pool-aware-storage',
            'architecture/runtime-services/reactive-store',
            'architecture/runtime-services/lifecycle-tracker-and-tracked-signal',
            'architecture/runtime-services/shared-utilities',
          ],
        },
        {
          type: 'category',
          label: '5. Guide',
          items: [
            'architecture/guide/building-console-only-game-mechanic',
          ],
        },
      ],
    },
  ],
  featuresSidebar: [
    {
      type: 'category',
      label: '@empr/es',
      link: {
        type: 'doc',
        id: 'features/index',
      },
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'shared',
          link: {
            type: 'doc',
            id: 'features/shared/index',
          },
          items: [
            'features/shared/deferred-promise',
            'features/shared/object-pool',
            'features/shared/prng',
            'features/shared/signal',
            'features/shared/utils',
          ],
        },
        {
          type: 'category',
          label: 'core',
          link: {
            type: 'doc',
            id: 'features/core/index',
          },
          items: [
            'features/core/component',
            'features/core/dependency',
            'features/core/entity',
            'features/core/filtered',
            'features/core/store',
            'features/core/update-loop',
          ],
        },
        {
          type: 'category',
          label: 'features (layer)',
          link: {
            type: 'doc',
            id: 'features/features/index',
          },
          items: ['features/features/fsm', 'features/features/signal-service'],
        },
        {
          type: 'category',
          label: 'widgets',
          link: {
            type: 'doc',
            id: 'features/widgets/index',
          },
          items: [
            'features/widgets/entity-storage',
            'features/widgets/lifecycle',
            'features/widgets/pools',
          ],
        },
        {
          type: 'category',
          label: 'bootstrap',
          link: {
            type: 'doc',
            id: 'features/bootstrap/index',
          },
          items: ['features/bootstrap/empr'],
        },
      ],
    },
    {
      type: 'category',
      label: '@empr/es-sistema',
      link: {
        type: 'doc',
        id: 'features/es-sistema/index',
      },
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'core',
          items: ['features/es-sistema/core/system'],
        },
        {
          type: 'category',
          label: 'features (layer)',
          items: [
            'features/es-sistema/features/composer',
            'features/es-sistema/features/executor',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '@empr/es-componente',
      link: {
        type: 'doc',
        id: 'features/es-componente/index',
      },
      collapsed: false,
      items: [],
    },
    {
      type: 'category',
      label: '@empr/es-lienzo',
      link: {
        type: 'doc',
        id: 'features/es-lienzo/index',
      },
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'shared',
          link: {
            type: 'doc',
            id: 'features/es-lienzo/shared/index',
          },
          items: ['features/es-lienzo/shared/ref'],
        },
        {
          type: 'category',
          label: 'core',
          link: {
            type: 'doc',
            id: 'features/es-lienzo/core/index',
          },
          items: [
            'features/es-lienzo/core/entity',
            'features/es-lienzo/core/object-pool',
            'features/es-lienzo/core/update-loop',
          ],
        },
        {
          type: 'category',
          label: 'features (layer)',
          link: {
            type: 'doc',
            id: 'features/es-lienzo/features/index',
          },
          items: [
            'features/es-lienzo/features/assets-loader',
            'features/es-lienzo/features/assets-storage',
            'features/es-lienzo/features/scene',
            'features/es-lienzo/features/tree-builder',
            'features/es-lienzo/features/view',
          ],
        },
        {
          type: 'category',
          label: 'widgets',
          link: {
            type: 'doc',
            id: 'features/es-lienzo/widgets/index',
          },
          items: [
            'features/es-lienzo/widgets/interaction-service',
            'features/es-lienzo/widgets/layers-service',
            'features/es-lienzo/widgets/particle-service',
            'features/es-lienzo/widgets/pixi-pools',
            'features/es-lienzo/widgets/prefab-service',
            'features/es-lienzo/widgets/timer',
          ],
        },
        {
          type: 'category',
          label: 'bootstrap',
          link: {
            type: 'doc',
            id: 'features/es-lienzo/bootstrap/index',
          },
          items: ['features/es-lienzo/bootstrap/empr'],
        },
      ],
    },
  ],
};

export default sidebars;
