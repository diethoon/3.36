
# GPT Runtime Forensic / Bypass Protocol — Wayward 3.36

## 0. 목적과 적용 범위

이 문서는 diethoon/3.36 저장소에서 ChatGPT가 로컬 터미널을 직접 사용할 수 없거나 GitHub Actions/Vercel 연결 문제가 발생했을 때, 동일한 Exact HEAD를 실제 실행 환경에서 관찰하고 증거를 회수하기 위한 우회 표준이다.

현재 작업 기준:

- Repository: diethoon/3.36
- Working branch: mobile-migration-v1
- Main source: Wayward_MOD_v3.36.html
- 대형 파일은 통째로 읽지 않는다.
- 현재 모바일 작업은 UI/렌더링 범위만 수정하며 게임 로직을 임의로 변경하지 않는다.
- 현재 확인된 안전 기준점: 45e20c27069658147c885b5a08f0dd42d136f800
- 이 기준점 이후의 모바일 인물 위치 패치는 잘못되었으므로 같은 장소 묶음 표시를 보존해야 한다.

기본 원칙:

    Actual Code
    > Actual Runtime Evidence
    > Exact Git Diff / Commit
    > Static Tests / Reports
    > Spec Interpretation
    > Prior GPT Claims

또한 다음을 반드시 구분한다.

    Static PASS != Runtime PASS
    Deployment READY != Runtime PASS
    403 != Code Failure
    CI Failure != Production Code Failure
    UNKNOWN != RED
    UNKNOWN != INVALID
    UNKNOWN != DENY
    Fixture != Production

---

## 1. Exact HEAD를 먼저 고정한다

검증이나 패치 시작 전에 최소한 다음을 기록한다.

    Repository
    Branch
    Current HEAD SHA
    Forensic Target SHA
    Working-tree state
    Runtime version
    Package manager / lockfile
    Environment source

현재 작업에서는 다음을 별도로 기록한다.

    working branch:
    mobile-migration-v1

    known-good base:
    45e20c27069658147c885b5a08f0dd42d136f800

현재 branch HEAD와 검증/패치 기준 SHA가 다르면 두 값을 별도로 기록한다. 검증을 위해 branch를 강제로 이동시키지 않는다.

---

## 2. 증거 우선순위

문제 원인을 확정할 때 다음 순서를 지킨다.

    1. Exact source
    2. Actual runtime output / browser observation
    3. Git diff / commit
    4. Static checks / build / test report
    5. Specification interpretation
    6. Prior GPT statements

실패 메시지 하나만 보고 수정하지 않는다.

    실패 함수
    +
    실패 조건
    +
    실제 입력/출력
    +
    Exact HEAD

가 연결되어야 ROOT CAUSE를 확정한다.

---

## 3. 우회 경로 선택 순서

### 3-A. 2026-10-08 CURRENT — Render direct runtime을 Actions 장애 시 우선 사용

GitHub Actions가 정상 기동하지 않거나 `jobs=[]`, runner unavailable, connector UNKNOWN 상태가 반복되면 **Actions를 무한 재시도하지 않는다.**

실제 실행 증거가 필요한 경우 다음 순서로 전환한다.

    A. Render exact-commit direct runtime
            ↓
    B. Vercel existing project / exact deployment
            ↓
    C. Vercel Sandbox isolated runtime
            ↓
    D. GitHub Actions CI/forensic fallback
            ↓
    E. static/targeted forensic inspection only

Render가 연결되어 있고 실제 shell/service 실행이 가능한 경우, 이것을 **Production-code runtime evidence를 얻는 우선 우회 경로**로 취급한다.

Render 검증의 핵심은 특정 프로젝트명이나 다른 저장소에서 쓰던 환경변수 이름을 복사하는 것이 아니라 다음 원칙을 Wayward에 적용하는 것이다.

    Exact target SHA checkout
    → 실제 Render runtime/service의 checkout SHA 재확인
    → 실제 start/harness command를 같은 shell에서 직접 실행
    → stdout/stderr 원문 보존
    → process EXITCODE를 정확히 기록
    → 필요 시 실제 browser/page load + UI interaction 수행
    → runtime marker와 process exitcode를 별도 판정
    → Render deploy/service 상태도 별도 기록

중요:

    PORT는 Render가 제공하는 실제 PORT를 사용한다.
    Wayward에 존재하지 않는 VEIL_PORT 같은 외부 프로젝트 전용 변수는 도입하지 않는다.
    특정 LLM marker도 Wayward에 실제 존재하지 않으면 복사하지 않는다.
    필요한 secret은 Render 환경변수/secret manager에만 두고 로그나 evidence에 값 자체를 남기지 않는다.

### 3-B. Actions 장애 전환 규칙

Actions가 다음 상태면 코드 실패로 단정하지 않는다.

    jobs=[]
    workflow not started
    runner unavailable
    logs unavailable
    connector UNKNOWN

이 경우:

    CI execution infrastructure = UNKNOWN

으로 기록하고 Render direct runtime으로 전환한다.

단, Actions가 실제 job을 실행하고 raw log + exitcode가 확보되면 그 결과는 CI evidence로 사용할 수 있다. CI 결과와 Production Runtime 결과는 서로 대체하지 않는다.

<!--
LEGACY / OBSOLETE — 2026-10-08
이전 문서의 Actions-first / Vercel-first 우선순위는 더 이상 기본값이 아니다.
기존 절차는 역사적 호환성과 fallback 참고용으로만 보존한다.
-->

기존 우선순위:

    A. GitHub Actions exact-head runtime
            ↓
    B. Vercel existing project / exact deployment
            ↓
    C. Vercel Sandbox isolated runtime
            ↓
    D. static/targeted forensic inspection only

이미 존재하는 검증 가능한 Vercel project/deployment가 없는데 단지 테스트를 위해 새 project/deployment를 만드는 것은 기본 우회 방법으로 사용하지 않는다.

