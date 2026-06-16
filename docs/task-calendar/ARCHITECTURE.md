# ARCHITECTURE.md

## 전체 구조 개요

현재 MVP는 빌드 도구 없이 JSP + jQuery 화면에서 직접 로딩하는 단일 JS/CSS 구조다.

- `src/work-timeline.js`: jQuery plugin, 날짜 계산, 렌더링, 이벤트 처리
- `src/work-timeline.css`: `wt-` prefix 기반 스타일
- `demo.html`: direct data 방식 테스트 화면

프로젝트명은 `taskCalendar`이지만 실제 plugin 이름은 `workTimeline`이다.

## 파일 구성

```text
taskCalendar/
  src/
    work-timeline.js
    work-timeline.css
  demo.html
  docs/task-calendar/
    FEATURE_SPEC.md
    DESIGN_GUIDE.md
    API_SPEC.md
    REVIEW_CHECKLIST.md
    USAGE_GUIDE.md
    CUSTOMIZE_GUIDE.md
    ARCHITECTURE.md
    COMMENT_GUIDE.md
```

## 초기화 흐름

1. `$('#target').workTimeline(options)` 호출
2. 기존 instance가 없으면 `new WorkTimeline(element, options)` 생성
3. 기본 option과 사용자 option 병합
4. `employees`, `tasks`, `holidays` 저장
5. `viewType`, `currentDate` 결정
6. `render()` 실행
7. `onInit(instance)` 호출

## 기간 변경 remote data 흐름

`enableRemoteDataLoad: true`이면 `prev`, `next`, `today`, `setView`, `goTo`, `reload()` 이후 custom function을 호출해 데이터를 갱신할 수 있다.

```text
기간 변경
  -> 새 visible range 계산
  -> render()로 변경된 기간 shell 표시
  -> buildRangeChangePayload(action, previousRange)
  -> onRangeChange(payload) 우선 호출
  -> 없으면 window[rangeChangeFunctionName](payload) 호출
  -> Promise/jqXHR 또는 object 응답 처리
  -> 응답에 포함된 employees/tasks/holidays만 갱신
  -> render() 재실행
```

`workTimeline`은 API URL을 직접 알지 않는다. 실제 서버 호출은 custom function 내부에서 처리한다.

중복 요청은 `rangeRequestId`로 제어한다. 요청마다 id를 증가시키고, 응답 시점의 id가 최신 id와 다르면 오래된 응답으로 보고 화면에 반영하지 않는다.

loading 중에는 root element에 `wt-loading wt-calendar-loading` class를 추가하고, 완료/실패 시 제거한다. 실패 또는 `success === false` 응답은 기존 데이터를 유지하고 `console.warn`만 수행한다.

## 데이터 정규화 흐름

- `arrayOrEmpty()`로 배열 option을 방어적으로 처리한다.
- `normalizeHolidays()`는 유효한 `YYYY-MM-DD` 날짜와 `name`이 있는 휴일만 유지한다.
- task는 렌더링 단계에서 `startDate`, `endDate` 유효성 및 기간 역전을 검사한다.
- status는 `normalizeStatus()`로 허용 목록 외 값을 `TODO`로 처리한다.
- status CSS class는 `statusClass()`에서 생성하고, 실제 색상은 `work-timeline.css`가 담당한다.
- 업무 색상 정책은 `getTaskColorClass(task, options)`에서 status/random 모드를 분기한다.

## 공통 유틸 구조

