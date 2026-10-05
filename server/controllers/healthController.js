import mongoose from 'mongoose';

// Mongoose readyState numbers mapped to readable labels
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

// GET /api/health - quick check that the API (and database) are up
export const getHealth = (req, res) => {
  res.json({
    status: 'ok',
    database: DB_STATES[mongoose.connection.readyState] ?? 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};
