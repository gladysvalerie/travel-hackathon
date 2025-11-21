# Tripcance Mobile App - Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure Environment**
   - Create `.env` file in the `mobile` directory
   - Set the following variables:
     ```env
     EXPO_PUBLIC_API_BASE_URL=http://localhost:5000
     EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
     ```
   - **Note**: `EXPO_PUBLIC_OPENAI_API_KEY` is required for receipt scanning feature

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Run on Device/Emulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## Backend Requirements

The mobile app requires the backend to be running. Ensure:

- Backend server is running on the configured `BASE_URL`
- CORS is enabled for the mobile app origin
- All API endpoints are accessible

## Receipt Scanning Setup

✅ **Receipt scanning is now implemented locally in the mobile app!**

The receipt scanning feature:
1. **Uses OpenAI Vision API** to analyze receipt images directly (no OCR needed)
2. **Extracts structured data** including merchant, date, currency, total, and items
3. **No backend required** - all processing happens in the mobile app

**Setup:**
- Add `EXPO_PUBLIC_OPENAI_API_KEY` to your `.env` file (see Environment Configuration above)
- The feature will automatically work once the API key is configured

**How it works:**
- User takes/selects a receipt photo
- Tesseract OCR extracts all text from the image
- OpenAI parses the text to extract: merchant, date, currency, total, and items
- The expense form is auto-filled with the parsed data

See `src/services/receiptParser.ts` for implementation details.

## Troubleshooting

### Common Issues

1. **Cannot connect to backend**
   - Check that backend is running
   - Verify `EXPO_PUBLIC_API_BASE_URL` in `.env`
   - For physical devices, use your computer's IP address instead of `localhost`

2. **Navigation errors**
   - Clear cache: `npm start -- --clear`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

3. **TypeScript errors**
   - Run `npx tsc --noEmit` to check for type errors
   - Ensure all dependencies are installed

## Project Structure

```
mobile/
├── src/
│   ├── api/              # API client (matches backend endpoints)
│   ├── components/       # Reusable UI components
│   ├── context/          # React contexts (AuthContext)
│   ├── hooks/            # Custom hooks (useTrips, useExpenses, etc.)
│   ├── navigation/       # Navigation setup
│   ├── screens/          # Screen components
│   │   ├── auth/         # Login, SignUp, Landing
│   │   ├── trips/        # MyTrips, AddTrip, TripDetail
│   │   ├── expenses/     # TripExpenses, AddExpense
│   │   ├── members/      # TripMembers
│   │   ├── settlements/  # TripSettlements
│   │   └── profile/      # Profile
│   ├── services/         # Business logic services
│   │   └── receiptParser.ts  # Receipt OCR and parsing
│   ├── theme/            # Colors and styling
│   └── utils/            # Utility functions
├── App.tsx               # Main app entry
└── package.json
```

## API Integration

All API calls match the existing backend structure:

- **Auth**: `/auth/register`, `/auth/login`
- **User**: `/user/me`
- **Trips**: `/trip` (GET, POST), `/trip/:id` (GET, PUT, DELETE)
- **Members**: `/tripmember/:tripId/members` (POST)
- **Expenses**: `/expense/:tripId` (GET, POST), `/expense/detail/:id` (GET, PUT, DELETE)
- **Settlement**: `/settlement/:tripId` (GET)

All requests include `Authorization: Bearer <token>` header for protected routes.

## Next Steps

1. ✅ Receipt parsing is implemented locally
2. Test all flows end-to-end
3. Add error handling improvements
4. Add loading states where needed
5. Test on physical devices

