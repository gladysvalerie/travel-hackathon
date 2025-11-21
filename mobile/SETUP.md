# Tripcance Mobile App - Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Set `EXPO_PUBLIC_API_BASE_URL` to your backend URL (default: `http://localhost:5000`)

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

The receipt scanning feature requires backend implementation:

1. **Backend Endpoint**: `POST /expense/:tripId/receipts/parse`
2. **Request Format**: `multipart/form-data` with image file
3. **Response Format**:
   ```json
   {
     "merchant": "string | null",
     "date": "string | null",
     "currency": "string | null",
     "total": "number | null",
     "items": [...]
   }
   ```

4. **Backend Implementation Should**:
   - Use Tesseract OCR to extract text from receipt images
   - Use OpenAI API (GPT-4 Vision) to parse structured data
   - Return parsed data in the specified format

See `src/api/receiptApi.ts` for implementation details and TODO comments.

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

1. Implement receipt parsing endpoint on backend
2. Test all flows end-to-end
3. Add error handling improvements
4. Add loading states where needed
5. Test on physical devices

