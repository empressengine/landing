Create the next landing page section after “Renderer Agnostic. Runtime Independent.”

Section:
Official PixiJS Runtime

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
This section should explain that empr.es is renderer agnostic at its core, but also provides an official PixiJS runtime for building production-ready 2D browser games.
The section should make @empr/es-lienzo feel like a high-quality integration layer between the empr.es architectural core and the PixiJS scene graph.

Important top layout:
- Left side: animated SVG technical element.
- Right side: intro text block.
- The intro block must be aligned to the right, not centered.
- The SVG must feel like a technical runtime/integration visual, not a decorative illustration.

Top content:

Main heading:
Official PixiJS Runtime

Intro paragraph 1:
empr.es is renderer agnostic at its core, but it also comes with an official PixiJS runtime for building production-ready 2D browser games.

Intro paragraph 2:
@empr/es-lienzo bridges the architectural core of empr.es with the PixiJS scene graph. It connects entities to Pixi containers, provides declarative view construction, manages assets, drives animations through the game loop and keeps rendering lifecycle aligned with the framework.

Top-right text layout requirements:
- Right-align the heading and both intro paragraphs.
- Keep the text width constrained and editorial.
- Preserve strong hierarchy:
  heading largest,
  paragraph 1 secondary,
  paragraph 2 quieter and slightly denser.

Left-side animated SVG concept:
Create a compact animated technical diagram that communicates:
architectural core → PixiJS runtime integration → rendering/runtime services.

The SVG should visually suggest:
- a core node or core layer
- an integration bridge or adapter path
- a rendering/runtime node
- several small service nodes branching from the runtime layer
- a sense of controlled data/render flow

Suggested semantic structure:
Core Runtime
→ @empr/es-lienzo
→ PixiJS Scene Graph
→ services / rendering lifecycle

Visual style:
- Same family as the Hero / Why / Pipelines / FSM SVG elements
- Thin geometric lines
- Nodes and connectors
- Layered technical diagram feel
- No outer border/container
- Floating in the page space
- Elegant, minimal, low-noise
- Magenta used for active nodes / highlighted links
- Muted gray/white for supporting structure

Animation:
- Subtle pulse on the integration/runtime node
- Gentle signal travel from core to Pixi runtime and then outward to service nodes
- Small line tracing or path activation
- Very restrained motion
- No flashy effects, no heavy glow, no noisy looping

Below the intro area, create a structured system board for the PixiJS runtime.

Main lower board structure:
This section should have 3 content areas:

1. Built on PixiJS
2. Runtime services included
3. Architecture-first rendering

Panel 1:
Title:
Built on PixiJS

Statement:
Use PixiJS as a high-performance rendering layer while keeping your game logic inside the empr.es architecture.

Description:
Pixi objects are represented through framework-aware entities, allowing rendering, lifecycle and ECS/CD execution to work together without turning Pixi containers into the center of your application.

Optional chips:
High-performance 2D
Framework-aware entities
Scene graph integration
Architecture-first rendering

Panel 2:
Title:
Runtime services included

Statement:
@empr/es-lienzo provides a complete integration layer for real 2D games.

Design requirement:
Do not render this as a long plain bullet list.
Instead, present the runtime services as a clean service grid, grouped list, or compact systems board.

Services to include:
PixiEntity — connects entities with PixiJS containers
TreeBuilder — declarative scene and view construction
Asset loading — textures, spritesheets and Spine assets
SpineService — controlled Spine animation chains
TweenService / GSAP — timeline-based animations
InteractionService — pointer-driven execution
ResizerService — responsive layout and screen adaptation
PixiObjectPool — GC-friendly reuse of visual entities

Design suggestion for this panel:
- show each service as a compact chip/card/system item
- keep the panel structured and scannable
- avoid making it visually too tall
- can use 2-column or 4x2 mini-grid layout
- use subtle labels and compact descriptions

Panel 3:
Title:
Architecture-first rendering

Statement:
The renderer stays an integration layer, not the application architecture.

Description:
You can use PixiJS out of the box, while still keeping game flow, state, dependency injection, lifecycle and execution control inside empr.es.

Optional chips:
Game flow
State
Dependency Injection
Lifecycle
Execution Control

Design direction:
- This section should feel more concrete and productized than the previous architecture sections.
- It should communicate:
  renderer agnostic core,
  official PixiJS runtime,
  production-ready 2D integration.
- Keep the lower content structured and highly readable.
- Avoid generic feature cards.
- Make the runtime services panel feel like a toolkit or runtime services inventory.
- Make the whole section premium, technical and compact.

Suggested section rhythm:
Top:
left animated technical integration SVG
right-aligned intro

Bottom:
3-part Pixi runtime system board
- Built on PixiJS
- Runtime services included
- Architecture-first rendering

Important:
- Do not make PixiJS look like the architecture itself.
- The message must remain:
  PixiJS is the official rendering runtime,
  empr.es remains the architectural core.
- Do not introduce new colors.
- Do not add playful game illustrations.
- Do not make the services list too verbose or too tall.
- Keep the section aligned with the existing landing page style.

Desired result:
A premium product section that makes @empr/es-lienzo feel like the official PixiJS runtime layer for serious 2D browser games, while reinforcing that rendering remains an integration detail inside the empr.es architecture.