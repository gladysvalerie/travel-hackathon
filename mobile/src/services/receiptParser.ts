import * as FileSystem from 'expo-file-system/legacy';
import OpenAI from 'openai';
import type { ParsedReceiptData } from '../api/types';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set EXPO_PUBLIC_OPENAI_API_KEY in your .env file');
  }
  return new OpenAI({
    apiKey: apiKey,
  });
};

/**
 * Convert image URI to base64 string
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    console.log('Reading image file from:', imageUri);
    
    // Use the legacy API which still has readAsStringAsync
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('Image converted to base64, length:', base64.length);
    return base64;
  } catch (error: any) {
    console.error('Error reading image:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      uri: imageUri,
    });
    throw new Error(`Failed to read image file: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Parse receipt image using OpenAI Vision API
 */
export async function parseReceipt(imageUri: string): Promise<ParsedReceiptData> {
  try {
    const openai = getOpenAIClient();
    
    // Convert image to base64
    console.log('Converting image to base64...');
    const base64Image = await imageToBase64(imageUri);
    
    // Determine image format from URI
    const imageFormat = imageUri.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
    const imageUrl = `data:image/${imageFormat};base64,${base64Image}`;
    
    console.log('Sending image to OpenAI Vision API...');
    
    const prompt = `You are a receipt parsing assistant. Analyze this receipt image and extract structured information.

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
- Return ONLY the JSON object, no additional text or explanation
- Be accurate with numbers and prices`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, supports vision
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured data from receipt images. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.1, // Low temperature for more consistent parsing
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received');
    const parsedData = JSON.parse(content);
    
    // Validate and clean the response
    const result: ParsedReceiptData = {
      merchant: parsedData.merchant || null,
      date: parsedData.date || null,
      currency: parsedData.currency || null,
      total: parsedData.total ? parseFloat(parsedData.total) : null,
      items: Array.isArray(parsedData.items) 
        ? parsedData.items.map((item: any) => ({
            name: item.name || '',
            qty: item.qty ? parseFloat(item.qty) : undefined,
            pricePerUnit: item.pricePerUnit ? parseFloat(item.pricePerUnit) : undefined,
            lineTotal: item.lineTotal ? parseFloat(item.lineTotal) : undefined,
          }))
        : [],
    };

    console.log('Receipt parsing complete:', result);
    return result;
  } catch (error: any) {
    console.error('Receipt parsing error:', error);
    throw new Error(error.message || 'Failed to parse receipt');
  }
}
