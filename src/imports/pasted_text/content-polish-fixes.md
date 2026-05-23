Apply only the following final polish and behavior fixes.

Do not redesign the page.
Do not change section layouts, typography, SVG animations, cards, content structure or global style unless explicitly requested below.
This is a focused interaction and small content polish pass.

-----------------------------------
FIX 1 — Secondary CTA hover state
-----------------------------------

Current issue:
Secondary buttons such as “Explore Architecture” and “Explore Documentation” become hard to read on hover because the text turns too dark.

Required change:
For all secondary CTA buttons:
- Explore Architecture
- Explore Documentation
- any other secondary outline CTA using the same style

On hover:
- keep the text white
- change the border to the existing brand magenta/pink
- optionally add a very subtle magenta-tinted background
- do not use black or dark text on hover
- keep contrast high and readable
- keep the interaction premium and restrained

Important:
- Do not make the hover state brighter than the primary Request Access button.
- Do not introduce new colors.
- Use the existing brand magenta already used across the site.

-----------------------------------
FIX 2 — Documentation CTA links
-----------------------------------

All documentation / architecture secondary CTAs should link to:

https://empr.es/docs/index.html

Apply this URL to:
- Header “Explore Architecture”
- Hero “Explore Architecture”
- Final CTA “Explore Documentation”
- Any repeated secondary CTA with documentation / architecture intent

Use semantic anchor links where possible:
<a href="https://empr.es/docs/index.html">Explore Architecture</a>

-----------------------------------
FIX 3 — Request Access behavior
-----------------------------------

Change the behavior of all “Request Access” buttons across the page.

New behavior:
All “Request Access” buttons should scroll to the final section:
“Start building with empr.es”

Do not open mailto directly from Request Access buttons anymore.

Implementation requirements:
- Add an id to the final section, for example:
  id="start-building"
- Make every Request Access button link to:
  #start-building
- Use smooth scrolling if the project already supports it or if simple CSS/React implementation is available.
- Keep button visual styling unchanged.

Affected buttons:
- Header Request Access
- Hero Request Access
- Any other Request Access button before the final section

Important:
- Do not open email client from Request Access buttons.
- Do not show a modal.
- Do not add a form.
- Just scroll to the final “Start building with empr.es” section.

-----------------------------------
FIX 4 — Final CTA section content
-----------------------------------

In the final “Start building with empr.es” section, update the “Ready to build?” panel.

Current issue:
There is still a Request Access button inside the final CTA panel, but Request Access buttons now scroll to this section. Keeping the same button here creates a loop.

Required changes:
- Remove the “Request Access” button from the final “Ready to build?” panel.
- Keep the “Explore Documentation” button.
- Add a clear contact line with the email address.

Suggested copy:
Contact us at info@empr.es to request access or discuss your project.

Alternative if it fits better visually:
To request access, contact us at info@empr.es and tell us about your project.

Make the email address visually clear and clickable:
mailto:info@empr.es?subject=Request%20access%20for%20empr.es

The email link should:
- open the default email client
- recipient: info@empr.es
- subject: Request access for empr.es

Visual treatment:
- The contact line should feel intentional, not like a random paragraph.
- It can be a compact highlighted line, small contact row, or subtle bordered inline element.
- Keep it premium and minimal.
- Do not add a full contact form.

Final panel should contain:
Title:
Ready to build?

Description:
Tell us about your project, your team and your technical goals — and we will help you understand how empr.es can fit into your development process.

Contact line:
Contact us at info@empr.es to request access or discuss your project.

Button:
Explore Documentation

Button link:
https://empr.es/docs/index.html

-----------------------------------
FIX 5 — Renderer Agnostic architecture board: Adapter Layer
-----------------------------------

In the “Renderer Agnostic. Runtime Independent.” section, update the architecture board.

Current board structure:
Core Runtime
Adapter Layer
Rendering / Runtime Targets

Required changes:
1. Add pills inside the Adapter Layer:
- @empr/es-lienzo
- @empr/es-talla
- your own implementation

2. Add a bottom divider line below the Adapter Layer.
- The Adapter Layer should be visually separated from both:
  Core Runtime above
  Rendering / Runtime Targets below

3. Keep the existing top divider between Core Runtime and Adapter Layer.
4. Keep the “Adapter Layer” label.
5. Keep the overall board layout and content unchanged.

Desired structure:
Core Runtime
[ Entities ] [ Components ] [ State ] [ FSM ] [ Signals ] [ DI ] [ Execution Contracts ]

divider

Adapter Layer
[ @empr/es-lienzo ] [ @empr/es-talla ] [ your own implementation ]

divider

Rendering / Runtime Targets
[ PixiJS ] [ ThreeJS ] [ Custom Renderer ] [ Headless ] [ Browser ] [ Node.js ] [ Tests ] [ Tools ]

Visual requirements:
- Adapter Layer pills should match the existing chip style.
- Use subtle magenta only if needed for emphasis.
- Do not make the adapter layer too tall.
- Do not redesign the whole architecture board.
- Keep it clean and readable.

-----------------------------------
GENERAL REQUIREMENTS
-----------------------------------

- Preserve the current landing page design.
- Preserve all existing sections.
- Preserve SVG animations.
- Preserve spacing unless required for the Adapter Layer update.
- Do not introduce new colors.
- Do not add new navigation items.
- Do not add a contact form or modal.
- Keep the final section clean and conversion-focused.

Desired result:
- Secondary CTA hover states are readable with white text.
- Documentation CTAs open the docs URL.
- Request Access buttons smoothly scroll to the final Start building section.
- Final section provides a clear clickable email contact instead of another Request Access button.
- Adapter Layer clearly shows @empr/es-lienzo, @empr/es-talla and custom implementations between the core and runtime targets.