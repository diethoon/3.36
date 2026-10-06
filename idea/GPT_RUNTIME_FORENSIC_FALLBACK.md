# GPT 워크플로 작동 불가 시 런타임 검증 방법

## 목적

ChatGPT가 저장소의 로컬 터미널/Codespace에 직접 들어가 런타임을 실행할 수 없는 상황에서도, GitHub Actions 러너를 임시 실행환경으로 사용하여 실제 저장소 코드를 실행하고 증거를 회수하기 위한 공통 방법이다.

핵심 흐름:

정확한 Git HEAD → GitHub Actions ephemeral runner → repository checkout → 실제 의존성 설치 → 실제 코드 실행 → 정적 검사/빌드/런타임 검증 → raw stdout/stderr/exitcode/evidence artifact → ROOT CAUSE 분석

이 방법은 ChatGPT가 대형 파일을 직접 읽거나 Codespace 터미널을 직접 조작할 필요가 없다는 장점이 있다.

## 1. 언제 사용하는가

- ChatGPT의 직접 터미널/로컬 실행이 불가능한 경우
- Codespace를 열었지만 ChatGPT에 Codespace terminal 권한이 없는 경우
- 수 MB\~수십 MB의 대형 파일 때문에 직접 파일 전달이 비효율적인 경우
- 실제 Node/Bun/TypeScript/Next/Vite 환경에서만 재현되는 문제
- 실제 빌드 결과가 필요한 경우
- Playwright 등 브라우저 런타임 검증이 필요한 경우
- 특정 Git HEAD를 정확히 고정하여 재현해야 하는 경우
- stdout/stderr/exitcode를 증거로 남겨야 하는 forensic 검증

## 2. 가장 중요한 원칙: 먼저 정확한 HEAD를 고정한다

런타임 검증 시작 전에 반드시 Repository, Branch, HEAD SHA, Working tree state, Node/Bun version, Dependency lockfile, Environment source를 기록한다.

예:

~~~bash
git rev-parse HEAD
git status --short
node --version
bun --version
~~~

검증 결과는 반드시 실행한 HEAD SHA와 함께 보존한다.

특히 fixture runtime, production runtime, local runtime, GitHub Actions runtime, Vercel Preview runtime, Vercel Production runtime은 서로 다른 환경으로 취급한다.

## 3. 임시 GitHub Actions workflow

가장 단순한 형태는 repository에 임시 workflow를 추가하고 workflow_dispatch로 수동 실행하는 것이다.

~~~yaml
name: Forensic Runtime Verification

on:
  workflow_dispatch:
    inputs:
      ref:
        description: Exact branch/tag/SHA to verify
        required: true
        type: string

jobs:
  runtime:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout exact target
        uses: actions/checkout@v4
        with:
          ref: ${{ inputs.ref }}
          fetch-depth: 0

      - name: Record environment
        run: |
          mkdir -p evidence
          git rev-parse HEAD | tee evidence/head.txt
          git status --short | tee evidence/git-status.txt
          node --version | tee evidence/node-version.txt
          npm --version | tee evidence/npm-version.txt

      - name: Install dependencies
        run: npm ci

      - name: Static verification
        run: |
          set -o pipefail
          npx tsc --noEmit 2>&1 | tee evidence/tsc.txt

      - name: Runtime verification
        run: |
          set +e
          npm run <actual-command> > evidence/stdout.txt 2> evidence/stderr.txt
          rc=$?
          echo "$rc" > evidence/exitcode.txt
          exit "$rc"

      - name: Upload forensic evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: forensic-runtime-evidence
          path: evidence/
~~~

실제 프로젝트의 package manager와 test command에 맞게 npm ci와 npm run 부분을 선택한다.

이 workflow 자체가 Production application code를 수정하는 것은 아니다.

## 4. 실패한 경우에도 증거를 남긴다

