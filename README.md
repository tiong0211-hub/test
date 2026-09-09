# Plant Engineer Daily Insight

플랜트 엔지니어를 위한 일일 인사이트를 **인스타그램 카드**로 자동 생성하는 파이프라인.
하루 한 주제를 골라 영문 카드 이미지(1080×1350)와 영/한 병기 캡션을 만들어 사용자에게 전달한다.

> **이메일 발송 파이프라인은 폐기되었습니다.** 발신 도메인(Resend) 인증이 끝내 되지 않아
> 채널을 인스타그램으로 전환했다. `scripts/send-email.js`, `templates/newsletter-template.html`,
> `data/drafts/`, `templates/approval-artifact-template.html`는 참고용으로만 남겨두며
> 어떤 자동화에서도 호출되지 않는다.

## 동작 방식

매일 아침(KST) Claude Code Routine이 새 세션을 열어 아래 흐름을 수행한다. 전체 로직은
`CLAUDE.md`에 상세히 문서화되어 있고, Routine은 그 문서를 그대로 따른다.

1. `node scripts/build-instagram-post.js` — `data/topics.json`에서 최근 14일간 다루지
   않은 주제를 하나 선정(`scripts/select-topic.js`, `data/history.json` 기준 중복 회피)하고,
   인스타그램 전용 발행 번호(VOL)를 `data/instagram-history.json`에서 채번한다.
2. 그 주제에 맞는 영문 카드 콘텐츠(제목, 리드 문단, 주제별로 새로 그리는 인라인 SVG 다이어그램,
   분야 배지, CTA)를 작성한다 — 매번 같은 상자+화살표 다이어그램을 재사용하지 않고, 그 주제의
   구조(흐름도, 곡선, 비교 등)에 맞춰 새로 디자인한다.
3. `node scripts/render-instagram-image.js`로 `templates/instagram-post-template.html`을
   채워 1080×1350 PNG를 렌더링한다 (Playwright + Chromium, `/opt/pw-browsers/chromium`).
4. 영문 캡션 + 국문 번역을 하나의 텍스트로 작성한다 (붙여넣기 한 번으로 끝나도록).
5. 콘텐츠 JSON, 렌더링된 PNG, 캡션을 `output/instagram/<날짜>/`에 저장하고 커밋·푸시한다.
6. PNG 파일과 캡션을 채팅으로 전달한다. **인스타그램 업로드 자체는 수동이다** — API 연동이
   되어 있지 않으므로, 전달받은 이미지와 캡션을 사용자가 직접 올린다.

이미 등록된 자동화는 이 흐름 하나뿐이다(이메일 초안/검수/발송용 Routine은 없다).

## 최초 1회 설정

1. **세션 시작 훅**: `.claude/hooks/session-start.sh` + `.claude/settings.json`이 이미
   구성되어 있어, 클라우드 세션이 시작될 때마다 `npm install`을 실행해 Playwright 등
   의존성을 자동으로 준비한다. 별도 조치 불필요.
2. **Routine 등록**: "Plant Engineer Daily Insight — Instagram post"라는 이름으로
   `create_new_session_on_fire` Routine이 매일 KST 오전 8시 53분(cron `53 23 * * *`,
   UTC 기준)에 새 세션을 띄우도록 등록되어 있다. 프롬프트는 위 동작 방식 그대로를
   지시하며, `CLAUDE.md`의 "Reliability" 절(한 번만 렌더링 → 한 번만 확인 → 반드시
   push까지)을 명시적으로 참조한다.
3. **API 키 불필요**: 이메일 시절과 달리 이 파이프라인은 외부 서비스 API 키가 필요 없다
   (Playwright 렌더링 + 파일 전달만 사용). Resend 관련 API credential 설정은 더 이상
   필요하지 않다.
4. **인스타그램 계정**: 실제 게시는 사용자가 직접 하므로, 계정 자체에는 아무 사전 설정도
   필요 없다 (API 연동을 붙이려면 별도로 Graph API 앱/토큰 설정이 필요하며, 현재는
   범위 밖이다).

## 로컬 테스트

```bash
# 1) 오늘의 주제 선정 + VOL 채번 (data/history.json, data/instagram-history.json 갱신됨)
node scripts/build-instagram-post.js

# 2) 콘텐츠 JSON을 직접 작성한 뒤 카드 이미지 렌더링
node scripts/render-instagram-image.js --content=path/to/content.json --out=/tmp/post.png
```

콘텐츠 JSON의 필드 형태와 다이어그램 작성 스타일은 `output/instagram/`의 기존
폴더들(`content.json`)을 예시로 참고한다.

## 파일 구조

| 경로 | 설명 |
|---|---|
| `data/topics.json` | 분야별 주제 풀 |
| `data/history.json` | 날짜별 주제 로그 (이메일·인스타그램 공통 중복 회피용) |
| `data/instagram-history.json` | 인스타그램 발행 번호(VOL) 로그 — 001부터 별도 채번 |
| `templates/instagram-post-template.html` | 인스타그램 카드 템플릿 (1080×1350, 영문 전용) |
| `scripts/select-topic.js` | 무작위 주제 선정 (최근 사용 회피 + 분야 균형) |
| `scripts/build-instagram-post.js` | 주제 선정 + VOL 채번을 한 번에 처리 |
| `scripts/render-instagram-image.js` | 템플릿에 콘텐츠를 채워 PNG 렌더링 (Playwright) |
| `output/instagram/<날짜>/` | 그날 발행한 content.json / PNG / caption.txt |
| `.claude/hooks/session-start.sh` | 클라우드 세션 시작 시 `npm install` 자동 실행 |
| `CLAUDE.md` | 파이프라인 전체 지침 (Routine이 매일 참고하는 문서) |
| `scripts/render-newsletter.js` | (레거시) `{{PLACEHOLDER}}` 치환 렌더러 — 두 템플릿이 공유 |
| `scripts/send-email.js`, `templates/newsletter-template.html`, `data/drafts/` | (폐기) 이메일 발송 시절 코드, 참고용으로만 보존 |

## 보완이 필요한 부분

- **인스타그램 자동 게시**: 현재는 이미지·캡션을 전달만 하고 업로드는 수동이다. 계정을
  프로페셔널로 전환하고 Meta Graph API 토큰을 발급받으면 자동 게시로 확장할 수 있다.
- **다이어그램 품질 편차**: 매일 주제에 맞춰 새로 디자인하는 방식이라, 주제 난이도에 따라
  다이어그램 완성도가 날마다 다를 수 있다. 반복 발행하며 패턴이 쌓이면 스타일 가이드를
  보강할 것.
- **주제 풀 유지보수**: `data/topics.json`에 주기적으로 신규 주제를 추가해야 소재가
  마르지 않는다.
- **VOL/날짜 카탈로그**: 발행분이 쌓이면 `output/instagram/`을 순회하는 간단한 인덱스
  (예: 날짜·VOL·제목 목록)가 있으면 과거분 확인이 편해질 것.
