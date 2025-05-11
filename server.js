import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { nanoid } from 'nanoid';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Setup lowdb with default data ---
const adapter = new JSONFile('db.json');
const db = new Low(adapter);

// Define default data
db.data = {
  users: [],
  chats: [],
};

await db.read();

// --- Auth Middleware ---
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token provided' });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = id;
    next();
  } catch {
    res.status(401).json({ msg: 'Invalid token' });
  }
};

// --- Routes ---
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  await db.read();

  // Check if the email is already taken
  if (db.data.users.find(u => u.email === email)) {
    return res.status(400).json({ msg: 'Email already exists' });
  }

  // Hash the password
  const hashed = await bcrypt.hash(password, 10);

  // Add the new user
  const user = { id: nanoid(), email, password: hashed };
  db.data.users.push(user);
  await db.write();

  // Generate a JWT token
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
  res.json({ token });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  await db.read();
  
  // Find the user by email
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(400).json({ msg: 'User not found' });
  
  // Check if the password matches
  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ msg: 'Incorrect password' });
  }

  // Generate a JWT token
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
  res.json({ token });
});

app.get('/api/chats', auth, async (req, res) => {
  await db.read();
  const chats = db.data.chats.filter(c => c.userId === req.userId);
  res.json(chats);
});

app.post('/api/chat', auth, async (req, res) => {
  const { message, chatId } = req.body;
  await db.read();

  // Check if the chat exists
  let chat = db.data.chats.find(c => c.id === chatId && c.userId === req.userId);
  if (!chat) {
    chat = { id: nanoid(), userId: req.userId, title: '', messages: [] };
    db.data.chats.push(chat);
  }

  // Add the user message to the chat
  chat.messages.push({ role: 'user', content: message });

  // Send the message to OpenAI API
  try {
    const openaiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: chat.messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Get the OpenAI reply and add it to the chat
    const reply = openaiRes.data.choices[0].message;
    chat.messages.push(reply);

    // Set the title of the chat if it's not set
    if (!chat.title) chat.title = message.slice(0, 30);

    await db.write();
    res.json({ chat });
  } catch (err) {
    console.error('OpenAI Error:', err.response?.data || err.message);
    res.status(500).json({ msg: 'Error communicating with OpenAI' });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