- `isTaskOverlapping(task, visibleStartDate, visibleEndDate)`: 주간/월간/날짜 cell에서 같은 overlap 조건을 사용한다.
- `clipDateRange(startDate, endDate, visibleStartDate, visibleEndDate)`: 화면에 표시할 실제 bar 기간을 visible range 안으로 자른다.
- `formatTaskDateRange(startDate, endDate)`: 업무 기간 표시 문자열을 만든다. 시작일과 종료일이 같으면 날짜를 한 번만 반환한다.
- `splitMonthTasks(tasks, monthRangeBarMinDays)`: 월간 progress bar 대상과 날짜 cell 목록 대상을 분리해 중복 표시를 막는다.
- `invokeConfiguredCallback(instance, callbackName, functionNameOption, args)`: `onTaskClick` 같은 inline callback을 우선 호출하고, 없으면 JSP 전역 functionName fallback을 호출한다.
- `buildRangeChangePayload(action, previousRange)`: 기간 변경 custom function에 전달할 payload를 만든다.
- `loadRemoteData(action, previousRange)`: 기간 변경 데이터 로딩 custom function을 호출하고 응답을 처리한다.
- `updateDataFromResponse(response)`: 응답에 포함된 `employees`, `tasks`, `holidays`만 내부 데이터에 반영한다.
- `getTaskColorClass(task, options)`: 모든 view의 업무 색상 class 계산 entry point다.
- `getStatusTaskColorClass(task)`: status 값을 `wt-task-status-*` class로 변환한다.
- `getRandomTaskColorClass(task, options)`: task seed hash를 `wt-task-color-random-N` class로 변환한다.
- `hashString(value)`: deterministic random 색상을 위한 문자열 hash를 계산한다.
- `statusClass(status)`: status 값을 안정적인 `wt-task-status-*` class로 변환한다.

## 주간 view 렌더링 흐름

`weeklyDisplayMode`가 `timeline`이면 기존 timeline 렌더링을 사용한다.

1. `getVisibleRange()`로 주간 range 계산
2. `groupVisibleTasks(employees, tasks, range)`로 직원별 visible task 그룹 생성
3. `filterEmployeesWithVisibleTasks()`로 업무가 없는 직원 제거
4. `renderDateHeader()`로 7일 header 생성
5. 직원별로 `buildLanes()`를 실행하여 겹치는 업무 lane 분리
6. `renderTimelineRow()`에서 날짜 cell과 task bar 렌더링
7. `renderTaskBar()`는 left/width percent로 bar 위치를 계산

주간 view는 직원 row timeline이다.

## 주간 cardSection 렌더링 흐름

`weeklyDisplayMode`가 `cardSection`이면 직원별 timeline 대신 7일 카드 섹션을 렌더링한다.

1. `getVisibleRange()`로 주간 range 계산
2. `buildWeekRangeItems(tasks, range)`로 visible range와 겹치는 업무를 clipped range item으로 변환
3. `buildLanes(rangeItems)`로 기간이 겹치는 card/bar를 서로 다른 lane에 배치
4. `buildEmployeeMap(employees)`로 담당자 fallback 정보를 준비
5. `renderWeekCardSections()`가 7개 날짜 background/drop target column을 생성
6. `renderWeekRangeBar()`가 `left`/`width` percent로 날짜 범위를 span하는 card/bar를 렌더링

cardSection은 날짜별 작은 카드 목록이 아니라, 업무 card/bar 자체가 시작일~종료일 column을 가로지르는 주간 UX다. 이전 주에 시작한 업무는 `visibleStartDate`부터 clipped bar로 표시한다. 기존 직원별 timeline bar를 대체하지 않는 version2 실험 기능이다.

card/bar 계산 규칙:

```text
displayStartDate = max(task.startDate, visibleStartDate)
displayEndDate = min(task.endDate, visibleEndDate)
startOffset = daysBetween(visibleStartDate, displayStartDate)
endOffset = daysBetween(visibleStartDate, displayEndDate)
left = (startOffset / 7) * 100%
width = ((endOffset - startOffset + 1) / 7) * 100%
```

하루짜리 업무는 `startOffset == endOffset`인 1일 span card/bar로 표시한다. 여러 업무 기간이 겹치면 `buildLanes()`가 다음 lane으로 내려 겹침을 피한다.

## 주간 cardSection drag 흐름

cardSection의 drag는 native HTML5 drag event를 사용한다. 이 흐름은 `enableTaskDrag: true`이고 task가 수정 가능할 때만 활성화된다.

