import { useState, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const getSpeechRecognition = () => {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const callbackRef = useRef<((text: string) => void) | null>(null);

  const isSupported = !!getSpeechRecognition();

  const startListening = useCallback((onResult: (text: string) => void) => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    callbackRef.current = onResult;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript && callbackRef.current) {
        callbackRef.current(finalTranscript.trim());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript('');
    };

    recognition.start();
    setIsListening(true);
    setTranscript('');
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript('');
  }, []);

  return { isListening, transcript, isSupported, startListening, stopListening };
};
