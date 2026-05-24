import { motion } from "motion/react";

export function DocsTransparency() {
  const documentationAreas = [
    {
      title: "Clear Core Concepts",
      description: "The documentation explains the main building blocks of the framework: entities, components, storage, dependency injection, store, FSM, signals, update loop, lifecycle tracking and object pooling.",
      supportLine: "Each concept has a clear responsibility and a defined place in the architecture.",
      chips: ["Entities", "Components", "Storage", "DI", "Store", "FSM", "Signals", "Update Loop", "Lifecycle", "Pooling"]
    },
    {
      title: "Explicit Package Boundaries",
      description: "empr.es is split into focused packages with strict responsibilities.",
      supportLine: "The core package stays renderer-agnostic. Execution stacks live in separate packages. PixiJS integration is provided through the official runtime. Tooling and future editor modules are built around the same architecture instead of being mixed into the core.",
      chips: ["Renderer-agnostic core", "Separate execution stacks", "Official PixiJS runtime", "Tooling around the core"]
    },
    {
      title: "Practical Examples",
      description: "Documentation includes examples for both ECS and Component Driven usage.",
      supportLine: "Teams can see how to bootstrap the framework, choose an execution stack, wire runtime services, define game flows and integrate rendering without guessing how the pieces fit together.",
      chips: ["ECS examples", "Component Driven examples", "Bootstrapping", "Runtime services", "Game flows", "Rendering integration"]
    },
    {
      title: "Designed to be Inspectable",
      description: "empr.es favors explicit architecture over hidden magic.",
      supportLine: "Execution flows, lifecycle ownership, dependency registration and state transitions are designed to be visible, traceable and understandable — which makes the framework easier to debug, onboard and maintain over time.",
      chips: ["Visible execution flows", "Lifecycle ownership", "Dependency registration", "State transitions", "Debuggable", "Maintainable"]
    }
  ];

  return (
    <section className="relative px-6 lg:px-12 py-24">
      <div className="relative z-10 max-w-[1600px] mx-auto">
        {/* Top: Animated SVG + Right-aligned Intro */}
        <div className="mb-16 grid lg:grid-cols-[850px_1fr] gap-48 items-center">
          {/* Right: Intro Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
              Documentation and<br />Architecture Transparency
            </h2>

            <p className="text-base text-white/80 leading-relaxed lg:ml-auto">
              A framework is only useful if teams can understand it, trust it and evolve it safely.
            </p>

            <p className="text-sm text-white/50 leading-relaxed lg:ml-auto">
              empr.es is documented not only as an API, but as an architecture. Core concepts, package boundaries,
              execution models, lifecycle rules and integration layers are described explicitly so teams can reason
              about how the framework works under the hood.
            </p>
          </motion.div>
          {/* Left: Animated Architecture Transparency Diagram */}
            <svg className="w-full h-full" viewBox="0 0 340 320">
              {/* Background guide lines */}
              <line x1="0" y1="80" x2="340" y2="80" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <line x1="0" y1="160" x2="340" y2="160" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <line x1="0" y1="240" x2="340" y2="240" stroke="white" strokeOpacity="0.03" strokeWidth="1" />

              {/* Layer 1: Core Concepts */}
              <rect x="40" y="50" width="120" height="60" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" rx="4" />
              <text x="100" y="40" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.4">
                Core Concepts
              </text>
              <circle cx="70" cy="80" r="6" fill="white" fillOpacity="0.3" />
              <circle cx="100" cy="80" r="6" fill="white" fillOpacity="0.3" />
              <circle cx="130" cy="80" r="6" fill="white" fillOpacity="0.3" />

              {/* Layer 2: Package Boundaries */}
              <rect x="180" y="50" width="120" height="60" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" rx="4" />
              <text x="240" y="40" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.4">
                Package Boundaries
              </text>
              <rect x="195" y="65" width="30" height="30" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" fill="white" fillOpacity="0.05" rx="2" />
              <rect x="235" y="65" width="30" height="30" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" fill="white" fillOpacity="0.05" rx="2" />
              <rect x="275" y="65" width="15" height="30" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" fill="white" fillOpacity="0.05" rx="2" />

              {/* Layer 3: Execution Models */}
              <rect x="40" y="130" width="120" height="60" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" rx="4" />
              <text x="100" y="120" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.4">
                Execution Models
              </text>
              <circle cx="70" cy="160" r="6" fill="white" fillOpacity="0.3" />
              <circle cx="100" cy="160" r="6" fill="white" fillOpacity="0.3" />
              <circle cx="130" cy="160" r="6" fill="white" fillOpacity="0.3" />

              {/* Layer 4: Integration Layers */}
              <rect x="180" y="130" width="120" height="60" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" rx="4" />
              <text x="240" y="120" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.4">
                Integration Layers
              </text>
              <circle cx="210" cy="160" r="6" fill="white" fillOpacity="0.3" />
              <circle cx="240" cy="160" r="6" fill="white" fillOpacity="0.3" />
              <circle cx="270" cy="160" r="6" fill="white" fillOpacity="0.3" />

              {/* Active trace path */}
              <motion.line
                x1="70" y1="80"
                x2="195" y2="80"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                strokeDasharray="4,2"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />

              <motion.line
                x1="240" y1="110"
                x2="240" y2="130"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                strokeDasharray="4,2"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.3 }}
              />

              <motion.line
                x1="160" y1="160"
                x2="180" y2="160"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                strokeDasharray="4,2"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.6 }}
              />

              {/* Active nodes */}
              <motion.circle
                cx="70" cy="80"
                r="8"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.6"
                fill="none"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.circle
                cx="240" cy="160"
                r="8"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.6"
                fill="none"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />

              {/* Trace signal pulses */}
              <motion.circle
                cx="70" cy="80"
                r="3"
                fill="#E30049"
                fillOpacity="0.9"
                animate={{
                  cx: [70, 195],
                  opacity: [0.9, 0]
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />

              <motion.circle
                cx="240" cy="110"
                r="3"
                fill="#E30049"
                fillOpacity="0.9"
                animate={{
                  cy: [110, 130],
                  opacity: [0.9, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 1.3 }}
              />

              {/* Bottom observability indicator */}
              <rect x="80" y="230" width="180" height="40" stroke="white" strokeWidth="1" strokeOpacity="0.15" fill="white" fillOpacity="0.02" rx="4" />
              <text x="170" y="245" textAnchor="middle" fontSize="7" fill="white" fillOpacity="0.4">
                INSPECTABLE ARCHITECTURE
              </text>
              <motion.rect
                x="90" y="255"
                width="0"
                height="6"
                fill="#E30049"
                fillOpacity="0.6"
                animate={{ width: [0, 160, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>

          
        </div>

        {/* Bottom: 4-Part Documentation Board (2x2) */}
        <div className="grid md:grid-cols-2 gap-6">
          {documentationAreas.map((area, i) => (
            <motion.div
              key={area.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
            >
              <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-6 hover:border-white/20 transition-all duration-300">
                {/* Title */}
                <h3 className="text-lg text-white mb-3 tracking-tight font-medium">
                  {area.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-white/60 leading-relaxed mb-3">
                  {area.description}
                </p>

                {/* Support Line */}
                <p className="text-xs text-white/50 leading-relaxed mb-4">
                  {area.supportLine}
                </p>

                {/* Chips */}
                <div className="pt-3 border-t border-white/10">
                  <div className="flex flex-wrap gap-2">
                    {area.chips.map((chip) => (
                      <span
                        key={chip}
                        className="inline-block px-2 py-1 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
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
