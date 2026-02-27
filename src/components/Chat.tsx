import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Image as ImageIcon, Mic, Loader2 } from 'lucide-react';
import { Message, generateChatResponse, generateImage } from '../services/gemini';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  onThinking: (thinking: boolean) => void;
}

export function Chat({ onThinking }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    onThinking(true);

    try {
      const response = await generateChatResponse(input, messages);
      const modelMessage: Message = { role: 'model', content: response || '' };
      setMessages(prev => [...prev, modelMessage]);

      // Check if we should trigger image generation (simple heuristic)
      if (input.toLowerCase().includes('generate image') || input.toLowerCase().includes('make a picture')) {
        handleGenerateImage(input);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsLoading(false);
      onThinking(false);
    }
  };

  const handleGenerateImage = async (prompt: string) => {
    onThinking(true);
    try {
      const imageUrl = await generateImage(prompt, "1K");
      if (imageUrl) {
        setMessages(prev => [...prev, { 
          role: 'model', 
          content: 'Here is the image I generated for you:',
          type: 'image',
          imageUrl 
        }]);
      }
    } catch (error) {
      console.error('Image gen error:', error);
    } finally {
      onThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 font-sans">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "px-4 py-2 rounded-2xl text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-emerald-600 text-white rounded-tr-none" 
                  : "bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-800"
              )}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {msg.type === 'image' && msg.imageUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-zinc-700">
                    <img src={msg.imageUrl} alt="Generated" className="w-full h-auto" />
                  </div>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-widest opacity-30 mt-1 font-mono">
                {msg.role}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex items-center space-x-2 text-zinc-500 text-xs font-mono italic">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>UMA is processing...</span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-900 bg-zinc-950/50 backdrop-blur-xl">
        <div className="relative flex items-center bg-zinc-900 rounded-2xl border border-zinc-800 focus-within:border-emerald-500/50 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type in Nepali or English..."
            className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-zinc-600"
          />
          <div className="flex items-center pr-2 space-x-1">
            <button 
              onClick={() => handleGenerateImage(input)}
              className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
              title="Generate Image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
