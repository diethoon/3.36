from pathlib import Path
import sys

path = Path("Wayward_MOD_v3.36.html")
text = path.read_text(encoding="utf-8")
marker = 'id="m36-responsive-ui-20261009"'

if marker in text:
    print("PATCH_ALREADY_PRESENT")
    raise SystemExit(0)

# Target the exact request-style selector component.
p3_start = text.find("function p3e(")
p3_end = text.find("function _3e(", p3_start + 1)
if p3_start < 0 or p3_end < 0:
    raise SystemExit("p3e/_3e anchors not found")
p3_block = text[p3_start:p3_end]
old_p = 'className:"mb-3 flex items-center gap-1.5"'
new_p = 'className:"m36-responsive-request mb-3 flex items-center gap-1.5"'
if p3_block.count(old_p) != 1:
    raise SystemExit(f"p3e anchor count={p3_block.count(old_p)}")
text = text[:p3_start] + p3_block.replace(old_p, new_p, 1) + text[p3_end:]

# Target the exact reason selector component.
r3_start = text.find("function _3e(")
if r3_start < 0:
    raise SystemExit("_3e anchor not found")
old_r = 'className:"mb-3 flex items-center gap-1.5 flex-wrap"'
new_r = 'className:"m36-responsive-reasons mb-3 flex items-center gap-1.5 flex-wrap"'
r3_tail = text[r3_start:]
if r3_tail.count(old_r) < 1:
    raise SystemExit("_3e class anchor not found")
text = text[:r3_start] + r3_tail.replace(old_r, new_r, 1)

css = r"""<style id="m36-responsive-ui-20261009">
@media (max-width:700px){
  .m36-responsive-request{
    display:flex!important;
    flex-wrap:nowrap!important;
    align-items:stretch!important;
    gap:4px!important;
    margin-bottom:8px!important;
  }
  .m36-responsive-request>button{
    flex:1 1 0!important;
    min-width:0!important;
    white-space:nowrap!important;
    padding:7px 5px!important;
    min-height:34px!important;
    line-height:1.1!important;
    font-size:clamp(.72rem,3.3vw,.84rem)!important;
  }
  .m36-responsive-reasons{
    display:flex!important;
    flex-wrap:wrap!important;
    align-items:center!important;
    gap:4px!important;
    margin-bottom:8px!important;
  }
  .m36-responsive-reasons>span{
    flex:0 0 auto!important;
    margin-right:2px!important;
    white-space:nowrap!important;
  }
  .m36-responsive-reasons>button{
    flex:0 1 auto!important;
    min-width:0!important;
    white-space:nowrap!important;
    padding:6px 8px!important;
    min-height:32px!important;
    line-height:1.1!important;
    font-size:clamp(.68rem,3vw,.8rem)!important;
  }
}
</style>
"""
head = text.find("</head>")
if head < 0:
    raise SystemExit("</head> not found")
text = text[:head] + css + "\n" + text[head:]
path.write_text(text, encoding="utf-8")
print("PATCH_APPLIED")
