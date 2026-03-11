require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { initDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interview');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3001;

// Security & parsing
app.use(helmet());
app.use(cors({
    origin: /^http:\/\/localhost:\d+$/,
    credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Central error handler
app.use(errorHandler);

// Start
async function start() {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

start();
