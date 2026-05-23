import { motion } from "motion/react";

export function Roadmap() {
  const roadmapTracks = [
    {
      title: "Renderer Evolution",
      description: "PixiJS V8 compatibility, ThreeJS runtime, renderer integration examples and reusable rendering abstraction patterns.",
      capabilities: [
        "PixiJS V8",
        "ThreeJS runtime",
        "Renderer examples",
        "Rendering abstractions"
      ]
    },
    {
      title: "Debugging and Observability",
      description: "Entity/component inspector, FSM viewer, pipeline debugger, signal tracing, runtime metrics and replay-oriented tooling.",
      capabilities: [
        "Entity inspector",
        "FSM viewer",
        "Pipeline debugger",
        "Signal tracing",
        "Runtime metrics",
        "Replay tooling"
      ]
    },
    {
      title: "Developer Experience",
      description: "Starter templates, example games, architecture recipes, migration guides, AI-agent-ready documentation and practical ECS/CD examples.",
      capabilities: [
        "Starter templates",
        "Example games",
        "Architecture recipes",
        "Migration guides",
        "AI-agent-ready docs",
        "ECS/CD examples"
      ]
    },
    {
      title: "Editor and Tooling",
      description: "Visual editor, debug panel, cheat tools, scene hierarchy inspection, component configuration and shared UI foundation.",
      capabilities: [
        "Visual editor",
        "Debug panel",
        "Cheat tools",
        "Scene hierarchy",
        "Component configuration",
        "Shared UI foundation"
      ]
    },
    {
      title: "Production Workflows",
      description: "Project structure recommendations, testing patterns, server-side validation, QA workflows and reusable iGaming/slot game patterns.",
      capabilities: [
        "Project structure",
        "Testing patterns",
        "Server-side validation",
        "QA workflows",
        "iGaming patterns"
      ]
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
            Roadmap
          </h2>

          <p className="text-xl text-white/80 tracking-tight">
            A modular ecosystem for building, debugging and scaling browser games.
          </p>

          <p className="text-sm text-white/50 leading-relaxed max-w-3xl mx-auto">
            empr.es is evolving into a modular ecosystem for building, debugging and scaling browser games.
          </p>
        </motion.div>

        {/* Roadmap Tracks - 3 cards + 2 wider cards */}
        <div className="space-y-6">
          {/* First row: 3 cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {roadmapTracks.slice(0, 3).map((track, i) => (
              <motion.div
                key={track.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              >
                <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-6 hover:border-white/20 transition-all duration-300">
                  {/* Track indicator */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-1 rounded-full bg-[#E30049]" />
                    <h3 className="text-lg text-white tracking-tight font-medium">
                      {track.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-white/50 leading-relaxed mb-4">
                    {track.description}
                  </p>

                  {/* Capability chips */}
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex flex-wrap gap-2">
                      {track.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="inline-block px-2 py-1 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
                        >
                          {capability}
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
            {roadmapTracks.slice(3).map((track, i) => (
              <motion.div
                key={track.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
              >
                <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-6 hover:border-white/20 transition-all duration-300">
                  {/* Track indicator */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-1 rounded-full bg-[#E30049]" />
                    <h3 className="text-lg text-white tracking-tight font-medium">
                      {track.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-white/50 leading-relaxed mb-4">
                    {track.description}
                  </p>

                  {/* Capability chips */}
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex flex-wrap gap-2">
                      {track.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="inline-block px-2 py-1 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
                        >
                          {capability}
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
