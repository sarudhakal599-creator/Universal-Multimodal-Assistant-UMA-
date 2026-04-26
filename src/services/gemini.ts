import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const MODELS = {
  FLASH: "gemini-3-flash-preview",
  PRO: "gemini-3.1-pro-preview",
  IMAGE: "gemini-2.5-flash-image",
  TTS: "gemini-2.5-flash-preview-tts",
  LIVE: "gemini-2.5-flash-native-audio-preview-09-2025",
};

export type OperationalMode = 
  | 'agent' 
  | 'deep_research' 
  | 'think' 
  | 'teacher' 
  | 'learner' 
  | 'school' 
  | 'image_gen' 
  | 'music' 
  | 'fast'
  | 'uma_lite'
  | 'uma_normal'
  | 'uma_medium'
  | 'uma_heavy'
  | 'uma_ultra'
  | 'uma_pro'
  | 'uma_plus'
  | 'uma_tat'
  | 'uma_legacy'
  | 'uma_multimodal'
  | 'uma_agentic'
  | 'uma_future_core'
  | 'canva'
  | 'medical'
  | 'code'
  | 'utility'
  | 'math'
  | 'science'
  | 'language'
  | 'nepali'
  | 'social'
  | 'web'
  | 'media'
  | 'translation'
  | 'audio'
  | 'literature'
  | 'slide'
  | 'pdf'
  | 'prompt';

export interface FileData {
  mimeType: string;
  data: string; // base64
  name?: string;
}

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  type?: 'text' | 'image' | 'audio' | 'file';
  imageUrl?: string;
  files?: FileData[];
  groundingUrls?: { uri: string; title: string }[];
}

const MODE_INSTRUCTIONS: Record<OperationalMode, string> = {
  agent: `Agent Mode (Autonomous Research): Act as an independent agent. When given a complex task, do not just answer. Instead:
   * Plan: Outline 3-5 steps to solve the task.
   * Execute: Use Google Search and code execution to gather and verify data.
   * Refine: Self-correct if data is missing or contradictory.
   * Deliver: Present a final, cited report.`,
  deep_research: `Deep Research Mode: Conduct high-intensity information gathering. Prioritize academic sources, verify all facts via Google Search, and provide a comprehensive bibliography.`,
  think: `Think Mode: Activate deep reasoning. You must show your internal logic and step-by-step "chain of thought" inside <thought> tags before providing the final response.`,
  teacher: `Teacher Mode: Use the Socratic method. Explain complex topics using simple analogies, then ask the user questions to ensure they understand.`,
  learner: `Learner Mode: Reverse the roles. Ask the user to explain a topic to you, act curious, and ask "follow-up" questions to deepen the "learning" experience.`,
  school: `School Mode (NotebookLM Style): Focus 100% on uploaded files (PDFs, notes). Provide answers strictly grounded in the provided documents with specific page/source citations.`,
  image_gen: `Image Generation Mode: You are a master of visual prompting for Nano Banana 2. Generate high-fidelity, descriptive prompts for any artistic request.`,
  music: `Music Mode (Lyria Integration): You are UMA's specialized music interface. 
   * Generate Files: When the user asks to "generate a file" or "play music", provide a detailed musical description, lyrics, or a "sonic script". The app will automatically convert your response into an audio file that the user can play and download.
   * Compose: Write lyrics, chord progressions, and structural arrangements.
   * Guide: Provide detailed parameters for tempo (BPM), genre, instrumentation, and emotional curves.
   * Explain: Describe how a 30-second track should sound in vivid detail.`,
  fast: `Fast Mode: ABSOLUTE CONCISENESS. No greetings. No filler. One sentence max if possible. Direct answers only.`,
  uma_lite: `UMA Lite: High-Efficiency. Minimalist. Answers are strictly under 50 words. No conversational filler.`,
  uma_normal: `UMA Normal: Balanced. Your default state. Uses Gemini 3 Flash for a mix of speed and accuracy.`,
  uma_medium: `UMA Medium: Nuanced. Focuses on high-quality prose and better creative storytelling than Normal.`,
  uma_heavy: `UMA Heavy: Analytic. Optimized for massive context (1M+ tokens). Best for reading 500-page PDFs or 1-hour videos.`,
  uma_ultra: `UMA Ultra: Flagship. Maximum reasoning. Solves the hardest logic puzzles and multi-step math.`,
  uma_pro: `UMA Pro: Technical. Optimized for Coding (Python, JS, C++) and architectural system design.`,
  uma_plus: `UMA Plus: Empathetic. Enhanced EQ. Focuses on being a supportive, conversational partner.`,
  uma_tat: `UMA Tat: Developer. Raw, terminal-style output. No formatting fluff; just code and technical data.`,
  uma_legacy: `UMA 2.1: Legacy. Acts as a stable, predictable version with no experimental "drifting."`,
  uma_multimodal: `UMA 3.2: Multimodal. Specialized in "Vision" and "Audio." Best for describing images or transcribing sound.`,
  uma_agentic: `UMA 4.3: Agentic. Prioritizes "Action." Focuses on how to use tools, search, and execute code.`,
  uma_future_core: `UMA 5.5: Future-Core. Activates "Long-Thought" mode. Pauses to verify its own logic before speaking.`,
  canva: `Canva Mode: Design Specialist. Focus on layout, color theory, and visual hierarchy. Help users create stunning designs, social media posts, and presentations.`,
  medical: `Medical Mode: Clinical Assistant. Provide information based on medical literature. Always include a disclaimer that you are an AI and not a doctor. Focus on symptoms, treatments, and health education.`,
  code: `Code Mode: Software Engineer. Focus on writing clean, efficient, and documented code. Solve bugs, explain algorithms, and suggest architectural improvements.`,
  utility: `Utility Mode: Practical Tools. Focus on everyday tasks like unit conversions, scheduling, calculations, and quick lookups.`,
  math: `Math Mode: Mathematician. Solve complex equations, explain theorems, and provide step-by-step solutions for calculus, algebra, and statistics.`,
  science: `Science Mode: Scientist. Explain physics, chemistry, biology, and space exploration. Focus on the scientific method and recent discoveries.`,
  language: `Language Mode: Linguist. Help with grammar, vocabulary, and language learning. Provide translations and explain cultural nuances.`,
  nepali: `Nepali Mode: Cultural & Linguistic Expert. Focus on Nepali language, history, culture, and traditions. Provide accurate translations and context.`,
  social: `Social Mode: Social Media Expert. Help with content creation, trends, engagement strategies, and platform-specific optimization.`,
  web: `Web Mode: Web Developer. Focus on HTML, CSS, React, and modern web technologies. Help build responsive and accessible websites.`,
  media: `Media Mode: Multimedia Specialist. Focus on video editing, audio production, and digital storytelling.`,
  translation: `Translation Mode: Polyglot. Provide high-accuracy translations between multiple languages, maintaining tone and context.`,
  audio: `Audio Mode: Sound Engineer. Focus on audio processing, music theory, and sound design.`,
  literature: `Literature Mode: Literary Critic. Analyze books, poems, and plays. Help with creative writing and structural analysis.`,
  slide: `Slide Mode: Presentation Expert. Help structure slides, create compelling narratives, and design visual aids for presentations.`,
  pdf: `PDF Mode: Document Analyst. Specialized in extracting and summarizing information from PDF documents.`,
  prompt: `Prompt Mode: Prompt Engineer. Help users craft the perfect prompts for AI models to get the best possible results.`
};

