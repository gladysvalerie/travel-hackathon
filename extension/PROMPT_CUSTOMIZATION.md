# How to Customize the LLM Prompt

The LLM prompt is located in `server/index.js` starting at **line 70**.

## Prompt Structure

There are **3 main parts** you can customize:

### 1. Model Selection (Line 71)

```javascript
model: 'gpt-4o-mini', // Vision-capable model
```

**Available models:**
- `'gpt-4o-mini'` - Cheaper, faster (current)
- `'gpt-4o'` - More accurate, slower, more expensive
- `'gpt-4-turbo'` - Alternative vision model

### 2. System Message (Lines 74-83)

This sets the AI's role and overall behavior:

```javascript
{
  role: 'system',
  content: `You are an assistant that extracts structured data from flight booking confirmations and travel itineraries. 
You are given an image of a flight booking page, ticket, or PDF screenshot. 
Your job is to extract as much information as possible into a JSON object with specific fields. 
If a field is missing or unclear, use null rather than guessing. 
Do not invent flights that do not exist in the screenshot.

Extract data for the PRIMARY or MAIN flight leg only (if multiple flights exist, choose the first/main one or the one with the largest price).

Return ONLY valid JSON with no additional text or formatting.`,
}
```

**What to modify here:**
- Change the AI's role description
- Add specific instructions about accuracy
- Modify behavior rules (e.g., "be more lenient", "extract all flights", etc.)

### 3. User Message (Lines 86-118)

This contains the specific extraction instructions and JSON schema:

```javascript
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
        url: imageDataUrl,
      },
    },
  ],
}
```

**What to modify here:**
- Add/remove JSON fields
- Change field descriptions
- Modify extraction rules
- Add specific instructions for edge cases

## Example Customizations

### Example 1: Add More Fields

To extract additional information, modify the JSON schema in the user message:

```javascript
text: `Extract flight booking information from this image and return it as a JSON object with the following structure:
{
  "passenger_name": "string or null",
  "airline": "string or null",
  "flight_number": "string or null",
  "origin": "string or null",
  "destination": "string or null",
  "departure_datetime": "ISO 8601 string or null",
  "arrival_datetime": "ISO 8601 string or null",
  "price": "number or null",
  "currency": "string or null",
  "booking_reference": "string or null",
  "seat_number": "string or null",  // NEW FIELD
  "cabin_class": "string or null",  // NEW FIELD
  "baggage_allowance": "string or null",  // NEW FIELD
  "notes": "string or null"
}
...
```

**Important:** You'll also need to update the normalization section (lines 141-154) to include these new fields!

### Example 2: Change Model to More Accurate Version

```javascript
model: 'gpt-4o', // More accurate but slower and more expensive
```

### Example 3: Extract Multiple Flights

Modify the system message:

```javascript
content: `You are an assistant that extracts structured data from flight booking confirmations.
Extract ALL flight legs if multiple flights exist in the screenshot.
Return an array of flight objects if multiple flights are present.
...
```

### Example 4: Be More Lenient with Guessing

```javascript
content: `You are an assistant that extracts structured data from flight booking confirmations.
If a field is partially visible or you can make a reasonable inference, provide your best guess.
Only use null if the information is completely unavailable.
...
```

## Important Notes

1. **After modifying the prompt, restart the server:**
   - Stop the server (Ctrl+C)
   - Run `npm start` again

2. **If you add new JSON fields:**
   - Update the normalization section (lines 141-154)
   - Update the frontend form if needed (`src/popup.html` and `src/popup.js`)

3. **Test your changes:**
   - Try with different booking screenshots
   - Check the browser console for errors
   - Verify the extracted data matches your expectations

4. **Token limits:**
   - Current `max_tokens: 500` (line 122)
   - Increase if you need longer responses
   - Be aware of cost implications

## File Location

**File:** `server/index.js`  
**Lines:** 70-123 (prompt configuration)  
**Lines:** 141-154 (response normalization - update if you add fields)

## Quick Reference

| What to Change | Line Number | Description |
|---------------|-------------|-------------|
| Model | 71 | Change AI model (gpt-4o-mini, gpt-4o, etc.) |
| System Role | 74-83 | Overall AI behavior and role |
| JSON Schema | 90-103 | Fields to extract |
| Extraction Rules | 105-110 | Specific instructions |
| Max Tokens | 122 | Response length limit |
| Response Normalization | 141-154 | Process extracted data |