런타임 검증에서는 성공보다 실패 증거가 더 중요할 수 있다.

가능한 한 다음을 항상 수집한다:

~~~text
evidence/
├── head.txt
├── git-status.txt
├── node-version.txt
├── npm-version.txt
├── tsc.txt
├── stdout.txt
├── stderr.txt
├── exitcode.txt
└── MANIFEST.json
~~~

LLM/AI pipeline이면 추가한다:

~~~text
LLM1_RAW.json
LLM2_RAW.json
LLM3_RAW.json
LLM3_PARSE_RESULT.json
LLM3_SHAPE_VALIDATION.json
RELEASE_GATE_RESULT.json
~~~

에러 메시지만 저장하지 말고 raw input/output을 보존한다.

## 5. ROOT CAUSE FIRST

런타임에서 실패했다고 바로 코드를 수정하지 않는다.

반드시 다음 순서로 진행한다.

1. 정확한 HEAD 확인
2. 실제 실행 명령 확인
3. stdout 확보
4. stderr 확보
5. exitcode 확보
6. raw input/output 확보
7. 실패 함수/조건 특정
8. fixture와 production 분리
9. 환경 차이 확인
10. ROOT CAUSE 확정
11. 그 다음에만 패치

예를 들어 NARRATIVE_RELEASE_GATE_FAILED만 보고 패치하면 안 된다.

다음 경계를 실제 코드 조건으로 추적한다:

raw LLM response → JSON.parse → schema/shape validation → semantic validation → release gate → commit

## 6. LLM 런타임 검증에서는 raw response가 최우선이다

LLM 호출 문제가 의심될 경우 최소한 다음을 확보한다.

- request model
- response MIME type
- response schema
- raw response.text
- parsed JSON
- shape validation result
- semantic validation result
- release gate result

다음을 혼동하지 않는다.

LLM이 잘못된 JSON을 반환했다 ≠ 파서가 잘못 처리했다

shape validation 실패 ≠ semantic validation 실패 ≠ release-gate material mismatch

실패 경계를 실제 코드 조건으로 특정한 뒤에야 원인을 확정한다.

## 7. Fixture와 Production을 반드시 분리한다

테스트 코드가 LLM 응답을 mock하고 있다면 그것은 실제 LLM runtime evidence가 아니다.

production: Gemini SDK → 실제 response

fixture: fetch interceptor → predetermined response

둘은 별도의 증거로 기록한다.

특히 mock이 호출 횟수로 LLM1/LLM2/LLM3를 구분하거나, prompt 문자열을 parsing하거나, parsing 실패 시 빈 기본값을 사용하거나, 특정 JSON을 직접 생성하는 경우 실제 Production failure와 fixture failure를 동일시하면 안 된다.

## 8. 대형 파일은 통째로 ChatGPT에 가져오지 않는다

대형 파일을 다룰 때는 Actions 러너에서 처리한다.

좋은 방식:

원본 파일 → streaming read → target 문자열/범위 탐색 → 필요한 블록만 추출 → 검증/패치 → 전체 파일 보존

피해야 할 방식:

head + dd + cat + tail → 수동 재조립

수동 재조립은 줄바꿈, 경계, 인코딩, 누락 및 중복 위험이 있으므로 대형 파일 처리의 기본 방식으로 사용하지 않는다.

## 9. 패치가 필요한 경우에도 검증과 수정은 분리한다

조사 단계:

원본 HEAD → runtime → failure evidence → ROOT CAUSE

수정 단계:

ROOT CAUSE 확정 → 최소 수정 → tsc/lint/build → runtime regression → evidence → commit

원인 조사용 workflow에서 Production 코드를 임의로 수정하지 않는다.

## 10. 성공 시에만 commit하는 패치 workflow

패치가 명시적으로 승인된 경우:

checkout exact HEAD → patch → git diff 확인 → static check → build → runtime test → FAIL이면 commit 금지 → PASS이면 commit

