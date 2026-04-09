function errorHandler(err, req, res, _next) {
    console.error('Error:', err.message);

    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: 'Validation error',
            details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
    }

    if (err.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({ error: 'Email already registered' });
    }

    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
