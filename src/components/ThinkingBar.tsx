import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface ThinkingBarProps {
  isThinking: boolean;
}

export function ThinkingBar({ isThinking }: ThinkingBarProps) {
  return (
    <div className={cn(
      "w-full h-[2px] bg-zinc-950 overflow-hidden relative transition-opacity duration-500",
      isThinking ? "opacity-100" : "opacity-0"
    )}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400 to-transparent w-[40%]"
        animate={{ 
          left: ["-40%", "100%"] 
        }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
