import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_INSTALLATION_ID_KEY = "@feca/push-installation-id";

export async function getPushInstallationId() {
  const existing = await AsyncStorage.getItem(PUSH_INSTALLATION_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = createInstallationId();
  await AsyncStorage.setItem(PUSH_INSTALLATION_ID_KEY, created);
  return created;
}

function createInstallationId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return uuid;
  }

  return `feca-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
