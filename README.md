# FECA

Mobile app prototype for discovering, saving, and reviewing coffee shops and brunch spots.

## Project docs

- Design system: [DESIGN.md](./DESIGN.md)
- Places/backend architecture: [docs/places-backend.md](./docs/places-backend.md)
- Social auth architecture: [docs/social-auth-architecture.md](./docs/social-auth-architecture.md)

## App setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## Google sign-in test

1. Copy `.env.example` to `.env`
2. Set:

   - `EXPO_PUBLIC_API_BASE_URL`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`

3. Create a development build

   ```bash
   npx expo run:ios
   ```

   or

   ```bash
   npx expo run:android
   ```

`@react-native-google-signin/google-signin` does not work in Expo Go.

## Stack

- Expo
- React Native
- Expo Router
- TypeScript