가능하면 수정 workflow와 forensic workflow를 별도로 둔다.

## 11. 임시 workflow는 작업 종료 후 정리한다

Forensic workflow는 영구 Production infrastructure가 아니다.

검증 종료 후:

1. evidence artifact 보존
2. 결과 commit 기록
3. 필요하면 workflow 파일 삭제
4. 삭제 commit 기록
5. 최종 branch HEAD 확인

재사용 가치가 높은 경우에는 일회성 workflow가 아니라 공통 검증 workflow template으로 정리한다.

## 12. Secrets와 API key

GitHub Actions에서 실제 외부 API를 호출하는 경우 API key를 repository 파일에 기록하지 않는다.

GitHub Actions Secrets, Environment Secrets, Repository Variables를 사용한다.

로그에 API key, Authorization header, Bearer token, DATABASE URL credential, private connection string을 출력하지 않는다.

raw evidence에도 credential이 포함되지 않았는지 확인한 뒤 artifact를 보존한다.

## 13. 실제 VEIL에 적용할 때의 권장 evidence 구조

~~~text
report//
├── MANIFEST.json
├── ROOT_CAUSE_REPORT.md
├── ENVIRONMENT.json
├── GIT_HEAD.txt
├── stdout.txt
├── stderr.txt
├── exitcode.txt
├── RAW/
│ ├── LLM1_RAW.json
│ ├── LLM2_RAW.json
│ └── LLM3_RAW.json
├── PARSED/
│ └── LLM3_PARSE_RESULT.json
├── VALIDATION/
│ ├── LLM3_SHAPE_VALIDATION.json
│ └── RELEASE_GATE_RESULT.json
└── DIFF/
   └── production-vs-fixture.txt
~~~

MANIFEST에는 repository, branch, exact head, runtime, runner, result, code_modified, raw_evidence_captured를 최소 기록한다.

## 14. Actions 러너의 한계

이 방법도 만능은 아니다.

- Vercel Production과 완전히 동일한 runtime
- Vercel Preview의 실제 environment variables
- Upstash 등 외부 managed service의 실제 연결 상태
- 특정 지역/네트워크에서만 발생하는 문제
- 실제 browser/device 특성
- production-only secret/configuration

따라서 GitHub Actions PASS ≠ Vercel Production PASS이다.

Actions는 실제 코드 실행과 재현 가능한 forensic evidence 확보를 위한 별도 runtime으로 취급한다.

## 15. 최종 판단 규칙

런타임 증거가 부족하면 억지로 원인을 확정하지 않는다.

- 실패 함수 + 실패 조건 + raw evidence → ROOT CAUSE 확정 가능
- 실패 메시지만 존재 → ROOT CAUSE 미확정
- fixture와 production이 다름 → fixture 결과를 production 원인으로 사용 금지
- raw LLM output 없음 → LLM 출력 자체의 문제라고 확정 금지
- Actions PASS → 해당 Actions 환경에서만 PASS

VEIL의 기존 증거 우선순위:

actual code > runtime logs > Git diff/commit > tests/reports > spec interpretation > prior GPT claims

또한 UNKNOWN ≠ INVALID/DENY, fixture ≠ production, static PASS ≠ runtime PASS를 유지한다.

## 16. 구현자용 한 줄 지침

ChatGPT가 직접 런타임을 실행할 수 없으면, 정확한 Git HEAD를 고정한 GitHub Actions ephemeral runner에서 실제 코드를 실행하고 stdout/stderr/exitcode/raw response를 artifact로 회수한 뒤, 그 증거를 기준으로 ROOT CAUSE를 확정한다.

이 문서는 런타임 우회 방법 자체를 설명하는 문서이며, 특정 VEIL 문제의 원인을 미리 정하거나 특정 구현을 강제하는 명세가 아니다.

## 17. GitHub private repository를 직접 clone할 수 없을 때 — Vercel Sandbox 경로

