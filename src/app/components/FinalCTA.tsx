import { motion } from "motion/react";
import { Button } from "./ui/button";
import { ArrowRight, Book } from "lucide-react";

export function FinalCTA() {
  const nextSteps = [
    "Request access to the framework",
    "Book a technical demo",
    "Discuss integration for your project",
    "Explore documentation and examples",
    "Start a pilot game with ECS or Component Driven architecture"
  ];

  return (
    <section id="start-building" className="relative px-6 lg:px-12 py-24 border-t border-white/5">
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
        <div className="mb-16 grid lg:grid-cols-[1fr_360px] gap-12 items-center">
          {/* Left: Intro Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
              Start building with empr<span className="text-[#E30049]">.</span>es
            </h2>

            <p className="text-base text-white/80 leading-relaxed max-w-2xl">
              Bring explicit architecture, controlled execution and production-ready TypeScript tooling into your next browser game.
            </p>

            <p className="text-sm text-white/50 leading-relaxed max-w-2xl">
              Whether you are building a new game from scratch, modernizing an existing PixiJS project or exploring
              a scalable foundation for multiple titles, empr.es can help your team structure game logic, rendering,
              lifecycle and runtime flow around a clear architectural core.
            </p>
          </motion.div>

          {/* Right: Animated Activation Diagram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative h-[320px]"
          >
            <svg className="w-full h-full" viewBox="0 0 360 320">
              {/* Background guide lines */}
              <line x1="0" y1="160" x2="360" y2="160" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
              <circle cx="80" cy="160" r="100" stroke="white" strokeOpacity="0.02" strokeWidth="1" fill="none" />

              {/* Central Core Node */}
              <motion.circle
                cx="80" cy="160"
                r="36"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                fill="none"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <circle cx="80" cy="160" r="24" stroke="white" strokeWidth="1" strokeOpacity="0.15" fill="none" />
              <circle cx="80" cy="160" r="12" fill="#E30049" fillOpacity="0.7" />

              {/* Activation Path Stages */}
              {/* Stage 1: Execution */}
              <motion.line
                x1="116" y1="160"
                x2="160" y2="160"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                strokeDasharray="4,2"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <circle cx="180" cy="160" r="16" stroke="white" strokeWidth="1" strokeOpacity="0.3" fill="none" />
              <circle cx="180" cy="160" r="6" fill="white" fillOpacity="0.4" />
              <text x="180" y="140" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.4">
                Execution
              </text>

              {/* Stage 2: Runtime */}
              <motion.line
                x1="196" y1="160"
                x2="224" y2="160"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.3 }}
              />
              <circle cx="240" cy="160" r="16" stroke="white" strokeWidth="1" strokeOpacity="0.3" fill="none" />
              <circle cx="240" cy="160" r="6" fill="white" fillOpacity="0.4" />
              <text x="240" y="140" textAnchor="middle" fontSize="8" fill="white" fillOpacity="0.4">
                Runtime
              </text>

              {/* Stage 3: Production (final activation point) */}
              <motion.line
                x1="256" y1="160"
                x2="284" y2="160"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                strokeDasharray="4,2"
                animate={{ strokeDashoffset: [0, -6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.6 }}
              />
              <motion.circle
                cx="304" cy="160"
                r="24"
                stroke="#E30049"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                fill="none"
                animate={{ scale: [1, 1.1, 1], strokeOpacity: [0.7, 0.9, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />
              <circle cx="304" cy="160" r="10" fill="#E30049" fillOpacity="0.8" />
              <text x="304" y="195" textAnchor="middle" fontSize="8" fill="#E30049" fillOpacity="0.8">
                Production
              </text>

              {/* Supporting activation nodes */}
              {/* Top branch */}
              <motion.line
                x1="100" y1="140"
                x2="160" y2="100"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="2,2"
                animate={{ strokeDashoffset: [0, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
              />
              <circle cx="170" cy="90" r="6" fill="white" fillOpacity="0.3" />

              {/* Bottom branch */}
              <motion.line
                x1="100" y1="180"
                x2="160" y2="220"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="2,2"
                animate={{ strokeDashoffset: [0, -4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1.3 }}
              />
              <circle cx="170" cy="230" r="6" fill="white" fillOpacity="0.3" />

              {/* Signal pulses along activation path */}
              <motion.circle
                cx="116" cy="160"
                r="4"
                fill="#E30049"
                fillOpacity="0.9"
                animate={{
                  cx: [116, 160, 180],
                  opacity: [0.9, 0.6, 0]
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              />
              <motion.circle
                cx="256" cy="160"
                r="4"
                fill="#E30049"
                fillOpacity="0.9"
                animate={{
                  cx: [256, 284, 304],
                  opacity: [0.9, 0.7, 0]
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 1.5 }}
              />
            </svg>
          </motion.div>
        </div>

        {/* Bottom: Two-Panel Final CTA Board */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel: What you can do next */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-8 hover:border-white/20 transition-all duration-300">
              <h3 className="text-xl text-white mb-6 tracking-tight font-medium">
                What you can do next
              </h3>

              <div className="space-y-3">
                {nextSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                    className="flex items-start gap-3 p-3 border border-white/10 bg-black/20 rounded-md hover:border-[#E30049]/30 hover:bg-black/30 transition-all duration-300"
                  >
                    <ArrowRight className="w-4 h-4 text-[#E30049]/70 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white/70 leading-relaxed">{step}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Panel: Ready to build? */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-8 hover:border-white/20 transition-all duration-300 flex flex-col">
              <h3 className="text-xl text-white mb-4 tracking-tight font-medium">
                Ready to build?
              </h3>

              <p className="text-sm text-white/60 leading-relaxed mb-6 flex-1">
                Tell us about your project, your team and your technical goals — and we will help you understand
                how empr.es can fit into your development process.
              </p>

              <div className="mb-6 p-4 border border-white/10 bg-black/20 rounded-md">
                <p className="text-sm text-white/70">
                  Contact us at{" "}
                  <a
                    href="mailto:info@empr.es?subject=Request%20access%20for%20empr.es"
                    className="text-[#E30049] hover:text-[#E30049]/80 transition-colors underline decoration-[#E30049]/30 hover:decoration-[#E30049]/60"
                  >
                    info@empr.es
                  </a>
                  {" "}to request access or discuss your project.
                </p>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-[#E30049]/20 hover:border-[#E30049] text-white hover:text-white px-8 h-12"
                asChild
              >
                <a href="/docs/">
                  <Book className="mr-2 w-4 h-4" />
                  Explore Documentation
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
