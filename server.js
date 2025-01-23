const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const csv = require('csv-parser');
const FormData = require('form-data');
const cors = require('cors');

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


    sku: {
        type: String,
    },
    Image: {
        type: String
    }
});

const ProductwithImage = mongoose.model('productSchemaImage', productSchemaImage);



app.get('/api/products', async (req, res) => {
    try {
      const products = await ProductwithImage.find();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    //processCSV(); // Call the function to process CSV on server start
});


// // Function to upload image to Cloudinary
// async function uploadImage(imagePath) {
//     const formData = new FormData();
//     formData.append('file', fs.createReadStream(imagePath));
//     formData.append('upload_preset', uploadPreset);

//     try {
//         const response = await axios.post(uploadUrl, formData, {
//             headers: formData.getHeaders(),
//         });
//         return response.data.secure_url; // Return the URL of the uploaded image
//     } catch (error) {
//         console.error(`Error uploading image ${imagePath}:`, error);
//         return null;
//     }
// }
// // Function to process CSV and upload images
// async function processCSV() {
//     const results = [];
    
//     fs.createReadStream('products.csv')
//       .pipe(csv())
//       .on('data', (data) => {
//           results.push(data);
//       })
//       .on('end', async () => {
//           for (let i = 0; i < results.length; i++) {
//               const product = results[i];

//               // Check required fields
//               if (!product.sku || !product.productSubcategory || !product.productName) {
//                   console.warn(`Missing required fields for product at index ${i}:`, product);
//                   continue; // Skip this product if required fields are missing
//               }

//               // Validate expireDate
             

//               // Assuming images are named as 'image001.png', 'image002.png', etc.
//               const imageFileName = `image${String(i + 1).padStart(3, '0')}.png`;
//               const imagePath = path.join(__dirname, 'prodimages', imageFileName);

//               if (fs.existsSync(imagePath)) {
//                   const imageUrl = await uploadImage(imagePath);
//                   if (imageUrl) {
//                       const newProduct = new ProductwithImage({
//                           productSubcategory: product.productSubcategory,
//                           productName: product.productName,
//                           sku: product.sku,
//                           Image: imageUrl, 
//                       });

//                       await newProduct.save();
//                       console.log(`Saved product ${product.productName} with image URL ${imageUrl}`);
//                   }
//               } else {
//                   console.warn(`Image file ${imageFileName} does not exist for product ${product.productName}`);
//               }
//           }
//           console.log("All products processed.");
//       });
// }

// Start processing CSV when server starts
