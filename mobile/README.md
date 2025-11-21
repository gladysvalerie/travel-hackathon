# Tripcance Mobile App

A React Native (Expo) mobile application for tracking and splitting travel expenses, similar to Tricount.

## Features

- **Authentication**: Sign up, login, and secure session management
- **Trip Management**: Create trips, add members, view trip details
- **Expense Tracking**: Add expenses with three split modes:
  - Equally: Split equally among all members
  - Equally Selected: Split equally among selected members
  - Custom: Set custom amounts per person
- **Receipt Scanning**: Scan receipts to auto-fill expense details (requires backend implementation)
- **Settlement Calculation**: View balances and recommended settlement transactions
- **Tricount-like Design**: Clean, simple UI with green primary color scheme

## Tech Stack

- React Native (Expo)
- TypeScript
- React Navigation (Stack + Bottom Tabs + Material Top Tabs)
- React Query for data fetching
- Axios for API calls
- Expo Image Picker for receipt scanning

## Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and set:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000
```

3. Start the development server:
```bash
npm start
```

4. Run on iOS/Android:
```bash
npm run ios
# or
npm run android
```

## Project Structure

```
mobile/
├── src/
│   ├── api/           # API client layer
│   ├── components/    # Reusable components
│   ├── context/       # React contexts (Auth)
│   ├── hooks/         # Custom React hooks
│   ├── navigation/    # Navigation setup
│   ├── screens/       # Screen components
│   ├── theme/         # Colors and theming
│   └── utils/         # Utility functions
├── App.tsx            # Main app entry point
└── package.json
```

## API Integration

The app connects to the existing Node.js backend. All API endpoints match the backend structure:

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /user/me` - Get current user
- `GET /trip` - Get all trips
- `POST /trip` - Create trip
- `GET /trip/:tripId` - Get trip details
- `POST /expense/:tripId` - Create expense
- `GET /expense/:tripId` - Get trip expenses
- `GET /settlement/:tripId` - Get settlement data
- `POST /expense/:tripId/receipts/parse` - Parse receipt (TODO: backend implementation)

## Receipt Scanning

The receipt scanning feature requires backend implementation:

1. Backend should use Tesseract OCR to extract text from receipt images
2. Backend should use OpenAI API to parse structured data from OCR text
3. Endpoint: `POST /expense/:tripId/receipts/parse`
4. Request: `multipart/form-data` with image file
5. Response: `{ merchant, date, currency, total, items }`

See `src/api/receiptApi.ts` for details and TODO comments.

## Development Notes

- All API calls use the configured `BASE_URL` from environment variables
- Authentication token is stored in AsyncStorage and attached to all requests
- React Query handles caching and automatic refetching
- Navigation is type-safe with TypeScript

## License

ISC

