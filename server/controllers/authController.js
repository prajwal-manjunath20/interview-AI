const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { query } = require('../config/db');

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

async function register(req, res) {
    const { email, password } = registerSchema.parse(req.body);
    const password_hash = await bcrypt.hash(password, 12);

    const result = await query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email.toLowerCase(), password_hash]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
}

async function login(req, res) {
    const { email, password } = loginSchema.parse(req.body);

    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email } });
}

module.exports = { register, login };
