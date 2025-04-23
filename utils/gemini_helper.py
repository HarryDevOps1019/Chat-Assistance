import os
import google.generativeai as genai

# Get the Gemini API key from environment variables
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Configure the Gemini API
genai.configure(api_key=GEMINI_API_KEY)

def generate_ai_response(messages):
    """
    Generate a response from the Gemini API.
    
    Args:
        messages: List of message objects with 'role' and 'content' fields
    
    Returns:
        String containing the AI's response
    """
    try:
        # Create a system prompt
        system_prompt = "You are a helpful, creative, and knowledgeable assistant. Provide detailed, accurate responses. When you include code snippets, make sure they are functional and properly formatted. Format your responses using markdown for better readability."
        
        # Get the latest Gemini Pro model
        model = genai.GenerativeModel('gemini-pro')
        
        # Format the conversation history for Gemini
        # Convert OpenAI format to Gemini format
        gemini_messages = []
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            # Map OpenAI roles to Gemini roles
            if role == "user":
                gemini_messages.append({"role": "user", "parts": [content]})
            elif role == "assistant":
                gemini_messages.append({"role": "model", "parts": [content]})
        
        # Create the chat session
        chat = model.start_chat(history=[])
        
        # Add system prompt as the first user message if no messages exist
        if not gemini_messages:
            response = chat.send_message(system_prompt)
            return response.text
        
        # Load the conversation history
        for msg in gemini_messages:
            if msg["role"] == "user":
                chat.send_message(msg["parts"][0])
            # For model messages, we don't need to do anything as they're already in the history
        
        # Get the last user message to respond to
        last_user_message = None
        for msg in reversed(gemini_messages):
            if msg["role"] == "user":
                last_user_message = msg["parts"][0]
                break
        
        # If there's a user message to respond to
        if last_user_message:
            response = chat.send_message(last_user_message)
            return response.text
        else:
            # Fallback if no user message is found
            response = chat.send_message("Hello, how can I help you today?")
            return response.text
            
    except Exception as e:
        return f"Sorry, I encountered an error: {str(e)}"