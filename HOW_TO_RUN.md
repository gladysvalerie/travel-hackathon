# 🚀 How to Run Trip Ledger

Complete setup guide for running the Trip Ledger travel expense tracking application.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

-   **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
-   **npm** (comes with Node.js)
-   **PostgreSQL Database** (already running)
-   **Git** - [Download](https://git-scm.com/downloads)

### For Mobile Development:

-   **Expo Go** app on your phone (for physical device testing)
-   **iOS Simulator** (Mac only) or **Android Emulator** (optional)

---

## 🔧 Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Backend `.env` File

Create a file named `.env` in the `backend/` directory with the following content:

```env
# OpenAI API Configuration
# Copy this file to .env and replace with your actual API key
OPENAI_API_KEY="your_openai_api_key_here"

# Server Configuration (optional)
PORT=5000

# Database Configuration
# Prisma supports the native connection string format for PostgreSQL
# See the documentation for all the connection string options: https://pris.ly/d/connection-strings
DATABASE_URL="postgres://username:password@host:5432/database?sslmode=require"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN='7d'
```

**Important Notes:**

-   Replace `your_openai_api_key_here` with your actual OpenAI API key
-   Replace `username`, `password`, `host`, and `database` in `DATABASE_URL` with your actual PostgreSQL credentials
-   `JWT_SECRET` should be a long, random string (use a password generator)
-   `JWT_EXPIRES_IN` can be `"7d"`, `"24h"`, `"1h"`, etc.

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Run Database Migrations

```bash
npx prisma migrate dev
```

This will create all the necessary database tables.

### Step 6: Start the Backend Server

```bash
npm run dev
```

**Expected output:**

```
Running server in port: 5000
```

✅ Backend is now running on `http://localhost:5000`

---

## 📱 Mobile App Setup

### Step 1: Navigate to Mobile Directory

```bash
cd mobile
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Mobile `.env` File

Create a file named `.env` in the `mobile/` directory with the following content:

```env
# Backend API Base URL
# For physical device: Use your computer's IP address (find with: ipconfig on Windows)
# For Android Emulator: Use http://10.0.2.2:5000
# For iOS Simulator: Use http://localhost:5000
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000

# OpenAI API Key (required for receipt scanning feature)
# Get your API key from: https://platform.openai.com/api-keys
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

**Important Notes:**

-   **For Physical Devices**: Replace `localhost` with your computer's IP address
    -   Windows: Run `ipconfig` and find your IPv4 address (e.g., `192.168.1.100`)
    -   Mac/Linux: Run `ifconfig` or `ip addr` and find your IP address
    -   Example: `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:5000`
-   **For Android Emulator**: Use `http://10.0.2.2:5000`
-   **For iOS Simulator**: Use `http://localhost:5000`
-   **OpenAI API Key**: Required for receipt scanning. Get it from [OpenAI Platform](https://platform.openai.com/api-keys)

### Step 4: Start Expo Development Server

```bash
npm start
```

**Expected output:**

```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

## 🎮 Running the App

### Option A: Physical Device (Recommended for Testing)

1. **Install Expo Go** on your phone:

    - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
    - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Make sure your phone and computer are on the same WiFi network**

3. **Scan the QR code** from the terminal:
    - **Android**: Use the Expo Go app to scan
    - **iOS**: Use the Camera app to scan (will open in Expo Go)

### Option B: iOS Simulator (Mac only)

1. Make sure Xcode is installed
2. In the Expo terminal, press `i`
3. Or run: `npm run ios`

### Option C: Android Emulator

1. Start Android Studio and launch an emulator
2. In the Expo terminal, press `a`
3. Or run: `npm run android`

---

## 📁 Project Structure

```
travel-hackathon/
├── backend/                 # Node.js/Express API
│   ├── prisma/            # Database schema and migrations
│   ├── src/
│   │   ├── config/        # Database and Prisma setup
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── middleware/    # Auth middleware
│   └── .env               # Backend environment variables
│
├── mobile/                 # React Native (Expo) app
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── screens/      # Screen components
│   │   ├── components/  # Reusable components
│   │   └── services/     # Business logic (receipt parser)
│   └── .env              # Mobile environment variables
│
└── HOW_TO_RUN.md         # This file
```

---

## 🎯 Quick Start Commands

**Terminal 1 - Backend:**

```bash
cd backend
npm install
# Create backend/.env file (see above)
npx prisma generate
npx prisma migrate dev
npm run dev
```

**Terminal 2 - Mobile:**

```bash
cd mobile
npm install
# Create mobile/.env file (see above)
npm start
```

Then:

-   Press `i` for iOS simulator
-   Press `a` for Android emulator
-   Or scan QR code with Expo Go on your phone

---

## ✅ Setup Checklist

### Backend

-   [ ] Node.js installed
-   [ ] PostgreSQL running
-   [ ] `backend/.env` file created with correct values
-   [ ] Dependencies installed (`npm install`)
-   [ ] Prisma client generated (`npx prisma generate`)
-   [ ] Database migrations run (`npx prisma migrate dev`)
-   [ ] Backend server running (`npm run dev`)

### Mobile

-   [ ] Node.js installed
-   [ ] `mobile/.env` file created with correct values
-   [ ] Dependencies installed (`npm install`)
-   [ ] Expo development server running (`npm start`)
-   [ ] App running on device/emulator

### Optional

-   [ ] OpenAI API key obtained (for receipt scanning)
-   [ ] Expo Go installed on phone (for physical device testing)

---

## 📝 Environment Variables Summary

### Backend (`backend/.env`)

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=5000
DATABASE_URL=postgres://username:password@host:5432/database?sslmode=require
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN='7d'
```

### Mobile (`mobile/.env`)

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000  # Or your IP address
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here  # Required for receipt scanning
```

---

## 🎉 You're All Set!

Once both backend and mobile are running, you can start using the app to:

-   Create trips
-   Add expenses
-   Split costs among members
-   Scan receipts automatically
-   Track settlements
-   Mark transactions as settled

Happy expense tracking! 🚀
