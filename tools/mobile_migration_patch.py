#!/usr/bin/env python3
from pathlib import Path
import os
import subprocess

SRC = Path("Wayward_MOD_v3.36.html")
TMP = SRC.with_suffix(".migration.tmp")
CHUNK = 64 * 1024
BT = bytes([96])
DL = bytes([36])

action_tail = DL + b'{n?"pl-[env(safe-area-inset-left)]":"pr-[env(safe-area-inset-right)]"}'
main_tail = DL + b'{n?"border-l border-stone-700":"border-r border-stone-700"}'

REPLACEMENTS = [
    (
        b'className:"lg:hidden flex-1 flex min-h-0"',
        b'className:"mobile-layout lg:hidden flex-1 min-h-0"',
    ),
    (
        b'className:' + BT + b'w-[37%] max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0 ' + action_tail + BT,
        b'className:' + BT + b'mobile-action-panel w-[37%] max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0 ' + action_tail + BT,
    ),
    (
        b'className:"flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]"',
        b'className:"mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]"',
    ),
    (
        b'className:' + BT + b'flex-1 min-w-0 flex flex-col min-h-0 ' + main_tail + BT,
        b'className:' + BT + b'mobile-main-panel flex-1 min-w-0 flex flex-col min-h-0 ' + main_tail + BT,
    ),
]

CSS = b"""<style id="wayward-mobile-migration-v1">
/* Studio mobile portrait layout migrated onto the v3.36 UI owners. */
@media (max-width:1023px) and (orientation:portrait) {
  .mobile-layout {
    display:grid !important;
    grid-template-columns:minmax(0,40%) minmax(0,60%) !important;
    grid-template-rows:minmax(0,1fr);
    flex-direction:initial !important;
  }
  .mobile-main-panel {
    grid-column:1 !important;
    grid-row:1 !important;
    width:100% !important;
    min-width:0 !important;
    min-height:0 !important;
    border-left:0 !important;
    border-right:1px solid rgba(120,113,108,.48) !important;
    overflow:hidden !important;
  }
  .mobile-action-panel {
    grid-column:2 !important;
    grid-row:1 !important;
    width:100% !important;
    max-width:none !important;
    min-width:0 !important;
    min-height:0 !important;
    flex:initial !important;
    overflow:hidden !important;
    border-top:0 !important;
    border-left:0 !important;
    border-right:0 !important;
    padding-left:max(.35rem,env(safe-area-inset-left)) !important;
    padding-right:max(.35rem,env(safe-area-inset-right)) !important;
    padding-bottom:max(.3rem,env(safe-area-inset-bottom)) !important;
  }
  .mobile-main-panel > .shrink-0 {
    flex:0 0 auto;
    min-height:0;
  }
  .mobile-main-panel > .flex-1 {
    min-height:0;
    overflow-y:auto;
  }
  .mobile-action-scroll {
    min-height:0;
    overflow-y:auto;
    overflow-x:hidden;
  }
}
@media (max-width:360px) and (orientation:portrait) {
  .mobile-layout { grid-template-columns:minmax(0,44%) minmax(0,56%) !important; }
}
@media (min-width:361px) and (max-width:1023px) and (orientation:portrait) {
  .mobile-layout { grid-template-columns:minmax(0,40%) minmax(0,60%) !important; }
}
@media (max-width:1023px) and (orientation:landscape) {
  .mobile-layout { display:flex !important; flex-direction:row !important; }
  .mobile-main-panel { flex:1 1 auto !important; min-width:0 !important; min-height:0 !important; }
  .mobile-action-panel {
    flex:0 0 min(37%,17rem) !important;
    width:min(37%,17rem) !important;
    max-width:17rem !important;
    min-width:min(12rem,37vw) !important;
    min-height:0 !important;
    overflow:hidden !important;
  }
  .mobile-action-scroll { overflow-y:auto !important; overflow-x:hidden !important; }
}
@media (max-width:1023px) {
  .mobile-main-panel > .shrink-0 { padding:.15rem .2rem 0 !important; }
  .mobile-main-panel > .flex-1 { padding:.05rem .2rem .2rem !important; }
  .mobile-action-scroll { padding-top:0 !important; padding-bottom:0 !important; }
}
</style>
"""