---

## 3-C. Render direct runtime 운영 규칙 — Wayward 전용

Render를 사용할 때는 다음을 evidence의 최소 단위로 취급한다.

    requested target SHA
    runtime checkout SHA
    runtime command
    process EXITCODE
    runtime PASS marker (실제로 존재하는 경우에만)
    raw stdout
    raw stderr
    Render service/deploy state

판정 규칙:

    requested target SHA != runtime checkout SHA
        → exact-head runtime evidence 불인정

    process EXITCODE != 0
        → process failure로 기록하되 ROOT CAUSE는 별도 조사

    process EXITCODE == 0
        → process PASS일 뿐 UI/runtime PASS가 아님

    runtime marker PASS
        → 해당 marker가 실제 Wayward runtime에서 생성되었을 때만 인정

    Render deploy READY
        → deployment state일 뿐 application runtime PASS가 아님

secret 값은 환경변수에 주입하되 stdout/stderr/evidence/commit에는 기록하지 않는다.

---

## 4. GitHub Actions — CI/Forensic Fallback (기본 Production Runtime 아님)

<!--
LEGACY / OBSOLETE — 2026-10-08
기존 제목의 "기본 runtime 우회" 표현은 폐기한다.
Actions는 실제 job이 정상 실행될 때의 CI/forensic evidence 경로이며,
Actions가 죽었을 때는 Render direct runtime으로 전환한다.
-->

### 4.1 일반적인 경우

정확한 SHA를 checkout하는 임시 workflow를 사용한다.

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
          - uses: actions/checkout@v4
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

          - name: Runtime verification
            run: |
              set +e
              <actual command> > evidence/stdout.txt 2> evidence/stderr.txt
              rc=$?
              echo "$rc" > evidence/exitcode.txt
              exit "$rc"

          - name: Upload evidence
            if: always()
            uses: actions/upload-artifact@v4
            with:
              name: forensic-runtime-evidence
              path: evidence/

프로젝트에 실제 build/test command가 존재하는 경우 그 명령만 사용한다. 없는 명령을 임의로 만들지 않는다.

### 4.2 workflow_dispatch가 연결 환경에서 실행되지 않을 때

GitHub connector가 workflow dispatch를 직접 제공하지 않거나 실행 결과를 안정적으로 받을 수 없는 경우:

    임시 workflow를 base branch에 준비
    → temporary PR 생성
    → pull_request workflow 실행
    → artifact 회수
    → 결과 확인
    → temporary workflow/PR/branch 정리

이 저장소에서는 2026-10-07 실제로 PR-triggered temporary workflow가 성공적으로 실행되고 artifact를 회수하는 경로가 검증되었다.

따라서 단순 push-trigger만 반복해서 시도하지 않는다.

### 4.3 Actions 실행 실패의 의미

다음은 코드 실패로 단정하지 않는다.

    runner unavailable
    workflow not started
    jobs=[]
    logs unavailable
    connector UNKNOWN

이 경우:

    CI execution infrastructure = UNKNOWN

으로 기록한다.

기본 전환:

    Actions 장애
    → Render exact-commit direct runtime
    → 실제 runtime evidence 확보
    → 필요하면 Vercel/Sandbox로 보조 검증

Actions가 실제로 실행되었다면 다음을 별도로 보존한다.

    1. Harness process EXITCODE
    2. Runtime PASS marker
    3. Render/Preview/Deployment service state

**세 값이 모두 같은 의미가 아니다.**

특히 실행 명령은 외부 kill/timeout wrapper가 최종 종료코드를 바꾸는 방식으로 감싸지 않는다. 반드시 같은 shell에서 직접 실행하고:

    set +e
    <actual command> > evidence/stdout.txt 2> evidence/stderr.txt
    rc=$?
    echo "$rc" > evidence/exitcode.txt
    exit "$rc"

형태로 process exitcode를 보존한다.

0이 기록되었다고 해서 UI/runtime PASS로 단정하지 않는다. 반대로 runtime marker가 없다고 해서 process exitcode만 보고 즉시 code failure로 단정하지 않는다.

---

## 5. Vercel direct lookup — 403이 발생했을 때

Vercel 연결이 있는 경우 동일 요청을 반복하지 않고 다음 순서로 확인한다.

### 5.1 Project 직접 조회

가능하면:

    get_project(projectId or projectName)

을 먼저 시도한다.

    get_git_deployment_context
    list_projects

가 빈 결과를 반환해도 프로젝트 부재로 단정하지 않는다.

    list_projects=[]
    !=
    project does not exist

직접 project lookup과 deployment lookup이 우선이다.

### 5.2 Exact Deployment 직접 조회

정확한 deployment ID 또는 hostname을 확보했으면:

    get_deployment(idOrUrl = exact deployment)

으로 다음을 확인한다.

    deployment ID
    state
    branch/ref
    githubCommitSha
    githubCommitRef
    alias / URL

Exact SHA는 deployment metadata에서 다시 교차검증한다.

### 5.3 Vercel 403의 의미

다음만으로는 code failure가 아니다.

    403 Forbidden
    Not authorized
    Trying to access resource under scope ...

가능한 원인은 connector team scope 또는 deployment protection이다.

따라서:

    403
    → direct project lookup
    → exact deployment lookup
    → protection/access path 확인

순으로 진행한다.

---

## 6. Protected Preview / SSO 우회

우선순위는 Vercel 공식 보호 우회 방식에 맞춘다.

### 6.1 HTTP 요청

Vercel CLI를 사용할 수 있는 실행 환경이면:

    vc curl https://<exact-preview-host>/

을 우선한다.

vc curl은 보호된 Preview/Production에 대한 Vercel 인증 경로를 사용한다.

### 6.2 Browser automation

Origin-scoped request header를 지원하는 browser runtime이라면:

    x-vercel-trusted-oidc-idp-token: <short-lived token>

