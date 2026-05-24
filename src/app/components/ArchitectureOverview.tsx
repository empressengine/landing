import { motion } from "motion/react";
import {
  Box,
  Database,
  Syringe,
  GitBranch,
  Store,
  RefreshCw,
  Layers,
  Activity,
  ArrowRight
} from "lucide-react";

const architectureBlocks = [
  {
    icon: Box,
    title: "Entity / Component Model",
    description: "Compose runtime objects from small, focused data components."
  },
  {
    icon: Database,
    title: "Entity Storage",
    description: "Store, query and manage entities through indexed component-based filters."
  },
  {
    icon: Syringe,
    title: "Dependency Injection",
    description: "Register services, factories and tokens globally or per execution context."
  },
  {
    icon: GitBranch,
    title: "FSM & Signals",
    description: "Control game flow with explicit states and typed event-driven execution."
  },
  {
    icon: Store,
    title: "Reactive Store",
    description: "Manage application state with typed updates, subscriptions and computed values."
  },
  {
    icon: RefreshCw,
    title: "Update Loop",
    description: "Drive game logic through an external ticker and keep the core platform-agnostic."
  },
  {
    icon: Layers,
    title: "Object Pooling",
    description: "Reuse short-lived objects and reduce runtime allocation pressure."
  },
  {
    icon: Activity,
    title: "Lifecycle Tracking",
    description: "Automatically dispose subscriptions and prevent dangling listeners."
  }
];

export function ArchitectureOverview() {
  return (
    <section className="relative px-6 lg:px-12 py-32">
      {/* Section header */}
      <div className="max-w-[1600px] mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto space-y-6"
        >
          <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
            What is empr<span className="text-[#E30049]">.</span>es?
          </h2>
          <p className="text-2xl text-white/90">
            The architectural core of your game.
          </p>
          <p className="text-base text-white/60 leading-relaxed max-w-3xl mx-auto">
            empr.es separates game data, logic, execution flow and rendering into independent layers,
            giving teams a predictable foundation for complex browser games. Use it as a standalone game-logic runtime,
            pair it with the official PixiJS integration, or extend it with your own renderer and execution model.
          </p>
        </motion.div>
      </div>

      {/* Architecture flow strip */}
      <div className="max-w-[1600px] mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="flex items-center justify-center gap-4 py-8 px-4 border border-white/10 bg-gradient-to-r from-white/[0.02] via-white/[0.04] to-white/[0.02] backdrop-blur-sm rounded-lg sm:px-6">
            <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
              <div className="w-full max-w-60 px-4 py-3 text-center border border-white/20 bg-black/40 rounded-md sm:w-auto sm:max-w-none sm:px-6">
                <span className="text-sm text-white tracking-wide">Core Runtime</span>
              </div>
              <ArrowRight className="h-5 w-5 rotate-90 text-[#E30049] sm:rotate-0" />
              <div className="w-full max-w-60 px-4 py-3 text-center border border-white/20 bg-black/40 rounded-md sm:w-auto sm:max-w-none sm:px-6">
                <span className="text-sm text-white tracking-wide">Execution Stack</span>
              </div>
              <ArrowRight className="h-5 w-5 rotate-90 text-[#E30049] sm:rotate-0" />
              <div className="w-full max-w-60 px-4 py-3 text-center border border-white/20 bg-black/40 rounded-md sm:w-auto sm:max-w-none sm:px-6">
                <span className="text-sm text-white tracking-wide">Renderer Integration</span>
              </div>
            </div>
          </div>

          {/* Supporting text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/50 leading-relaxed max-w-4xl mx-auto">
              Entities, components, storage, dependency injection, reactive state, FSM, signals, lifecycle tracking
              and object pooling — without depending on PixiJS, ThreeJS, DOM or any rendering library.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Architecture grid */}
      <div className="max-w-[1600px] mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {architectureBlocks.map((block, i) => (
            <motion.div
              key={block.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
              className="group relative"
            >
              <div className="relative h-full p-6 border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm rounded-lg hover:border-[#E30049]/30 hover:bg-white/[0.07] transition-all duration-300">
                {/* Icon */}
                <div className="mb-4 w-12 h-12 rounded-lg bg-[#E30049]/10 border border-[#E30049]/20 flex items-center justify-center group-hover:bg-[#E30049]/20 group-hover:border-[#E30049]/40 transition-all duration-300">
                  <block.icon className="w-6 h-6 text-[#E30049]" />
                </div>

                {/* Content */}
                <h3 className="text-lg text-white mb-2 tracking-tight">
                  {block.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {block.description}
                </p>

                {/* Hover accent */}
                <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-[#E30049]/0 group-hover:border-[#E30049]/20 rounded-tr-lg transition-all duration-300" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom grid pattern */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
