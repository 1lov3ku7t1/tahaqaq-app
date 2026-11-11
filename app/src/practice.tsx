import React, { useState } from 'react';
import { View } from 'react-native';
import practice from '../../data/practice.json';
import { analyze, OUTCOMES, STATUS } from '../../engine/engine.ts';
import type { Lang, Taps, SenderIs } from '../../engine/types.ts';
import { Btn, Card, Chip, DATA, H1, H2, IMG, K, Mascot, P, Page, Row, SourceChip, STATUS_COLOR, Tag } from './ui';

// Sourced only: R = verbatim text from a warning, S = scenario from a warning that published no text, G = official feed item.
type Round = { id: string; broken: 'who' | 'channel' | 'ask' | 'nothing'; text?: string; taps?: Taps; senderIs?: SenderIs; scenario_en?: string; scenario_ar?: string;
  note_en: string; note_ar: string; source_url: string; source_title: string; publisher: string; published: string; check: string };
const ALL = (practice.rounds as Round[]).filter(r => r.source_url && r.published);
const hasAr = (r: Round) => /[\u0600-\u06ff]/.test(r.text ?? '');
const PICKS = { en: { who: 'Who', channel: 'How it reached you', ask: 'What it asks', nothing: 'Nothing is broken' }, ar: { who: 'من المرسل', channel: 'كيف وصلت', ask: 'ماذا تطلب', nothing: 'لا يوجد خلل' } };
const W = {
  title: { en: 'Find the broken link', ar: 'ابحث عن الحلقة المكسورة' },
  which: { en: 'Which link is broken?', ar: 'أي حلقة مكسورة؟' },
  scenario: { en: 'Scenario from the warning (no message text was published)', ar: 'سيناريو من التحذير (لم يُنشر نص الرسالة)' },
  quoted: { en: 'Quoted in an official warning', ar: 'منقولة من تحذير رسمي' },
  feed: { en: 'From the official feed', ar: 'من المصدر الرسمي' },
  answer: { en: 'Broken link', ar: 'الحلقة المكسورة' },
  engine: { en: 'What Tahaqaq shows for it', ar: 'ماذا يُظهر تحقّق لها' },
  call: { en: "I'd call before acting", ar: 'سأتصل قبل أن أتصرّف' },
  next: { en: 'Next', ar: 'التالي' },
  again: { en: 'Play again', ar: 'العب مجددًا' },
};
const w = (k: keyof typeof W, l: Lang) => W[k][l];

export function Practice({ l }: { l: Lang }) {
  // English mode: no Arabic-only rounds. Quoted warnings are shown as published, never translated by us.
  const ROUNDS = ALL.filter(r => l === 'ar' || !hasAr(r));
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<Round['broken'] | null>(null);
  const [calls, setCalls] = useState(0);
  const [spotted, setSpotted] = useState(0);
  if (i >= ROUNDS.length) return (
    <Page><Mascot src={IMG.lavender} size={170} />
      <H1 l={l}>{l === 'ar' ? `اخترت الاتصال في ${calls} من ${ROUNDS.length} جولة` : `You chose to call in ${calls} of ${ROUNDS.length} rounds`}</H1>
      <P l={l} muted style={{ textAlign: 'center' }}>{l === 'ar' ? `ووجدت الحلقة المكسورة في ${spotted}.` : `You found the broken link in ${spotted}.`}</P>
      <Btn l={l} label={w('again', l)} onPress={() => { setI(0); setPick(null); setCalls(0); setSpotted(0); }} /></Page>);
  const r = ROUNDS[i];
  const res = analyze(r.taps ? { taps: r.taps } : { text: r.text }, DATA, { saved: [], senderIs: r.senderIs });
  const advance = (called: boolean) => { if (called) setCalls(calls + 1); setI(i + 1); setPick(null); };
  return (
    <Page>
      {i === 0 && !pick && <><Mascot src={IMG.lavender} size={130} /><H1 l={l}>{w('title', l)}</H1></>}
      <H2 l={l}>{`${i + 1} / ${ROUNDS.length}`}</H2>
      <Card>
        <Tag l={l} label={r.taps ? w('scenario', l) : r.broken === 'nothing' ? w('feed', l) : w('quoted', l)} color={K.muted} />
        <P l={l} style={{ fontSize: 18, lineHeight: 28 }}>{r.taps ? (l === 'ar' ? r.scenario_ar : r.scenario_en) : r.text}</P>
        <SourceChip l={l} title={r.source_title} date={r.published} url={r.source_url} />
      </Card>
      <H2 l={l}>{w('which', l)}</H2>
      <Row>{(['who', 'channel', 'ask', 'nothing'] as const).map(k => <Chip key={k} l={l} label={PICKS[l][k]} on={pick === k} onPress={() => { if (!pick) { setPick(k); if (k === r.broken) setSpotted(spotted + 1); } }} />)}</Row>
      {pick && (
        <>
          <Card style={{ borderColor: pick === r.broken ? K.blue : K.amber }}>
            <P l={l} style={{ fontWeight: '700' }}>{`${w('answer', l)}: ${PICKS[l][r.broken]}`}</P>
            <P l={l}>{l === 'ar' ? r.note_ar : r.note_en}</P>
          </Card>
          <H2 l={l}>{w('engine', l)}</H2>
          <Card>
            <P l={l} style={{ fontWeight: '700' }}>{res.headline[l]}</P>
            {res.lines.filter(ln => ln.check !== 'fee').map((ln, k) => <View key={k} style={{ gap: 4 }}>
              <Tag l={l} label={ln.state === 'advice' ? (l === 'ar' ? 'نصيحة رسمية' : 'Official advice') : STATUS[ln.status][l]} color={ln.state === 'advice' ? K.blue : STATUS_COLOR[ln.status]} />
              <P l={l}>{ln.text[l]}</P></View>)}
            {res.outcomes.includes('not_confirmed_do_not_forward') && <Tag l={l} label={OUTCOMES.not_confirmed_do_not_forward[l]} color={K.coral} />}
          </Card>
          <Btn l={l} icon="☎" label={w('call', l)} onPress={() => advance(true)} />
          <Btn l={l} kind="ghost" label={w('next', l)} onPress={() => advance(false)} />
        </>
      )}
    </Page>
  );
}
