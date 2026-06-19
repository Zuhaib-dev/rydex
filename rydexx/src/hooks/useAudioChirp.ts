import { useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

export function useAudioChirp() {
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const broadcastToken = useCallback((token: string) => {
    try {
      setIsBroadcasting(true);
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) throw new Error("Web Audio API not supported");

      // Proxied data over websocket
      const socket = getSocket();
      socket.emit("audio-broadcast-start", token);

      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      // Audible chirp
      oscillator.frequency.setValueAtTime(2000, audioCtx.currentTime); 
      
      // Basic frequency modulation simulation
      oscillator.frequency.linearRampToValueAtTime(3000, audioCtx.currentTime + 0.2);
      oscillator.frequency.linearRampToValueAtTime(2000, audioCtx.currentTime + 0.4);

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