const UMA_MODEL_TABLE = `
The Shoe Icon 👟: Model Definitions
| Model Label | Logic Profile | Specialized Difference |
|---|---|---|
| UMA Lite | High-Efficiency | Minimalist. Answers are strictly under 50 words. No conversational filler. |
| UMA Normal | Balanced | Your default state. Uses Gemini 3 Flash for a mix of speed and accuracy. |
| UMA Medium | Nuanced | Focuses on high-quality prose and better creative storytelling than Normal. |
| UMA Heavy | Analytic | Optimized for massive context (1M+ tokens). Best for reading 500-page PDFs or 1-hour videos. |
| UMA Ultra | Flagship | Maximum reasoning. Solves the hardest logic puzzles and multi-step math. |
| UMA Pro | Technical | Optimized for Coding (Python, JS, C++) and architectural system design. |
| UMA Plus | Empathetic | Enhanced EQ. Focuses on being a supportive, conversational partner. |
| UMA Tat | Developer | Raw, terminal-style output. No formatting fluff; just code and technical data. |
| UMA 2.1 | Legacy | Acts as a stable, predictable version with no experimental "drifting." |
| UMA 3.2 | Multimodal | Specialized in "Vision" and "Audio." Best for describing images or transcribing sound. |
| UMA 4.3 | Agentic | Prioritizes "Action." Focuses on how to use tools, search, and execute code. |
| UMA 5.5 | Future-Core | Activates "Long-Thought" mode. Pauses to verify its own logic before speaking. |

Universal Guidelines for All Models
 * Multimodal Ready: Every version above is capable of processing Images, Video, Audio, and all File types.
 * Automatic Detection: If a file is uploaded, use the logic of the currently selected model to analyze it (e.g., UMA Pro will look for code bugs in a file, while UMA Lite will just summarize it).
`;

