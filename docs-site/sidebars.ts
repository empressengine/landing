import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';
import { emprApiSidebar, emprFeaturesSidebar } from './sidebars.empr.generated';

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
  featuresSidebar: emprFeaturesSidebar as SidebarsConfig['featuresSidebar'],
  apiSidebar: ['api/index', ...emprApiSidebar] as SidebarsConfig['apiSidebar'],
  licenseSidebar: ['license/index'],
};

export default sidebars;
