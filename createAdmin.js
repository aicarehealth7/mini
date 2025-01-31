import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Admin from './frontend/models/admin.js'; // Adjust the path to your Admin schema file
import dotenv from 'dotenv';

dotenv.config(); // Import dotenv for environment variables

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI; // Use the connection string from the .env file
mongoose
    .connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((err) => console.error('MongoDB Atlas connection error:', err));

const createAdmin = async () => {
    // Hash the admin password
    const hashedPassword = await bcrypt.hash('Admin@0987', 10); // Replace with a secure password

    // Create a new admin
    const admin = new Admin({
        email: 'official@aicarehealth.in', // Replace with your admin email
        password: hashedPassword,
    });

    await admin.save();
    console.log('Admin user created successfully!');
    mongoose.disconnect();
};

createAdmin();
