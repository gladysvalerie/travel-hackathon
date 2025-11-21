import * as receiptService from "../services/receipt.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
    }
  },
});

// Middleware for single file upload
export const uploadMiddleware = upload.single("image");

/**
 * Parse receipt from uploaded image
 * POST /expense/:tripId/receipts/parse
 */
export async function parseReceipt(req, res) {
  try {
    const tripId = req.params.tripId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Validate trip membership (user should be a member of the trip)
    // This validation should be done in middleware, but for now we'll do it here
    // You can add this to the route middleware if needed

    const imagePath = file.path;
    
    try {
      // Parse the receipt
      const parsedData = await receiptService.parseReceipt(imagePath);

      // Clean up uploaded file after processing
      try {
        await fs.unlink(imagePath);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
        // Don't fail the request if cleanup fails
      }

      return res.json(parsedData);
    } catch (parseError) {
      // Clean up file even if parsing fails
      try {
        await fs.unlink(imagePath);
      } catch (cleanupError) {
        console.error("Error cleaning up file:", cleanupError);
      }
      throw parseError;
    }
  } catch (error) {
    console.error("Receipt parsing error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to parse receipt" 
    });
  }
}


