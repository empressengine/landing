import { motion } from "motion/react";

export function ArchitectureChoice() {
  const ecsBestFor = [
    "Complex game logic",
    "Simulations",
    "Slot mechanics",
    "Deterministic flows",
    "Replay and debug tooling",
    "Many entities and repeated behavior"
  ];

  const componentDrivenBestFor = [
    "Scene-driven games",
    "Unity, Cocos or PlayCanvas teams",
    "UI-heavy game screens",
    "Object-centric gameplay",
    "Visual hierarchy as structure"
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
        {/* Header - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center max-w-4xl mx-auto space-y-6"
        >
          <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
            Choose your architecture:<br />
            <span className="text-[#E30049]">ECS</span> or <span className="text-[#E30049]">Component Driven</span>
          </h2>

          <p className="text-lg text-white/70 tracking-tight">
            Every game team has its own way of thinking about architecture.
          </p>

          <p className="text-sm text-white/50 leading-relaxed max-w-2xl mx-auto">
            Some projects need strict data-oriented execution with systems, filters and explicit pipelines.
            Others are easier to model around scene-owned components and orchestrated object behavior.
            empr.es supports both approaches through separate execution stacks while keeping the same core runtime underneath.
          </p>
        </motion.div>

        {/* Shared Core Runtime Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative mb-16"
        >
          <div className="relative mx-auto max-w-xl">
            <div className="border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-sm rounded-lg p-6 text-center">
              <div className="text-xs text-[#E30049]/70 tracking-wider uppercase mb-3">Same Core Runtime</div>
              <div className="text-sm text-white/60 leading-relaxed">
                Entities · Components · DI · Store · FSM · Signals · Lifecycle
              </div>
            </div>

            {/* Connector lines - branching structure */}
            <svg className="absolute top-full left-1/2 -translate-x-1/2 w-[600px] h-16 pointer-events-none" viewBox="0 0 600 64">
              {/* Center vertical line */}
              <line x1="300" y1="0" x2="300" y2="32" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
              {/* Split to left */}
              <path d="M 300 32 Q 300 40, 150 48" stroke="#E30049" strokeOpacity="0.3" strokeWidth="1" fill="none" />
              {/* Split to right */}
              <path d="M 300 32 Q 300 40, 450 48" stroke="#E30049" strokeOpacity="0.3" strokeWidth="1" fill="none" />
            </svg>
          </div>
        </motion.div>

        {/* Architecture Cards */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* ECS Architecture */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="group"
          >
            <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-8 hover:border-white/20 transition-all duration-300">
              {/* Header */}
              <div className="mb-5 space-y-3">
                <h3 className="text-2xl text-white tracking-tight">ECS Architecture</h3>
                <div className="inline-block px-3 py-1.5 border border-white/10 bg-white/5 rounded-md">
                  <span className="text-xs text-white/40 tracking-wide">Systems · Filters · Pipelines</span>
                </div>
              </div>

              {/* Key Statement */}
              <p className="text-base text-white mb-4 leading-relaxed font-medium">
                Use ECS when you want maximum separation between data and behavior.
              </p>

              {/* Description */}
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                Components describe state. Entities compose components at runtime. Systems contain logic and
                process only the entities they care about. Execution is organized through explicit pipelines,
                making game logic predictable, reusable and easy to inspect.
              </p>

              {/* Best for tags */}
              <div className="space-y-3">
                <div className="text-xs text-white/40 tracking-wider uppercase">Best for</div>
                <div className="flex flex-wrap gap-2">
                  {ecsBestFor.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2.5 py-1.5 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Component Driven Architecture */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="group"
          >
            <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-8 hover:border-white/20 transition-all duration-300">
              {/* Header */}
              <div className="mb-5 space-y-3">
                <h3 className="text-2xl text-white tracking-tight">Component Driven Architecture</h3>
                <div className="inline-block px-3 py-1.5 border border-white/10 bg-white/5 rounded-md">
                  <span className="text-xs text-white/40 tracking-wide">Scene Components · Orchestrators · Services</span>
                </div>
              </div>

              {/* Key Statement */}
              <p className="text-base text-white mb-4 leading-relaxed font-medium">
                Use Component Driven architecture when your team prefers to think in terms of scenes, objects and attached components.
              </p>

              {/* Description */}
              <p className="text-sm text-white/60 leading-relaxed mb-6">
                Components belong to scene entities, but they do not hide Unity-style lifecycle logic inside themselves.
                Execution stays external and controlled by orchestrators and services, giving you a familiar object-oriented
                structure without losing architectural discipline.
              </p>

              {/* Best for tags */}
              <div className="space-y-3">
                <div className="text-xs text-white/40 tracking-wider uppercase">Best for</div>
                <div className="flex flex-wrap gap-2">
                  {componentDrivenBestFor.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2.5 py-1.5 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
                    >
                      {tag}
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
