import { motion } from "motion/react";

export function PixiJSRuntime() {
  const builtOnPixiChips = [
    "High-performance 2D",
    "Framework-aware entities",
    "Scene graph integration",
    "Architecture-first rendering"
  ];

  const runtimeServices = [
    { name: "PixiEntity", description: "Connects entities with PixiJS containers" },
    { name: "TreeBuilder", description: "Declarative scene and view construction" },
    { name: "Asset loading", description: "Textures, spritesheets and Spine assets" },
    { name: "SpineService", description: "Controlled Spine animation chains" },
    { name: "TweenService / GSAP", description: "Timeline-based animations" },
    { name: "InteractionService", description: "Pointer-driven execution" },
    { name: "ResizerService", description: "Responsive layout and screen adaptation" },
    { name: "PixiObjectPool", description: "GC-friendly reuse of visual entities" }
  ];

  const architectureChips = [
    "Game flow",
    "State",
    "Dependency Injection",
    "Lifecycle",
    "Execution Control"
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
        {/* Top: Animated SVG + Right-aligned Intro */}
        <div className="mb-16 grid lg:grid-cols-[350px_1fr] gap-12 items-center">
          {/* Left: Animated Integration Diagram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative h-[320px]"
          >
            <svg className="w-full h-full" viewBox="0 0 350 320">
              {/* Background guide lines */}
              <line x1="0" y1="80" x2="350" y2="80" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <line x1="0" y1="160" x2="350" y2="160" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <line x1="0" y1="240" x2="350" y2="240" stroke="white" strokeOpacity="0.03" strokeWidth="1" />

              {/* Core Runtime Node */}
              <circle cx="60" cy="160" r="32" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />
              <circle cx="60" cy="160" r="20" stroke="white" strokeWidth="1" strokeOpacity="0.15" fill="none" />
              <circle cx="60" cy="160" r="8" fill="white" fillOpacity="0.4" />
              <text x="60" y="220" textAnchor="middle" fontSize="9" fill="white" fillOpacity="0.4">
                Core Runtime
              </text>

              {/* Integration Bridge Path */}
              <motion.line
                x1="92" y1="160"
                x2="158" y2="160"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                strokeDasharray="4,2"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />

              {/* @empr/es-lienzo Node (Integration Layer) */}
              <motion.circle
                cx="175" cy="160"
                r="28"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                fill="none"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <circle cx="175" cy="160" r="10" fill="#E30049" fillOpacity="0.7" />
              <text x="175" y="210" textAnchor="middle" fontSize="8" fill="#E30049" fillOpacity="0.8">
                @empr/es-lienzo
              </text>

              {/* PixiJS Scene Graph Path */}
              <motion.line
                x1="203" y1="160"
                x2="252" y2="160"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.3 }}
              />

              {/* PixiJS Scene Graph Node */}
              <circle cx="270" cy="160" r="24" stroke="white" strokeWidth="1" strokeOpacity="0.3" fill="none" />
              <circle cx="270" cy="160" r="8" fill="white" fillOpacity="0.4" />
              <text x="270" y="200" textAnchor="middle" fontSize="9" fill="white" fillOpacity="0.5">
                PixiJS
              </text>

              {/* Service Nodes */}
              {/* Top service */}
              <motion.line
                x1="270" y1="136"
                x2="270" y2="90"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="2,2"
                animate={{ strokeDashoffset: [0, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.6 }}
              />
              <circle cx="270" cy="80" r="6" fill="white" fillOpacity="0.3" />

              {/* Middle-top service */}
              <motion.line
                x1="290" y1="145"
                x2="310" y2="120"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="2,2"
                animate={{ strokeDashoffset: [0, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
              />
              <circle cx="315" cy="115" r="6" fill="white" fillOpacity="0.3" />

              {/* Middle-bottom service */}
              <motion.line
                x1="290" y1="175"
                x2="310" y2="200"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="2,2"
                animate={{ strokeDashoffset: [0, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
              />
              <circle cx="315" cy="205" r="6" fill="white" fillOpacity="0.3" />

              {/* Bottom service */}
              <motion.line
                x1="270" y1="184"
                x2="270" y2="230"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="2,2"
                animate={{ strokeDashoffset: [0, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1.2 }}
              />
              <circle cx="270" cy="240" r="6" fill="white" fillOpacity="0.3" />

              {/* Signal pulses */}
              <motion.circle
                cx="92" cy="160"
                r="3"
                fill="#E30049"
                fillOpacity="0.9"
                animate={{
                  cx: [92, 158],
                  opacity: [0.9, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />
              <motion.circle
                cx="203" cy="160"
                r="3"
                fill="white"
                fillOpacity="0.8"
                animate={{
                  cx: [203, 252],
                  opacity: [0.8, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 1.2 }}
              />
            </svg>
          </motion.div>

          {/* Right: Intro Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6 lg:text-right"
          >
            <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
              Official <span className="text-[#E30049]">PixiJS</span> Runtime
            </h2>

            <p className="text-base text-white/80 leading-relaxed lg:ml-auto max-w-2xl">
              empr.es is renderer agnostic at its core, but it also comes with an official PixiJS runtime
              for building production-ready 2D browser games.
            </p>

            <p className="text-sm text-white/50 leading-relaxed lg:ml-auto max-w-2xl">
              @empr/es-lienzo bridges the architectural core of empr.es with the PixiJS scene graph.
              It connects entities to Pixi containers, provides declarative view construction, manages assets,
              drives animations through the game loop and keeps rendering lifecycle aligned with the framework.
            </p>
          </motion.div>
        </div>

        {/* Bottom: 3-Panel System Board */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Panel 1: Built on PixiJS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-6 hover:border-white/20 transition-all duration-300">
              <h3 className="text-lg text-white mb-3 tracking-tight font-medium">
                Built on PixiJS
              </h3>

              <p className="text-sm text-white/80 mb-3 leading-relaxed">
                Use PixiJS as a high-performance rendering layer while keeping your game logic inside the empr.es architecture.
              </p>

              <p className="text-sm text-white/50 leading-relaxed mb-4">
                Pixi objects are represented through framework-aware entities, allowing rendering, lifecycle and ECS/CD execution
                to work together without turning Pixi containers into the center of your application.
              </p>

              <div className="pt-3 border-t border-white/10">
                <div className="flex flex-wrap gap-2">
                  {builtOnPixiChips.map((chip) => (
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

          {/* Panel 2: Runtime services included */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-6 hover:border-white/20 transition-all duration-300">
              <h3 className="text-lg text-white mb-3 tracking-tight font-medium">
                Runtime services included
              </h3>

              <p className="text-sm text-white/80 mb-4 leading-relaxed">
                @empr/es-lienzo provides a complete integration layer for real 2D games.
              </p>

              {/* Services Grid */}
              <div className="space-y-2">
                {runtimeServices.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-start gap-2 p-2 border border-white/5 bg-black/20 rounded-md"
                  >
                    <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#E30049]/60 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/70 font-medium">{service.name}</div>
                      <div className="text-xs text-white/40 leading-relaxed">{service.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Panel 3: Architecture-first rendering */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-6 hover:border-white/20 transition-all duration-300">
              <h3 className="text-lg text-white mb-3 tracking-tight font-medium">
                Architecture-first rendering
              </h3>

              <p className="text-sm text-white/80 mb-3 leading-relaxed">
                The renderer stays an integration layer, not the application architecture.
              </p>

              <p className="text-sm text-white/50 leading-relaxed mb-4">
                You can use PixiJS out of the box, while still keeping game flow, state, dependency injection,
                lifecycle and execution control inside empr.es.
              </p>

              <div className="pt-3 border-t border-white/10">
                <div className="flex flex-wrap gap-2">
                  {architectureChips.map((chip) => (
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
        </div>
      </div>
    </section>
  );
}