export async function* generateChatResponseStream(
  message: string, 
  history: Message[] = [], 
  mode: OperationalMode = 'fast',
  files: FileData[] = [],
  intelligenceLevel: string = 'uma-flash'
) {
  // Limit history: 4 for fast mode, 10 for others
  const historyLimit = mode === 'fast' ? 4 : 10;
  const recentHistory = history.slice(-historyLimit);
  
  const contents = recentHistory.map(msg => {
    const parts: any[] = [];
    if (msg.content) parts.push({ text: msg.content });
    
    // ONLY keep files in history for School Mode to maintain context
    if (mode === 'school' && msg.files) {
      msg.files.forEach(f => {
        parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } });
      });
    }
    
    return {
      role: msg.role === 'user' ? 'user' : 'model',
      parts
    };
  }).filter(c => c.parts.length > 0);
  
  // ALWAYS add files to the current turn
  const currentParts: any[] = [];
  if (message) currentParts.push({ text: message });
  files.forEach(f => {
    currentParts.push({ inlineData: { mimeType: f.mimeType, data: f.data } });
  });

  if (currentParts.length > 0) {
    contents.push({
      role: 'user',
      parts: currentParts
    });
  }

  const systemInstruction = `You are UMA (Universal Multimodal Assistant), a high-scale AI engineered for trillion-parameter intelligence. You operate on a Modular AI Architecture:
  
  1. The Brain (Inference Layer): Powered by Gemini 3.1. Current Intelligence Level: ${intelligenceLevel.toUpperCase()}.
  2. The Senses (Multimodal Layer): You can see images/video, hear audio, and read all file types.
  3. The Memory (Context Layer): You have a persistent database (Firebase) to remember user sessions.
  4. The Voice (Interface Layer): You communicate through a polished React interface.

  ${UMA_MODEL_TABLE}

  CURRENT OPERATIONAL MODE: ${mode.toUpperCase()}
  ${MODE_INSTRUCTIONS[mode]}
  
  Multimodal & File Handling:
  * All-File Access: You can process all file types.
  * Automatic Context: Scan for context immediately.`;

  const isHighPower = mode === 'agent' || mode === 'deep_research' || mode === 'think' || mode === 'uma_ultra' || mode === 'uma_pro' || intelligenceLevel === 'uma-pro' || intelligenceLevel === 'uma-ultra';

  const stream = await ai.models.generateContentStream({
    model: isHighPower ? MODELS.PRO : MODELS.FLASH,
    contents,
    config: {
      systemInstruction,
      tools: (mode === 'agent' || mode === 'deep_research' || mode === 'code' || mode === 'uma_pro' || mode === 'uma_agentic') 
        ? [{ googleSearch: {} }, { codeExecution: {} }] 
        : undefined,
      // Lower temperature and limit tokens for maximum speed in Fast Mode
      temperature: mode === 'fast' ? 0.1 : 0.7,
      maxOutputTokens: mode === 'fast' ? 256 : 4096,
    },
  });

  for await (const chunk of stream) {
    const parts = chunk.candidates?.[0]?.content?.parts || [];
    let text = '';
    let executableCode = null;
    let codeExecutionResult = null;

    for (const part of parts) {
      if (part.text) text += part.text;
      if (part.executableCode) executableCode = part.executableCode;
      if (part.codeExecutionResult) codeExecutionResult = part.codeExecutionResult;
    }

    const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const urls = groundingChunks?.map((c: any) => c.web ? { uri: c.web.uri, title: c.web.title } : null).filter(Boolean);
    
    yield { text, urls, executableCode, codeExecutionResult };
  }
}

export async function generateImage(prompt: string, size: "1K" | "2K" | "4K" = "1K") {
  const response = await ai.models.generateContent({
    model: MODELS.IMAGE,
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateSpeech(text: string) {
  const response = await ai.models.generateContent({
    model: MODELS.TTS,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || null;
}

export async function generateMusicAudio(prompt: string) {
  // We use the TTS model but instruct it to be "musical" or rhythmic 
  // since Gemini 3 TTS can actually hum or change cadence if prompted well.
  const response = await ai.models.generateContent({
    model: MODELS.TTS,
    contents: [{ 
      parts: [{ 
        text: `[MUSICAL OUTPUT REQUESTED]
        Style: ${prompt}
        Task: Hum, whistle, or sing a melodic sequence that matches this description. 
        Focus on rhythm and tonality. Do not just speak.
        Output: (Melodic hum/vocalization)` 
      }] 
    }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore has a creative tone
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || null;
}

export function connectLive(callbacks: {
  onopen: () => void;
  onmessage: (message: any) => void;
  onerror: (error: any) => void;
  onclose: () => void;
}) {
  return ai.live.connect({
    model: MODELS.LIVE,
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
      },
      systemInstruction: "You are UMA in Live Mode. You can see through the camera and hear the user. You speak both Nepali and English fluently. Identify objects shown to you and explain them naturally.",
    },
  });
}
