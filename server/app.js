var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();
const cors = require('cors');
const { OpenAI } = require('openai');
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use('/', indexRouter);
app.use('/users', usersRouter);

// API endpoint for scoring
app.post('/api/score', async (req, res) => {
  try {
    const { responses } = req.body; // Expecting: [{question, answer, comment}, ...]
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }
    const r = responses[0];
    const prompt = `
You are an ISO 27001 readiness assessor. 
Given the following question, answer, and comment, assign a score (0-3) and provide a brief justification.

Question: ${r.question}
Answer: ${r.answer}
Comment: ${r.comment}

Scoring key:
0 – Not Implemented
1 – Partially Implemented
2 – Mostly Implemented
3 – Fully Implemented

Respond in this format:
Score: [score]
Justification: [your comment]
`;
    console.log("PROMPT SENT TO OPENAI:\n", prompt);
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        { role: 'system', content: 'You are an ISO 27001 readiness assessor.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.2
    });
    console.log(JSON.stringify(completion, null, 2)); // Log the full OpenAI response
    res.json({ success: true, result: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'OpenAI error' });
  }
});
// API endpoint for summarizing
app.post('/api/summarize', async (req, res) => {
  try {
    const { responses } = req.body; // Expecting: [{question, answer, comment}, ...]
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }
    const summaryPrompt = `Summarize the following ISO 27001 assessment in a concise paragraph, highlighting strengths, weaknesses, and overall readiness.\n\n` +
      responses.map((r, i) => `${i+1}. Q: ${r.question}\nA: ${r.answer}\nComment: ${r.comment || ''}\n`).join('');
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        { role: 'system', content: 'You are an ISO 27001 readiness assessor.' },
        { role: 'user', content: summaryPrompt }
      ],
      max_tokens: 512,
      temperature: 0.3
    });
    console.log(JSON.stringify(completion, null, 2)); // Log the full OpenAI response
    res.json({ success: true, result: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'OpenAI error' });
  }
});

// Serve React static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Catchall: send back React's index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

module.exports = app;
