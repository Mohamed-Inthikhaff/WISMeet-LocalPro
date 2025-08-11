'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useCallStateHooks, CallingState } from '@stream-io/video-react-sdk';
import { createSocket } from '@/lib/socket-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Clock } from 'lucide-react';
import { Message } from '@/lib/types/chat';
import { format } from 'date-fns';
import { logOnce } from '@/lib/logger';

interface MeetingChatProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TypingUser {
  userId: string;
  userName: string;
}

const MeetingChat = ({ meetingId, isOpen, onClose }: MeetingChatProps) => {
  const { user } = useUser();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  // Only ready when the panel is open, we have an id, and call is joined
  const isReady = Boolean(meetingId) && isOpen && callingState === CallingState.JOINED;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NEW: stable refs to prevent re-init loop
  const socketRef = useRef<any>(null);
  const connectedRef = useRef(false);
  const initRef = useRef<string | null>(null); // meetingId that initialized

  // Scroll on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Fetch messages (stable version)
  const fetchMessages = useCallback(async () => {
    if (!meetingId) return;
    setIsLoading(true);
    setError(null);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort('timeout'), 10000);
    try {
      const res = await fetch(`/api/chat/messages?meetingId=${encodeURIComponent(meetingId)}&limit=50`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) {
      if ((e as any).name !== 'AbortError') {
        console.error('fetchMessages failed', e);
        setError('Failed to load chat history');
      }
    } finally {
      clearTimeout(timer);
      setIsLoading(false);
    }
  }, [meetingId]);

  // ======= SOCKET INIT (singleton guarded) =======
  useEffect(() => {
    const ready = Boolean(meetingId) && isOpen && callingState === CallingState.JOINED;
    if (!user || !ready) return;

    // StrictMode / re-render guard
    if (initRef.current === meetingId && socketRef.current) {
      return;
    }

    initRef.current = meetingId;
    const s = createSocket();
    socketRef.current = s;

    const join = () => {
      s.emit('join_meeting', {
        meetingId,
        userId: user.id,
        userName: user.fullName || user.emailAddresses[0].emailAddress,
      });
    };

    const onConnect = () => {
      setIsConnected(true);
      join();
      void fetchMessages();
    };

    const onDisconnect = () => setIsConnected(false);
    const onConnectError = (err:any) => {
      console.error('socket connect_error', err);
      setIsConnected(false);
      setError('Failed to connect to chat server');
    };

    const handleNewMessage = (serverMsg: Message) => {
      setMessages(prev => {
        // de-dupe by _id
        if (prev.some(m => String(m._id) === String(serverMsg._id))) return prev;
        // replace optimistic if pending and same text/sender within 5s
        const idx = prev.findIndex(m =>
          m.pending &&
          m.senderId === serverMsg.senderId &&
          m.message === serverMsg.message &&
          Math.abs(new Date(m.timestamp).getTime() - new Date(serverMsg.timestamp).getTime()) < 5000
        );
        if (idx !== -1) {
          const clone = [...prev];
          clone[idx] = { ...serverMsg, pending: false };
          return clone;
        }
        return [...prev, { ...serverMsg, pending: false }];
      });
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    s.on('new_message', handleNewMessage);
    s.connect();

    // fetch once on open
    void fetchMessages();

    return () => {
      // important: don't clear initRef here; keeps StrictMode remount from double-initializing
      try {
        s.removeAllListeners();
        s.disconnect();
      } catch {}
    };
  }, [user, isOpen, callingState, meetingId, fetchMessages]);

  // DO NOT: extra fetch on open. (Prevents AbortError spam)
  // (Removed the old useEffect that fetched again when isOpen changed)

  // Typing indicator with debounce
  const handleTyping = useCallback(() => {
    const s = socketRef.current;
    if (!s || !user?.id) return;

    // Emit start
    s.emit('typing_start', {
      meetingId,
      userId: user.id,
      userName: user.fullName || user.emailAddresses[0]?.emailAddress || 'User'
    });

    // Debounced stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      s.emit('typing_stop', { meetingId, userId: user.id });
    }, 1200);
  }, [meetingId, user?.id]);

  // Send message (optimistic)
  const sendMessage = useCallback(() => {
    const s = socketRef.current;
    if (!newMessage.trim() || !user?.id || !meetingId) return;

    const text = newMessage.trim();
    const tempId = `tmp-${Date.now()}-${Math.random()}`;

    const optimistic: Message = {
      _id: tempId,
      meetingId,
      senderId: user.id,
      senderName: user.fullName || user.emailAddresses[0]?.emailAddress || 'User',
      senderAvatar: user.imageUrl,
      message: text,
      messageType: 'user',
      timestamp: new Date(),
      reactions: [],
      pending: true
    };

    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');

    if (!s || !isConnected) {
      // Optionally queue if you want offline compose; for now just return.
      return;
    }

    s.emit('send_message', {
      meetingId,
      message: text,
      senderId: user.id,
      senderName: user.fullName || user.emailAddresses[0]?.emailAddress || 'User',
      senderAvatar: user.imageUrl
    });
  }, [newMessage, user?.id, meetingId, isConnected]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  }, [handleTyping]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, []);

  const keyFor = (m: any, idx: number) => m._id?.toString?.() ?? `${m.senderId}-${m.timestamp ?? idx}-${idx}`;
  const formatTime = (ts: Date | string) => format(new Date(ts), 'HH:mm');
  const isOwnMessage = (m: Message) => m.senderId === user?.id;
  const getUserInitials = (name: string) =>
    name.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 shadow-2xl z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <h3 className="text-white font-semibold">Meeting Chat</h3>
              {isConnected ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400">Connecting…</span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-md transition-colors">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!isConnected && !error && (
              <div className="px-4 py-2 text-xs text-gray-400">Connecting to chat…</div>
            )}

            {isLoading && !error ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={fetchMessages} className="mt-2 text-blue-400 text-sm hover:underline">
                  Retry
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No messages yet</p>
                <p className="text-gray-500 text-xs mt-1">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={keyFor(message, index)} className={`flex gap-3 ${isOwnMessage(message) ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    isOwnMessage(message) ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-200'
                  }`}>
                    {message.senderAvatar ? (
                      <img src={message.senderAvatar} alt={message.senderName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getUserInitials(message.senderName)
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`flex-1 max-w-[70%] ${isOwnMessage(message) ? 'text-right' : ''}`}>
                    {message.messageType === 'system' ? (
                      <div className="text-center py-2">
                        <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">{message.message}</span>
                      </div>
                    ) : (
                      <>
                        <div className={`text-xs text-gray-400 mb-1 ${isOwnMessage(message) ? 'text-right' : ''}`}>
                          {message.senderName}
                        </div>
                        <div className={`rounded-lg px-3 py-2 ${
                          isOwnMessage(message) ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-200'
                        } ${message.failed ? 'opacity-50' : message.pending ? 'opacity-75' : ''}`}>
                          <p className="text-sm">{message.message}</p>
                          {message.failed && <p className="text-xs text-red-300 mt-1">Failed to send</p>}
                          {message.pending && !message.failed && <p className="text-xs text-blue-300 mt-1">Sending...</p>}
                        </div>
                        <div className={`text-xs text-gray-500 mt-1 flex items-center gap-1 ${isOwnMessage(message) ? 'justify-end' : ''}`}>
                          <Clock className="h-3 w-3" />
                          {formatTime(message.timestamp)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span>{typingUsers.map(u => u.userName).join(', ')} typing...</span>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 text-white placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!meetingId}  // allow typing even if socket connecting
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isConnected}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MeetingChat;