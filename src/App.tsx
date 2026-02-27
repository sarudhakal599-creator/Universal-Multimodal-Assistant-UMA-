import React, { useState } from 'react';
import { LiveFeed } from './components/LiveFeed';
import { Chat } from './components/Chat';
import { ThinkingBar } from './components/ThinkingBar';
import { motion } from 'motion/react';
import { Zap, Globe, Cpu } from 'lucide-react';

export default function App() {
  const [isThinking, setIsThinking] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-14 border-b border-zinc-900 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-md z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">UMA</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Universal Multimodal Assistant</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-zinc-400">
            <Globe className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">NP / EN</span>
          </div>
          <div className="flex items-center space-x-2 text-zinc-400">
            <Cpu className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Gemini 3.1</span>
          </div>
        </div>
      </header>

      <ThinkingBar isThinking={isThinking} />

      {/* Main Content: Split Screen */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Top/Left: Live Feed */}
        <section className="flex-1 relative border-b md:border-b-0 md:border-r border-zinc-900">
          <LiveFeed />
        </section>

        {/* Bottom/Right: Chat */}
        <section className="w-full md:w-[450px] lg:w-[550px] h-[50%] md:h-full bg-zinc-950">
          <Chat onThinking={setIsThinking} />
        </section>
      </main>

      {/* Footer / Status */}
      <footer className="h-8 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between px-6 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
        <div className="flex items-center space-x-4">
          <span>System: Online</span>
          <span className="w-1 h-1 bg-emerald-500 rounded-full" />
          <span>Latency: 120ms</span>
        </div>
        <div>
          © 2026 UMA Core
        </div>
      </footer>
    </div>
  );
}
