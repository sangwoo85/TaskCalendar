# taskCalendar

`taskCalendar`는 Spring Boot + JSP + jQuery 업무 시스템에서 직원별 업무 기간을 주간/월간으로 표시하기 위한 업무 타임라인 UI 프로젝트다.

일반 일정 캘린더나 FullCalendar 대체물이 아니라, 직원별 업무 시작일~종료일을 bar 형태로 읽기 쉽게 보여주는 전용 컴포넌트를 목표로 한다.

## 현재 구현 상태

현재 MVP 구현 파일은 다음과 같다.

```text
src/
  work-timeline.js
  work-timeline.css
demo.html
```

현재 실제 jQuery plugin 이름은 `workTimeline`이다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'month',
  employees: demoEmployees,
  tasks: demoTasks,
  holidays: demoHolidays
});
```

프로젝트명은 `taskCalendar`이지만 `$('#target').taskCalendar(...)` alias는 아직 구현되어 있지 않다.

## 주요 기능

- jQuery plugin 방식 초기화
- direct data injection 방식 지원
- 주간 view 직원별 timeline
- 주간 view에서 업무 없는 직원 row 숨김
- 월간 view 일반 calendar grid
- 월간 view week row 단위 연속 업무 bar
- 업무 기간 overlap 표시
- 주간 task stacking
- 월간 task bar lane stacking
- 월간 `... N` overflow modal
- 업무 클릭 callback 및 `taskClickFunctionName`
- 휴일/대체휴일 표시
- 일요일/토요일 색상 구분
- `destroy()`, `setData()`, `setHolidays()` 등 public method

## 지원 환경

- Spring Boot
- JSP
- jQuery
- `<script>` / `<link>` 직접 로딩
- React/Vue/Angular 사용 안 함
- npm/webpack/vite 런타임 의존 없음
- CDN 의존 없음

## 빠른 사용 예시

```html
<link rel="stylesheet" href="/static/task-calendar/work-timeline.css">
<script src="/static/jquery/jquery.min.js"></script>
<script src="/static/task-calendar/work-timeline.js"></script>

<div id="taskCalendar"></div>

<script>
  function openTaskDetail(task) {
    alert(
      '업무 클릭\n'
      + '업무명: ' + task.title + '\n'
      + '부서: ' + task.departmentName + '\n'
      + '담당자: ' + task.employeeName + '\n'
      + '기간: ' + task.startDate + ' ~ ' + task.endDate
    );
  }

  $('#taskCalendar').workTimeline({
    viewType: 'month',
    taskClickFunctionName: 'openTaskDetail',
    maxVisibleTaskBarsPerWeek: 3,
    employees: demoEmployees,
    tasks: demoTasks,
    holidays: demoHolidays
  });
</script>
```

## 문서 목록

- [AGENTS.md](./AGENTS.md): Codex가 항상 참고할 최상위 작업 지침
- [FEATURE_SPEC.md](./docs/task-calendar/FEATURE_SPEC.md): 기능 명세
- [DESIGN_GUIDE.md](./docs/task-calendar/DESIGN_GUIDE.md): 디자인 기준
- [API_SPEC.md](./docs/task-calendar/API_SPEC.md): API 데이터 구조
- [USAGE_GUIDE.md](./docs/task-calendar/USAGE_GUIDE.md): JSP + jQuery 사용 방법
- [CUSTOMIZE_GUIDE.md](./docs/task-calendar/CUSTOMIZE_GUIDE.md): 옵션, callback, CSS 커스터마이징 방법
- [ARCHITECTURE.md](./docs/task-calendar/ARCHITECTURE.md): 내부 렌더링/날짜 계산 구조
- [COMMENT_GUIDE.md](./docs/task-calendar/COMMENT_GUIDE.md): 코드 주석 작성 기준
- [REVIEW_CHECKLIST.md](./docs/task-calendar/REVIEW_CHECKLIST.md): 구현 검수 기준

## 미구현 또는 예정

- `apiUrl` 실제 AJAX loading
- `$('#target').taskCalendar(...)` alias
- 서버 API 자동 연동 및 retry UI
- 모바일 최적화
- 직원 row 항상 표시 option
- TypeScript 타입 정의

## 향후 개선 예정

- Spring Boot API loading 완성
- API 응답 검증과 error 상태 개선
- 월간 overflow modal UX 개선
- 접근성 및 keyboard interaction 보강
- 배포용 파일명과 plugin alias 정리