1. `isTaskEditable(task)`: `task.canEdit`이 boolean이면 그 값을 사용하고, 없으면 `defaultTaskEditable`을 사용한다.
2. `canDragTask(task)`: `enableTaskDrag === true AND isTaskEditable(task)` 조건을 확인한다.
3. `renderWeekRangeBar()`: drag 가능하면 `draggable="true"`, `wt-task-drag-enabled`, `wt-week-card-draggable`, `wt-task-editable`을 부여한다. 수정 불가이면 `wt-task-drag-disabled`, `wt-task-readonly`를 부여한다.
4. `dragstart`: `.wt-week-task-card`에서 task key를 저장하고 `wt-card-dragging` class를 추가한다.
5. `dragover`: `.wt-week-card-day[data-wt-date]` 위에서 drop을 허용하고 `wt-drop-target-active` class를 추가한다.
6. `drop`: drop target의 `data-wt-date`를 새 시작일로 사용한다.
7. `moveTaskByDrag()`: 기존 기간을 유지해 새 종료일을 계산한다.
8. 내부 task의 `startDate`, `endDate`를 변경한다.
9. `onTaskMove` 또는 `taskMoveFunctionName`을 호출한다.
10. `render()`로 cardSection을 다시 렌더링한다.
11. card/bar 위치는 변경된 `startDate`, `endDate` 기준으로 다시 계산된다.

서버 저장은 수행하지 않는다. 사용하는 업무 시스템이 move callback에서 AJAX 저장, 권한 체크, 승인 처리를 담당한다.

drag 후 브라우저가 click 이벤트를 이어서 발생시킬 수 있으므로 `suppressTaskClickUntil`로 짧은 시간 동안 task click을 무시한다.

`enableTaskDrag: false`이거나 `isTaskEditable(task) === false`이면 `renderWeekRangeBar()`가 `draggable` 속성을 만들지 않는다. `handleCardDragStart()`, `handleCardDragOver()`, `handleCardDrop()`, `moveTaskByDrag()`도 옵션과 task 권한을 다시 확인해 시작일 변경과 move callback 호출을 차단한다. 이 옵션은 주간 `cardSection`에만 적용하며 기존 `timeline`과 월간 view에는 영향을 주지 않는다.

## 주간 cardSection 종료일 변경 흐름

cardSection 업무 card/bar는 double click으로 종료일 변경 modal을 열 수 있다. 이 흐름은 `canEditTaskEndDate(task)`, 즉 `enableTaskEndDateEdit === true AND isTaskEditable(task)`일 때만 활성화된다.

1. card click은 `delayTaskClick()`으로 짧게 지연한다.
2. `dblclick`이 들어오면 지연 click timer를 취소한다.
3. `openEndDateModal(taskKey)`가 내부 modal을 표시한다.
4. 사용자가 새 종료일을 입력하고 적용한다.
5. `applyEndDateModal()`이 `YYYY-MM-DD` 형식과 `newEndDate >= task.startDate`를 검증한다.
6. `changeTaskEndDate()`가 권한을 다시 확인한 뒤 내부 `task.endDate`를 변경한다.
7. view를 다시 렌더링하고 `onTaskEndDateChange` 또는 `taskEndDateChangeFunctionName`을 호출한다.
8. card/bar 길이는 변경된 `endDate` 기준으로 다시 계산된다.

종료일 변경도 서버 저장을 직접 수행하지 않는다. 사용하는 업무 시스템이 callback에서 저장 API를 호출한다.

수정 불가 업무에서 double click이 발생하면 modal을 열지 않고 `onTaskEndDateChange`/`taskEndDateChangeFunctionName`도 호출하지 않는다. 단, 업무 상세 click은 기존 click callback 흐름을 유지한다.

## 월간 view 렌더링 흐름

1. `getVisibleRange()`로 기준 월의 `startDate`, `endDate` 계산
2. `getVisibleTasks(tasks, range)`로 월과 겹치는 task만 선별
3. `splitMonthTasks(tasks, monthRangeBarMinDays)`로 progress bar 대상 `rangeTasks`와 날짜 cell 목록 대상 `dayListTasks`를 분리
4. `buildMonthCalendarDays(range, weekStartsOn)`로 달력에 필요한 앞/뒤 날짜 포함
5. 7일씩 잘라 `renderMonthWeekRow()` 호출
6. week row마다 날짜 cell layer와 task bar layer를 렌더링

월간 view는 직원 row timeline이 아니라 일반 7열 calendar grid다.

## 월간 연속 bar 렌더링 구조

월간 view의 업무 bar는 날짜 cell 안에 반복 렌더링하지 않는다.

