# USAGE_GUIDE.md

## 개요

`taskCalendar`는 Spring Boot + JSP + jQuery 업무 시스템에서 직원별 업무 기간을 주간/월간으로 표시하기 위한 업무 타임라인 UI다.

현재 구현 파일명과 jQuery plugin 이름은 다음과 같다.

- CSS: `src/work-timeline.css`
- JS: `src/work-timeline.js`
- jQuery plugin: `workTimeline`
- 전역 생성자: `WorkTimeline`

프로젝트명은 `taskCalendar`이지만, 현재 MVP의 실제 초기화 코드는 `$('#target').workTimeline(...)`을 사용한다. `$('#target').taskCalendar(...)` alias는 아직 구현되어 있지 않다.

이 가이드는 direct data injection 기준 사용법을 먼저 설명한다. `apiUrl` 기반 AJAX loading은 구조만 있으며 운영 사용 전 별도 구현이 필요하다.

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
  weeklyDisplayMode: 'timeline',
  weekStartsOn: 1,
  currentDate: '2026-06-04',
  todayDate: '2026-06-04',
  employees: demoEmployees,
  tasks: demoTasks,
  holidays: demoHolidays
});
```

`weeklyDisplayMode`를 생략하면 기존 직원별 timeline 모드가 사용된다.

## 주간 cardSection 사용 예시

`version2_card_section` 브랜치에서는 주간 view를 날짜 범위를 가로지르는 card/bar 형태로 표시할 수 있다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'week',
  weeklyDisplayMode: 'cardSection',
  enableTaskDrag: true,
  enableTaskEndDateEdit: true,
  defaultTaskEditable: false,
  taskColorMode: 'random',
  visibleStartDate: '2026-06-01',
  visibleEndDate: '2026-06-07',
  todayDate: '2026-06-04',
  employees: demoEmployees,
  tasks: demoTasks,
  holidays: demoHolidays,
  taskClickFunctionName: 'openTaskDetail',
  taskMoveFunctionName: 'onTaskMoveDummy',
  taskEndDateChangeFunctionName: 'onTaskEndDateChangeDummy'
});
```

`cardSection` 모드는 업무를 주간 7일 grid 위에 긴 card/bar로 표시한다. 하루짜리 업무는 1일 column만 차지하고, 여러 날 업무는 `displayStartDate~displayEndDate` column을 가로지르는 하나의 bar로 표시한다.

이전 주에 시작해서 이번 주까지 이어지는 업무처럼 시작일이 현재 주 밖인 업무는 `visibleStartDate`부터 clipped bar로 표시한다. 다음 주까지 이어지는 업무는 `visibleEndDate`까지 clipped bar로 표시한다.

화면에 업무 기간을 표시할 때 `startDate`와 `endDate`가 같으면 날짜를 한 번만 표시한다. 예를 들어 하루짜리 업무는 `2026-06-12`로 보이고, 여러 날 업무는 `2026-06-12 ~ 2026-06-15`로 보인다.

카드를 다른 날짜 섹션으로 drag/drop하면 새 날짜가 `newStartDate`가 되고 기존 기간을 유지해 `newEndDate`를 자동 계산한다. taskCalendar는 서버 저장을 직접 수행하지 않으므로 실제 DB 저장은 callback에서 처리한다.

`enableTaskDrag`의 기본값은 `true`라서 기존처럼 drag 시작일 변경이 가능하다. `enableTaskDrag: false`로 설정하면 주간 `cardSection` 업무 card/bar에 drag 속성을 부여하지 않고, 시작일 변경과 `onTaskMove`/`taskMoveFunctionName` 호출을 수행하지 않는다. 이때도 업무 click 상세와 double click 종료일 변경은 유지된다.

task별 수정 권한은 `task.canEdit`으로 전달한다. `canEdit: true`인 업무만 drag 시작일 변경과 double click 종료일 변경이 가능하다. `canEdit: false`이면 두 수정 동작이 모두 막히지만 업무 상세 click은 가능하다. `canEdit`이 없는 업무는 `defaultTaskEditable`을 따르며 기본값은 `false`이다.