def count_bytes(needle: bytes) -> int:
    n = 0
    overlap = b""
    keep = max(0, len(needle) - 1)
    with SRC.open("rb") as f:
        while True:
            chunk = f.read(CHUNK)
            if not chunk:
                break
            data = overlap + chunk
            n += data.count(needle)
            overlap = data[-keep:] if keep else b""
    return n

def replace_streaming(replacements):
    max_len = max(len(old) for old, _ in replacements)
    carry = b""
    with SRC.open("rb") as src, TMP.open("wb") as dst:
        while True:
            chunk = src.read(CHUNK)
            if not chunk:
                break
            data = carry + chunk
            safe = max(0, len(data) - max_len + 1)
            emit, carry = data[:safe], data[safe:]
            for old, new in replacements:
                emit = emit.replace(old, new)
            dst.write(emit)
        emit = carry
        for old, new in replacements:
            emit = emit.replace(old, new)
        dst.write(emit)
    os.replace(TMP, SRC)

def extract_inline_scripts():
    out = Path("/tmp/wayward-inline")
    out.mkdir(parents=True, exist_ok=True)
    for p in out.glob("*.js"):
        p.unlink()
    files = []
    buf = b""
    in_script = False
    current = None
    idx = 0

    with SRC.open("rb") as f:
        while True:
            chunk = f.read(CHUNK)
            eof = not chunk
            buf += chunk
            while True:
                if not in_script:
                    a = buf.find(b"<script")
                    if a < 0:
                        if eof:
                            buf = b""
                        else:
                            buf = buf[-8192:]
                        break
                    b = buf.find(b">", a + 7)
                    if b < 0:
                        buf = buf[a:]
                        break
                    idx += 1
                    current = out / f"{idx}.js"
                    current.write_bytes(b"")
                    files.append(current)
                    buf = buf[b + 1:]
                    in_script = True
                else:
                    a = buf.find(b"</script>")
                    if a < 0:
                        if eof:
                            if current is not None:
                                with current.open("ab") as cf:
                                    cf.write(buf)
                            buf = b""
                            in_script = False
                        else:
                            keep = len(b"</script>") - 1
                            if current is not None and len(buf) > keep:
                                with current.open("ab") as cf:
                                    cf.write(buf[:-keep])
                                buf = buf[-keep:]
                        break
                    if current is not None:
                        with current.open("ab") as cf:
                            cf.write(buf[:a])
                    buf = buf[a + len(b"</script>"):]
                    in_script = False
                    current = None
            if eof:
                break

    return files

def main():
    if count_bytes(b"wayward-mobile-migration-v1") != 0:
        print("PATCH_ALREADY_PRESENT")
    else:
        for old, _ in REPLACEMENTS:
            c = count_bytes(old)
            print("TARGET_COUNT", c)
            if c != 1:
                raise SystemExit(f"PATCH_GUARD_FAILED target_count={c}")
        if count_bytes(b"</head>") != 1:
            raise SystemExit("PATCH_GUARD_FAILED </head>")
        replace_streaming(REPLACEMENTS + [(b"</head>", CSS + b"</head>")])
        print("PATCH_APPLIED")

    checks = {
        "marker": count_bytes(b"wayward-mobile-migration-v1"),
        "viewport": count_bytes(b"initial-scale=1.0"),
        "mobile_layout": count_bytes(b"mobile-layout"),
        "mobile_main": count_bytes(b"mobile-main-panel"),
        "mobile_action": count_bytes(b"mobile-action-panel"),
        "mobile_scroll": count_bytes(b"mobile-action-scroll"),
    }
    print("CHECKS", checks)
    assert checks["marker"] == 1
    assert checks["mobile_layout"] >= 1
    assert checks["mobile_main"] >= 1
    assert checks["mobile_action"] >= 1
    assert checks["mobile_scroll"] >= 1

    scripts = extract_inline_scripts()
    print("INLINE_SCRIPTS", len(scripts))
    for script in scripts:
        subprocess.run(["node", "--check", str(script)], check=True)
    print("NODE_CHECK=PASS")

if __name__ == "__main__":
    main()