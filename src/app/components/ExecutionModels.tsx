import { motion } from "motion/react";
import { ArrowDown, ChevronRight } from "lucide-react";

export function ExecutionModels() {
  const pipelinesUseCases = [
    "Game loops",
    "Slot spin and stop flows",
    "Loading sequences",
    "State transitions",
    "Animation chains",
    "Server-side simulations",
    "Deterministic replay and debug tooling"
  ];

  const orchestratorsUseCases = [
    "Scene-driven game screens",
    "Object-centric gameplay",
    "UI-heavy flows",
    "Unity, Cocos or PlayCanvas-style teams",
    "Visual hierarchy as structure"
  ];

  const pipelineSteps = [
    "Start Spin",
    "Lock Input",
    "Prepare Reels",
    "Run Spin Logic",
    "Stop Reels",
    "Evaluate Result",
    "Unlock Input"
  ];

  const orchestratorSteps = [
    "Scene Root",
    "Find Relevant Components",
    "Resolve Orchestrator",
    "Execute Controlled Behavior"
  ];

  return (
    <section className="relative px-6 lg:px-12 py-24">
      <div className="relative z-10 max-w-[1600px] mx-auto">
        {/* Header - Split Layout (mirrors WhySection composition, SVG on the right) */}
        <div className="mb-8 flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          {/* Left: Intro Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full space-y-6 lg:max-w-2xl"
          >
            <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
              Pipelines vs Orchestrators
            </h2>

            <p className="text-xl text-white/90 tracking-tight">
              Architecture defines how you structure your game. Execution defines how your game actually runs.
            </p>

            <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
              empr.es provides two execution models for two different ways of thinking about game logic:
              Pipelines for ECS projects and Orchestrators for Component Driven projects.
            </p>

            <h4 className="text-xl text-white tracking-tight">
              Same core, <span className="text-[#E30049]">different execution strategy</span>.
            </h4>

            <p className="text-sm text-white/50 leading-relaxed max-w-2xl mx-auto">
              Both models work with the same empr.es foundation: entities · components · dependency injection · FSM · signals · lifecycle tracking · renderer-independent logic.
            </p>

            
          </motion.div>

          {/* Right: Animated Technical SVG — 2× footprint, same stroke weights as before */}
          {/* <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden h-[640px] w-full max-w-[720px] shrink-0 lg:block"
          > */}
            <div className="relative hidden h-[640px] w-full max-w-[720px] shrink-0 lg:landscape:block">
            <svg className="h-full w-full" viewBox="60 112 480 328">
              {/* Background guide grid */}
              <line x1="0" y1="140" x2="600" y2="140" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <line x1="0" y1="280" x2="600" y2="280" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <line x1="0" y1="420" x2="600" y2="420" stroke="white" strokeOpacity="0.03" strokeWidth="1" />

              {/* Input node */}
              <circle cx="133" cy="280" r="6" fill="#E30049" fillOpacity="0.6" />
              <circle cx="133" cy="280" r="16" stroke="#E30049" strokeWidth="1" strokeOpacity="0.3" fill="none" />

              {/* Branching paths */}
              <motion.path
                d="M 132 280 L 240 140"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <motion.path
                d="M 132 280 L 240 280"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
              />
              <motion.path
                d="M 132 280 L 240 420"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
              />

              {/* Flow nodes */}
              <motion.circle
                cx="240"
                cy="140"
                r="4"
                fill="white"
                fillOpacity="0.4"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.circle
                cx="240"
                cy="280"
                r="4"
                fill="white"
                fillOpacity="0.4"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              />
              <motion.circle
                cx="240"
                cy="420"
                r="4"
                fill="white"
                fillOpacity="0.4"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />

              {/* Convergence paths */}
              <motion.path
                d="M 272 140 L 500 280"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
              />
              <motion.path
                d="M 272 280 L 500 280"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
              />
              <motion.path
                d="M 272 420 L 500 280"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 1.2, ease: "easeOut" }}
              />

              {/* Output node */}
              <motion.circle
                cx="500"
                cy="280"
                r="8"
                fill="#E30049"
                fillOpacity="0.7"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              />
              <circle cx="500" cy="280" r="18" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />

              {/* Signal pulses */}
              <motion.circle
                cx="133"
                cy="280"
                r="3"
                fill="#E30049"
                fillOpacity="0.8"
                animate={{
                  cx: [133, 240, 500],
                  cy: [280, 140, 280],
                  opacity: [0.8, 0.6, 0]
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 2 }}
              />
              <motion.circle
                cx="133"
                cy="280"
                r="3"
                fill="#E30049"
                fillOpacity="0.8"
                animate={{
                  cx: [133, 240, 500],
                  cy: [280, 280, 280],
                  opacity: [0.8, 0.6, 0]
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 2.8 }}
              />
            </svg>
            </div>
          {/* </motion.div> */}
        </div>

        {/* Execution Panels */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Pipelines Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-8">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="text-2xl text-white tracking-tight shrink-0">Pipelines</h3>
                <div className="shrink-0 px-3 py-1.5 border border-[#E30049]/20 bg-[#E30049]/10 rounded-md">
                  <span className="text-xs text-[#E30049]/80 tracking-wide whitespace-nowrap">ECS execution model</span>
                </div>
              </div>

              {/* Statement */}
              <p className="text-base text-white mb-4 leading-relaxed font-medium">
                Explicit execution flows composed from small, focused systems.
              </p>

              {/* Description */}
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Each system performs one piece of logic: update positions, resolve input, start animations, validate state,
                spawn entities, clean up temporary data or dispatch the next signal. A pipeline defines the order in which
                these systems run and the context they receive.
              </p>

              <p className="text-sm text-white/80 mb-6 leading-relaxed">
                Execution becomes visible, reusable and easy to reason about.
              </p>

              {/* Execution Flow */}
              {/* <div className="mb-6 p-6 border border-white/10 bg-black/40 rounded-lg">
                <div className="text-xs text-white/40 tracking-wider uppercase mb-4">Example flow</div>
                <div className="space-y-2">
                  {pipelineSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#E30049]" />
                      <ChevronRight className="w-3 h-3 text-[#E30049]/60 flex-shrink-0" />
                      <span className="text-sm text-white/70">{step}</span>
                    </motion.div>
                  ))}
                </div>
              </div> */}

              {/* Use cases */}
              <div className="space-y-3">
                <div className="text-xs text-white/40 tracking-wider uppercase">Especially useful for</div>
                <div className="flex flex-wrap gap-2">
                  {pipelinesUseCases.map((useCase) => (
                    <span
                      key={useCase}
                      className="inline-block px-2.5 py-1.5 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Orchestrators Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-8">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="text-2xl text-white tracking-tight shrink-0">Orchestrators</h3>
                <div className="shrink-0 px-3 py-1.5 border border-[#E30049]/20 bg-[#E30049]/10 rounded-md">
                  <span className="text-xs text-[#E30049]/80 tracking-wide whitespace-nowrap">Component Driven execution model</span>
                </div>
              </div>

              {/* Statement */}
              <p className="text-base text-white mb-4 leading-relaxed font-medium">
                External coordinators for scene-owned components.
              </p>

              {/* Description */}
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                In Component Driven projects, scene-owned components describe object structure and state, but they do not
                hide behavior inside implicit lifecycle methods. Orchestrators and services decide what should run, when it
                should run and which components should participate.
              </p>

              <p className="text-sm text-white/80 mb-6 leading-relaxed">
                You keep a scene-oriented mental model while preserving explicit execution control.
              </p>

              {/* Execution Flow */}
              {/* <div className="mb-6 p-6 border border-white/10 bg-black/40 rounded-lg">
                <div className="text-xs text-white/40 tracking-wider uppercase mb-4">Example flow</div>
                <div className="space-y-2">
                  {orchestratorSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#E30049]" />
                      <ChevronRight className="w-3 h-3 text-[#E30049]/60 flex-shrink-0" />
                      <span className="text-sm text-white/70">{step}</span>
                    </motion.div>
                  ))}
                </div>
              </div> */}

              {/* Use cases */}
              <div className="space-y-3">
                <div className="text-xs text-white/40 tracking-wider uppercase">Especially useful for</div>
                <div className="flex flex-wrap gap-2">
                  {orchestratorsUseCases.map((useCase) => (
                    <span
                      key={useCase}
                      className="inline-block px-2.5 py-1.5 text-xs text-white/60 border border-white/10 bg-white/5 rounded-md"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Shared Foundation */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg overflow-hidden"
        >
          <div className="p-8 text-center space-y-6">
            <h4 className="text-xl text-white tracking-tight">
              Same core, <span className="text-[#E30049]">different execution strategy</span>.
            </h4>

            <p className="text-sm text-white/50 leading-relaxed max-w-2xl mx-auto">
              Both models work with the same empr.es foundation: entities · components · dependency injection · FSM · signals · lifecycle tracking · renderer-independent logic.
            </p>
          </div>

          <div className="h-px bg-white/10" />

          <div className="grid md:grid-cols-2 gap-px bg-white/5">
            <div className="p-6 bg-black space-y-2">
              <h5 className="text-base text-white font-medium tracking-tight">
                Choose Pipelines
              </h5>
              <p className="text-sm text-white/60 leading-relaxed">
                When your game is best expressed as ordered data-driven systems.
              </p>
            </div>

            <div className="p-6 bg-black space-y-2">
              <h5 className="text-base text-white font-medium tracking-tight">
                Choose Orchestrators
              </h5>
              <p className="text-sm text-white/60 leading-relaxed">
                When your game is best expressed as scene-owned components coordinated by external runtime logic.
              </p>
            </div>
          </div>
        </motion.div> */}
      </div>
    </section>
  );
}
