import { motion } from "motion/react";

export function BuiltForProduction() {
  const pillars = [
    {
      title: "Runtime Stability",
      points: [
        "Lifecycle tracking",
        "Object pooling",
        "Safe release/acquire",
        "Subscription disposal"
      ],
      supportLine: "Built to keep runtime ownership explicit, memory safer and long-running sessions more predictable."
    },
    {
      title: "TypeScript-first DX",
      points: [
        "Typed signals",
        "Typed systems",
        "DI tokens",
        "IDE-friendly architecture"
      ],
      supportLine: "Strong typing and architectural clarity improve navigation, tooling and developer confidence."
    },
    {
      title: "Team Scalability",
      points: [
        "Clear boundaries",
        "Easier onboarding",
        "Less spaghetti",
        "Multi-year maintainability"
      ],
      supportLine: "A structured architecture helps teams grow without losing control of complexity."
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
        {/* Centered Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center max-w-4xl mx-auto space-y-6"
        >
          <h2 className="text-4xl lg:text-6xl text-white tracking-tight">
            Built for Production
          </h2>

          <p className="text-xl text-white/80 tracking-tight">
            Designed for long-running projects, stable runtimes and growing teams.
          </p>

          <p className="text-sm text-white/50 leading-relaxed max-w-3xl mx-auto">
            empr.es is built not just for elegant architecture, but for real production work: stable runtime behavior,
            TypeScript-first developer experience and team-friendly maintainability over time.
          </p>
        </motion.div>

        {/* Three Pillars */}
        <div className="grid lg:grid-cols-3 gap-8">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
            >
              <div className="h-full border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg p-8 hover:border-white/20 transition-all duration-300">
                {/* Title */}
                <h3 className="text-xl text-white mb-6 tracking-tight font-medium">
                  {pillar.title}
                </h3>

                {/* Key Points */}
                <div className="space-y-3 mb-6">
                  {pillar.points.map((point) => (
                    <div key={point} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#E30049] mt-2" />
                      <span className="text-sm text-white/70 leading-relaxed">{point}</span>
                    </div>
                  ))}
                </div>

                {/* Support Line */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/50 leading-relaxed">
                    {pillar.supportLine}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
