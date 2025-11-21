import Tesseract from 'tesseract.js';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY not set in environment variables');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

/**
 * Extract text from receipt image using Tesseract OCR
 */
async function extractTextFromImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: (m) => {
        // Optional: log progress
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from receipt image');
  }
}

/**
 * Parse receipt text using OpenAI to extract structured data
 */
async function parseReceiptText(ocrText) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file');
  }
  
  try {
    const prompt = `You are a receipt parsing assistant. Extract structured information from the following receipt text.

Receipt text:
${ocrText}

Please extract and return ONLY a valid JSON object with the following structure:
{
  "merchant": "store/restaurant name or null",
  "date": "date in ISO format (YYYY-MM-DD) or null",
  "currency": "currency code (USD, EUR, etc.) or null",
  "total": total amount as number or null,
  "items": [
    {
      "name": "item name",
      "qty": quantity as number (optional),
      "pricePerUnit": price per unit as number (optional),
      "lineTotal": total for this line as number (optional)
    }
  ]
}

Rules:
- If you cannot determine a field, use null
- Extract all items from the receipt with their prices
- If quantity or individual prices are not clear, you can omit them but try to include lineTotal
- Return ONLY the JSON object, no additional text or explanation`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, can upgrade to gpt-4o if needed
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured data from receipt text. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for more consistent parsing
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    const parsedData = JSON.parse(content);
    
    // Validate and clean the response
    return {
      merchant: parsedData.merchant || null,
      date: parsedData.date || null,
      currency: parsedData.currency || null,
      total: parsedData.total ? parseFloat(parsedData.total) : null,
      items: Array.isArray(parsedData.items) 
        ? parsedData.items.map(item => ({
            name: item.name || '',
            qty: item.qty ? parseFloat(item.qty) : undefined,
            pricePerUnit: item.pricePerUnit ? parseFloat(item.pricePerUnit) : undefined,
            lineTotal: item.lineTotal ? parseFloat(item.lineTotal) : undefined,
          }))
        : [],
    };
  } catch (error) {
    console.error('OpenAI Parsing Error:', error);
    throw new Error('Failed to parse receipt data');
  }
}

/**
 * Main function to process receipt image
 * @param {string} imagePath - Path to the uploaded image file
 * @returns {Promise<Object>} Parsed receipt data
 */
export async function parseReceipt(imagePath) {
  try {
    // Step 1: Extract text using OCR
    console.log('Extracting text from receipt image...');
    const ocrText = await extractTextFromImage(imagePath);
    
    if (!ocrText || ocrText.trim().length === 0) {
      throw new Error('No text could be extracted from the receipt image');
    }

    console.log('OCR Text extracted:', ocrText.substring(0, 200) + '...');

    // Step 2: Parse text using OpenAI
    console.log('Parsing receipt text with OpenAI...');
    const parsedData = await parseReceiptText(ocrText);

    return parsedData;
  } catch (error) {
    console.error('Receipt parsing error:', error);
    throw error;
  }
}

