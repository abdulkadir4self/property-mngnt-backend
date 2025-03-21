const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../utils/pool'); // Import the database connection pool

const router = express.Router();
const SECRET_KEY = '1a2b3cd4e5'; // Use a secure key

// Register User Route
router.post('/register', (req, res) => {
    const { email, fullName, phone, department, password } = req.body;

    if (!email || !fullName || !phone || !department || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if email already exists
    pool.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash the password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error hashing password' });
            }

            // Insert user into the database
            pool.query(
                'INSERT INTO users (email, full_name, phone, department, password) VALUES (?, ?, ?, ?, ?)',
                [email, fullName, phone, department, hashedPassword],
                (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: 'Error registering user' });
                    }
                    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
                }
            );
        });
    });
});

// Login Route
router.post('/login', (req, res) => {
    const { email, password } = req.body;


    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    // Fetch user from the database
    pool.query(
        'SELECT id, email, full_name, phone, department, password FROM users WHERE email = ?',
        [email],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const user = results[0];

            // Compare hashed password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Error comparing passwords' });
                }

                if (!isMatch) {
                    return res.status(401).json({ message: 'Invalid email or password' });
                }

                // Generate JWT Token
                const token = jwt.sign(
                    { id: user.id, email: user.email },
                    SECRET_KEY,
                    { expiresIn: '7d' } // Token expires in 1 hour
                );

                // Remove password field before sending response
                delete user.password;
                console.log('login req recieved');
                return res.status(200).json({
                    message: 'Login successful',
                    user,
                    token
                });
            });
        }
    );
});

router.get("/auth", async (req, res) => {
  return res.json({ msg: "auth route is working" });
});

module.exports = router;
