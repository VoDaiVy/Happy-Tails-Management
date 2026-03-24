import { Platform } from "react-native";

const DEFAULT_API_URL = "http://localhost:3001/api";
const ANDROID_EMULATOR_API_URL = "http://10.0.2.2:3001/api";

function resolveApiBaseUrl() {
  const raw = (process.env.EXPO_PUBLIC_API_URL || "").trim();

  if (!raw) {
    return Platform.OS === "android" ? ANDROID_EMULATOR_API_URL : DEFAULT_API_URL;
  }

  if (__DEV__ && Platform.OS === "android") {
    if (raw.includes("localhost") || raw.includes("127.0.0.1")) {
      return ANDROID_EMULATOR_API_URL;
    }
  }

  return raw;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "",
};
