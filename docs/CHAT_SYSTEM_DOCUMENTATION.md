# Chat System Documentation

## 📋 Overview

The chat system enables real-time communication between students and faculty within project contexts. It uses **Socket.IO** for real-time messaging and **MongoDB** for message persistence.

---

## 🏗️ Architecture

### Technology Stack
- **Backend:** Socket.IO (WebSocket + polling fallback)
- **Frontend:** Socket.IO Client
- **Database:** MongoDB (Message model)
- **Authentication:** JWT tokens

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Chat System Flow                         │
└─────────────────────────────────────────────────────────────┘

Frontend (React)                Backend (Node.js)              Database
─────────────────              ──────────────────              ─────────
                                                               
ProjectDetails.jsx             SocketService.js               Message Model
     │                              │                              │
     │  1. Connect with JWT         │                              │
     ├──────────────────────────────>                              │
     │                              │                              │
     │  2. Authenticate             │                              │
     │                              ├─ Verify JWT                  │
     │                              │                              │
     │  3. Join project room        │                              │
     ├──────────────────────────────>                              │
     │                              ├─ socket.join('project_123')  │
     │                              │                              │
     │  4. Send message (API)       │                              │
     ├──────────────────────────────>                              │
     │                              │  5. Save to DB               │
     │                              ├──────────────────────────────>
     │                              │                              │
     │                              │  6. Broadcast via Socket     │
     │  7. Receive new_message      │                              │
     <──────────────────────────────┤                              │
     │                              │                              │
     │  8. Update UI                │                              │
     └─                             │                              │
```

---

## 📦 Database Schema

### Message Model

**Location:** `backend/models/Message.js`

```javascript
{
  // Project Association
  project: ObjectId (ref: 'Project', required, indexed),
  
  // Sender Information
  sender: ObjectId (ref: 'User', required),
  senderModel: String (enum: ['Student', 'Faculty'], required),
  senderName: String (required),
  
  // Message Content
  message: String (required, max: 2000 chars, trimmed),
  
  // Read Status
  isRead: Boolean (default: false),
  readBy: [{
    user: ObjectId (ref: 'User'),
    readAt: Date (default: now)
  }],
  
  // Attachments (Future)
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    uploadedAt: Date (default: now)
  }],
  
  // Timestamps
  createdAt: Date (default: now, indexed)
}
```

**Indexes:**
```javascript
// Compound indexes for performance
{ project: 1, createdAt: -1 }  // Fast message retrieval
{ sender: 1, createdAt: -1 }   // Sender history
```

**Methods:**

1. **Instance Methods:**
```javascript
// Mark message as read by user
message.markAsRead(userId)
```

2. **Static Methods:**
```javascript
// Get messages for a project (paginated)
Message.getProjectMessages(projectId, limit = 50)

