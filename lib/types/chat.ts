import { ObjectId } from 'mongodb';

// Meeting Schema
export interface Meeting {
  _id?: ObjectId;
  meetingId: string; // Stream call ID
  title: string;
  hostId: string; // Clerk user ID
  participants: string[]; // Array of participant IDs
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

// Message Schema
export interface Message {
  _id?: ObjectId | string; // Allow string for optimistic updates
  meetingId: string; // Reference to meeting
  senderId: string; // Clerk user ID
  senderName: string; // Display name
  senderAvatar?: string; // Profile image URL
  message: string;
  messageType: 'user' | 'system'; // Aligned types
  timestamp: Date | string;
  isEdited?: boolean;
  editedAt?: Date;
  reactions: MessageReaction[];
  // UI-only flags
  pending?: boolean;
  failed?: boolean;
  // temp id for optimistic messages
  tempId?: string;
}

// Message Reaction
export interface MessageReaction {
  userId: string;
  emoji: string;
  timestamp: Date;
}

// Chat Session Schema
export interface ChatSession {
  _id?: ObjectId;
  meetingId: string;
  userId: string;
  lastReadMessageId?: ObjectId;
  joinedAt: Date;
  leftAt?: Date;
}

// API Request/Response Types
export interface SendMessageRequest {
  meetingId: string;
  message: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface GetMessagesRequest {
  meetingId: string;
  limit?: number;
  before?: Date;
}

export interface GetMessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

// Socket.io Event Types
export interface SocketEvents {
  // Client to Server
  'join_meeting': (meetingId: string) => void;
  'leave_meeting': (meetingId: string) => void;
  'send_message': (data: SendMessageRequest) => void;
  'typing_start': (data: { meetingId: string; userId: string; userName: string }) => void;
  'typing_stop': (data: { meetingId: string; userId: string }) => void;
  'react_to_message': (data: { messageId: string; userId: string; emoji: string }) => void;
  
  // Server to Client
  'new_message': (message: Message) => void;
  'user_typing': (data: { userId: string; userName: string }) => void;
  'user_stopped_typing': (data: { userId: string }) => void;
  'message_reaction': (data: { messageId: string; reaction: MessageReaction }) => void;
  'user_joined': (data: { userId: string; userName: string }) => void;
  'user_left': (data: { userId: string; userName: string }) => void;
} 