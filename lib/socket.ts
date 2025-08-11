import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { getDb, COLLECTIONS } from './mongodb';
import { Message, MessageReaction } from './types/chat';

interface ConnectedUser {
  userId: string;
  userName: string;
  socketId: string;
  meetingId: string;
}

class ChatSocketManager {
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, ConnectedUser>(); // socketId -> user info
  private meetingUsers = new Map<string, Set<string>>(); // meetingId -> Set of socketIds
  private typingUsers = new Map<string, Map<string, { userId: string; userName: string; timer: NodeJS.Timeout }>>(); // meetingId -> Map of typing users
  private recentStatusUpdates = new Map<string, { userId: string; timestamp: number }>(); // meetingId -> recent updates

  init(server: NetServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('Socket.io server initialized');
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join meeting room
      socket.on('join_meeting', async (data: { meetingId: string; userId: string; userName: string }) => {
        const { meetingId, userId, userName } = data;
        
        // Check if user is already in this meeting
        const existingUser = Array.from(this.connectedUsers.values()).find(
          user => user.userId === userId && user.meetingId === meetingId
        );
        
        if (existingUser) {
          console.log(`User ${userName} (${userId}) already in meeting ${meetingId}, skipping duplicate join`);
          return;
        }
        
        // Store user info
        this.connectedUsers.set(socket.id, {
          userId,
          userName,
          socketId: socket.id,
          meetingId
        });

        // Add to meeting users
        if (!this.meetingUsers.has(meetingId)) {
          this.meetingUsers.set(meetingId, new Set());
        }
        this.meetingUsers.get(meetingId)!.add(socket.id);

        // Join socket room
        socket.join(meetingId);

        // Create or update chat session
        await this.createChatSession(meetingId, userId);

        // Clean up any existing duplicate system messages
        await this.cleanupDuplicateSystemMessages(meetingId);

        // Only notify others in the meeting (not the joining user)
        socket.to(meetingId).emit('user_joined', { userId, userName });

        console.log(`User ${userName} (${userId}) joined meeting ${meetingId}`);
      });

      // Handle participant status updates from Stream SDK
      socket.on('participant_status_update', (data: {
        meetingId: string;
        userId: string;
        status: 'joined' | 'left';
        userName?: string;
      }) => {
        const { meetingId, userId, status, userName } = data;
        
        // Prevent duplicate status updates within 10 seconds
        const updateKey = `${meetingId}:${userId}:${status}`;
        const now = Date.now();
        const recentUpdate = this.recentStatusUpdates.get(updateKey);
        
        if (recentUpdate && (now - recentUpdate.timestamp) < 10000) {
          console.log(`Skipping duplicate status update for ${userId} in ${meetingId} (${status})`);
          return;
        }
        
        // Check if this user is already in the meeting for join events
        if (status === 'joined') {
          const existingUser = Array.from(this.connectedUsers.values()).find(
            user => user.userId === userId && user.meetingId === meetingId
          );
          
          if (existingUser) {
            console.log(`User ${userName || userId} already in meeting ${meetingId}, skipping join notification`);
            return;
          }
        }
        
        // Store this update
        this.recentStatusUpdates.set(updateKey, { userId, timestamp: now });
        
        if (status === 'joined') {
          // Add system message for participant joined
          this.broadcastSystemMessage(meetingId, `${userName || userId} joined the meeting`);
          console.log(`Participant ${userName || userId} joined meeting ${meetingId}`);
        } else if (status === 'left') {
          // Add system message for participant left
          this.broadcastSystemMessage(meetingId, `${userName || userId} left the meeting`);
          console.log(`Participant ${userName || userId} left meeting ${meetingId}`);
        }
      });

      // Send message
      socket.on('send_message', async (data: {
        meetingId: string;
        message: string;
        senderId: string;
        senderName: string;
        senderAvatar?: string;
      }) => {
        try {
          const { meetingId, message, senderId, senderName, senderAvatar } = data;

          // Save message to database
          const savedMessage = await this.saveMessageToDatabase({
            meetingId,
            senderId,
            senderName,
            senderAvatar,
            message: message.trim(),
            messageType: 'user',
            timestamp: new Date(),
            isEdited: false,
            reactions: []
          });

          // Broadcast to all users in the meeting
          this.io!.to(meetingId).emit('new_message', savedMessage);

          console.log(`Message sent in meeting ${meetingId} by ${senderName}`);
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Typing indicators
      socket.on('typing_start', (data: { meetingId: string; userId: string; userName: string }) => {
        const { meetingId, userId, userName } = data;
        
        // Clear existing timer if any
        if (this.typingUsers.has(meetingId)) {
          const userTimer = this.typingUsers.get(meetingId)!.get(userId);
          if (userTimer) {
            clearTimeout(userTimer.timer);
          }
        } else {
          this.typingUsers.set(meetingId, new Map());
        }

        // Set new timer
        const timer = setTimeout(() => {
          this.handleTypingStop(meetingId, userId);
        }, 3000); // Stop typing indicator after 3 seconds

        this.typingUsers.get(meetingId)!.set(userId, { userId, userName, timer });

        // Notify others
        socket.to(meetingId).emit('user_typing', { userId, userName });
      });

      socket.on('typing_stop', (data: { meetingId: string; userId: string }) => {
        this.handleTypingStop(data.meetingId, data.userId);
      });

      // Message reactions
      socket.on('react_to_message', async (data: { messageId: string; userId: string; emoji: string }) => {
        try {
          const { messageId, userId, emoji } = data;
          
          const reaction: MessageReaction = {
            userId,
            emoji,
            timestamp: new Date()
          };

          // Save reaction to database
          await this.saveReactionToDatabase(messageId, reaction);

          // Broadcast to all users in the meeting
          const user = this.connectedUsers.get(socket.id);
          if (user) {
            this.io!.to(user.meetingId).emit('message_reaction', { messageId, reaction });
          }
        } catch (error) {
          console.error('Error adding reaction:', error);
          socket.emit('error', { message: 'Failed to add reaction' });
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          // Remove from meeting users
          const meetingUsers = this.meetingUsers.get(user.meetingId);
          if (meetingUsers) {
            meetingUsers.delete(socket.id);
            if (meetingUsers.size === 0) {
              this.meetingUsers.delete(user.meetingId);
            }
          }

          // Notify others
          socket.to(user.meetingId).emit('user_left', { userId: user.userId, userName: user.userName });

          // Update chat session
          this.updateChatSession(user.meetingId, user.userId);

          console.log(`User ${user.userName} left meeting ${user.meetingId}`);
        }

        this.connectedUsers.delete(socket.id);
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  private handleTypingStop(meetingId: string, userId: string) {
    const typingMap = this.typingUsers.get(meetingId);
    if (typingMap) {
      const userTimer = typingMap.get(userId);
      if (userTimer) {
        clearTimeout(userTimer.timer);
        typingMap.delete(userId);
        
        // Notify others that user stopped typing
        this.io!.to(meetingId).emit('user_stopped_typing', { userId });
      }
    }
  }

  private async saveMessageToDatabase(messageData: Omit<Message, '_id'>): Promise<Message> {
    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    const result = await messagesCollection.insertOne(messageData);
    return {
      ...messageData,
      _id: result.insertedId
    };
  }

  private async saveReactionToDatabase(messageId: string, reaction: MessageReaction) {
    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    await messagesCollection.updateOne(
      { _id: new (await import('mongodb')).ObjectId(messageId) },
      { $push: { reactions: reaction } } as any
    );
  }

  private async createChatSession(meetingId: string, userId: string) {
    try {
      const db = await getDb();
      const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);

      // Check if session already exists
      const existingSession = await chatSessionsCollection.findOne({
        meetingId,
        userId
      });

      if (!existingSession) {
        await chatSessionsCollection.insertOne({
          meetingId,
          userId,
          joinedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error creating chat session:', error);
    }
  }

  private async updateChatSession(meetingId: string, userId: string) {
    try {
      const db = await getDb();
      const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);

      await chatSessionsCollection.updateOne(
        { meetingId, userId },
        { $set: { leftAt: new Date() } }
      );
    } catch (error) {
      console.error('Error updating chat session:', error);
    }
  }

  // Broadcast system message to all users in a meeting
  private async broadcastSystemMessage(meetingId: string, message: string) {
    try {
      const db = await getDb();
      const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

      // Check if this exact system message already exists in the last 30 seconds
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      const existingMessage = await messagesCollection.findOne({
        meetingId,
        messageType: 'system',
        message,
        senderId: 'system',
        timestamp: { $gte: thirtySecondsAgo }
      });

      if (existingMessage) {
        console.log(`System message already exists, skipping: ${message}`);
        return;
      }

      // Create system message
      const systemMessage = {
        meetingId,
        senderId: 'system',
        senderName: 'System',
        message,
        messageType: 'system',
        timestamp: new Date(),
        isEdited: false,
        reactions: []
      };

      // Save to database
      const result = await messagesCollection.insertOne(systemMessage);
      const savedMessage = { ...systemMessage, _id: result.insertedId };

      // Broadcast to all users in the meeting
      this.io!.to(meetingId).emit('new_message', savedMessage);
    } catch (error) {
      console.error('Error broadcasting system message:', error);
    }
  }

  // Public method to get connected users for a meeting
  getConnectedUsers(meetingId: string): ConnectedUser[] {
    const socketIds = this.meetingUsers.get(meetingId);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map(socketId => this.connectedUsers.get(socketId))
      .filter(Boolean) as ConnectedUser[];
  }

  // Clean up duplicate system messages for a meeting
  async cleanupDuplicateSystemMessages(meetingId: string) {
    try {
      const db = await getDb();
      const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

      // Find all system messages for this meeting
      const systemMessages = await messagesCollection.find({
        meetingId,
        messageType: 'system'
      }).sort({ timestamp: 1 }).toArray();

      // Group by message content and keep only the first occurrence
      const seenMessages = new Set();
      const duplicatesToRemove = [];

      for (const message of systemMessages) {
        const messageKey = `${message.message}:${message.senderId}`;
        if (seenMessages.has(messageKey)) {
          duplicatesToRemove.push(message._id);
        } else {
          seenMessages.add(messageKey);
        }
      }

      // Remove duplicates
      if (duplicatesToRemove.length > 0) {
        await messagesCollection.deleteMany({
          _id: { $in: duplicatesToRemove }
        });
        console.log(`Cleaned up ${duplicatesToRemove.length} duplicate system messages for meeting ${meetingId}`);
      }
    } catch (error) {
      console.error('Error cleaning up duplicate system messages:', error);
    }
  }
}

// Export singleton instance
export const chatSocketManager = new ChatSocketManager(); 