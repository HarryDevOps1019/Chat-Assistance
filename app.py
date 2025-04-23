import os
import uuid
import logging
import json
from flask import Flask, render_template, request, jsonify, session
from openai import OpenAI, OpenAIError

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", str(uuid.uuid4()))

# Initialize OpenAI client
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

@app.route('/')
def index():
    # Initialize session variables if they don't exist
    if 'conversations' not in session:
        session['conversations'] = {}
        session['active_conversation'] = str(uuid.uuid4())
        session['conversations'][session['active_conversation']] = {
            'title': 'New conversation',
            'messages': []
        }
        session.modified = True
    
    return render_template('index.html', 
                          conversations=session['conversations'], 
                          active_conversation=session['active_conversation'])

@app.route('/api/message', methods=['POST'])
def send_message():
    try:
        data = request.json
        user_message = data.get('message', '')
        conversation_id = data.get('conversation_id', session['active_conversation'])
        
        # Ensure the conversation exists
        if conversation_id not in session['conversations']:
            conversation_id = session['active_conversation']
        
        # Add user message to conversation
        session['conversations'][conversation_id]['messages'].append({
            'role': 'user',
            'content': user_message
        })
        
        # Generate title for new conversations after the first message
        if len(session['conversations'][conversation_id]['messages']) == 1:
            new_title = generate_conversation_title(user_message)
            session['conversations'][conversation_id]['title'] = new_title
        
        # Prepare messages for API
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant. Provide detailed, accurate responses. When appropriate, use markdown formatting for better readability."}
        ]
        messages.extend([msg for msg in session['conversations'][conversation_id]['messages']])
        
        # Call OpenAI API
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages
        )
        
        # Extract assistant response
        assistant_message = response.choices[0].message.content
        
        # Add assistant message to conversation
        session['conversations'][conversation_id]['messages'].append({
            'role': 'assistant',
            'content': assistant_message
        })
        
        session.modified = True
        
        return jsonify({
            'message': assistant_message,
            'conversation_id': conversation_id,
            'title': session['conversations'][conversation_id]['title']
        })
        
    except OpenAIError as e:
        logger.error(f"OpenAI API error: {str(e)}")
        return jsonify({'error': 'An error occurred with the AI service. Please try again.'}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred. Please try again.'}), 500

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    return jsonify({
        'conversations': session['conversations'],
        'active_conversation': session['active_conversation']
    })

@app.route('/api/conversation/new', methods=['POST'])
def new_conversation():
    try:
        # Create a new conversation with a unique ID
        conversation_id = str(uuid.uuid4())
        session['conversations'][conversation_id] = {
            'title': 'New conversation',
            'messages': []
        }
        session['active_conversation'] = conversation_id
        session.modified = True
        
        return jsonify({
            'conversation_id': conversation_id,
            'title': 'New conversation'
        })
    except Exception as e:
        logger.error(f"Error creating new conversation: {str(e)}")
        return jsonify({'error': 'Failed to create new conversation'}), 500

@app.route('/api/conversation/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    try:
        if conversation_id in session['conversations']:
            session['active_conversation'] = conversation_id
            session.modified = True
            return jsonify({
                'conversation': session['conversations'][conversation_id],
                'conversation_id': conversation_id
            })
        else:
            return jsonify({'error': 'Conversation not found'}), 404
    except Exception as e:
        logger.error(f"Error retrieving conversation: {str(e)}")
        return jsonify({'error': 'Failed to retrieve conversation'}), 500

@app.route('/api/conversation/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    try:
        if conversation_id in session['conversations']:
            del session['conversations'][conversation_id]
            
            # If the deleted conversation was active, set a new active conversation
            if session['active_conversation'] == conversation_id:
                if session['conversations']:
                    session['active_conversation'] = next(iter(session['conversations']))
                else:
                    # Create a new conversation if all were deleted
                    new_id = str(uuid.uuid4())
                    session['conversations'][new_id] = {
                        'title': 'New conversation',
                        'messages': []
                    }
                    session['active_conversation'] = new_id
            
            session.modified = True
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Conversation not found'}), 404
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        return jsonify({'error': 'Failed to delete conversation'}), 500

@app.route('/api/conversation/<conversation_id>/clear', methods=['POST'])
def clear_conversation(conversation_id):
    try:
        if conversation_id in session['conversations']:
            session['conversations'][conversation_id]['messages'] = []
            session['conversations'][conversation_id]['title'] = 'New conversation'
            session.modified = True
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Conversation not found'}), 404
    except Exception as e:
        logger.error(f"Error clearing conversation: {str(e)}")
        return jsonify({'error': 'Failed to clear conversation'}), 500

def generate_conversation_title(first_message):
    try:
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Create a very short title (4-6 words max) for a conversation that starts with this message. Return only the title text."},
                {"role": "user", "content": first_message}
            ],
            max_tokens=20
        )
        title = response.choices[0].message.content.strip('"')
        return title[:40]  # Limit title length
    except Exception as e:
        logger.error(f"Error generating title: {str(e)}")
        return "New conversation"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
