import { motion } from "motion/react";

export function Ecosystem() {
  const packageGroups = [
    {
      label: "Core",
      packages: [
        {
          name: "@empr/es",
          description: "Core architecture: entities, components, storage, DI, Store, FSM, signals, update loop, lifecycle and pooling.",
          planned: false
        }
      ]
    },
    {
      label: "Execution",
      packages: [
        {
          name: "@empr/es-sistema",
          description: "ECS execution stack: systems, pipelines, executor and pipeline composition.",
          planned: false
        },
        {
          name: "@empr/es-componente",
          description: "Component Driven execution stack: scene-owned components coordinated by external orchestrators.",
          planned: false
        }
      ]
    },
    {
      label: "Rendering",
      packages: [
        {
          name: "@empr/es-lienzo",
          description: "Official PixiJS runtime: PixiEntity, TreeBuilder, assets, Spine, GSAP, interactions, responsive layout and Pixi pooling.",
          planned: false
        },
        {
          name: "@empr/es-talla",
          description: "Planned ThreeJS runtime for 3D browser games and simulations.",
          planned: true
        }
      ]
    },
    {
      label: "Tooling",
      packages: [
        {
          name: "@empr/es-mirador",
          description: "Debug and observability layer for entities, components, execution flows and runtime state.",
          planned: true
        },
        {
          name: "@empr/es-forja",
          description: "Visual editor for creating, configuring and inspecting game projects.",
          planned: true
        }
      ]
    },
    {
      label: "UI",
      packages: [
        {
          name: "@empr/es-marco",
          description: "UI foundation for framework-powered tools, panels and game interfaces.",
          planned: true
        }
      ]
    }
  ];

  return (
    <section className="relative px-6 lg:px-12 py-24">
      {/* Background grid */}

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
            Ecosystem
          </h2>

          <p className="text-xl text-white/80 tracking-tight">
            A modular ecosystem, not a monolithic engine.
          </p>

          <p className="text-sm text-white/50 leading-relaxed max-w-3xl mx-auto">
            Use the core framework, choose an execution stack, plug in a renderer and extend the project with tooling when you need it.
          </p>
        </motion.div>

        {/* Modular Ecosystem Board */}
        <div className="max-w-5xl mx-auto space-y-6">
          {packageGroups.map((group, groupIndex) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + groupIndex * 0.1 }}
            >
              <div className="border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm rounded-lg overflow-hidden">
                {/* Group Header */}
                <div className="px-6 py-3 border-b border-white/10 bg-black/40">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-[#E30049]" />
                    <span className="text-xs text-white/60 tracking-wider uppercase">
                      {group.label}
                    </span>
                  </div>
                </div>

                {/* Packages */}
                <div className="divide-y divide-white/5">
                  {group.packages.map((pkg, pkgIndex) => (
                    <motion.div
                      key={pkg.name}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.3 + groupIndex * 0.1 + pkgIndex * 0.05 }}
                      className="p-6 bg-black/20 hover:bg-black/30 transition-colors duration-300"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <code className="text-sm text-white/90 font-mono tracking-tight">
                          {pkg.name}
                        </code>
                        {pkg.planned && (
                          <span className="flex-shrink-0 px-2 py-0.5 text-xs text-[#E30049]/80 border border-[#E30049]/20 bg-[#E30049]/10 rounded">
                            Planned
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed">
                        {pkg.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
