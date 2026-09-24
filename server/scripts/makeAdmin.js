import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

async function promoteAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.log(`
Usage:
  node server/scripts/makeAdmin.js <email>
  npm run make-admin <email>

Example:
  node server/scripts/makeAdmin.js admin@nihongohub.com
`);
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.error(`❌ User not found with email: "${email}". Please register an account first.`);
      process.exit(1);
    }

    user.role = 'admin';
    await user.save();

    console.log(`
=============================================================
  🎉 SUCCESS: User "${user.name}" (${user.email})
  has been successfully promoted to ADMINISTRATOR!
  Role: "admin"
=============================================================
`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error promoting user:', error.message);
    process.exit(1);
  }
}

promoteAdmin();
