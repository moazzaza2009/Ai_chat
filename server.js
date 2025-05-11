// Import Express
const express = require('express');

// Initialize the app
const app = express();

// Define the port number
const port = process.env.PORT || 3000;

// Set up a route for the root URL
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
