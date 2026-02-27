import { motion } from "motion/react";

interface ThinkingBarProps {
  isThinking: boolean;
}

export function ThinkingBar({ isThinking }: ThinkingBarProps) {
  if (!isThinking) return null;

  return (
    <div className="w-full h-1 bg-zinc-800 overflow-hidden relative">
      <motion.div
        className="absolute inset-0 bg-emerald-500"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
}
