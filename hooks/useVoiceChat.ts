import { useState, useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { convertToWav, playAudio } from '@/lib/utils/audio';

const WS_OPTIONS = {
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
};

interface VoiceChatState {
  isConnected: boolean;
  isRecording: boolean;
  error: string | null;
}

export const useVoiceChat = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<VoiceChatState>({
    isConnected: false,
    isRecording: false,
    error: null,
  });
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Инициализация WebSocket соединения
  const connect = useCallback(async () => {
    try {
      const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', WS_OPTIONS);
      
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setState(prev => ({ ...prev, isConnected: false }));
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setState(prev => ({ ...prev, error: `Ошибка подключения: ${error.message}` }));
      });

      newSocket.on('connect_timeout', () => {
        console.error('Connection timeout');
        setState(prev => ({ ...prev, error: 'Таймаут подключения' }));
      });

      newSocket.on('error', (err: Error) => {
        console.error('Socket error:', err);
        setState(prev => ({ ...prev, error: err.message }));
      });

      newSocket.on('audio-response', async (audioData: ArrayBuffer) => {
        try {
          await playAudio(audioData);
        } catch (err) {
          console.error('Audio playback error:', err);
          setState(prev => ({ ...prev, error: 'Ошибка воспроизведения аудио' }));
        }
      });

      setSocket(newSocket);
    } catch (err) {
      console.error('Socket initialization error:', err);
      setState(prev => ({ ...prev, error: 'Ошибка инициализации сокета' }));
    }
  }, []);

  // Начало записи и отправки аудио
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const wavBuffer = await convertToWav(audioBlob);
        socket?.emit('audio-data', wavBuffer);
      };

      recorder.start(1000); // Отправляем каждую секунду
      setMediaRecorder(recorder);
      setState(prev => ({ ...prev, isRecording: true }));
      socket?.emit('start-stream');
    } catch (err) {
      console.error('Media recording error:', err);
      setState(prev => ({ ...prev, error: 'Ошибка доступа к микрофону' }));
    }
  }, [socket]);

  // Остановка записи
  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setState(prev => ({ ...prev, isRecording: false }));
    }
  }, [mediaRecorder]);

  // Отключение при размонтировании компонента
  useEffect(() => {
    return () => {
      stopRecording();
      socket?.disconnect();
    };
  }, [socket, stopRecording]);

  return {
    ...state,
    connect,
    startRecording,
    stopRecording,
  };
}; 