을 사용한다.

token은 출력, 저장, repository 기록, 문서 기록을 하지 않는다.

### 6.3 Connector-only 환경의 temporary bypass

현재 GPT 실행 환경에서 vc curl 또는 OIDC 토큰 경로를 직접 사용할 수 없고 protected URL이 필요한 경우에만:

    get_access_to_vercel_url
    patch_url_protection_bypass

같은 해당 deployment/alias 전용 temporary access 경로를 사용한다.

금지:

    전역 Deployment Protection disable
    Production 전체 보호 해제
    프로젝트 전체 SSO disable
    영구 bypass secret 저장

temporary access는 검증 종료 후 revoke한다.

---

## 7. Vercel Sandbox — CI/Connector가 막힌 경우의 실제 runtime

Vercel에 이미 존재하는 project가 있고 Sandbox 생성 권한이 있다면 disposable Sandbox를 runtime probe로 사용한다.

권장 기본값:

    runtime: node24
    architecture: amd64
    vcpus: 2
    memory: 4096 MB
    region: icn1
    networkPolicy: allow-all
    persistent: false

환경에 따라 실제 지원되는 설정을 사용한다.

Sandbox의 목적은:

    실제 source/runtime 실행
    stdout/stderr/exitcode 확보
    Preview/HTTP 요청

이며 Production infrastructure를 변경하는 것이 아니다.

기존 project가 없는 경우 테스트만을 위해 새 project를 만드는 것을 기본 절차로 삼지 않는다.

---

## 8. Protected Preview를 Sandbox에서 직접 관찰하는 방법

temporary shareable access가 생성되고 Sandbox에서 네트워크 접근이 가능하면:

    Preview URL
    → 첫 요청
    → access/bypass cookie 또는 인증 경로 확인
    → same authenticated request 재전송
    → HTTP status / headers / body 확보

를 사용한다.

temporary credential이 응답으로 내려오는 경우에도 실행 중 필요한 범위에서만 사용하고 즉시 폐기한다.

영구 문서, commit, log, artifact에 secret 또는 JWT 원문을 저장하지 않는다.

---

## 9. Preview root와 application route를 구분한다

Preview가 HTTP 200을 반환했다고 application test가 통과한 것이 아니다.

최소한 다음 경계를 구분한다.

    Preview root
    → application bundle
    → application route
    → API route
    → request validation
    → business logic

잘못된 요청으로 HTTP 400이 나왔다면:

    HTTP 400
    !=
    application crash

일 수 있다.

실제 client/request schema를 확인한 뒤 정상 요청을 구성한다.

---

## 10. Vercel Runtime Artifact가 정적 파일로 노출되는 경우

fixture 또는 forensic build가 runtime evidence를 preview path에 남기도록 설계되어 있다면 직접 회수할 수 있다.

예:

    /fixture-runtime.log
    /fixture-exitcode
    /fixture-head

이때 중요한 세 개를 함께 본다.

    fixture-head
    fixture-exitcode
    raw runtime log

READY 상태만으로 PASS 판정하지 않는다.

---

## 11. Exact HEAD 교차검증

Runtime evidence에는 다음이 함께 있어야 한다.

    deployment SHA
    runtime HEAD
    fixture HEAD
    requested target SHA

검증 경계는:

    GitHub target SHA
            ↓
    Vercel deployment githubCommitSha
            ↓
    runtime artifact head

이다.

세 값이 일치하지 않으면 해당 runtime을 현재 코드의 exact-head evidence로 사용하지 않는다.

---

## 12. Vercel Sandbox에서 private GitHub repository를 가져오는 방법

Private repository를 Sandbox에서 직접 clone하다 인증 실패하면:

    git clone failed

는 repository 부재의 증거가 아니다.

대체 경로:

    GitHub connector
    → exact SHA의 file/tree 조회
    → temporary signed download URL
    → small batch transfer
    → Sandbox forensic copy
    → runtime

PAT를 clone URL이나 command argument에 넣지 않는다.

---

## 12-A. GitHub 직접 쓰기 경로 — 현재 연결에서 검증 완료

현재 연결된 GitHub 도구는 읽기 전용이 아니다. 다음 쓰기 API가 실제로 동작하는 것이 확인되었다.

    create_branch
    create_blob
    create_tree
    create_commit
    update_ref
    create_file / update_file

특히 대형 파일 작업에서는 

    external runtime에서 전체 파일 materialize
    → targeted split / patch
    → static/runtime validation
    → create_blob
    → create_tree(base_tree + replaced blob)
    → create_commit(parent = exact target HEAD)
    → update_ref(expected_sha = target HEAD)

순서의 low-level Git object 경로를 우선 사용한다.

2026-10-08 실제 검증:

    repository: diethoon/3.36
    branch: mobile-migration-v1
    starting HEAD: a1004ff700496c437d39d5f7dc4703fdeee4ab34
    blob creation: PASS
    tree creation: PASS
    commit creation: PASS
    update_ref: PASS
    force-with-lease style expected_sha check: PASS
    final branch HEAD: a1004ff700496c437d39d5f7dc4703fdeee4ab34

검증용 commit은 branch에 남기지 않고 즉시 원래 HEAD로 되돌렸다. 따라서 위 검증은 작업 브랜치의 소스 상태를 변경하지 않았다.

중요:

    GitHub connector가 대형 기존 blob 전체를 효율적으로 반환하지 못해도
    GitHub 쓰기 권한 자체를 포기할 이유는 없다.

    대형 파일의 '내용 가공'과 GitHub의 '최종 반영'을 분리한다.

또한 인증 계정은 다른 GPT/사용자 세션과 다를 수 있다. 계정명이 다르다는 사실만으로 쓰기 가능 여부를 추정하지 않는다. 반드시 현재 연결에서 get_repo permissions 또는 실제 low-level write probe로 확인한다.

---

## 12-B. 대형 단일 HTML 수정 — Render direct runtime 우선

