const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const { authenticateToken } = require('../middleware/authMiddleware');
require('dotenv').config();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
// Generate JWT tokens with 12 hours expiration
const generateAccessToken = (user) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '10h' });
};

// POST /register - Register a new user
router.post('/register', async (req, res) => {

  try {
    const { first_name, last_name, email, password } = req.body;

    // Validate input
    if (!first_name || !last_name || !email || !password) {
      console.error('Validation failed: Missing fields in request body', req.body);
      return res.status(400).json({ message: 'All fields are required' });
    }


    // Check if the user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user with default Role_id
    const newUser = await User.create({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      Role_id: 12,
    });

    // Reload user to ensure ID assignment
    await newUser.reload();

    // Construct full name
    const fullName = `${newUser.first_name} ${newUser.last_name}`;

    // Respond with success
    res.status(201).json({
      message: 'User registered successfully',
      name: fullName,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});




// POST /login - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // If successful, generate tokens
    const userPayload = { id: user.user_id, email: user.email };
    const accessToken = generateAccessToken(userPayload);


    // Send tokens in response to be stored in session storage
    const fullName = `${user.first_name}${user.last_name}`;
    res.status(200).json({
      message: 'Login successful',
      name: fullName,
      accessToken,
      role: user.user_type,

    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});





// Status route
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Find the user by user ID from the token
    const user = await User.findOne({ where: { user_id: req.user.id } });

    // If user doesn't exist, return not found
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send response with user's authentication status and details
    res.json({
      isAuthenticated: true,
      Username: user.first_name,
      role: user.user_type,
      userId: user.user_id,
    });
  } catch (error) {
    // Handle errors
    console.error('Error checking status:', error);
    res.status(500).json({ message: 'Error checking status', error });
  }
});



module.exports = router;