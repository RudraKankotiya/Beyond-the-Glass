import mongoose from 'mongoose';

// Connects Mongoose to MongoDB using the URI from .env.
// If the connection fails we stop the process, because the API is useless without a database.
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
