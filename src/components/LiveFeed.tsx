import React, { useRef, useEffect, useState } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, Radio, StopCircle } from 'lucide-react';
import { connectLive } from '../services/gemini';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function LiveFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const toggleLive = async () => {
    if (isLive) {
      session?.close();
      setIsLive(false);
      setSession(null);
    } else {
      const liveSessionPromise = connectLive({
        onopen: () => {
          console.log("Live session opened");
          setIsLive(true);
        },
        onmessage: (message) => {
          // Handle audio output from Gemini
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            playAudio(base64Audio);
          }
        },
        onerror: (err) => console.error("Live error:", err),
        onclose: () => setIsLive(false),
      });

      const liveSession = await liveSessionPromise;
      setSession(liveSession);

      // Start streaming video frames and audio
      startStreaming(liveSession);
    }
  };

  const startStreaming = (liveSession: any) => {
    if (!stream) return;

    // Audio streaming
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (isMuted) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = convertFloat32ToPcm(inputData);
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
      liveSession.sendRealtimeInput({
        media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    // Video streaming (frames)
    const interval = setInterval(() => {
      if (isVideoOff || !canvasRef.current || !videoRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
        liveSession.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'image/jpeg' }
        });
      }
    }, 500); // Send frame every 500ms

    liveSession.onclose = () => {
      clearInterval(interval);
      processor.disconnect();
      source.disconnect();
      audioContext.close();
    };
  };

  const convertFloat32ToPcm = (buffer: Float32Array) => {
    const l = buffer.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      buf[i] = Math.min(1, buffer[i]) * 0x7FFF;
    }
    return buf;
  };

  const playAudio = (base64Data: string) => {
    const audioData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    const audioContext = new AudioContext({ sampleRate: 24000 });
    audioContext.decodeAudioData(audioData, (buffer) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    });
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          isVideoOff ? "opacity-0" : "opacity-100"
        )}
      />
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />

      {/* Overlay UI */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

      <div className="absolute top-4 left-4 flex items-center space-x-2">
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center space-x-2",
          isLive ? "bg-red-600 text-white animate-pulse" : "bg-zinc-800/80 text-zinc-400 backdrop-blur-md"
        )}>
          <Radio className="w-3 h-3" />
          <span>{isLive ? "Live" : "Standby"}</span>
        </div>
        {isLive && (
          <div className="bg-emerald-600/80 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
            Full Duplex
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-4 pointer-events-auto">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={cn(
            "p-4 rounded-full backdrop-blur-xl transition-all hover:scale-110",
            isMuted ? "bg-red-500/20 text-red-500 border border-red-500/50" : "bg-white/10 text-white border border-white/20"
          )}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          onClick={toggleLive}
          className={cn(
            "p-6 rounded-full transition-all hover:scale-105 shadow-2xl",
            isLive ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
          )}
        >
          {isLive ? <StopCircle className="w-8 h-8" /> : <Radio className="w-8 h-8" />}
        </button>

        <button
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={cn(
            "p-4 rounded-full backdrop-blur-xl transition-all hover:scale-110",
            isVideoOff ? "bg-red-500/20 text-red-500 border border-red-500/50" : "bg-white/10 text-white border border-white/20"
          )}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>
      </div>

      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
              <VideoOff className="w-10 h-10 text-zinc-600" />
            </div>
            <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Camera Paused</p>
          </div>
        </div>
      )}
    </div>
  );
}
