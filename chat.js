require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());
app.use(cors());

// OpenAI API setup
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Store your OpenAI API key in `.env` file
});

// Route for AI medical chatbot
app.post('/api/chat', async (req, res) => {
    const { userMessage } = req.body;

    if (!userMessage) {
        return res.status(400).send({ error: "Message is required" });
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Use "gpt-4" if available
            messages: [
                { role: "system", content: "You are a helpful medical assistant providing accurate and empathetic answers to users' medical queries." },
                { role: "user", content: userMessage },
            ],
            temperature: 0.7,
        });

        const botMessage = response.choices[0].message.content;
        res.send({ botMessage });
    } catch (error) {
        console.error('OpenAI API error:', error.message);
        res.status(500).send({ error: "Unable to fetch AI response. Please try again later." });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
