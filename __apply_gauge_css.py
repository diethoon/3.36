from pathlib import Path

p = Path("Wayward_MOD_v3.36.html")
s = p.read_text(encoding="utf-8")

marker = '<style id="wayward-mobile-dialogue-fixed-v1">'
insert = """@media(max-width:1023px){
  .mobile-action-scroll > div > div.mb-3.space-y-1\\.5{
    position:sticky;
    top:0;
    z-index:25;
    margin-left:-.35rem !important;
    margin-right:-.35rem !important;
    padding:.25rem .35rem .35rem;
    background:rgb(28 25 23);
    border-bottom:1px solid rgba(68,64,60,.62);
  }
}
"""
if s.count(marker) != 1:
    raise SystemExit("style marker not found")
if ".mobile-action-scroll > div > div.mb-3.space-y-1\\.5" in s:
    raise SystemExit("patch already present")

s = s.replace(marker, insert + marker, 1)
p.write_text(s, encoding="utf-8")
print("CSS PATCH OK", len(s))