```javascript
var demoTasks = [
  {
    taskId: 'T001',
    title: '내 업무 - 수정 가능',
    departmentName: '개발팀',
    employeeName: '김상우',
    startDate: '2026-06-02',
    endDate: '2026-06-05',
    status: 'IN_PROGRESS',
    canEdit: true
  },
  {
    taskId: 'T002',
    title: '다른 사람 업무 - 수정 불가',
    departmentName: '개발팀',
    employeeName: '황하나',
    startDate: '2026-06-03',
    endDate: '2026-06-06',
    status: 'TODO',
    canEdit: false
  }
];
```

권한 제어는 taskCalendar 내부에서 판단하지 않는다. 외부 업무 시스템에서 권한 여부를 계산한 뒤 option으로 전달한다.

`canEdit`은 프론트 UI 제어용이다. 사용자가 개발자 도구로 값을 조작할 수 있으므로 실제 저장 API는 로그인 사용자와 `taskId`를 기준으로 수정 권한을 반드시 다시 검증해야 한다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'week',
  weeklyDisplayMode: 'cardSection',
  enableTaskDrag: userCanEditSchedule,
  enableTaskEndDateEdit: true,
  defaultTaskEditable: false,
  taskMoveFunctionName: 'onTaskMoveDummy',
  taskEndDateChangeFunctionName: 'onTaskEndDateChangeDummy',
  taskClickFunctionName: 'openTaskDetail',
  tasks: demoTasks,
  employees: demoEmployees,
  holidays: demoHolidays
});
```

```javascript
function onTaskMoveDummy(payload) {
  alert(
    '업무 시작일 변경\n'
    + '업무ID: ' + payload.taskId + '\n'
    + '업무명: ' + payload.title + '\n'
    + '기존 시작일: ' + payload.oldStartDate + '\n'
    + '새 시작일: ' + payload.newStartDate + '\n'
    + '기존 종료일: ' + payload.oldEndDate + '\n'
    + '새 종료일: ' + payload.newEndDate + '\n'
    + '기간: ' + payload.durationDays + '일\n'
    + '변경유형: ' + payload.changeType + '\n'
    + '발생위치: ' + payload.source
  );

  // 실제 운영에서는 여기서 ajax로 서버 저장 처리한다.
  // taskCalendar는 저장 API를 직접 호출하지 않는다.
}
```

업무 card/bar를 double click하면 종료일 변경 modal이 열린다. 종료일은 `YYYY-MM-DD` 형식이어야 하고 시작일보다 빠를 수 없다.

```javascript
function onTaskEndDateChangeDummy(payload) {
  alert(
    '업무 종료일 변경\n'
    + '업무ID: ' + payload.taskId + '\n'
    + '업무명: ' + payload.title + '\n'
    + '시작일: ' + payload.newStartDate + '\n'
    + '기존 종료일: ' + payload.oldEndDate + '\n'
    + '새 종료일: ' + payload.newEndDate + '\n'
    + '변경유형: ' + payload.changeType + '\n'
    + '발생위치: ' + payload.source
  );

  // 실제 운영에서는 여기서 ajax로 서버 저장 처리한다.
  // taskCalendar는 저장 API를 직접 호출하지 않는다.
}
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
    + '기간: ' + formatTaskDateRange(task.startDate, task.endDate)
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
    openTaskDetail(task, context);
  }
});
```


## 업무 색상 모드 사용 예시

기본값은 기존 동작과 같은 상태 기반 색상이다.

```javascript
$('#taskCalendar').workTimeline({
  taskColorMode: 'status',
  tasks: demoTasks,
  employees: demoEmployees
});
```

업무별 deterministic random 색상을 사용하려면 `random`으로 변경한다.

```javascript
$('#taskCalendar').workTimeline({
  taskColorMode: 'random',
  taskColorSeedField: 'taskId',
  randomTaskColorPaletteSize: 8,
  tasks: demoTasks,
  employees: demoEmployees
});
```

같은 `taskId`는 주간/월간 view와 새로고침 후에도 같은 `wt-task-color-random-N` class를 사용한다. random 모드에서도 `canEdit: false` 업무의 readonly 스타일은 유지된다.

## 기간 변경 시 custom function으로 데이터 로딩

`enableRemoteDataLoad: true`를 사용하면 이전/다음/오늘, 주간/월간 전환, `reload()` 시 custom function을 호출해 새 데이터를 받을 수 있다. `workTimeline`은 API URL을 직접 알지 않고, 실제 AJAX 호출은 업무 시스템의 function 안에서 처리한다.

전역 함수명 방식:

```javascript
function loadTaskCalendarData(payload) {
  return $.ajax({
    url: '/api/task-calendar/tasks',
    method: 'GET',
    dataType: 'json',
    data: {
      viewType: payload.viewType,
      searchDate: payload.baseDateParam,
      startDate: payload.visibleStartDate,
      endDate: payload.visibleEndDate
    }
  });
}

