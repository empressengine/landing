# Modifying Existing Pipelines

## What Does Pipeline Modification Mean?

Inside `@empr/es-sistema`, Pipelines are intentionally designed to be extensible runtime flows.

Large gameplay systems rarely remain static forever.

Over time, teams usually need to:

- add analytics,
- inject debug logic,
- extend gameplay rules,
- customize presentation,
- insert bonus checks,
- override behavior for events,
- or adapt flows for specific game modes.

Pipeline modification is the process of extending or reshaping existing execution flows without rewriting the entire runtime sequence from scratch.

Conceptually:

```txt
Base Runtime Flow
        ↓
Extended Runtime Flow
```

This is one of the major architectural advantages of explicit Pipeline-based execution.

Because runtime orchestration remains visible and composable, flows can evolve incrementally instead of becoming permanently locked inside monolithic runtime objects.

---

# Why Pipeline Modification Exists

In many traditional gameplay architectures, runtime flow becomes trapped inside:

- scene objects,
- animation callbacks,
- controller classes,
- or deeply nested async chains.

Eventually teams face a painful problem:

```txt
We need to slightly change this flow
without rewriting everything.
```

Typical examples:

- add analytics before spin,
- inject debug logging,
- customize win presentation,
- add bonus checks,
- alter stop behavior,
- or extend recovery logic.

When execution is hidden inside callbacks or giant runtime classes, these changes often require invasive rewrites.

`empr.es` avoids this problem by keeping runtime orchestration explicit and composable.

Pipelines are runtime definitions rather than hardcoded execution graphs.

This makes modification significantly safer and more maintainable.

---

# Composition Instead of Mutation

One of the most important architectural principles in `empr.es` is:

```txt
Prefer composition over hidden mutation.
```

Pipelines are usually modified by:

- reusing existing PipelineFactories,
- wrapping runtime flows,
- composing child factories,
- or assembling alternative execution sequences.

The goal is not to dynamically mutate runtime graphs invisibly.

The goal is to keep execution structure readable and explicit.

---

# Extending an Existing Pipeline

The most common customization pattern is extending a base PipelineFactory.

For example:

```typescript
const baseSpinPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(lockInputSystem)
        .use(startSpinSystem)
        .use(waitForResultSystem)
        .use(stopReelsSystem)
        .use(presentWinSystem)
        .use(unlockInputSystem);
};
```

Now imagine a project needs analytics support.

Instead of rewriting the entire flow, a new PipelineFactory may wrap the base Pipeline:

```typescript
const analyticsSpinPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline.use(trackSpinStartAnalyticsSystem);

    baseSpinPipeline({ pipeline });

    pipeline.use(trackSpinEndAnalyticsSystem);
};
```

Conceptually:

```txt
Analytics Before
        ↓
Base Spin Flow
        ↓
Analytics After
```

This style preserves reuse while keeping execution explicit.

---

# Adding Systems Before Existing Flow

A common runtime customization pattern is inserting preparation logic before a reusable Pipeline.

For example:

```typescript
const debugSpinPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline.use(debugLogStartSystem);

    baseSpinPipeline({ pipeline });
};
```

Conceptually:

```txt
Debug Log
        ↓
Base Spin Flow
```

This is especially useful for:

- analytics,
- telemetry,
- debugging,
- validation,
- or runtime instrumentation.

The important architectural detail is that the original Pipeline remains untouched.

---

# Adding Systems After Existing Flow

Pipelines may also append additional execution after a base flow completes.

For example:

```typescript
const bonusAwareSpinPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    baseSpinPipeline({ pipeline });

    pipeline.use(checkBonusTriggerSystem);
};
```

Conceptually:

```txt
Base Spin Flow
        ↓
Bonus Check
```

This style is significantly safer than injecting hidden side effects into unrelated Systems.

Execution order remains visible directly inside the Pipeline definition.

---

# Replacing Behavior Through Composition

Sometimes a runtime flow requires replacing one part of existing behavior entirely.

Instead of mutating the original Pipeline internally, `empr.es` encourages composing an alternative flow.

For example:

```typescript
const basePresentationPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(highlightWinSystem)
        .use(playWinAnimationSystem)
        .use(playWinSoundSystem);
};
```

A project may later require a custom presentation:

```typescript
const customPresentationPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(highlightWinSystem)
        .use(playCustomCinematicSystem)
        .use(playCustomAudioSystem);
};
```

Now higher-level Pipelines may choose which presentation flow to compose.

This keeps runtime orchestration explicit instead of mutating internal behavior invisibly.

---

# Splitting Large Pipelines Into Smaller Fragments

One of the best ways to make Pipelines easier to modify is splitting them into smaller PipelineFactories.

For example:

```txt
Gameplay Flow
    ↓
Initialization
    ↓
Spin Flow
    ↓
Result Evaluation
    ↓
Presentation
    ↓
Cleanup
```

Conceptually:

```typescript
const initializationPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline.use(prepareRoundSystem);
};

const spinPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(startSpinSystem)
        .use(stopReelsSystem);
};

const presentationPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline.use(presentWinSystem);
};
```

Then later:

```typescript
const gameplayPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    initializationPipeline({ pipeline });
    spinPipeline({ pipeline });
    presentationPipeline({ pipeline });
};
```

This structure makes runtime customization dramatically easier because modifications happen at meaningful execution boundaries.

