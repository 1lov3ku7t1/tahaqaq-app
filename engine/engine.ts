// Tahaqaq engine (A2). Ported from prototype v1 (I5, 10 Nov 2026). Rules and records only: no AI, no network.
// Every result line is decided here. AI hints (types.Hints) are re-checked against records and never set a status alone.
import { parse as parseDomain } from "tldts";
import type {
  Band, Check, CheckResult, Claim, Contact, Data, Family, Hints, Input, NumberRange, OutcomeId,
  RecordLine, RegistryRow, Src, Status, T, Taps, VerifyTarget,
} from "./types.ts";
export type * from "./types.ts";

// ---------- normalisation (unchanged from v1) ----------
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩", FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const HIDDEN = /[​-‏‪-‮⁦-⁩﻿]/;
export function norm(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[ؤ]/g, "و").replace(/[ئ]/g, "ي")
    .replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(FA_DIGITS.indexOf(d)))
    .replace(/[‌-‏‪-‮]/g, "")
    .toLowerCase();
}

// ---------- lexicons (v1 unchanged, plus generic official/bank claims) ----------
type Lex = [Claim["kind"], string, RegExp];
const ASKS: Lex[] = [
  ["ask", "money", /(حول(ي|لي|و)?|تحويل|ارسل(ي)? (لي )?(مبلغ|فلوس)|فلوس|مبلغ|\d[\d,\.]*\s*(درهم|aed|dhs?)|\b(aed|dhs?)\s*\d|transfer|send (me )?(money|aed|\d)|wire|pay(ment)?\b|ادفع|سداد|دفع)/],
  ["ask", "code", /(رمز|الكود|كود|otp|one[- ]time|verification code|\bcode\b|\bpin\b|كلمه (السر|المرور))/],
  ["ask", "id_or_card", /(رقم (البطاقه|الحساب|الهويه)|بطاقتك|الهويه الاماراتيه|emirates id|card (number|details)|cvv|iban|bank details|تفاصيل (البطاقه|الحساب)|بيانات(ك)? البنكيه)/],
  ["ask", "money", /(7aw+el|7awel|7wl|flous|floos|fulus|dirham)/],
  ["ask", "money", /(\bsettle\b|unpaid (traffic )?fine|overdue (toll |traffic )?(fine|fee)|سداد (المخالفه|الغرامه|الرسوم))/],
  ["ask", "call_number", /((contact|call) (this|the following|us on|on this) number|اتصل (على|ب)(هذا )?الرقم)/],
  ["ask", "id_or_card", /((verify|update|confirm) (your )?(all )?(correct )?(details|data|information)|تحديث (البيانات|بياناتك))/],
  ["ask", "click", /(اضغط|انقر|افتح الرابط|الرابط|click|tap (the|this) link|follow the link|https?:\/\/|www\.)/],
  ["ask", "secrecy", /(la tgoleen|la t9oleen|la tgool|لا (تخبر|تقول|تعلم)|لا تقول ل|بيني وبينك|(?<![؀-ۿ])سر(?![؀-ۿ])|don'?t tell|keep (it|this) (secret|between)|no one (must|should) know)/],
  ["ask", "urgency", /(bsur3a|b ?sor3a|al7een|7aleen|فورا|الحين|بسرعه|ضروري|عاجل|خلال (\d+ )?(ساعه|ساعات|دقايق|دقائق|يوم)|اليوم قبل|urgent|immediately|right now|asap|within \d+ (hours?|minutes?)|today)/],
  ["ask", "threat", /(ايقاف|حظر|تجميد|غرامه|مخالفه|القبض|سيتم (الغاء|ايقاف|حجز)|blocked|suspended|frozen|freeze|hold notice|arrest|penalt|fine of|legal action)/],
  ["ask", "forward", /(forward (this|to)|share (this|with everyone)|انشر|اعد (ارسال|توجيه)|ارسلها (لكل|للجميع)|شاركها)/],
];
const FAMILY: Lex[] = [
  ["who", "family", /((?<![؀-ۿ])(و|يا ?)?(ماما|يمه|يما|امي|ابوي|بابا)(?![؀-ۿ])|ولدك|بنتك|ابنك|اخوك|اختك|حبيبتي امي|it'?s me,? (mum|mom|dad)|\b(mum|mom|dad|mama|grandma|nana)\b|your (son|daughter|grandson|granddaughter)|ibnik|ibnich|bintik|ana ibn)/],
  ["channel", "new_number", /(رقمي الجديد|هذا رقمي|رقم جديد|تلفوني (خرب|طاح|انكسر|ضاع)|new number|lost my phone|phone (broke|is broken|died))/],
];
const GENERIC_WHO: Lex[] = [
  ["who", "official", /(شرطه|وزاره|هيئه|جمارك|\bcustoms\b|حكومه|الجهات الرسميه|\bpolice\b|ministry|authority|government|\bcourt\b|محكمه)/],
  ["who", "bank", /(بنك|مصرف|\bbank\b)/],
];
const CHANNEL_WORDS: Lex[] = [
  ["channel", "whatsapp", /(واتساب|واتس|whatsapp)/],
  ["channel", "sms", /(\bsms\b|رساله نصيه)/],
  ["channel", "call", /(اتصال|مكالمه|call(ed|ing)?\b)/],
];
const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "rb.gy", "shorturl.at", "t.ly", "goo.su"]);
const NEG = /(never|do not|don'?t|not to|will not|won'?t|no one|لا (تشارك|تعط|تعطي|ترسل|تفصح)|لن |ابدا|لا يطلب|لا نطلب|لن نطلب|تحذر|تحذير)[^.!؟?،]{0,40}$/;
const REQUEST = /(send|share|enter|update|verify|give|reply|provide|read it|tell me|confirm your|ارسل|اعط|ادخل|حدث|تحديث|شارك|زودنا|ارسليه|ارسله|عطني|اعطني|قول لي|قولي لي)/;
const URL_RE = /\b((?:https?:\/\/)?(?:[a-z0-9؀-ۿ-]+\.)+[a-z؀-ۿ]{2,}(?:\/[^\s]*)?)/gi;

function quoteAt(text: string, ntext: string, m: RegExpExecArray): string {
  return text.length === ntext.length ? text.substr(m.index, m[0].length) : m[0];
}
function runLex(lex: Lex[], text: string, nt: string): Claim[] {
  const out: Claim[] = [];
  for (const [kind, value, re] of lex) {
    const r = new RegExp(re.source, "g"); let m: RegExpExecArray | null;
    while ((m = r.exec(nt))) {
      if (kind === "ask" && (value === "code" || value === "id_or_card")) {
        if (NEG.test(nt.slice(Math.max(0, m.index - 60), m.index))) continue;
        if (!REQUEST.test(nt)) continue;
      }
      out.push({ kind, value, quote: quoteAt(text, nt, m) }); break;
    }
  }
  return out;
}
function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
export function quoteGuard(text: string, claims: Claim[]): { kept: Claim[]; removed: number } {
  const nt = norm(text);
  const kept = claims.filter(c => c.fromTaps || nt.includes(norm(c.quote)));
  return { kept, removed: claims.length - kept.length };
}

// ---------- wording (all result text lives here) ----------
export const STATUS: Record<Status, T> = {
  mismatch: { en: "Does not match official record", ar: "لا يطابق السجل الرسمي" },
  match: { en: "Matches official record (the request can still be a scam)", ar: "يطابق السجل الرسمي (وقد يبقى الطلب احتيالًا)" },
  unknown: { en: "Not in official sources (unknown)", ar: "غير موجود في المصادر الرسمية (غير معروف)" },
};
const HEADLINE: Record<Band, T> = {
  stop_and_verify: { en: "Stop. Do not pay, share a code or click. Call first.", ar: "توقّف. لا تدفع ولا تشارك رمزًا ولا تضغط رابطًا. اتصل أولًا." },
  verify_first: { en: "Check before you act. Call a number you already have.", ar: "تحقّق قبل أن تتصرّف. اتصل برقم موجود لديك مسبقًا." },
  no_signs_found: { en: "No warning signs found in the words. Still call before you act.", ar: "لم نجد علامات تحذير في الكلمات. اتصل قبل أن تتصرّف على أي حال." },
};
export const OUTCOMES: Record<OutcomeId, T> = {
  confirmed_by_phone: { en: "Confirmed by phone", ar: "تم التأكيد بالاتصال" },
  not_confirmed_do_not_pay: { en: "Not confirmed: do not pay", ar: "لم يتم التأكيد: لا تدفع" },
  not_confirmed_do_not_forward: { en: "Not confirmed: do not forward", ar: "لم يتم التأكيد: لا تُعِد الإرسال" },
};
export const LABELS: Record<string, T> = {
  family: { en: "A family member", ar: "أحد أفراد العائلة" },
  official: { en: "A government body", ar: "جهة حكومية" },
  bank: { en: "A bank", ar: "بنك" },
  other: { en: "Someone else", ar: "شخص آخر" },
  not_sure: { en: "Not sure", ar: "غير متأكد" },
  money: { en: "Money", ar: "مال" }, code: { en: "A code", ar: "رمز" }, id_or_card: { en: "ID or card details", ar: "بيانات الهوية أو البطاقة" },
  click: { en: "Click a link", ar: "الضغط على رابط" }, forward: { en: "Forward this", ar: "إعادة الإرسال" },
  urgency: { en: "Hurry", ar: "استعجال" }, secrecy: { en: "Keep it secret", ar: "السرّية" }, threat: { en: "A threat", ar: "تهديد" },
  whatsapp: { en: "WhatsApp", ar: "واتساب" }, sms: { en: "SMS", ar: "رسالة نصية" }, call: { en: "A call", ar: "مكالمة" },
  call_number: { en: "Call a number in the message", ar: "الاتصال برقم في الرسالة" },
  new_number: { en: "A new number", ar: "رقم جديد" }, voice_note: { en: "Voice note", ar: "رسالة صوتية" },
  video: { en: "Video", ar: "فيديو" }, chat: { en: "Chat message", ar: "رسالة دردشة" },
};
const nameOf = (e: RegistryRow): T => ({ en: e.names_en[0] || e.names_ar[0] || e.id, ar: e.names_ar[0] || e.names_en[0] || e.id });
const src = (url: string, title: string, date: string): Src => ({ url, title, date });
const rowSrc = (e: RegistryRow) => src(e.source_url, e.source_title, e.retrieved);

// ---------- records ----------
/** Ship only lead-approved rows (rule 4). Tests may pass all rows. */
export function shipOnly(d: Data): Data {
  return {
    ...d,
    registry: { entities: d.registry.entities.filter(e => e.approved_by_lead && e.source_url) },
    redlines: { rules: d.redlines.rules.filter(r => r.approved_by_lead && r.source_url) },
  };
}
const digits = (s: string) => s.replace(/\D/g, "");
/** National significant number for a UAE number, or null. */
export function uaeNsn(raw: string): string | null {
  let d = digits(raw);
  if (d.startsWith("00971")) d = d.slice(5); else if (d.startsWith("971")) d = d.slice(3); else if (d.startsWith("0")) d = d.slice(1);
  return d.length >= 5 && d.length <= 12 ? d : null;
}
export function numberType(nsn: string, ranges: NumberRange[]): NumberRange | null {
  for (const r of ranges) {
    const [lo, hi] = r.length.split("-").map(Number);
    if (new RegExp("^" + r.prefix).test(nsn) && nsn.length >= lo && nsn.length <= (hi || lo)) return r;
  }
  return null;
}
const TYPE_T: Record<string, T> = {
  MOBILE: { en: "a mobile number", ar: "رقم هاتف متحرك" }, TOLL_FREE: { en: "a toll-free 800 number", ar: "رقم مجاني 800" },
  UAN: { en: "a 600 number", ar: "رقم 600" }, PREMIUM_RATE: { en: "a premium-rate 900 number", ar: "رقم بتعرفة مرتفعة 900" },
  SHARED_COST: { en: "a shared-cost 700 number", ar: "رقم 700 بتكلفة مشتركة" }, FIXED_LINE: { en: "a landline", ar: "رقم أرضي" },
};

// ---------- main ----------
export function analyze(input: Input, data: Data, family: Family = { saved: [] }, hints: Hints = {}): CheckResult {
  const text = input.text ?? "";
  const nt = norm(text);
  const taps = input.taps;
  const reasons: string[] = [];
  const lines: RecordLine[] = [];
  const reg = data.registry.entities;
  const add = (check: Check, status: Status, en: string, ar: string, extra: Partial<RecordLine> = {}) =>
    lines.push({ check, status, text: { en, ar }, ...extra });

  // --- claims ---
  let who: Claim[] = runLex(FAMILY.filter(l => l[0] === "who"), text, nt);
  for (const e of reg) {
    for (const n of [...e.names_en, ...e.names_ar, ...e.aliases]) {
      if (n && nt.indexOf(norm(n)) >= 0) { who.push({ kind: "who", value: e.id, quote: n }); break; }
    }
  }
  // AI entity hint: accepted only if that id is in the shipped registry; it adds a claim, never a status.
  if (hints.entityId && reg.some(e => e.id === hints.entityId) && !who.some(w => w.value === hints.entityId)) {
    who.push({ kind: "who", value: hints.entityId, quote: "", fromTaps: true }); reasons.push("entity_from_ai_hint");
  }
  if (!who.some(w => w.value !== "family")) who.push(...runLex(GENERIC_WHO, text, nt));
  let channel: Claim[] = [...runLex(FAMILY.filter(l => l[0] === "channel"), text, nt), ...runLex(CHANNEL_WORDS, text, nt)];
  let asks: Claim[] = runLex(ASKS, text, nt);

  if (taps) {
    const t = (kind: Claim["kind"], value: string): Claim => ({ kind, value, quote: "", fromTaps: true });
    if (taps.who !== "not_sure") who.push(t("who", taps.entityId && reg.some(e => e.id === taps.entityId) ? taps.entityId : taps.who));
    for (const w of taps.wants) if (w !== "not_sure" && !asks.some(a => a.value === w)) asks.push(t("ask", w));
    for (const p of taps.pressure) if (p !== "not_sure" && !asks.some(a => a.value === p)) asks.push(t("ask", p));
    if (taps.via) channel.push(t("channel", taps.via));
  }

  const claimedEntities = who.map(w => reg.find(e => e.id === w.value)).filter((e): e is RegistryRow => !!e);
  const hasFamily = who.some(w => w.value === "family");
  const official = who.some(w => w.value !== "family" && w.value !== "other");
  const officialBody = claimedEntities.length > 0 || who.some(w => w.value === "official");

  // --- source line: links ---
  let mismatchFlag = false, sourceMatch = false;
  const urls = [...nt.matchAll(URL_RE)].map(m => m[1]).filter(u => /[a-z؀-ۿ]/.test(u.split(".").pop() || ""));
  if (HIDDEN.test(text) && urls.length) {
    add("source", "mismatch", "The link contains hidden characters that can disguise where it goes", "يحتوي الرابط على رموز مخفية قد تُخفي وجهته الفعلية");
    mismatchFlag = true; reasons.push("hidden_characters");
  }
  for (const u of urls) {
    const p = parseDomain(u.startsWith("http") ? u : "http://" + u);
    if (!p.domain || !p.isIcann) continue;
    const host = p.hostname || p.domain;
    channel.push({ kind: "channel", value: "link:" + host, quote: u });
    const owner = reg.find(e => e.domains.some(d => host === d || host.endsWith("." + d)));
    const isGov = /(^|\.)gov\.ae$/.test(host);
    const ent = claimedEntities[0];
    if (SHORTENERS.has(p.domain)) {
      add("source", "mismatch", `Link is a URL shortener (${host}); where it leads is hidden`, `الرابط مختصر (${host})؛ الوجهة الفعلية مخفية`);
      mismatchFlag = true; reasons.push("shortener");
    } else if (host.split(".").some(l => l.startsWith("xn--"))) {
      add("source", "mismatch", `${host} uses look-alike letters (punycode)`, `${host} يستخدم حروفًا متشابهة (punycode)`);
      mismatchFlag = true; reasons.push("punycode");
    } else if (ent && !claimedEntities.some(e => e === owner)) {
      const n = nameOf(ent);
      add("source", "mismatch",
        `Message claims to be ${n.en}, but ${host} is not on ${n.en}'s registered domains (${ent.domains.join(", ") || "none on file"})`,
        `تدّعي الرسالة أنها من ${n.ar}، لكن ${host} ليس من نطاقاتها المسجّلة (${ent.domains.join("، ") || "لا يوجد في السجل"})`,
        { source: rowSrc(ent) });
      mismatchFlag = true; reasons.push("claimed_entity_domain_mismatch");
    } else if (owner) {
      const n = nameOf(owner);
      add("source", "match", `${host} is on ${n.en}'s registered domain`, `${host} من النطاق المسجّل لـ${n.ar}`, { source: rowSrc(owner) });
      sourceMatch = true;
    } else if (!isGov && reg.some(e => e.domains.some(d => {
      const lbl = d.split(".")[0]; return lbl.length >= 3 && (host.includes(lbl) || lev(p.domainWithoutSuffix || "", lbl) <= 1);
    }))) {
      add("source", "mismatch", `${host} looks like an official name but is not an official domain`, `${host} يشبه اسمًا رسميًا لكنه ليس نطاقًا رسميًا`);
      mismatchFlag = true; reasons.push("lookalike_domain");
    } else if (isGov) {
      add("source", "unknown", `${host}: not in our registry. gov.ae names are restricted to UAE government bodies (AEDA-POL-007 s.15; policy dated 2008)`,
        `${host}: غير موجود في سجلّنا. نطاقات gov.ae مخصّصة للجهات الحكومية (سياسة AEDA-POL-007 البند 15؛ مؤرخة 2008)`);
    } else if (p.publicSuffix === "ae") {
      add("source", "unknown", `${host}: not in official sources. Anyone can register a plain .ae name (AEDA-POL-007 s.10)`,
        `${host}: غير موجود في المصادر الرسمية. يمكن لأي شخص تسجيل نطاق ‎.ae‎ (سياسة AEDA-POL-007 البند 10)`);
    } else {
      add("source", "unknown", `${host}: not in official sources (unknown)`, `${host}: غير موجود في المصادر الرسمية (غير معروف)`);
    }
  }

  // --- number line: numbers in the text vs claimed entity and UAE numbering ranges ---
  const numSrc = src("https://raw.githubusercontent.com/google/libphonenumber/master/resources/metadata/971/ranges.csv", "UAE numbering ranges (libphonenumber, Apache-2.0)", data.numbering.retrieved);
  const seen = new Set<string>();
  for (const m of nt.matchAll(/(?:\+\s?971|00971|\b0)?[\s-]?\d[\d\s-]{3,13}\d/g)) {
    const nsn = uaeNsn(m[0]); if (!nsn || seen.has(nsn)) continue;
    const r = numberType(nsn, data.numbering.ranges); if (!r) continue;
    seen.add(nsn);
    const ty = TYPE_T[r.tariff === "STANDARD_RATE" ? r.type : r.tariff] ?? TYPE_T[r.type] ?? { en: r.type, ar: r.type };
    const ent = claimedEntities.find(e => e.phones.length);
    if (ent) {
      const n = nameOf(ent);
      if (ent.phones.some(p => uaeNsn(p.e164) === nsn))
        add("number", "match", `${m[0].trim()} is ${n.en}'s published number. Caller ID can be spoofed: hang up and call it yourself`,
          `${m[0].trim()} هو الرقم المنشور لـ${n.ar}. يمكن تزوير رقم المتصل: أغلق الخط واتصل بنفسك`, { source: rowSrc(ent) });
      else { add("number", "mismatch", `${m[0].trim()} is not ${n.en}'s published number; it is ${ty.en}`, `${m[0].trim()} ليس الرقم المنشور لـ${n.ar}؛ إنه ${ty.ar}`, { source: rowSrc(ent) }); mismatchFlag = true; reasons.push("entity_number_mismatch"); }
    } else if (officialBody && (r.type === "MOBILE" || r.tariff === "PREMIUM_RATE")) {
      add("number", "mismatch", `A government body is claimed, but ${m[0].trim()} is ${ty.en}`, `يُدّعى أنها جهة حكومية، لكن ${m[0].trim()} ${ty.ar}`, { source: numSrc });
      mismatchFlag = true; reasons.push("official_on_mobile_or_premium");
    }
  }

  // --- family line ---
  const phones = [...nt.matchAll(/(\+?971|00971|0)?\s?5\d[\s-]?\d{3}[\s-]?\d{4}/g)].map(m => m[0].replace(/\D/g, "").slice(-9));
  if (hasFamily) {
    const fam = family.saved.map(c => digits(c.tel).slice(-9));
    const newNum = channel.some(c => c.value === "new_number");
    const s = family.senderIs;
    if (s === "new" || (s === undefined && (newNum || phones.some(p => !fam.includes(p))))) {
      add("family", "mismatch", "Not the number you have saved for this person. Call the saved number", "ليس الرقم المحفوظ لديك لهذا الشخص. اتصل بالرقم المحفوظ");
      mismatchFlag = true; reasons.push("family_unsaved_number");
    } else if (s === "saved") {
      add("family", "unknown", "Same number, but accounts can be taken over. Call.", "الرقم نفسه، لكن الحسابات قد تُخترق. اتصل.");
    } else {
      add("family", "unknown", "Sender number not checked here. Call the saved number to confirm", "لم نتحقق من رقم المرسل هنا. اتصل بالرقم المحفوظ للتأكد");
    }
  }

  // --- red lines (rule fires regardless of data; the line is shown only with an approved source) ---
  const sensitive = asks.some(a => a.value === "code" || a.value === "id_or_card");
  const redRule = (id: string) => data.redlines.rules.find(r => r.id === id);
  const redLine = (id: string) => {
    const r = redRule(id); if (!r) return;
    const advice = r.trigger !== "official_asks_details"; // advice lines are guidance, not a record mismatch
    lines.push({ check: "redline", status: advice ? "unknown" : "mismatch", ...(advice ? { state: "advice" as const } : {}),
      text: { en: r.text_en, ar: r.text_ar || r.text_en }, source: src(r.source_url, r.publisher, r.published) });
  };
  if (sensitive && (official || /بنك|bank/.test(nt))) { redLine("RL_DETAILS"); mismatchFlag = true; reasons.push("redline_details"); }
  if (hasFamily) redLine("RL_HIJACK");
  if (asks.some(a => a.value === "forward") || channel.some(c => c.value === "video")) redLine("RL_REPOST");
  const pay = asks.some(a => a.value === "money");
  if (official && pay && urls.length && !sourceMatch) reasons.push("official_payment_off_record");

  // --- announcement line (dated snapshot, keyword match; AI hint must point at a snapshot item) ---
  const ann = data.announcements;
  if (officialBody) {
    if (!ann.snapshot_date || !ann.items.length) {
      add("announcement", "unknown", "Official announcement check: not connected", "التحقق من الإعلانات الرسمية: غير متصل", { state: "not_connected" });
    } else {
      const annSrc = src(ann.index_url || "", "Abu Dhabi Media Office RSS", ann.snapshot_date);
      const words = new Set(nt.split(/[^a-z0-9؀-ۿ]+/).filter(w => w.length >= 5));
      const byHint = hints.announcementLink ? ann.items.find(i => i.link === hints.announcementLink) : undefined;
      const best = byHint ?? ann.items
        .map(i => ({ i, n: norm(i.title).split(/[^a-z0-9؀-ۿ]+/).filter(w => words.has(w)).length }))
        .filter(x => x.n >= 3).sort((a, b) => b.n - a.n)[0]?.i;
      if (best) add("announcement", "match", `Official announcement on a related topic: "${best.title}" (${best.published}). Open it from this link, not the message`,
        `إعلان رسمي عن موضوع قريب: "${best.title}" (${best.published}). افتحه من هذا الرابط، لا من الرسالة`, { source: annSrc, state: "snapshot", link: best.link });
      else add("announcement", "unknown", `No matching announcement in the official feeds we can read (snapshot ${ann.snapshot_date}). These feeds cover Abu Dhabi government only`,
        `لا يوجد إعلان مطابق في المصادر الرسمية المتاحة لنا (نسخة ${ann.snapshot_date}). هذه المصادر تغطي حكومة أبوظبي فقط`, { source: annSrc, state: "snapshot" });
    }
    if (pay) add("fee", "unknown", "Official fee list: not connected", "قائمة الرسوم الرسمية: غير متصلة", { state: "not_connected" });
  }

  // --- content line (honest states only) ---
  if (channel.some(c => c.value === "video" || c.value === "voice_note")) {
    add("content", "unknown", "Content Credentials: not connected. Deepfake video model (DESC SARAAB): not yet publicly released",
      "بيانات اعتماد المحتوى: غير متصلة. نموذج كشف التزييف العميق في الفيديو (SARAAB): لم يُطرح للعامة بعد", { state: "not_connected" });
  }

  // --- Quote Guard ---
  const g1 = quoteGuard(text, [...who, ...channel, ...asks]);
  who = g1.kept.filter(c => c.kind === "who"); channel = g1.kept.filter(c => c.kind === "channel"); asks = g1.kept.filter(c => c.kind === "ask");

  // --- band (v1 logic; mismatch comes from rule flags, not from which lines are displayed) ---
  const hardAsk = asks.some(a => ["money", "code", "id_or_card", "call_number"].includes(a.value));
  const pressure = asks.some(a => ["urgency", "secrecy", "threat"].includes(a.value));
  let band: Band = "no_signs_found";
  if (mismatchFlag && (hardAsk || asks.some(a => a.value === "click"))) band = "stop_and_verify";
  else if (hardAsk && pressure) { band = "stop_and_verify"; reasons.push("hard_ask+pressure"); }
  else if (hasFamily && asks.some(a => a.value === "code")) { band = "stop_and_verify"; reasons.push("family_asks_for_code"); }
  else if (hardAsk || mismatchFlag) band = "verify_first";

  // --- verify targets: tel: only, saved or approved published numbers ---
  const verify: VerifyTarget[] = [];
  if (hasFamily) for (const c of family.saved) verify.push({ kind: "family", name: c.name, tel: c.tel });
  for (const e of claimedEntities) for (const p of e.phones.slice(0, 1))
    verify.push({ kind: "entity", name: nameOf(e).en, tel: p.e164, source: rowSrc(e) });
  if (family.helper) verify.push({ kind: "helper", name: family.helper.name, tel: family.helper.tel });
  const verifyNote: T = hasFamily
    ? { en: "Call. Do not reply in this chat.", ar: "اتصل. لا تردّ في هذه المحادثة." }
    : verify.some(v => v.kind === "entity")
      ? { en: "Call the published number yourself. Do not use any number or link in the message.", ar: "اتصل بالرقم المنشور بنفسك. لا تستخدم أي رقم أو رابط من الرسالة." }
      : { en: "Find the number on the organisation's own website or your card, not in the message. Do not reply in this chat.", ar: "ابحث عن الرقم في موقع الجهة نفسها أو على بطاقتك، لا في الرسالة. لا تردّ في هذه المحادثة." };

  const outcomes: OutcomeId[] = ["confirmed_by_phone", "not_confirmed_do_not_pay"];
  if (asks.some(a => a.value === "forward") || channel.some(c => c.value === "video")) outcomes.push("not_confirmed_do_not_forward");

  return { input: taps && !text ? "taps" : "text", who, channel, asks, lines, band, headline: HEADLINE[band],
    verify, verifyNote, outcomes, quoteGuardRemoved: g1.removed, reasons };
}
export type { Contact };
