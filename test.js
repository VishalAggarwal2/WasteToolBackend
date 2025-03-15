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

// Upload Image to Cloudinary
const uploadImage = async (imagePath) => {
  try {
    const result = await cloudinary.uploader.upload(imagePath);
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return null;
  }
};
// Read CSV and Get Image Files
const processProducts = async () => {
  const products = [];
  const imagesDir = path.join(__dirname, 'ProductImages');
  const imageFiles = fs.readdirSync(imagesDir)
    .filter(file => file.endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); // Ensures numerical sorting

  console.log(`Found ${imageFiles.length} images.`);

  fs.createReadStream('products.csv')
    .pipe(csv())
    .on('data', (row) => {
      products.push(row);
    })
    .on('end', async () => {
      console.log(`Processing ${products.length} products...`);

      for (let i = 0; i < products.length; i++) {
        if (i >= imageFiles.length) break; 

        const product = products[i];
        const imagePath = path.join(imagesDir, imageFiles[i]);
        const imageUrl = await uploadImage(imagePath);

        if (imageUrl) {
          const newProduct = new ProductwithImage({
            productSubcategory: product.productSubcategory,
            productName: product.productName,
            Image: imageUrl,
            sku:product.sku
          });

          await newProduct.save();
          console.log(`Saved: ${product.productName} with image ${imageFiles[i]}`);
        }
      }

      console.log("All products processed.");
      mongoose.connection.close();
    });
};

processProducts();
