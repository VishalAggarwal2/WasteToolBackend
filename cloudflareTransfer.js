const mongoose = require("mongoose");
const axios = require("axios");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const fs = require("fs");
const LOCAL_IMAGE_FOLDER = path.join(__dirname, "product_images");

// Ensure the folder exists
if(!fs.existsSync(LOCAL_IMAGE_FOLDER)){
  fs.mkdirSync(LOCAL_IMAGE_FOLDER, { recursive: true });
}

// 🔹 Manually set environment variables here
const MONGO_URI = "mongodb+srv://vishalaggarwal270:Nvy1HI7eJ2guvoEN@barcodeproject.d43bd.mongodb.net/mydatabase";
const CLOUDFLARE_ACCESS_KEY = "fbf10ad7a3bb92acfd16c5a4e1d97ea0";
const CLOUDFLARE_SECRET_KEY = "bdc4b95953686219a34741121eb10f02ac5f2dee2fd58eae4ca768c2e1d28dc6";
const CLOUDFLARE_BUCKET_NAME = "apni-mandi"
// const CLOUDFLARE_ENDPOINT = "https://pub-eb5fa4083d924e1a899b7761d2b826f3.r2.dev/";
// const CLOUDFLARE_ENDPOINT = "https://pub-eb5fa4083d924e1a899b7761d2b826f3.r2.dev/";
// const CLOUDFLARE_ENDPOINT = "https://pub-eb5fa4083d924e1a899b7761d2b826f3.r2.dev";

// const CLOUDFLARE_PUBLIC_URL = "https://pub-eb5fa4083d924e1a899b7761d2b826f3.r2.dev";
const CLOUDFLARE_ENDPOINT = "https://eb5fa4083d924e1a899b7761d2b826f3.r2.cloudflarestorage.com";
const CLOUDFLARE_PUBLIC_URL = "https://pub-eb5fa4083d924e1a899b7761d2b826f3.r2.dev";


// 🔹 Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// 🔹 Define Mongoose Schema
const productSchemaImage = new mongoose.Schema({
  productSubcategory: { type: String, required: true },
  productName: { type: String, required: true },
  Quantity: { type: Number, default: 0 },
  sku: { type: String },
  Image: { type: String }
});

const ProductwithImage = mongoose.model("productSchemaImage", productSchemaImage);

// 🔹 Cloudflare R2 Configuration (AWS SDK v3)
const r2 = new S3Client({
  region: "auto",
  endpoint: CLOUDFLARE_ENDPOINT,
  credentials: {
    accessKeyId: CLOUDFLARE_ACCESS_KEY,
    secretAccessKey: CLOUDFLARE_SECRET_KEY,
  },
});

// 🔹 Upload to Cloudflare R2
const uploadToCloudflare = async (fileBuffer, fileName) => {
  try {
    const uploadParams = {
      Bucket: CLOUDFLARE_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: "image/jpeg",
    };

    await r2.send(new PutObjectCommand(uploadParams));
    return `${CLOUDFLARE_PUBLIC_URL}/${fileName}`;
  } catch (error) {
    console.error(`❌ Failed to upload ${fileName} to Cloudflare R2:`, error);
    return null;
  }
};

// 🔹 Migrate Images from Cloudinary to Cloudflare R2
const migrateImages = async () => {
  try {
    const products = await ProductwithImage.find({ Image: { $exists: true, $ne: "" } });
    for (const product of products) {
        console.log(`🚀 Processing: ${product.productName}`);
      
        try {
          // 🔹 Download image from Cloudinary
          const response = await axios.get(product.Image, { responseType: "arraybuffer" });
      
          // 🔹 Prepare file name
          const fileName = `${product.sku || product.productName.replace(/\s+/g, "_")}.jpg`;
      
          // 🔹 Save Locally
          const localPath = path.join(LOCAL_IMAGE_FOLDER, fileName);
          fs.writeFileSync(localPath, response.data);
          console.log(`💾 Saved locally: ${localPath}`);
      
          // 🔹 Upload to Cloudflare
          const cloudflarePath = `products/${fileName}`;
          // const newImageUrl = await uploadToCloudflare(response.data, cloudflarePath);
      
          // if (newImageUrl) {
          //   // Optionally update MongoDB
          //   // await ProductwithImage.updateOne({ _id: product._id }, { $set: { Image: newImageUrl } });
          //   console.log(`✅ Uploaded to Cloudflare: ${newImageUrl}`);
          // }
        } catch (error) {
          console.error(`❌ Error processing ${product.productName}:`, error.message);
        }
      }
      
    console.log("🎉 Migration completed!");
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    mongoose.disconnect();
  }
};

// 🔹 Run the migration
  migrateImages();
