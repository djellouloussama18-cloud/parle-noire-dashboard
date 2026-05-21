import { useEffect, useRef } from 'react';

export default function useBarcode(onScan) {
  const bufferRef = useRef([]);
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      
      // If interval between keypresses is very short, it's highly likely a scanner input
      // Scanners typically send keys with < 30ms latency
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Handle Enter key which marks end of barcode scan
      if (e.key === 'Enter') {
        if (bufferRef.current.length > 2) {
          const barcode = bufferRef.current.join('');
          console.log('🤖 Barcode scanned:', barcode);
          onScan(barcode);
          bufferRef.current = [];
        }
        return;
      }

      // Ignore modifiers
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') {
        return;
      }

      // If typing speed is human (e.g. > 100ms) and buffer is active, we might want to clear it,
      // but standard hardware scanners will complete the sequence in < 200ms.
      if (diff > 150) {
        bufferRef.current = []; // Clear slow inputs
      }

      // Only buffer letters and numbers
      if (e.key.length === 1) {
        bufferRef.current.push(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan]);
}
