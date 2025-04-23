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
        system_message = {
            "role": "system",
            "parts": ["You are a helpful, creative, and knowledgeable assistant. Provide detailed, accurate responses. When you include code snippets, make sure they are functional and properly formatted. Format your responses using markdown for better readability."]
        }
        
        # Format the conversation history for Gemini
        gemini_messages = [system_message]
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            # Map OpenAI roles to Gemini roles (user stays as user, assistant becomes model)
            if role == "user":
                gemini_messages.append({"role": "user", "parts": [content]})
            elif role == "assistant":
                gemini_messages.append({"role": "model", "parts": [content]})
        
        # Get the latest Gemini model
        # Using gemini-1.5-pro which is the current model (as of April 2025)
        model = genai.GenerativeModel("gemini-1.5-pro")
        
        # Generate content with the conversation history
        response = model.generate_content(gemini_messages)
        
        return response.text
            
    except Exception as e:
        # Output detailed error for debugging
        error_message = f"Sorry, I encountered an error with the Gemini API: {str(e)}"
        print(error_message)  # Log to console for debugging
        return error_message