ChatGPT가 Vercel Sandbox 터미널을 직접 사용할 수 있고 repository가 private인 경우, Sandbox에 GitHub PAT를 입력하는 것부터 시작하지 않는다.

권장 흐름:

GitHub connector(private repository read permission) → exact commit의 GitHub Contents API 조회 → 각 file의 일시적 signed download_url 확보 → Vercel Sandbox에서 signed URL을 curl로 직접 다운로드 → isolated working tree 구성 → dependency install → static check → runtime

PAT를 채팅, clone URL, 명령행 argument에 넣지 않는다.

### 17.1 Exact branch HEAD와 target historical HEAD를 분리 기록한다

검증 시작 시 branch가 이미 target commit보다 앞서 있을 수 있다. Requested branch HEAD와 forensic target SHA를 별도로 기록하고, target SHA의 tree를 별도 directory에 복원한다. Branch를 target SHA로 강제 이동시키지 않는다.

예:

- requested branch: work/veil-p0-lifecycle-reconstruction
- remote branch HEAD: fde3ddc...
- exact forensic target: 5877a4...

검증 보고서에는 두 SHA를 모두 보존한다.

### 17.2 Signed download_url은 source transport용으로만 사용한다

GitHub Contents API가 반환한 temporary raw download URL은 private repository 파일을 Sandbox로 전달하는 transport 수단으로 사용할 수 있다. 이 방식은 Git history 자체를 clone하는 것과 다르므로 local Git metadata가 없을 수 있음을 기록한다.

### 17.3 Sandbox 환경 차이는 isolated harness로만 보정한다

Package manager/runtime version, ESM extension resolution, host filesystem/symlink 특성, missing external service credentials, sandbox-only network behavior 등은 Production root cause로 바로 취급하지 않는다. Compatibility 보정은 forensic copy에만 적용한다.

### 17.4 외부 서비스가 필수인 test는 실제 연결과 harness 대체를 구분한다

Production 코드가 Upstash persistence를 강제하지만 Sandbox에 실제 credential이 없으면 local REST mock 같은 harness를 사용할 수 있다. 이 결과를 실제 Upstash PASS라고 표현하지 않는다.

### 17.5 LLM forensic instrumentation은 temporary copy에서만 한다

LLM pipeline을 추적할 때 temporary copy에만 다음 관측을 추가한다.

response.text → raw file → JSON.parse → parsed file → validate condition-by-condition → first failing condition

권장 산출물:

~~~text
LLM3_RAW_RESPONSE.json
LLM3_PARSE_RESULT.json
LLM3_SHAPE_DIAGNOSTIC.json
~~~

LLM3_RAW_RESPONSE.json은 설명이나 요약이 아니라 실제 runtime response.text 전체여야 한다.

### 17.6 Fixture-backed LLM output은 실제 provider output과 구분한다

fetch interceptor 또는 mock이 response를 직접 생성하는 테스트에서 raw response는 실제 provider 생성물이 아닐 수 있다. 따라서 runtime execution, transport source, raw capture, parse, shape validation, production causality를 각각 별도로 기록한다.

### 17.7 실행되지 않은 evidence는 만들지 않는다

사전 생성 PASS JSON, 다른 run에서 복사한 raw, 사후 생성된 fixture값, exitcode=1인데 PASS라고 적은 보고서는 evidence로 인정하지 않는다.

### 17.8 목표가 E2E PASS가 아니라 failure boundary proof인 경우

전체 E2E가 500 또는 exit 1로 종료되어도 다음이 모두 실제 실행 증거이면 forensic objective는 달성될 수 있다.

raw response exists → parse result exists → shape validator executed → first failing condition captured

E2E overall 결과와 forensic objective 결과는 별도로 판정한다.

### 17.9 실제 VEIL P0 검증에서 확인된 사항

