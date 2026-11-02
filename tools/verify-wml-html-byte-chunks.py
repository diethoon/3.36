#!/usr/bin/env python3
"""Stream a pinned WML game HTML in 4096-byte chunks and emit auditable hash evidence."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

EXPECTED_SIZE = 6_742_653
EXPECTED_GIT_BLOB_SHA = "5019286cd14be6cb2546fea06b2d63fbc2b93157"
CHUNK_SIZE = 4096
ANCHORS = [
    "gameVersion:",
    "modData:",
    '"support"',
    ".toISOString",
    ".stringify",
    "state:",
]

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("html", nargs="?", default="Wayward_MOD_v4.0_WML_검수완료/Wayward_WML_ko.html")
    parser.add_argument("--out", default="artifacts/wml-html-scan")
    args = parser.parse_args()

    source = Path(args.html)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    actual_size = source.stat().st_size
    if actual_size != EXPECTED_SIZE:
        raise SystemExit(f"FAIL: expected {EXPECTED_SIZE} bytes, got {actual_size}: {source}")

    sha256 = hashlib.sha256()
    git_sha1 = hashlib.sha1()
    git_sha1.update(f"blob {actual_size}\0".encode("ascii"))
    counts = {needle: 0 for needle in ANCHORS}
    offsets = {needle: [] for needle in ANCHORS}
    seen = {needle: set() for needle in ANCHORS}
    chunk_count = 0
    offset = 0
    overlap = b""
    tsv_path = out / "chunks.tsv"

    with source.open("rb") as file, tsv_path.open("w", encoding="utf-8", newline="") as tsv:
        tsv.write("offset\tlength\tsha256\n")
        while True:
            chunk = file.read(CHUNK_SIZE)
            if not chunk:
                break
            chunk_count += 1
            sha256.update(chunk)
            git_sha1.update(chunk)
            tsv.write(f"{offset}\t{len(chunk)}\t{hashlib.sha256(chunk).hexdigest()}\n")

            window = overlap + chunk
            window_start = offset - len(overlap)
            for needle in ANCHORS:
                target = needle.encode("utf-8")
                start = 0
                while True:
                    index = window.find(target, start)
                    if index < 0:
                        break
                    absolute = window_start + index
                    if absolute not in seen[needle]:
                        seen[needle].add(absolute)
                        offsets[needle].append(absolute)
                        counts[needle] += 1
                    start = index + 1
            overlap = window[-(len(max(ANCHORS, key=len).encode("utf-8")) - 1):]
            offset += len(chunk)

    blob_sha = git_sha1.hexdigest()
    summary = {
        "file": str(source),
        "size_bytes": actual_size,
        "chunk_size_bytes": CHUNK_SIZE,
        "chunk_count": chunk_count,
        "sha256": sha256.hexdigest(),
        "git_blob_sha1": blob_sha,
        "expected_git_blob_sha1": EXPECTED_GIT_BLOB_SHA,
        "anchors": {needle: {"count": counts[needle], "first_offsets": offsets[needle][:20]} for needle in ANCHORS},
        "all_anchors_found": all(counts[needle] > 0 for needle in ANCHORS),
    }
    (out / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if blob_sha != EXPECTED_GIT_BLOB_SHA:
        raise SystemExit("FAIL: scanned HTML does not match the pinned Git blob SHA.")
    if not summary["all_anchors_found"]:
        missing = [needle for needle, count in counts.items() if count == 0]
        raise SystemExit("FAIL: required anchor(s) not found: " + ", ".join(missing))
    print(f"PASS: scanned EOF, {chunk_count} chunks; per-chunk SHA-256 evidence: {tsv_path}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