`monthRangeBarMinDays` 기본값은 `2`다. `durationDays >= monthRangeBarMinDays`인 업무는 progress bar 대상이며, 날짜 cell 목록과 `... N` 계산에서 제외한다. `durationDays < monthRangeBarMinDays`인 업무는 날짜 cell 목록 대상이다.

```text
month view
└─ week row
   ├─ date cells layer
   │  ├─ date number
   │  ├─ holiday name
   │  ├─ visible day task labels
   │  └─ date-cell ... N
   └─ task bars layer
      ├─ task bar lane 1
      └─ task bar lane 2
```

현재 DOM class:

- `wt-month-week-row`
- `wt-month-week-days`
- `wt-month-day`
- `wt-month-week-bars`
- `wt-month-bar`
- `wt-month-day-task`
- `wt-month-day-more`
- `wt-month-cell-more`

`wt-month-week-days`와 `wt-month-week-bars`는 같은 week row 좌표계를 공유한다. 날짜 숫자/휴일명은 위쪽 영역, bar lane은 아래쪽 영역에 배치한다.

월간 `... N`은 task bar layer의 week row overflow가 아니라 날짜 cell별 overflow다.

1. `renderMonthDay(dateText, today, holidayMap, dayListTasks)`가 날짜 cell을 렌더링한다.
2. `getTasksOnDate(dayListTasks, dateText)`가 `task.startDate <= dateText AND task.endDate >= dateText` 기준으로 해당 날짜의 목록 대상 업무만 계산한다.
3. `visibleDayTasks = dayTasks.slice(0, maxVisibleTasksPerDay)`를 날짜 cell 안에 업무 label로 표시한다.
4. `hiddenDayTasks = dayTasks.slice(maxVisibleTasksPerDay)`가 있으면 같은 날짜 cell 안에 `... N`을 표시한다.
5. `onMoreClick(date, hiddenTasks, allTasks)`에는 클릭한 날짜와 해당 날짜 기준 `hiddenTasks`, `allTasks`만 전달한다.

주 전체 업무가 많아도 날짜별 day-list 업무 수가 제한 이하이면 `... N`은 표시하지 않는다. week row 전체 업무 목록이나 progress bar 업무를 기준으로 `... N`을 계산하지 않는다.

## 날짜 계산 규칙

모든 날짜 계산은 `YYYY-MM-DD` date-only 문자열 기준이다.

- `parseDateOnly()`
- `formatDate()`
- `addDays()`
- `dayDiff()`
- `startOfWeek()`
- `monthStart()`
- `monthEnd()`
- `addMonths()`

시간, timezone, timestamp 기반 계산을 추가하지 않는다.

## Task overlap 계산 규칙

업무는 visible range와 하루라도 겹치면 표시한다.

```text
task.startDate <= visibleEndDate
AND
task.endDate >= visibleStartDate
```

화면 표시 범위:

```text
displayStartDate = max(task.startDate, visibleStartDate)
displayEndDate = min(task.endDate, visibleEndDate)
```

이 규칙은 주간/월간 모두 동일하다.

## 월간 segment 계산 규칙

업무 기간이 한 주를 넘어가면 week row 단위로 segment를 나눈다.

```text
displayStartDate = max(task.startDate, visibleStartDate)
displayEndDate = min(task.endDate, visibleEndDate)

segmentStartDate = max(displayStartDate, weekStartDate)
segmentEndDate = min(displayEndDate, weekEndDate)
```

segment 유효 조건:

```text
segmentStartDate <= segmentEndDate
```

CSS grid 배치:

```text
grid-column-start = dayOfWeek(segmentStartDate) + 1
grid-column-end = dayOfWeek(segmentEndDate) + 2
```

현재 구현은 `grid-column: start / span spanDays`를 사용한다.


## 업무 색상 class 계산 흐름

```text
render task
  -> getTaskColorClass(task, options)
  -> taskColorMode 확인
  -> status: wt-task-status-* 반환
  -> random: hash(seed) % randomTaskColorPaletteSize
  -> wt-task-color-random-N 반환
  -> DOM element class에 적용
```

