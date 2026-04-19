import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Chip } from "@/components/ui/chip";
import { FormField } from "@/components/ui/form-field";
import { TextLinkButton } from "@/components/ui/text-link-button";
import { fecaTheme, outlineGhost } from "@/theme/feca";
import type { ReactNode } from "react";
import type { RichVisitDraft, WouldReturn } from "@/types/feca";

const NOTE_MAX = 500;
const PHOTO_MAX = 4;
/** Botón principal (referencia diseño: carbón suave) */
const PUBLISH_BTN = "#4d535e";

const RATING_LABELS = ["", "REGULAR", "ACEPTABLE", "BIEN", "GENIAL", "EXCEPCIONAL"];

type WriteReviewEditorialProps = {
  /** Bloque opcional debajo de la nota y encima de la galería (p. ej. fecha de visita). */
  belowNoteSlot?: ReactNode;
  placeName: string;
  placeAddress: string;
  placePhotoUrl?: string;
  showEditPlace: boolean;
  onEditPlace: () => void;
  isManualPlace: boolean;
  manualAddress: string;
  onManualAddressChange: (t: string) => void;
  rating: number;
  onRatingChange: (n: number) => void;
  note: string;
  onNoteChange: (t: string) => void;
  richDraft: RichVisitDraft;
  onRichDraftChange: (next: RichVisitDraft) => void;
  isSaving: boolean;
  onPublish: () => void;
  onBackFromDetails: () => void;
};

async function pickPhoto(
  currentCount: number,
  onAdd: (uri: string) => void,
) {
  if (currentCount >= PHOTO_MAX) return;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Permisos",
      "Necesitamos acceso a la galería para adjuntar fotos.",
    );
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
  });
  if (!result.canceled && result.assets[0]?.uri) {
    onAdd(result.assets[0].uri);
  }
}

