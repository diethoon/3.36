import subprocess
from pathlib import Path

BASELINE = "43da5b22e91648f1c57e7e99d57da4a9f551dc73"

def rep(src: bytes, old: bytes, new: bytes, label: str) -> bytes:
    count = src.count(old)
    print(label, "COUNT", count)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, got {count}")
    return src.replace(old, new, 1)

data = subprocess.check_output(["git", "show", f"{BASELINE}:Wayward_MOD_v3.36.html"])

data = rep(data, b"function M36MobileStoreStatus(){", b"function M36MobileStoreStatus({showCustomerActions=false}={}){", "store signature")
data = rep(data, b'u.jsx(M36MobileRoomActivity,{room:playerLoc,canSee:!0})', b'u.jsx(M36MobileRoomActivity,{room:playerLoc,canSee:!0,showCustomerActions})', "store room call")

rc_start = b"function M36MobileRoomCustomer({customer:e,interaction:t,wife:o}){"
rc_end = b"function M36MobileRoomActivity({room:targetRoom,canSee:targetCanSee}={}){"
a = data.find(rc_start)
b = data.find(rc_end, a)
if a < 0 or b < 0 or b <= a:
    raise SystemExit("customer function boundary not found")
rc = data[a:b]
rc = rep(rc, rc_start, b"function M36MobileRoomCustomer({customer:e,interaction:t,wife:o,showActions:s}){", "customer signature")
rc = rep(rc, b"const ui=nI(),active=", b"const dispatch=re(x=>x.dispatch),ui=nI(),active=", "customer dispatch")

old_tail = """  ]})})
}
""".encode()
new_tail = """      s&&(e.status==="arrived"||e.status==="greeted"||e.status==="wants_more"||e.status==="ordered")&&u.jsxs("div",{className:"flex items-center gap-1 mt-0.5 min-w-0 w-full flex-wrap",onClick:ev=>ev.stopPropagation(),children:[!active&&!joined&&!crowd&&e.status==="arrived"&&u.jsx(E1,{compact:!0,label:"인사하기",onClick:()=>dispatch({type:"greet",customerId:e.id})}),!active&&!joined&&!crowd&&(e.status==="greeted"||e.status==="wants_more")&&u.jsx(E1,{compact:!0,label:"주문받기",onClick:()=>dispatch({type:"take_order",customerId:e.id})}),!active&&!joined&&!crowd&&e.status==="ordered"&&u.jsx(c3e,{compact:!0,customer:e,onServe:()=>dispatch({type:"serve",customerId:e.id}),onApologize:()=>dispatch({type:"apologize_out_of_stock",customerId:e.id})})]})
  ]})})
}
""".encode()
rc = rep(rc, old_tail, new_tail, "customer action row")
data = data[:a] + rc + data[b:]

ra_start = b"function M36MobileRoomActivity({room:targetRoom,canSee:targetCanSee}={}){"
ra_end = b"function M36MobileCurrentActivity(){"
a = data.find(ra_start)
b = data.find(ra_end, a)
if a < 0 or b < 0 or b <= a:
    raise SystemExit("room activity boundary not found")
ra = data[a:b]
ra = rep(ra, ra_start, b"function M36MobileRoomActivity({room:targetRoom,canSee:targetCanSee,showCustomerActions=false}={}){", "room activity signature")
ra = rep(ra, b'u.jsx(M36MobileRoomCustomer,{customer,interaction:activePatronInteraction,wife},customer.id)', b'u.jsx(M36MobileRoomCustomer,{customer,interaction:activePatronInteraction,wife,showActions:showCustomerActions},customer.id)', "room customer prop")
data = data[:a] + ra + data[b:]

data = rep(data, b"u.jsx(M36MobileStoreStatus,{})", b"u.jsx(M36MobileStoreStatus,{showCustomerActions:!n})", "right action-panel store call")
data = rep(
    data,
    b'children:[!y&&u.jsx("div",{className:"shrink-0 border-b border-stone-700",children:u.jsx(rI,{compact:!0})}),,u.jsxs("div",{className:"flex-1 min-h-0 overflow-y-auto p-2 text-[0.78rem]",children:[',
    b'children:[n&&u.jsx(M36MobileStoreStatus,{showCustomerActions:!0}),!y&&u.jsx("div",{className:"shrink-0 border-b border-stone-700",children:u.jsx(rI,{compact:!0})}),,u.jsxs("div",{className:"flex-1 min-h-0 overflow-y-auto p-2 text-[0.78rem]",children:[',
    "right main store insertion"
)

Path("Wayward_MOD_v3.36.html").write_bytes(data)
print("PATCH_BYTES", len(data))
