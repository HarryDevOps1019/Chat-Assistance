import os
import json
import uuid
from flask import Flask, render_template, request, jsonify, session
from utils.openai_helper import generate_ai_response

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

@app.route('/')
def index():
    """Render the main chat interface."""
    # Initialize session data if it doesn't exist
    if 'conversations' not in session:
        session['conversations'] = {}
        # Create a default conversation
        default_conversation_id = str(uuid.uuid4())
        session['conversations'][default_conversation_id] = {
            'title': 'New conversation',
            'messages': []
        }
        session['active_conversation'] = default_conversation_id
        session.modified = True
    
    return render_template('index.html', 
                          conversations=session['conversations'],
                          active_conversation=session.get('active_conversation'))

@app.route('/api/send_message', methods=['POST'])
def send_message():
    """Handle sending messages to the AI and receiving responses."""
    try:
        data = request.json
        message = data.get('message', '').strip()
        conversation_id = data.get('conversation_id')
        
        if not message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        if not conversation_id or conversation_id not in session.get('conversations', {}):
            return jsonify({'error': 'Invalid conversation ID'}), 400
        
        # Add user message to conversation history
        user_message = {
            'role': 'user',
            'content': message
        }
        
        # Get conversation history
        conversation = session['conversations'][conversation_id]
        conversation['messages'].append(user_message)
        
        # If this is the first message, update the conversation title
        if len(conversation['messages']) == 1:
            conversation['title'] = message[:30] + ('...' if len(message) > 30 else '')
        
        # Generate AI response
        messages = conversation['messages'].copy()
        response = generate_ai_response(messages)
        
        # Add AI response to conversation history
        ai_message = {
            'role': 'assistant',
            'content': response
        }
        conversation['messages'].append(ai_message)
        
        # Update session
        session.modified = True
        
        return jsonify({
            'status': 'success',
            'response': response,
            'conversation': conversation
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/create_conversation', methods=['POST'])
def create_conversation():
    """Create a new conversation."""
    try:
        # Generate a unique ID for the new conversation
        conversation_id = str(uuid.uuid4())
        
        # Initialize the new conversation
        if 'conversations' not in session:
            session['conversations'] = {}
        
        session['conversations'][conversation_id] = {
            'title': 'New conversation',
            'messages': []
        }
        
        # Set this as the active conversation
        session['active_conversation'] = conversation_id
        session.modified = True
        
        return jsonify({
            'status': 'success',
            'conversation_id': conversation_id,
            'conversation': session['conversations'][conversation_id]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/switch_conversation', methods=['POST'])
def switch_conversation():
    """Switch to a different conversation."""
    try:
        data = request.json
        conversation_id = data.get('conversation_id')
        
        if not conversation_id or conversation_id not in session.get('conversations', {}):
            return jsonify({'error': 'Invalid conversation ID'}), 400
        
        # Set as the active conversation
        session['active_conversation'] = conversation_id
        session.modified = True
        
        return jsonify({
            'status': 'success',
            'conversation': session['conversations'][conversation_id]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete_conversation', methods=['POST'])
def delete_conversation():
    """Delete a conversation."""
    try:
        data = request.json
        conversation_id = data.get('conversation_id')
        
        if not conversation_id or conversation_id not in session.get('conversations', {}):
            return jsonify({'error': 'Invalid conversation ID'}), 400
        
        # Delete the conversation
        del session['conversations'][conversation_id]
        
        # If we deleted the active conversation, set a new active conversation
        if session.get('active_conversation') == conversation_id:
            if session['conversations']:
                # Set first available conversation as active
                session['active_conversation'] = next(iter(session['conversations']))
            else:
                # Create a new conversation if none exist
                new_conversation_id = str(uuid.uuid4())
                session['conversations'][new_conversation_id] = {
                    'title': 'New conversation',
                    'messages': []
                }
                session['active_conversation'] = new_conversation_id
        
        session.modified = True
        
        return jsonify({
            'status': 'success',
            'active_conversation': session['active_conversation'],
            'conversations': session['conversations']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/clear_conversation', methods=['POST'])
def clear_conversation():
    """Clear messages from a conversation."""
    try:
        data = request.json
        conversation_id = data.get('conversation_id')
        
        if not conversation_id or conversation_id not in session.get('conversations', {}):
            return jsonify({'error': 'Invalid conversation ID'}), 400
        
        # Clear the messages
        session['conversations'][conversation_id]['messages'] = []
        session['conversations'][conversation_id]['title'] = 'New conversation'
        session.modified = True
        
        return jsonify({
            'status': 'success',
            'conversation': session['conversations'][conversation_id]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
