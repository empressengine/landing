import { motion } from 'motion/react';

export function RuntimePanel() {
  return (
    <div className="relative w-full h-full min-h-[600px]">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#444" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Central runtime visualization */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative"
        >
          {/* Core node */}
          <div className="w-96 h-96 relative">
            {/* Outer rings */}
            <motion.div
              className="absolute inset-0 rounded-full border border-[#E30049]/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-8 rounded-full border border-white/20"
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />

            {/* Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-[#E30049]/20 border border-[#E30049] flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#E30049]">
                  <motion.div
                    className="w-full h-full rounded-full bg-[#E30049]"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            </div>

            {/* Connection nodes */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <motion.div
                key={angle}
                className="absolute w-6 h-6 rounded-full bg-white/60"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${angle}deg) translateY(-180px) translateX(-50%)`,
                }}
                animate={{ 
                  opacity: [0.4, 1, 0.4],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{ 
                  duration: 2,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>

          {/* Signal lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'translate(-25%, -25%) scale(3)' }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <motion.line
                key={angle}
                x1="50%"
                y1="50%"
                x2={`calc(50% + ${Math.cos(angle * Math.PI / 180) * 400}px)`}
                y2={`calc(50% + ${Math.sin(angle * Math.PI / 180) * 400}px)`}
                stroke="#E30049"
                strokeWidth="1"
                strokeOpacity="0.3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  delay: i * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </svg>
        </motion.div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 right-0 w-32 h-32 border-t border-r border-[#E30049]/30" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b border-l border-[#E30049]/30" />
    </div>
  );
}
