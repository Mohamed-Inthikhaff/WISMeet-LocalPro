import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useCallStateHooks, CallingState } from '@stream-io/video-react-sdk';
import { createSocket } from '@/lib/socket-client';
import { Message } from '@/lib/types/chat';
import { logOnce } from '@/lib/logger';

interface UseChatProps {
  meetingId: string;
  isReady?: boolean; // Optional prop to control readiness
}

interface UseChatReturn {
  messages: Message[];
  sendMessage: (message: string) => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  typingUsers: Array<{ userId: string; userName: string }>;
}

export const useChat = ({ meetingId, isReady: externalIsReady }: UseChatProps): UseChatReturn => {
  const { user } = useUser();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  
  // Use external isReady if provided, otherwise compute from calling state
  const computedIsReady = Boolean(meetingId) && callingState === CallingState.JOINED;
  const isReady = externalIsReady !== undefined ? externalIsReady : computedIsReady;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => { 
      mountedRef.current = false; 
    };
  }, []);

  // Safe setter helper to prevent setState on unmounted component
  const safeSet = useCallback(<T,>(setter: (v: T) => void, v: T) => {
    if (mountedRef.current) setter(v);
  }, []);

  // Memoize fetch & add timeout
  const fetchMessages = useCallback(async () => {
    if (!meetingId) return;
    safeSet(setIsLoading, true);
    safeSet(setError, null);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(`/api/chat/messages?meetingId=${encodeURIComponent(meetingId)}&limit=50`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      safeSet(setMessages, msgs);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('fetchMessages failed', e);
      safeSet(setError, 'Failed to load chat history');
    } finally {
      clearTimeout(timer);
      safeSet(setIsLoading, false);
    }
  }, [meetingId, safeSet]);

  // Gate socket by readiness & clean up properly
  useEffect(() => {
    if (!user || !isReady) return;

    const s = createSocket();

    const join = () => {
      s.emit('join_meeting', {
        meetingId,
        userId: user.id,
        userName: user.fullName || user.emailAddresses[0].emailAddress
      });
    };

    const onConnect = () => {
      safeSet(setIsConnected, true);
      join();
      void fetchMessages(); // sync history on connect
    };
    const onReconnect = () => { void fetchMessages(); };
    const onConnectError = (err: any) => {
      // eslint-disable-next-line no-console
      console.error('socket connect_error', err);
      safeSet(setIsConnected, false);
      safeSet(setError, 'Failed to connect to chat server');
    };
    const onDisconnect = () => {
      safeSet(setIsConnected, false);
    };

    const handleNewMessage = (message: Message) => {
      safeSet(setMessages, prev => [...prev, message]);
    };

    const handleUserTyping = (data: { userId: string; userName: string }) => {
      safeSet(setTypingUsers, prev => {
        const existing = prev.find(u => u.userId === data.userId);
        if (existing) return prev;
        return [...prev, { userId: data.userId, userName: data.userName }];
      });
    };

    const handleUserStoppedTyping = (data: { userId: string }) => {
      safeSet(setTypingUsers, prev => prev.filter(u => u.userId !== data.userId));
    };

    const handleUserJoined = (data: { userId: string; userName: string }) => {
      logOnce(`user-joined-${data.userId}`, `User ${data.userName} joined the meeting`);
      // Add system message for user joined
      const systemMessage: Message = {
        meetingId,
        senderId: 'system',
        senderName: 'System',
        message: `${data.userName} joined the meeting`,
        messageType: 'system',
        timestamp: new Date(),
        isEdited: false,
        reactions: []
      };
      safeSet(setMessages, prev => [...prev, systemMessage]);
    };

    const handleUserLeft = (data: { userId: string; userName: string }) => {
      logOnce(`user-left-${data.userId}`, `User ${data.userName} left the meeting`);
      // Add system message for user left
      const systemMessage: Message = {
        meetingId,
        senderId: 'system',
        senderName: 'System',
        message: `${data.userName} left the meeting`,
        messageType: 'system',
        timestamp: new Date(),
        isEdited: false,
        reactions: []
      };
      safeSet(setMessages, prev => [...prev, systemMessage]);
    };

    const handleError = (data: { message: string }) => {
      safeSet(setError, data.message);
    };

    s.on('connect', onConnect);
    s.io.on?.('reconnect', onReconnect);
    s.on('connect_error', onConnectError);
    s.on('disconnect', onDisconnect);
    s.on('new_message', handleNewMessage);
    s.on('user_typing', handleUserTyping);
    s.on('user_stopped_typing', handleUserStoppedTyping);
    s.on('user_joined', handleUserJoined);
    s.on('user_left', handleUserLeft);
    s.on('error', handleError);

    // Connect manually when ready
    s.connect();
    setSocket(s);
    // Also fetch when hook initializes
    void fetchMessages();

    return () => {
      s.removeListener('connect', onConnect);
      s.io.off?.('reconnect', onReconnect);
      s.removeListener('connect_error', onConnectError);
      s.removeListener('disconnect', onDisconnect);
      s.removeListener('new_message', handleNewMessage);
      s.removeListener('user_typing', handleUserTyping);
      s.removeListener('user_stopped_typing', handleUserStoppedTyping);
      s.removeListener('user_joined', handleUserJoined);
      s.removeListener('user_left', handleUserLeft);
      s.removeListener('error', handleError);
      s.removeAllListeners();
      s.disconnect();
    };
  }, [user, isReady, meetingId, fetchMessages, safeSet]);

  // Send message function
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !user || !socket) return;

    const messageData = {
      meetingId,
      message: message.trim(),
      senderId: user.id,
      senderName: user.fullName || user.emailAddresses[0].emailAddress,
      senderAvatar: user.imageUrl
    };

    try {
      // Send via socket for real-time
      socket.emit('send_message', messageData);
      
      // Also save via API for persistence
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      safeSet(setError, 'Failed to send message');
    }
  }, [meetingId, user, socket, safeSet]);

  return {
    messages,
    sendMessage,
    isConnected,
    isLoading,
    error,
    typingUsers
  };
}; 