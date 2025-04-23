document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const newChatBtn = document.getElementById('new-chat-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const conversationList = document.getElementById('conversation-list');
    const currentConversationTitle = document.getElementById('current-conversation-title');
    const thinkingIndicator = document.getElementById('thinking-indicator');
    const errorToast = document.getElementById('error-toast');
    const errorMessage = document.getElementById('error-message');
    
    // Initialize Bootstrap toast
    const toast = new bootstrap.Toast(errorToast);
    
    // Current active conversation ID
    let activeConversationId = conversationList.querySelector('.conversation-item.active')?.dataset.id;
    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // Submit message form
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        sendMessage(message);
        messageInput.value = '';
        messageInput.style.height = 'auto';
    });
    
    // Send message to API and display response
    async function sendMessage(message) {
        // Add user message to UI
        appendMessage('user', message);
        
        // Show thinking indicator
        thinkingIndicator.classList.remove('d-none');
        
        try {
            const response = await fetch('/api/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    conversation_id: activeConversationId
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            const data = await response.json();
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            // Update conversation title if needed
            if (data.title) {
                updateConversationTitle(activeConversationId, data.title);
            }
            
            // Add AI response to UI
            appendMessage('assistant', data.message);
            
            // Update conversation list
            refreshConversationList();
            
        } catch (error) {
            console.error('Error:', error);
            showError('An error occurred. Please try again.');
        } finally {
            // Hide thinking indicator
            thinkingIndicator.classList.add('d-none');
        }
    }
    
    // Add a message to the chat UI
    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (role === 'user') {
            messageContent.textContent = content;
        } else {
            // Parse markdown for assistant messages
            const markdownContent = document.createElement('div');
            markdownContent.className = 'markdown-content';
            markdownContent.innerHTML = parseMarkdown(content);
            messageContent.appendChild(markdownContent);
            
            // Add copy button for assistant messages
            const messageActions = document.createElement('div');
            messageActions.className = 'message-actions';
            messageActions.innerHTML = `
                <button class="copy-btn" title="Copy to clipboard">
                    <i class="fas fa-copy"></i>
                </button>
            `;
            messageContent.appendChild(messageActions);
            
            // Add event listener for copy button
            setTimeout(() => {
                messageActions.querySelector('.copy-btn').addEventListener('click', function() {
                    copyToClipboard(content);
                });
            }, 0);
        }
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Apply syntax highlighting to code blocks
        if (role === 'assistant') {
            setTimeout(() => {
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }, 0);
        }
    }
    
    // Parse markdown content
    function parseMarkdown(content) {
        // Configure marked.js
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
        
        return marked.parse(content);
    }
    
    // Copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                // Show a temporary success message
                const tempToast = document.createElement('div');
                tempToast.className = 'position-fixed top-0 end-0 p-3';
                tempToast.style.zIndex = '9999';
                tempToast.innerHTML = `
                    <div class="toast show align-items-center text-bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="d-flex">
                            <div class="toast-body">
                                <i class="fas fa-check-circle me-2"></i> Copied to clipboard
                            </div>
                            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                    </div>
                `;
                document.body.appendChild(tempToast);
                
                setTimeout(() => {
                    document.body.removeChild(tempToast);
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
                showError('Failed to copy to clipboard');
            });
    }
    
    // Create a new conversation
    newChatBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/conversation/new', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to create new conversation');
            }
            
            const data = await response.json();
            
            // Update active conversation
            activeConversationId = data.conversation_id;
            
            // Clear chat messages
            chatMessages.innerHTML = '';
            
            // Update UI
            currentConversationTitle.textContent = data.title;
            
            // Refresh conversation list
            refreshConversationList();
            
        } catch (error) {
            console.error('Error:', error);
            showError('Failed to create new conversation');
        }
    });
    
    // Clear current conversation
    clearChatBtn.addEventListener('click', async function() {
        if (!activeConversationId) return;
        
        try {
            const response = await fetch(`/api/conversation/${activeConversationId}/clear`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to clear conversation');
            }
            
            // Clear chat messages
            chatMessages.innerHTML = '';
            
            // Update UI
            currentConversationTitle.textContent = 'New conversation';
            
            // Refresh conversation list
            refreshConversationList();
            
        } catch (error) {
            console.error('Error:', error);
            showError('Failed to clear conversation');
        }
    });
    
    // Load conversation when clicked
    conversationList.addEventListener('click', async function(e) {
        const conversationItem = e.target.closest('.conversation-item');
        const deleteBtn = e.target.closest('.delete-conversation-btn');
        
        if (deleteBtn) {
            e.stopPropagation();
            deleteConversation(deleteBtn.dataset.id);
            return;
        }
        
        if (!conversationItem) return;
        
        const conversationId = conversationItem.dataset.id;
        if (conversationId === activeConversationId) return;
        
        try {
            const response = await fetch(`/api/conversation/${conversationId}`);
            
            if (!response.ok) {
                throw new Error('Failed to load conversation');
            }
            
            const data = await response.json();
            
            // Update active conversation
            activeConversationId = conversationId;
            
            // Update UI
            currentConversationTitle.textContent = data.conversation.title;
            
            // Clear chat messages
            chatMessages.innerHTML = '';
            
            // Add messages to UI
            data.conversation.messages.forEach(message => {
                appendMessage(message.role, message.content);
            });
            
            // Update conversation list UI
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
            });
            conversationItem.classList.add('active');
            
        } catch (error) {
            console.error('Error:', error);
            showError('Failed to load conversation');
        }
    });
    
    // Delete conversation
    async function deleteConversation(conversationId) {
        try {
            const response = await fetch(`/api/conversation/${conversationId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete conversation');
            }
            
            // If the active conversation was deleted, refresh the UI
            if (conversationId === activeConversationId) {
                // Get the updated conversations
                const convoResponse = await fetch('/api/conversations');
                const convoData = await convoResponse.json();
                
                activeConversationId = convoData.active_conversation;
                
                // Update UI with the new active conversation
                if (convoData.conversations[activeConversationId]) {
                    currentConversationTitle.textContent = convoData.conversations[activeConversationId].title;
                    
                    // Clear chat messages
                    chatMessages.innerHTML = '';
                    
                    // Add messages to UI
                    convoData.conversations[activeConversationId].messages.forEach(message => {
                        appendMessage(message.role, message.content);
                    });
                }
            }
            
            // Refresh conversation list
            refreshConversationList();
            
        } catch (error) {
            console.error('Error:', error);
            showError('Failed to delete conversation');
        }
    }
    
    // Update conversation title in UI
    function updateConversationTitle(conversationId, title) {
        if (conversationId === activeConversationId) {
            currentConversationTitle.textContent = title;
        }
        
        const conversationItems = document.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            if (item.dataset.id === conversationId) {
                item.querySelector('.conversation-title').textContent = title;
            }
        });
    }
    
    // Refresh the conversation list
    async function refreshConversationList() {
        try {
            const response = await fetch('/api/conversations');
            
            if (!response.ok) {
                throw new Error('Failed to get conversations');
            }
            
            const data = await response.json();
            
            // Update the active conversation ID
            activeConversationId = data.active_conversation;
            
            // Clear the conversation list
            conversationList.innerHTML = '';
            
            // Add conversations to the list
            Object.entries(data.conversations).forEach(([id, conversation]) => {
                const conversationItem = document.createElement('div');
                conversationItem.className = `conversation-item ${id === activeConversationId ? 'active' : ''}`;
                conversationItem.dataset.id = id;
                
                conversationItem.innerHTML = `
                    <span class="conversation-title">${conversation.title}</span>
                    <button class="delete-conversation-btn" data-id="${id}">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                
                conversationList.appendChild(conversationItem);
            });
            
        } catch (error) {
            console.error('Error:', error);
            showError('Failed to refresh conversations');
        }
    }
    
    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        toast.show();
    }
    
    // Initialize auto-resize for textarea
    messageInput.dispatchEvent(new Event('input'));
    
    // Focus on the input field
    messageInput.focus();
});
