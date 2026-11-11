import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { analyze, LABELS, OUTCOMES, STATUS } from '../engine/engine.ts';
import type { CheckResult, Claim, Family, Hints, Input, Lang, OutcomeId, SenderIs, TapPressure, Taps, TapWant, TapWho } from '../engine/types.ts';
import { t } from './src/copy';
import { Btn, Card, Chip, DATA, H1, H2, IMG, K, Mascot, open, P, Page, RAW, Ring, Row, ROUTES, sans, serif, SourceChip, STATUS_COLOR, Tag, TextLink } from './src/ui';
import { Practice } from './src/practice';
import { aiHints, isPhone, startAi, type AiState } from './src/ai';

type Screen = 'home' | 'input' | 'result' | 'close' | 'setup' | 'sources' | 'practice';
const STORE = 'tahaqaq.family.v1', AI_STORE = 'tahaqaq.ai.v1';
const loadAiOn = () => { try { const v = globalThis.localStorage?.getItem(AI_STORE); return v == null ? !isPhone() : v === '1' } catch { return false } };
const loadFamily = (): Family => { try { return { saved: [], ...JSON.parse(globalThis.localStorage?.getItem(STORE) || '{}') } } catch { return { saved: [] } } };
const NO_HINTS: Hints = {};
const L = (k: string, l: Lang) => LABELS[k]?.[l] ?? k;

// Samples: constructed by us (held-out set: H04 and H01 in Arabic, H05 and H02 in English), labelled "Sample" on screen.
const SAMPLES: Record<Lang, string[]> = {
  ar: [
    'إشعار من شرطة دبي: تم تسجيل مخالفة باسمك. ادخل بيانات بطاقتك عبر dubaipolice-fines.com لتجنب القبض',
    'خالتي انا ولد اختك، تلفوني خرب. ممكن تحولين لي 1200 درهم ضروري؟ برجعها لك بكرة',
  ],
  en: [
    'ICP: Your residency visa has expired. Pay the AED 1,100 overstay fine within 6 hours at icp-gov.org',
    "Dad, it's me. I'm in trouble with the police here, need AED 6,000 for bail right now. Please don't tell mum.",
  ],
};

export default function App() {
  const [lang, setLang] = useState<Lang>('ar');
  const [screen, setScreen] = useState<Screen>('home');
  const [family, setFamily] = useState<Family>(loadFamily);
  const [input, setInput] = useState<Input>({});
  const [senderIs, setSenderIs] = useState<SenderIs | undefined>();
  const [aiOn, setAiOn] = useState(loadAiOn);
  const [ai, setAi] = useState<AiState>({ status: 'off' });
  const [hints, setHints] = useState<{ text?: string; h: Hints }>({ h: {} });
  useEffect(() => { if (aiOn) startAi(DATA, setAi); else setAi({ status: 'off' }); }, [aiOn]);
  useEffect(() => {
    if (ai.status !== 'ready' || !input.text) return;
    let live = true; aiHints(input.text).then(h => live && setHints({ text: input.text, h }));
    return () => { live = false; };
  }, [input.text, ai.status]);
  // Hints only apply to the text they were computed for; the engine re-checks each one against the records.
  const h = hints.text === input.text ? hints.h : NO_HINTS;
  const result = useMemo(() => (input.text || input.taps) ? analyze(input, DATA, { ...family, senderIs }, h) : null, [input, family, senderIs, h]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = lang === 'ar' ? 'تحقّق' : 'Tahaqaq';
    document.body.style.backgroundColor = '#000';
  }, [lang]);

  useEffect(() => {   // installable + offline: manifest, iPhone home-screen icon, service worker (all relative, so it works under a sub-path)
    if (Platform.OS !== 'web') return;
    const add = (tag: string, attrs: Record<string, string>) => { const e = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); document.head.appendChild(e); };
    add('link', { rel: 'manifest', href: 'manifest.webmanifest' });
    add('link', { rel: 'apple-touch-icon', href: 'apple-touch-icon.png' });
    add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' });
    add('meta', { name: 'theme-color', content: '#000000' });
    navigator.serviceWorker?.register('sw.js').catch(() => {});
  }, []);
  const go = (s: Screen) => { setScreen(s); if (Platform.OS === 'web') window.scrollTo(0, 0); };
  const l = lang;
  return (
    <View style={{ flex: 1, backgroundColor: K.bg }}>
      <StatusBar style="light" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        <Pressable onPress={() => go('home')} accessibilityRole="button" accessibilityLabel={t('home', l)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={IMG.logo} style={{ width: 34, height: 34, borderRadius: 10 }} />
          <Text style={[{ color: K.text, fontSize: 22 }, serif(l)]}>{t('appName', l)}</Text>
        </Pressable>
        <Chip l={l} compact label={t('lang', l)} onPress={() => setLang(l === 'ar' ? 'en' : 'ar')} />
      </View>
      {screen === 'home' && <Home l={l} go={go} />}
      {screen === 'input' && <InputScreen l={l} family={family} onRun={(i, s) => { setInput(i); setSenderIs(s); go('result'); }} />}
      {screen === 'result' && result && <Result l={l} r={result} text={input.text} go={go} ai={ai} />}
      {screen === 'close' && result && <Close l={l} r={result} go={go} />}
      {screen === 'setup' && <Setup l={l} family={family} ai={ai} aiOn={aiOn} setAiOn={v => { setAiOn(v); try { localStorage.setItem(AI_STORE, v ? '1' : '0') } catch {} }} onSave={f => { setFamily(f); try { localStorage.setItem(STORE, JSON.stringify(f)) } catch {} }} />}
      {screen === 'sources' && <Sources l={l} />}
      {screen === 'practice' && <Practice l={l} />}
      {screen !== 'home' && <TabBar l={l} screen={screen} go={go} />}
    </View>
  );
}

