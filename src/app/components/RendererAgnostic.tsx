import { motion } from "motion/react";

export function RendererAgnostic() {
  const coreRuntimeItems = [
    "Entities",
    "Components",
    "State",
    "FSM",
    "Signals",
    "DI",
    "Execution Contracts"
  ];

  const renderingTargets = [
    "PixiJS",
    "ThreeJS",
    "Custom Renderer",
    "Headless",
    "Browser",
    "Node.js",
    "Tests",
    "Tools"
  ];

  const panels = [
    {
      title: "Renderer Agnostic",
      statement: "Use empr.es with PixiJS, ThreeJS, a custom renderer or no renderer at all.",
      description: "The core does not know how your game is displayed. This keeps rendering replaceable and allows teams to evolve visual technology without rewriting game logic.",
      chips: ["PixiJS", "ThreeJS", "Custom Renderer", "Headless"]
    },
    {
      title: "Isomorphic by Design",
      statement: "Run the same core logic in browser, Node.js, tests, simulations or internal tools.",
      description: "This is useful for server-side validation, deterministic tests, replay systems, debug tooling and editor workflows where game logic should work without a visual runtime.",
      chips: ["Browser", "Node.js", "Tests", "Simulations", "Tools"]
    },
    {
      title: "Why it matters",
      statement: "Portable logic makes complex games easier to test, reuse and maintain.",
      description: "You can build rendering, tools and server-side systems around the same architectural core instead of duplicating game rules across different environments.",
      chips: ["Reusable Logic", "Validation", "Replay", "Editor Workflows"]
    }
  ];

  return (
    <section className="relative px-6 lg:px-12 py-24 border-t border-white/5">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto">
        {/* Centered Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center max-w-4xl mx-auto space-y-6"
        >
          <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
            Renderer Agnostic.<br />Runtime Independent.
          </h2>

          <p className="text-xl text-white/90 tracking-tight">
            Your game architecture should not be locked inside a renderer.
          </p>

          <p className="text-sm text-white/50 leading-relaxed max-w-3xl mx-auto">
            empr.es keeps core game logic separated from PixiJS, ThreeJS, DOM and browser-specific APIs.
            Entities, components, state, FSM, signals, dependency injection and execution contracts live in the core layer,
            while rendering stays an integration detail.
          </p>
        </motion.div>

        {/* Architecture Board */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12 max-w-4xl mx-auto"
        >
          <div className="border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg overflow-hidden">
            {/* Core Runtime Layer */}
            <div className="p-8 text-center border-b border-[#E30049]/20 bg-gradient-to-b from-[#E30049]/[0.03] to-transparent">
              <div className="text-xs text-[#E30049]/80 tracking-wider uppercase mb-4">Core Runtime</div>
              <div className="flex flex-wrap justify-center gap-3">
                {coreRuntimeItems.map((item) => (
                  <span
                    key={item}
                    className="inline-block px-3 py-1.5 text-sm text-white/80 border border-white/20 bg-black/40 rounded-md"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Adapter Layer */}
            <div className="p-6 text-center bg-black/40 border-b border-white/10">
              <div className="text-xs text-white/40 tracking-wider uppercase mb-4">Adapter Layer</div>
              <div className="flex flex-wrap justify-center gap-3">
                <span className="inline-block px-3 py-1.5 text-sm text-white/70 border border-white/15 bg-white/5 rounded-md">
                  @empr/es-lienzo
                </span>
                <span className="inline-block px-3 py-1.5 text-sm text-white/70 border border-white/15 bg-white/5 rounded-md">
                  @empr/es-talla
                </span>
                <span className="inline-block px-3 py-1.5 text-sm text-white/70 border border-white/15 bg-white/5 rounded-md">
                  your own implementation
                </span>
              </div>
            </div>

            {/* Rendering / Runtime Targets Layer */}
            <div className="p-8 text-center">
              <div className="text-xs text-white/40 tracking-wider uppercase mb-4">Rendering / Runtime Targets</div>
              <div className="flex flex-wrap justify-center gap-3">
                {renderingTargets.map((target) => (
                  <span
                    key={target}
                    className="inline-block px-3 py-1.5 text-sm text-white/60 border border-white/10 bg-white/5 rounded-md"
                  >
                    {target}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3-Panel System Board */}
        <div className="grid lg:grid-cols-3 gap-6">
          {panels.map((panel, i) => (
            <motion.div
              key={panel.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
            >
              <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-6 hover:border-white/20 transition-all duration-300">
                {/* Title */}
                <h3 className="text-lg text-white mb-3 tracking-tight font-medium">
                  {panel.title}
                </h3>

                {/* Statement */}
                <p className="text-sm text-white/80 mb-3 leading-relaxed">
                  {panel.statement}
                </p>

                {/* Description */}
                <p className="text-sm text-white/50 leading-relaxed mb-4">
                  {panel.description}
                </p>

                {/* Chips */}
                <div className="pt-3 border-t border-white/10">
                  <div className="flex flex-wrap gap-2">
                    {panel.chips.map((chip) => (
                      <span
                        key={chip}
                        className="inline-block px-2.5 py-1 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
