const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const path = require('path');
const axios = require('axios');
const csv = require('csv-parser');
const FormData = require('form-data');
const cors = require('cors');
const { type } = require('os');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 9004;

// MongoDB Connection
mongoose
  .connect('mongodb+srv://vishalaggarwal270:Nvy1HI7eJ2guvoEN@barcodeproject.d43bd.mongodb.net/mydatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Cloudinary Configuration
const uploadUrl = 'https://api.cloudinary.com/v1_1/dku5orixv/image/upload';
const uploadPreset = 'apnimandi';

// Product Schema
const productSchemaImage = new mongoose.Schema({

    productSubcategory: {
        type: String,
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    Quantity:{
      type:Number
    },

    sku: {
        type: String,
    },
    Image: {
        type: String
    }
});

const ProductwithImage = mongoose.model('productSchemaImage', productSchemaImage);





const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  password: { type: String, required: true },
});
const User = mongoose.model('UserWasteWithImage', userSchema);

// Login route
app.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    // logData(`Login request received: ${JSON.stringify(req.body)}`);

    if (!name || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ name });
    if (!user) {
      // logData(`Login failed: User not found - ${name}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      // logData(`Login failed: Invalid credentials for user - ${name}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // logData(`User logged in: ${user.name}, Role: ${user.role}`);
    res.json({ message: `Welcome, ${user.role} ${user.name}!`, role: user.role, name: user.name, success: true });
  } catch (error) {
    // logData(`Error logging in: ${error.message}`);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// List all users
app.get('/users', async (req, res) => {
  try {
    // logData('Fetch all users request received');

    const users = await User.find({}, 'name role');
    // logData(`Users fetched: ${JSON.stringify(users)}`);
    res.json({ users });
  } catch (error) {
    // logData(`Error fetching users: ${error.message}`);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Routes
// Register a new user
app.post('/register', async (req, res) => {
  try {
    const { name, role, password } = req.body;
    // logData(`Register request received: ${JSON.stringify(req.body)}`);

    if (!name || !role || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ name, role });
    if (existingUser) {
      // logData(`User already exists: ${name}, ${role}`);
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = new User({ name, role, password: hashedPassword });
    await newUser.save();

    // logData(`User registered successfully: ${name}, ${role}`);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    // logData(`Error registering user: ${error.message}`);
    res.status(500).json({ message: 'Error registering user' });
  }
});



app.get('/api/products', async (req, res) => {
    try {
      const products = await ProductwithImage.find();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });


  app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { Quantity } = req.body;

    if (Quantity < 0) {
        return res.status(400).json({ message: "Quantity cannot be negative." });
    }

    try {
        const updatedProduct = await ProductwithImage.findByIdAndUpdate(
            id,
            { Quantity },
            { new: true } // Returns the updated document
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    //processCSV(); // Call the function to process CSV on server start
});

