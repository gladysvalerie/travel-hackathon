# 🚀 Tripcance - Startup Guide

## ✅ Pre-flight Check

Your backend `.env` is configured correctly! Now let's get everything running.

## 📋 Step-by-Step Startup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Generate Prisma client (IMPORTANT!)
npx prisma generate

# (Optional) Run database migrations if needed
# npx prisma migrate dev

# Start the backend server
npm run dev
```

**Expected output:**
```
Running server in port: 5000
```

✅ Backend should now be running on `http://localhost:5000`

---

### 2. Mobile App Setup

**First, create the mobile `.env` file:**

```bash
# Navigate to mobile directory
cd ../mobile

# Create .env file (create this file manually)
```

Create `mobile/.env` with this content:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000
```

**Then install and start:**

```bash
# Install dependencies (if not already done)
npm install

# Start Expo development server
npm start
```

**Expected output:**
```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

### 3. Run on Device/Emulator

**Option A: Physical Device**
1. Install **Expo Go** app on your phone
2. Scan the QR code from the terminal
3. Make sure your phone and computer are on the same WiFi network

**Option B: iOS Simulator (Mac only)**
- Press `i` in the terminal where Expo is running
- Or run: `npm run ios`

**Option C: Android Emulator**
- Press `a` in the terminal where Expo is running
- Or run: `npm run android`
- Make sure Android emulator is running first

---

## 🔧 Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Change PORT in backend/.env or kill the process using port 5000
```

**Database connection issues:**
- Verify `DATABASE_URL` in `backend/.env` is correct
- Run `npx prisma generate` if you see Prisma client errors

**CORS errors:**
- Backend already has `cors()` enabled, should work fine

### Mobile App Issues

**Cannot connect to backend:**
- For **physical devices**: Change `EXPO_PUBLIC_API_BASE_URL` to your computer's IP address
  - Windows: Run `ipconfig` and find your IPv4 address
  - Example: `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:5000`
- For **emulators/simulators**: `http://localhost:5000` should work

**Module not found errors:**
```bash
cd mobile
rm -rf node_modules
npm install
```

**Expo cache issues:**
```bash
npm start -- --clear
```

---

## 🧪 Testing the App

1. **Sign Up**: Create a new account
2. **Create Trip**: Add a new trip
3. **Add Members**: Add other users to the trip (by username)
4. **Add Expense**: 
   - Try all 3 split modes (Equally, Equally Selected, Custom)
   - Test receipt scanning (will need backend implementation)
5. **View Settlements**: Check who owes whom

---

## 📝 Important Notes

1. **Receipt Scanning**: The UI is ready, but backend endpoint needs implementation:
   - Endpoint: `POST /expense/:tripId/receipts/parse`
   - Should use Tesseract OCR + OpenAI API
   - See `mobile/src/api/receiptApi.ts` for details

2. **Environment Variables**:
   - Backend `.env`: ✅ Already configured
   - Mobile `.env`: ⚠️ **You need to create this!**

3. **Database**: Make sure your Prisma database is set up and migrations are run

---

## 🎯 Quick Start Commands

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Mobile:**
```bash
cd mobile
npm start
```

Then press `i` for iOS or `a` for Android, or scan QR code with Expo Go!

---

## ✅ Checklist

- [x] Backend `.env` configured (you've done this!)
- [ ] Backend dependencies installed (`npm install` in backend/)
- [ ] Prisma client generated (`npx prisma generate` in backend/)
- [ ] Backend server running (`npm run dev` in backend/)
- [ ] Mobile `.env` file created (`mobile/.env`)
- [ ] Mobile dependencies installed (`npm install` in mobile/)
- [ ] Mobile app started (`npm start` in mobile/)
- [ ] App running on device/emulator

---

**You're all set! 🎉**