export function WriteReviewEditorial(props: WriteReviewEditorialProps) {
  const {
    belowNoteSlot,
    placeName,
    placeAddress,
    placePhotoUrl,
    showEditPlace,
    onEditPlace,
    isManualPlace,
    manualAddress,
    onManualAddressChange,
    rating,
    onRatingChange,
    note,
    onNoteChange,
    richDraft,
    onRichDraftChange,
    isSaving,
    onPublish,
    onBackFromDetails,
  } = props;

  const patchDraft = (partial: Partial<RichVisitDraft>) =>
    onRichDraftChange({ ...richDraft, ...partial });

  const setPhotos = (uris: string[]) => patchDraft({ photoUris: uris });

  const removePhotoAt = (index: number) => {
    setPhotos(richDraft.photoUris.filter((_, i) => i !== index));
  };

  const toggleBool = (key: "hasParking" | "petFriendly") => {
    const cur = richDraft[key];
    patchDraft({ [key]: cur === true ? null : true } as Partial<RichVisitDraft>);
  };

  const toggleWifiGood = () => {
    const on = richDraft.wifiQuality != null && richDraft.wifiQuality >= 4;
    patchDraft({ wifiQuality: on ? null : 5 });
  };

  const toggleLittleWait = () => {
    const on = richDraft.waitLevel === 2;
    patchDraft({ waitLevel: on ? null : 2 });
  };

  const toggleQuiet = () => {
    const on = richDraft.noiseLevel === 1;
    patchDraft({ noiseLevel: on ? null : 1 });
  };

  const setWouldReturn = (v: WouldReturn) => {
    patchDraft({
      wouldReturn: richDraft.wouldReturn === v ? null : v,
    });
  };

  const setPriceTier = (tier: 1 | 2 | 3) => {
    patchDraft({
      priceTier: richDraft.priceTier === tier ? null : tier,
    });
  };

  const ratingLabel = RATING_LABELS[rating] ?? "";
  const ratingLine =
    rating > 0
      ? `${ratingLabel} · ${rating.toFixed(1)}`
      : "Elegí una puntuación";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior={
        Platform.OS === "ios" ? "never" : undefined
      }
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={false}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      <View style={styles.placeCard}>
        <View style={styles.placeCardInner}>
          {placePhotoUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: placePhotoUrl }}
              style={styles.placeCircle}
            />
          ) : (
            <View style={[styles.placeCircle, styles.placeCircleFallback]}>
              <Ionicons
                color={fecaTheme.colors.muted}
                name="cafe-outline"
                size={26}
              />
            </View>
          )}
          <View style={styles.placeTextCol}>
            <Text style={styles.reviewingEyebrow}>RESEÑANDO</Text>
            <Text numberOfLines={3} style={styles.placeName}>
              {placeName}
            </Text>
            <Text numberOfLines={2} style={styles.placeLocation}>
              {placeAddress || "—"}
            </Text>
            {showEditPlace ? (
              <TextLinkButton label="Cambiar lugar" onPress={onEditPlace} />
            ) : null}
          </View>
        </View>
      </View>

      {isManualPlace ? (
        <FormField
          label="Dirección"
          onChangeText={onManualAddressChange}
          placeholder="Calle y barrio"
          value={manualAddress}
        />
      ) : null}

      <Text style={styles.experienceQuestion}>¿Cómo fue tu experiencia?</Text>

      <View style={styles.starsWrap}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            hitSlop={6}
            onPress={() => onRatingChange(value)}
          >
            <Ionicons
              color={
                value <= rating
                  ? fecaTheme.colors.onSurface
                  : fecaTheme.colors.iconSubtle
              }
              name={value <= rating ? "star" : "star-outline"}
              size={36}
            />
          </Pressable>
        ))}
      </View>
      <Text style={styles.ratingCaption}>{ratingLine}</Text>

      <View style={styles.noteShell}>
        <TextInput
          maxLength={NOTE_MAX}
          multiline
          onChangeText={(t) => onNoteChange(t.slice(0, NOTE_MAX))}
          placeholder="Describí el ambiente, el tostado y el servicio…"
          placeholderTextColor={fecaTheme.colors.muted}
          style={styles.noteInput}
          textAlignVertical="top"
          value={note}
        />
        <Text style={styles.noteCounter}>
          {note.length} / {NOTE_MAX}
        </Text>
      </View>

      {belowNoteSlot ? (
        <View style={styles.belowNoteSlot}>{belowNoteSlot}</View>
      ) : null}

      <View style={styles.galleryHeader}>
        <Text style={styles.galleryTitle}>GALERÍA</Text>
        <Text style={styles.galleryMeta}>Máx. {PHOTO_MAX} fotos</Text>
      </View>

      <View style={styles.galleryRow}>
        {[0, 1, 2, 3].map((slot) => {
          const uri = richDraft.photoUris[slot];
          if (uri) {
            return (
              <View key={`p-${slot}`} style={styles.galleryCell}>
              <View style={styles.gallerySlot}>
                <Image
                  contentFit="cover"
                  source={{ uri }}
                  style={styles.galleryPhoto}
                />
                <Pressable
                  accessibilityLabel="Quitar foto"
                  hitSlop={6}
                  onPress={() => removePhotoAt(slot)}
                  style={styles.photoRemove}
                >
                  <Ionicons
                    color={fecaTheme.colors.onPrimary}
                    name="close"
                    size={14}
                  />
                </Pressable>
              </View>
              </View>
            );
          }
          if (slot === richDraft.photoUris.length) {
            return (
              <View key="upload" style={styles.galleryCell}>
                <Pressable
                  accessibilityLabel="Subir foto"
                  accessibilityRole="button"
                  onPress={() =>
                    void pickPhoto(richDraft.photoUris.length, (newUri) =>
                      setPhotos(
                        [...richDraft.photoUris, newUri].slice(0, PHOTO_MAX),
                      ),
                    )
                  }
                  style={styles.uploadSlot}
                >
                  <Ionicons
                    color={fecaTheme.colors.muted}
                    name="camera-outline"
                    size={22}
                  />
                  <Text style={styles.uploadLabel}>SUBIR</Text>
                </Pressable>
              </View>
            );
          }
          return (
            <View key={`e-${slot}`} style={styles.galleryCell}>
              <View style={styles.emptySlot} />
            </View>
          );
        })}
      </View>

      <View style={styles.optionalSection}>
        <Text style={styles.optionalEyebrow}>DETALLES (OPCIONAL)</Text>
        <Text style={styles.optionalHint}>
          Tocá solo lo que quieras compartir; no hace falta completar nada.
        </Text>

        <View style={styles.optionalBlock}>
          <Text style={styles.optionalLabel}>¿Volverías?</Text>
          <View style={styles.chipRow}>
            <Chip
              label="Sí"
              onPress={() => setWouldReturn("yes")}
              selected={richDraft.wouldReturn === "yes"}
            />
            <Chip
              label="Tal vez"
              onPress={() => setWouldReturn("maybe")}
              selected={richDraft.wouldReturn === "maybe"}
            />
            <Chip
              label="No"
              onPress={() => setWouldReturn("no")}
              selected={richDraft.wouldReturn === "no"}
            />
          </View>
        </View>

        <View style={styles.optionalBlock}>
          <Text style={styles.optionalLabel}>Precio percibido</Text>
          <View style={styles.chipRow}>
            <Chip
              label="$"
              onPress={() => setPriceTier(1)}
              selected={richDraft.priceTier === 1}
            />
            <Chip
              label="$$"
              onPress={() => setPriceTier(2)}
              selected={richDraft.priceTier === 2}
            />
            <Chip
              label="$$$"
              onPress={() => setPriceTier(3)}
              selected={richDraft.priceTier === 3}
            />
          </View>
        </View>

        <View style={styles.optionalBlock}>
          <Text style={styles.optionalLabel}>En el lugar</Text>
          <View style={styles.chipRow}>
            <Chip
              label="Estacionamiento"
              onPress={() => toggleBool("hasParking")}
              selected={richDraft.hasParking === true}
            />
            <Chip
              label="Buen wifi"
              onPress={toggleWifiGood}
              selected={
                richDraft.wifiQuality != null && richDraft.wifiQuality >= 4
              }
            />
            <Chip
              label="Pet friendly"
              onPress={() => toggleBool("petFriendly")}
              selected={richDraft.petFriendly === true}
            />
          </View>
          <View style={styles.chipRow}>
            <Chip
              label="Poca espera"
              onPress={toggleLittleWait}
              selected={richDraft.waitLevel === 2}
            />
            <Chip
              label="Tranquilo"
              onPress={toggleQuiet}
              selected={richDraft.noiseLevel === 1}
            />
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={onPublish}
        style={({ pressed }) => [
          styles.publishBtn,
          pressed && styles.publishBtnPressed,
          isSaving && styles.publishBtnDisabled,
        ]}
      >
        <Text style={styles.publishBtnLabel}>
          {isSaving ? "PUBLICANDO…" : "PUBLICAR RESEÑA"}
        </Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Al publicar, aceptás nuestras normas editoriales y de comunidad.
      </Text>

      <TextLinkButton label="Volver" onPress={onBackFromDetails} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: fecaTheme.spacing.xxl,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: 0,
  },
  belowNoteSlot: {
    marginBottom: fecaTheme.spacing.lg,
    marginTop: -fecaTheme.spacing.sm,
  },
  placeCard: {
    marginBottom: fecaTheme.spacing.lg,
  },
  placeCardInner: {
    alignItems: "flex-start",
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.lg,
    flexDirection: "row",
    gap: fecaTheme.spacing.md,
    padding: fecaTheme.spacing.lg,
  },
  placeCircle: {
    borderRadius: 999,
    height: 64,
    width: 64,
  },
  placeCircleFallback: {
    alignItems: "center",
    backgroundColor: fecaTheme.surfaces.high,
    justifyContent: "center",
  },
  placeTextCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  reviewingEyebrow: {
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  placeName: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_700Bold_Italic",
    fontSize: 20,
    lineHeight: 26,
  },
  placeLocation: {
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  optionalSection: {
    gap: fecaTheme.spacing.md,
    marginBottom: fecaTheme.spacing.lg,
  },
  optionalEyebrow: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  optionalHint: {
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: -fecaTheme.spacing.sm,
  },
  optionalBlock: {
    gap: fecaTheme.spacing.sm,
  },
  optionalLabel: {
    color: fecaTheme.colors.onSurfaceVariant,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  experienceQuestion: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_500Medium_Italic",
    fontSize: 20,
    lineHeight: 26,
    marginBottom: fecaTheme.spacing.md,
    textAlign: "center",
  },
  starsWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: fecaTheme.spacing.sm,
    justifyContent: "center",
    marginBottom: fecaTheme.spacing.sm,
  },
  ratingCaption: {
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: fecaTheme.spacing.xl,
    textAlign: "center",
    textTransform: "uppercase",
  },
  noteShell: {
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.lg,
    gap: fecaTheme.spacing.sm,
    marginBottom: fecaTheme.spacing.xl,
    minHeight: 168,
    paddingBottom: fecaTheme.spacing.md,
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: fecaTheme.spacing.md,
  },
  noteInput: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "Newsreader_400Regular_Italic",
    fontSize: 17,
    lineHeight: 24,
    minHeight: 120,
  },
  noteCounter: {
    alignSelf: "flex-end",
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
  },
  galleryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: fecaTheme.spacing.md,
  },
  galleryTitle: {
    color: fecaTheme.colors.onSurface,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  galleryMeta: {
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
  },
  galleryRow: {
    flexDirection: "row",
    gap: fecaTheme.spacing.xs,
    justifyContent: "space-between",
    marginBottom: fecaTheme.spacing.xl,
  },
  galleryCell: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  gallerySlot: {
    position: "relative",
  },
  galleryPhoto: {
    aspectRatio: 1,
    borderRadius: 999,
    maxWidth: 72,
    width: "100%",
  },
  photoRemove: {
    alignItems: "center",
    backgroundColor: "rgba(50,51,48,0.65)",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    top: -2,
    width: 24,
  },
  uploadSlot: {
    alignItems: "center",
    aspectRatio: 1,
    borderColor: outlineGhost,
    borderRadius: 999,
    borderStyle: "dashed",
    borderWidth: 1.5,
    justifyContent: "center",
    maxWidth: 72,
    width: "100%",
  },
  uploadLabel: {
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  emptySlot: {
    aspectRatio: 1,
    backgroundColor: fecaTheme.surfaces.high,
    borderRadius: 999,
    maxWidth: 72,
    width: "100%",
  },
  publishBtn: {
    alignItems: "center",
    backgroundColor: PUBLISH_BTN,
    borderRadius: fecaTheme.radii.pill,
    marginBottom: fecaTheme.spacing.md,
    paddingVertical: fecaTheme.spacing.md,
  },
  publishBtnPressed: {
    opacity: 0.92,
  },
  publishBtnDisabled: {
    opacity: 0.55,
  },
  publishBtnLabel: {
    color: fecaTheme.colors.surfaceBright,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    letterSpacing: 1,
  },
  disclaimer: {
    color: fecaTheme.colors.muted,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: fecaTheme.spacing.lg,
    textAlign: "center",
  },
});
