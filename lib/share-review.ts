import type { RefObject } from "react";
import { Alert, Platform, Share, type View } from "react-native";

import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

export async function captureReviewImage(
  viewRef: RefObject<View | null>,
): Promise<string | null> {
  try {
    const uri = await captureRef(viewRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
    return uri;
  } catch {
    return null;
  }
}

export async function shareReviewImage(
  viewRef: RefObject<View | null>,
): Promise<void> {
  const uri = await captureReviewImage(viewRef);
  if (!uri) {
    Alert.alert("Error", "No se pudo generar la imagen de la reseña.");
    return;
  }

  const fileUri = Platform.OS === "android" ? `file://${uri}` : uri;

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    try {
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Compartir reseña",
      });
    } catch {
      fallbackShare();
    }
  } else {
    fallbackShare();
  }
}

function fallbackShare() {
  Share.share({
    message: "Mirá esta reseña en feca!",
  }).catch(() => {});
}