// Get unread message count
Message.getUnreadCount(projectId, userId)
```

---

## 🔌 Socket.IO Implementation

### Backend: SocketService

**Location:** `backend/services/socketService.js`

#### Initialization

```javascript
class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.connectedUsers = new Map();
    this.setupMiddleware();
    this.setupEventHandlers();
  }
}
```

#### Authentication Middleware

```javascript
setupMiddleware() {
  this.io.use(async (socket, next) => {
    try {
      // Extract token from handshake
      const token = socket.handshake.auth.token || 
                    socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.userId = user._id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });
}
```

#### Event Handlers

**Connection Events:**
```javascript
socket.on('connection', async (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Track connection
  this.connectedUsers.set(socket.userId, {
    socketId: socket.id,
    connectedAt: new Date()
  });
  
  // Setup chat events
  this.setupProjectChatEvents(socket);
  
  // Cleanup on disconnect
  socket.on('disconnect', () => {
    this.handleDisconnect(socket);
  });
});
```

**Chat Events:**
```javascript
setupProjectChatEvents(socket) {
  // Join project room
  socket.on('join_project_room', (projectId) => {
    socket.join(`project_${projectId}`);
    socket.emit('joined_project_room', { projectId });
  });

  // Leave project room
  socket.on('leave_project_room', (projectId) => {
    socket.leave(`project_${projectId}`);
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(`project_${data.projectId}`).emit('user_typing', {
      userId: socket.userId,
      userName: socket.user?.fullName || 'Unknown',
      isTyping: data.isTyping
    });
  });
}
```

**Broadcasting Methods:**
```javascript
// Broadcast new message to project room
async broadcastNewMessage(projectId, messageData) {
  this.io.to(`project_${projectId}`).emit('new_message', {
    type: 'new_message',
    projectId,
    message: messageData,
    timestamp: new Date()
  });
}

// Broadcast message update
async broadcastMessageUpdate(projectId, messageId, updateData) {
  this.io.to(`project_${projectId}`).emit('message_updated', {
    type: 'message_updated',
    projectId,
    messageId,
    update: updateData,
    timestamp: new Date()
  });
}
```

---

### Frontend: React Component

**Location:** `frontend/src/pages/shared/ProjectDetails.jsx`

#### Socket Connection Setup

```javascript
useEffect(() => {
  if (!actualProjectId || !token) return;

  // Connect to Socket.IO
  const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socketRef.current = socket;

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Socket.IO connected');
    socket.emit('join_project_room', actualProjectId);
  });

  socket.on('joined_project_room', (data) => {
    console.log('✅ Joined project room:', data.projectId);
  });

  // Message events
  socket.on('new_message', (data) => {
    if (data.projectId === actualProjectId) {
      setMessages(prev => [...prev, data.message]);
      setTimeout(scrollToBottom, 100);
    }
  });

  // Typing indicator
  socket.on('user_typing', (data) => {
    if (data.userId !== user?.id) {
      setTypingUser(data.userName);
      setIsTyping(data.isTyping);
      
      if (data.isTyping) {
        setTimeout(() => {
          setIsTyping(false);
          setTypingUser(null);
        }, 3000);
      }
    }
  });

  // Cleanup
  return () => {
    if (socket) {
      socket.emit('leave_project_room', actualProjectId);
      socket.disconnect();
    }
  };
}, [actualProjectId, token, user]);
```

#### Sending Messages

```javascript
const handleSendMessage = async (e) => {
  e.preventDefault();
  if (!newMessage.trim()) return;

  setIsSending(true);
  
  try {
    // Send via API (saves to database)
    const response = await projectAPI.sendMessage(actualProjectId, newMessage);
    
    // Add to local state for instant feedback
    setMessages(prev => [...prev, response.data]);
    setNewMessage('');
    
    // Clear typing indicator
    if (socketRef.current) {
      socketRef.current.emit('typing', {
        projectId: actualProjectId,
        isTyping: false
      });
    }
    
    scrollToBottom();
  } catch (error) {
    console.error('Error sending message:', error);
    toast.error('Failed to send message');
  } finally {
    setIsSending(false);
  }
};
```

#### Typing Indicator

```javascript
const handleTyping = (e) => {
  setNewMessage(e.target.value);
  
  // Emit typing event
  if (socketRef.current && e.target.value.length > 0) {
    socketRef.current.emit('typing', {
      projectId: actualProjectId,
      isTyping: true
    });
  }
};
```

---

## 🔄 Message Flow

### Sending a Message

```
1. User types message in input field
   ↓
2. User clicks "Send" button
   ↓
3. Frontend calls API: POST /projects/:projectId/messages
   ↓
4. Backend controller:
   - Validates user access
   - Creates Message document
   - Saves to MongoDB
   - Returns saved message
   ↓
5. Backend broadcasts via Socket.IO:
   - Emits 'new_message' to project room
   ↓
6. All connected clients receive event:
   - Update messages array
   - Auto-scroll to bottom
   - Show notification (if not focused)
```

### Receiving a Message

```
1. Socket.IO client receives 'new_message' event
   ↓
2. Verify projectId matches current project
   ↓
3. Add message to messages state
   ↓
4. Trigger re-render
   ↓
5. Auto-scroll to latest message
   ↓