random 모드의 기본 seed는 `task.taskId`다. `taskColorSeedField`가 지정되면 해당 field를 우선 사용하고, 값이 없으면 `taskId`, `title + startDate + employeeId` 순서로 fallback한다. 이 계산은 주간 timeline, 주간 cardSection, 월간 progress bar, 월간 날짜 cell 업무 item에서 같은 helper를 사용한다.

색상 class와 권한 class는 분리되어 있다. 예를 들어 `taskColorMode: 'random'`이고 `canEdit: false`인 cardSection 업무는 `wt-task-color-random-N`과 `wt-task-readonly`를 함께 가진다. 상태값은 색상 class와 별개로 `data-wt-status`와 원본 task에 유지한다.

## 업무 기간 표시 문자열 흐름

업무 기간 텍스트는 `formatTaskDateRange(startDate, endDate)`를 사용한다.

```text
startDate == endDate -> startDate
startDate != endDate -> startDate ~ endDate
```

예:

```text
2026-06-12 ~ 2026-06-12  X
2026-06-12               O
2026-06-12 ~ 2026-06-15  O
```

이 formatter는 주간 timeline title, 주간 cardSection card/bar 본문과 title, 월간 날짜 cell 업무 item title, 월간 progress bar title, 월간 `... N` modal 업무 목록에서 사용한다. 날짜 계산, overlap, clipping, drag/drop 동작에는 관여하지 않는다.

## 이벤트 바인딩 구조

이벤트는 instance 내부 `this.handlers` 배열에 저장한다.

- toolbar click: `prev`, `today`, `next`, `setView`
- content click: task click, `... N` click, modal close, employee click
- 업무 클릭은 timeline bar, 월간 bar, 주간 cardSection 카드 모두 `onTaskClick` 우선, 없으면 `taskClickFunctionName`
- 업무 이동은 주간 cardSection 카드 drag 완료 시 `onTaskMove` 우선, 없으면 `taskMoveFunctionName`
- 종료일 변경은 주간 cardSection 카드 double click modal 적용 시 `onTaskEndDateChange` 우선, 없으면 `taskEndDateChangeFunctionName`
- callback/functionName 호출 우선순위는 `invokeConfiguredCallback()`에서 공통으로 관리한다.
- card/bar 전체가 이벤트 대상이며 내부 decorative arrow는 별도 callback을 발생시키지 않는다.
- `... N` 클릭은 `onMoreClick` 우선, `false`가 아니면 기본 modal

날짜 변경 callback payload는 `task`, 업무/부서/직원 식별 필드, 변경 전후 날짜, `changeType`, `source: 'cardSection'`을 공통으로 포함한다. 기존 callback 이름은 유지한다.

`enableTaskDrag: false`이거나 task가 수정 불가이면 업무 이동 callback은 호출하지 않는다. `enableTaskEndDateEdit: false`이거나 task가 수정 불가이면 종료일 변경 callback은 호출하지 않는다.

taskCalendar는 로그인 사용자를 조회하지 않으며 `canEdit`을 프론트 UI 제어 값으로만 사용한다. 최종 수정 권한은 서버 저장 API가 `taskId`와 로그인 사용자를 기준으로 반드시 재검증해야 한다.

## destroy 시 정리해야 할 대상

`destroy()`는 다음을 처리한다.

- 등록된 event listener 제거
- modal 제거
- root class 제거
- container 내부 DOM 비우기
- jQuery data 제거

새로 window/document event를 추가하면 반드시 `this.on()` 또는 동일한 정리 흐름에 포함해야 한다.

## 수정 시 주의사항

- `wt-` prefix 없는 class를 추가하지 않는다.
- 주간 stacking과 월간 segment stacking은 비슷하지만 별도 함수다.
- 월간 bar를 다시 날짜 cell 내부 반복 item 방식으로 되돌리지 않는다.
- 주간 `cardSection`은 실험 기능이므로 기존 `timeline` 기본값과 DOM 구조를 깨지 않는다.
- 날짜 비교는 문자열 비교가 가능하도록 `YYYY-MM-DD` 형식을 유지한다.
- `apiUrl` 실제 loading은 미구현이므로 API 기능을 문서나 UI에서 구현 완료처럼 표현하지 않는다.
- jQuery plugin 이름 변경은 사용 예시, README, demo, 문서를 함께 수정해야 한다.
