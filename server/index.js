/**
 * TripLedger Backend Server
 * Handles OpenAI Vision API calls for flight booking screenshot analysis
 */

// Suppress punycode deprecation warning (comes from dependencies, not our code)
// This warning is harmless and will be fixed in future dependency updates
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('punycode')) {
    // Suppress punycode deprecation warnings from dependencies
    return;
  }
  // Show other warnings normally
  console.warn(warning.name, warning.message);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins (Chrome extensions use chrome-extension:// protocol)
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '10mb' })); // Large limit for base64 images

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'TripLedger backend is running' });
});

/**
 * Parse booking from screenshot using OpenAI Vision
 * POST /api/parse-booking
 * 
 * Request body:
 * {
 *   "imageDataUrl": "data:image/png;base64,..."
 * }
 */
app.post('/api/parse-booking', async (req, res) => {
  try {
    const { imageDataUrl } = req.body;

    // Validate input
    if (!imageDataUrl) {
      return res.status(400).json({
        ok: false,
        error: 'Missing imageDataUrl in request body',
      });
    }

    // Validate data URL format (accept both images and PDFs)
    if (!imageDataUrl.startsWith('data:image/') && !imageDataUrl.startsWith('data:application/pdf')) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid file format. Please upload an image (PNG, JPG, etc.) or PDF file.',
      });
    }

    console.log('Received image for analysis (length:', imageDataUrl.length, 'chars)');

    // Call OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Vision-capable model
      messages: [
        {
          role: 'system',
          content: `You are an assistant that extracts structured data from flight booking confirmations and travel itineraries. 
You are given an image of a flight booking page, ticket, or PDF screenshot. 
Your job is to extract as much information as possible into a JSON object with specific fields. 
If a field is missing or unclear, use null rather than guessing. 
Do not invent flights that do not exist in the screenshot.

Extract data for the PRIMARY or MAIN flight leg only (if multiple flights exist, choose the first/main one or the one with the largest price).

Return ONLY valid JSON with no additional text or formatting.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract flight booking information from this image and return it as a JSON object with the following structure:
{
  "passenger_name": "string or null",
  "airline": "string or null",
  "flight_number": "string or null (e.g., BR196, AA123)",
  "origin": "string or null (city name or IATA code like TPE, NRT)",
  "destination": "string or null (city name or IATA code)",
  "departure_datetime": "ISO 8601 string or null (e.g., 2025-11-17T14:30:00)",
  "arrival_datetime": "ISO 8601 string or null (e.g., 2025-11-17T18:45:00)",
  "price": "number or null (numeric value only, no currency symbols)",
  "currency": "string or null (3-letter code like USD, TWD, EUR)",
  "booking_reference": "string or null (PNR, confirmation code, booking number)",
  "notes": "string or null (any additional relevant information like fare type, cabin class, baggage allowance, etc.)"
}

Important rules:
- Use ISO 8601 format for datetime (YYYY-MM-DDTHH:MM:SS)
- Price should be a number only (e.g., 8200, not "8,200 TWD")
- Currency should be the 3-letter code if visible
- If information is unclear or not visible, use null
- Only extract what you can clearly see in the image`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl, // OpenAI accepts data URLs directly
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    let extractedData;
    try {
      extractedData = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Normalize and validate the response
    const normalized = {
      passenger_name: extractedData.passenger_name || null,
      airline: extractedData.airline || null,
      flight_number: extractedData.flight_number || null,
      origin: extractedData.origin || null,
      destination: extractedData.destination || null,
      departure_datetime: extractedData.departure_datetime || null,
      arrival_datetime: extractedData.arrival_datetime || null,
      price: typeof extractedData.price === 'number' ? extractedData.price : 
             typeof extractedData.price === 'string' ? parseFloat(extractedData.price.replace(/[^0-9.-]/g, '')) : null,
      currency: extractedData.currency || null,
      booking_reference: extractedData.booking_reference || null,
      notes: extractedData.notes || null,
    };

    console.log('Successfully extracted booking data');

    // Return success response
    res.json({
      ok: true,
      data: normalized,
    });
  } catch (error) {
    console.error('Error processing booking image:', error.message);
    
    // Don't expose internal errors to client
    const errorMessage = error.message.includes('API key') 
      ? 'OpenAI API key is missing or invalid. Please check server configuration.'
      : error.message.includes('rate limit')
      ? 'OpenAI API rate limit exceeded. Please try again later.'
      : 'Failed to analyze screenshot. Please try again.';

    res.status(500).json({
      ok: false,
      error: errorMessage,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    ok: false,
    error: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`TripLedger backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY is not set in environment variables!');
  }
});

