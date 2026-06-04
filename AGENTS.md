# AGENTS.md

이 프로젝트는 Spring Boot + JSP + jQuery 업무 시스템에서 사용할 직원별 업무 타임라인 JavaScript 라이브러리 `taskCalendar`를 문서 기반으로 설계한다.

## 기본 목표
- 일반 캘린더가 아니라 직원별 업무 시작일~종료일을 bar 형태로 표시하는 월간/주간 업무 타임라인 컴포넌트다.
- FullCalendar 대체물이 아니라 업무 배정, 기간, 상태를 한 화면에서 읽기 위한 전용 라이브러리다.
- 이번 단계에서는 실제 JS/CSS 구현 파일을 만들지 않는다.

## 환경 제약
- Spring Boot, JSP, jQuery 환경을 기준으로 한다.
- 사용 방식은 `<script>` / `<link>` tag 직접 로딩이다.
- React, Vue, Angular, TypeScript 필수화, npm, webpack, vite, CDN 의존을 금지한다.
- 외부 유료 라이브러리를 사용하지 않는다.

## 향후 라이브러리 형태
- 예정 경로: `src/task-calendar.js`, `src/task-calendar.css`
- 전역 객체 또는 jQuery plugin 방식으로 사용할 수 있어야 한다.
- JSP 화면에서 서버 렌더링된 DOM에 붙여 초기화할 수 있어야 한다.

## 핵심 날짜 규칙
- 날짜는 `YYYY-MM-DD` date-only 문자열을 기준으로 처리한다.
- 업무는 화면 기간과 겹치면 표시한다.
- 표시 조건: `task.startDate <= visibleEndDate AND task.endDate >= visibleStartDate`
- bar 범위: `displayStartDate = max(task.startDate, visibleStartDate)`, `displayEndDate = min(task.endDate, visibleEndDate)`
- 이 규칙은 주간/월간 view 모두 동일하다.

## CSS 규칙
- 모든 class는 `wt-` prefix를 사용한다.
- 전역 element selector, 과도한 reset, Bootstrap 등 업무 시스템 CSS와 충돌할 수 있는 스타일을 피한다.

## 참조 문서
- 기능 명세: `docs/task-calendar/FEATURE_SPEC.md`
- 디자인 가이드: `docs/task-calendar/DESIGN_GUIDE.md`
- API 명세: `docs/task-calendar/API_SPEC.md`
- 검수 체크리스트: `docs/task-calendar/REVIEW_CHECKLIST.md`

## 금지사항
- 실제 구현 전 문서와 다른 API, 날짜 규칙, CSS prefix를 임의로 도입하지 않는다.
- 일반 캘린더 기능을 과도하게 확장하지 않는다.
- 브라우저 빌드 도구, CDN, 프레임워크 의존을 추가하지 않는다.
