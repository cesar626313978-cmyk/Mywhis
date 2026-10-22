import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseVozIASpeechOptions {
  maxDurationSeconds?: number; // 2400s (40 minutes)
  onMaxDurationReached?: () => void;
}

export interface UseVozIASpeechReturn {
  isRecording: boolean;
  isPaused: boolean;
  isTranscribingBackup: boolean;
  liveTranscript: string;
  recordingSeconds: number;
  wordCount: number;
  wakeLockActive: boolean;
  screenOffActive: boolean;
  hasBackupAudio: boolean;
  micPermissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
  notificationPermissionState: NotificationPermission | 'unsupported';
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<string>;
  transcribeBackupWithGemini: (customPrompt?: string) => Promise<string>;
  setLiveTranscript: (text: string) => void;
  clearLiveTranscript: () => void;
  clearError: () => void;
  requestMicPermission: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

export function useVozIASpeech(options?: UseVozIASpeechOptions): UseVozIASpeechReturn {
  const maxDurationSeconds = options?.maxDurationSeconds || 2400; // 40 min

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTranscribingBackup, setIsTranscribingBackup] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscriptState] = useState<string>('');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [screenOffActive, setScreenOffActive] = useState<boolean>(false);
  const [hasBackupAudio, setHasBackupAudio] = useState<boolean>(false);
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [notificationPermissionState, setNotificationPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const backupBlobRef = useRef<Blob | null>(null);
  const silentAudioCtxRef = useRef<AudioContext | null>(null);
  const silentOscillatorRef = useRef<OscillatorNode | null>(null);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeAccumulatorRef = useRef<number>(0);
  const lastPauseStartRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const accumulatedFinalTextRef = useRef<string>('');
  const wakeLockRef = useRef<any>(null);

  // Helper for word count
  const calculateWords = (text: string): number => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  };

  const wordCount = calculateWords(liveTranscript);

  // Check initial permissions
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermissionState(Notification.permission);
    } else {
      setNotificationPermissionState('unsupported');
    }

    if (navigator?.permissions?.query) {
      navigator.permissions.query({ name: 'microphone' as any })
        .then((status) => {
          setMicPermissionState(status.state as any);
          status.onchange = () => {
            setMicPermissionState(status.state as any);
          };
        })
        .catch(() => {
          // Fallback if query not supported for microphone
        });
    }
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicPermissionState('unsupported');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionState('granted');
      setErrorMessage(null);
      return true;
    } catch (err: any) {
      console.warn('Microphone permission check denied:', err);
      setMicPermissionState('denied');
      return false;
    }
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const res = await Notification.requestPermission();
      setNotificationPermissionState(res);
      return res;
    } catch (err) {
      console.warn('Notification permission error:', err);
      return 'denied';
    }
  }, []);

  const clearLiveTranscript = useCallback(() => {
    accumulatedFinalTextRef.current = '';
    setLiveTranscriptState('');
  }, []);

  const setLiveTranscript = useCallback((text: string) => {
    accumulatedFinalTextRef.current = text;
    setLiveTranscriptState(text);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Request Wake Lock
  const acquireWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        const lock = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = lock;
        setWakeLockActive(true);
        setScreenOffActive(true);
        lock.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch (err) {
        console.warn('Wake Lock request error:', err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (e) {}
      wakeLockRef.current = null;
      setWakeLockActive(false);
      setScreenOffActive(false);
    }
  };

  // Start Silent Audio Context loop for background screen-off survival in mobile browsers
  const startSilentAudioLoop = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      silentAudioCtxRef.current = ctx;

      // Inaudible oscillator (frequency 20Hz, gain virtually 0)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(25, ctx.currentTime);
      gain.gain.setValueAtTime(0.00001, ctx.currentTime); // silent
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      silentOscillatorRef.current = osc;

      // Update MediaSession
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Mywhis - Grabación Activa',
          artist: 'Sesión continua de hasta 40 min',
          album: 'Mywhis Engine',
        });
        navigator.mediaSession.playbackState = 'playing';
      }
    } catch (e) {
      console.warn('Silent audio loop init notice:', e);
    }
  };

  const stopSilentAudioLoop = () => {
    if (silentOscillatorRef.current) {
      try {
        silentOscillatorRef.current.stop();
        silentOscillatorRef.current.disconnect();
      } catch (e) {}
      silentOscillatorRef.current = null;
    }
    if (silentAudioCtxRef.current) {
      try {
        silentAudioCtxRef.current.close();
      } catch (e) {}
      silentAudioCtxRef.current = null;
    }
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch (e) {}
    }
  };

  // Watch visibility change: if returning from screen off, refresh wake lock and resume audio ctx
  useEffect(() => {
    const handleVisibility = () => {
      if (isRecordingRef.current && !isPausedRef.current) {
        if (silentAudioCtxRef.current && silentAudioCtxRef.current.state === 'suspended') {
          silentAudioCtxRef.current.resume().catch(() => {});
        }
        if (document.visibilityState === 'visible') {
          acquireWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Web Speech recognition setup & automatic reconnection
  const setupSpeechRecognition = () => {
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionClass) {
      return null;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';
      recognition.maxAlternatives = 1;

      let sessionBaseText = accumulatedFinalTextRef.current;

      recognition.onresult = (event: any) => {
        let currentFinals = '';
        let currentInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            currentFinals += (currentFinals ? ' ' : '') + res[0].transcript.trim();
          } else {
            currentInterim += res[0].transcript;
          }
        }

        const combinedFinal = sessionBaseText
          ? `${sessionBaseText} ${currentFinals}`.trim()
          : currentFinals.trim();

        const fullText = (
          combinedFinal + (currentInterim ? (combinedFinal ? ' ' : '') + currentInterim.trim() : '')
        ).trim();

        if (fullText) {
          accumulatedFinalTextRef.current = fullText;
          setLiveTranscriptState(fullText);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('SpeechRecognition warning:', e.error);
        }
      };

      recognition.onend = () => {
        // Auto-reconnection logic when user is still actively recording
        if (isRecordingRef.current && !isPausedRef.current) {
          sessionBaseText = accumulatedFinalTextRef.current;
          try {
            recognition.start();
          } catch (e) {
            // Already started or busy
          }
        }
      };

      return recognition;
    } catch (e) {
      console.warn('SpeechRecognition creation error:', e);
      return null;
    }
  };

  // Start recording
  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    recordedChunksRef.current = [];
    backupBlobRef.current = null;
    setHasBackupAudio(false);

    // 1. Request microphone
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicPermissionState('unsupported');
      setErrorMessage('Tu navegador no soporta captura de micrófono (getUserMedia).');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      mediaStreamRef.current = stream;
      setMicPermissionState('granted');
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicPermissionState('denied');
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Permiso de micrófono denegado. Permite el acceso al micrófono en el icono del candado o en los ajustes del navegador.'
          : `Error al acceder al micrófono: ${err.message || err.name}`
      );
      return;
    }

    // 2. WakeLock & Silent Audio Loop
    await acquireWakeLock();
    startSilentAudioLoop();

    // 3. Optional Background Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Mywhis', {
          body: 'Grabación de voz activa. Puedes apagar la pantalla sin perder el dictado.',
          icon: '/icon.svg',
          tag: 'mywhis-recording',
        });
      } catch (e) {}
    }

    // 4. Parallel Backup MediaRecorder
    try {
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start(500); // 500ms chunks for low memory overhead
    } catch (err) {
      console.warn('Backup MediaRecorder initialization notice:', err);
    }

    // 5. SpeechRecognition
    const recognition = setupSpeechRecognition();
    recognitionRef.current = recognition;
    if (recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.warn('Recognition start error:', e);
      }
    }

    // 6. Timers & State
    isRecordingRef.current = true;
    isPausedRef.current = false;
    startTimeRef.current = Date.now();
    pausedTimeAccumulatorRef.current = 0;
    lastPauseStartRef.current = 0;
    setIsRecording(true);
    setIsPaused(false);

    timerRef.current = setInterval(() => {
      if (startTimeRef.current > 0 && !isPausedRef.current) {
        const totalElapsed = Math.floor(
          (Date.now() - startTimeRef.current - pausedTimeAccumulatorRef.current) / 1000
        );
        setRecordingSeconds(totalElapsed);
        if (totalElapsed >= maxDurationSeconds) {
          options?.onMaxDurationReached?.();
        }
      }
    }, 500);
  }, [maxDurationSeconds, options]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (!isRecordingRef.current || isPausedRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);
    lastPauseStartRef.current = Date.now();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.pause();
      } catch (e) {}
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (!isRecordingRef.current || !isPausedRef.current) return;
    if (lastPauseStartRef.current > 0) {
      pausedTimeAccumulatorRef.current += Date.now() - lastPauseStartRef.current;
      lastPauseStartRef.current = 0;
    }
    isPausedRef.current = false;
    setIsPaused(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      try {
        mediaRecorderRef.current.resume();
      } catch (e) {}
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<string> => {
    isRecordingRef.current = false;
    isPausedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);

    await releaseWakeLock();
    stopSilentAudioLoop();

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder and build backup Blob
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 600);
          recorder.onstop = () => {
            clearTimeout(timeout);
            resolve();
          };
          try {
            if (recorder.state === 'recording' || recorder.state === 'paused') {
              recorder.stop();
            }
          } catch (e) {
            clearTimeout(timeout);
            resolve();
          }
        });

        if (recordedChunksRef.current.length > 0) {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          backupBlobRef.current = blob;
          setHasBackupAudio(blob.size > 200);
        }
      } catch (e) {
        console.warn('MediaRecorder stop notice:', e);
      }
    }

    // Stop tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    return accumulatedFinalTextRef.current;
  }, []);

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

  // Transcribe backup audio with Gemini
  const transcribeBackupWithGemini = useCallback(async (customPrompt?: string): Promise<string> => {
    if (!backupBlobRef.current || backupBlobRef.current.size < 50) {
      throw new Error('No hay grabación de audio de respaldo disponible');
    }

    setIsTranscribingBackup(true);
    setErrorMessage(null);
    try {
      const audioBase64 = await blobToBase64(backupBlobRef.current);
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: backupBlobRef.current.type || 'audio/webm',
          liveTranscript: accumulatedFinalTextRef.current,
          customPrompt,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error en servidor (${res.status})`);
      }

      const data = await res.json();
      const serverText = (data.text || '').trim();
      if (serverText) {
        accumulatedFinalTextRef.current = serverText;
        setLiveTranscriptState(serverText);
        return serverText;
      }
      return accumulatedFinalTextRef.current;
    } catch (err: any) {
      const msg = err.message || 'Error al transcribir el audio de respaldo';
      setErrorMessage(msg);
      throw err;
    } finally {
      setIsTranscribingBackup(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      stopSilentAudioLoop();
      releaseWakeLock();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  return {
    isRecording,
    isPaused,
    isTranscribingBackup,
    liveTranscript,
    recordingSeconds,
    wordCount,
    wakeLockActive,
    screenOffActive,
    hasBackupAudio,
    micPermissionState,
    notificationPermissionState,
    errorMessage,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    transcribeBackupWithGemini,
    setLiveTranscript,
    clearLiveTranscript,
    clearError,
    requestMicPermission,
    requestNotificationPermission,
  };
}

export type UseMywhisSpeechOptions = UseVozIASpeechOptions;
export type UseMywhisSpeechReturn = UseVozIASpeechReturn;
export const useMywhisSpeech = useVozIASpeech;