19MB급 단일 HTML은 GitHub connector의 fetch_file/context 경로로 통째로 읽지 않는다. **파일 바이트를 직접 다룰 수 있는 외부 실행환경**을 사용한다.

2026-10-08 현재 실제 runtime 검증 우선순위:

    A. 이미 연결된 Render Web Service / shell / direct runtime
            ↓
    B. 기존 Vercel project / exact deployment
            ↓
    C. Vercel Sandbox / 동등한 disposable sandbox
            ↓
    D. GitHub Actions runner
            ↓
    E. targeted static forensic only

<!--
LEGACY / OBSOLETE — 2026-10-08
과거의 "Vercel Sandbox / 동등한 disposable sandbox" 우선순위는
Actions 장애 대응용 기본값이 아니다.
Render direct runtime이 가능한 경우 Render를 먼저 사용한다.
-->

Render는 여기서 단순 배포 상태 확인용이 아니라:

    exact source checkout
    → split/targeted forensic
    → patch
    → node --check / diff --check
    → 실제 server/process runtime
    → 실제 page load / UI interaction

까지 수행할 수 있는 외부 실행환경으로 취급한다.


### 12-B-1. Exact source 확보

반드시:

    repository
    branch/ref
    exact source SHA
    file blob SHA

를 먼저 고정한다.

외부 실행환경에서 가능한 경우:

    git clone --filter=blob:none ...
    git fetch origin <exact-sha>
    git checkout --detach <exact-sha>
    또는 public raw URL에서 정확한 SHA의 파일을 다운로드

을 사용한다.

private repo에서는 PAT를 command line이나 clone URL에 삽입하지 않는다. 가능하면 연결된 GitHub provider 또는 short-lived/sandbox-native credential을 사용하고, credential은 로그/파일/commit에 남기지 않는다.

### 12-B-2. 전체 파일을 context로 올리지 않는다

외부 실행환경에서만 전체 바이트를 보관하고:

    grep -n
    rg
    sed
    awk
    split
    head / tail
    Python streaming read

등으로 필요한 함수/selector/EOF만 확인한다.

특히 함수 패치는:

    target anchor count == 1
    → 주변 chunk 추출
    → exact old block 확인
    → 최소 치환

순으로 한다.

### 12-B-3. 패치 후 최소 검증

적어도:

    node --check <extracted-js-or-script>
    git diff --check
    changed-file count / name 확인
    target anchor count 재확인

을 실행한다.

브라우저/runtime이 필요한 UI 작업이면 외부 Sandbox/Render에서 실제 page load와 필요한 interaction까지 수행한다.

### 12-B-4. 성공한 대형 파일을 GitHub에 반영

외부 실행환경에서 최종 HTML이 완성되면 GitHub connector가 파일 전체를 다시 읽어 수정하는 방식으로 돌아가지 않는다.

대신:

    final HTML bytes
    → create_blob
    → current exact commit의 base tree 확인
    → 동일 path의 tree entry만 새 blob SHA로 교체
    → create_commit
    → update_ref(expected_sha = 작업 시작 시 HEAD)

를 사용한다.

대용량 문자열을 tool payload가 거부할 경우에는 GitHub Actions/외부 sandbox에서 최종 blob을 생성하는 경로로 전환하고, connector에는 최종 Git object/ref 조작만 맡긴다. 이미 존재하는 대형 blob을 context에 재로딩하여 patch하는 방식은 사용하지 않는다.

### 12-C. 2026-10-08 실증 결과 — 대형 HTML materialize 경로와 인증 경계

2026-10-08 현재 다음은 실제로 확인되었다.

### 12-C-1. Vercel Sandbox 생성 경로

기존 팀-scoped project에서 Sandbox 생성은 다음 오류가 발생할 수 있다.

    403 Not authorized: scope "hoon-ead4"

반복해서 같은 team scope를 호출하지 않는다.

실증에서 성공한 생성 순서는:

    Vercel project를 별도 temporary project로 생성
    → create_sandboxes_v3
    → teamId/slug를 명시하지 않음
    → public Git source 또는 raw SHA source
    → region=icn1
    → runtime node22
    → vcpus=2 / memory=4096
    → networkPolicy=allow-all
    → persistent=false

이 방식으로 Sandbox 자체 생성은 실제 성공했다.

### 12-C-2. 19.6MB HTML materialize

GitHub connector의 fetch_file은 대형 HTML에 대해 올바른 blob SHA/size를 반환하지만 content가 비어 있을 수 있다. 이것은 파일이 비어 있다는 뜻이 아니라 connector의 대형 응답 제한이다.

대신 Sandbox 안에서 exact SHA의 public raw URL을 직접 받아온다.

    https://raw.githubusercontent.com/diethoon/3.36/<EXACT_SHA>/Wayward_MOD_v3.36.html

2026-10-08 실제 확인:

    size = 19589636 bytes
    sha256 = d766c98dab757f2d39d5e1397e3eaa2d90d02afecc994cdf25ed8a99218477f0

즉:

    GitHub connector(context)
    X 19.6MB 전체 fetch

    Sandbox network
    O exact SHA raw download

으로 분리해야 한다.

### 12-C-3. Sandbox에서 실제 포렌식 가능

Exact source를 Sandbox로 가져온 후 다음 검증이 실제 성공했다.

    function M36MobileStoreStatus 위치 추출
    wifeLoc=re(d=>be(d.state)) count=1
    wifeLoc!==playerLoc count=1
    wifeRoomCount= count=1
    label:"인사하기" count=1
    label:"주문받기" count=1
    type:"serve",customerId:e.id count=1

따라서 대형 파일 materialize/targeted read/patch/node --check 자체는 Sandbox 경로로 처리할 수 있다.

### 12-C-4. Vercel build runtime을 GitHub writer로 사용하지 않는다

