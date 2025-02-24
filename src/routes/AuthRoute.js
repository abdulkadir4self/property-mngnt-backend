const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../utils/pool'); // Import the database connection pool
const router = express.Router();

const SECRET_KEY = '1a2b3cd4e5'; // Change this to a secure key

// Register User Route
router.post('/register', async (req, res) => {
    const { email, fullName, phone, department, password } = req.body;
    console.log(req.body);
    
    if (!email || !fullName || !phone || !department || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into the database
        const [result] = await pool.execute(
            'INSERT INTO users (email, full_name, phone, department, password) VALUES (?, ?, ?, ?, ?)',
            [email, fullName, phone, department, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error registering user' });
    }
});


// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Fetch user from the database
        const [users] = await pool.execute(
            'SELECT id, email, full_name, phone, department, password FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            SECRET_KEY, 
            
        );

        // Remove password field from response
        delete user.password;

        return res.status(200).json({
            message: 'Login successful',
            user,
            token
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});
module.exports = router;
