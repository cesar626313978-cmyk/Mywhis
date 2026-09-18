import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseSpeechRecognitionOptions {
  maxDurationSeconds?: number; // default: 2400 (40 min)
  onMaxDurationReached?: () => void;
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  waveform: number[];
  recordingSeconds: number;
  maxDurationSeconds: number;
  timeRemainingSeconds: number;
  wakeLockActive: boolean;
  isScreenOffSupported: boolean;
  hasPermission: boolean | null; // null = unprompted, true = granted, false = denied
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: (options?: { mode?: 'dictation' | 'conversation' }) => Promise<string>;
  clearTranscript: () => void;
  clearError: () => void;
  isSupported: boolean;
}

export function useRealSpeechRecognition(options?: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const maxDurationSeconds = options?.maxDurationSeconds || 2400; // 40 minutes max
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [waveform, setWaveform] = useState<number[]>([20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>('');
  const wakeLockRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const autoStopTriggeredRef = useRef<boolean>(false);
  const onMaxDurationReachedRef = useRef<(() => void) | undefined>(options?.onMaxDurationReached);

  useEffect(() => {
    onMaxDurationReachedRef.current = options?.onMaxDurationReached;
  }, [options?.onMaxDurationReached]);

  // Check Web Speech API support
  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window || !!navigator?.mediaDevices?.getUserMedia
  );

  const isScreenOffSupported = true;

  const clearTranscript = useCallback(() => {
    liveTranscriptRef.current = '';
    setTranscript('');
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Real-time audio waveform visualizer from microphone stream (pure passive listener, never routes to speakers)
  const startAudioAnalysis = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      // Connect source solely to analyser. Do NOT connect to audioCtx.destination to prevent speaker playback and phone AEC microphone gating.
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateWave = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        const points: number[] = [];
        const step = Math.max(1, Math.floor(dataArray.length / 10));
        for (let i = 0; i < 10; i++) {
          const val = dataArray[i * step] || 0;
          const normalized = Math.min(95, Math.max(15, Math.round((val / 255) * 100)));
          points.push(normalized);
        }
        setWaveform(points);
        animFrameRef.current = requestAnimationFrame(updateWave);
      };

      updateWave();
    } catch (e) {
      console.warn('Audio analysis visualizer error:', e);
    }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setWaveform([20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
  };

  // Convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle visibility changes (e.g. screen off or switching apps)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isRecordingRef.current) {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
        if (startTimeRef.current > 0) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setRecordingSeconds(elapsed);
          if (elapsed >= maxDurationSeconds && !autoStopTriggeredRef.current) {
            autoStopTriggeredRef.current = true;
            onMaxDurationReachedRef.current?.();
          }
        }
        if (document.visibilityState === 'visible' && 'wakeLock' in navigator && !wakeLockRef.current) {
          (navigator as any).wakeLock.request('screen').then((lock: any) => {
            wakeLockRef.current = lock;
            setWakeLockActive(true);
          }).catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [maxDurationSeconds]);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setTranscript('');
    liveTranscriptRef.current = '';
    setRecordingSeconds(0);
    recordedChunksRef.current = [];
    autoStopTriggeredRef.current = false;
    startTimeRef.current = Date.now();
    isRecordingRef.current = true;

    // 1. Request microphone access
    let stream: MediaStream | null = null;
    if (!navigator?.mediaDevices?.getUserMedia) {
      setHasPermission(false);
      setIsRecording(false);
      isRecordingRef.current = false;
      setErrorMessage('Tu navegador no admite captura de audio (getUserMedia).');
      return;
    }

    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: true,
            echoCancellation: false,
            noiseSuppression: false,
          }
        });
      } catch (specificErr) {
        // Fallback for browsers that only accept standard audio: true
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      mediaStreamRef.current = stream;
      setHasPermission(true);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setHasPermission(false);
      setIsRecording(false);
      isRecordingRef.current = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage(
          'Permiso de micrófono no concedido. Habilita el permiso en el navegador o en Ajustes > Aplicaciones > Permisos.'
        );
      } else {
        setErrorMessage('No se pudo acceder al micrófono (' + (err.message || err.name) + ').');
      }
      return;
    }

    // 2. Setup Screen Wake Lock if available (keeps screen awake unless user explicitly turns it off)
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = lock;
        setWakeLockActive(true);
        lock.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch (err) {
        console.warn('Wake Lock request:', err);
      }
    }

    // 3. Register MediaSession metadata for background & screen-off persistence
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Mywhis - Grabando con pantalla apagada o activa',
          artist: 'Límite máximo de 40 minutos',
          album: 'Mywhis Audio Engine'
        });
        navigator.mediaSession.playbackState = 'playing';
      } catch (e) {}
    }

    // 4. Setup MediaRecorder to capture real audio for transcription
    try {
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      recordedChunksRef.current = [];
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start(250); // Collect chunk every 250ms
    } catch (recorderErr) {
      console.warn('MediaRecorder error:', recorderErr);
    }

    // 5. Start live waveform with passive listener
    startAudioAnalysis(stream);

    // 6. Start accurate wall-clock timer (checks up to 40 minutes)
    timerRef.current = setInterval(() => {
      if (startTimeRef.current > 0) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= maxDurationSeconds && !autoStopTriggeredRef.current) {
          autoStopTriggeredRef.current = true;
          onMaxDurationReachedRef.current?.();
        }
      }
    }, 500);

    setIsRecording(true);

    // 7. Try SpeechRecognition as parallel live preview
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';

        let accumulated = '';

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const text = res[0].transcript;
            if (res.isFinal) {
              accumulated += (accumulated ? ' ' : '') + text.trim();
            } else {
              interim += text;
            }
          }
          const fullText = (accumulated + (interim ? ' ' + interim : '')).trim();
          liveTranscriptRef.current = fullText;
          setTranscript(fullText);
        };

        recognition.onerror = (e: any) => {
          console.warn('SpeechRecognition warning:', e.error);
        };

        recognition.onend = () => {
          // Keep recognition alive while recording is active
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognition.start();
      } catch (recErr) {
        console.warn('SpeechRecognition failed to start (MediaRecorder will transcribe):', recErr);
      }
    }
  }, [maxDurationSeconds]);

  const stopRecording = useCallback(async (options?: { mode?: 'dictation' | 'conversation' }): Promise<string> => {
    const recordingMode = options?.mode || 'dictation';
    setIsRecording(false);
    isRecordingRef.current = false;
    clearInterval(timerRef.current);

    // Release Wake Lock
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {}
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }

    // Reset MediaSession
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch (e) {}
    }

    // Stop browser recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    // Stop MediaRecorder and gather audio
    const recorder = mediaRecorderRef.current;
    let recordedBlob: Blob | null = null;

    if (recorder && recorder.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 800);
          recorder.onstop = () => {
            clearTimeout(timeout);
            resolve();
          };
          try {
            recorder.stop();
          } catch (e) {
            clearTimeout(timeout);
            resolve();
          }
        });

        if (recordedChunksRef.current.length > 0) {
          const mimeType = recorder.mimeType || 'audio/webm';
          recordedBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        }
      } catch (e) {
        console.warn('Error stopping MediaRecorder:', e);
      }
    }

    // Stop audio tracks after recorder finished flushing
    stopAudioAnalysis();

    const liveText = liveTranscriptRef.current.trim();

    // 1. Primary path: High-fidelity audio transcription with Gemini backend
    // Transcribes audio directly from MediaRecorder for maximum mobile accuracy, punctuation and 2-voice separation
    if (recordedBlob && recordedBlob.size > 200) {
      setIsTranscribing(true);
      try {
        const audioBase64 = await blobToBase64(recordedBlob);
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mimeType: recordedBlob.type || 'audio/webm',
            mode: recordingMode,
            liveTranscript: liveText,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || (res.status === 404 
            ? 'Ruta /api/transcribe no encontrada (404). Si estás en Vercel, asegúrate de haber desplegado la carpeta /api.' 
            : `Error en servidor (${res.status})`);
          console.warn('Error en /api/transcribe:', errMsg);
          if (res.status === 503 || res.status === 404) {
            setErrorMessage(errMsg);
          }
        } else {
          const data = await res.json();
          const serverText = (data.text || '').trim();

          if (serverText) {
            setTranscript(serverText);
            setIsTranscribing(false);
            return serverText;
          }
        }
      } catch (apiErr: any) {
        console.error('Error contacting /api/transcribe:', apiErr);
      } finally {
        setIsTranscribing(false);
      }
    }

    // 2. Fallback path: If audio upload was not available or server returned empty, improve live transcript
    if (liveText) {
      try {
        const res = await fetch('/api/improve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: liveText, mode: recordingMode }),
        });
        const data = await res.json();
        const improved = (data.text || liveText).trim();
        setTranscript(improved);
        setIsTranscribing(false);
        return improved;
      } catch (err) {
        const formatted = liveText.charAt(0).toUpperCase() + liveText.slice(1);
        setTranscript(formatted);
        setIsTranscribing(false);
        return formatted;
      }
    }

    return '';
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      stopAudioAnalysis();
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch (e) {}
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const timeRemainingSeconds = Math.max(0, maxDurationSeconds - recordingSeconds);

  return {
    isRecording,
    isTranscribing,
    transcript,
    waveform,
    recordingSeconds,
    maxDurationSeconds,
    timeRemainingSeconds,
    wakeLockActive,
    isScreenOffSupported,
    hasPermission,
    errorMessage,
    startRecording,
    stopRecording,
    clearTranscript,
    clearError,
    isSupported,
  };
}
