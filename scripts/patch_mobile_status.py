from pathlib import Path
import shutil

P=Path("Wayward_MOD_v3.36.html")
CH=65536

def U(s):
    return s.encode("utf-8")

def replace_once(old,new,label):
    tmp=P.with_suffix(".tmp")
    carry=b""
    count=0
    with P.open("rb") as src, tmp.open("wb") as dst:
        while True:
            chunk=src.read(CH)
            if not chunk:
                break
            data=carry+chunk
            safe=max(0,len(data)-(len(old)-1))
            part,carry=data[:safe],data[safe:]
            count += part.count(old)
            dst.write(part.replace(old,new))
        count += carry.count(old)
        dst.write(carry.replace(old,new))
    if count!=1:
        tmp.unlink(missing_ok=True)
        raise SystemExit(f"{label}: expected 1, got {count}")
    shutil.move(tmp,P)
    print(label)

old=U('''  const gauges=[
    {key:"energy",label:"\uAE30\uB825",value:wifeEnergy,tone:Xl(wifeEnergy)},
    {key:"mood",label:"\uAE30\uBD84",value:wifeMood,tone:Xl(wifeMood)},
    {key:"trust",label:"\uC2E0\uB8B0\uB3C4",value:wifeTrust,tone:"bg-blue-400"},
    {key:"allure",label:"\uC8FC\uBAA9\uB3C4",value:wifeAllure,tone:"bg-purple-400"},
    {key:"arousal",label:"\uD765\uBD84\uB3C4",value:wifeArousal,tone:"bg-pink-400"}
  ];''')
new=U('''  const playerGauges=[
    {key:"player-energy",label:"\uAE30\uB825",value:playerEnergy,tone:Xl(playerEnergy)},
    ...(playerMana!==null?[{key:"player-mana",label:"\uB9C8\uB098",value:playerMana,tone:"bg-blue-400"}]:[])
  ];
  const gauges=[
    {key:"energy",label:"\uAE30\uB825",value:wifeEnergy,tone:Xl(wifeEnergy)},
    {key:"mood",label:"\uAE30\uBD84",value:wifeMood,tone:Xl(wifeMood)},
    {key:"trust",label:"\uC2E0\uB8B0\uB3C4",value:wifeTrust,tone:"bg-blue-400"},
    {key:"allure",label:"\uC8FC\uBAA9\uB3C4",value:wifeAllure,tone:"bg-purple-400"},
    {key:"arousal",label:"\uD765\uBD84\uB3C4",value:wifeArousal,tone:"bg-pink-400"}
  ];''')
replace_once(old,new,"player gauges")

old=U('''    u.jsxs("div",{className:"m36-mobile-store-status-line",children:[
      u.jsx("span",{className:"m36-mobile-store-label",children:"\uB2F9\uC2E0"}),
      u.jsx("span",{className:"m36-mobile-store-value",children:yOe(state)}),
      u.jsxs("span",{className:"m36-mobile-store-meta",children:[
        "\uAE30\uB825 ",playerEnergy,
        playerMana!==null?u.jsxs(u.Fragment,{children:[" \u00B7 \uB9C8\uB098 ",playerMana]}):null
      ]})
    ]}),''')
new=U('''    u.jsxs("div",{className:"m36-mobile-store-status-line",children:[
      u.jsx("span",{className:"m36-mobile-store-label",children:"\uB2F9\uC2E0"}),
      u.jsx("span",{className:"m36-mobile-store-value",children:yOe(state)})
    ]}),
    u.jsx("div",{className:"m36-mobile-store-gauges",children:playerGauges.map(bar=>u.jsxs("span",{className:"m36-mobile-store-gauge",children:[
      u.jsx("span",{className:"m36-mobile-store-gauge-label",children:bar.label}),
      u.jsx("span",{className:"m36-mobile-store-gauge-track",children:u.jsx("span",{className:"m36-mobile-store-gauge-fill "+bar.tone,style:{width:Math.max(0,Math.min(100,bar.value))+"%"}})})
    ]},bar.key))}),''')
replace_once(old,new,"player display")