6. (Optional) Mark as read via API
```

---

## 🎨 UI Components

### Chat Container

```jsx
<div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
  {/* Header */}
  <div className="border-b p-4">
    <h2>Chat with {isFaculty ? 'Group' : 'Supervisor'}</h2>
  </div>

  {/* Messages */}
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {messages.map((message) => (
      <MessageBubble key={message._id} message={message} />
    ))}
    <div ref={messagesEndRef} />
  </div>

  {/* Input */}
  <div className="border-t p-4">
    {isTyping && <TypingIndicator user={typingUser} />}
    <form onSubmit={handleSendMessage}>
      <input
        value={newMessage}
        onChange={handleTyping}
        placeholder="Type your message..."
      />
      <button type="submit">Send</button>
    </form>
  </div>
</div>
```

### Message Bubble

```jsx
const MessageBubble = ({ message }) => {
  const isOwnMessage = message.sender?._id === user?.id;
  const isFacultyMessage = message.senderModel === 'Faculty';
  
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-md px-4 py-2 rounded-lg ${
        isFacultyMessage 
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="flex items-center mb-1">
          <span className="text-xs font-medium opacity-75">
            {message.senderName}
          </span>
          <span className="text-xs opacity-50 ml-2">
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-sm">{message.message}</p>
      </div>
    </div>
  );
};
```

### Typing Indicator

```jsx
{isTyping && typingUser && (
  <div className="mb-2 text-xs text-gray-500 italic">
    {typingUser} is typing...
  </div>
)}
```

---

## 🔐 Security

### Authentication
- JWT token required for Socket.IO connection
- Token verified on every connection
- User identity attached to socket

### Authorization
- Users can only access projects they're part of
- Faculty can access their allocated projects
- Students can access their group projects

### Data Validation
- Message length limited to 2000 characters
- XSS prevention via input sanitization
- SQL injection not applicable (NoSQL)

### Rate Limiting (Recommended)
```javascript
// TODO: Implement rate limiting
const rateLimit = require('express-rate-limit');

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: 'Too many messages, please slow down'
});
```

---

## 📊 Performance Optimizations

### Database Indexes
```javascript
// Fast message retrieval by project
messageSchema.index({ project: 1, createdAt: -1 });

