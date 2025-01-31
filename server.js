// necessary modules
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true }
}));
// Check if required environment variables are set
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_HOST = "smtp-relay.brevo.com";
const SMTP_PORT = 587;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const BREVO_API_KEY = process.env.BREVO_API_KEY; // Brevo API Key for SMS
const SENDER_NAME = process.env.SENDER_NAME || "YourAppName"; // Sender name for SMS

if (!MONGO_URI || !SMTP_USER || !SMTP_PASSWORD || !BREVO_API_KEY) {
    console.error("❌ Missing required environment variables. Please check your .env file.");
    process.exit(1);
}

// MongoDB connection
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err) => {
        console.error('❌ MongoDB Atlas connection error:', err);
        process.exit(1);
    });

// User schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
    before: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Admin schema
const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' },
    createdAt: { type: Date, default: Date.now },
});

const Admin = mongoose.model('Admin', adminSchema);


// AWS SES SMTP Transporter Configuration
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    requireTLS: true,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD
    },
    tls: {
        minVersion: 'TLSv1.2'
    }
});

transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ SMTP connection error:', error);
    } else {
        console.log('✅ SMTP server is ready to take messages');
    }
});

// Function to send SMS via Brevo
const sendSMS = async (phoneNumber, message) => {
    try {
        const response = await axios.post(
            "https://api.brevo.com/v3/transactionalSMS/sms",
            {
                sender: SENDER_NAME,
                recipient: phoneNumber,
                content: message,
            },
            {
                headers: {
                    "api-key": BREVO_API_KEY,
                    "Content-Type": "application/json",
                },
            }
        );
        console.log("✅ SMS sent successfully:", response.data);
    } catch (error) {
        console.error("❌ Error sending SMS:", error.response?.data || error.message);
    }
};

// Function to send verification email
const sendVerificationEmail = async (email, verificationCode) => {
    console.log(`🚀 Sending verification email to: ${email} with code: ${verificationCode}`);

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: 'Verify Your Email',
        text: `Your email verification code is: ${verificationCode}`,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully:", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Error sending email:", {
            message: error.message,
            code: error.code,
            command: error.command
        });
        throw error; // Rethrow to handle in the calling function
    }
};


// Register API with Email Verification
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
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newUser = new User({
            name,
            username,
            email,
            mobile,
            password: hashedPassword,
            before,
            verificationCode,
        });

        await newUser.save();
        await sendVerificationEmail(email, verificationCode);

        res.status(201).json({ message: 'User registered successfully! Please verify your email.' });
    } catch (error) {
        console.error('❌ Error during registration:', error.message);
        res.status(500).json({ message: `Error saving user: ${error.message}` });
    }
});



app.post("/api/auth/verify-code", async (req, res) => {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
        return res.status(400).json({ success: false, message: "Email and verification code are required." });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (user.verificationCode.toString() !== verificationCode.toString()) {
            return res.status(400).json({ success: false, message: "Invalid verification code." });
        }

        user.emailVerified = true;
        user.verificationCode = null; // Clear verification code after successful verification
        await user.save();

        res.json({ success: true, message: "Verification successful!" });
    } catch (error) {
        console.error("❌ Error verifying code:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
});



// User Login API with SMS Greeting
app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Email/Username and password are required.' });
    }

    try {
        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }],
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });

        // Send greeting SMS
        await sendSMS(user.mobile, `Hello ${user.name}! Welcome back to our platform. Enjoy your experience.`);

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile },
        });

    } catch (error) {
        console.error('❌ Error during login:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// Dashboard API
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
});

// User Profile Update APIs
app.get('/api/user/details/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('❌ Error fetching user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/user/update/:userId', async (req, res) => {
    try {
        const { username, mobile } = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.params.userId, { username, mobile }, { new: true });
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User updated successfully', updatedUser });
    } catch (err) {
        console.error('❌ Error updating user:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