기존 wayward Vercel project에서 확인된 GITHUB_TOKEN은 민감형 환경변수였지만 Vercel build에서 GitHub API 호출 시 HTTP 401이 실제 발생했다. 또한 build workspace에 .git이 존재하는 것은 확인됐지만 usable origin push credential은 확인되지 않았다.

따라서:

    Vercel project secret GITHUB_TOKEN
    !=
    현재 유효한 GitHub write credential

으로 취급한다.

이 secret을 decrypt하거나 출력하거나 문서에 기록하지 않는다.

### 12-C-5. GitHub Actions 판정

2026-10-07 과거에 동일 저장소에서 Temporary M36 Mobile Patch run 37580731162가 실제 SUCCESS한 증거가 있다. 그러나 2026-10-08 현재 일부 임시 workflow는 jobs=[]/infrastructure failure로 종료되었다.

따라서 Actions는:

    실제 run + job success가 확인되면 사용
    jobs=[] / runner unavailable이면 UNKNOWN으로 판정하고 반복 재시도하지 않음

으로 한다.

### 12-C-6. 최종 반영에 필요한 조건

대형 파일을 외부 runtime에서 성공적으로 가공한 뒤 최종 branch에 반영하려면 그 runtime에 유효한 GitHub write credential이 있어야 한다.

권장 순서:

    외부 remote workspace
    → exact SHA materialize
    → targeted patch
    → node --check / diff --check
    → valid GitHub credential 확인
    → git push 또는 GitHub blob → tree → commit → ref

PAT/SSH private key를 ChatGPT 대화에 붙여넣지 않는다.

현재 검증되지 않은 것은:

    Vercel build runtime 자체가 GitHub writer가 되는 것

이고,

    GitHub-connected remote workspace에서 exact large file을 patch하고 push하는 것

이 최종 대형-file 성공 경로의 남은 증명 대상이다.

### 12-C-8. 2026-10-08 GitHub large-blob direct patch success

2026-10-08 실제 성공한 대형 HTML 최종 반영 경로:

    Exact branch HEAD 고정
    → GitHub fetch_blob로 19MB급 blob을 tool runtime 내부에 materialize
    → 모델 context에는 전체 파일을 출력하지 않음
    → exact target anchor count == 1 확인
    → in-memory 최소 치환
    → 기존 action/renderer anchor 보존 확인
    → Vercel Sandbox에서 실제 containing script 추출
    → node --check
    → GitHub create_blob로 수정 blob 생성
    → create_blob 응답이 h2/protocol error로 끊겨도 서버 생성 여부를 blob SHA로 검증
    → base tree의 동일 path만 새 blob SHA로 교체
    → create_commit(parent = 정확한 시작 HEAD)
    → update_ref(expected_sha = 시작 HEAD)
    → 최종 branch HEAD와 새 blob 내용 재검증

이번 작업에서 실제 수정 blob:
    
    3c2c7e17717e38935be541893c34f53dd686c21c

수정 후 파일 크기:

    19,589,615 bytes

검증 결과:

    function M36MobileStoreStatus = 1
    wifeLoc=re(d=>be(d.state)) = 1
    wifeLoc!==playerLoc = 0
    wifeRoomCount = 1
    function M36MobileRoomCustomer = 1
    label:"인사하기" = 1
    label:"주문받기" = 1
    type:"serve",customerId:e.id = 1
    node --check = PASS

주의사항:

    - 19MB 파일 전체를 ChatGPT context에 출력하지 않는다.
    - GitHub fetch_file의 empty content와 fetch_blob의 실제 blob materialize는 구분한다.
    - create_blob의 대형 payload는 응답이 protocol error로 끊겨도 서버 쪽 object 생성이 완료될 수 있다.
    - 같은 대형 create_blob을 무조건 재전송하지 말고 먼저 예상 Git blob SHA를 계산하여 fetch_blob으로 존재/내용을 검증한다.
    - 최종 tree는 변경 파일의 blob만 교체하고 나머지는 base tree를 그대로 사용한다.
    - update_ref에는 expected_sha를 지정하여 다른 작업자의 변경을 덮어쓰지 않는다.
    - GitHub Actions가 jobs=[]인 경우 이 direct Git-data 경로로 즉시 전환할 수 있다.
    - DigitalOcean 같은 유료 remote workspace는 필요하지 않다.

### 12-C-7. 현재 clean state

2026-10-08 실험 후 임시 patch runner/스크립트를 모두 작업 브랜치에서 제거하고 mobile-migration-v1을:

    d658b0acaa464b715ac801f51b469967d20a5a2c

로 복구했다.

실패한 Vercel deployment나 temporary project는 source branch의 코드와 별개다. Production source에 임시 runner를 남기지 않는다.

---

## 12-B-5. 성공 여부 판정

최종 반영 후 반드시:

    branch HEAD == newly created commit
    commit parent == expected starting HEAD
    target path points to new blob
    runtime validation target SHA == final commit SHA

를 확인한다.

실패하면 update_ref를 반복해서 덮어쓰지 않는다. 현재 branch HEAD를 다시 읽고 expected_sha를 갱신한 뒤 원인을 확인한다.

---

## 13. Large HTML forensic 규칙 — Wayward 3.36 핵심

현재:

    Wayward_MOD_v3.36.html

은 매우 큰 single-file HTML이므로 전체 파일을 ChatGPT context로 가져오지 않는다.

기본 흐름:

    Exact SHA
    → streaming/split analysis
    → target string search
    → 주변 블록 추출
    → 필요한 함수/selector만 수정
    → node --check / diff --check

피해야 할 방식:

    전체 HTML fetch
    → 전체 내용을 context에 적재
    → 수동 편집

특히 EOF/포렌식 검증에서는 target function과 마지막 부분을 별도로 읽는다.

---

## 14. 동일 장소 표시 등 기존 게임/UI 논리는 먼저 원본과 비교한다

