import express from 'express';
import dotenv from 'dotenv';
import { Low, JSONFile } from 'lowdb';

dotenv.config(); // Load environment variables

const app = express();
const port = process.env.PORT || 3000;

// Setup LowDB with default data if missing
const db = new Low(new JSONFile('db.json'));
await db.read();
if (!db.data) {
  db.data = { users: [] }; // Define default data if not present
  await db.write();
}

console.log('Database initialized or already exists.'); // Log for success

// Sample route to check if server is running
app.get('/', (req, res) => {
  console.log('Backend is working and this route was hit!'); // Confirmation in logs
  res.send('Hello, the backend is up and running!');
});

// Example route for adding users
app.post('/add-user', express.json(), (req, res) => {
  const { email, password } = req.body;

  // Check if email exists in the database
  const userExists = db.data.users.find((user) => user.email === email);
  if (userExists) {
    return res.status(400).json({ message: 'Email already exists.' });
  }

  // Add new user
  db.data.users.push({ email, password });
  db.write().then(() => {
    console.log('New user added successfully!');
    res.status(200).json({ message: 'User added!' });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
