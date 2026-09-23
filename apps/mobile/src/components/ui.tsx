import type { ComponentProps, ReactNode, Ref } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, HIT, type Palette, radius, useStyles, useTheme } from "../lib/theme";
import { haptics } from "../lib/haptics";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/* ------------------------------------------------------------------ */
/* Large title — the top of every tab                                  */
/* ------------------------------------------------------------------ */

export function LargeTitle({
  title,
  subtitle,
  accessory,
}: {
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
}) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.largeTitleRow}>
      <View style={styles.flex}>
        <Text style={styles.largeTitle} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.6}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function IconButton({
  icon,
  label,
  onPress,
  variant = "plain",
  size = 22,
  disabled,
  color,
}: {
  icon: IconName;
  /** Spoken by VoiceOver/TalkBack — icon buttons always need one. */
  label: string;
  onPress: () => void;
  variant?: "plain" | "filled" | "tinted";
  size?: number;
  disabled?: boolean;
  color?: string;
}) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const fg = color ?? (variant === "filled" ? c.onTint : c.tint);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        variant === "filled" && { backgroundColor: c.tint },
        variant === "tinted" && { backgroundColor: c.fill },
        pressed && styles.pressedDim,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={size} color={fg} />
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  icon,
  variant = "filled",
  busy,
  disabled,
  style,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "filled" | "tinted" | "plain" | "destructive";
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const fg =
    variant === "filled" ? c.onTint : variant === "destructive" ? c.danger : c.tint;
  const bg =
    variant === "filled"
      ? c.tint
      : variant === "tinted"
        ? c.tintSoft
        : variant === "destructive"
          ? c.dangerSoft
          : "transparent";
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      accessibilityHint={accessibilityHint}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        pressed && styles.pressedDim,
        off && styles.disabled,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
          <Text style={[styles.buttonText, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

export function FilterChip({
  label,
  selected,
  onPress,
  icon,
  onRemove,
  dashed,
  accessibilityHint,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Adds a trailing ✕ — the whole chip then clears the filter. */
  onRemove?: () => void;
  dashed?: boolean;
  accessibilityHint?: string;
}) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const fg = selected ? c.inverseText : c.textMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityHint={accessibilityHint}
      onPress={() => {
        haptics.selection();
        (onRemove ?? onPress)();
      }}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [
        styles.chip,
        // Web grid filters: bare text until selected, then a solid stone pill.
        selected ? { backgroundColor: c.inverse } : null,
        dashed && styles.chipDashed,
        pressed && styles.pressedDim,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]} maxFontSizeMultiplier={1.5}>
        {label}
      </Text>
      {onRemove ? <Ionicons name="close" size={14} color={fg} /> : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Search field                                                        */
/* ------------------------------------------------------------------ */

export function SearchField({
  inputRef,
  onCancel,
  showCancel,
  ...props
}: TextInputProps & {
  inputRef?: Ref<TextInput>;
  onCancel?: () => void;
  showCancel?: boolean;
}) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const hasText = typeof props.value === "string" && props.value.length > 0;
  return (
    <View style={styles.searchRow}>
      <View style={styles.searchField}>
        <Ionicons name="search" size={17} color={c.placeholder} />
        <TextInput
          ref={inputRef}
          placeholderTextColor={c.placeholder}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          selectionColor={c.tint}
          accessibilityLabel={props.placeholder}
          {...props}
        />
        {hasText ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear text"
            hitSlop={12}
            onPress={() => props.onChangeText?.("")}
          >
            <Ionicons name="close-circle" size={18} color={c.placeholder} />
          </Pressable>
        ) : null}
      </View>
      {showCancel && onCancel ? (
        <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={8} style={styles.searchCancel}>
          <Text style={styles.searchCancelText}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Empty / loading states                                              */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.empty} accessible accessibilityLabel={[title, body].filter(Boolean).join(". ")}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={c.textFaint} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Grouped (inset) list — Settings-style                               */
/* ------------------------------------------------------------------ */

export function Section({
  header,
  footer,
  children,
}: {
  header?: string;
  footer?: string;
  children: ReactNode;
}) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.section}>
      {header ? (
        <Text style={styles.sectionHeader} accessibilityRole="header">
          {header}
        </Text>
      ) : null}
      <View style={styles.sectionBody}>{children}</View>
      {footer ? <Text style={styles.sectionFooter}>{footer}</Text> : null}
    </View>
  );
}

