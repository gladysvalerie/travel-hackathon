/**
 * TripLedger Backend Server
 * Handles OpenAI Vision API calls for flight booking screenshot analysis
 */

// Suppress punycode deprecation warning (comes from dependencies, not our code)
// This warning is harmless and will be fixed in future dependency updates
import dotenv from "dotenv";
dotenv.config();
process.on("warning", (warning) => {
  if (
    warning.name === "DeprecationWarning" &&
    warning.message.includes("punycode")
  ) {
    // Suppress punycode deprecation warnings from dependencies
    return;
  }
  // Show other warnings normally
  console.warn(warning.name, warning.message);
});

import express from "express";
import cors from "cors";
import OpenAI from "openai";

// Load environment variables

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins (Chrome extensions use chrome-extension:// protocol)
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "10mb" })); // Large limit for base64 images

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "TripLedger backend is running" });
});

/**
 * Get prompts based on booking type
 * @param {string} type - Booking type: "flight" | "hotel" | "restaurant" | "attraction"
 * @returns {Object} Object with system and user prompts
 */
function getPromptForType(type) {
  if (type === "hotel") {
    return {
      system: `You are an expert assistant specialized in extracting structured data from hotel booking confirmations, reservation emails, and hotel booking documents. 
You are given an image or PDF of a hotel booking confirmation, reservation page, or booking email. 
Your job is to carefully extract ALL available information into a JSON object with specific fields. 
Be thorough and extract as much detail as possible. If a field is missing or unclear, use null rather than guessing. 
Do not invent hotel bookings that do not exist in the document.

Look for:
- Hotel name (brand name, property name)
- Full address (street, city, country)
- Check-in and check-out dates
- Number of nights (calculate if dates are provided)
- Room type and description
- Number of guests/adults
- Total price and currency
- Booking platform (Agoda, Booking.com, Expedia, Hotels.com, etc.)
- Reservation/confirmation number
- Any additional notes or special requests

Return ONLY valid JSON with no additional text, markdown, or formatting.`,
      user: `Extract hotel booking information from this document and return it as a JSON object with the following EXACT structure:
{
  "hotel_name": "string or null (e.g., 'Grand Hotel Tokyo', 'Hilton Paris')",
  "hotel_address": "string or null (full street address including street number, street name)",
  "city": "string or null (city name)",
  "country": "string or null (country name)",
  "check_in_date": "YYYY-MM-DD string or null (e.g., '2025-12-24', must be YYYY-MM-DD format)",
  "check_out_date": "YYYY-MM-DD string or null (e.g., '2025-12-26', must be YYYY-MM-DD format)",
  "nights": "number or null (number of nights, calculate from dates if needed)",
  "room_type": "string or null (e.g., 'Standard Double Room', 'Deluxe Suite', 'Superior King')",
  "guests": "number or null (number of guests/adults)",
  "price": "number or null (total price as number only, no currency symbols or commas, e.g., 15000 not '15,000 TWD')",
  "currency": "string or null (3-letter currency code like USD, TWD, EUR, JPY)",
  "platform": "string or null (booking platform like 'Agoda', 'Booking.com', 'Expedia', 'Hotels.com')",
  "reservation_id": "string or null (confirmation number, booking reference, reservation code)",
  "notes": "string or null (any additional relevant information like cancellation policy, breakfast included, special requests)"
}

CRITICAL RULES:
- Dates MUST be in YYYY-MM-DD format (e.g., '2025-12-24', NOT '24/12/2025' or 'Dec 24, 2025')
- Price must be a number only (remove all commas, currency symbols, spaces - e.g., 15000 not '15,000 TWD' or '$150')
- Extract the TOTAL price for the entire stay, not per night
- If nights is not explicitly shown, calculate it from check-in and check-out dates
- Be very careful with dates - extract them accurately
- Look for all variations of hotel name (property name, brand name, etc.)
- Extract the full address including street number and name
- Platform is the booking website/service (Agoda, Booking.com, etc.)
- Reservation ID can be called: confirmation number, booking reference, reservation code, booking ID, etc.`,
    };
  } else if (type === "restaurant") {
    return {
      system: `You are an expert assistant specialized in extracting structured data from restaurant receipts, reservation confirmations, and dining booking documents. 
You are given an image or PDF of a restaurant receipt, reservation confirmation, or dining booking. 
The document may be in English, Chinese (Traditional Mandarin), or other languages. You must be able to read and extract information from Chinese characters (繁體中文) as well.
Your job is to carefully extract ALL available information into a JSON object with specific fields. 
Be thorough and extract as much detail as possible. If a field is missing or unclear, use null rather than guessing. 
Do not invent restaurant bookings that do not exist in the document.

Look for:
- Restaurant name (may be in English, Chinese, or other languages)
- Location/address (may be in English, Chinese, or other languages)
- Visit date and time
- Party size (number of people)
- Total price and currency
- Individual menu items/dishes ordered (name and price for each item)
- Any additional notes

IMPORTANT: If you can identify the restaurant name, you should search for its Google Maps URL. Construct a Google Maps search URL in the format: https://www.google.com/maps/search/?api=1&query=[RESTAURANT_NAME]+[LOCATION_TEXT] (URL-encoded). If the restaurant name and location are available, provide this URL even if it's not visible in the document.

Return ONLY valid JSON with no additional text, markdown, or formatting.`,
      user: `Extract restaurant booking/receipt information from this document and return it as a JSON object with the following EXACT structure:
{
  "restaurant_name": "string or null (restaurant name, may be in English, Chinese, or other languages)",
  "location_text": "string or null (address or location description, may be in English, Chinese, or other languages)",
  "google_maps_url": "string or null (Google Maps search URL constructed as: https://www.google.com/maps/search/?api=1&query=[RESTAURANT_NAME]+[LOCATION_TEXT] with URL encoding, or the actual Google Maps URL if visible in the document)",
  "visit_datetime": "ISO 8601 datetime string or null (e.g., '2025-12-24T19:30:00', format: YYYY-MM-DDTHH:MM:SS)",
  "party_size": "number or null (number of people in the party)",
  "price": "number or null (total price as number only, no currency symbols or commas)",
  "currency": "string or null (3-letter currency code like USD, TWD, EUR, JPY)",
  "dishes": [
    {
      "name": "string (dish/item name, may be in English, Chinese, or other languages)",
      "price": "number (price for this dish/item as number only, no currency symbols or commas)"
    }
  ],
  "notes": "string or null (any additional relevant information)"
}

CRITICAL RULES:
- Visit datetime MUST be in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g., '2025-12-24T19:30:00')
- Price must be a number only (remove all commas, currency symbols, spaces)
- Extract the TOTAL price for the meal/dining experience
- Party size is the number of people/diners
- Location text can be address, area name, or location description
- DISHES: Extract ALL individual menu items/dishes from the receipt. Each dish should have:
  - "name": The exact name of the dish/item as it appears on the receipt (preserve original language - English, Chinese, etc.)
  - "price": The price for that specific dish/item (as a number, no currency symbols)
- If no individual dishes are listed, dishes should be an empty array []
- For Google Maps URL: If restaurant_name and location_text are available, construct a search URL like: https://www.google.com/maps/search/?api=1&query=Restaurant+Name+Location (URL-encode the query parameters)
- Support Chinese (Traditional Mandarin / 繁體中文) - extract restaurant names, dish names, and locations in Chinese if present`,
    };
  } else if (type === "attraction") {
    return {
      system: `You are an expert assistant specialized in extracting structured data from attraction tickets, booking confirmations, and attraction booking documents. 
You are given an image or PDF of an attraction ticket, booking confirmation, or attraction booking. 
The document may be in English, Chinese (Traditional Mandarin), or other languages. You must be able to read and extract information from Chinese characters (繁體中文) as well.
Your job is to carefully extract ALL available information into a JSON object with specific fields. 
Be thorough and extract as much detail as possible. If a field is missing or unclear, use null rather than guessing. 
Do not invent attraction bookings that do not exist in the document.

Look for:
- Attraction name (may be in English, Chinese, or other languages)
- Location/address (may be in English, Chinese, or other languages)
- Visit date and time
- Number of tickets
- Ticket price per person
- Total price and currency
- Booking platform (Klook, KKday, official website, etc.)
- Any additional notes

IMPORTANT: If you can identify the attraction name, you should search for its Google Maps URL. Construct a Google Maps search URL in the format: https://www.google.com/maps/search/?api=1&query=[ATTRACTION_NAME]+[LOCATION_TEXT] (URL-encoded). If the attraction name and location are available, provide this URL even if it's not visible in the document.

Return ONLY valid JSON with no additional text, markdown, or formatting.`,
      user: `Extract attraction booking/ticket information from this document and return it as a JSON object with the following EXACT structure:
{
  "attraction_name": "string or null (attraction name, may be in English, Chinese, or other languages)",
  "location_text": "string or null (address or location description, may be in English, Chinese, or other languages)",
  "google_maps_url": "string or null (Google Maps search URL constructed as: https://www.google.com/maps/search/?api=1&query=[ATTRACTION_NAME]+[LOCATION_TEXT] with URL encoding, or the actual Google Maps URL if visible in the document)",
  "visit_datetime": "ISO 8601 datetime string or null (e.g., '2025-12-24T10:00:00', format: YYYY-MM-DDTHH:MM:SS)",
  "ticket_count": "number or null (number of tickets)",
  "ticket_price_per_person": "number or null (price per ticket as number only, no currency symbols or commas)",
  "price": "number or null (total price as number only, no currency symbols or commas)",
  "currency": "string or null (3-letter currency code like USD, TWD, EUR, JPY)",
  "platform": "string or null (booking platform like 'Klook', 'KKday', 'Official Website', etc.)",
  "notes": "string or null (any additional relevant information)"
}

CRITICAL RULES:
- Visit datetime MUST be in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g., '2025-12-24T10:00:00')
- Price must be a number only (remove all commas, currency symbols, spaces)
- Extract the TOTAL price for all tickets
- Ticket count is the number of tickets purchased
- Ticket price per person is the price for a single ticket
- Location text can be address, area name, or location description
- Platform is the booking website/service (Klook, KKday, official website, etc.)
- For Google Maps URL: If attraction_name and location_text are available, construct a search URL like: https://www.google.com/maps/search/?api=1&query=Attraction+Name+Location (URL-encode the query parameters)
- Support Chinese (Traditional Mandarin / 繁體中文) - extract attraction names and locations in Chinese if present`,
    };
  } else {
    // Default to flight
    return {
      system: `You are an expert assistant specialized in extracting structured data from flight booking confirmations, airline tickets, and travel itineraries. 
You are given an image or PDF of a flight booking page, ticket, or itinerary. 
Your job is to carefully extract ALL available information into a JSON object with specific fields. 
Be thorough and extract as much detail as possible. If a field is missing or unclear, use null rather than guessing. 
Do not invent flights that do not exist in the document.

Extract data for the PRIMARY or MAIN flight leg only (if multiple flights exist, choose the first/main one or the one with the largest price).

Look for:
- Passenger name
- Airline name
- Flight number (e.g., BR196, AA123)
- Origin airport (city name or IATA code)
- Destination airport (city name or IATA code)
- Departure date and time
- Arrival date and time
- Total price and currency
- Booking reference/PNR/confirmation code
- Any additional notes (cabin class, baggage, etc.)

Return ONLY valid JSON with no additional text, markdown, or formatting.`,
      user: `Extract flight booking information from this document and return it as a JSON object with the following EXACT structure:
{
  "passenger_name": "string or null (passenger name)",
  "airline": "string or null (airline name like 'EVA Air', 'American Airlines', 'Japan Airlines')",
  "flight_number": "string or null (e.g., 'BR196', 'AA123', 'JL123')",
  "origin": "string or null (city name or IATA code like 'TPE', 'NRT', 'Tokyo', 'Taipei')",
  "destination": "string or null (city name or IATA code)",
  "departure_datetime": "ISO 8601 datetime string or null (e.g., '2025-11-17T14:30:00', format: YYYY-MM-DDTHH:MM:SS)",
  "arrival_datetime": "ISO 8601 datetime string or null (e.g., '2025-11-17T18:45:00', format: YYYY-MM-DDTHH:MM:SS)",
  "price": "number or null (total price as number only, no currency symbols or commas, e.g., 8200 not '8,200 TWD')",
  "currency": "string or null (3-letter currency code like USD, TWD, EUR, JPY)",
  "booking_reference": "string or null (PNR, confirmation code, booking number, reservation code)",
  "notes": "string or null (any additional relevant information like fare type, cabin class, baggage allowance, seat assignment, etc.)"
}

CRITICAL RULES:
- Datetimes MUST be in ISO 8601 format: YYYY-MM-DDTHH:MM:SS (e.g., '2025-11-17T14:30:00')
- Price must be a number only (remove all commas, currency symbols, spaces - e.g., 8200 not '8,200 TWD' or '$820')
- Extract the TOTAL price for the flight, not per person
- Origin and destination can be city names or IATA codes (both are acceptable)
- Booking reference can be called: PNR, confirmation code, booking number, reservation code, etc.
- Extract data for the PRIMARY flight only if multiple flights are shown`,
    };
  }
}

