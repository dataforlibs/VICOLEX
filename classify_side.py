#!/usr/bin/env python3
"""
Classify each of the 161 documents as OUN/UPA-authored or Soviet-authored
(plus a small "other" bucket for German-occupation documents that belong
to neither side), using the book's own editorial structure rather than
crude keyword counts.

Rationale for this approach:
- The book itself organizes documents into Part One/Two (docs 1-125,
  "The Programmatic Principles..." / "The Struggle of the Ukrainian
  Liberation Movement") and Part Three (docs 126-161, "Soviet Security
  Organs and the Struggle against the Ukrainian Liberation Movement").
  That structural split IS the editors' own OUN-vs-Soviet division for
  the great majority of documents.
- A naive rule ("[Russian-language document]" tag = Soviet-authored)
  looks appealing but is WRONG in several cases the Translator's Note
  itself explains: some Russian-tagged documents are Ukrainian-authored
  originals that were translated into Russian by Soviet archivists when
  captured (e.g., doc 114 is explicitly marked "Translated from the
  Ukrainian"), and some are OUN propaganda deliberately written in
  Russian to address Red Army/Soviet-nationality audiences (docs 108,
  109). Similarly, a raw NKVD/MGB keyword count misfires on OUN
  documents that are ABOUT the Soviet security services (e.g., doc 43
  is OUN's own interrogation record of a captured NKVD agent; docs
  46-48 are OUN's own SB records, which necessarily mention "SB" a lot).
- So: only 4 documents inside Parts One/Two were hand-verified, by
  reading their content and letterhead, as belonging outside the OUN
  side: 58 and 59 (German police/military leaflets from the occupation),
  69 (explicitly tagged "[Russian translation of a German document]",
  a captured Wehrmacht corps order), and 101 (explicitly addressed to
  an NKVD oblast directorate - a genuine Soviet report embedded in the
  chapter for contrast). Every other document in Parts One/Two is
  classified OUN/UPA; every document in Part Three is Soviet.
"""
import json

DOCS_DIR = "/home/claude/extracted_documents"

GERMAN_EXCEPTIONS = {58, 59, 69}   # occupation-era German documents
SOVIET_EXCEPTIONS = {101}          # genuine Soviet doc embedded in Parts One/Two
SOVIET_PART_START = 126            # "Part Three: Soviet Security Organs..." begins here


def classify(doc_num):
    if doc_num in GERMAN_EXCEPTIONS:
        return "other_german"
    if doc_num in SOVIET_EXCEPTIONS:
        return "soviet"
    if doc_num >= SOVIET_PART_START:
        return "soviet"
    return "oun"


def main():
    idx = json.load(open(f"{DOCS_DIR}/_index.json", encoding="utf-8"))
    idx = sorted(idx, key=lambda d: d["number"])

    results = []
    for d in idx:
        side = classify(d["number"])
        results.append({"number": d["number"], "title": d["title"], "side": side})

    from collections import Counter
    print(Counter(r["side"] for r in results))

    with open("/home/claude/analysis/side_classification.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=1, ensure_ascii=False)

    return results


if __name__ == "__main__":
    main()
