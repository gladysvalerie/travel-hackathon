# Step-by-Step Testing Guide for TripLedger AI Integration

## Prerequisites Checklist

- [x] Backend dependencies installed (`npm install` in `server/` folder)
- [x] `.env` file created with your OpenAI API key
- [x] Chrome extension loaded in browser

---

## Step 1: Start the Backend Server

### Open a Terminal/PowerShell

1. Navigate to the `server` directory:
   ```powershell
   cd "C:\Users\Melvin Tang\Documents\CODING\Hackathon\server"
   ```

2. Start the server:
   ```powershell
   npm start
   ```

   You should see:
   ```
   TripLedger backend server running on http://localhost:3001
   Health check: http://localhost:3001/health
   ```

   **⚠️ Keep this terminal window open!** The server must be running for AI extraction to work.

---

## Step 2: Verify Backend is Running

### Option A: Check in Browser

1. Open your web browser
2. Navigate to: `http://localhost:3001/health`
3. You should see:
   ```json
   {"ok":true,"message":"TripLedger backend is running"}
   ```

### Option B: Check in Terminal

Look for the startup message in your terminal. If you see an error about `OPENAI_API_KEY`, make sure your `.env` file has the correct key.

---

## Step 3: Prepare a Test Booking Screenshot

### Find a Flight Booking Page

You can use:
- A real booking confirmation page (from any airline website)
- A mock booking page
- A screenshot of a booking email/PDF

**Good test examples:**
- EVA Air booking confirmation
- Any airline booking page with flight details visible
- Booking confirmation emails

---

## Step 4: Test the Extension - Full Flow

### 4.1 Open the Extension

1. Click the **TripLedger** extension icon in your Chrome toolbar
2. If not logged in, use the mock login:
   - Email: `test@example.com`
   - Password: `password123`
3. Click **Login**

### 4.2 Capture a Screenshot

1. Navigate to a flight booking page in a new tab
2. Click the **TripLedger** extension icon again
3. Click **"Screenshot booking"**
4. Choose one:
   - **"Full page"** - Captures entire visible page
   - **"Select area"** - Lets you drag to select a region

5. Wait for the screenshot preview to appear

### 4.3 Use the Screenshot

1. Review the screenshot preview
2. Click **"Use this screenshot"** button
3. The manual booking form should appear

### 4.4 Test AI Extraction

1. In the booking form, you should see:
   - A message: *"Screenshot captured. You can try 'Extract from screenshot (beta)' to prefill this form..."*
   - A button: **"Extract from screenshot (beta)"**

2. Click **"Extract from screenshot (beta)"**

3. Watch for:
   - Button changes to **"Extracting..."**
   - Status message: **"Analyzing screenshot with AI..."**
   - Wait 2-5 seconds (AI processing time)

4. **Success indicators:**
   - Status turns green: *"Fields updated (X fields filled). Please double-check everything before saving."*
   - Form fields are automatically filled with:
     - Airline name
     - Flight number
     - Origin/Destination
     - Departure/Arrival dates
     - Price and currency
     - Booking reference
     - Notes (if available)

### 4.5 Review and Save

1. **Review the auto-filled data:**
   - Check if all fields are correct
   - Verify dates and times
   - Confirm price and currency

2. **Make corrections if needed:**
   - Edit any incorrect fields manually
   - Add missing information

3. **Save the booking:**
   - Click **"Save booking"**
   - You should see a success message
   - Return to dashboard
   - Your booking should appear in "Recent bookings"

---

## Step 5: Test Error Scenarios

### Test 5.1: No Screenshot Available

1. Click **"Enter manually"** (without taking a screenshot)
2. Click **"Extract from screenshot (beta)"**
3. **Expected:** Error message: *"No screenshot available. Please capture a booking screenshot first."*

### Test 5.2: Backend Not Running

1. Stop the backend server (Ctrl+C in terminal)
2. Try to extract from screenshot
3. **Expected:** Error message about connection failure

### Test 5.3: Invalid API Key

1. Edit `.env` and set a wrong API key
2. Restart server
3. Try extraction
4. **Expected:** Error message about API key issues

---

## Step 6: Check Console for Debugging

### Open Browser Console

1. Press **F12** in Chrome
2. Go to **Console** tab
3. Look for messages like:
   - `"Sending screenshot to AI backend for analysis..."`
   - `"AI analysis successful: {...}"`
   - Any error messages

### Check Server Logs

In your terminal where the server is running, you should see:
- `"Received image for analysis (length: X chars)"`
- `"Successfully extracted booking data"`
- Or error messages if something goes wrong

---

## Expected Results

### ✅ Success Case

When everything works correctly:
- Screenshot is captured
- AI button is visible and clickable
- Extraction completes in 2-5 seconds
- Form fields are auto-filled with accurate data
- Status shows success message with count of filled fields
- Booking can be saved successfully

### ❌ Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot connect to AI backend" | Make sure server is running on port 3001 |
| "No screenshot available" | Capture a screenshot first before clicking AI button |
| "AI extraction failed" | Check API key in `.env`, check server logs |
| Fields not filling | Check browser console for errors, verify screenshot quality |
| Server won't start | Check if port 3001 is already in use, verify `npm install` completed |

---

## Quick Test Checklist

- [ ] Backend server starts without errors
- [ ] Health check endpoint returns OK
- [ ] Extension loads and login works
- [ ] Screenshot capture works (full page)
- [ ] Screenshot capture works (region selection)
- [ ] Screenshot preview displays correctly
- [ ] AI extraction button appears when screenshot is available
- [ ] AI extraction completes successfully
- [ ] Form fields are auto-filled
- [ ] Booking can be saved
- [ ] Booking appears in recent bookings list

---

## Tips for Best Results

1. **Screenshot Quality:**
   - Use clear, well-lit booking pages
   - Ensure text is readable
   - Include all relevant booking information in the screenshot

2. **Full Page vs Region:**
   - **Full page** is better for complete booking confirmations
   - **Region selection** is useful when you only want to extract from a specific part

3. **Review Before Saving:**
   - Always double-check AI-extracted data
   - Dates and times may need timezone adjustments
   - Currency codes should be verified

4. **Performance:**
   - First extraction may be slower (cold start)
   - Subsequent extractions are usually faster
   - Network speed affects response time

---

## Next Steps After Testing

Once everything works:
1. Try with different booking pages/airlines
2. Test with various screenshot types (emails, PDFs, web pages)
3. Verify data accuracy across different formats
4. Test edge cases (partial information, multiple flights, etc.)

---

## Troubleshooting

If something doesn't work:

1. **Check server is running:** Visit `http://localhost:3001/health`
2. **Check API key:** Verify `.env` file has correct key
3. **Check browser console:** Look for JavaScript errors
4. **Check server logs:** Look for backend errors
5. **Verify extension reloaded:** Reload extension in `chrome://extensions/`

For more help, check the main README.md file.