모바일 UI 수정에서 기존 로직이 이미 요구사항을 만족한다면 새 로직으로 대체하지 않는다.

현재 작업의 사례:

    wifeLoc !== playerLoc

조건은 같은 장소일 때 아내의 장소를 별도로 추가하지 않기 위한 기존 논리였다.

이를 무조건 표시로 바꾸면:

    같은 장소
    →
    장소 중복

이 발생한다.

따라서:

    원본/직전 정상 commit 대조
    → 기존 조건 보존
    → 실제 부족한 부분만 수정

을 우선한다.

---

## 15. 현재 모바일 인물 블럭 조사 기준

현재 사용자 요구에서 다음은 독립 요구사항으로 취급한다.

### 15.1 손님 여러 명

손님이 여러 명이면:

    각 손님 이름이 정상적으로 보임
    다른 손님 이름과 겹치지 않음
    2열로 찌그러져 의미가 바뀌지 않음
    이름만 남고 나머지 정보가 무조건 사라지지 않음

을 확인한다.

### 15.2 손님 작업 선택

왼쪽 기존 가게 탭에서 이미 동작하는 작업을 모바일 인물 블럭에서도 필요한 범위만 복구한다.

현재 확인 대상:

    인사하기
    주문받기
    서빙
    재고 부족 시 기존 처리

작업 dispatch/action은 새로 발명하지 않고 기존 가게 탭의 실제 구현을 확인하여 재사용한다.

### 15.3 정보량 차이

오른쪽 레이아웃 폭이 더 좁기 때문에:

    가게 탭 > 오른쪽 모바일 인물 블럭

의 정보량 차이는 그 자체로 오류가 아니다.

검증 대상은:

    좁은 폭 때문에 필요한 정보가 사라진 것인지
    의도적으로 정보량을 줄인 것인지

를 구분하는 것이다.

사용자가 명시적으로 허용한 경우 오른쪽은 가게 탭보다 적은 정보만 출력할 수 있다.

---

## 16. 손님 렌더링 수정은 CSS와 컴포넌트를 따로 본다

여러 손님이 이상하게 보일 경우 두 경계를 분리한다.

    A. 어떤 component가 손님 데이터를 렌더링하는가
    B. 그 component의 CSS가 어떻게 배치하는가

현재 확인 대상:

    M36MobileRoomCustomer
    M36MobileRoomActivity
    m36-mobile-room-line
    m36-mobile-room-customer-name

컴포넌트에서 정보가 누락되었다면 CSS만 고치지 않는다.

CSS 때문에 2열/겹침이 발생하면 React/렌더링 로직까지 불필요하게 바꾸지 않는다.

---

## 17. 패치 절차

원칙:

    ROOT CAUSE 확정
    → 최소 수정
    → diff 확인
    → syntax/static check
    → 실제 runtime verification
    → commit

패치 전에는 target count를 확인한다.

    text.count(expectedOldBlock) == 1

0이면 target drift로 중단한다.

2개 이상이면 unexpected duplicate로 중단한다.

---

## 18. Git diff 제한

모바일 UI 작업에서는 가능한 한:

    Wayward_MOD_v3.36.html

한 파일에만 변경을 남긴다.

필요 없는:

    temporary workflow
    temporary test file
    debug output
    generated artifact

를 final branch에 남기지 않는다.

최종 검증:

    git diff --check
    git diff --stat
    git diff --name-only

---

## 19. Runtime / Static 검증을 분리한다

최소한 다음을 분리해서 기록한다.

    STATIC:
    - target source present
    - node --check
    - git diff --check

    PROCESS:
    - actual harness/start command
    - process EXITCODE
    - raw stdout/stderr

    RUNTIME:
    - exact runtime checkout SHA
    - actual page load
    - target UI interaction
    - actual action dispatch/result
    - browser/runtime console errors

    DEPLOYMENT:
    - Render service/deploy state
    - Vercel deployment state (사용한 경우)

다음은 동일하지 않다.

    node --check PASS
    !=
    process EXITCODE 0
    !=
    page load PASS
    !=
    mobile UI PASS
    !=
    Deployment READY

---

## 20. 실제 UI 확인 시 우선순위

현재 Wayward 모바일 작업에서는:

    1. page load
    2. portrait/landscape basic layout
    3. right-side person block
    4. multiple guests
    5. guest action buttons
    6. player/wife location display
    7. same-room grouping
    8. existing game action still works

순으로 확인한다.

save/load, RNG, ID, Undo, turn progression, economy/supply calculation, character state calculation 등을 UI 수정 과정에서 임의 변경하지 않는다.

---

## 21. Fixture와 Production 구분

Fixture/mock이 사용된 경우 fixture output을 실제 provider/runtime 결과로 표현하지 않는다.

반드시 다음을 분리한다.

    transport source
    runtime environment
    raw output
    parse result
    validation
    production causality

---

## 22. Evidence 구조

권장:

    evidence/
    ├── MANIFEST.json
    ├── GIT_HEAD.txt
    ├── REQUESTED_TARGET.txt
    ├── git-status.txt
    ├── runtime.txt
    ├── stdout.txt
    ├── stderr.txt
    ├── exitcode.txt
    ├── deployment.json
    ├── runtime-head.txt
    └── screenshots/

MANIFEST에는 최소:

    repository
    branch
    requestedTargetSha
    runtimeHeadSha
    deploymentId
    runtimeEnvironment
    runtimeCommand
    processExitCode
    runtimeMarker
    result
    codeModified

를 기록한다.

Secret:

    PAT
    Authorization
    Bearer token
    VERCEL_OIDC_TOKEN
    _vercel_jwt
    signed download URL

는 기록하지 않는다.

---

## 23. 임시 workflow / bypass / Sandbox 정리

작업 종료 후:

    1. evidence 보존
    2. final commit SHA 기록
    3. temporary workflow 삭제
    4. temporary PR/branch 정리
    5. Vercel protection bypass revoke
    6. Sandbox stop
    7. 최종 branch HEAD 재확인

