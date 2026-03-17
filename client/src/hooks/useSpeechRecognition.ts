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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const callbackRef = useRef<((text: string, audioBlob?: Blob) => void) | null>(null);
  const finalTextRef = useRef('');

  const isSupported = !!getSpeechRecognition();

  const startListening = useCallback((onResult: (text: string, audioBlob?: Blob) => void) => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return;

    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();

    callbackRef.current = onResult;
    finalTextRef.current = '';
    chunksRef.current = [];

    // Start audio recording in parallel
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (finalTextRef.current && callbackRef.current) {
          callbackRef.current(finalTextRef.current, blob);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
    }).catch(() => {
      // No mic access — still do transcription only
    });

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
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

      if (finalTranscript) {
        finalTextRef.current = finalTranscript.trim();
      }
    };

    recognition.onerror = () => {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      setTranscript('');
    };

    recognition.onend = () => {
      // Stop MediaRecorder — its onstop will fire the callback with text + blob
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      } else if (finalTextRef.current && callbackRef.current) {
        // No audio — call with text only
        callbackRef.current(finalTextRef.current, undefined);
      }
      setIsListening(false);
      setTranscript('');
    };

    recognition.start();
    setIsListening(true);
    setTranscript('');
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsListening(false);
    setTranscript('');
  }, []);

  return { isListening, transcript, isSupported, startListening, stopListening };
};
