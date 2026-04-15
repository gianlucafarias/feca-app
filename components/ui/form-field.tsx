import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { fecaTheme } from "@/theme/feca";

type FormFieldProps = TextInputProps & {
  label?: string;
};

export function FormField({ label, style, ...props }: FormFieldProps) {
  const multiline = props.multiline ?? false;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={fecaTheme.colors.muted}
        selectionColor={fecaTheme.colors.primary}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: fecaTheme.spacing.xs,
  },
  label: {
    ...fecaTheme.typography.label,
    color: fecaTheme.colors.muted,
  },
  input: {
    ...fecaTheme.typography.body,
    backgroundColor: fecaTheme.surfaces.low,
    borderRadius: fecaTheme.radii.sm,
    color: fecaTheme.colors.onSurface,
    minHeight: 48,
    paddingBottom: fecaTheme.spacing.sm,
    paddingHorizontal: fecaTheme.spacing.md,
    paddingTop: fecaTheme.spacing.sm,
  },
  multiline: {
    minHeight: 120,
    paddingTop: fecaTheme.spacing.md,
    textAlignVertical: "top",
  },
});
