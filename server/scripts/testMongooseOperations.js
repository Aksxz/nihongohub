import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Vocabulary } from '../models/Vocabulary.js';
import { UserVocabulary } from '../models/UserVocabulary.js';

dotenv.config();

async function runTest() {
  console.log('Connecting with current options...');
  const start = Date.now();
  
  mongoose.connection.on('disconnected', () => console.log('EVENT: disconnected'));
  mongoose.connection.on('reconnected', () => console.log('EVENT: reconnected'));
  mongoose.connection.on('error', (err) => console.log('EVENT error:', err.message));
  
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: 'nihongohub',
    serverSelectionTimeoutMS: 5000,
    bufferCommands: false
  });
  console.log('Connected in', Date.now() - start, 'ms');

  console.log('Running test vocabulary query...');
  const count = await Vocabulary.countDocuments();
  console.log('Vocabulary count:', count);

  console.log('Running test findOne query...');
  const sample = await Vocabulary.findOne().lean();
  console.log('Sample word:', sample ? sample.word : 'None');

  console.log('Running test user vocabulary query...');
  const userVocabCount = await UserVocabulary.countDocuments();
  console.log('UserVocabulary count:', userVocabCount);

  await mongoose.disconnect();
  console.log('Disconnected cleanly.');
}

runTest().catch(console.error);
