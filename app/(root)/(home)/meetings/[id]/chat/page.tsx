'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';
import { MessageSquare, ArrowLeft, Clock, User, Send, Download } from 'lucide-react';
import { Message } from '@/lib/types/chat';
import { format } from 'date-fns';
import Link from 'next/link';

const MeetingChatHistory = () => {
  const params = useParams();
  const { user } = useUser();
  const meetingId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [meeting, setMeeting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        setIsLoading(true);
        
        // Fetch messages
        const messagesResponse = await fetch(`/api/chat/messages?meetingId=${meetingId}&limit=100`);
        if (!messagesResponse.ok) {
          throw new Error('Failed to fetch messages');
        }
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);

        // Fetch meeting details
        const meetingResponse = await fetch(`/api/chat/meetings?meetingId=${meetingId}`);
        if (meetingResponse.ok) {
          const meetingData = await meetingResponse.json();
          if (meetingData.meetings && meetingData.meetings.length > 0) {
            setMeeting(meetingData.meetings[0]);
          }
        }

      } catch (err) {
        console.error('Error fetching chat history:', err);
        setError('Failed to load chat history');
      } finally {
        setIsLoading(false);
      }
    };

    if (meetingId) {
      fetchChatHistory();
    }
  }, [meetingId]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setIsExporting(true);
      const response = await fetch(`/api/chat/export?meetingId=${meetingId}&format=${format}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${meetingId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${meetingId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting chat:', error);
      alert('Failed to export chat');
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (timestamp: Date | string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  const formatDate = (timestamp: Date) => {
    return format(new Date(timestamp), 'MMM dd, yyyy');
  };

  const isOwnMessage = (message: Message) => {
    return message.senderId === user?.id;
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <Link 
            href="/"
            className="text-blue-400 hover:underline"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
              
              <div className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-blue-400" />
                <h1 className="text-xl font-semibold text-white">
                  Meeting Chat History
                </h1>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          {meeting && (
            <div className="mt-2 text-gray-400 text-sm">
              <p className="flex items-center gap-2">
                <span className="font-medium">{meeting.title}</span>
                <span>•</span>
                <Clock className="h-4 w-4" />
                <span>{formatDate(meeting.startTime)}</span>
                <span>•</span>
                <span>{messages.length} messages</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Messages</h3>
              <p className="text-gray-500">This meeting had no chat messages.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <motion.div
                  key={message._id?.toString() || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex"
                >
                  {message.messageType === 'system' ? (
                    // System message
                    <div className="w-full text-center">
                      <span className="inline-block bg-gray-800 text-gray-400 text-sm px-4 py-2 rounded-full">
                        {message.message}
                      </span>
                      <div className="text-gray-500 text-xs mt-1">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  ) : (
                    // User message
                    <div className={`flex w-full ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md ${isOwnMessage(message) ? 'order-2' : 'order-1'}`}>
                        {/* User info */}
                        {!isOwnMessage(message) && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                              <span className="text-sm text-white font-medium">
                                {getUserInitials(message.senderName)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{message.senderName}</p>
                              <p className="text-xs text-gray-400">{formatTime(message.timestamp)}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Message bubble */}
                        <div className={`px-4 py-3 rounded-lg ${
                          isOwnMessage(message)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-white'
                        }`}>
                          <p className="text-sm leading-relaxed">{message.message}</p>
                          
                          {/* Message footer */}
                          <div className={`flex items-center gap-2 mt-2 ${
                            isOwnMessage(message) ? 'justify-end' : 'justify-start'
                          }`}>
                            {isOwnMessage(message) && (
                              <span className="text-xs opacity-70">
                                {formatTime(message.timestamp)}
                              </span>
                            )}
                            
                            {/* Reactions */}
                            {message.reactions.length > 0 && (
                              <div className="flex gap-1">
                                {message.reactions.map((reaction, reactionIndex) => (
                                  <span key={reactionIndex} className="text-xs bg-gray-800 px-2 py-1 rounded">
                                    {reaction.emoji}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingChatHistory; 