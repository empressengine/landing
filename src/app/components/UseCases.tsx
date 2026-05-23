import { motion } from "motion/react";

export function UseCases() {
  const useCases = [
    {
      title: "iGaming Slots",
      description: "Build slot games with explicit spin flows, reel logic, FSM-controlled game states, animation orchestration, server result handling and reusable feature systems.",
      greatFor: [
        "Spin / stop flows",
        "Reel and symbol logic",
        "Bonus rounds",
        "Win presentation",
        "Server-driven outcomes",
        "Replay and debug tooling"
      ]
    },
    {
      title: "2D Browser Games",
      description: "Use empr.es with the official PixiJS runtime to build scalable 2D games with structured logic, declarative views, animations, interactions and responsive layout.",
      greatFor: [
        "Casual games",
        "Arcade games",
        "Puzzle games",
        "UI-heavy games",
        "Mobile-first browser games"
      ]
    },
    {
      title: "Simulations and Deterministic Logic",
      description: "Run game-like logic in a controlled, renderer-independent environment.",
      greatFor: [
        "Deterministic simulations",
        "Server-side validation",
        "Automated tests",
        "Replay systems",
        "Procedural generation",
        "Internal balancing tools"
      ]
    },
    {
      title: "Game Tools and Editors",
      description: "Use the same architectural core to build tools around your game runtime.",
      greatFor: [
        "Debug panels",
        "Entity/component inspectors",
        "Cheat tools",
        "Visual editors",
        "Runtime configuration tools",
        "QA workflows"
      ]
    },
    {
      title: "Future 3D Projects",
      description: "empr.es core is renderer agnostic, so the same architecture can be extended beyond PixiJS-based 2D games.",
      greatFor: [
        "ThreeJS integrations",
        "3D browser games",
        "Interactive simulations",
        "Editor-driven 3D tools"
      ],
      future: true
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
        {/* Top: Left-aligned Intro + Right SVG */}
        <div className="mb-16 grid lg:grid-cols-[1fr_350px] gap-12 items-center">
          {/* Left: Intro Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
              Use Cases
            </h2>

            <p className="text-base text-white/80 leading-relaxed max-w-2xl">
              empr.es is designed for complex browser games and simulations where architecture, execution control and long-term maintainability matter.
            </p>

            <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
              It can be used as a full game architecture layer, a reusable runtime foundation, a server-side simulation core or a base for internal development tools.
            </p>
          </motion.div>

          {/* Right: Animated Use-Case Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative h-[320px]"
          >
            <svg className="w-full h-full" viewBox="0 0 350 320">
              {/* Background guide lines */}
              <line x1="0" y1="160" x2="350" y2="160" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <circle cx="175" cy="160" r="100" stroke="white" strokeOpacity="0.02" strokeWidth="1" fill="none" />

              {/* Central Core Node */}
              <motion.circle
                cx="175" cy="160"
                r="32"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                fill="none"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <circle cx="175" cy="160" r="20" stroke="white" strokeWidth="1" strokeOpacity="0.15" fill="none" />
              <circle cx="175" cy="160" r="10" fill="#E30049" fillOpacity="0.7" />

              {/* Branch paths to use cases */}
              {/* iGaming Slots - top left */}
              <motion.line
                x1="155" y1="140"
                x2="60" y2="60"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.circle
                cx="60" cy="60"
                r="8"
                fill="white"
                fillOpacity="0.4"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* 2D Browser Games - top right */}
              <motion.line
                x1="195" y1="140"
                x2="290" y2="60"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.4 }}
              />
              <motion.circle
                cx="290" cy="60"
                r="8"
                fill="#E30049"
                fillOpacity="0.6"
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />

              {/* Simulations - left */}
              <motion.line
                x1="143" y1="160"
                x2="40" y2="160"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }}
              />
              <circle cx="40" cy="160" r="8" fill="white" fillOpacity="0.4" />

              {/* Tools - right */}
              <motion.line
                x1="207" y1="160"
                x2="310" y2="160"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1.2 }}
              />
              <circle cx="310" cy="160" r="8" fill="white" fillOpacity="0.4" />

              {/* Future 3D - bottom center */}
              <motion.line
                x1="175" y1="192"
                x2="175" y2="280"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="4,4"
                animate={{ strokeDashoffset: [0, -8] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1.6 }}
              />
              <circle cx="175" cy="280" r="8" fill="white" fillOpacity="0.3" />

              {/* Signal pulses from core outward */}
              <motion.circle
                cx="175" cy="160"
                r="4"
                fill="#E30049"
                fillOpacity="0.9"
                animate={{
                  cx: [175, 290],
                  cy: [160, 60],
                  opacity: [0.9, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />
              <motion.circle
                cx="175" cy="160"
                r="4"
                fill="white"
                fillOpacity="0.8"
                animate={{
                  cx: [175, 60],
                  cy: [160, 60],
                  opacity: [0.8, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1.5 }}
              />
            </svg>
          </motion.div>
        </div>

        {/* Bottom: Use Case Board - 2 rows */}
        <div className="space-y-6">
          {/* First row: 3 cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {useCases.slice(0, 3).map((useCase, i) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              >
                <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-6 hover:border-white/20 transition-all duration-300">
                  <h3 className="text-lg text-white mb-3 tracking-tight font-medium">
                    {useCase.title}
                  </h3>

                  <p className="text-sm text-white/60 leading-relaxed mb-4">
                    {useCase.description}
                  </p>

                  <div className="pt-3 border-t border-white/10">
                    <div className="text-xs text-white/40 tracking-wider uppercase mb-2">Great for</div>
                    <div className="flex flex-wrap gap-2">
                      {useCase.greatFor.map((item) => (
                        <span
                          key={item}
                          className="inline-block px-2 py-1 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Second row: 2 wider cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.slice(3).map((useCase, i) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
              >
                <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-6 hover:border-white/20 transition-all duration-300">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-lg text-white tracking-tight font-medium">
                      {useCase.title}
                    </h3>
                    {useCase.future && (
                      <span className="flex-shrink-0 px-2 py-0.5 text-xs text-[#E30049]/80 border border-[#E30049]/20 bg-[#E30049]/10 rounded">
                        Future
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-white/60 leading-relaxed mb-4">
                    {useCase.description}
                  </p>

                  <div className="pt-3 border-t border-white/10">
                    <div className="text-xs text-white/40 tracking-wider uppercase mb-2">Great for</div>
                    <div className="flex flex-wrap gap-2">
                      {useCase.greatFor.map((item) => (
                        <span
                          key={item}
                          className="inline-block px-2 py-1 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
