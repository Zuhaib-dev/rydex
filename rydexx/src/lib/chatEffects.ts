export function playNotificationSound(type: "send" | "receive" | "request") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();

    if (type === "send") {
      // Short pleasant pop
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      // Ramp frequency up quickly
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === "receive") {
      // Double ping (receive sound)
      // First ping
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(550, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.1);

      // Second ping, slightly delayed and higher pitch
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(750, audioCtx.currentTime + 0.06);
      gain2.gain.setValueAtTime(0.06, audioCtx.currentTime + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.06);
      osc2.stop(audioCtx.currentTime + 0.2);
    } else if (type === "request") {
      // Pleasant triple-ping for ride requests (higher urgency but premium feel)
      const playPing = (freq: number, delay: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
      };

      playPing(520, 0, 0.12);
      playPing(650, 0.08, 0.12);
      playPing(780, 0.16, 0.25);
    }
  } catch (e) {
    console.warn("[chatEffects] Sound playback failed:", e);
  }
}

export function triggerHapticFeedback() {
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(60); // 60ms soft pulse
    } catch (e) {
      // Ignore vibration errors (e.g. user permission or browser restrictions)
    }
  }
}