Temporary infrastructure가 final production branch에 남아 있으면 작업 완료가 아니다.

---

## 24. 최종 판정 템플릿

    [EXACT TARGET SHA]
    GREEN / YELLOW / RED / UNKNOWN

    [EXACT RUNTIME SHA]
    GREEN / YELLOW / RED / UNKNOWN

    [GITHUB ACTIONS]
    GREEN / YELLOW / RED / UNKNOWN

    [VERCEL ACCESS]
    GREEN / YELLOW / RED / UNKNOWN

    [PREVIEW HTTP]
    GREEN / YELLOW / RED / UNKNOWN

    [RUNTIME ARTIFACT]
    GREEN / YELLOW / RED / UNKNOWN

    [ACTUAL UI/ACTION TEST]
    GREEN / YELLOW / RED / UNKNOWN

    [PRODUCTION SOURCE IMPACT]
    NO CHANGE / CHANGED / UNKNOWN

    [FINAL VERDICT]
    PASS / FAIL / UNKNOWN

---

## 25. 절대 하지 말 것

    같은 403 API 반복 호출
    list_teams=[]만 보고 team/project 부재 판정
    Deployment READY만 보고 PASS 판정
    runner failure를 code failure로 판정
    SSO 때문에 전역 Deployment Protection 해제
    Production env를 임의 변경
    불필요한 새 deployment 반복 생성
    전체 대형 HTML을 context에 적재
    대량 signed URL을 한 번에 전송
    private repo clone 실패를 repository absence로 판정
    fixture를 production evidence로 표현
    Secret/JWT/signed URL을 commit 또는 문서에 저장
    작업 중간의 debug workflow를 final branch에 남김
    기존 정상 로직을 확인하지 않고 새 로직으로 대체

---

## 26. 현재 작업 재개 지침

현재 mobile-migration-v1의 모바일 UI 작업에서는:

    기준점:
    45e20c27069658147c885b5a08f0dd42d136f800

부터 다시 출발한다.

현재 확인된 작업 대상:

    M36MobileRoomCustomer
    M36MobileRoomActivity
    m36-mobile-room-line

현재 사용자 요구:

    손님 여러 명 → 정상적으로 각 인물 표시
    손님 이름만 남는 현상 제거
    2열 찌그러짐 방지
    인사하기 복구
    주문받기 복구
    서빙 복구
    기존 가게 탭과 동일한 실제 action semantics 유지
    오른쪽은 좁으므로 가게 탭보다 적은 정보량을 허용

중요:

    같은 장소의 당신/엘레나 위치 묶음은 기존 정상 로직을 유지한다.
    최근 잘못된 커밋에서 wifeLoc !== playerLoc 조건을 제거했던 변경은 재사용하지 않는다.

패치 순서:

    1. 기준점 45e20c2 Exact source 재확인
    2. M36MobileRoomCustomer / M36MobileRoomActivity만 targeted read
    3. 왼쪽 가게 탭의 실제 guest action renderer와 대조
    4. 최소 patch 작성
    5. node --check / diff --check
    6. Render direct runtime에서 exact commit checkout SHA 재확인
    7. 같은 shell에서 실제 start/harness command 실행
    8. stdout/stderr/exitcode + 필요한 실제 page load/UI interaction 확보
    9. Actions가 정상일 경우 CI evidence를 보조 확인하고, 장애면 반복 재시도하지 않음
    10. final diff가 HTML 한 파일인지 확인
    11. temporary workflow / runtime helper 제거
    12. final HEAD 확인

### 26-A. Actions dead / jobs=[]일 때 실제 전환 절차

    Actions healthy
        → Actions CI evidence 확보
        → 필요 시 Render runtime으로 추가 검증

    Actions jobs=[] / runner unavailable / workflow not started
        → UNKNOWN 판정
        → 동일 workflow 반복 재시도 중단
        → Render에서 Exact target SHA checkout
        → runtime checkout SHA == requested target SHA 확인
        → 실제 command를 같은 shell에서 직접 실행
        → stdout/stderr/exitcode 보존
        → 실제 page load + 필요한 interaction 수행
        → Render service/deploy state는 별도 기록
        → 최종 verdict 작성

Render에서도 exact SHA가 확인되지 않으면 runtime evidence를 해당 target의 증거로 채택하지 않는다.

Render runtime을 사용할 때도 다른 프로젝트에서 가져온:

    VEIL_PORT
    Upstash 전용 변수
    VEIL PRODUCTION CORE PIPELINE RUNTIME EOF: PASS

등의 명칭을 Wayward에 임의 도입하지 않는다. Wayward에 실제 존재하는 server/harness/marker만 사용한다.


문서 자체는 runtime 결과가 아니다. 문서에 적힌 절차를 실제 실행하고 실제 evidence를 확보해야 한다.

### 27. 2026-10-08 최종 성공 상태

현재 `mobile-migration-v1` 최종 기준:

    final verified commit:
    d687a28133d28680079da664fad67a71c8e28b65

    parent:
    20398ad533fa2702dbafe4497ad1d2ab11a081e8

    changed production files:
    Wayward_MOD_v3.36.html
    idea/GPT_RUNTIME_FORENSIC_FALLBACK.md

최종 HTML 변경은 오른쪽 상태의 엘레나 위치 행을 같은 방에서도 표시하도록 조건 하나를 제거한 1줄 변경이다.

최종 HTML blob:

    3c2c7e17717e38935be541893c34f53dd686c21c
    size = 19,589,615 bytes

검증된 상태:

    function M36MobileStoreStatus = 1
    wifeLoc=re(d=>be(d.state)) = 1
    wifeLoc!==playerLoc = 0
    wifeRoomCount = 1
    function M36MobileRoomCustomer = 1
    label:"인사하기" = 1
    label:"주문받기" = 1
    type:"serve",customerId:e.id = 1
    node --check = PASS

