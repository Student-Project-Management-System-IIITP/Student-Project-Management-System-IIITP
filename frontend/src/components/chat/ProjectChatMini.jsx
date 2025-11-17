import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { projectAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const ProjectChatMini = ({ projectId }) => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!projectId || !token) return;

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: { token }
    });
    socketRef.current = socket;

    socket.emit('join_project_room', projectId);

    socket.on('project_message', (message) => {
      if (message.project === projectId) {
        setMessages((prev) => [...prev, message]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    return () => {
      socket.emit('leave_project_room', projectId);
      socket.disconnect();
    };
  }, [projectId, token]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await projectAPI.getProjectMessages(projectId);
        setMessages(response.data || []);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    if (projectId) {
      loadMessages();
    }
  }, [projectId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setIsSending(true);
      const response = await projectAPI.sendMessage(projectId, newMessage.trim());
      setMessages((prev) => [...prev, response.data]);
      setNewMessage('');
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[480px] border border-gray-200 rounded-lg bg-white">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Project Chat
        </h3>
        <p className="text-xs text-gray-500">
          Chat with your allocated faculty in real time.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 text-center mt-10">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${message.sender?._id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  message.sender?._id === user?.id
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-line">{message.content}</p>
                <p className="text-[10px] mt-1 opacity-75">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ProjectChatMini;

