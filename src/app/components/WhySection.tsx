import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

const problemSolutionPairs = [
  {
    problem: "Logic turns into spaghetti",
    solution: "Separate data, behavior, execution and rendering"
  },
  {
    problem: "Renderer becomes the architecture",
    solution: "Keep the core renderer-agnostic and replaceable"
  },
  {
    problem: "Game flow becomes implicit",
    solution: "Control flows with FSM, signals and lifecycle ownership"
  },
  {
    problem: "One architecture does not fit every team",
    solution: "Choose ECS pipelines or Component Driven orchestrators"
  },
  {
    problem: "Runtime objects and listeners leak over time",
    solution: "Use object pooling and lifecycle tracking by design"
  },
  {
    problem: "Logic is duplicated across client and server",
    solution: "Run the same core in browser, server, tests and tools"
  }
];

export function WhySection() {
  return (
    <section className="relative px-6 lg:px-12 py-24">


      <div className="relative z-10 max-w-[1600px] mx-auto">
        {/* Header with visual accent */}
        <div className="mb-12 grid lg:grid-cols-[1fr_600px] gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
              Why empr<span className="text-[#E30049]">.</span>es?
            </h2>

            <div className="space-y-1">
              <h3 className="text-xl lg:text-2xl text-white tracking-tight">
                Rendering is only one part of a game.
              </h3>
              <h3 className="text-xl lg:text-2xl text-white tracking-tight">
                empr.es provides the <span className="text-[#E30049]">missing architectural layer</span>.
              </h3>
            </div>

            <p className="text-sm text-white/50 leading-relaxed max-w-2xl pt-2">
              As browser games grow, teams need more than a renderer. They need clear ownership of data and logic,
              explicit execution flow, safe lifecycle management, reusable services, predictable state and the freedom
              to run game logic outside the visual layer.
            </p>
          </motion.div>

          {/* Small animated technical graphic */}
          {/* <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative h-[240px]"
          > */}
            <svg className="w-full h-full" viewBox="0 0 360 240">
              {/* Background guide lines */}
              <line x1="0" y1="120" x2="360" y2="120" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <line x1="180" y1="0" x2="180" y2="240" stroke="white" strokeOpacity="0.03" strokeWidth="1" />

              {/* Fragmented nodes - left side (chaos) */}
              <motion.circle
                cx="40" cy="50"
                r="4"
                fill="white"
                fillOpacity="0.3"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.circle
                cx="70" cy="100"
                r="3"
                fill="white"
                fillOpacity="0.25"
                animate={{ opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              />
              <motion.circle
                cx="55" cy="140"
                r="3.5"
                fill="white"
                fillOpacity="0.3"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />
              <motion.circle
                cx="35" cy="190"
                r="3"
                fill="white"
                fillOpacity="0.2"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
              />

              {/* Additional fragmented nodes */}
              <circle cx="90" cy="75" r="2" fill="white" fillOpacity="0.15" />
              <circle cx="45" cy="165" r="2" fill="white" fillOpacity="0.15" />

              {/* Converging lines to center */}
              <motion.line
                x1="40" y1="50"
                x2="180" y2="120"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.line
                x1="70" y1="100"
                x2="180" y2="120"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              />
              <motion.line
                x1="55" y1="140"
                x2="180" y2="120"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />
              <motion.line
                x1="35" y1="190"
                x2="180" y2="120"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
              />

              {/* Central node (structured core) */}
              <motion.circle
                cx="180" cy="120"
                r="28"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.5"
                fill="none"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <circle
                cx="180" cy="120"
                r="16"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.15"
                fill="none"
              />
              <circle
                cx="180" cy="120"
                r="7"
                fill="#E30049"
                fillOpacity="0.7"
              />

              {/* Orbital ring */}
              <motion.circle
                cx="180" cy="120"
                r="40"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.1"
                strokeDasharray="4,8"
                fill="none"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: "180px 120px" }}
              />

              {/* Structured output lines - right side */}
              <motion.line
                x1="208" y1="120"
                x2="300" y2="60"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <motion.line
                x1="208" y1="120"
                x2="310" y2="100"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
              />
              <motion.line
                x1="208" y1="120"
                x2="310" y2="140"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.4 }}
              />
              <motion.line
                x1="208" y1="120"
                x2="300" y2="180"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.6 }}
              />

              {/* Structured output nodes */}
              <circle cx="300" cy="60" r="3" fill="white" fillOpacity="0.5" />
              <circle cx="310" cy="100" r="3" fill="white" fillOpacity="0.5" />
              <circle cx="310" cy="140" r="3" fill="white" fillOpacity="0.5" />
              <circle cx="300" cy="180" r="3" fill="white" fillOpacity="0.5" />

              {/* Terminal endpoint indicators */}
              <circle cx="300" cy="60" r="8" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />
              <circle cx="310" cy="100" r="8" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />
              <circle cx="310" cy="140" r="8" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />
              <circle cx="300" cy="180" r="8" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />

              {/* Signal pulses traveling along output lines */}
              <motion.circle
                cx="208" cy="120"
                r="2"
                fill="#E30049"
                fillOpacity="0.8"
                animate={{
                  cx: [208, 300],
                  cy: [120, 60],
                  opacity: [0.8, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.circle
                cx="208" cy="120"
                r="2"
                fill="#E30049"
                fillOpacity="0.8"
                animate={{
                  cx: [208, 310],
                  cy: [120, 140],
                  opacity: [0.8, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />
            </svg>
          {/* </motion.div> */}
        </div>

        {/* Unified Comparison Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg overflow-hidden"
        >
          {/* Column Headers */}
          <div className="grid grid-cols-2 gap-px bg-white/5">
            <div className="px-6 py-3 bg-black">
              <span className="text-xs text-white/40 tracking-wider uppercase">Problem</span>
            </div>
            <div className="px-6 py-3 bg-black">
              <span className="text-xs text-[#E30049]/80 tracking-wider uppercase">empr.es Response</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10" />

          {/* Comparison Rows */}
          <div className="divide-y divide-white/5">
            {problemSolutionPairs.map((pair, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                className="grid grid-cols-2 gap-px bg-white/5 group hover:bg-white/10 transition-colors duration-300"
              >
                {/* Problem */}
                <div className="px-6 py-4 bg-black">
                  <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/50 transition-colors">
                    {pair.problem}
                  </p>
                </div>

                {/* Solution */}
                <div className="px-6 py-4 bg-black">
                  <p className="text-sm text-white/80 leading-relaxed group-hover:text-white transition-colors">
                    {pair.solution}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
