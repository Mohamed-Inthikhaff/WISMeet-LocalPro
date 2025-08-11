// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { getDb, COLLECTIONS } = require('./mongodb');

// Global state for socket connections
const connectedUsers = new Map(); // socketId -> user info
const meetingUsers = new Map(); // meetingId -> Set of socketIds
const typingUsers = new Map(); // meetingId -> Map of typing users

// Setup function for socket handlers
function setupSocketHandlers(socket, io) {
  // Join meeting room
  socket.on('join_meeting', async (data) => {
    const { meetingId, userId, userName } = data;
    
    // Store user info
    connectedUsers.set(socket.id, {
      userId,
      userName,
      socketId: socket.id,
      meetingId
    });

    // Add to meeting users
    if (!meetingUsers.has(meetingId)) {
      meetingUsers.set(meetingId, new Set());
    }
    meetingUsers.get(meetingId).add(socket.id);

    // Join socket room
    socket.join(meetingId);

    // Create or update chat session
    await createChatSession(meetingId, userId);

    // Notify others in the meeting
    socket.to(meetingId).emit('user_joined', { userId, userName });

    console.log(`User ${userName} (${userId}) joined meeting ${meetingId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { meetingId, message, senderId, senderName, senderAvatar } = data;
      if (!meetingId || !message?.trim() || !senderId || !senderName) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }
      const doc = {
        meetingId: String(meetingId),
        message: String(message).trim(),
        messageType: 'user',
        senderId: String(senderId),
        senderName: String(senderName),
        senderAvatar: senderAvatar || undefined,
        timestamp: new Date(),
        isEdited: false,
        reactions: []
      };
      const saved = await saveMessageToDatabase(doc); // returns { ...doc, _id }
      io.to(meetingId).emit('new_message', saved);
      socket.emit('new_message', saved); // explicit echo to sender
    } catch (err) {
      console.error('send_message error', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicators
  socket.on('typing_start', (data) => {
    const { meetingId, userId, userName } = data;
    
    // Clear existing timer if any
    if (typingUsers.has(meetingId)) {
      const userTimer = typingUsers.get(meetingId).get(userId);
      if (userTimer) {
        clearTimeout(userTimer.timer);
      }
    } else {
      typingUsers.set(meetingId, new Map());
    }

    // Set new timer
    const timer = setTimeout(() => {
      handleTypingStop(meetingId, userId, io);
    }, 3000); // Stop typing indicator after 3 seconds

    typingUsers.get(meetingId).set(userId, { userId, userName, timer });

    // Notify others
    socket.to(meetingId).emit('user_typing', { userId, userName });
  });

  socket.on('typing_stop', (data) => {
    handleTypingStop(data.meetingId, data.userId, io);
  });

  // Message reactions
  socket.on('react_to_message', async (data) => {
    try {
      const { messageId, userId, emoji } = data;
      
      const reaction = {
        userId,
        emoji,
        timestamp: new Date()
      };

      // Save reaction to database
      await saveReactionToDatabase(messageId, reaction);

      // Broadcast to all users in the meeting
      const user = connectedUsers.get(socket.id);
      if (user) {
        io.to(user.meetingId).emit('message_reaction', { messageId, reaction });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      // Remove from meeting users
      const meetingUserSet = meetingUsers.get(user.meetingId);
      if (meetingUserSet) {
        meetingUserSet.delete(socket.id);
        if (meetingUserSet.size === 0) {
          meetingUsers.delete(user.meetingId);
        }
      }

      // Notify others
      socket.to(user.meetingId).emit('user_left', { userId: user.userId, userName: user.userName });

      // Update chat session
      updateChatSession(user.meetingId, user.userId);

      console.log(`User ${user.userName} left meeting ${user.meetingId}`);
    }

    connectedUsers.delete(socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });
}

function handleTypingStop(meetingId, userId, io) {
  const typingMap = typingUsers.get(meetingId);
  if (typingMap) {
    const userTimer = typingMap.get(userId);
    if (userTimer) {
      clearTimeout(userTimer.timer);
      typingMap.delete(userId);
      
      // Notify others that user stopped typing
      io.to(meetingId).emit('user_stopped_typing', { userId });
    }
  }
}

async function saveMessageToDatabase(messageData) {
  const db = await getDb();
  const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

  const result = await messagesCollection.insertOne(messageData);
  return { ...messageData, _id: result.insertedId };
}

async function saveReactionToDatabase(messageId, reaction) {
  const db = await getDb();
  const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

  await messagesCollection.updateOne(
    { _id: new (await import('mongodb')).ObjectId(messageId) },
    { $push: { reactions: reaction } }
  );
}

async function createChatSession(meetingId, userId) {
  try {
    const db = await getDb();
    const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

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

    // Create or update meeting record
    const existingMeeting = await meetingsCollection.findOne({ meetingId });
    
    if (!existingMeeting) {
      // Create new meeting record
      await meetingsCollection.insertOne({
        meetingId,
        title: `Meeting ${meetingId.slice(0, 8)}`, // Generate a title from meeting ID
        hostId: userId,
        participants: [userId],
        startTime: new Date(),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        recordingId: `recording-${meetingId}-${Date.now()}`
      });
      console.log(`Created new meeting record for ${meetingId}`);
    } else {
      // Update existing meeting to add participant if not already present
      if (!existingMeeting.participants.includes(userId)) {
        await meetingsCollection.updateOne(
          { meetingId },
          { 
            $addToSet: { participants: userId },
            $set: { updatedAt: new Date() }
          }
        );
        console.log(`Added participant ${userId} to meeting ${meetingId}`);
      }
    }
  } catch (error) {
    console.error('Error creating chat session:', error);
  }
}

async function updateChatSession(meetingId, userId) {
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

// Public method to get connected users for a meeting
function getConnectedUsers(meetingId) {
  const socketIds = meetingUsers.get(meetingId);
  if (!socketIds) return [];

  return Array.from(socketIds)
    .map(socketId => connectedUsers.get(socketId))
    .filter(Boolean);
}

// Export setup function
module.exports = { setupSocketHandlers, getConnectedUsers };