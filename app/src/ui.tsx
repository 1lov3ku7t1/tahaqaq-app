import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import registry from '../../data/registry.json';
import redlines from '../../data/redlines.json';
import numbering from '../../data/numbering.json';
import announcements from '../../data/announcements.json';
import routes from '../../data/routes.json';
import domainPolicy from '../../data/domain_policy.json';
import { shipOnly, type Data } from '../../engine/engine.ts';
import type { Lang, Status } from '../../engine/types.ts';

// ---------- data (bundled: works offline) ----------
export const RAW = { registry, redlines, numbering, announcements, routes, domainPolicy } as any;
export const DATA: Data = shipOnly({ registry, redlines, numbering, announcements } as unknown as Data);
export const ROUTES = (routes.routes as any[]).filter(r => r.approved_by_lead);

// ---------- tokens ----------
export const K = {
  bg: '#000000', s1: '#111114', s2: '#1D1D22', line: '#26262C', text: '#F5F5F7', muted: '#A0A0AA',
  coral: '#FF3B5C', coralDeep: '#C4153A', amber: '#F2C46D', blue: '#8DB4FF', cream: '#F7E9DA', white: '#FFFFFF',
};
export const STATUS_COLOR: Record<Status, string> = { mismatch: K.coral, match: K.blue, unknown: K.amber };
export const serif = (l: Lang): TextStyle => ({ fontFamily: l === 'ar' ? "'Geeza Pro','Noto Naskh Arabic','Times New Roman',serif" : "Georgia,'Times New Roman',serif" });
export const sans = (l: Lang): TextStyle => ({ fontFamily: l === 'ar' ? "'Geeza Pro','SF Arabic','Noto Sans Arabic',system-ui,sans-serif" : "-apple-system,'SF Pro Text',system-ui,'Segoe UI',sans-serif" });
declare const require: (p: string) => any;
export const IMG = { logo: require('../assets/img/logo.png'), peach: require('../assets/img/peach.png'), lavender: require('../assets/img/lavender.png'), sage: require('../assets/img/sage.png') };

export const open = (url: string) => { Linking.openURL(url).catch(() => {}); };

// ---------- primitives ----------
export function Page({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <ScrollView style={{ flex: 1, backgroundColor: K.bg }} contentContainerStyle={[s.page, center && { justifyContent: 'center' }]}>{children}</ScrollView>;
}
export function H1({ l, children, style }: { l: Lang; children: React.ReactNode; style?: TextStyle }) {
  return <Text accessibilityRole="header" style={[s.h1, serif(l), style]}>{children}</Text>;
}
export function H2({ l, children }: { l: Lang; children: React.ReactNode }) {
  return <Text accessibilityRole="header" style={[s.h2, sans(l)]}>{children}</Text>;
}
export function P({ l, children, muted, style }: { l: Lang; children: React.ReactNode; muted?: boolean; style?: TextStyle }) {
  return <Text style={[s.p, sans(l), muted && { color: K.muted }, style]}>{children}</Text>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Btn({ l, label, onPress, kind = 'primary', icon, style, disabled }: { l: Lang; label: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'coral'; icon?: string; style?: ViewStyle; disabled?: boolean }) {
  const bg = kind === 'primary' ? K.white : kind === 'coral' ? K.coral : K.s2;
  const fg = kind === 'primary' ? '#000' : K.white;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} onPress={disabled ? undefined : onPress} style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.8 : 1 }, style]}>
      <Text style={[s.btnText, sans(l), { color: fg }]}>{icon ? icon + '  ' : ''}{label}</Text>
    </Pressable>
  );
}
export function Chip({ l, label, on, onPress, compact }: { l: Lang; label: string; on?: boolean; onPress?: () => void; compact?: boolean }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : 'text'} accessibilityState={{ selected: !!on }} onPress={onPress}
      style={[s.chip, compact && { minHeight: 40, paddingVertical: 6, paddingHorizontal: 16 }, on && { backgroundColor: K.white, borderColor: K.white }]}>
      <Text style={[s.chipText, sans(l), on && { color: '#000' }]}>{label}</Text>
    </Pressable>
  );
}
export function Tag({ l, label, color = K.amber }: { l: Lang; label: string; color?: string }) {
  return <View style={[s.tag, { borderColor: color }]}><Text style={[s.tagText, sans(l), { color }]}>{label}</Text></View>;
}
export function SourceChip({ l, title, date, url }: { l: Lang; title: string; date?: string | null; url?: string }) {
  return (
    <Pressable onPress={url ? () => open(url) : undefined} accessibilityRole={url ? 'link' : 'text'} style={s.src}>
      <Text style={[s.srcText, sans(l)]} numberOfLines={2}>↗ {title}{date ? ' · ' + date : ''}</Text>
    </Pressable>
  );
}
export function Mascot({ src, size = 180, glow = K.coral }: { src: any; size?: number; glow?: string }) {
  // soft coloured halo behind the tile (one focal object, like the reference screens)
  const halo: any = { alignSelf: 'center', padding: size * 0.16, borderRadius: size, backgroundImage: `radial-gradient(circle, ${glow}88 0%, ${glow}00 70%)` };
  return <View style={halo}><View style={[s.mascot, { width: size, height: size, borderRadius: size * 0.32 }]}><Image source={src} style={{ width: size, height: size }} resizeMode="cover" accessibilityIgnoresInvertColors /></View></View>;
}
// Round status mark. Colour + a mark, never a verdict word and never a number.
export function Ring({ color, mark }: { color: string; mark: string }) {
  const st: any = { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: color, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 48px ${color}66, inset 0 0 24px ${color}33` };
  return <View style={st} accessibilityElementsHidden importantForAccessibility="no"><Text style={{ color, fontSize: 40, fontWeight: '300', marginTop: -2 }}>{mark}</Text></View>;
}
export function TextLink({ l, label, onPress }: { l: Lang; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 }}><Text style={[{ color: K.muted, fontSize: 16, textDecorationLine: 'underline' }, sans(l)]}>{label}</Text></Pressable>;
}
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, paddingBottom: 32, gap: 18, maxWidth: 480, width: '100%', alignSelf: 'center' },
  h1: { color: K.text, fontSize: 36, lineHeight: 44, fontWeight: '400', textAlign: 'center' },
  h2: { color: K.muted, fontSize: 14, fontWeight: '600', marginTop: 10 },
  p: { color: K.text, fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: K.s1, borderRadius: 24, padding: 20, gap: 12 },
  btn: { minHeight: 60, borderRadius: 999, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 17, fontWeight: '600' },
  chip: { minHeight: 52, maxWidth: '100%', borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12, justifyContent: 'center', backgroundColor: K.s2, borderWidth: 1, borderColor: K.s2 },
  chipText: { color: K.text, fontSize: 17 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  tagText: { fontSize: 13, fontWeight: '600' },
  src: { alignSelf: 'flex-start', backgroundColor: K.s2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
  srcText: { color: K.muted, fontSize: 14 },
  mascot: { backgroundColor: K.cream, overflow: 'hidden', alignSelf: 'center' },
});
