import { useState, useCallback, useEffect } from 'react';

// Extend Window interface for TypeScript to recognize NDEFReader
declare global {
  interface Window {
    NDEFReader: any;
  }
}

export function useNfc() {
  const [isSupported, setIsSupported] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setIsSupported(true);
    }
  }, []);

  const write = useCallback(async (textRecord: string) => {
    if (!isSupported) {
      setError('NFC is not supported on this device/browser.');
      return false;
    }

    try {
      setIsWriting(true);
      setError(null);
      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [{ recordType: 'text', data: textRecord }]
      });
      setIsWriting(false);
      return true;
    } catch (err: any) {
      console.error('NFC Write Error:', err);
      setError(err.message || 'Failed to broadcast via NFC');
      setIsWriting(false);
      return false;
    }
  }, [isSupported]);

  const read = useCallback(async (onRead: (data: string) => void) => {
    if (!isSupported) {
      setError('NFC is not supported on this device/browser.');
      return false;
    }

    try {
      setIsReading(true);
      setError(null);
      const ndef = new window.NDEFReader();
      await ndef.scan();

      ndef.onreadingerror = () => {
        setError('Error reading NFC tag.');
      };

      ndef.onreading = (event: any) => {
        const textDecoder = new TextDecoder();
        for (const record of event.message.records) {
          if (record.recordType === 'text') {
            const text = textDecoder.decode(record.data);
            onRead(text);
          }
        }
      };

      return true;
    } catch (err: any) {
      console.error('NFC Scan Error:', err);
      setError(err.message || 'Failed to start NFC scan');
      setIsReading(false);
      return false;
    }
  }, [isSupported]);

  const stopReading = useCallback(async () => {
    // Note: NDEFReader doesn't have a direct stop() method in all implementations.
    // Usually handled by abort controllers if passed to scan(), but we'll keep it simple here.
    setIsReading(false);
  }, []);

  return {
    isSupported,
    isReading,
    isWriting,
    error,
    write,
    read,
    stopReading
  };
}
