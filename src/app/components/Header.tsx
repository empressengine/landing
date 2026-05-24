import * as React from "react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { motion } from "motion/react";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-x-0 top-0 z-50 px-3 py-4 sm:px-6 sm:py-6 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1600px] min-w-0 overflow-hidden">
        <div className="flex w-full min-w-0 items-center justify-between gap-2 rounded-full border border-white/10 bg-black/80 p-2 backdrop-blur-xl sm:gap-4 sm:p-4">
          <Logo variant="icon" className="sm:hidden" />
          <Logo className="hidden min-w-0 flex-1 overflow-hidden sm:flex" />

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Button
              size="sm"
              variant="outline"
              className="hidden border-white/20 bg-white/5 text-white hover:border-[#E30049] hover:bg-[#E30049]/20 hover:text-white sm:flex"
              asChild
            >
              <a href="/docs/">Explore Architecture</a>
            </Button>
            <Button
              size="sm"
              className="shrink-0 border-0 bg-[#E30049] px-2.5 text-xs text-white hover:bg-[#E30049]/90 sm:px-4 sm:text-sm"
              asChild
            >
              <a href="#start-building">Request Access</a>
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
