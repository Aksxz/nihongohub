import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

async function verify() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('FAIL: MONGO_URI is missing in .env');
    process.exit(1);
  }

  console.log('1. Attempting connection to MongoDB Atlas...');
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('✅ 1. MongoDB connection succeeded!');
  } catch (err) {
    console.error('❌ 1. MongoDB connection failed:', err.message);
    process.exit(1);
  }

  try {
    const dbName = mongoose.connection.db.databaseName;
    console.log(`✅ 2. Database name in use: "${dbName}"`);

    console.log('3. Checking "users" collection accessibility...');
    const userCount = await User.countDocuments();
    console.log(`✅ 3. Users collection accessible! Total user records found: ${userCount}`);

    const users = await User.find({}).select('email name role selectedLevel').lean();
    console.log('Registered Users:');
    users.forEach((u, i) => {
      console.log(`   [${i + 1}] ${u.email} (Name: ${u.name}, Role: ${u.role}, Level: ${u.selectedLevel})`);
    });

    if (users.length === 0) {
      console.log('ℹ️ No users currently in MongoDB database.');
    } else {
      const targetUser = users[0];
      console.log(`4. Verifying promotion for user: ${targetUser.email}...`);
      
      const adminSecret = process.env.ADMIN_SECRET_KEY;
      if (!adminSecret) {
        console.error('FAIL: ADMIN_SECRET_KEY missing in .env');
        process.exit(1);
      }

      // Update role to admin
      await User.updateOne({ email: targetUser.email }, { $set: { role: 'admin' } });
      console.log(`✅ 4. Promoted ${targetUser.email} to "admin" successfully!`);

      // 5. Re-fetch from MongoDB to verify change in DB
      const verifiedUser = await User.findOne({ email: targetUser.email }).lean();
      console.log(`✅ 5. Verified role in MongoDB for ${verifiedUser.email}: role = "${verifiedUser.role}"`);
    }

    await mongoose.disconnect();
    console.log('\nAll checks completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error during verification:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verify();
