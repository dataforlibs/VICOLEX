#!/usr/bin/env python3
"""
Extract the 161 numbered historical documents from "Enemy Archives"
(Viatrovych & Luciuk, eds.) into individual clean .txt files.

Why this approach:
- Plain `pdftotext` mangles this book's small-caps document headings
  (InDesign kerning makes poppler insert stray spaces between letters,
  e.g. "d o c ume n t 4"), so regex-splitting the plain text is
  unreliable — only 14/161 headings match cleanly that way.
- PyMuPDF's structured text (get_text("dict")) exposes each span's
  actual font size, and the "document N: title" headings all render
  at a distinct size (11.5pt) never used elsewhere in the body text.
  Combining that font-size signal with a text-pattern check on the
  heading, validated as a strictly increasing sequence (1, 2, 3, ...),
  gives 161/161 correct splits with zero false positives.
- Running headers/footers (page number + chapter title, ~10pt, sitting
  in the top page margin) and chapter/part divider pages (~15pt) are
  filtered out by font size and vertical position so they don't leak
  into the document text.
- Document titles are pulled from the Table of Contents (pages 5-13),
  which is set in normal type (not small caps) and parses cleanly.

Usage:
    python3 extract_documents.py /path/to/Enemy_Archives.pdf /path/to/output_dir
"""

import fitz  # PyMuPDF
import re
import os
import sys
import json
import unicodedata

HEADING_SIZE_RANGE = (11.0, 12.0)   # "document N: ..." heading font size
DIVIDER_SIZE_MIN = 14.0             # chapter/part divider titles, always excluded
HEADER_FOOTER_Y_FRACTION = 0.085    # top-of-page running header band
FOOTNOTE_MARKER_SIZE_MAX = 7.0      # tiny superscript footnote reference numbers
HEADING_PATTERN = re.compile(r'^document\s*(\d+)\s*:?', re.IGNORECASE)


def parse_toc(doc, toc_page_range=(4, 14)):
    """Best-effort parse of the Table of Contents into {doc_num: title}."""
    toc = {}
    current_num = None
    parts = []

    for pi in range(*toc_page_range):
        if pi >= len(doc):
            break
        text = doc[pi].get_text()
        for raw_line in text.split("\n"):
            line = raw_line.strip()
            if not line:
                continue
            m = re.match(r'^(\d{1,3})\s*(.*)$', line)
            if current_num is None and m and 1 <= int(m.group(1)) <= 999:
                # Only treat a leading number as a NEW entry when the previous
                # one has already closed (found its page number) - otherwise a
                # wrapped title line that happens to start with a bare year
                # (e.g. "1945 784") gets misread as a new TOC entry "194".
                current_num = int(m.group(1))
                rest = m.group(2)
                parts = []
            else:
                if current_num is None:
                    continue  # front matter, not a document entry
                rest = line

            m2 = re.search(r'(\d{1,4})\s*$', rest)
            if m2:
                title_part = rest[:m2.start()].strip()
                parts.append(title_part)
                title = re.sub(r'\s+', ' ', " ".join(p for p in parts if p)).strip()
                if current_num not in toc:
                    toc[current_num] = title
                current_num, parts = None, []
            else:
                parts.append(rest)

    return toc


def block_text(block):
    """Join all spans in a block into one string, dropping tiny footnote markers."""
    out = []
    for line in block.get("lines", []):
        line_str = ""
        for span in line["spans"]:
            if span["size"] < FOOTNOTE_MARKER_SIZE_MAX:
                continue  # superscript footnote reference number, not real text
            line_str += span["text"]
        if line_str.strip():
            out.append(line_str)
    return " ".join(out).strip()


def block_max_size(block):
    sizes = [s["size"] for l in block.get("lines", []) for s in l["spans"]]
    return max(sizes) if sizes else 0


def extract_documents(pdf_path):
    doc = fitz.open(pdf_path)
    toc = parse_toc(doc)

    documents = {}          # num -> {"title", "start_page", "end_page", "paragraphs": [...]}
    current_num = None
    current_paras = []
    current_start_page = None
    expected = 1
    in_heading_run = False

    for pi in range(len(doc)):
        page = doc[pi]
        page_height = page.rect.height
        header_band = page_height * HEADER_FOOTER_Y_FRACTION
        blocks = page.get_text("dict")["blocks"]
        # keep reading order: sort by vertical position
        blocks = [b for b in blocks if "lines" in b]
        blocks.sort(key=lambda b: b["bbox"][1])

        for block in blocks:
            y0 = block["bbox"][1]
            if y0 < header_band:
                continue  # running header / folio number

            size = block_max_size(block)
            text = block_text(block)
            if not text:
                continue

            if size >= DIVIDER_SIZE_MIN:
                # Chapter/part divider (or back-matter section title like
                # "Glossary"/"Index"). Close out whatever document was open —
                # its content ends here — so nothing past this point leaks
                # into it, then keep scanning normally.
                if current_num is not None:
                    documents[current_num]["paragraphs"] = current_paras
                    documents[current_num]["end_page"] = pi
                    current_num = None
                    current_paras = []
                in_heading_run = False
                continue

            collapsed = re.sub(r'\s+', '', text).lower()
            m = HEADING_PATTERN.match(collapsed)
            is_heading_size = HEADING_SIZE_RANGE[0] <= size <= HEADING_SIZE_RANGE[1]

            if m and is_heading_size and int(m.group(1)) == expected:
                # New document starts here.
                if current_num is not None:
                    documents[current_num]["paragraphs"] = current_paras
                    documents[current_num]["end_page"] = pi
                current_num = expected
                current_paras = []
                current_start_page = pi
                documents[current_num] = {
                    "title": toc.get(current_num, f"Document {current_num}"),
                    "start_page": current_start_page,
                }
                expected += 1
                in_heading_run = True
                continue

            if in_heading_run and is_heading_size:
                continue  # wrapped second/third line of the same heading

            in_heading_run = False

            if current_num is None:
                continue  # front matter before document 1

            current_paras.append(text)

    if current_num is not None and "paragraphs" not in documents[current_num]:
        documents[current_num]["paragraphs"] = current_paras
        documents[current_num]["end_page"] = len(doc) - 1

    return documents


def slugify(title, maxlen=60):
    title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    title = re.sub(r"[^\w\s-]", "", title).strip().lower()
    title = re.sub(r"[\s_-]+", "-", title)
    return title[:maxlen].strip("-") or "untitled"


def main():
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "Enemy_Archives__2026-08-14_.pdf"
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "extracted_documents"
    os.makedirs(out_dir, exist_ok=True)

    print(f"Opening {pdf_path} ...")
    documents = extract_documents(pdf_path)
    print(f"Found {len(documents)} documents.")

    index = []
    for num in sorted(documents):
        d = documents[num]
        title = d["title"]
        body = "\n\n".join(d.get("paragraphs", []))
        fname = f"doc_{num:03d}_{slugify(title)}.txt"
        fpath = os.path.join(out_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(f"Document {num}: {title}\n")
            f.write("=" * 60 + "\n\n")
            f.write(body)
            f.write("\n")
        index.append({
            "number": num,
            "title": title,
            "filename": fname,
            "start_page_pdf_index": d["start_page"],
            "end_page_pdf_index": d.get("end_page"),
            "word_count": len(body.split()),
        })

    with open(os.path.join(out_dir, "_index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    missing = [n for n in range(1, max(documents) + 1) if n not in documents] if documents else []
    print(f"Wrote {len(index)} files to {out_dir}/")
    if missing:
        print(f"WARNING: gaps in numbering (not extracted): {missing}")


if __name__ == "__main__":
    main()
