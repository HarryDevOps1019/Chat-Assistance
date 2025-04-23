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
        # Format the conversation history for Gemini
        # Gemini API doesn't support system messages, so we'll include instructions as a user message
        formatted_messages = []
        
        # Add a preamble with instructions if this is a new conversation
        if not any(msg["role"] == "assistant" for msg in messages):
            instructions = ("You are a helpful, creative, and knowledgeable assistant. "
                           "Provide detailed, accurate responses. When you include code snippets, "
                           "make sure they are functional and properly formatted. "
                           "Format your responses using markdown for better readability.")
            
            # Add instructions as the first user message if this is a new conversation
            if messages and messages[0]["role"] == "user":
                # Prepend instructions to the first user message
                combined_message = f"{instructions}\n\nUser query: {messages[0]['content']}"
                formatted_messages.append({"role": "user", "parts": [combined_message]})
                # Skip the first user message since we've already added it
                messages = messages[1:]
            else:
                # Add instructions as a separate message
                formatted_messages.append({"role": "user", "parts": [instructions]})
                formatted_messages.append({"role": "model", "parts": ["I'll help you with that."]})
        
        # Process remaining messages
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            # Map OpenAI roles to Gemini roles
            if role == "user":
                formatted_messages.append({"role": "user", "parts": [content]})
            elif role == "assistant":
                formatted_messages.append({"role": "model", "parts": [content]})
        
        # Get the latest Gemini model
        # Using gemini-1.5-pro which is the current model (as of April 2025)
        model = genai.GenerativeModel("gemini-1.5-pro")
        
        # Generate content with the conversation history
        response = model.generate_content(formatted_messages)
        
        return response.text
            
    except Exception as e:
        # Output detailed error for debugging
        error_message = f"Sorry, I encountered an error with the Gemini API: {str(e)}"
        print(error_message)  # Log to console for debugging
        return error_message