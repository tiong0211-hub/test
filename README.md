# Plant Engineer Daily Insight

플랜트 엔지니어에게 영감을 주는 일일 뉴스레터를 자동으로 생성 → 발행자 검수 → 고객 발송하는 파이프라인.

## 동작 방식

매일 두 번, Claude Code Routine이 이 저장소가 연결된 세션을 깨워 아래 흐름을 수행한다.

**① 초안 생성 & 미리보기 (예: 매일 07:00 KST)**
1. `data/history.json`을 참고해 최근 14일간 다루지 않은 주제를 `data/topics.json`(기계공학/화학공학/분자생물학/심리학/경제학)에서 무작위로 1개 선정 — `scripts/select-topic.js`
2. Claude가 그 주제를 관통하는 SVG 다이어그램, 간략 설명, 플랜트 엔지니어 관점의 타 분야 확장 사고를 작성
3. `templates/newsletter-template.html`에 내용을 채워 최종 HTML 렌더링 — `scripts/render-newsletter.js`
4. `templates/approval-artifact-template.html` 구조를 바탕으로 그날의 검수 페이지를 Artifact로 게시(승인/거절 버튼 포함)
5. 발행자(`PUBLISHER_EMAIL`)에게 요약 + 검수 페이지 링크가 담긴 미리보기 메일 발송 — `scripts/send-email.js --mode=preview`
6. `data/history.json`에 오늘 주제를 `status: "pending"`으로 기록

**② 승인 확인 & 발송 (예: 08:00~11:00 KST, 1시간 간격)**
1. 검수 Artifact의 DB(`newsletter/decisions/{date}`)를 조회해 오늘 결정 확인
2. 승인 → 동일 HTML을 고객 구독자 목록에 발송 — `scripts/send-email.js --mode=broadcast`
3. 거절 → 발송하지 않고 발행자에게 알림
4. 마감 시각까지 결정 없음 → **기본값은 발송하지 않음**(안전장치)

## 최초 1회 설정

1. **이메일 서비스 계정 준비** (기본값: [Resend](https://resend.com))
   - 발신 도메인 인증 (SPF/DKIM/DMARC) — 스팸함 방지에 필수
   - Audience(구독자 목록) 생성, 옵트인 가입 폼 연결 — 신규 구독자는 더블 옵트인으로 최종 동의해야 목록에 추가되도록 설정
   - API 키 발급
2. **환경변수 설정**: `.env.example`을 참고해 `RESEND_API_KEY`, `SENDER_EMAIL`, `PUBLISHER_EMAIL`, `SUBSCRIBER_AUDIENCE_ID`를 실제 값으로 설정 (레포에 커밋하지 말 것)
3. **Routine 등록**: 위 ①②를 각각 cron 트리거로 등록 (예: `0 22 * * *` UTC = 매일 07:00 KST)
4. **시범 실행**: Routine을 스케줄 등록하기 전에 수동 실행(fire)으로 초안 생성→미리보기 수신→승인 클릭→고객 발송까지 전체 흐름을 먼저 검증

## 구독자 동의/거절 관리

- 고객이 뉴스레터를 신청할 때 더블 옵트인(신청 → 확인 메일 → 링크 클릭)으로 최종 동의를 받는다.
- 모든 발송 메일 하단에 구독취소 링크를 포함하고, `List-Unsubscribe` / `List-Unsubscribe-Post: List-Unsubscribe=One-Click` 헤더로 원클릭 수신거부를 지원한다.
- 구독자 개인정보(이메일 주소, 동의 이력)는 이 저장소에 저장하지 않고 이메일 서비스의 Audience 기능으로만 관리한다.

## 로컬 테스트

```bash
# 1) 오늘의 주제 선정 (data/history.json 갱신됨)
node scripts/select-topic.js

# 2) 샘플 콘텐츠로 뉴스레터 렌더링
node scripts/render-newsletter.js --content=path/to/content.json --out=/tmp/preview.html

# 3) 자신에게 미리보기 발송 (RESEND_API_KEY, SENDER_EMAIL 필요)
node scripts/send-email.js --mode=preview --to=you@example.com --subject="테스트" --html=/tmp/preview.html
```

## 파일 구조

| 경로 | 설명 |
|---|---|
| `data/topics.json` | 분야별 주제 풀 |
| `data/history.json` | 날짜별 주제/상태 로그 (중복 회피용) |
| `templates/newsletter-template.html` | 고객 발송용 최종 이메일 템플릿 |
| `templates/approval-artifact-template.html` | 발행자 검수 페이지 참고 템플릿 |
| `scripts/select-topic.js` | 무작위 주제 선정 (최근 사용 회피 + 분야 균형) |
| `scripts/render-newsletter.js` | 템플릿에 콘텐츠 채워 최종 HTML 생성 |
| `scripts/send-email.js` | Resend API로 미리보기/고객 발송 |

## 보완이 필요한 부분

- **개인정보 관리**: 고객 이메일을 저장소에 평문 저장하지 말 것 (이메일 서비스의 Audience 기능 사용)
- **법적 요건**: 구독취소 링크·발신자 주소 표기 (정보통신망법/개인정보보호법, CAN-SPAM 고려)
- **발신 도메인 인증**: SPF/DKIM/DMARC 설정 필요
- **장애 알림**: 초안 생성/발송 실패 시 발행자에게 알림 로직 추가 필요
- **주제 풀 유지보수**: `data/topics.json`에 주기적으로 신규 주제 추가
- **검수 단계 확장(향후)**: 승인/거절 외에 발행 전 텍스트 수정 기능 추가 고려
- **이메일 서비스 최종 선정**: 실제 보유 계정에 따라 Resend/SendGrid/SES 중 확정 필요 (현재 코드는 Resend 기준)