// Fast sender history
messageSchema.index({ sender: 1, createdAt: -1 });
```

### Pagination
```javascript
// Load messages in chunks
const getMessages = async (projectId, page = 1, limit = 50) => {
  return Message.find({ project: projectId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('sender', 'fullName email')
    .lean();
};
```

### Socket.IO Rooms
- Users only receive messages for their project rooms
- Reduces unnecessary data transfer
- Scales better with multiple projects

### Message Caching (Future)
```javascript
// TODO: Implement Redis caching
const redis = require('redis');
const client = redis.createClient();

// Cache recent messages
const cacheKey = `project:${projectId}:messages`;
await client.setex(cacheKey, 300, JSON.stringify(messages));
```

---

## 🐛 Error Handling

### Connection Errors

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  toast.error('Failed to connect to chat server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
  toast.error('Chat error occurred');
});
```

### Message Send Failures

```javascript
try {
  await projectAPI.sendMessage(projectId, message);
} catch (error) {
  if (error.response?.status === 403) {
    toast.error('You do not have permission to send messages');
  } else if (error.response?.status === 404) {
    toast.error('Project not found');
  } else {
    toast.error('Failed to send message');
  }
}
```

### Reconnection Logic

```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // Server disconnected, manual reconnect needed
    socket.connect();
  }
  // Auto-reconnect for other reasons
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Rejoin project room
  socket.emit('join_project_room', projectId);
  // Reload messages
  loadMessages();
});
```

---

## 🧪 Testing

### Unit Tests

```javascript
// Test message creation
describe('Message Model', () => {
  it('should create a message', async () => {
    const message = new Message({
      project: projectId,
      sender: userId,
      senderModel: 'Student',
      senderName: 'John Doe',
      message: 'Hello, world!'
    });
    
    await message.save();
    expect(message._id).toBeDefined();
  });
  
  it('should enforce message length limit', async () => {
    const longMessage = 'a'.repeat(2001);
    const message = new Message({
      project: projectId,
      sender: userId,
      senderModel: 'Student',
      senderName: 'John Doe',
      message: longMessage
    });
    
    await expect(message.save()).rejects.toThrow();
  });
});
```

### Integration Tests

```javascript
// Test Socket.IO connection
describe('Chat Socket', () => {
  let socket;
  
  beforeEach(() => {
    socket = io('http://localhost:3000', {
      auth: { token: validToken }
    });
  });
  
  afterEach(() => {
    socket.disconnect();
  });
  
  it('should connect with valid token', (done) => {
    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      done();
    });
  });
  
  it('should join project room', (done) => {
    socket.emit('join_project_room', projectId);
    socket.on('joined_project_room', (data) => {
      expect(data.projectId).toBe(projectId);
      done();
    });
  });
});
```

---

## 🚀 Future Enhancements

### Phase 1: Core Features
- [ ] Message editing
- [ ] Message deletion
- [ ] Message reactions (emoji)
- [ ] Read receipts
- [ ] Online/offline status

### Phase 2: Rich Content
- [ ] File attachments (images, PDFs)
- [ ] Code snippets with syntax highlighting
- [ ] Link previews
- [ ] Markdown support

### Phase 3: Advanced Features
- [ ] Message search
- [ ] Message pinning
- [ ] Thread replies
- [ ] Voice messages
- [ ] Video calls

### Phase 4: Analytics
- [ ] Message statistics
- [ ] Response time tracking
- [ ] Activity heatmaps
- [ ] Engagement metrics

---

## 📝 API Endpoints (To Be Implemented)

### Chat API Routes

```javascript
// Get project messages (paginated)
GET /projects/:projectId/messages?page=1&limit=50

// Send message
POST /projects/:projectId/messages
Body: { message: "Hello!" }

// Edit message
PUT /projects/:projectId/messages/:messageId
Body: { message: "Updated message" }

// Delete message
DELETE /projects/:projectId/messages/:messageId

// Mark messages as read
POST /projects/:projectId/messages/read
Body: { messageIds: ["id1", "id2"] }

// Get unread count
GET /projects/:projectId/messages/unread

// Add reaction
POST /projects/:projectId/messages/:messageId/reactions
Body: { emoji: "👍" }
```

### Frontend API Client

```javascript
// Add to frontend/src/utils/api.js
export const projectAPI = {
  // ... existing methods
  
  // Chat methods
  getProjectMessages: (projectId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/projects/${projectId}/messages${queryString ? '?' + queryString : ''}`);
  },
  
  sendMessage: (projectId, message) => 
    api.post(`/projects/${projectId}/messages`, { message }),
  
  editMessage: (projectId, messageId, message) =>
    api.put(`/projects/${projectId}/messages/${messageId}`, { message }),
  
  deleteMessage: (projectId, messageId) =>
    api.delete(`/projects/${projectId}/messages/${messageId}`),
  
  markMessagesAsRead: (projectId, messageIds) =>
    api.post(`/projects/${projectId}/messages/read`, { messageIds }),
  
  getUnreadCount: (projectId) =>
    api.get(`/projects/${projectId}/messages/unread`),
  
  addReaction: (projectId, messageId, emoji) =>
    api.post(`/projects/${projectId}/messages/${messageId}/reactions`, { emoji })
};
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Backend (.env)
PORT=3000
MONGODB_URI=mongodb://localhost:27017/student-project-mgmt
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173

# Frontend (.env)
VITE_API_URL=http://localhost:3000
```

### Socket.IO Configuration

```javascript
// Backend
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Frontend
const socket = io(SOCKET_URL, {
  auth: { token },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});
```

---

## 📚 References

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [MongoDB Indexes](https://docs.mongodb.com/manual/indexes/)
- [JWT Authentication](https://jwt.io/introduction)
- [React Hooks](https://react.dev/reference/react)

---

**Last Updated:** 2025-10-10
**Version:** 1.0
**Status:** Implemented (Basic Features)
