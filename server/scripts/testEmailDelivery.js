import 'dotenv/config';
import { emailService } from '../services/emailService.js';

async function main() {
  const recipient = process.argv[2] || process.env.TEST_EMAIL_RECIPIENT;
  
  console.log('====================================================');
  console.log('  🏮 NihongoHub Email Service Delivery Test (Resend)');
  console.log('====================================================');
  
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY is not set in your .env file.');
    console.log('Please add RESEND_API_KEY=re_xxxxxx to .env and try again.');
    process.exit(1);
  }

  if (!recipient) {
    console.error('❌ Error: No recipient email specified.');
    console.log('Usage: node server/scripts/testEmailDelivery.js <recipient-email>');
    process.exit(1);
  }

  console.log('Recipient:', recipient);
  console.log('Sender:   ', process.env.EMAIL_FROM || 'NihongoHub <onboarding@resend.dev>');
  console.log('Sending test email via Resend HTTPS API...');

  try {
    const result = await emailService.sendTestEmail(recipient);
    console.log('✅ Test email dispatched successfully!');
    console.log('Resend Message ID:', result.messageId);
    process.exit(0);
  } catch (err) {
    console.error('❌ Email dispatch failed:', err.message);
    process.exit(1);
  }
}

main();
