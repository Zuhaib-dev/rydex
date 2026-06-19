import { useState, useCallback, useRef, useEffect } from 'react';
import { getSocket } from '@/lib/socket';

export function useAudioListener() {
  const [isListening, setIsListening] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const tokenCallbackRef = useRef<((token: string) => void) | null>(null);

  // Setup socket listener for the proxied token
  useEffect(() => {
    const socket = getSocket();
    const handleReceive = (token: string) => {
      if (tokenCallbackRef.current && isListening) {
         tokenCallbackRef.current(token);
      }
    };
    socket.on("audio-token-received", handleReceive);
    return () => {
      socket.off("audio-token-received", handleReceive);
    };
  }, [isListening]);

  const startListening = useCallback(async (onTokenReceived: (token: string) => void) => {
    try {
      tokenCallbackRef.current = onTokenReceived;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      setIsListening(true);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let triggerCooldown = false;

      const checkAudio = () => {
        if (!streamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        
        let maxVol = 0;
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > maxVol) maxVol = dataArray[i];
        }

        if (maxVol > 150 && !triggerCooldown) {
            // Heard a loud noise! Trigger the socket to ask for any active broadcasts
            getSocket().emit("audio-receive-trigger");
            triggerCooldown = true;
            setTimeout(() => triggerCooldown = false, 2000);
        }

        rafRef.current = requestAnimationFrame(checkAudio);
      };
      
      console.log("Audio listener active, analyzing frequencies...");
      checkAudio();
      
    } catch (e) {
      console.error("Audio listening failed", e);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  }, []);

  return { startListening, stopListening, isListening };
}