Vercel Sandbox에서 exact target commit 5877a4...의 source tree를 GitHub connector signed URLs로 재구성하고 dependency normalization을 거친 뒤 TSC exit 0을 확인할 수 있었다. 이후 temporary forensic copy에서 실제 LLM3 response.text를 캡처하고 JSON.parse와 shape validator까지 실행하여 firstFailure=segments[0].text.nonEmpty를 증명했다. 이때 Sandbox에는 Production Upstash credential이 없었으므로 local REST persistence mock을 사용했고, 이 환경 차이는 별도 harness evidence로 기록했다.

이 사례를 통해 private repo 직접 clone이 막힌 상황에서도 GitHub connector → signed source transport → Vercel Sandbox terminal이라는 별도 경로로 mobile 환경에서 실제 runtime forensic을 수행할 수 있음을 확인했다.

## 18. 2026-10-06 실증에서 확인된 Vercel Sandbox 런타임 우회 운용 규칙

2026-10-06 실제 VEIL P0 Exact-HEAD forensic run에서 다음 경로가 동작했다.

~~~
ChatGPT
  ↓
Vercel MCP — matildavintagefilm@gmail.com
  ↓
Vercel Sandbox 생성
  ↓
GitHub connector로 exact historical SHA의 파일 내용 조회
  ↓
Sandbox isolated forensic copy에 파일 주입
  ↓
Bun/tsx 실제 실행
  ↓
command status + exit code
  ↓
stdout/stderr raw log 회수

~~~

이 경로는 private GitHub repository를 Vercel Sandbox의 Git clone으로 가져오는 것과 다르다.

### 18.1 마틸다 계정에서 확인된 핵심

Vercel account:

~~~text
matildavintagefilm@gmail.com
~~~

이 계정으로 Sandbox 생성은 성공했다.

Sandbox command도 team scope를 명시하지 않은 상태에서 정상 실행됐다.

따라서:

~~~text
Sandbox 생성 가능
≠
GitHub private repository clone 가능
~~~

두 경계는 별도로 확인해야 한다.

Git source 방식으로 private repository를 직접 clone하도록 Sandbox를 생성하는 방법은 실제로 git clone failed (exitCode 128)이 발생했다.

따라서 private GitHub repository에서는 Git clone 성공을 전제로 하지 말고, GitHub connector → exact SHA 파일 획득 → Sandbox forensic copy 방식을 기본 fallback으로 사용한다.

### 18.2 Exact historical SHA를 branch와 분리한다

검증 대상 branch가 exact target보다 앞서 있을 수 있다.

따라서 반드시 다음을 별도로 기록한다.

~~~text
requested branch:
work/veil-p0-lifecycle-reconstruction

current branch tip:
별도 기록

forensic target:
1ddd3320cf484395e923dc3cf70b4b4ed91c0177
~~~

Sandbox forensic copy에는 Git metadata가 없을 수 있다.

그 상태에서:

~~~text
git rev-parse HEAD
git branch --show-current
git status --short
~~~

를 실행하면 not a git repository가 나올 수 있다.

이것은 source가 틀렸다는 증거가 아니다.

단, 그 결과를 Exact-HEAD Git verification PASS로 기록해서도 안 된다.

정확한 SHA는 GitHub Contents/tree API의 ref와 각 파일 provenance로 증명하고, Git working tree verification은 별도 분류한다.

### 18.3 대량의 내용을 한 번에 넣지 않는다 — 중요

다음 형태를 피한다.

~~~text
GitHub file 수십~수백 개 조회
→ 하나의 functions.exec 안에서 모두 fetch
→ 거대한 tar/base64 생성
→ 한 번의 write_session_files
→ 한 번의 거대한 shell script 실행
~~~

이 방식은 다음 문제를 일으킬 수 있다.

