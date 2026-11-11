// CheckResult contract (A2). A1 imports types from here only. Every user-facing result string is a T from the engine.
export type Lang = "en" | "ar";
export interface T { en: string; ar: string }
export type Status = "mismatch" | "match" | "unknown";
export type Band = "stop_and_verify" | "verify_first" | "no_signs_found"; // internal; UI shows result.headline
export interface Src { url: string; title: string; date: string }     // date = retrieved or page date, ISO
export interface Claim { kind: "who" | "channel" | "ask"; value: string; quote: string; fromTaps?: boolean }
export type Check = "source" | "number" | "redline" | "announcement" | "family" | "content" | "fee";
export interface RecordLine {
  check: Check; status: Status; text: T; source?: Src;
  state?: "not_connected" | "snapshot" | "advice";   // honest label for parts that are not live
  link?: string;                          // e.g. the matching announcement
}
export interface VerifyTarget { kind: "family" | "entity" | "helper"; name: string; tel: string; source?: Src }
export type OutcomeId = "confirmed_by_phone" | "not_confirmed_do_not_pay" | "not_confirmed_do_not_forward";
export interface CheckResult {
  input: "text" | "taps";
  who: Claim[]; channel: Claim[]; asks: Claim[];
  lines: RecordLine[];
  band: Band; headline: T;
  verify: VerifyTarget[];          // tel: targets only: saved numbers or approved published numbers
  verifyNote: T;                   // "Call. Do not reply in this chat." etc.
  outcomes: OutcomeId[];
  quoteGuardRemoved: number; reasons: string[];
}

// ---- input ----
export type TapWho = "family" | "official" | "bank" | "other" | "not_sure";
export type TapWant = "money" | "code" | "id_or_card" | "click" | "forward" | "not_sure";
export type TapPressure = "urgency" | "secrecy" | "threat" | "not_sure";
export interface Taps { who: TapWho; wants: TapWant[]; pressure: TapPressure[]; entityId?: string; via?: "voice_note" | "call" | "video" | "sms" | "chat" }
export type SenderIs = "saved" | "new" | "not_sure";
export interface Contact { name: string; tel: string }
export interface Family { saved: Contact[]; helper?: Contact; senderIs?: SenderIs }
export interface Input { text?: string; taps?: Taps }

// ---- data (shapes of /data/*.json) ----
export interface RegistryRow {
  id: string; names_ar: string[]; names_en: string[]; aliases: string[]; domains: string[];
  phones: { e164: string; kind: string }[]; portal_url: string;
  source_url: string; source_title: string; retrieved: string; approved_by_lead: boolean; notes?: string;
}
export interface RedLine { id: string; trigger: string; text_en: string; text_ar: string; publisher: string; source_url: string; published: string; retrieved: string; approved_by_lead: boolean }
export interface NumberRange { prefix: string; length: string; type: string; tariff: string; operator: string | null; region: string | null }
export interface Announcement { title: string; link: string; published: string; lang: string; category: string }
export interface Data {
  registry: { entities: RegistryRow[] };
  redlines: { rules: RedLine[] };
  numbering: { ranges: NumberRange[]; _source: string; retrieved: string };
  announcements: { snapshot_date: string | null; index_url?: string; items: Announcement[] };
}
// Optional AI hints (A3). The engine re-checks each against the records; a hint never sets a status on its own.
export interface Hints { entityId?: string; announcementLink?: string }
