# USAGE_GUIDE.md

## 개요

`taskCalendar`는 Spring Boot + JSP + jQuery 업무 시스템에서 직원별 업무 기간을 주간/월간으로 표시하기 위한 업무 타임라인 UI다.

현재 구현 파일명과 jQuery plugin 이름은 다음과 같다.

- CSS: `src/work-timeline.css`
- JS: `src/work-timeline.js`
- jQuery plugin: `workTimeline`
- 전역 생성자: `WorkTimeline`

프로젝트명은 `taskCalendar`이지만, 현재 MVP의 실제 초기화 코드는 `$('#target').workTimeline(...)`을 사용한다. `$('#target').taskCalendar(...)` alias는 아직 구현되어 있지 않다.

## 필요한 환경

- JSP 또는 일반 HTML 화면
- jQuery 호환 객체
- `<link>` / `<script>` 직접 로딩
- React, Vue, Angular 불필요
- npm, webpack, vite, CDN 런타임 의존 없음

`demo.html`에는 테스트 편의를 위해 작은 jQuery fallback이 들어 있지만, 실제 업무 화면에서는 사내 표준 jQuery를 먼저 로딩하는 것을 권장한다.

## Include 예시

```html
<link rel="stylesheet" href="/static/task-calendar/work-timeline.css">
<script src="/static/jquery/jquery.min.js"></script>
<script src="/static/task-calendar/work-timeline.js"></script>
```

JSP에서 배포 경로가 다르면 Spring static resource 경로에 맞게 수정한다.

## HTML container

```html
<div id="taskCalendar"></div>
```

한 화면에 여러 instance를 만들 수 있지만, 각 container id는 분리한다.

## 기본 초기화

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'month',
  currentDate: '2026-06-04',
  todayDate: '2026-06-04',
  employees: demoEmployees,
  tasks: demoTasks,
  holidays: demoHolidays
});
```

## 주간 view 사용 예시

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'week',
  weekStartsOn: 1,
  currentDate: '2026-06-04',
  todayDate: '2026-06-04',
  employees: demoEmployees,
  tasks: demoTasks,
  holidays: demoHolidays
});
```

고정 테스트 범위가 필요하면 `visibleStartDate`, `visibleEndDate`를 사용할 수 있다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'week',
  visibleStartDate: '2026-06-01',
  visibleEndDate: '2026-06-07',
  todayDate: '2026-06-04',
  employees: demoEmployees,
  tasks: demoTasks
});
```

## 월간 view 사용 예시

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'month',
  currentDate: '2026-06-04',
  todayDate: '2026-06-04',
  maxVisibleTaskBarsPerWeek: 3,
  employees: demoEmployees,
  tasks: demoTasks,
  holidays: demoHolidays
});
```

월간 view는 기준일이 속한 월의 1일부터 말일까지 표시한다. 업무 bar는 날짜 cell 내부에 반복 렌더링하지 않고 week row 단위의 bar layer에 표시한다.

## Employees JSON 예시

```javascript
var demoEmployees = [
  {
    id: 'E001',
    name: '김상우',
    departmentId: 'DEV',
    departmentName: '개발팀',
    positionName: '과장',
    sortOrder: 10
  }
];
```

주간 view에서는 `employee.id`와 `task.employeeId`가 일치해야 직원 row에 업무가 표시된다.

## Tasks JSON 예시

```javascript
var demoTasks = [
  {
    taskId: 'T001',
    employeeId: 'E001',
    employeeName: '김상우',
    departmentId: 'DEV',
    departmentName: '개발팀',
    title: '정산 API 개선',
    startDate: '2026-06-03',
    endDate: '2026-06-12',
    status: 'IN_PROGRESS'
  }
];
```

날짜는 반드시 `YYYY-MM-DD` date-only 문자열을 사용한다. `Date`, timestamp, 시간/분/초는 사용하지 않는다.

## Holidays JSON 예시

```javascript
var demoHolidays = [
  {
    date: '2026-06-05',
    name: '대체공휴일',
    type: 'SUBSTITUTE_HOLIDAY'
  }
];
```

휴일은 주간 header와 월간 날짜 cell에 표시된다. 현재 구현에서는 모든 holiday를 일요일과 같은 빨간색 계열로 표시한다.

## 업무 클릭 dummy alert 예시

```javascript
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
  maxVisibleTasksPerDay: 3,
  maxVisibleTaskBarsPerWeek: 3,
  tasks: demoTasks,
  employees: demoEmployees,
  holidays: demoHolidays
});
```

`onTaskClick`을 직접 전달하면 `taskClickFunctionName`보다 우선한다.

```javascript
$('#taskCalendar').workTimeline({
  tasks: demoTasks,
  employees: demoEmployees,
  onTaskClick: function (task, context, event) {
    console.log(task, context);
  }
});
```

## `... N` 큰 창 확인 방법

월간 view에서 같은 week row에 표시 가능한 bar lane보다 많은 업무가 있으면 `... N` 버튼이 표시된다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'month',
  maxVisibleTaskBarsPerWeek: 3,
  tasks: manyOverlappedTasks,
  employees: demoEmployees
});
```

`... N`을 클릭하면 기본 modal이 열리고 숨겨진 업무의 업무명, 부서/직원, 기간, 상태를 확인할 수 있다. `onMoreClick`이 `false`를 반환하면 기본 modal을 열지 않는다.

## Public method 사용 예시

현재 구현된 method는 jQuery plugin string 호출로 사용할 수 있다.

```javascript
$('#taskCalendar').workTimeline('setView', 'week');
$('#taskCalendar').workTimeline('goTo', '2026-06-04');
$('#taskCalendar').workTimeline('today');
$('#taskCalendar').workTimeline('prev');
$('#taskCalendar').workTimeline('next');
$('#taskCalendar').workTimeline('setData', employees, tasks);
$('#taskCalendar').workTimeline('setHolidays', holidays);
$('#taskCalendar').workTimeline('reload');
$('#taskCalendar').workTimeline('destroy');
```

주의: `apiUrl`이 있으면 현재 구현은 실제 AJAX 요청을 하지 않고 pending/error 구조만 표시한다. API loading은 미구현이다.
