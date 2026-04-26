import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Send, Image as ImageIcon, Mic, Loader2, Copy, Check, Volume2, Radio, Sparkles, Zap, 
  MessageSquare, Paperclip, Search, Brain, GraduationCap, User, School, Music, 
  FastForward, FileText, X, File as FileIcon, Footprints, Download, Globe, Share2
} from 'lucide-react';
import { 
  Message, generateChatResponseStream, generateImage, generateSpeech, 
  generateMusicAudio,
  OperationalMode, FileData 
} from '../services/gemini';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, 
  auth, 
  saveMessage, 
  createConversation,
  OperationType,
  handleFirestoreError
} from '../services/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  limit,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';

interface ChatProps {
  onThinking: (thinking: boolean) => void;
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  intelligenceLevel: string;
  activeMode: OperationalMode;
  setActiveMode: (mode: OperationalMode) => void;
  pendingFiles: FileData[];
  setPendingFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
}

export const MODES: { id: OperationalMode; label: string; icon: any; desc: string; isUma?: boolean }[] = [
  { id: 'uma_lite', label: 'UMA Lite', icon: Zap, desc: 'High-Efficiency', isUma: true },
  { id: 'uma_normal', label: 'UMA Normal', icon: Zap, desc: 'Balanced', isUma: true },
  { id: 'uma_medium', label: 'UMA Medium', icon: Zap, desc: 'Nuanced', isUma: true },
  { id: 'uma_heavy', label: 'UMA Heavy', icon: Zap, desc: 'Analytic', isUma: true },
  { id: 'uma_ultra', label: 'UMA Ultra', icon: Zap, desc: 'Flagship', isUma: true },
  { id: 'uma_pro', label: 'UMA Pro', icon: Zap, desc: 'Technical', isUma: true },
  { id: 'uma_plus', label: 'UMA Plus', icon: Zap, desc: 'Empathetic', isUma: true },
  { id: 'uma_tat', label: 'UMA Tat', icon: Zap, desc: 'Developer', isUma: true },
  { id: 'uma_legacy', label: 'UMA 2.1', icon: Zap, desc: 'Legacy', isUma: true },
  { id: 'uma_multimodal', label: 'UMA 3.2', icon: Zap, desc: 'Multimodal', isUma: true },
  { id: 'uma_agentic', label: 'UMA 4.3', icon: Zap, desc: 'Agentic', isUma: true },
  { id: 'uma_future_core', label: 'UMA 5.5', icon: Zap, desc: 'Future-Core', isUma: true },
  { id: 'agent', label: 'Agent Mode', icon: Search, desc: 'Autonomous Research' },
  { id: 'deep_research', label: 'Deep Research', icon: Search, desc: 'High-Intensity Info' },
  { id: 'think', label: 'Think Mode', icon: Brain, desc: 'Deep Reasoning' },
  { id: 'teacher', label: 'Teacher Mode', icon: GraduationCap, desc: 'Socratic Method' },
  { id: 'learner', label: 'Learner Mode', icon: User, desc: 'AI Learns from You' },
  { id: 'school', label: 'School Mode', icon: School, desc: 'NotebookLM Style' },
  { id: 'image_gen', label: 'Image Mode', icon: Sparkles, desc: 'Nano Banana 2' },
  { id: 'music', label: 'Music Mode', icon: Music, desc: 'Lyria Assistant' },
  { id: 'fast', label: 'Fast Mode', icon: FastForward, desc: 'Direct & Concise' },
  { id: 'canva', label: 'Canva Mode', icon: ImageIcon, desc: 'Design Specialist' },
  { id: 'medical', label: 'Medical Mode', icon: Brain, desc: 'Clinical Assistant' },
  { id: 'code', label: 'Code Mode', icon: FileText, desc: 'Software Engineer' },
  { id: 'utility', label: 'Utility Mode', icon: Zap, desc: 'Practical Tools' },
  { id: 'math', label: 'Math Mode', icon: Brain, desc: 'Mathematician' },
  { id: 'science', label: 'Science Mode', icon: Sparkles, desc: 'Scientist' },
  { id: 'language', label: 'Language Mode', icon: MessageSquare, desc: 'Linguist' },
  { id: 'nepali', label: 'Nepali Mode', icon: MessageSquare, desc: 'Cultural Expert' },
  { id: 'social', label: 'Social Mode', icon: Radio, desc: 'Social Media Expert' },
  { id: 'web', label: 'Web Mode', icon: Search, desc: 'Web Developer' },
  { id: 'media', label: 'Media Mode', icon: ImageIcon, desc: 'Multimedia Specialist' },
  { id: 'translation', label: 'Translation Mode', icon: MessageSquare, desc: 'Polyglot' },
  { id: 'audio', label: 'Audio Mode', icon: Volume2, desc: 'Sound Engineer' },
  { id: 'literature', label: 'Literature Mode', icon: FileText, desc: 'Literary Critic' },
  { id: 'slide', label: 'Slide Mode', icon: FileText, desc: 'Presentation Expert' },
  { id: 'pdf', label: 'PDF Mode', icon: FileIcon, desc: 'Document Analyst' },
  { id: 'prompt', label: 'Prompt Mode', icon: Sparkles, desc: 'Prompt Engineer' },
];

