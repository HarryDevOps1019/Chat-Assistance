import os
from openai import OpenAI

# Get the OpenAI API key from environment variables
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# Initialize the OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

def generate_ai_response(messages):
    """
    Generate a response from the OpenAI API.
    
    Args:
        messages: List of message objects with 'role' and 'content' fields
    
    Returns:
        String containing the AI's response
    """
    try:
        # The newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # Do not change this unless explicitly requested by the user
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful, creative, and knowledgeable assistant. Provide detailed, accurate responses. When you include code snippets, make sure they are functional and properly formatted. Format your responses using markdown for better readability."},
                *[{"role": msg["role"], "content": msg["content"]} for msg in messages]
            ],
            temperature=0.7,
            max_tokens=2048,
        )
        
        # Return the response content
        return response.choices[0].message.content
    except Exception as e:
        return f"Sorry, I encountered an error: {str(e)}"
