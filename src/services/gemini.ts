import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const MODELS = {
  FLASH: "gemini-3-flash-preview",
  PRO: "gemini-3.1-pro-preview",
  IMAGE: "gemini-3.1-flash-image-preview",
  TTS: "gemini-2.5-flash-preview-tts",
  LIVE: "gemini-2.5-flash-native-audio-preview-09-2025",
};

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  type?: 'text' | 'image' | 'audio';
  imageUrl?: string;
}

export async function generateChatResponse(message: string, history: Message[] = []) {
  const response = await ai.models.generateContent({
    model: MODELS.PRO,
    contents: {
      parts: [{ text: message }],
    },
    config: {
      systemInstruction: "You are UMA (Universal Multimodal Assistant), a bilingual (Nepali/English) assistant. You are helpful, fast, and can handle complex reasoning. When asked to generate images, describe what you would generate and mention that you are triggering the image generator.",
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text;
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
        imageSize: size,
      },
      tools: [{ googleSearch: {} }],
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
          prebuiltVoiceConfig: { voiceName: 'Zephyr' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/pcm;base64,${base64Audio}`;
  }
  return null;
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