1. connector nested tool-call 수 제한
2. Code Mode 전체 호출 한도 초과
3. 거대한 base64/tar payload에 대한 안전 검사 차단
4. 긴 shell script 또는 signed URL 묶음에 대한 안전 검사 차단
5. 한 파일 복원 실패가 전체 bundle 실패로 전파
6. source reconstruction failure와 runtime failure가 뒤섞임

실제 이번 작업에서는 자동 import graph를 한 번에 추적하려다 nested tool-call 한도를 초과했다.

또한 대량 source bundle과 긴 signed URL shell script는 안전 검사에서 차단되는 사례가 있었다.

### 18.4 권장 batch 크기

실전 기본값:

~~~text
1~5 files / write
~~~

조금 더 큰 bundle이 필요해도:

~~~text
5~15 files / batch
~~~

정도를 기본 한계로 둔다.

특히 서로 강하게 결합된 핵심 파일만 작은 batch로 넣고, 성공을 확인한 다음 다음 batch로 진행한다.

예:

~~~text
Batch A
  denyInventoryTest.ts
  denyInventory.ts
  playerInstructionContract.ts
  hash.ts

→ 실행
→ 결과 확인

Batch B
  lifecycleTransitionRegressionTest.ts
  worldRuleEvaluator.ts
  types.ts
  validator.ts
  actionApplier.ts

→ 실행
→ 누락 import 확인
→ 필요한 파일 추가
~~~

자동으로 전체 repository를 dependency graph로 수집하지 않는다.

### 18.5 signed download_url의 운용 규칙

GitHub Contents API가 반환하는 temporary signed download_url은 private source transport에 유용하다.

그러나 다음을 피한다.

~~~text
수십 개 signed URL
→ 하나의 거대한 shell command
→ 긴 heredoc/script
→ 한 번에 실행
~~~

안전 검사 또는 command payload 크기 제한에 걸릴 수 있다.

권장 방식:

~~~text
small source set
→ small transfer
→ verify
→ next source set
~~~

또한 signed URL을 보고서, Git commit, permanent document에 그대로 저장하지 않는다.

signed URL 자체는 temporary credential 성격을 가질 수 있으므로 raw URL은 evidence metadata에 영구 기록하지 않고 source path + SHA + transfer success만 기록한다.

PAT, Authorization header, Bearer token, Vercel credential은 동일하게 금지한다.

### 18.6 forensic copy와 source provenance를 동시에 남긴다

Sandbox에 파일을 주입할 때 최소한 다음을 기록한다.

~~~text
repository
path
exact ref/SHA
GitHub blob SHA
Sandbox path
transfer result
~~~

예:

~~~text
jhy1352/Test
src/engine/language/denyInventory.ts
1ddd3320cf484395e923dc3cf70b4b4ed91c0177
blob: 2f038b85...
→ /vercel/veil/src/engine/language/denyInventory.ts
→ transfer OK
~~~

이렇게 해야 local Git metadata가 없는 forensic copy도 원본과 연결할 수 있다.

### 18.7 package manager 파일은 임의로 축약하지 않는다

실제 runtime을 재현하려면 다음 파일을 가능한 한 exact SHA 그대로 복원한다.

~~~text
package.json
bun.lock
tsconfig.json
~~~

이번 실증에서 불완전한 forensic copy에 최소 package.json만 넣고 bun x tsc --noEmit를 실행했을 때, 실제 project compilation이 아니라 TypeScript help output이 반환되었다.

따라서:

~~~text
tsc command exit 0/1
≠
project compilation performed
~~~

tsconfig.json이 없으면 compiler invocation 자체가 project compilation을 수행했는지 별도로 확인한다.

### 18.8 실행 성공과 검증 대상 성공을 분리한다

이번 실증에서 Sandbox 명령 자체는 실제로 성공할 수 있었다.

~~~text
Sandbox command execution
→ exitCode 0
~~~

또는 독립 attack harness가:

~~~text
exitCode 0
~~~

로 끝날 수 있다.

