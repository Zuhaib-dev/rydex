import { useState, useCallback } from 'react';

export function useAudioChirp() {
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const broadcastToken = useCallback((token: string) => {
    try {
      setIsBroadcasting(true);
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) throw new Error("Web Audio API not supported");

      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      // Start at 18kHz (sub-audible for most adults)
      oscillator.frequency.setValueAtTime(18000, audioCtx.currentTime); 
      
      // Basic frequency modulation simulation
      oscillator.frequency.linearRampToValueAtTime(19000, audioCtx.currentTime + 0.2);
      oscillator.frequency.linearRampToValueAtTime(18000, audioCtx.currentTime + 0.4);

      gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);

      setTimeout(() => setIsBroadcasting(false), 500);
      return true;
    } catch (e) {
      console.error("Audio broadcast failed", e);
      setIsBroadcasting(false);
      return false;
    }
  }, []);

  return { broadcastToken, isBroadcasting };
}
