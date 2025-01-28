// Required dependencies
const awsServerlessExpress = require('aws-serverless-express');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const crypto = require('crypto'); // For generating reset tokens

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI; // MongoDB connection string
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit the application if connection fails
  });

// User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  before: { type: String, required: true }, // Assuming this stores "age"
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  isVerified: { type: Boolean, default: false }, // Email verification status
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com', // Replace with your SMTP provider's host
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('SMTP connection error:', error.message);
  } else {
    console.log('SMTP server is ready to send messages');
  }
});

// Generate JWT token for email verification
function generateVerificationToken(email) {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Routes

// Register user with email verification
app.post('/api/register', async (req, res) => {
  const { name, username, email, mobile, password, before } = req.body;

  if (!name || !username || !email || !mobile || !password || !before) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      username,
      email,
      mobile,
      password: hashedPassword,
      before,
    });

    const savedUser = await newUser.save();

    // Generate verification token
    const token = generateVerificationToken(savedUser.email);

    // Verification link
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    // Send verification email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: savedUser.email,
      subject: 'Verify Your Email',
      html: `
        <p>Hi ${savedUser.name},</p>
        <p>Thank you for registering. Please verify your email by clicking the link below:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.status(201).json({ message: 'User registered successfully! Verification email sent.' });
  } catch (error) {
    console.error('Error during registration:', error.message);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
});

// Email verification endpoint
app.get('/api/verify-email', async (req, res) => {
  const { token } = req.query;

  try {
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by email
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      // Redirect to a failure page if the user doesn't exist
      return res.redirect(`${process.env.FRONTEND_URL}/verification-failed`);
    }

    if (user.isVerified) {
      // Redirect to success page if already verified
      return res.redirect(`${process.env.FRONTEND_URL}/verification-success?status=already-verified`);
    }

    // Mark the user as verified
    user.isVerified = true;
    await user.save();

    // Redirect to a success page
    return res.redirect(`${process.env.FRONTEND_URL}/verification-success`);
  } catch (error) {
    console.error('Error verifying email:', error.message);
    // Redirect to a failure page
    return res.redirect(`${process.env.FRONTEND_URL}/verification-failed`);
  }
});

// Wrap the Express app using aws-serverless-express
const server = awsServerlessExpress.createServer(app);

// Lambda handler
exports.handler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
