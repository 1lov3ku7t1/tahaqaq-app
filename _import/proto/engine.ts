// Tahaqaq claim engine prototype (I5, 10 Nov 2026). Rules only, no AI, no network.
// Run with Node 22+ (type stripping). Drop-in for the Expo app: no Node APIs used.
import { parse as parseDomain } from "tldts";

export type Status = "mismatch" | "match" | "unknown";
export type Band = "stop_and_verify" | "verify_first" | "no_signs_found";
export interface Claim { kind: string; value: string; quote: string }
export interface RecordLine { check: string; status: Status; text: string; source?: string }
export interface CheckResult {
  who: Claim[]; channel: Claim[]; asks: Claim[];
  lines: RecordLine[]; band: Band; quoteGuardRemoved: number; reasons: string[];
}
export interface RegistryRow { id: string; names: string[]; domains: string[]; source: string }
export interface Registry { entities: RegistryRow[] }

// ---------- Arabic + general normalisation ----------
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩", FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export function norm(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, "")       // tashkeel + tatweel
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[ؤ]/g, "و").replace(/[ئ]/g, "ي")
    .replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(FA_DIGITS.indexOf(d)))
    .replace(/[‌-‏‪-‮]/g, "")      // bidi marks (spoofing)
    .toLowerCase();
}

