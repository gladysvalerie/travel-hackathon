import apiClient from './apiClient';
import type { ParsedReceiptData } from './types';

/**
 * Parse receipt image using OCR and AI
 * 
 * Endpoint: POST /expense/:tripId/receipts/parse
 * 
 * Backend implementation:
 * 1. Uses Tesseract OCR to extract text from receipt image
 * 2. Uses OpenAI API to parse structured data from OCR text
 * 3. Returns ParsedReceiptData
 */
export const receiptApi = {
  parseReceipt: async (tripId: string, imageUri: string): Promise<ParsedReceiptData> => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    } as any);

    // FormData will be handled correctly by axios interceptor
    const response = await apiClient.post<ParsedReceiptData>(
      `/expense/${tripId}/receipts/parse`,
      formData
    );
    
    return response.data;
  },
};

