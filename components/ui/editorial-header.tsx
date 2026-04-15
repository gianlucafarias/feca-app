import { StyleSheet, Text, View } from "react-native";

import { fecaTheme } from "@/theme/feca";

type EditorialHeaderProps = {
  label: string;
  title: string;
  description?: string;
};

export function EditorialHeader({
  label,
  title,
  description,
}: EditorialHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: fecaTheme.spacing.xs,
    paddingLeft: fecaTheme.spacing.xs,
    paddingRight: fecaTheme.spacing.md,
  },
  label: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.secondary,
    textTransform: "uppercase",
    marginBottom: fecaTheme.spacing.xxs,
  },
  title: {
    ...fecaTheme.typography.display,
    color: fecaTheme.colors.onSurface,
  },
  description: {
    ...fecaTheme.typography.body,
    color: fecaTheme.colors.muted,
    marginTop: fecaTheme.spacing.xxs,
  },
});
