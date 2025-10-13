# Chat UI Upgrade - Message Bubble Component

Replace the message rendering section (lines 566-600 approximately) with this upgraded version:

```jsx
{(searchQuery ? searchResults : messages).map((message) => {
  // Check if message is from current user
  const currentUserId = user?.id || user?._id;
  const messageSenderId = message.sender?._id || message.sender;
  const isOwnMessage = currentUserId && messageSenderId && 
                      (messageSenderId === currentUserId || messageSenderId.toString() === currentUserId.toString());
  const canEdit = canEditMessage(message);
  const isEditing = editingMessageId === message._id;
  
  return (
    <div
      key={message._id}
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'ml-12' : 'mr-12'}`}>
        {/* Message Bubble */}
        <div
          className={`relative px-4 py-3 rounded-2xl shadow-sm ${
            isOwnMessage
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
          }`}
        >
          {/* Sender Name & Time */}
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium ${isOwnMessage ? 'text-indigo-100' : 'text-gray-600'}`}>
              {message.senderName}
            </span>
            <span className={`text-xs ${isOwnMessage ? 'text-indigo-200' : 'text-gray-400'} ml-2`}>
              {formatTimestamp(message.createdAt)}
            </span>
          </div>

          {/* Message Content or Edit Form */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows="2"
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditMessage(message._id)}
                  className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
              {message.isEdited && (
                <span className={`text-xs italic ${isOwnMessage ? 'text-indigo-200' : 'text-gray-400'} mt-1 block`}>
                  (edited)
                </span>
              )}
            </>
          )}

          {/* Reactions Display */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(
                message.reactions.reduce((acc, r) => {
                  acc[r.emoji] = acc[r.emoji] || [];
                  acc[r.emoji].push(r);
                  return acc;
                }, {})
              ).map(([emoji, reactions]) => {
                const userReacted = reactions.some(r => 
                  (r.user._id || r.user) === currentUserId || 
                  (r.user._id || r.user).toString() === currentUserId.toString()
                );
                return (
                  <button
                    key={emoji}
                    onClick={() => userReacted ? handleRemoveReaction(message._id, emoji) : handleAddReaction(message._id, emoji)}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                      userReacted
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'bg-gray-100 border border-gray-300 hover:bg-gray-200'
                    }`}
                    title={reactions.map(r => r.userName).join(', ')}
                  >
                    <span>{emoji}</span>
                    <span className="ml-1 text-gray-700">{reactions.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Actions (shown on hover) */}
        {!isEditing && (
          <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            {/* Emoji Reaction Button */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(showEmojiPicker === message._id ? null : message._id)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Add reaction"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* Emoji Picker */}
              {showEmojiPicker === message._id && (
                <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                  <div className="grid grid-cols-5 gap-1">
                    {['👍', '❤️', '😊', '😂', '🎉', '🔥', '👏', '✅', '💯', '🚀'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(message._id, emoji)}
                        className="text-xl hover:bg-gray-100 rounded p-1 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Edit Button (only for own messages within 5 min) */}
            {canEdit && (
              <button
                onClick={() => startEditing(message)}
                className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="Edit message (within 5 min)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {/* Delete Button (only for own messages) */}
            {isOwnMessage && (
              <button
                onClick={() => handleDeleteMessage(message._id)}
                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
})}
```

## Key Features Added:

1. **Better Message Bubbles:**
   - Rounded corners with tail (rounded-br-md for sent, rounded-bl-md for received)
   - Shadow and border for better depth
   - White background for received, indigo for sent
   - Proper spacing and padding

2. **Timestamp Formatting:**
   - Shows time for today's messages
   - Shows "Yesterday" for yesterday
   - Shows day name for this week
   - Shows date for older messages

3. **Message Editing:**
   - Edit button appears on hover (only for own messages)
   - 5-minute edit window enforced
   - Inline edit form with Save/Cancel buttons
   - Shows "(edited)" indicator

4. **Emoji Reactions:**
   - Reaction button on hover
   - Emoji picker with 10 common emojis
   - Shows reaction count
   - Highlights user's own reactions
   - Tooltip shows who reacted

5. **Message Search:**
   - Search bar in header
   - Real-time search as you type
   - Shows result count
   - Clear button to reset search

6. **Message Actions:**
   - Appear on hover (opacity transition)
   - Edit, Delete, React buttons
   - Proper positioning based on message side
