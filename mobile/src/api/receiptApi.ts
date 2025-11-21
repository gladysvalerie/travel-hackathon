import apiClient from './apiClient';
import type { ParsedReceiptData } from './types';

/**
 * TODO: Backend team needs to implement this endpoint
 * 
 * Endpoint: POST /expense/:tripId/receipts/parse
 * 
 * Request: multipart/form-data with image file
 * 
 * Backend implementation should:
 * 1. Use Tesseract OCR to extract text from receipt image
 * 2. Use OpenAI API (GPT-4 Vision or similar) to parse structured data from OCR text
 * 3. Return ParsedReceiptData
 * 
 * Response format:
 * {
 *   merchant: string | null,
 *   date: string | null,
 *   currency: string | null,
 *   total: number | null,
 *   items: Array<{ name: string, qty?: number, pricePerUnit?: number, lineTotal?: number }>
 * }
 */
export const receiptApi = {
  parseReceipt: async (tripId: string, imageUri: string): Promise<ParsedReceiptData> => {
    // TODO: Confirm endpoint path with backend team
    // TODO: Implement multipart/form-data upload
    // For now, this is a placeholder that will need backend implementation
    
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    } as any);

    const response = await apiClient.post<ParsedReceiptData>(
      `/expense/${tripId}/receipts/parse`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },
};

