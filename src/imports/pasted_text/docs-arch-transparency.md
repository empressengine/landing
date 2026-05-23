Create the next landing page section after “Use Cases”.

Section:
Documentation and Architecture Transparency

Do not change any previous sections.
Keep the current premium dark technical visual language:
black background,
subtle grid,
thin borders,
graphite panels,
white typography,
restrained magenta accents,
animated SVG technical motifs,
runtime/control-room feeling.

Goal:
This section should communicate that empr.es is documented not only as an API, but as an architecture.
Teams should feel that the framework is understandable, inspectable, trustworthy and safe to evolve.

Important top layout:
- Left side: animated SVG technical element.
- Right side: intro text block.
- The intro block must be right-aligned.
- The SVG should feel like an architecture / observability / inspectability visual, not a decorative illustration.

Top content:

Main heading:
Documentation and Architecture Transparency

Intro paragraph 1:
A framework is only useful if teams can understand it, trust it and evolve it safely.

Intro paragraph 2:
empr.es is documented not only as an API, but as an architecture. Core concepts, package boundaries, execution models, lifecycle rules and integration layers are described explicitly so teams can reason about how the framework works under the hood.

Top-right text layout requirements:
- Right-align the heading and both intro paragraphs.
- Keep the text width constrained and editorial.
- Preserve strong hierarchy:
  heading largest,
  paragraph 1 secondary,
  paragraph 2 quieter and denser.

Left-side animated SVG concept:
Create a compact animated technical diagram that communicates:
architecture visibility,
inspectability,
structured package boundaries,
and traceable execution.

Suggested concept:
A small technical architecture map or observability panel with:
- grouped nodes or layers
- boundary lines / containers
- visible dependency paths
- a highlighted execution route
- subtle state or trace indicators

Possible semantic structure:
Core Concepts
→ Package Boundaries
→ Execution Models
→ Integration Layers
with a small active trace moving through the system.

Visual style:
- Same family as the Hero / Why / Pipelines / FSM / Use Cases SVG elements
- Thin geometric lines
- Nodes and connectors
- Subtle boundary boxes or layer separators are allowed inside the SVG
- No large outer card/container around the whole visual
- Floating in the page space
- Elegant, technical and low-noise
- Magenta used for active trace / highlighted node / key boundary
- Muted gray/white for support structure

Animation:
- subtle trace movement through nodes or layers
- light path highlighting
- gentle node pulse
- minimal signal travel
- quiet motion only
- no heavy glow, no distracting loops

Conceptual tone:
The framework is understandable under the hood.
Its architecture can be inspected, traced and reasoned about.

Below the intro area, create a structured 4-part documentation board.

Content areas to include:

1. Clear Core Concepts
Description:
The documentation explains the main building blocks of the framework: entities, components, storage, dependency injection, store, FSM, signals, update loop, lifecycle tracking and object pooling.

Support line:
Each concept has a clear responsibility and a defined place in the architecture.

Optional chips:
Entities
Components
Storage
DI
Store
FSM
Signals
Update Loop
Lifecycle
Pooling

2. Explicit Package Boundaries
Description:
empr.es is split into focused packages with strict responsibilities.

Support line:
The core package stays renderer-agnostic. Execution stacks live in separate packages. PixiJS integration is provided through the official runtime. Tooling and future editor modules are built around the same architecture instead of being mixed into the core.

Optional chips:
Renderer-agnostic core
Separate execution stacks
Official PixiJS runtime
Tooling around the core

3. Practical Examples
Description:
Documentation includes examples for both ECS and Component Driven usage.

Support line:
Teams can see how to bootstrap the framework, choose an execution stack, wire runtime services, define game flows and integrate rendering without guessing how the pieces fit together.

Optional chips:
ECS examples
Component Driven examples
Bootstrapping
Runtime services
Game flows
Rendering integration

4. Designed to be Inspectable
Description:
empr.es favors explicit architecture over hidden magic.

Support line:
Execution flows, lifecycle ownership, dependency registration and state transitions are designed to be visible, traceable and understandable — which makes the framework easier to debug, onboard and maintain over time.

Optional chips:
Visible execution flows
Lifecycle ownership
Dependency registration
State transitions
Debuggable
Maintainable

Design direction for the lower board:
- Do not make this a generic 4-card feature grid.
- Make it feel like a documentation architecture board or transparency matrix.
- The 4 content areas should feel connected as parts of one trust/clarity system.
- Each block should have:
  title,
  concise description,
  optional support line,
  compact chips or structured key terms.
- Keep the section scannable and premium.
- Avoid overly long text blocks.
- Use chips/tags only when they improve clarity.

Recommended structure:
Option A:
2x2 board with 4 structured panels

Option B:
One unified board with 4 grouped content zones

Choose the version that feels most premium, readable and aligned with the rest of the page.

Visual requirements:
- Keep all four areas balanced in importance.
- Use magenta only for small accents, active labels, subtle dividers or highlighted trace elements.
- Make the section feel credible, architectural and documentation-first.
- Avoid empty decorative space.
- Maintain good visual rhythm with the previous sections.

Important:
- Do not turn this into a generic docs marketing section.
- Do not use book/document icons or cliché documentation illustrations.
- Keep the message tied to architecture transparency and inspectability.
- Do not make the section too tall.
- Keep the visual language technical and premium.

Desired result:
A premium section that clearly communicates:
empr.es is understandable as a system,
documented as an architecture,
split into explicit package boundaries,
supported by practical examples,
and designed to be inspectable and trustworthy over time.