현재 브랜치에는 실험용 workflow/trigger 파일을 남기지 않는다.

앞으로 같은 대형 HTML을 수정할 때는 이 성공 사례를 우선 사용한다:

    19MB source → external runtime / Git data
    → targeted anchor forensic
    → minimal byte patch
    → script extraction + node --check
    → blob/tree/commit/ref
    → final branch re-read

대형 파일 전체를 ChatGPT context에 올리지 않는다.


### 28. 2026-10-08 M36 손님 액션/행 분리 패치 성공 경로

19MB급 HTML은 ChatGPT context에 적재하지 않고 Vercel/Git runner filesystem에서 targeted patch한다.

    M36MobileRoomCustomer에 기존 greet/take_order/serve/apologize dispatch 복원
    → 고객별 full-width row
    → Elena 위치는 wifeLoc!==playerLoc 조건 유지
    → containing script node --check
    → diff --check
    → temporary patch script 제거
    → final git commit/push

주의:
    - action semantics를 새 로직으로 대체하지 않는다.
    - 대형 HTML 전체를 모델 context에 출력하지 않는다.


### 29. 2026-10-10 세이브 공유 UI 원파일 통합 검증 경로

Cloudflare Worker는 D1/R2 바인딩에 대해 다음 end-to-end API 테스트를 통과했다.

    GET /api/health → 200, schema=ready
    POST /api/share → 201
    POST /api/import (첫 사용) → 200, payload 일치
    POST /api/import (동일 코드 재사용) → 404 code_unavailable

19MB급 `Wayward_MOD_v3.36.html`는 GitHub API의 파일 전체 업데이트가 연결 중단으로 실패할 수 있어, 작업 브랜치에서 일회용 GitHub Actions runner patch 경로를 사용했다.

    exact current HTML blob SHA 확인
    → .github/apply_m36_save_share_patch.py에서 유일한 문자열 앵커만 교체
    → 원본 HTML의 기존 save/load/store/schema 함수 보존 확인
    → main type=module script 추출
    → node --check = PASS
    → git diff --check = PASS
    → invariant checks (share/import/title hooks, body close, native writer/import) = PASS
    → patched original HTML commit/push
    → final branch + blob SHA 재조회

통합된 UI:
    - 저장 슬롯별 제목 편집 (별도 localStorage metadata, 게임 save schema에는 추가 필드 없음)
    - 기존 수동 저장 칸의 공유 버튼: 해당 슬롯의 기존 JSON envelope를 Worker에 전송
    - 설정 메뉴의 6자리 코드를 이용한 가져오기: 기존 importSaveFromJSON을 호출
    - 공유 코드 만료 7일, 서버가 1회 소비
    - Worker/R2 object data remains private; no public bucket URL

최종 통합 커밋:
    0149495e2d974cd370597622534a76cd44820361
    feat(save-share): integrate cloud sharing into single-file game [save-share-patch]

중요 구분:
    - node --check / static invariants = PASS
    - Worker API flow = runtime PASS (fake JSON fixture only)
    - Browser UI / 실제 게임 세이브 round-trip = NOT YET VERIFIED
    - GitHub Actions one-time workflow/patch script는 성공 결과 확인 후 제거한다. 이후 일반 브랜치에 임시 runtime/patch workflow를 남기지 않는다.

### 30. 2026-10-10: 대형 원파일 비출력 검사 및 Worker 실서비스 E2E

목적:
    - 19MB급 단일 HTML을 ChatGPT 응답이나 GitHub 파일 조회 결과로 통째로 출력하지 않고,
      GitHub Actions runner 안에서 읽어 필요한 표식 개수만 요약한다.
    - 같은 runner에서 배포된 Worker의 발급·가져오기·1회 소비를 실제 HTTP 요청으로 확인한다.

절차:
    1. `.github/workflows/m36-save-share-inspect.yml` 일회용 workflow를
       작업 브랜치 `mobile-migration-v1`에 추가한다.
    2. runner의 Python 검사에서 HTML 전체 내용을 출력하지 않고 파일 바이트 수와
       필요한 고정 문자열의 개수만 출력한다.
    3. `node --check workers/wayward-save-share/index.js` 실행.
    4. Node fetch로 `GET /api/health`, `POST /api/share`, 첫 `POST /api/import`,
       같은 코드의 두 번째 `POST /api/import`를 검증한다.
    5. 결과 로그를 회수한 다음 임시 workflow를 즉시 삭제한다.

검증 결과:
    Run: https://github.com/diethoon/3.36/actions/runs/38024025902
    - HTML UTF-8 읽기 성공, 크기 19,609,580 bytes
    - Worker API 상수 / 슬롯 제목 키 / 공유 handler / 슬롯 버튼 연결 /
      설정 가져오기 / X-Share-Title 처리 표식: 각각 count=1
    - </body> 닫는 태그: count=1
    - Worker JavaScript `node --check`: PASS
    - health: HTTP 200, schema=ready
    - share create: HTTP 201, 6자리 코드 형식 및 expiresInSeconds=604800 확인
    - 첫 import: HTTP 200, 원문 payload 및 제목 헤더 일치
    - 재사용 import: HTTP 404, code_unavailable

검증 범위의 한계:
    - API 왕복 테스트 payload는 테스트용 가짜 JSON이다. 실제 게임 슬롯의 JSON을
      생성해 가져온 테스트는 아니므로 브라우저 UI와 실제 세이브 호환성까지
      검증되었다고 간주하지 않는다.
    - 이번 검사는 HTML의 고정 문자열과 Worker API 런타임을 검증했으며 게임 로직을
      변경하지 않았다. 실제 게임 저장/불러오기 round-trip은 별도 검증 대상이다.
    - 일회용 workflow 제거 후에는 검사 workflow가 일반 작업 브랜치에 남지 않도록 한다.