function TabBar({ l, screen, go }: { l: Lang; screen: Screen; go: (s: Screen) => void }) {
  const tabs: [Screen, string, string][] = [['input', '＋', t('tabCheck', l)], ['practice', '◎', t('practice', l)], ['sources', '≡', t('sources', l)], ['setup', '⚙', t('setup', l)]];
  return (
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 18, paddingHorizontal: 16, backgroundColor: K.bg }}>
      <View style={{ flexDirection: 'row', backgroundColor: K.s1, borderRadius: 999, padding: 5, gap: 2, maxWidth: 440, width: '100%' }} accessibilityRole="tablist">
        {tabs.map(([s, icon, label]) => {
          const on = screen === s || (s === 'input' && (screen === 'result' || screen === 'close'));
          return (
            <Pressable key={s} onPress={() => go(s)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? K.s2 : 'transparent', alignItems: 'center' }}>
              <Text style={{ color: on ? K.coral : K.muted, fontSize: 18 }}>{icon}</Text>
              <Text numberOfLines={1} style={[{ color: on ? K.text : K.muted, fontSize: 12 }, sans(l)]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Home({ l, go }: { l: Lang; go: (s: Screen) => void }) {
  return (
    <Page center>
      <Mascot src={IMG.peach} size={190} />
      <H1 l={l} style={{ fontSize: 40, lineHeight: 50 }}>{t('homeQ', l)}</H1>
      <P l={l} muted style={{ textAlign: 'center' }}>{t('homeSub', l)}</P>
      <View style={{ height: 6 }} />
      <Btn l={l} label={t('check', l)} onPress={() => go('input')} />
      <TextLink l={l} label={t('practiceFirst', l)} onPress={() => go('practice')} />
      <P l={l} muted style={{ textAlign: 'center', fontSize: 13, lineHeight: 19 }}>{t('rulesOnly', l)} {t('notAffiliated', l)}</P>
    </Page>
  );
}

function InputScreen({ l, family, onRun }: { l: Lang; family: Family; onRun: (i: Input, s?: SenderIs) => void }) {
  const [mode, setMode] = useState<'paste' | 'tap'>('paste');
  const [text, setText] = useState('');
  const [who, setWho] = useState<TapWho | null>(null);
  const [wants, setWants] = useState<TapWant[]>([]);
  const [pressure, setPressure] = useState<TapPressure[]>([]);
  const [via, setVia] = useState<Taps['via']>();
  const [sender, setSender] = useState<SenderIs | undefined>();
  const [step, setStep] = useState(0);
  const toggle = <X,>(xs: X[], x: X) => xs.includes(x) ? xs.filter(y => y !== x) : [...xs, x];
  // switching language swaps a sample for its twin in the other language; typed text is left alone
  useEffect(() => { const i = SAMPLES[l === 'ar' ? 'en' : 'ar'].indexOf(text); if (i >= 0) setText(SAMPLES[l][i]); }, [l]);
  const familyClaim = who === 'family' || (mode === 'paste' && /ماما|امي|ابوي|بابا|ولد|بنت|mum|mom|dad|son|daughter/i.test(text));
  const senderQ = (
    <>
      <H2 l={l}>{t('qSender', l)}</H2>
      <Row>{([['saved', t('saved', l)], ['new', t('newNum', l)], ['not_sure', L('not_sure', l)]] as [SenderIs, string][]).map(([v, lab]) =>
        <Chip key={v} l={l} label={lab} on={sender === v} onPress={() => setSender(v)} />)}</Row>
    </>
  );
  const seg = (
    <Row style={{ justifyContent: 'center', gap: 6 }}>
      <Chip l={l} compact label={t('paste', l)} on={mode === 'paste'} onPress={() => setMode('paste')} />
      <Chip l={l} compact label={t('tap', l)} on={mode === 'tap'} onPress={() => { setMode('tap'); setStep(0); }} />
    </Row>
  );
  if (mode === 'paste') return (
    <Page>
      {seg}
      <H1 l={l} style={{ fontSize: 30, lineHeight: 38 }}>{t('pasteTitle', l)}</H1>
      <TextInput value={text} onChangeText={setText} multiline placeholder={t('placeholder', l)} placeholderTextColor={K.muted}
        accessibilityLabel={t('placeholder', l)}
        style={[{ minHeight: 170, backgroundColor: K.s1, color: K.text, borderRadius: 24, padding: 20, fontSize: 18, lineHeight: 28, textAlignVertical: 'top' }, sans(l)]} />
      <Row style={{ justifyContent: 'center' }}>{SAMPLES[l].map((s, i) => <Chip key={i} compact l={l} label={`${t('sample', l)} ${i + 1}`} onPress={() => setText(s)} />)}</Row>
      <P l={l} muted style={{ fontSize: 13, textAlign: 'center' }}>{t('sampleNote', l)}</P>
      {familyClaim && senderQ}
      <Btn l={l} label={t('run', l)} disabled={!text.trim()} onPress={() => onRun({ text }, familyClaim ? sender : undefined)} />
    </Page>
  );
  // one question per screen
  const order = ['who', 'want', 'pressure', 'via', ...(who === 'family' ? ['sender'] : [])] as const;
  const cur = order[Math.min(step, order.length - 1)], last = step >= order.length - 1;
  const q = { who: t('qWho', l), want: t('qWant', l), pressure: t('qPressure', l), via: t('qVia', l), sender: t('qSender', l) }[cur];
  const opts: [string, string, boolean, () => void][] =
    cur === 'who' ? (['family', 'official', 'bank', 'other', 'not_sure'] as TapWho[]).map(w => [w, L(w, l), who === w, () => setWho(w)])
    : cur === 'want' ? (['money', 'code', 'id_or_card', 'click', 'forward', 'not_sure'] as TapWant[]).map(w => [w, L(w, l), wants.includes(w), () => setWants(toggle(wants, w))])
    : cur === 'pressure' ? (['urgency', 'secrecy', 'threat', 'not_sure'] as TapPressure[]).map(w => [w, L(w, l), pressure.includes(w), () => setPressure(toggle(pressure, w))])
    : cur === 'via' ? (['voice_note', 'call', 'video', 'sms', 'chat'] as const).map(w => [w, L(w, l), via === w, () => setVia(w)])
    : ([['saved', t('saved', l)], ['new', t('newNum', l)], ['not_sure', L('not_sure', l)]] as [SenderIs, string][]).map(([v, lab]) => [v, lab, sender === v, () => setSender(v)]);
  const multi = cur === 'want' || cur === 'pressure';
  return (
    <Page>
      {seg}
      <Row style={{ justifyContent: 'center', gap: 8 }}>{order.map((_, i) => <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? K.white : K.s2 }} />)}</Row>
      <H1 l={l} style={{ fontSize: 32, lineHeight: 40 }}>{q}</H1>
      {multi && <P l={l} muted style={{ textAlign: 'center' }}>{t('pickMany', l)}</P>}
      <Row style={{ justifyContent: 'center', gap: 10 }}>{opts.map(([k, lab, on, fn]) => <Chip key={k} l={l} label={lab} on={on} onPress={fn} />)}</Row>
      <View style={{ flex: 1, minHeight: 12 }} />
      <Btn l={l} label={last ? t('run', l) : t('next', l)} disabled={cur === 'who' && !who}
        onPress={() => last ? who && onRun({ taps: { who, wants, pressure, via } }, who === 'family' ? sender : undefined) : setStep(step + 1)} />
      {step > 0 && <TextLink l={l} label={t('back', l)} onPress={() => setStep(step - 1)} />}
    </Page>
  );
}

// Show the pasted message with every quoted claim highlighted, word for word.
function Highlighted({ l, text, claims }: { l: Lang; text: string; claims: Claim[] }) {
  const lower = text.toLowerCase();
  const spans: [number, number][] = [];
  for (const c of claims) { if (!c.quote) continue; const i = lower.indexOf(c.quote.toLowerCase()); if (i >= 0) spans.push([i, i + c.quote.length]); }
  spans.sort((a, b) => a[0] - b[0]);
  const parts: React.ReactNode[] = []; let at = 0;
  spans.forEach(([a, b], k) => { if (a < at) return; parts.push(text.slice(at, a)); parts.push(<Text key={k} style={{ backgroundColor: 'rgba(255,59,92,0.28)', color: K.white }}>{text.slice(a, b)}</Text>); at = b; });
  parts.push(text.slice(at));
  return <Text style={[{ color: K.muted, fontSize: 16, lineHeight: 26 }, sans(l)]}>{parts}</Text>;
}

function ClaimRow({ l, label, claims, fromTaps }: { l: Lang; label: string; claims: Claim[]; fromTaps: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <P l={l} muted style={{ fontSize: 13 }}>{label}</P>
      <Row>
        {claims.length === 0 && <P l={l} muted>{t('nothingFound', l)}</P>}
        {claims.map((c, i) => {
          const ent = DATA.registry.entities.find(e => e.id === c.value);
          const name = ent ? (l === 'ar' ? ent.names_ar[0] || ent.names_en[0] : ent.names_en[0]) : c.value.startsWith('link:') ? c.value.slice(5) : L(c.value, l);
          return <Chip key={i} l={l} label={c.fromTaps ? `${name} · ${t("youTold", l)}` : c.value.startsWith("link:") ? name : `“${c.quote}” → ${name}`} />;
        })}
      </Row>
      {fromTaps && claims.length > 0 && null}
    </View>
  );
}

function Result({ l, r, text, go, ai }: { l: Lang; r: CheckResult; text?: string; go: (s: Screen) => void; ai: AiState }) {
  const tone = r.band === 'stop_and_verify' ? K.coral : r.band === 'verify_first' ? K.amber : K.muted;
  const targets = r.verify.filter(v => v.kind !== 'helper'), helpers = r.verify.filter(v => v.kind === 'helper');
  return (
    <Page>
      <Ring color={tone} mark={r.band === 'no_signs_found' ? '–' : '!'} />
      <H1 l={l} style={{ fontSize: 32, lineHeight: 41 }}>{r.headline[l]}</H1>

      <Card>
        {targets.map((v, i) => <Btn key={i} l={l} icon="☎" label={`${t('call', l)} ${v.name}`} onPress={() => open('tel:' + v.tel)} />)}
        {targets.length === 0 && <><P l={l} muted>{t('noNumber', l)}</P><TextLink l={l} label={t('addNumbers', l)} onPress={() => go('setup')} /></>}
        <P l={l} style={{ fontWeight: '700', textAlign: 'center' }}>{r.verifyNote[l]}</P>
        {helpers.map((v, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Btn l={l} kind="ghost" icon="☎" label={`${t('callHelper', l)} · ${v.name}`} onPress={() => open('tel:' + v.tel)} />
            <Btn l={l} kind="ghost" icon="✉" label={t('smsHelper', l)} onPress={() => open(`sms:${v.tel}?body=${encodeURIComponent(smsSummary(r, l))}`)} />
          </View>
        ))}
      </Card>

      <H2 l={l}>{t('why', l)}</H2>
      <Card>
        <P l={l} muted style={{ fontSize: 14 }}>{t('claims', l)}</P>
        {text ? <Highlighted l={l} text={text} claims={[...r.who, ...r.channel, ...r.asks]} /> : <Tag l={l} label={t('youTold', l)} color={K.muted} />}
        <ClaimRow l={l} label={t('rowWho', l)} claims={r.who} fromTaps={r.input === 'taps'} />
        <ClaimRow l={l} label={t('rowVia', l)} claims={r.channel} fromTaps={r.input === 'taps'} />
        <ClaimRow l={l} label={t('rowAsk', l)} claims={r.asks} fromTaps={r.input === 'taps'} />
      </Card>

      <H2 l={l}>{t('records', l)}</H2>
      {r.lines.length === 0 && <Card><P l={l} muted>{t('noRecords', l)}</P></Card>}
      {r.lines.map((ln, i) => (
        <Card key={i}>
          <Row>
            {ln.state === 'advice' ? <Tag l={l} label={l === 'ar' ? 'نصيحة رسمية' : 'Official advice'} color={K.blue} /> : <Tag l={l} label={STATUS[ln.status][l]} color={STATUS_COLOR[ln.status]} />}
            {ln.state === 'not_connected' && <Tag l={l} label={t('notConnected', l)} color={K.muted} />}
            {ln.state === 'snapshot' && <Tag l={l} label={`${t('snapshot', l)} ${RAW.announcements.snapshot_date}`} color={K.muted} />}
          </Row>
          <P l={l}>{ln.text[l]}</P>
          {ln.link && <SourceChip l={l} title={ln.link} url={ln.link} />}
          {ln.source && <SourceChip l={l} title={ln.source.title} date={ln.source.date} url={ln.source.url} />}
        </Card>
      ))}
      <P l={l} muted style={{ fontSize: 13, textAlign: 'center' }}>{ai.status === 'ready' ? t('aiTag', l) : ai.status === 'unavailable' ? t('aiOff', l) : t('rulesOnlyTag', l)}</P>

      <Btn l={l} label={t('afterCall', l)} kind="coral" onPress={() => go('close')} />
    </Page>
  );
}

function smsSummary(r: CheckResult, l: Lang) {
  const asks = r.asks.map(a => L(a.value, l)).join(', ');
  return `Tahaqaq: ${r.headline[l]} ${asks ? '(' + asks + ')' : ''}`;
}

function Close({ l, r, go }: { l: Lang; r: CheckResult; go: (s: Screen) => void }) {
  const [picked, setPicked] = useState<OutcomeId | null>(null);
  return (
    <Page>
      <H1 l={l}>{t('afterCall', l)}</H1>
      {r.outcomes.map(o => <Btn key={o} l={l} kind={picked === o ? 'primary' : 'ghost'} label={OUTCOMES[o][l]} onPress={() => setPicked(o)} />)}
      {picked && picked !== 'confirmed_by_phone' && (
        <>
          <H2 l={l}>{t('report', l)}</H2>
          <Card>
            <P l={l} style={{ fontWeight: '700' }}>{t('reportSteps', l)}</P>
            {ROUTES.length === 0 && <><Tag l={l} label={t('notConnected', l)} color={K.muted} /><P l={l} muted>{t('routesPending', l)}</P></>}
            {ROUTES.filter(x => !x.only_for || r.who.some(w => w.value === x.only_for)).map(x => (
              <View key={x.id} style={{ gap: 6 }}>
                {x.tel ? <Btn l={l} kind="ghost" icon="☎" label={`${l === 'ar' && x.name_ar ? x.name_ar : x.name_en} · ${x.tel}`} onPress={() => open('tel:' + x.tel)} />
                  : <P l={l}>{l === 'ar' && x.name_ar ? x.name_ar : x.name_en}</P>}
              </View>
            ))}
            {ROUTES.length > 0 && <SourceChip l={l} title={`u.ae · ${t('pageDated', l)}`} date={ROUTES[0].page_updated} url={ROUTES[0].source_url} />}
          </Card>
        </>
      )}
      <Btn l={l} label={t('newCheck', l)} onPress={() => go('input')} />
    </Page>
  );
}

function Setup({ l, family, onSave, ai, aiOn, setAiOn }: { l: Lang; family: Family; onSave: (f: Family) => void; ai: AiState; aiOn: boolean; setAiOn: (v: boolean) => void }) {
  const [helper, setHelper] = useState(family.helper ?? { name: '', tel: '' });
  const [saved, setSaved] = useState(family.saved.length ? family.saved : [{ name: '', tel: '' }]);
  const [ok, setOk] = useState(false);
  const field = (v: string, set: (s: string) => void, ph: string, tel = false) =>
    <TextInput value={v} onChangeText={x => { set(x); setOk(false); }} placeholder={ph} placeholderTextColor={K.muted} keyboardType={tel ? 'phone-pad' : 'default'} accessibilityLabel={ph}
      style={[{ backgroundColor: K.s2, color: K.text, borderRadius: 16, padding: 14, fontSize: 17, flex: 1, minWidth: 120 }, sans(l)]} />;
  return (
    <Page>
      <Mascot src={IMG.sage} size={150} />
      <H1 l={l}>{t('setup', l)}</H1>
      <P l={l} muted style={{ textAlign: 'center' }}>{t('setupIntro', l)}</P>
      <H2 l={l}>{t('helper', l)}</H2>
      <Row>{field(helper.name, n => setHelper({ ...helper, name: n }), t('name', l))}{field(helper.tel, n => setHelper({ ...helper, tel: n }), t('number', l), true)}</Row>
      <H2 l={l}>{t('family', l)}</H2>
      {saved.map((c, i) => (
        <Row key={i}>{field(c.name, n => setSaved(saved.map((x, j) => j === i ? { ...x, name: n } : x)), t('name', l))}
          {field(c.tel, n => setSaved(saved.map((x, j) => j === i ? { ...x, tel: n } : x)), t('number', l), true)}</Row>
      ))}
      {saved.length < 5 && <Btn l={l} kind="ghost" label={t('addFamily', l)} onPress={() => setSaved([...saved, { name: '', tel: '' }])} />}
      <Card>
        <P l={l}>{t('aiPack', l)}</P>
        <Row><Chip l={l} label={t('aiUse', l)} on={aiOn} onPress={() => setAiOn(!aiOn)} /></Row>
        {ai.status === 'loading' && <P l={l} muted>{t('aiLoading', l)}</P>}
        {ai.status === 'ready' && <P l={l} muted>{t('aiReady', l)}</P>}
        {ai.status === 'unavailable' && <><Tag l={l} label={t('notConnected', l)} color={K.muted} /><P l={l} muted>{t('aiOff', l)} · {ai.reason}</P></>}
        {ai.status === 'off' && <P l={l} muted>{t('rulesOnly', l)}</P>}
        <P l={l} muted style={{ fontSize: 13 }}>{t('aiPhone', l)}</P>
      </Card>
      <Btn l={l} label={t('save', l)} onPress={() => {
        const clean = (c: { name: string; tel: string }) => ({ name: c.name.trim(), tel: c.tel.replace(/[^\d+]/g, '') });
        onSave({ helper: helper.tel ? clean(helper) : undefined, saved: saved.map(clean).filter(c => c.tel) }); setOk(true);
      }} />
      {ok && <P l={l} style={{ textAlign: 'center', color: K.blue }}>{t('savedOk', l)}</P>}
    </Page>
  );
}

function Sources({ l }: { l: Lang }) {
  const ents = RAW.registry.entities as any[], reds = RAW.redlines.rules as any[], routes = RAW.routes.routes as any[];
  const count = (xs: any[]) => `${xs.filter(x => x.approved_by_lead).length} ${t('approvedRows', l)} · ${xs.filter(x => !x.approved_by_lead).length} ${t('pendingRows', l)}`;
  const NC: [string, string, string][] = [
    ['Official fee list (Dubai Government Service Prices, Dubai Pulse): API key only; licence "notspecified"', 'قائمة الرسوم الرسمية (أسعار الخدمات الحكومية في دبي، Dubai Pulse): بمفتاح API فقط؛ الرخصة "notspecified"', 'https://www.dubaipulse.gov.ae/data/dof-pricing/dof_government_service_prices-open'],
    ['Dubai Pulse Government Entities register: API key only', 'سجل الجهات الحكومية في Dubai Pulse: بمفتاح API فقط', ''],
    ['Content Credentials reader', 'قارئ بيانات اعتماد المحتوى (Content Credentials)', ''],
    ['Deepfake video model (DESC SARAAB): not yet publicly released', 'نموذج كشف التزييف العميق في الفيديو (سراب، مركز دبي للأمن الإلكتروني): لم يُطرح للعامة بعد', ''],
  ];
  return (
    <Page>
      <H1 l={l}>{t('sources', l)}</H1>
      <Card style={{ borderColor: K.coral }}><P l={l} style={{ fontWeight: '700' }}>{t('notAffiliated', l)}</P><P l={l} muted>{t('languages', l)}</P></Card>

      <H2 l={l}>{t('srcRegistry', l)}</H2>
      <Card>
        <P l={l} muted>{count(ents)}</P>
        {ents.map(e => <View key={e.id} style={{ gap: 4 }}><Row><P l={l}>{l === 'ar' && e.names_ar[0] ? e.names_ar[0] : e.names_en[0]}</P>{!e.approved_by_lead && <Tag l={l} label={t('pending', l)} color={K.muted} />}</Row><SourceChip l={l} title={e.source_title} date={e.retrieved} url={e.source_url} /></View>)}
      </Card>

      <H2 l={l}>{t('srcRedlines', l)}</H2>
      <Card><P l={l} muted>{count(reds)}</P>{reds.map(r => <View key={r.id} style={{ gap: 4 }}><P l={l}>{l === 'ar' && r.text_ar ? r.text_ar : r.text_en}</P><SourceChip l={l} title={r.publisher} date={r.published} url={r.source_url} /></View>)}</Card>

      <H2 l={l}>{t('srcRoutes', l)}</H2>
      <Card><P l={l} muted>{count(routes)}</P>{routes.map(r => <P key={r.id} l={l}>{l === 'ar' && r.name_ar ? r.name_ar : r.name_en}</P>)}<SourceChip l={l} title="u.ae — report cybercrimes online" date={`${t('pageDated', l)} ${routes[0].page_updated}`} url={routes[0].source_url} /></Card>

      <H2 l={l}>{t('srcAnn', l)}</H2>
      <Card><Row><Tag l={l} label={`${t('snapshot', l)} ${RAW.announcements.snapshot_date ?? '—'}`} color={K.blue} /></Row>
        <P l={l}>{RAW.announcements.publisher}: {RAW.announcements.items.length} · {RAW.announcements.feeds.length} RSS. {t('srcAnnNote', l)}</P>
        <SourceChip l={l} title="Abu Dhabi Media Office RSS index" url={RAW.announcements.index_url} /></Card>

      <H2 l={l}>{t('srcNumbering', l)}</H2>
      <Card>
        <P l={l}>{t('srcNumNote', l)}</P>
        <SourceChip l={l} title="libphonenumber 971 ranges.csv" date={RAW.numbering.retrieved} url="https://raw.githubusercontent.com/google/libphonenumber/master/resources/metadata/971/ranges.csv" />
        <P l={l}>{t('srcDomNote', l)}</P>
        <SourceChip l={l} title="AEDA-POL-007 (registrar mirror)" url="https://centralnicdomains.com/ccTLDPolicies/AE/Domain%20Name%20Eligibility%20Policy.pdf" />
      </Card>

      <H2 l={l}>{t('srcNC', l)}</H2>
      <Card>{NC.map(([en, ar, u]) => <View key={en} style={{ gap: 4 }}><Row><Tag l={l} label={t('notConnected', l)} color={K.muted} /></Row><P l={l}>{l === 'ar' ? ar : en}</P>{u ? <SourceChip l={l} title="dataset page" url={u} /> : null}</View>)}</Card>
    </Page>
  );
}
