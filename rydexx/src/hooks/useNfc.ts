import { useState, useCallback, useEffect, useRef } from 'react';

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
  const abortControllerRef = useRef<AbortController | null>(null);

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsWriting(true);
      setError(null);
      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [{ recordType: 'text', data: textRecord }]
      }, { signal: controller.signal });
      
      setIsWriting(false);
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      if (err.name === 'NotSupportedError') {
        setIsSupported(false);
        setError('NFC hardware is missing or disabled on this device.');
      } else if (err.name === 'NotAllowedError') {
        setError('NFC permission was denied.');
      } else {
        console.error('NFC Write Error:', err);
        setError(err.message || 'Failed to broadcast via NFC');
      }
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsReading(true);
      setError(null);
      const ndef = new window.NDEFReader();
      await ndef.scan({ signal: controller.signal });

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
      if (err.name === 'AbortError') return false;
      if (err.name === 'NotSupportedError') {
        setIsSupported(false);
        setError('NFC hardware is missing or disabled on this device.');
      } else if (err.name === 'NotAllowedError') {
        setError('NFC permission was denied.');
      } else {
        console.error('NFC Scan Error:', err);
        setError(err.message || 'Failed to start NFC scan');
      }
      setIsReading(false);
      return false;
    }
  }, [isSupported]);

  const stopReading = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
