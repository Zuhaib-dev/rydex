import { useState, useCallback, useRef } from 'react';

export function useAudioListener() {
  const [isListening, setIsListening] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = useCallback(async (onTokenReceived: (token: string) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      setIsListening(true);
      
      // In a full implementation, we'd process analyser.getByteFrequencyData 
      // in a requestAnimationFrame loop to decode FSK signals back into the token string.
      console.log("Audio listener active, analyzing frequencies...");
      
    } catch (e) {
      console.error("Audio listening failed", e);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsListening(false);
  }, []);

  return { startListening, stopListening, isListening };
}
