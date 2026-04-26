import React, { useState, useEffect, useRef } from 'react';
import { Chat, MODES } from './components/Chat';
import { Sidebar } from './components/Sidebar';
import { ThinkingBar } from './components/ThinkingBar';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Globe, Cpu, LogIn, Menu, X, Paperclip } from 'lucide-react';
import { cn } from './lib/utils';
import { useAuth } from './components/FirebaseProvider';
import { signInWithGoogle } from './services/firebase';
import { OperationalMode, FileData } from './services/gemini';

export default function App() {
  const { user, loading } = useAuth();
  const [isThinking, setIsThinking] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [intelligenceLevel, setIntelligenceLevel] = useState('uma-flash');
  const [currentPlan, setCurrentPlan] = useState('free');

  // Mode and File state
  const [activeMode, setActiveMode] = useState<OperationalMode>('fast');
  const [pendingFiles, setPendingFiles] = useState<FileData[]>([]);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: FileData[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;
      newFiles.push({
        mimeType: file.type || 'application/octet-stream',
        data: base64,
        name: file.name
      });
    }

    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-12 text-center shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] pointer-events-none" />
          
          <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-600/20 rotate-12 group-hover:rotate-0 transition-transform duration-500">
            <Zap className="w-10 h-10 text-white fill-white" />
          </div>

          <h1 className="text-4xl font-black tracking-tight mb-4 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
            Meet UMA
          </h1>
          <p className="text-zinc-500 mb-10 leading-relaxed font-medium">
            The next generation of bilingual multimodal intelligence. Powered by Gemini 3.1.
          </p>

          <button 
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center space-x-3 py-4 px-6 bg-white text-black rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
          >
            <LogIn className="w-4 h-4 ml-[-4px]" />
            <span>Sign in with Google</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-14 border-b border-zinc-900 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-md z-50">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <h1 className="text-sm font-bold tracking-tight">UMA</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-zinc-400 px-3 border-r border-zinc-900 mr-2">
            <Globe className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">NP / EN</span>
          </div>
          
          <div className="flex items-center bg-zinc-900/50 rounded-xl border border-zinc-800 p-0.5">
            {/* Mode Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowModeSelector(!showModeSelector)}
                className={cn(
                  "flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all",
                  showModeSelector ? "bg-zinc-800 text-emerald-500" : "text-zinc-400 hover:text-white"
                )}
              >
                <span className="text-sm">👟</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] hidden md:inline ml-1">
                  {MODES.find(m => m.id === activeMode)?.label}
                </span>
              </button>

              <AnimatePresence>
                {showModeSelector && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 8, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-[60] max-h-[400px] overflow-y-auto"
                  >
                    {MODES.map((mode) => (
                      <button 
                        key={mode.id}
                        onClick={() => {
                          setActiveMode(mode.id);
                          setShowModeSelector(false);
                        }}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-left mb-1 last:mb-0",
                          activeMode === mode.id ? "bg-emerald-600/10 text-emerald-500" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        )}
                      >
                        <mode.icon className="w-4 h-4" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-widest">{mode.label}</span>
                          <span className="text-[9px] opacity-50">{mode.desc}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Paperclip */}
            <div className="border-l border-zinc-800 ml-0.5 h-6 self-center" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "p-1.5 px-3 rounded-lg transition-colors relative",
                pendingFiles.length > 0 ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-500 hover:text-white"
              )}
              title="Upload Files"
            >
              <Paperclip className="w-4 h-4" />
              {pendingFiles.length > 0 && (
                <span className="absolute top-0.5 right-1 w-3.5 h-3.5 bg-emerald-500 text-black text-[8px] font-bold rounded-full flex items-center justify-center border border-zinc-950">
                  {pendingFiles.length}
                </span>
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              multiple 
              className="hidden" 
            />
          </div>
        </div>
      </header>

      <ThinkingBar isThinking={isThinking} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          currentId={currentId} 
          onSelect={setCurrentId} 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          intelligenceLevel={intelligenceLevel}
          onIntelligenceLevelChange={setIntelligenceLevel}
          currentPlan={currentPlan}
          onPlanChange={setCurrentPlan}
        />

        <main className="flex-1 relative flex flex-col overflow-hidden">
          <section className="flex-1 h-full bg-zinc-950">
            <Chat 
              onThinking={setIsThinking} 
              conversationId={currentId}
              onConversationCreated={setCurrentId}
              intelligenceLevel={intelligenceLevel}
              activeMode={activeMode}
              setActiveMode={setActiveMode}
              pendingFiles={pendingFiles}
              setPendingFiles={setPendingFiles}
            />
          </section>
        </main>
      </div>

      <footer className="h-8 border-t border-zinc-900 bg-zinc-950 flex items-center justify-between px-6 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
        <div className="flex items-center space-x-4">
          <span>System: Online</span>
          <span className="w-1 h-1 bg-emerald-500 rounded-full" />
          <span>Session: {user.email?.split('@')[0]}</span>
          <span className="w-1 h-1 bg-emerald-500 rounded-full" />
          <span className="text-emerald-500 font-bold">{currentPlan.toUpperCase()} PLAN</span>
        </div>
        <div className="hidden sm:block">
          © 2026 UMA Core • v3.1.4
        </div>
      </footer>
    </div>
  );
}