export function Row({
  title,
  value,
  icon,
  iconBg,
  onPress,
  destructive,
  chevron,
  first,
  trailing,
  accessibilityHint,
}: {
  title: string;
  value?: string;
  icon?: IconName;
  iconBg?: string;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
  /** The first row in a section draws no top separator. */
  first?: boolean;
  trailing?: ReactNode;
  accessibilityHint?: string;
}) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: iconBg ?? c.fill }]}>
          <Ionicons name={icon} size={17} color={iconBg ? "#fff" : c.text} />
        </View>
      ) : null}
      <View style={[styles.rowMain, !first && styles.rowDivider]}>
        <Text style={[styles.rowTitle, destructive && { color: c.danger }]} numberOfLines={2}>
          {title}
        </Text>
        {value ? (
          <Text style={styles.rowValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {trailing}
        {chevron ? <Ionicons name="chevron-forward" size={17} color={c.borderStrong} /> : null}
      </View>
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={[title, value].filter(Boolean).join(", ")}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, value].filter(Boolean).join(", ")}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.fill }]}
    >
      {content}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const c = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.segmented} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) haptics.selection();
              onChange(o.value);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, { color: active ? c.text : c.textMuted }, active && styles.segmentTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    largeTitleRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 12,
    },
    // The web's voice: lowercase italic Newsreader ("mindvault", "ask my vault").
    largeTitle: {
      fontFamily: fonts.serifItalic,
      fontSize: 38,
      lineHeight: 44,
      color: c.text,
    },
    subtitle: { fontSize: 15, color: c.textMuted, marginTop: 1 },
    accessory: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },

    iconButton: {
      width: HIT,
      height: HIT,
      borderRadius: HIT / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    pressedDim: { opacity: 0.55 },
    disabled: { opacity: 0.35 },

    button: {
      minHeight: 50,
      borderRadius: radius.full,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 18,
    },
    buttonText: { fontSize: 17, fontWeight: "600" },

    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 34,
      paddingHorizontal: 14,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "transparent",
    },
    chipDashed: { borderStyle: "dashed", borderWidth: 1, borderColor: c.borderStrong },
    chipText: { fontSize: 15, fontWeight: "500" },

    searchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    searchField: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      minHeight: 44,
      borderRadius: radius.full,
      paddingHorizontal: 14,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    searchInput: { flex: 1, fontFamily: fonts.serifItalic, fontSize: 19, color: c.text, paddingVertical: 8 },
    searchCancel: { minHeight: HIT, justifyContent: "center" },
    searchCancelText: { color: c.tint, fontSize: 17 },

    empty: { alignItems: "center", paddingHorizontal: 40, paddingVertical: 56, gap: 8 },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: c.fill,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    emptyTitle: { fontFamily: fonts.serifItalic, fontSize: 26, lineHeight: 32, color: c.textMuted, textAlign: "center" },
    emptyBody: { fontSize: 15, lineHeight: 21, color: c.textMuted, textAlign: "center" },
    emptyAction: { marginTop: 14, alignSelf: "stretch", alignItems: "center" },

    section: { marginTop: 28, marginHorizontal: 16 },
    sectionHeader: {
      fontSize: 13,
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginLeft: 16,
      marginBottom: 7,
    },
    sectionBody: { backgroundColor: c.surface, borderRadius: radius.sm + 2, overflow: "hidden" },
    sectionFooter: { fontSize: 13, lineHeight: 18, color: c.textMuted, marginHorizontal: 16, marginTop: 7 },
    row: { flexDirection: "row", alignItems: "center", paddingLeft: 16, minHeight: HIT + 2 },
    rowIcon: {
      width: 29,
      height: 29,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    rowMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: HIT + 2,
      paddingVertical: 11,
      paddingRight: 16,
    },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
    rowTitle: { flex: 1, fontSize: 17, color: c.text },
    rowValue: { fontSize: 17, color: c.textMuted, maxWidth: "55%" },

    segmented: {
      flexDirection: "row",
      backgroundColor: c.fill,
      borderRadius: 9,
      padding: 2,
    },
    segment: { flex: 1, minHeight: 32, alignItems: "center", justifyContent: "center", borderRadius: 7 },
    segmentActive: {
      backgroundColor: c.scheme === "dark" ? "#636366" : "#FFFFFF",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    segmentText: { fontSize: 14, fontWeight: "500" },
    segmentTextActive: { fontWeight: "600" },
  });
