import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
let listenersRegistered = false;

function registerConnectionEvents() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    isConnected = true;
    const dbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'nihongohub';
    console.log('[MongoDB] ✓ Connection established successfully');
    console.log(`[MongoDB] Database: ${dbName}`);
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error('[MongoDB] ✗ Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[MongoDB] ⚠️  MongoDB connection lost');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('[MongoDB] ✓ Reconnected to MongoDB Atlas');
  });

  mongoose.connection.on('close', () => {
    isConnected = false;
    console.warn('[MongoDB] ⚠️  MongoDB connection closed');
  });
}

export const connectDB = async () => {
  // If already connected, reuse the active connection
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  // If currently connecting, wait for it
  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve) => {
      mongoose.connection.once('connected', () => resolve(true));
      mongoose.connection.once('error', () => resolve(false));
    });
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn('[MongoDB] ⚠️  MONGO_URI or MONGODB_URI is not defined in environment variables.');
    return false;
  }

  registerConnectionEvents();

  try {
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'nihongohub',
      maxPoolSize: 20,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      family: 4, // IPv4 preference to avoid IPv6 resolution stalls
      retryWrites: true,
      retryReads: true,
      w: 'majority'
    });

    isConnected = true;
    const dbName = conn.connection.db ? conn.connection.db.databaseName : 'nihongohub';
    console.log('MongoDB connected successfully');
    console.log(`Database: ${dbName}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`[MongoDB] ⚠️  Connection failed: ${error.message}`);
    console.warn(`[MongoDB] ℹ️  Please check your cluster credentials and IP whitelist in MongoDB Atlas.`);
    return false;
  }
};

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const stateCode = mongoose.connection.readyState;
  const dbName = mongoose.connection.db ? mongoose.connection.db.databaseName : 'nihongohub';
  return {
    stateCode,
    status: states[stateCode] || 'disconnected',
    database: dbName,
    isConnected: stateCode === 1
  };
};

/**
 * Middleware to return 503 Service Unavailable when MongoDB is disconnected
 */
export const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      code: 'DB_UNAVAILABLE',
      message: 'Database temporarily unavailable. Please try again.'
    });
  }
  next();
};
