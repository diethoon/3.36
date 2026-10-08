from pathlib import Path
p=Path("Wayward_MOD_v3.36.html")
s=p.read_text(encoding="utf-8")
repls={
    'label:"부탁하기"':'label:"부탁"',
    'label:"지배적"':'label:"지배"',
    'label:"기만적"':'label:"기만"',
    'label:"주인으로서 접대"':'label:"접대"',
    'label:"골드를 위해"':'label:"골드"',
    'label:"그녀의 호기심"':'label:"호기심"',
}
changed=0
for a,b in repls.items():
    n=s.count(a)
    if n:
        s=s.replace(a,b)
        changed+=n
print("LABEL_REPLACEMENTS",changed)
if changed < 6:
    raise SystemExit(f"Expected at least 6 label replacements, got {changed}")
p.write_text(s,encoding="utf-8")
