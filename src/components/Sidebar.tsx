import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  LogOut, 
  Settings, 
  History,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Cpu
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  db, 
  auth, 
  logout 
} from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentId: string | null;
  onSelect: (id: string | null) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  intelligenceLevel: string;
  onIntelligenceLevelChange: (level: string) => void;
  currentPlan: string;
  onPlanChange: (plan: string) => void;
}

export function Sidebar({ currentId, onSelect, isOpen, setIsOpen, intelligenceLevel, onIntelligenceLevelChange, currentPlan, onPlanChange }: SidebarProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const user = auth.currentUser;

  const PLANS = [
    { id: 'free', label: 'Free', model: 'uma-flash' },
    { id: 'plus', label: 'Plus', model: 'uma-flash' },
    { id: 'pro', label: 'Pro', model: 'uma-pro' },
    { id: 'ultra', label: 'Ultra', model: 'uma-ultra' }
  ];

  const handlePlanChange = (planId: string) => {
    const plan = PLANS.find(p => p.id === planId);
    if (plan) {
      onPlanChange(planId);
      onIntelligenceLevelChange(plan.model);
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setConversations(docs);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      try {
        await deleteDoc(doc(db, 'conversations', id));
        if (currentId === id) onSelect(null);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isOpen ? 260 : 0 }}
      className="bg-zinc-950 border-r border-zinc-900 flex flex-col overflow-hidden relative"
    >
      <div className="p-4 flex flex-col h-full w-[260px]">
        {/* New Chat Button */}
        <button 
          onClick={() => onSelect(null)}
          className="flex items-center space-x-3 w-full p-3 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-all text-sm font-medium mb-6"
        >
          <Plus className="w-4 h-4 text-emerald-500" />
          <span>New Chat</span>
        </button>

        {/* History List */}
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
          <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 px-2">
            <History className="w-3 h-3" />
            <span>Recent Activity</span>
          </div>
          
          <AnimatePresence initial={false}>
            {conversations.map((chat) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => onSelect(chat.id)}
                className={cn(
                  "group flex items-center justify-between w-full p-2.5 rounded-lg cursor-pointer transition-all text-sm",
                  currentId === chat.id 
                    ? "bg-emerald-600/10 text-emerald-500 border border-emerald-500/20" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                )}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{chat.title || 'Untitled Chat'}</span>
                </div>
                <button 
                  onClick={(e) => handleDelete(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Settings & Intelligence (The Brain) */}
        <div className="mt-auto border-t border-zinc-900 pt-4 space-y-4">
          <div className="px-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center">
              <Cpu className="w-3 h-3 mr-2 text-emerald-500" /> 
              Uma Architecture
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2 px-1">Subscription Tiers</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handlePlanChange(plan.id)}
                      className={cn(
                        "relative group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300",
                        currentPlan === plan.id 
                          ? "bg-emerald-600/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800/50"
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{plan.label}</span>
                      {currentPlan === plan.id && (
                        <motion.div 
                          layoutId="active-indicator"
                          className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-zinc-950"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-900/50 pt-2 space-y-1">
            <div className="flex items-center space-x-3 p-2 rounded-lg mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-zinc-500 truncate uppercase">{currentPlan} Plan</p>
            </div>
          </div>
          
          <button 
            onClick={() => {}} // Settings modal placeholder
            className="flex items-center space-x-3 w-full p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 transition-all text-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          
          <button 
            onClick={logout}
            className="flex items-center space-x-3 w-full p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-red-500 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
    </motion.aside>
  );
}