export function Chat({ onThinking, conversationId, onConversationCreated, intelligenceLevel, activeMode, setActiveMode, pendingFiles, setPendingFiles }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const prevFilesLength = useRef(0);

  // Auto-scan uploaded files
  useEffect(() => {
    if (pendingFiles.length > prevFilesLength.current) {
      const newFiles = pendingFiles.slice(prevFilesLength.current);
      handleSend("Please analyze the context of these uploaded files.", newFiles);
    }
    prevFilesLength.current = pendingFiles.length;
  }, [pendingFiles]);

  // Load messages from Firestore
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => d.data() as Message);
      setMessages(msgs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `conversations/${conversationId}/messages`);
    });

    return () => unsubscribe();
  }, [conversationId]);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const playAudio = async (base64Data: string) => {
    try {
      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Try to decode as a standard audio file first (WAV/MP3/AAC)
      try {
        // We need to clone the buffer because decodeAudioData detaches it
        const bufferCopy = bytes.buffer.slice(0);
        const decodedBuffer = await audioContext.decodeAudioData(bufferCopy);
        const source = audioContext.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioContext.destination);
        source.start();
        return;
      } catch (decodeErr) {
        // Fallback to raw PCM (16-bit, 24kHz) if decoding fails
        // This is common for the Gemini TTS model output
        const pcmData = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          float32Data[i] = pcmData[i] / 32768.0;
        }

        const buffer = audioContext.createBuffer(1, float32Data.length, 24000);
        buffer.getChannelData(0).set(float32Data);
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
      }
    } catch (err) {
      console.error("Error playing audio:", err);
    }
  };

  const downloadAudio = (base64Data: string, filename: string = 'uma-audio.wav') => {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Only save last 20 messages and STRIP file data to keep localStorage fast
    const historyToSave = messages.slice(-20).map(msg => ({
      role: msg.role,
      content: msg.content,
      type: msg.type,
      imageUrl: msg.imageUrl
      // files are NOT saved to localStorage to prevent bloat
    }));
    localStorage.setItem('uma_chat_history', JSON.stringify(historyToSave));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    
    // Automatic Context: scan file on upload
    if (newFiles.length > 0) {
      handleSend("Please analyze the context of these uploaded files.", newFiles);
    }
  };

  const handleSend = async (overrideInput?: string, overrideFiles?: FileData[]) => {
    const currentInput = overrideInput || input;
    const currentFiles = overrideFiles || pendingFiles;

    if (!currentInput.trim() && currentFiles.length === 0 || isLoading) return;

    if (activeMode === 'image_gen' && currentInput.trim()) {
      handleGenerateImage(currentInput);
      setInput('');
      setPendingFiles([]);
      return;
    }

    if (activeMode === 'music' && currentInput.trim()) {
      handleGenerateMusic(currentInput);
      setInput('');
      setPendingFiles([]);
      return;
    }

    const isUmaMode = MODES.find(m => m.id === activeMode)?.isUma;
    const hiddenCommand = isUmaMode ? `[SYSTEM: MODEL_SWITCH_TO_${activeMode.toUpperCase()}]` : '';
    
    const userMessage: Message = { 
      role: 'user', 
      content: hiddenCommand ? `${hiddenCommand}\n${currentInput}` : currentInput,
      files: currentFiles.length > 0 ? currentFiles : undefined,
    };
    
    // 1. Determine/Create Conversation
    let chatId = conversationId;
    try {
      if (!chatId) {
        chatId = await createConversation(auth.currentUser!.uid, currentInput.slice(0, 50) || 'New Conversation');
        onConversationCreated(chatId);
      }

      // 2. Clear Input & Pendings
      if (!overrideInput) setInput('');
      setPendingFiles([]);
      setIsLoading(true);
      onThinking(true);

      // 3. Save User Message to Firestore
      await saveMessage(chatId, 'user', userMessage.content, userMessage.type || 'text', userMessage.imageUrl, userMessage.files);

      let fullResponse = '';
      const stream = generateChatResponseStream(userMessage.content, messages.slice(-10), activeMode, currentFiles, intelligenceLevel);
      
      let isFirstChunk = true;
      let finalGrounding: any[] | undefined;
      let modelText = '';

      for await (const chunk of stream) {
        if (isFirstChunk) {
          setIsLoading(false);
          onThinking(false);
          isFirstChunk = false;
        }
        
        if (chunk) {
          if (chunk.text) modelText += chunk.text;
          
          if (chunk.executableCode) {
            modelText += `\n\n\`\`\`${chunk.executableCode.language.toLowerCase()}\n${chunk.executableCode.code}\n\`\`\`\n`;
          }
          
          if (chunk.codeExecutionResult) {
            modelText += `\n\n**Output:**\n\`\`\`\n${chunk.codeExecutionResult.output}\n\`\`\`\n`;
          }

          if (chunk.urls && chunk.urls.length > 0) finalGrounding = chunk.urls;
          
          fullResponse = modelText;

          // Temporary local update for streaming effect
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'model') {
              return [...prev.slice(0, -1), { 
                ...last,
                content: fullResponse,
                groundingUrls: finalGrounding || last.groundingUrls
              }];
            }
            return [...prev, { role: 'model', content: fullResponse, groundingUrls: finalGrounding }];
          });
        }
      }

      // 4. Save Final Model Message to Firestore
      await saveMessage(chatId, 'model', fullResponse, 'text', undefined, finalGrounding);

      if (fullResponse && activeMode !== 'fast') {
        try {
          const audioData = await generateSpeech(fullResponse);
          if (audioData) playAudio(audioData);
        } catch (ttsError) {
          console.error("TTS Error:", ttsError);
        }
      }

      if (fullResponse.toLowerCase().includes('generate image') || fullResponse.toLowerCase().includes('make a picture')) {
        handleGenerateImage(currentInput, chatId);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMessage = 'Sorry, I encountered an error.';
      if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
        errorMessage = '⚠️ **Rate Limit Reached**: The free tier has reached its limit. Please wait a minute before sending another message, or clear the chat history to start fresh.';
      }
      setMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
    } finally {
      setIsLoading(false);
      onThinking(false);
    }
  };

  const handleGenerateImage = async (prompt: string, chatId?: string | null) => {
    onThinking(true);
    try {
      const imageUrl = await generateImage(prompt, "1K");
      if (imageUrl) {
        if (chatId || conversationId) {
          await saveMessage((chatId || conversationId)!, 'model', 'Here is the image I generated for you:', 'image', imageUrl);
        } else {
          setMessages(prev => [...prev, { 
            role: 'model', 
            content: 'Here is the image I generated for you:',
            type: 'image',
            imageUrl 
          }]);
        }
      }
    } catch (error: any) {
      console.error('Image gen error:', error);
      let errorMessage = 'Sorry, I encountered an error generating the image.';
      if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
        errorMessage = '⚠️ **Rate Limit Reached**: The free tier limit for image generation has been reached. Please wait a minute before trying again.';
      }
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: errorMessage
      }]);
    } finally {
      onThinking(false);
    }
  };

  const handleGenerateMusic = async (prompt: string, chatId?: string | null) => {
    onThinking(true);
    try {
      const audioData = await generateMusicAudio(prompt);
      if (audioData) {
        const fileObj: FileData = {
          mimeType: 'audio/mpeg',
          data: audioData,
          name: `uma-music-${Date.now()}.mp3`
        };
        
        if (chatId || conversationId) {
          await saveMessage((chatId || conversationId)!, 'model', 'I have composed a musical piece for you based on your description. Listen and download below.', 'audio', undefined, [fileObj]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'model', 
            content: 'I have composed a musical piece for you based on your description. Listen and download below.',
            type: 'audio',
            files: [fileObj]
          }]);
        }
      }
    } catch (error: any) {
      console.error('Music gen error:', error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: 'Sorry, I encountered an error generating the music.'
      }]);
    } finally {
      onThinking(false);
    }
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem('uma_chat_history');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 font-sans">
      <div className="h-10 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        <div className="flex items-center space-x-2">
          <Zap className={cn("w-3 h-3", activeMode === 'fast' && "text-emerald-500")} />
          <span>{MODES.find(m => m.id === activeMode)?.label}</span>
        </div>
        <button 
          onClick={handleClear}
          className="hover:text-red-500 transition-colors"
        >
          Clear History
        </button>
      </div>
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
                {msg.files && msg.files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.files.map((file, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-zinc-800/50 p-2 rounded-lg border border-zinc-700/50">
                        {file.mimeType?.startsWith('image/') ? (
                          <img src={`data:${file.mimeType};base64,${file.data}`} alt={file.name} className="w-8 h-8 object-cover rounded" />
                        ) : file.mimeType?.startsWith('audio/') ? (
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => playAudio(file.data)}
                              className="p-1.5 bg-emerald-600/20 text-emerald-500 rounded hover:bg-emerald-600/30 transition-colors"
                              title="Play"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => downloadAudio(file.data, file.name || 'uma-audio.mp3')}
                              className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:text-white transition-colors"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  const blob = await (await fetch(`data:${file.mimeType};base64,${file.data}`)).blob();
                                  const shareFile = new File([blob], file.name || 'uma-audio.mp3', { type: file.mimeType });
                                  if (navigator.share) {
                                    await navigator.share({
                                      files: [shareFile],
                                      title: 'UMA Audio Composition',
                                      text: 'Check out this AI-generated audio from UMA!'
                                    });
                                  } else {
                                    alert('Sharing not supported on this browser.');
                                  }
                                } catch (err) {
                                  console.error('Share error:', err);
                                }
                              }}
                              className="p-1.5 bg-zinc-800 text-zinc-400 rounded hover:text-white transition-colors"
                              title="Share"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <FileIcon className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className="text-[10px] truncate max-w-[100px]">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {msg.type === 'image' && msg.imageUrl && (
                  <div className="mt-3 group relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900/50">
                    <img src={msg.imageUrl} alt="Generated" className="w-full h-auto" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                      <button 
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = msg.imageUrl!;
                          a.download = `uma-gen-${Date.now()}.png`;
                          a.click();
                        }}
                        className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-500 transition-all scale-90 group-hover:scale-100"
                        title="Download image"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (navigator.share) {
                            try {
                              const blob = await (await fetch(msg.imageUrl!)).blob();
                              const file = new File([blob], 'uma-image.png', { type: blob.type });
                              await navigator.share({
                                files: [file],
                                title: 'UMA Generated Image',
                                text: 'Check out this AI-generated image from UMA!'
                              });
                            } catch (err) {
                              console.error('Share error:', err);
                            }
                          } else {
                            // Fallback: Copy Link
                            navigator.clipboard.writeText(msg.imageUrl!);
                            alert('Image URL copied to clipboard!');
                          }
                        }}
                        className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 transition-all scale-90 group-hover:scale-100"
                        title="Share image"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center">
                      <Search className="w-3 h-3 mr-1" /> Sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.groundingUrls.map((url, idx) => (
                        <a 
                          key={idx} 
                          href={url.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-emerald-500 px-2 py-1 rounded border border-zinc-700 transition-colors flex items-center max-w-[200px]"
                        >
                          <span className="truncate">{url.title || url.uri}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {msg.role === 'model' && (
                  <div className="mt-2 pt-2 border-t border-zinc-800/50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopy(msg.content, i)}
                        className="p-1.5 text-zinc-500 hover:text-emerald-500 transition-colors rounded-md hover:bg-zinc-800"
                        title="Copy to clipboard"
                      >
                        {copiedId === i ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={async () => {
                          const audioData = await generateSpeech(msg.content);
                          if (audioData) {
                            playAudio(audioData);
                            // Add a small delay then offer download if in music mode
                            if (activeMode === 'music') {
                              downloadAudio(audioData, `uma-composition-${Date.now()}.wav`);
                            }
                          }
                        }}
                        className="p-1.5 text-zinc-500 hover:text-emerald-500 transition-colors rounded-md hover:bg-zinc-800"
                        title={activeMode === 'music' ? "Generate & Download Audio File" : "Play audio"}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      {activeMode === 'music' && (
                        <button
                          onClick={async () => {
                            const audioData = await generateSpeech(msg.content);
                            if (audioData) downloadAudio(audioData, `uma-composition-${Date.now()}.wav`);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-emerald-500 transition-colors rounded-md hover:bg-zinc-800"
                          title="Download Audio File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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

      <div className="p-4 border-t border-zinc-900 bg-zinc-950/50 backdrop-blur-xl pb-safe">
        {pendingFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {pendingFiles.map((file, idx) => (
              <div key={idx} className="relative group">
                <div className="flex items-center space-x-2 bg-zinc-800 p-2 rounded-xl border border-zinc-700">
                  {file.mimeType?.startsWith('image/') ? (
                    <img src={`data:${file.mimeType};base64,${file.data}`} alt={file.name} className="w-8 h-8 object-cover rounded" />
                  ) : (
                    <FileIcon className="w-4 h-4 text-emerald-500" />
                  )}
                  <span className="text-[10px] truncate max-w-[100px]">{file.name}</span>
                </div>
                <button 
                  onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={cn(
          "relative flex items-center bg-zinc-900 rounded-2xl border transition-all duration-300",
          activeMode === 'image_gen' ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-zinc-800 focus-within:border-emerald-500/50"
        )}>
          {activeMode === 'image_gen' && (
            <div className="absolute -top-8 left-0 flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
              <Sparkles className="w-3 h-3" />
              <span>Image Creation Mode</span>
            </div>
          )}
          {activeMode !== 'image_gen' && (
            <div className="absolute -top-8 left-0 flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <div className="flex items-center space-x-1 border-r border-zinc-800 pr-2 mr-2">
                <Globe className="w-3 h-3 text-sky-500" />
                <span>Senses: Active</span>
              </div>
              {MODES.find(m => m.id === activeMode)?.icon && React.createElement(MODES.find(m => m.id === activeMode)!.icon, { className: "w-3 h-3" })}
              <span>{MODES.find(m => m.id === activeMode)?.label}</span>
            </div>
          )}
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={activeMode === 'image_gen' ? "Describe the image you want to create..." : "Type in Nepali or English..."}
            className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-zinc-600"
          />
          <div className="flex items-center p-1.5 focus-within:z-10 border-l border-zinc-800">
            <button 
              onClick={() => handleSend()}
              disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
              className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-600/10 active:scale-95 flex items-center justify-center min-w-[42px] min-h-[42px]"
            >
              <Send className="w-5 h-5 translate-x-[1px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
