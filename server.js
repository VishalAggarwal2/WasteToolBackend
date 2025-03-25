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
    res.json({ message: `Welcome, ${user.role} ${user.name}!`,userId:user._id, role: user.role, name: user.name, success: true });
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


// Cart Schema
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserWasteWithImage', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'productSchemaImage', required: true },
      quantity: { type: Number, required: true, min: 1 },
      dateTime: { type: Date, default: Date.now }  // Store timestamp for each item
    }
  ]
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);


cartSchema.pre('save', function (next) {
  this.dateTime = new Date();
  next();
});

app.post('/cart', async (req, res) => {
  try {
    const { userId, items } = req.body; // items should be an array of { productId, quantity }

    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    for (let { productId, quantity } of items) {
      if (!productId || !quantity || quantity < 1) {
        return res.status(400).json({ message: 'Invalid product data' });
      }

      // Instead of updating an existing entry, push a new one every time
      cart.items.push({ product: productId, quantity, dateTime: new Date() });
    }

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Get user's cart
app.get('/cart/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.params.userId }).populate('items.product');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Remove item from cart
app.delete('/cart/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.get('/carts', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count of all items inside carts for pagination metadata
    const totalItems = await Cart.aggregate([
      { $unwind: "$items" },
      { $count: "total" }
    ]);

    const totalRecords = totalItems.length > 0 ? totalItems[0].total : 0;
    const totalPages = Math.ceil(totalRecords / limit);

    // Fetch carts and populate user and product details
    const carts = await Cart.find().sort({ createdAt: -1 }) // Sort carts by creation date
      .populate({ path: 'user', select: 'name role' })
      .populate({
        path: 'items.product',
        select: 'productSubcategory productName Quantity sku Image'
      });

    // Apply pagination manually and sort items by dateTime
    const paginatedCarts = carts.map(cart => {
      // Sort items by dateTime (most recent first)
      const sortedItems = cart.items.sort((a, b) => b.dateTime - a.dateTime);
      
      // Apply pagination to items
      const paginatedItems = sortedItems.slice(skip, skip + parseInt(limit));

      return { ...cart.toObject(), items: paginatedItems };
    });

    if (!paginatedCarts || paginatedCarts.length === 0) {
      return res.status(404).json({ message: 'No carts found' });
    }

    res.status(200).json({
      carts: paginatedCarts,
      pagination: {
        totalItems: totalRecords,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching carts:', error);
    res.status(500).json({ message: 'Server error while fetching carts' });
  }
});


app.get("/",(req,res)=>{
  res.send("App Backend Running Succ")
})

app.get('/carts', async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Get total count of carts
    const totalCarts = await Cart.countDocuments();

    // Fetch paginated carts with user and product details
    const carts = await Cart.find()
      .populate({
        path: 'user',
        select: 'name role', // Include only necessary fields
      })
      .populate({
        path: 'items.product',
        select: 'productSubcategory productName Quantity sku Image', // Include only necessary fields
      })
      .skip(skip)
      .limit(limit);

    if (!carts || carts.length === 0) {
      return res.status(404).json({ message: 'No carts found' });
    }

    // Remove items with null products
    const filteredCarts = carts.map(cart => ({
      ...cart.toObject(),
      items: cart.items.filter(item => item.product !== null)
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalCarts / limit);

    // Return paginated carts with metadata
    res.status(200).json({
      carts: filteredCarts,
      pagination: {
        totalCarts,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching carts:', error);
    res.status(500).json({ message: 'Server error while fetching carts' });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    //processCSV();  
    // Call the function to process CSV on server start
});



