import { useState, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const getSpeechRecognition = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const callbackRef = useRef<((text: string) => void) | null>(null);

  const isSupported = !!getSpeechRecognition();

  const startListening = useCallback((onResult: (text: string) => void) => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return;

    recognitionRef.current?.stop();

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'uk-UA';

    callbackRef.current = onResult;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setTranscript(finalText || interimText);
      if (finalText) callbackRef.current?.(finalText.trim());
    };

    recognition.onerror = () => { setIsListening(false); setTranscript(''); };
    recognition.onend   = () => { setIsListening(false); setTranscript(''); };

    recognition.start();
    setIsListening(true);
    setTranscript('');
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setTranscript('');
  }, []);

  return { isListening, transcript, isSupported, startListening, stopListening };
};