---

# Example: Extending Spin Flow with Analytics

A practical real-world example:

```typescript
const analyticsPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(trackSpinRequestedSystem)
        .use(trackBetValueSystem);
};

const gameplayPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    analyticsPipeline({ pipeline });
    baseSpinPipeline({ pipeline });
};
```

Conceptually:

```txt
Analytics
        ↓
Gameplay Execution
```

This style avoids polluting gameplay Systems with unrelated telemetry logic.

---

# Example: Extending Flow with Debug Logging

Debug instrumentation is another common Pipeline customization.

For example:

```typescript
const debugPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(logPipelineStartSystem)
        .use(logRuntimeStateSystem);
};
```

Then:

```typescript
const gameplayPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    debugPipeline({ pipeline });
    baseGameplayPipeline({ pipeline });
};
```

This keeps debugging infrastructure externalized instead of embedding debug logic directly into gameplay Systems.

---

# Example: Bonus-Aware Runtime Flow

Bonus logic often changes runtime orchestration significantly.

For example:

```typescript
const bonusPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(checkBonusConditionSystem)
        .use(triggerBonusTransitionSystem);
};
```

Then:

```typescript
const gameplayPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    baseSpinPipeline({ pipeline });
    bonusPipeline({ pipeline });
};
```

This creates architecture where bonus behavior remains modular and independently maintainable.

---

# Example: Replacing Win Presentation

Sometimes projects need different presentation styles for:

- free spins,
- jackpots,
- tournaments,
- or branded events.

Instead of mutating one giant presentation Pipeline:

```typescript
const standardPresentationPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(playStandardAnimationSystem)
        .use(playStandardSoundSystem);
};

const cinematicPresentationPipeline: PipelineFactory<void> = ({
    pipeline,
}) => {
    pipeline
        .use(playCinematicAnimationSystem)
        .use(playCinematicVoiceSystem);
};
```

Higher-level flows may then choose the appropriate runtime presentation composition.

---

# Recommended Modification Style

The recommended approach in `empr.es` is:

---

## Reuse Existing PipelineFactories

Whenever possible, compose existing runtime fragments instead of duplicating execution logic.

---

## Extend Through Wrapping

Prefer:

```txt
Before Logic
        ↓
Base Flow
        ↓
After Logic
```

instead of mutating the base Pipeline internally.

---

## Split Large Flows Into Smaller Pieces

Smaller PipelineFactories are significantly easier to customize safely.

---

## Keep Execution Explicit

Modified runtime flow should remain readable directly from the Pipeline definition.

Avoid hidden runtime injection or invisible orchestration mutation.

---

## Keep Systems Focused

Pipeline customization works best when Systems remain small and reusable.

---

# About Old insert-Style Composition

Older execution systems sometimes supported APIs that dynamically inserted Systems into existing Pipelines internally.

For example:

```txt
Insert before X
Insert after Y
Replace system Z
```

While these approaches may appear flexible initially, they often create execution flow that becomes difficult to reason about over time.

In modern `@empr/es-sistema` architecture, the recommended approach is explicit composition through PipelineFactories instead of hidden runtime graph mutation.

Conceptually:

```txt
Prefer:
    explicit composition

Instead of:
    invisible pipeline mutation
```

This keeps execution structure understandable and predictable.

If older insert-style APIs existed previously, they should not be treated as the primary architectural recommendation for modern Pipeline composition.

---

# Why Explicit Composition Scales Better

Explicit composition provides several long-term architectural benefits.

---

## Readability

A developer can immediately inspect runtime flow directly from the Pipeline definition.

---

## Safer Modification

New features can wrap existing behavior without rewriting core flow.

---

## Better Reuse

Pipeline fragments become independently reusable.

---

## Better Debugging

Execution remains visible instead of hidden inside runtime mutation logic.

---

## Better Ownership Boundaries

Different teams can own separate runtime fragments safely.

---

# Common Mistakes

## Mutating Pipelines Invisibly

Execution flow should remain inspectable.

Avoid architectures where Systems appear or disappear dynamically without visible Pipeline composition.

---

## Creating One Giant Base Pipeline

Large monolithic Pipelines are difficult to customize safely.

Composition works best with smaller reusable fragments.

---

## Embedding Analytics Inside Gameplay Systems

Analytics, telemetry and debugging logic are often cleaner when composed externally around gameplay flow.

---

## Using Services as Hidden Orchestrators

Major runtime orchestration should remain visible through Pipelines.

Avoid moving flow control into unrelated services.

---

# Limitations and Design Decisions

Pipeline modification in `empr.es` intentionally prioritizes:

- explicit runtime structure,
- composability,
- readability,
- and safe extension.

The architecture intentionally avoids:

- invisible runtime mutation,
- automatic graph rewriting,
- and deeply implicit orchestration injection.

Execution flow should remain understandable directly from Pipeline composition itself.

---

# Related Articles

- [2.2. Pipelines](/architecture/execution/pipelines)
- [2.3. Pipeline Composition](/architecture/execution/pipeline-composition)
- [2.5. MVC Comparison](/architecture/execution/mvc-comparison)
- [3.6. Game Flow with FSM](/architecture/flow-control/game-flow-with-fsm)
- [3.7. FSM + Pipeline + Signal Architecture](/architecture/flow-control/fsm-pipeline-signal-architecture)
