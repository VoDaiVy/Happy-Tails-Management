# Happy Tails Mobile

React Native mobile app (Expo) that consumes backend APIs via axios.

## 1. Install and run

```bash
cd mobile
npm install
npm start
```

Then press:
- a: open Android emulator
- i: open iOS simulator (macOS only)
- or scan QR with Expo Go on your phone

## 2. Environment setup

Copy `.env.example` to `.env` and update API URL:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api
```

Notes:
- Android emulator uses `10.0.2.2` to access host machine.
- iOS simulator can usually use `http://localhost:3001/api`.
- Physical phone must use your PC LAN IP, for example: `http://192.168.1.20:3001/api`.

## 3. Current structure

- `src/config/env.ts`: reads environment variables
- `src/api/axiosClient.ts`: axios instance + bearer token interceptor
- `src/api/modules/authApi.ts`: `login`, `register`, `getMe`, `logout`, email verify APIs
- `src/api/modules/serviceApi.ts`: list/detail service APIs
- `src/api/modules/bookingApi.ts`: my bookings, checkout, cancel booking APIs
- `src/screens/LoginScreen.tsx`: real login screen (POST `/api/auth/login`)
- `src/screens/CustomerHomeScreen.tsx`: test screen for services/bookings after login
- `src/types/`: TypeScript models for auth/service/booking/api

## 4. Current app flow

- App starts at `LoginScreen`
- On successful login, access token is attached for all protected calls
- After login, `CustomerHomeScreen` can:
	- call public services endpoint (`GET /api/services`)
	- call customer bookings endpoint (`GET /api/bookings/my`)
	- logout (`POST /api/auth/logout`)

## 5. Important notes for backend compatibility

- Booking endpoint `/api/bookings/my` requires customer role.
- If you login with staff/admin account, loading my bookings may return permission error.
- For physical devices, use LAN IP in `.env`, not `localhost`.
