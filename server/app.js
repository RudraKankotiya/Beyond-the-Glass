import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import artifactRoutes from './routes/artifactRoutes.js';
import exhibitionRoutes from './routes/exhibitionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { UPLOADS_DIR } from './utils/files.js';

const app = express();

// On Render (and most hosts) requests arrive through one proxy. Trusting it lets Express see the
// visitor's real IP address, which the login rate limit relies on.
app.set('trust proxy', 1);

// Security headers (no MIME sniffing, no clickjacking, ...). The client runs on another origin
// (port 5173), so it must be allowed to load the files in /uploads (models, thumbnails).
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Allow the React dev server (or deployed client) to call this API
app.use(
  cors({
    // One or more allowed origins, comma-separated (e.g. the Vercel URL and a custom domain)
    origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((url) => url.trim()),
    credentials: true,
  })
);

// Parse JSON and form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files: /uploads/models/*.glb and /uploads/thumbnails/*
// MongoDB only stores these URLs, never the files themselves.
app.use('/uploads', express.static(UPLOADS_DIR));

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/artifacts', artifactRoutes);
app.use('/api/exhibitions', exhibitionRoutes);
app.use('/api/users', userRoutes);

// 404 + global error handler must be registered last
app.use(notFound);
app.use(errorHandler);

export default app;
