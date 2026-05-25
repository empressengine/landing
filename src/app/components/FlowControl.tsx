import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function FlowControl() {
  const controlPanels = [
    {
      title: "FSM",
      statement: "Describe high-level game flow as explicit states and transitions.",
      description: "Use FSM to control loading, scene initialization, idle state, spin flow, stopping, win presentation, bonus rounds and transitions.",
      flow: ["Loading", "Init Scene", "Idle", "Spin", "Stop", "Present Win", "Idle"]
    },
    {
      title: "Typed Signals",
      statement: "Use typed signals as an event bridge between independent parts of the game.",
      description: "React to user input, animation events, server responses, state changes or internal game events without tightly coupling sender and receiver.",
      flow: ["SpinRequested", "ReelsStarted", "ResultReceived", "WinPresentationCompleted"]
    },
    {
      title: "Lifecycle Control",
      statement: "Keep runtime ownership explicit.",
      description: "Track subscriptions, dispose listeners, release pooled objects and attach execution to states, signals, update ticks or interactions in a controlled way.",
      flow: null
    },
    {
      title: "Controlled by Architecture",
      statement: "Game flow stays visible, intentional and architecture-driven.",
      description: "Whether logic runs through ECS pipelines or Component Driven orchestrators, empr.es keeps flow control outside renderer-specific callbacks and inside explicit runtime architecture.",
      flow: null
    }
  ];

  return (
    <section className="relative px-6 lg:px-12 py-24">
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
        {/* Top: Intro + Animated FSM Diagram */}
        <div className="mb-16 grid lg:grid-cols-[1fr_500px] gap-12 items-center">
          {/* Left: Intro Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
              FSM, Events and<br />Lifecycle Control
            </h2>

            <p className="text-xl text-white/90 tracking-tight max-w-2xl">
              Game flow should be explicit, predictable and easy to reason about.
            </p>

            <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
              empr.es gives teams a structured way to control states, events and lifecycle ownership without spreading
              flow logic across callbacks and renderer-specific code.
            </p>
          </motion.div>

          {/* Right: Animated State Machine Diagram */}
          {/* <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative h-[320px]"
          > */}
            <svg className="w-full h-full" viewBox="0 0 400 320">
              {/* Background guide lines */}
              <line x1="0" y1="80" x2="400" y2="80" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <line x1="0" y1="160" x2="400" y2="160" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <line x1="0" y1="240" x2="400" y2="240" stroke="white" strokeOpacity="0.03" strokeWidth="1" />

              {/* State nodes */}
              {/* Loading */}
              <circle cx="60" cy="80" r="24" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />
              <circle cx="60" cy="80" r="8" fill="white" fillOpacity="0.3" />

              {/* Init Scene */}
              <circle cx="200" cy="80" r="24" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />
              <circle cx="200" cy="80" r="8" fill="white" fillOpacity="0.3" />

              {/* Idle (part of active path - secondary emphasis) */}
              <motion.circle
                cx="340" cy="80"
                r="24"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.4"
                fill="none"
                animate={{ strokeOpacity: [0.4, 0.5, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <circle cx="340" cy="80" r="8" fill="#E30049" fillOpacity="0.5" />

              {/* Spin (active state - strongest emphasis) */}
              <motion.circle
                cx="340" cy="160"
                r="28"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                fill="none"
                animate={{ scale: [1, 1.08, 1], strokeOpacity: [0.7, 0.9, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <circle cx="340" cy="160" r="10" fill="#E30049" fillOpacity="0.8" />

              {/* Stop */}
              <circle cx="200" cy="240" r="24" stroke="white" strokeWidth="1" strokeOpacity="0.2" fill="none" />
              <circle cx="200" cy="240" r="8" fill="white" fillOpacity="0.3" />

              {/* Present Win (part of loop-back path - secondary emphasis) */}
              <motion.circle
                cx="60" cy="240"
                r="24"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.35"
                fill="none"
                animate={{ strokeOpacity: [0.35, 0.45, 0.35] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />
              <circle cx="60" cy="240" r="8" fill="#E30049" fillOpacity="0.45" />

              {/* Transitions */}
              {/* Loading → Init Scene */}
              <motion.line
                x1="84" y1="80"
                x2="176" y2="80"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <polygon points="176,80 170,77 170,83" fill="white" fillOpacity="0.3" />

              {/* Init Scene → Idle */}
              <motion.line
                x1="224" y1="80"
                x2="316" y2="80"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
              />
              <polygon points="316,80 310,77 310,83" fill="white" fillOpacity="0.3" />

              {/* Idle → Spin (active transition) */}
              <motion.line
                x1="340" y1="104"
                x2="340" y2="132"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                strokeDasharray="4,2"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
              <polygon points="340,132 337,126 343,126" fill="#E30049" fillOpacity="0.7" />

              {/* Spin → Stop */}
              <motion.path
                d="M 318 175 Q 258 200, 217 233"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="3,3"
                fill="none"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.4 }}
              />
              <polygon points="217,233 221,226 214,225" fill="white" fillOpacity="0.3" />

              {/* Stop → Present Win */}
              <motion.line
                x1="176" y1="240"
                x2="84" y2="240"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.6 }}
              />
              <polygon points="84,240 90,237 90,243" fill="white" fillOpacity="0.3" />

              {/* Present Win → Idle (loop back) */}
              <motion.path
                d="M 72 218 Q 130 140, 318 85"
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.45"
                strokeDasharray="4,4"
                fill="none"
                animate={{ strokeDashoffset: [0, -8] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "linear", delay: 0.8 }}
              />
              <polygon points="318,85 313,90 320,91" fill="#E30049" fillOpacity="0.45" />

              {/* Signal pulses traveling along active path */}
              <motion.circle
                cx="340" cy="104"
                r="4"
                fill="#E30049"
                fillOpacity="0.9"
                animate={{
                  cy: [104, 132],
                  opacity: [0.9, 0.3, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />
              <motion.circle
                cx="340" cy="104"
                r="4"
                fill="#E30049"
                fillOpacity="0.9"
                animate={{
                  cy: [104, 132],
                  opacity: [0.9, 0.3, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 2 }}
              />

              {/* Loop-back signal pulse */}
              <motion.circle
                r="3"
                fill="#E30049"
                fillOpacity="0.8"
              >
                <animateMotion
                  dur="2.5s"
                  repeatCount="indefinite"
                  begin="1s"
                  path="M 72 218 Q 130 140, 318 85"
                />
                <animate
                  attributeName="opacity"
                  values="0.8;0.4;0"
                  dur="2.5s"
                  repeatCount="indefinite"
                  begin="1s"
                />
              </motion.circle>
            </svg>
          {/* </motion.div> */}
        </div>

        {/* Bottom: Control Panels (2x2 grid) */}
        <div className="grid md:grid-cols-2 gap-6">
          {controlPanels.map((panel, i) => (
            <motion.div
              key={panel.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
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

                {/* Flow (if present) */}
                {panel.flow && (
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex flex-wrap items-center gap-2">
                      {panel.flow.map((step, stepIndex) => (
                        <div key={stepIndex} className="flex items-center gap-2">
                          <span className="text-xs text-white/60 px-2 py-1 border border-white/10 bg-black/40 rounded">
                            {step}
                          </span>
                          {stepIndex < panel.flow.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-[#E30049]/60 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
