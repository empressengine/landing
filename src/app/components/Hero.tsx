import { Button } from "./ui/button";
import { FeatureBadge } from "./FeatureBadge";
import { RuntimePanel } from "./RuntimePanel";
import { ArrowRight, Book } from "lucide-react";
import { motion } from "motion/react";

export function Hero() {
  const headlineAccentClassName = "hero-headline-accent";
  const headlineAccentDelay1ClassName = `${headlineAccentClassName} hero-headline-accent--delay-1`;
  const headlineAccentDelay2ClassName = `${headlineAccentClassName} hero-headline-accent--delay-2`;
  const badges = [
    "TypeScript-first",
    "ECS / Component Driven",
    "Renderer Agnostic",
    "Isomorphic Core",
    "FSM + Signals",
    "PixiJS Runtime",
    "GC-friendly Lifecycle"
  ];

  return (
    <section className="relative min-h-screen flex items-center px-6 lg:px-12 py-24 overflow-hidden">
      {/* Background grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, white 1px, transparent 1px),
            linear-gradient(to bottom, white 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-[1600px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Eyebrow */}
            {/* <div className="inline-flex items-center gap-2 px-4 py-2 border border-[#E30049]/30 bg-[#E30049]/5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E30049] animate-pulse" />
              <span className="text-sm text-white/70 tracking-wide">
                Modular TypeScript Framework for Browser Games
              </span>
            </div> */}

            {/* Headline */}
            <h1 className="text-5xl lg:text-7xl leading-[1.1] tracking-tight text-white">
              Architect your <span className={headlineAccentClassName}>logic</span>.<br />
              Control your <span className={headlineAccentDelay1ClassName}>runtime</span>.<br />
              Own your <span className={headlineAccentDelay2ClassName}>rendering</span>.
            </h1>

            {/* Subtitle */}
            <p className="text-lg lg:text-xl text-white/60 leading-relaxed max-w-2xl">
              empr.es is a modular TypeScript framework for scalable browser games. 
              Choose ECS or Component Driven architecture, control game flow with FSM and signals, 
              run logic in browser or server, and plug it into any renderer — with PixiJS support out of the box.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-[#E30049] hover:bg-[#E30049]/90 text-white border-0 px-8 h-12"
                asChild
              >
                <a href="#start-building">
                  Request Access
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-[#E30049]/20 hover:border-[#E30049] text-white hover:text-white px-8 h-12"
                asChild
              >
                <a href="/docs/">
                  <Book className="mr-2 w-4 h-4" />
                  Explore Architecture
                </a>
              </Button>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2 pt-4">
              {badges.map((badge, i) => (
                <motion.div
                  key={badge}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
                >
                  <FeatureBadge>{badge}</FeatureBadge>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Runtime visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative overflow-hidden">
              <RuntimePanel />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
