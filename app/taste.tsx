import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/ui/chip";
import { PageBackground } from "@/components/ui/page-background";
import { paddingBottomStackScreen } from "@/components/ui/screen-padding";
import { StackScreenHeader } from "@/components/ui/stack-screen-header";
import { fetchMyTaste, fetchTasteOptions, updateMyTaste } from "@/lib/api/taste";
import { FALLBACK_TASTE_OPTIONS } from "@/lib/taste-options";
import { loadTasteProfile, saveTasteProfile } from "@/lib/taste-profile-storage";
import { useAuth } from "@/providers/auth-provider";
import { fecaTheme } from "@/theme/feca";
import type { ApiTasteOption } from "@/types/api";
import type { TasteProfileState } from "@/types/feca";

export default function TasteProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [state, setState] = useState<TasteProfileState>({ selectedIds: [] });
  const [options, setOptions] = useState<ApiTasteOption[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const remoteOptions = await fetchTasteOptions();
        if (!cancelled) {
          setOptions(remoteOptions);
        }
      } catch {
        if (!cancelled) {
          setOptions(FALLBACK_TASTE_OPTIONS);
        }
      }

      try {
        if (session?.accessToken) {
          const taste = await fetchMyTaste(session.accessToken);
          if (!cancelled) {
            if (taste.preferences.length > 0) {
              setOptions((current) =>
                current.length > 0 ? current : taste.preferences,
              );
            }
            setState({ selectedIds: taste.selectedIds });
          }
        } else {
          const localState = await loadTasteProfile();
          if (!cancelled) {
            setState(localState);
          }
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const toggle = useCallback(
    (id: string) => {
      setState((prev) => {
        const has = prev.selectedIds.includes(id);
        const selectedIds = has
          ? prev.selectedIds.filter((x) => x !== id)
          : [...prev.selectedIds, id];
        const next = { ...prev, selectedIds };

        if (session?.accessToken) {
          void updateMyTaste(session.accessToken, selectedIds)
            .then((taste) => {
              setState({ selectedIds: taste.selectedIds });
            })
            .catch(() => {});
        } else {
          void saveTasteProfile(next);
        }

        return next;
      });
    },
    [session?.accessToken],
  );

  if (!ready) {
    return (
      <PageBackground>
        <View style={styles.loading}>
          <ActivityIndicator color={fecaTheme.colors.primary} size="large" />
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: paddingBottomStackScreen(insets.bottom, fecaTheme.spacing.xxxl) },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBleed}>
          <StackScreenHeader title="Tu gusto" />
        </View>

        <Text style={styles.subtitle}>
          Construí tu perfil de preferencias: así seguir a alguien tiene sentido
          porque ves si sus elecciones resuenan con las tuyas.
        </Text>

        <View style={styles.chips}>
          {options.map((opt) => (
            <Chip
              key={opt.id}
              label={opt.label}
              onPress={() => toggle(opt.id)}
              selected={state.selectedIds.includes(opt.id)}
            />
          ))}
        </View>

        <Text style={styles.footerHint}>
          No hace falta escribir reseñas largas: estas señales alimentan tu
          identidad de gusto.
        </Text>
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: fecaTheme.spacing.xxl,
  },
  content: {
    paddingHorizontal: fecaTheme.spacing.lg,
    paddingTop: 0,
  },
  headerBleed: {
    marginHorizontal: -fecaTheme.spacing.lg,
  },
  subtitle: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    lineHeight: 22,
    marginBottom: fecaTheme.spacing.xl,
    marginTop: fecaTheme.spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: fecaTheme.spacing.sm,
  },
  footerHint: {
    ...fecaTheme.typography.meta,
    color: fecaTheme.colors.muted,
    lineHeight: 18,
    marginTop: fecaTheme.spacing.xl,
  },
});