/**
 * Parse booking from screenshot using OpenAI Vision
 * POST /api/parse-booking
 *
 * Request body:
 * {
 *   "imageDataUrl": "data:image/png;base64,..." or "data:application/pdf;base64,...",
 *   "bookingType": "flight" | "hotel" | "restaurant" | "attraction" (optional, defaults to "flight")
 * }
 */
app.post("/api/parse-booking", async (req, res) => {
  try {
    const { imageDataUrl, bookingType = "flight" } = req.body;

    // Validate input
    if (!imageDataUrl) {
      return res.status(400).json({
        ok: false,
        error: "Missing imageDataUrl in request body",
      });
    }

    // Check if it's a PDF or image
    const isPdf = imageDataUrl.startsWith("data:application/pdf");
    const isImage = imageDataUrl.startsWith("data:image/");

    if (!isPdf && !isImage) {
      return res.status(400).json({
        ok: false,
        error:
          "Invalid file format. Please upload an image (PNG, JPG, etc.) or PDF file.",
      });
    }

    console.log(
      "Received file for analysis (type:",
      isPdf ? "PDF" : "image",
      ", length:",
      imageDataUrl.length,
      "chars, bookingType:",
      bookingType,
      ")"
    );

    // Get prompt based on booking type
    const prompt = getPromptForType(bookingType);

    let responseText;

    if (isPdf) {
      // Use Responses API + input_file for PDFs
      console.log("Processing PDF using Responses API...");

      try {
        // Check if responses API is available
        if (
          !openai.responses ||
          typeof openai.responses.create !== "function"
        ) {
          throw new Error(
            "Responses API not available in this OpenAI SDK version. Please update to the latest version."
          );
        }

        const response = await openai.responses.create({
          model: "gpt-4o-mini", // Vision-capable model that supports PDFs
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_file",
                  filename: "booking.pdf",
                  file_data: imageDataUrl, // Full data URL with base64
                },
                {
                  type: "input_text",
                  text: prompt.system + "\n\n" + prompt.user,
                },
              ],
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "booking",
              schema: {
                type: "object",
                properties: {
                  // Allow any properties - this makes it flexible for all booking types
                },
                additionalProperties: true,
              },
              strict: false,
            },
          },
          max_output_tokens: 5000,
        });

        // Extract text from the response structure
        responseText = response.output?.[0]?.content?.[0]?.text;
        console.log(
          "PDF processing successful, response length:",
          responseText?.length
        );
      } catch (pdfError) {
        console.error("PDF processing error:", pdfError);
        // Provide helpful error message
        if (
          pdfError.message.includes("not available") ||
          pdfError.message.includes("not a function")
        ) {
          throw new Error(
            "PDF support requires OpenAI SDK v4.20.0 or later. Please update your dependencies: npm install openai@latest"
          );
        }
        throw new Error(`PDF processing failed: ${pdfError.message}`);
      }
    } else {
      // Use Chat Completions API for images
      console.log("Processing image using Chat Completions API...");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Vision-capable model
        messages: [
          {
            role: "system",
            content: prompt.system,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt.user,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl, // OpenAI accepts data URLs directly
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      });

      responseText = completion.choices[0]?.message?.content;
      console.log(
        "Image processing successful, response length:",
        responseText?.length
      );
    }

    if (!responseText) {
      throw new Error("No response content from OpenAI");
    }

    // Parse the response
    let extractedData;
    try {
      extractedData = JSON.parse(responseText);
      console.log(
        "Parsed JSON successfully, keys:",
        Object.keys(extractedData)
      );
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 500));
      throw new Error("Invalid JSON response from AI");
    }

    // Normalize and validate the response based on booking type
    let normalized;
    if (bookingType === "hotel") {
      normalized = {
        hotel_name: extractedData.hotel_name || null,
        hotel_address: extractedData.hotel_address || null,
        city: extractedData.city || null,
        country: extractedData.country || null,
        check_in_date: extractedData.check_in_date || null,
        check_out_date: extractedData.check_out_date || null,
        nights:
          typeof extractedData.nights === "number"
            ? extractedData.nights
            : typeof extractedData.nights === "string"
              ? parseInt(extractedData.nights, 10)
              : null,
        room_type: extractedData.room_type || null,
        guests:
          typeof extractedData.guests === "number"
            ? extractedData.guests
            : typeof extractedData.guests === "string"
              ? parseInt(extractedData.guests, 10)
              : null,
        price:
          typeof extractedData.price === "number"
            ? extractedData.price
            : typeof extractedData.price === "string"
              ? parseFloat(extractedData.price.replace(/[^0-9.-]/g, ""))
              : null,
        currency: extractedData.currency || null,
        platform: extractedData.platform || null,
        reservation_id: extractedData.reservation_id || null,
        notes: extractedData.notes || null,
      };
    } else if (bookingType === "restaurant") {
      // Normalize dishes array
      let dishes = [];
      if (Array.isArray(extractedData.dishes)) {
        dishes = extractedData.dishes
          .map((dish) => ({
            name: dish.name || "",
            price:
              typeof dish.price === "number"
                ? dish.price
                : typeof dish.price === "string"
                  ? parseFloat(dish.price.replace(/[^0-9.-]/g, ""))
                  : 0,
          }))
          .filter((dish) => dish.name && dish.price > 0); // Filter out invalid dishes
      }

      normalized = {
        restaurant_name: extractedData.restaurant_name || null,
        location_text: extractedData.location_text || null,
        google_maps_url: extractedData.google_maps_url || null,
        visit_datetime: extractedData.visit_datetime || null,
        party_size:
          typeof extractedData.party_size === "number"
            ? extractedData.party_size
            : typeof extractedData.party_size === "string"
              ? parseInt(extractedData.party_size, 10)
              : null,
        price:
          typeof extractedData.price === "number"
            ? extractedData.price
            : typeof extractedData.price === "string"
              ? parseFloat(extractedData.price.replace(/[^0-9.-]/g, ""))
              : null,
        currency: extractedData.currency || null,
        dishes: dishes, // Array of {name, price} objects
        notes: extractedData.notes || null,
      };
    } else if (bookingType === "attraction") {
      normalized = {
        attraction_name: extractedData.attraction_name || null,
        location_text: extractedData.location_text || null,
        google_maps_url: extractedData.google_maps_url || null,
        visit_datetime: extractedData.visit_datetime || null,
        ticket_count:
          typeof extractedData.ticket_count === "number"
            ? extractedData.ticket_count
            : typeof extractedData.ticket_count === "string"
              ? parseInt(extractedData.ticket_count, 10)
              : null,
        ticket_price_per_person:
          typeof extractedData.ticket_price_per_person === "number"
            ? extractedData.ticket_price_per_person
            : typeof extractedData.ticket_price_per_person === "string"
              ? parseFloat(
                  extractedData.ticket_price_per_person.replace(/[^0-9.-]/g, "")
                )
              : null,
        price:
          typeof extractedData.price === "number"
            ? extractedData.price
            : typeof extractedData.price === "string"
              ? parseFloat(extractedData.price.replace(/[^0-9.-]/g, ""))
              : null,
        currency: extractedData.currency || null,
        platform: extractedData.platform || null,
        notes: extractedData.notes || null,
      };
    } else {
      // Default to flight
      normalized = {
        passenger_name: extractedData.passenger_name || null,
        airline: extractedData.airline || null,
        flight_number: extractedData.flight_number || null,
        origin: extractedData.origin || null,
        destination: extractedData.destination || null,
        departure_datetime: extractedData.departure_datetime || null,
        arrival_datetime: extractedData.arrival_datetime || null,
        price:
          typeof extractedData.price === "number"
            ? extractedData.price
            : typeof extractedData.price === "string"
              ? parseFloat(extractedData.price.replace(/[^0-9.-]/g, ""))
              : null,
        currency: extractedData.currency || null,
        booking_reference: extractedData.booking_reference || null,
        notes: extractedData.notes || null,
      };
    }

    console.log("Successfully extracted booking data for type:", bookingType);
    const extractedFields = Object.keys(normalized).filter(
      (k) => normalized[k] !== null
    );
    console.log("Extracted fields:", extractedFields);
    console.log(
      "Extracted data sample:",
      JSON.stringify(normalized, null, 2).substring(0, 500)
    );

    // Return success response
    res.json({
      ok: true,
      data: normalized,
    });
  } catch (error) {
    console.error("Error processing booking file:", error.message);
    console.error("Error stack:", error.stack);

    // Don't expose internal errors to client
    const errorMessage = error.message.includes("API key")
      ? "OpenAI API key is missing or invalid. Please check server configuration."
      : error.message.includes("rate limit")
        ? "OpenAI API rate limit exceeded. Please try again later."
        : error.message.includes("PDF")
          ? `PDF processing failed: ${error.message}`
          : "Failed to analyze file. Please try again.";

    res.status(500).json({
      ok: false,
      error: errorMessage,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    ok: false,
    error: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`TripLedger backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "⚠️  WARNING: OPENAI_API_KEY is not set in environment variables!"
    );
  }
});