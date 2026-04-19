import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initScheduler } from './scheduler.js';

import chatRoutes from './routes/chat.js';
import tasksRoutes from './routes/tasks.js';
import docsRoutes from './routes/docs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware (X-Assistant-Token)
const requireAuth = (req, res, next) => {
  // Allow healthcheck without auth
  if (req.path === '/health') return next();

  const token = req.header('x-assistant-token');
  const expectedToken = process.env.ASSISTANT_TOKEN;

  // If token is configured, enforce it
  if (expectedToken && token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  next();
};

app.use(requireAuth);

// Routes
app.get('/health', (req, res) => res.status(200).send('OK'));
app.use('/api/chat', chatRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/docs', docsRoutes);

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`OpenHandi Backend running on port ${PORT}`);
  await initScheduler();
});
