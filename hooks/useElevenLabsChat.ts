import { useConversation } from '@11labs/react';
import { useCallback, useState } from 'react';

interface ElevenLabsChatState {
  status: 'idle' | 'connected' | 'disconnected' | 'error';
  isSpeaking: boolean;
  error: string | null;
}

export const useElevenLabsChat = (agentId: string) => {
  const [state, setState] = useState<ElevenLabsChatState>({
    status: 'idle',
    isSpeaking: false,
    error: null,
  });

  const conversation = useConversation({
    onConnect: () => {
      console.log('ElevenLabs Connected');
      setState(prev => ({ ...prev, status: 'connected', error: null }));
    },
    onDisconnect: () => {
      console.log('ElevenLabs Disconnected');
      setState(prev => ({ ...prev, status: 'disconnected' }));
    },
    onMessage: (message) => {
      console.log('Message:', message);
    },
    onError: (error: string | Error) => {
      console.error('Error:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : error 
      }));
    },
  });

  const startConversation = useCallback(async () => {
    try {
      // Запрашиваем разрешение на использование микрофона
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Начинаем сессию с агентом
      await conversation.startSession({
        agentId,
      });

      setState(prev => ({ ...prev, status: 'connected', error: null }));
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }));
    }
  }, [conversation, agentId]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setState(prev => ({ ...prev, status: 'disconnected' }));
  }, [conversation]);

  return {
    ...state,
    startConversation,
    stopConversation,
    isSpeaking: conversation.isSpeaking,
  };
}; 