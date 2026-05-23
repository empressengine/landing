import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { motion } from "motion/react";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-12 py-6"
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between p-4 border border-white/10 bg-black/80 backdrop-blur-xl rounded-full">
          <Logo />

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="hidden sm:flex border-white/20 bg-white/5 hover:bg-[#E30049]/20 hover:border-[#E30049] text-white hover:text-white"
              asChild
            >
              <a href="/docs/">
                Explore Architecture
              </a>
            </Button>
            <Button
              size="sm"
              className="bg-[#E30049] hover:bg-[#E30049]/90 text-white border-0"
              asChild
            >
              <a href="#start-building">
                Request Access
              </a>
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
