# AI Web Chat Assistant

A Flask web application that provides a chat interface powered by Google Gemini (google-generativeai). It supports multiple conversations stored in the user session.


## Requirements
- Python 3.11+
- pip
- (Optional) Docker 20.10+


## Environment Variables
Create a .env file in the project root with the following keys:

```
GOOGLE_API_KEY=your_google_generative_ai_api_key
SESSION_SECRET=your_session_secret_value
```

- GOOGLE_API_KEY is required. You can obtain a key from Google AI Studio.
- SESSION_SECRET is optional (defaults to a development key) but recommended for production.


## Quick Start (Local)
1) Create and activate a virtual environment
- Windows (PowerShell):
  - python -m venv venv
  - .\venv\Scripts\Activate.ps1
- macOS/Linux:
  - python3 -m venv venv
  - source venv/bin/activate

2) Install dependencies
- pip install -r requirements.txt

3) Run the app
- python main.py

The app will start on http://localhost:5000

Note: You can also run python app.py for local development. main.py binds to 0.0.0.0:5000 which is better for containers and LAN access.


## Running with Docker
1) Build the image
- docker build -t aiwebchatassistant .

2) Run the container (using your .env file)
- docker run --rm -p 5000:5000 --env-file .env aiwebchatassistant

Alternatively, pass variables explicitly:
- docker run --rm -p 5000:5000 -e GOOGLE_API_KEY=... -e SESSION_SECRET=... aiwebchatassistant

Run detached (background):
- docker run -d --name aiwebchatassistant -p 5000:5000 --env-file .env aiwebchatassistant

Access the app at http://localhost:5000


## Project Structure (key files)
- app.py               Flask app and routes
- main.py              Production-friendly entrypoint (0.0.0.0:5000)
- requirements.txt     Python dependencies
- Dockerfile           Container build instructions
- templates/           Jinja2 templates (index.html)
- static/              CSS/JS assets
- utils/               AI helper modules (Gemini/OpenAI helpers)


## Troubleshooting
- Error: "No API key found. Please set GOOGLE_API_KEY in .env file"
  - Ensure .env exists in project root and contains GOOGLE_API_KEY.
  - When using Docker, pass --env-file .env or -e GOOGLE_API_KEY=...

- Port already in use
  - Change host/port in main.py or stop conflicting service.

- Windows PowerShell execution policy prevents venv activation
  - Use: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  - Or run: .\venv\Scripts\activate.bat in cmd


## Notes
- Do not commit your .env file or secrets to version control.
- For production, disable debug mode and use a strong SESSION_SECRET.
