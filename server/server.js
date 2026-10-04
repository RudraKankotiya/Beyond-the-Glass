import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

// Without a secret, tokens could not be signed or verified - fail fast instead of at first login
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from server/.env');
  process.exit(1);
}
if (process.env.STORAGE_DRIVER === 'cloudinary' && !process.env.CLOUDINARY_URL) {
  console.error('STORAGE_DRIVER is "cloudinary" but CLOUDINARY_URL is not set');
  process.exit(1);
}

// Connect to MongoDB first, then start accepting requests
await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
