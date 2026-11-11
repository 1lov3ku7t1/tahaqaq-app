# Registry and records: approval sheet for the lead (H5)

Rule 4: a row ships only when `approved_by_lead` is `true` and `source_url` is the entity's own page.
How: open the page in a normal browser, check the value, edit the row in the JSON file, set `approved_by_lead: true`, change `source_url`, `source_title`, `retrieved` to that page and today. Then run `node data/validate.mjs`.

## registry.json (6 rows from the u.ae directory; none approved)
| id | have now | open this and confirm | fill if missing |
|---|---|---|---|
| NMA | site nma.gov.ae, +971 800 971 | contact page on nma.gov.ae | Arabic name, domains |
| EtihadWE | +971 800 3392 | Etihad Water and Electricity own site (not on file) | domain, Arabic name |
| MOHESR | site mohesr.gov.ae, +971 800 511 | contact page on mohesr.gov.ae | Arabic name |
| Awqaf | site awqaf.gov.ae, +971 800 8222 | contact page on awqaf.gov.ae | Arabic name |
| EmiratesPost | +971 600 599999 | Emirates Post own site (not on file) | domain, Arabic name |
| DubaiCSD | +971 4 305 5555 | Dubai CSD own site (not on file) | full name, domain, Arabic name |

Target about 25 entities. Candidates named in Tahaqaq.md (no domains or numbers from memory): MOHRE, Ministry of Interior, Dubai Police, Abu Dhabi Police, ICP, GDRFA, RTA, DEWA, Salik, TDRA, Central Bank (CBUAE), u.ae, Emirates Post, Cyber Security Council, DESC. For each new row add: id, names_en, names_ar, domains, phones (e164), source_url (own page), retrieved.

## redlines.json (4 rows, sources are press reports of official advisories)
RL_DETAILS (MoI via Gulf News 1 Mar 2026), RL_VOICE (Dubai Police via Emirates 24/7), RL_HIJACK (TDRA via Gulf News 2023), RL_REPOST (Cyber Security Council via The National). Open each link; confirm the quoted words; approve, or replace with the authority's own page.

## routes.json (7 rows)
Open the u.ae reporting page; confirm the six routes and the page date (4 Mar 2024). GDRFA Amer 800 5111 is from a Gulf News report; confirm or drop.