$('#taskCalendar').workTimeline({
  viewType: 'month',
  defaultDate: '2026-07-15',
  enableRemoteDataLoad: true,
  loadOnInit: true,
  rangeChangeFunctionName: 'loadTaskCalendarData',
  taskClickFunctionName: 'openTaskDetail',
  taskMoveFunctionName: 'onTaskMoveDummy',
  taskEndDateChangeFunctionName: 'onTaskEndDateChangeDummy'
});
```

callback 방식:

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'week',
  weeklyDisplayMode: 'cardSection',
  enableRemoteDataLoad: true,
  onRangeChange: function (payload) {
    return $.ajax({
      url: '/api/task-calendar/tasks',
      method: 'GET',
      dataType: 'json',
      data: {
        viewType: payload.viewType,
        searchDate: payload.baseDateParam,
        startDate: payload.visibleStartDate,
        endDate: payload.visibleEndDate
      }
    });
  }
});
```

`payload`에는 `viewType`, `weeklyDisplayMode`, `visibleStartDate`, `visibleEndDate`, `baseDate`, `baseDateParam`, `action`, `previousVisibleStartDate`, `previousVisibleEndDate`가 포함된다. 월간 이동 시 `baseDate`는 이동한 월의 15일이고, 주간 이동 시 `baseDate`는 `visibleStartDate + 3일`이다. `baseDateParam`은 `YYYYMMDD` 형식이므로 API의 `searchDate`로 그대로 사용할 수 있다. custom function이 Promise/jqXHR 또는 `{ employees, tasks, holidays }` object를 반환하면 응답에 포함된 필드만 내부 데이터에 반영한다. 반환값이 없거나 실패하면 기존 데이터를 유지한다.

`defaultDate`를 지정하면 최초 화면은 해당 날짜 기준으로 표시된다. 없으면 기존 `currentDate`, `todayDate`, 오늘 날짜 순서로 기준 날짜를 결정한다. `enableRemoteDataLoad: true`이고 `loadOnInit: true`이면 최초 렌더링 후 `action: 'init'` payload로 custom function을 호출한다.

## `... N` 큰 창 확인 방법

월간 view에서 특정 날짜에 포함되는 업무가 `maxVisibleTasksPerDay`보다 많으면 해당 날짜 cell 안에 `... N` 버튼이 표시된다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'month',
  maxVisibleTasksPerDay: 3,
  maxVisibleTaskBarsPerWeek: 3,
  monthRangeBarMinDays: 2,
  tasks: manyOverlappedTasks,
  employees: demoEmployees
});
```

월간 업무는 `monthRangeBarMinDays` 기준으로 progress bar 업무와 날짜 cell 목록 업무를 분리한다. 기본값 `2`에서는 2일 이상 업무는 progress bar로 표시하고 날짜 cell 목록에는 중복 표시하지 않는다. 하루짜리 업무는 날짜 cell 목록에 표시한다.

월간 `... N`은 날짜 cell별 day-list 업무로 계산된다. 예를 들어 `2026-06-04`에 포함되는 하루 업무가 4개이고 `maxVisibleTasksPerDay: 3`이면 6/4 날짜 cell 안에 하루 업무 3개와 `... 1`이 표시된다.

`... N`을 클릭하면 기본 modal이 열리고 클릭한 날짜의 숨겨진 day-list 업무만 표시한다. progress bar 업무는 modal에 포함하지 않으며 progress bar 클릭으로 상세를 확인한다. `onMoreClick(date, hiddenTasks, allTasks)`의 `date`는 클릭한 날짜이며, `hiddenTasks`와 `allTasks`도 해당 날짜 기준이다. `onMoreClick`이 `false`를 반환하면 기본 modal을 열지 않는다.

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

주의: `apiUrl` 자동 AJAX loading은 아직 미구현이다. 기간 변경 데이터 조회는 `enableRemoteDataLoad`와 custom function으로 처리한다.
