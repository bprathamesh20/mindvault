import { memo, type ReactNode } from "react";
import { StyleSheet, Text, type TextStyle, View } from "react-native";
import { fonts, type Palette, radius, useStyles } from "../lib/theme";

/**
 * A deliberately small Markdown renderer: headings, paragraphs, lists,
 * quotes, code, rules, and inline bold / italic / code / links. Enough for
 * Ask answers and extracted documents without a WebView.
 */

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }
  | { kind: "rule" };

const BULLET = /^\s*[-*•+]\s+/;
const ORDERED = /^\s*\d+[.)]\s+/;

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++]);
      i++;
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ kind: "heading", level: h[1].length, text: h[2].replace(/\s*#+\s*$/, "") });
      i++;
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }
    if (BULLET.test(line) || ORDERED.test(line)) {
      const ordered = ORDERED.test(line);
      const re = ordered ? ORDERED : BULLET;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i++].replace(re, "");
        // Soft-wrapped continuation lines belong to the item.
        while (i < lines.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !BULLET.test(lines[i]) && !ORDERED.test(lines[i])) {
          item += ` ${lines[i++].trim()}`;
        }
        items.push(item);
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }
    if (line.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) body.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ kind: "quote", text: body.join(" ") });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !lines[i].trim().startsWith("```") &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i]) &&
      !lines[i].startsWith(">")
    ) {
      para.push(lines[i++].trim());
    }
    // Tables stay as monospaced text rather than being mangled into prose.
    if (para.every((p) => p.startsWith("|"))) blocks.push({ kind: "code", text: para.join("\n") });
    else blocks.push({ kind: "paragraph", text: para.join(" ") });
  }
  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function inline(text: string, styles: ReturnType<typeof makeStyles>, onLink?: (url: string) => void): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    if (tok.startsWith("**") || tok.startsWith("__")) {
      out.push(
        <Text key={key++} style={styles.bold}>
          {inline(tok.slice(2, -2), styles, onLink)}
        </Text>,
      );
    } else if (tok.startsWith("`")) {
      out.push(
        <Text key={key++} style={styles.inlineCode}>
          {tok.slice(1, -1)}
        </Text>,
      );
    } else if (tok.startsWith("[")) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      const label = lm?.[1] ?? tok;
      const url = lm?.[2];
      out.push(
        <Text
          key={key++}
          style={styles.link}
          accessibilityRole="link"
          onPress={url && onLink ? () => onLink(url) : undefined}
        >
          {label}
        </Text>,
      );
    } else {
      out.push(
        <Text key={key++} style={styles.italic}>
          {tok.slice(1, -1)}
        </Text>,
      );
    }
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export const Markdown = memo(function Markdown({
  children,
  onLink,
  size = "body",
  maxBlocks,
}: {
  children: string;
  onLink?: (url: string) => void;
  size?: "body" | "reader";
  /** Renders only the first N blocks — for collapsed previews. */
  maxBlocks?: number;
}) {
  const styles = useStyles(makeStyles);
  const all = parse(children);
  const blocks = maxBlocks ? all.slice(0, maxBlocks) : all;
  const base: TextStyle = size === "reader" ? styles.reader : styles.body;

  return (
    <View style={styles.root}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "heading":
            return (
              <Text key={i} style={[base, b.level <= 1 ? styles.h1 : b.level === 2 ? styles.h2 : styles.h3]} accessibilityRole="header">
                {inline(b.text, styles, onLink)}
              </Text>
            );
          case "list":
            return (
              <View key={i} style={styles.list}>
                {b.items.map((item, j) => (
                  <View key={j} style={styles.listItem}>
                    <Text style={[base, styles.marker]} accessibilityElementsHidden importantForAccessibility="no">
                      {b.ordered ? `${j + 1}.` : "•"}
                    </Text>
                    <Text style={[base, styles.listText]}>{inline(item, styles, onLink)}</Text>
                  </View>
                ))}
              </View>
            );
          case "quote":
            return (
              <View key={i} style={styles.quote}>
                <Text style={[base, styles.quoteText]}>{inline(b.text, styles, onLink)}</Text>
              </View>
            );
          case "code":
            return (
              <View key={i} style={styles.code}>
                <Text style={styles.codeText} selectable>
                  {b.text}
                </Text>
              </View>
            );
          case "rule":
            return <View key={i} style={styles.rule} />;
          default:
            return (
              <Text key={i} style={base} selectable>
                {inline(b.text, styles, onLink)}
              </Text>
            );
        }
      })}
    </View>
  );
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: { gap: 12 },
    body: { fontSize: 17, lineHeight: 24, color: c.textBody },
    reader: { fontSize: 18, lineHeight: 29, color: c.textBody, fontFamily: fonts.serif },
    h1: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: c.text, marginTop: 6 },
    h2: { fontSize: 21, lineHeight: 27, fontWeight: "700", color: c.text, marginTop: 4 },
    h3: { fontSize: 18, lineHeight: 24, fontWeight: "600", color: c.text },
    bold: { fontWeight: "700", color: c.text },
    italic: { fontStyle: "italic" },
    inlineCode: { fontFamily: fonts.mono, fontSize: 15, backgroundColor: c.fill, color: c.text },
    link: { color: c.tint, textDecorationLine: "underline" },
    list: { gap: 6 },
    listItem: { flexDirection: "row", gap: 8, paddingRight: 8 },
    marker: { minWidth: 18, color: c.textFaint },
    listText: { flex: 1 },
    quote: { borderLeftWidth: 3, borderLeftColor: c.tint, paddingLeft: 12 },
    quoteText: { fontStyle: "italic", color: c.textMuted },
    code: { backgroundColor: c.fill, borderRadius: radius.sm, padding: 12 },
    codeText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, color: c.text },
    rule: { height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginVertical: 4 },
  });
