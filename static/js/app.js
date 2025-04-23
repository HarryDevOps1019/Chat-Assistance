document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-button');
    const newChatBtn = document.getElementById('new-chat-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const conversationsList = document.querySelector('.conversations-list');
    const conversationTitle = document.querySelector('.conversation-title');
    const loadingIndicator = document.getElementById('loading-indicator');

    // Current active conversation ID
    let activeConversationId = null;
    let conversations = {};

    // Configure marked.js with highlight.js for code highlighting
    marked.setOptions({
        highlight: function(code, language) {
            if (language && hljs.getLanguage(language)) {
                return hljs.highlight(code, { language }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    // Initialize the chat interface
    function initChat() {
        // Load conversations from server (they are stored in the session)
        fetchConversations();
        
        // Set up event listeners
        messageForm.addEventListener('submit', handleSubmit);
        newChatBtn.addEventListener('click', createNewConversation);
        clearChatBtn.addEventListener('click', clearCurrentConversation);
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
        
        // Make textarea grow with content
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            // Reset height if empty
            if (this.value === '') {
                this.style.height = '';
            }
        });
    }

    // Fetch conversations from session
    function fetchConversations() {
        // Since our conversations are stored in the Flask session, 
        // we just use the data passed to the template initially
        // If needed, we could add an API endpoint to refresh this data
        renderConversations();
        
        // Start with the first conversation or create one if none exist
        if (Object.keys(conversations).length === 0) {
            createNewConversation();
        } else {
            // Use the ID of the first conversation
            const firstConversationId = Object.keys(conversations)[0];
            switchConversation(firstConversationId);
        }
    }

    // Handle form submission
    async function handleSubmit(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = '';
        
        // Add user message to UI
        addMessageToUI('user', message);
        
        // Show loading indicator
        loadingIndicator.classList.remove('d-none');
        
        try {
            // Send message to server
            const response = await fetch('/api/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversation_id: activeConversationId
                }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Add AI response to UI
                addMessageToUI('assistant', data.response);
                
                // Update conversation data
                conversations[activeConversationId] = data.conversation;
                
                // Update the conversation title if it's a new conversation
                if (data.conversation.title !== 'New conversation') {
                    conversationTitle.textContent = data.conversation.title;
                    // Also update in the sidebar
                    renderConversations();
                }
            } else {
                // Handle errors
                addErrorMessage(data.error || 'An error occurred while processing your request.');
            }
        } catch (error) {
            addErrorMessage('Network error. Please try again.');
            console.error('Error:', error);
        } finally {
            // Hide loading indicator
            loadingIndicator.classList.add('d-none');
            
            // Scroll to bottom
            scrollToBottom();
        }
    }

    // Add a message to the UI
    function addMessageToUI(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = `message-avatar ${role === 'assistant' ? 'assistant-avatar' : ''}`;
        avatar.innerHTML = role === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';
        
        // Create message content
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Parse markdown in assistant messages
        if (role === 'assistant') {
            messageContent.innerHTML = marked.parse(content);
            
            // Add copy button for assistant messages
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'btn btn-sm btn-outline-secondary';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.addEventListener('click', () => copyToClipboard(content));
            copyBtn.title = 'Copy response';
            
            actionsDiv.appendChild(copyBtn);
            messageContent.appendChild(actionsDiv);
        } else {
            // For user messages, just escape HTML
            const textNode = document.createTextNode(content);
            messageContent.appendChild(textNode);
        }
        
        // Assemble message
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        // Add to chat
        chatMessages.appendChild(messageDiv);
        
        // Apply syntax highlighting to code blocks
        if (role === 'assistant') {
            messageContent.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        }
        
        // Scroll to bottom
        scrollToBottom();
    }

    // Add an error message
    function addErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger m-3';
        errorDiv.textContent = message;
        chatMessages.appendChild(errorDiv);
    }

    // Create a new conversation
    async function createNewConversation() {
        try {
            loadingIndicator.classList.remove('d-none');
            
            const response = await fetch('/api/create_conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update local conversations
                conversations[data.conversation_id] = data.conversation;
                
                // Switch to the new conversation
                switchConversation(data.conversation_id);
                
                // Update conversations list
                renderConversations();
            } else {
                addErrorMessage(data.error || 'Failed to create new conversation');
            }
        } catch (error) {
            addErrorMessage('Network error. Please try again.');
            console.error('Error:', error);
        } finally {
            loadingIndicator.classList.add('d-none');
        }
    }

    // Clear the current conversation
    async function clearCurrentConversation() {
        if (!activeConversationId) return;
        
        try {
            loadingIndicator.classList.remove('d-none');
            
            const response = await fetch('/api/clear_conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: activeConversationId
                }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update conversation data
                conversations[activeConversationId] = data.conversation;
                
                // Clear the UI
                chatMessages.innerHTML = `
                    <div class="welcome-message text-center my-5">
                        <h2>AI Chat Assistant</h2>
                        <p class="text-muted">Ask me anything and I'll do my best to assist you!</p>
                    </div>
                `;
                
                // Update title
                conversationTitle.textContent = 'New conversation';
                
                // Update sidebar
                renderConversations();
            } else {
                addErrorMessage(data.error || 'Failed to clear conversation');
            }
        } catch (error) {
            addErrorMessage('Network error. Please try again.');
            console.error('Error:', error);
        } finally {
            loadingIndicator.classList.add('d-none');
        }
    }

    // Switch to a different conversation
    async function switchConversation(conversationId) {
        if (!conversationId || activeConversationId === conversationId) return;
        
        try {
            loadingIndicator.classList.remove('d-none');
            
            const response = await fetch('/api/switch_conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: conversationId
                }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Set as active conversation
                activeConversationId = conversationId;
                
                // Update conversation data
                conversations[conversationId] = data.conversation;
                
                // Update UI
                conversationTitle.textContent = data.conversation.title;
                
                // Clear current messages
                chatMessages.innerHTML = '';
                
                // Load conversation messages
                if (data.conversation.messages.length > 0) {
                    data.conversation.messages.forEach(message => {
                        addMessageToUI(message.role, message.content);
                    });
                } else {
                    // Show welcome message if conversation is empty
                    chatMessages.innerHTML = `
                        <div class="welcome-message text-center my-5">
                            <h2>Gemini AI Chat Assistant</h2>
                            <p class="text-muted">Ask me anything and I'll do my best to assist you!</p>
                        </div>
                    `;
                }
                
                // Update sidebar
                renderConversations();
                
                // On mobile, hide sidebar after switching
                if (window.innerWidth < 768) {
                    sidebar.classList.remove('show');
                }
            } else {
                addErrorMessage(data.error || 'Failed to switch conversation');
            }
        } catch (error) {
            addErrorMessage('Network error. Please try again.');
            console.error('Error:', error);
        } finally {
            loadingIndicator.classList.add('d-none');
        }
    }

    // Delete a conversation
    async function deleteConversation(conversationId, event) {
        // Prevent the click from propagating to the parent (conversation item)
        if (event) {
            event.stopPropagation();
        }
        
        if (!conversationId) return;
        
        try {
            loadingIndicator.classList.remove('d-none');
            
            const response = await fetch('/api/delete_conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversation_id: conversationId
                }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update local data
                conversations = data.conversations;
                activeConversationId = data.active_conversation;
                
                // Update UI for the active conversation
                if (conversations[activeConversationId]) {
                    conversationTitle.textContent = conversations[activeConversationId].title;
                    
                    // Clear current messages
                    chatMessages.innerHTML = '';
                    
                    // Load conversation messages
                    if (conversations[activeConversationId].messages.length > 0) {
                        conversations[activeConversationId].messages.forEach(message => {
                            addMessageToUI(message.role, message.content);
                        });
                    } else {
                        // Show welcome message if conversation is empty
                        chatMessages.innerHTML = `
                            <div class="welcome-message text-center my-5">
                                <h2>Gemini AI Chat Assistant</h2>
                                <p class="text-muted">Ask me anything and I'll do my best to assist you!</p>
                            </div>
                        `;
                    }
                }
                
                // Update sidebar
                renderConversations();
            } else {
                addErrorMessage(data.error || 'Failed to delete conversation');
            }
        } catch (error) {
            addErrorMessage('Network error. Please try again.');
            console.error('Error:', error);
        } finally {
            loadingIndicator.classList.add('d-none');
        }
    }

    // Render the conversations list in the sidebar
    function renderConversations() {
        conversationsList.innerHTML = '';
        
        // Get current conversations list from server response or initial page load
        const conversationsEntries = Object.entries(conversations);
        
        if (conversationsEntries.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'text-center text-muted p-3';
            emptyState.textContent = 'No conversations yet';
            conversationsList.appendChild(emptyState);
            return;
        }
        
        conversationsEntries.forEach(([id, conversation]) => {
            const conversationItem = document.createElement('div');
            conversationItem.className = `conversation-item ${id === activeConversationId ? 'active' : ''}`;
            conversationItem.dataset.id = id;
            
            // Add conversation icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-comment me-2';
            
            // Add conversation title
            const title = document.createElement('div');
            title.className = 'conversation-item-title';
            title.textContent = conversation.title;
            
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-link delete-conversation-btn text-danger p-0';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Delete conversation';
            deleteBtn.addEventListener('click', (e) => deleteConversation(id, e));
            
            conversationItem.appendChild(icon);
            conversationItem.appendChild(title);
            conversationItem.appendChild(deleteBtn);
            
            // Add click event to switch to this conversation
            conversationItem.addEventListener('click', () => switchConversation(id));
            
            conversationsList.appendChild(conversationItem);
        });
    }

    // Toggle sidebar visibility (mobile)
    function toggleSidebar() {
        sidebar.classList.toggle('show');
    }

    // Copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Show feedback
            const toast = document.createElement('div');
            toast.className = 'position-fixed bottom-0 end-0 p-3';
            toast.style.zIndex = '2000';
            toast.innerHTML = `
                <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <strong class="me-auto">Notification</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body">
                        Response copied to clipboard!
                    </div>
                </div>
            `;
            document.body.appendChild(toast);
            
            // Remove toast after 2 seconds
            setTimeout(() => {
                toast.remove();
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }

    // Scroll chat to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Initialize
    initChat();
});