그러나 이것은 VEIL 전체 Lifecycle PASS와 동일하지 않다.

예:

~~~text
attack harness executed successfully
+
attack assertions passed
+
separate lifecycle test exitCode 1
=
Runtime method SUCCESS
but target implementation RED
~~~

즉 report에는 최소한 다음을 분리한다.

~~~text
RUNTIME TRANSPORT:
GREEN

COMMAND EXECUTION:
GREEN

SPECIFIC TEST:
PASS / FAIL / UNKNOWN

OVERALL CONTRACT:
GREEN / YELLOW / RED / UNKNOWN
~~~

### 18.9 실제 2026-10-06 성공 사례

Exact target:

~~~text
1ddd3320cf484395e923dc3cf70b4b4ed91c0177
~~~

에 대해 마틸다 계정 Sandbox에서 실제 bun x tsx 실행이 가능했으며, independent lifecycle attack harness는 다음을 실제 stdout으로 남겼다.

~~~text
{
  "rootCause1_reselection": "PASS",
  "rootCause2_reattempted_matching_excluded": "PASS",
  "rootCause3_invalid_reattempt_transitions": "PASS",
  "repeatedDeny_newIdentity": "PASS",
  "repeatedDeny_futureRecovery": "PASS",
  "reattempted_resolution_path": "FAIL_REGRESSION"
}
~~~

동시에 실제 denyInventoryTest.ts는 exit code 1로 다음 failure를 재현했다.

~~~text
findResolvableDenyInventoryIds()
actual: []
expected: [inventoryId]
~~~

이는 런타임 우회 방법이 실제 실행까지 도달했음을 증명하지만, 대상 구현 자체가 전체 Lifecycle을 만족한다는 의미는 아니다.

### 18.10 현재 권장 표준 절차

향후 private repository exact-head runtime은 다음 순서로 수행한다.

~~~text
1. Repository / requested branch / exact historical SHA 기록
2. GitHub exact SHA tree 확인
3. Vercel Sandbox 생성
4. Sandbox 기본 command 1회 실행
5. 핵심 test + 핵심 implementation 파일만 small batch transfer
6. transfer 성공 확인
7. dependency 누락 확인
8. 필요한 파일만 다음 batch transfer
9. package.json / bun.lock / tsconfig.json exact 복원
10. bun x tsc --noEmit
11. 지정 runtime tests
12. independent attack harness
13. persistence / E2E / external service tests
14. 각 명령의 exit code/stdout/stderr 보존
15. PASS/FAIL/UNKNOWN 분리
16. ROOT CAUSE 확정 전 patch 금지
~~~

### 18.11 절대 피할 운용 패턴

~~~text
❌ 전체 repository를 한 번에 ChatGPT context로 가져오기
❌ 수십 개 connector fetch를 하나의 functions.exec에 몰아넣기
❌ 거대한 base64 payload를 한 번에 write_session_files
❌ 수십 개 signed URL을 한 shell command에 삽입
❌ source reconstruction 실패를 implementation failure로 판정
❌ forensic copy에서 git rev-parse 실패를 Exact-HEAD mismatch로 판정
❌ TypeScript help output을 compilation PASS로 판정
❌ Sandbox command exit 0만 보고 lifecycle PASS 선언
❌ 이전 run의 stdout/stderr를 현재 run evidence로 재사용
❌ signed URL / PAT / token을 permanent document에 보존
~~~

## 19. 구현/검증 담당자용 Vercel Sandbox 한 줄 지침

private repository exact-head runtime이 필요하면:

~~~text
작게 가져오고 → 바로 확인하고 → 필요한 것만 추가하고 → 실제 exit/stdout/stderr를 저장한다.
~~~

대량 전송보다 incremental forensic reconstruction을 우선한다.

이 문서는 런타임 우회 방법을 정의한다. 특정 lifecycle implementation을 PASS로 가정하지 않는다.
