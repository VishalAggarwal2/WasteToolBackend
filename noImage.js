const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
// MongoDB Connection
mongoose.connect('mongodb+srv://vishalaggarwal270:Nvy1HI7eJ2guvoEN@barcodeproject.d43bd.mongodb.net/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
// Define Mongoose Schema

// Define Mongoose Schema
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
    type:Number,
    default:0
  },

  sku: {
      type: String,
  },
  Image: {
      type: String
  }
});

const ProductwithImage = mongoose.model('productSchemaImage', productSchemaImage);

// Cloudinary Configuration
cloudinary.config({
  cloud_name: 'dlxdc5k0d',
  api_key: '928955478688766',
  api_secret: 'Gm4AqtZ1zKwmMk9ydYqX_DR565A'
});

// Path to Default Image
const defaultImagePath = path.join(__dirname, 'NoImage.jpeg');

// Upload NoImage.jpeg to Cloudinary Once
const uploadDefaultImage = async () => {
  try {
    const result = await cloudinary.uploader.upload(defaultImagePath);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading default image:", error);
    return null;
  }
};

// Process Products
const processProducts = async () => {
  const defaultImageUrl = await uploadDefaultImage();
  if (!defaultImageUrl) {
    console.error("Failed to upload NoImage.jpeg. Exiting.");
    return;
  }

  const products = [];
  
  fs.createReadStream('withoutImages.csv')
    .pipe(csv())
    .on('data', (row) => {
      products.push(row);
    })
    .on('end', async () => {
      console.log(`Processing ${products.length} products...`);

      for (const product of products) {
        const newProduct = new ProductwithImage({
          productSubcategory: product.productSubcategory,
          productName: product.productName,
          Image: defaultImageUrl,
          sku:product.sku
          
        });

        await newProduct.save();
        console.log(`Saved: ${product.productName} with default image.`);
      }

      console.log("All products processed.");
      mongoose.connection.close();
    });
};

processProducts();