// ---------- lexicons (normalised forms; Gulf + MSA + EN) ----------
// Each entry: [kind, value, pattern]. Patterns run on norm(text).
type Lex = [string, string, RegExp];
const ASKS: Lex[] = [
  ["ask", "money", /(حول(ي|لي|و)?|تحويل|ارسل(ي)? (لي )?(مبلغ|فلوس)|فلوس|مبلغ|\d[\d,\.]*\s*(درهم|aed|dhs?)|\b(aed|dhs?)\s*\d|transfer|send (me )?(money|aed|\d)|wire|pay(ment)?\b|ادفع|سداد|دفع)/],
  ["ask", "code", /(رمز|الكود|كود|otp|one[- ]time|verification code|\bcode\b|\bpin\b|كلمه (السر|المرور))/],
  ["ask", "id_or_card", /(رقم (البطاقه|الحساب|الهويه)|بطاقتك|الهويه الاماراتيه|emirates id|card (number|details)|cvv|iban|bank details|تفاصيل (البطاقه|الحساب)|بيانات(ك)? البنكيه)/],
  ["ask", "money", /(7aw+el|7awel|7wl|flous|floos|fulus|dirham)/],
  ["ask", "click", /(اضغط|انقر|افتح الرابط|الرابط|click|tap (the|this) link|follow the link|https?:\/\/|www\.)/],
  ["ask", "secrecy", /(la tgoleen|la t9oleen|la tgool|لا (تخبر|تقول|تعلم)|لا تقول ل|بيني وبينك|(?<![؀-ۿ])سر(?![؀-ۿ])|don'?t tell|keep (it|this) (secret|between)|no one (must|should) know)/],
  ["ask", "urgency", /(bsur3a|b ?sor3a|al7een|7aleen|فورا|الحين|بسرعه|ضروري|عاجل|خلال (\d+ )?(ساعه|ساعات|دقايق|دقائق|يوم)|اليوم قبل|urgent|immediately|right now|asap|within \d+ (hours?|minutes?)|today)/],
  ["ask", "threat", /(ايقاف|حظر|تجميد|غرامه|مخالفه|القبض|سيتم (الغاء|ايقاف|حجز)|blocked|suspended|frozen|arrest|penalt|fine of|legal action)/],
];
const FAMILY: Lex[] = [
  ["who", "family", /(ماما|يمه|يما|امي|ابوي|بابا|ولدك|بنتك|ابنك|اخوك|اختك|حبيبتي امي|it'?s me,? (mum|mom|dad)|\b(mum|mom|dad|mama|grandma|nana)\b|your (son|daughter|grandson|granddaughter)|ibnik|ibnich|bintik|ana ibn)/],
  ["channel", "new_number", /(رقمي الجديد|هذا رقمي|رقم جديد|تلفوني (خرب|طاح|انكسر|ضاع)|new number|lost my phone|phone (broke|is broken|died))/],
];
const CHANNEL_WORDS: Lex[] = [
  ["channel", "whatsapp", /(واتساب|واتس|whatsapp)/],
  ["channel", "sms", /(\bsms\b|رساله نصيه)/],
  ["channel", "call", /(اتصال|مكالمه|call(ed|ing)?\b)/],
];
const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "rb.gy", "shorturl.at", "t.ly", "goo.su"]);

// ---------- helpers ----------
function quoteAt(text: string, ntext: string, m: RegExpExecArray): string {
  // norm() keeps length for all mappings above except removed diacritics/bidi; fall back to normalised quote.
  return text.length === ntext.length ? text.substr(m.index, m[0].length) : m[0];
}
// v1: a code/card mention inside a warning ("never share your OTP") is not an ask.
const NEG = /(never|do not|don'?t|not to|will not|won'?t|no one|لا (تشارك|تعط|تعطي|ترسل|تفصح)|لن |ابدا|لا يطلب|لا نطلب|لن نطلب|تحذر|تحذير)[^.!؟?،]{0,40}$/;
const REQUEST = /(send|share|enter|update|give|reply|provide|read it|tell me|confirm your|ارسل|اعط|ادخل|حدث|تحديث|شارك|زودنا|ارسليه|ارسله|عطني|اعطني|قول لي|قولي لي)/;
function runLex(lex: Lex[], text: string, nt: string): Claim[] {
  const out: Claim[] = [];
  for (const [kind, value, re] of lex) {
    const r = new RegExp(re.source, "g"); let m: RegExpExecArray | null;
    while ((m = r.exec(nt))) {
      if (kind === "ask" && (value === "code" || value === "id_or_card")) {
        if (NEG.test(nt.slice(Math.max(0, m.index - 60), m.index))) continue;   // warning, not a request
        if (!REQUEST.test(nt)) continue;                                        // mention without a request verb
      }
      out.push({ kind, value, quote: quoteAt(text, nt, m) }); break;
    }
  }
  return out;
}
const URL_RE = /\b((?:https?:\/\/)?(?:[a-z0-9؀-ۿ-]+\.)+[a-z؀-ۿ]{2,}(?:\/[^\s]*)?)/gi;
function lev(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// ---------- Quote Guard: drop any claim whose quote is not in the text ----------
export function quoteGuard(text: string, claims: Claim[]): { kept: Claim[]; removed: number } {
  const nt = norm(text);
  const kept = claims.filter(c => nt.includes(norm(c.quote)));
  return { kept, removed: claims.length - kept.length };
}

// ---------- main ----------
export function analyze(text: string, reg: Registry, familyNumbers: string[] = []): CheckResult {
  const nt = norm(text);
  const reasons: string[] = [];
  let who = runLex(FAMILY.filter(l => l[0] === "who"), text, nt);
  // entity gazetteer
  for (const e of reg.entities) {
    for (const n of e.names) {
      const i = nt.indexOf(norm(n));
      if (i >= 0) { who.push({ kind: "who", value: e.id, quote: n }); break; }
    }
  }
  let channel = [...runLex(FAMILY.filter(l => l[0] === "channel"), text, nt), ...runLex(CHANNEL_WORDS, text, nt)];
  let asks = runLex(ASKS, text, nt);

  // links
  const lines: RecordLine[] = [];
  const urls = [...nt.matchAll(URL_RE)].map(m => m[1]).filter(u => /[a-z؀-ۿ]/.test(u.split(".").pop() || ""));
  for (const u of urls) {
    const p = parseDomain(u.startsWith("http") ? u : "http://" + u);
    if (!p.domain || !p.isIcann) continue;
    const host = p.hostname || p.domain;
    channel.push({ kind: "channel", value: "link:" + host, quote: u });
    const claimed = who.filter(w => w.value !== "family").map(w => reg.entities.find(e => e.id === w.value)!).filter(Boolean);
    const owner = reg.entities.find(e => e.domains.some(d => host === d || host.endsWith("." + d)));
    const isGov = /(^|\.)gov\.ae$/.test(host);
    if (SHORTENERS.has(p.domain)) {
      lines.push({ check: "source", status: "mismatch", text: `Link is a URL shortener (${host}); the real destination is hidden` });
      reasons.push("shortener");
    } else if (claimed.length && !claimed.some(e => e === owner)) {
      const ent = claimed[0];
      lines.push({ check: "source", status: "mismatch", source: ent.source,
        text: `Message claims to be ${ent.id}, but ${host} is not on ${ent.id}'s registered domains (${ent.domains.join(", ")})` });
      reasons.push("claimed_entity_domain_mismatch");
    } else if (owner) {
      lines.push({ check: "source", status: "match", source: owner.source,
        text: `${host} is on ${owner.id}'s registered domain. Matches official record (the request can still be a scam)` });
    } else if (!isGov && reg.entities.some(e => e.domains.some(d => {
        const lbl = d.split(".")[0]; return lbl.length >= 3 && (host.includes(lbl) || lev(p.domainWithoutSuffix || "", lbl) <= 1);
      }))) {
      lines.push({ check: "source", status: "mismatch", text: `${host} looks like an official name but is not an official domain` });
      reasons.push("lookalike_domain");
    } else {
      lines.push({ check: "source", status: "unknown", text: `${host}: not in official sources (unknown)` });
    }
  }

  // phone numbers vs family list (on-device)
  const phones = [...nt.matchAll(/(\+?971|00971|0)?\s?5\d[\s-]?\d{3}[\s-]?\d{4}/g)].map(m => m[0].replace(/\D/g, "").slice(-9));
  const hasFamily = who.some(w => w.value === "family");
  if (hasFamily) {
    const fam = familyNumbers.map(n => n.replace(/\D/g, "").slice(-9));
    const newNum = channel.some(c => c.value === "new_number");
    if (newNum || phones.some(p => !fam.includes(p))) {
      lines.push({ check: "family", status: "mismatch", text: "This is not the number saved for this family member. Call the saved number" });
      reasons.push("family_unsaved_number");
    } else {
      lines.push({ check: "family", status: "unknown", text: "Sender number not checked here. Call the saved number to confirm" });
    }
  }

  // red lines
  const sensitive = asks.some(a => a.value === "code" || a.value === "id_or_card");
  const official = who.some(w => w.value !== "family");
  if (sensitive && (official || /بنك|bank/.test(nt))) {
    lines.push({ check: "redline", status: "mismatch", source: "MOI via Gulf News 1 Mar 2026",
      text: "Authorities never request personal or banking details through calls, texts or unknown links" });
    reasons.push("redline_details");
  }
  const pay = asks.some(a => a.value === "money");
  if (official && pay && urls.length && !lines.some(l => l.check === "source" && l.status === "match")) {
    reasons.push("official_payment_off_record");
  }

  // Quote Guard (all rule claims are quoted by construction; kept for LLM-extractor parity)
  const g1 = quoteGuard(text, [...who, ...channel, ...asks]);
  who = g1.kept.filter(c => c.kind === "who"); channel = g1.kept.filter(c => c.kind === "channel"); asks = g1.kept.filter(c => c.kind === "ask");

  // band (never "safe"/"fake")
  const hardAsk = asks.some(a => ["money", "code", "id_or_card"].includes(a.value));
  const pressure = asks.some(a => ["urgency", "secrecy", "threat"].includes(a.value));
  const mismatch = lines.some(l => l.status === "mismatch");
  let band: Band = "no_signs_found";
  if (mismatch && (hardAsk || asks.some(a => a.value === "click"))) band = "stop_and_verify";
  else if (hardAsk && pressure) { band = "stop_and_verify"; reasons.push("hard_ask+pressure"); }
  else if (hasFamily && asks.some(a => a.value === "code")) { band = "stop_and_verify"; reasons.push("family_asks_for_code"); }
  else if (hardAsk || mismatch) band = "verify_first";
  return { who, channel, asks, lines, band, quoteGuardRemoved: g1.removed, reasons };
}
