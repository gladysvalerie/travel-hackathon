# TripLedger - Travel Booking & Budget Manager

A Chrome extension that helps you capture and manage flight bookings from any website, with AI-powered data extraction using OpenAI Vision.

## Features

- 📸 **Screenshot Capture**: Full page or region selection for booking confirmations
- 🤖 **AI Extraction**: Automatically extract booking details from screenshots using OpenAI Vision
- 📝 **Manual Entry**: Fill in booking details manually or review AI-extracted data
- 💾 **Local Storage**: All bookings stored locally in Chrome sync storage
- 🔐 **Authentication**: Login/signup system (mock for now)

## Project Structure

```
.
├── manifest.json          # Chrome extension manifest (MV3)
├── src/
│   ├── popup.html        # Extension popup UI
│   ├── popup.css         # Styles
│   ├── popup.js          # Main popup logic
│   ├── background.js     # Service worker
│   ├── contentScript.js  # Content script for region selection
│   ├── api.js            # Mock API helpers
│   ├── storage.js        # Chrome storage wrapper
│   └── aiClient.js       # AI backend client
├── server/               # Node.js backend server
│   ├── index.js         # Express server with OpenAI integration
│   ├── package.json     # Backend dependencies
│   └── .env.example     # Environment variables template
└── assets/              # Extension icons
```

## Setup Instructions

### 1. Chrome Extension Setup

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the project root folder
6. The extension should now appear in your extensions list

### 2. Backend Server Setup

The backend server handles OpenAI Vision API calls. It must be running for AI extraction to work.

#### Install Dependencies

```bash
cd server
npm install
```

#### Configure Environment

1. Copy the example environment file:
   
   **On Windows (PowerShell):**
   ```powershell
   Copy-Item env.example .env
   ```
   
   **On Mac/Linux:**
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   PORT=3001
   ```

   **Important**: Never commit the `.env` file to version control!

#### Start the Server

```bash
npm start
```

The server will start on `http://localhost:3001` by default.

You should see:
```
TripLedger backend server running on http://localhost:3001
Health check: http://localhost:3001/health
```

#### Verify Backend is Working

Visit `http://localhost:3001/health` in your browser. You should see:
```json
{"ok":true,"message":"TripLedger backend is running"}
```

### 3. Configure Backend URL (Optional)

The extension is configured to use `http://localhost:3001` by default. 

To change the backend URL for production:
1. Open `src/aiClient.js`
2. Modify the `AI_BACKEND_BASE_URL` constant:
   ```javascript
   const AI_BACKEND_BASE_URL = "https://your-production-server.com";
   ```

## Usage

### Basic Flow

1. **Capture Screenshot**:
   - Navigate to a flight booking confirmation page
   - Click the TripLedger extension icon
   - Click "Screenshot booking"
   - Choose "Full page" or "Select area"
   - Review the screenshot preview

2. **Extract with AI** (optional):
   - Click "Use this screenshot"
   - In the booking form, click "Extract from screenshot (beta)"
   - Wait for AI analysis (usually 2-5 seconds)
   - Review and correct any auto-filled fields

3. **Save Booking**:
   - Fill in any missing fields
   - Double-check all information
   - Click "Save booking"
   - View your booking in the "Recent bookings" list

### Manual Entry

If you prefer to skip AI extraction:
1. Click "Enter manually" from the dashboard
2. Fill in all required fields (*)
3. Click "Save booking"

## API Endpoints

### POST /api/parse-booking

Analyzes a screenshot image using OpenAI Vision API.

**Request:**
```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```

**Response (Success):**
```json
{
  "ok": true,
  "data": {
    "passenger_name": "John Doe",
    "airline": "EVA Air",
    "flight_number": "BR196",
    "origin": "TPE",
    "destination": "NRT",
    "departure_datetime": "2025-11-17T14:30:00",
    "arrival_datetime": "2025-11-17T18:45:00",
    "price": 8200,
    "currency": "TWD",
    "booking_reference": "ABC123",
    "notes": "Economy class, 23kg baggage allowance"
  }
}
```

**Response (Error):**
```json
{
  "ok": false,
  "error": "Error message here"
}
```

## Development

### Extension Development

- Extension files use ES modules
- No bundler required - Chrome supports ES modules natively
- Reload extension in `chrome://extensions/` after code changes

### Backend Development

- Uses Express.js with CORS enabled for extension access
- OpenAI Vision API model: `gpt-4o-mini` (configurable in `server/index.js`)
- Server logs all errors but never logs full image data

## Troubleshooting

### AI Extraction Not Working

1. **Check backend is running**: Visit `http://localhost:3001/health`
2. **Check API key**: Ensure `OPENAI_API_KEY` is set in `server/.env`
3. **Check console**: Open browser console (F12) and check for error messages
4. **Check network**: Verify the extension can reach `http://localhost:3001`

### Screenshot Issues

- Ensure you're on a web page (not `chrome://` or extension pages)
- For region selection, the overlay may take a moment to appear
- If cropping fails, the full screenshot will be used as fallback

## Security Notes

- ✅ API keys are stored server-side only (never in extension code)
- ✅ Extension uses CORS to communicate with backend
- ✅ All bookings stored locally in Chrome sync storage
- ⚠️ Backend URL is currently hardcoded in `src/aiClient.js` - update for production

## TODO / Future Enhancements

- [ ] Add production backend deployment
- [ ] Implement real authentication backend
- [ ] Add booking editing/deletion
- [ ] Export bookings to CSV/JSON
- [ ] Add budget tracking features
- [ ] Support multiple currencies
- [ ] Add calendar integration

## License

ISC

