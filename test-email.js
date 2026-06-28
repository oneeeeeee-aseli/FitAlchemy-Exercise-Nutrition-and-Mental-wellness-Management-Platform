// Test email configuration
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🔍 Checking Email Configuration...\n');

// Check environment variables
console.log('1️⃣ Environment Variables:');
console.log('   EMAIL_USER:', process.env.EMAIL_USER || '❌ NOT SET');
console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.log('❌ Email credentials not configured in .env file!\n');
  console.log('💡 To fix:');
  console.log('   1. Open .env file');
  console.log('   2. Add these lines:');
  console.log('      EMAIL_USER=your-email@gmail.com');
  console.log('      EMAIL_PASS=your-app-password');
  console.log('   3. Save and restart server\n');
  process.exit(1);
}

// Create transporter
console.log('2️⃣ Creating Email Transporter...');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test connection
console.log('3️⃣ Testing Connection to Gmail...');
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Connection Failed!\n');
    console.log('Error:', error.message);
    console.log('');
    
    if (error.code === 'EAUTH') {
      console.log('💡 Authentication Error - Possible causes:');
      console.log('   • Wrong email or password');
      console.log('   • Need to use Gmail App Password (not regular password)');
      console.log('   • 2-Step Verification not enabled');
      console.log('');
      console.log('🔗 Get App Password: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ESOCKET') {
      console.log('💡 Network Error - Check your internet connection');
    } else {
      console.log('💡 Check your .env file settings');
    }
    process.exit(1);
  } else {
    console.log('✅ Connection Successful!\n');
    console.log('4️⃣ Sending Test Email...');
    
    // Send test email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'FitAlchemy Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d6cdf;">Email Test Successful! ✅</h2>
          <p>Your email configuration is working correctly.</p>
          <p>Password reset emails will now be sent successfully.</p>
          <p>Best regards,<br>FitAlchemy Team</p>
        </div>
      `
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('❌ Failed to send test email');
        console.log('Error:', error.message);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('📧 Check your inbox:', process.env.EMAIL_USER);
        console.log('');
        console.log('🎉 Email configuration is working perfectly!');
        console.log('💡 Password reset feature should now work.');
      }
    });
  }
});
