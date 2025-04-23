import logging
from app import app

if __name__ == "__main__":
    # Set up logging for easier debugging
    logging.basicConfig(level=logging.DEBUG)
    # Start the Flask server
    app.run(host="0.0.0.0", port=5000, debug=True)
