import os
from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Get the OpenAI API key from environment variables
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route('/chat', methods=['POST'])
def chat():
    user_input = request.json.get('message', '')
    if not user_input:
        return jsonify({'response': "Please provide your symptoms."})
    
    try:
        # Query OpenAI API for response
        response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=f"You are a healthcare assistant. The user says: '{user_input}'. Suggest medicines or advice based on the symptoms.",
            max_tokens=100,
            temperature=0.7
        )
        ai_response = response.choices[0].text.strip()
        return jsonify({'response': ai_response})
    except Exception as e:
        return jsonify({'response': "There was an error processing your request. Please try again later."})

if __name__ == '__main__':
    app.run(debug=True)
