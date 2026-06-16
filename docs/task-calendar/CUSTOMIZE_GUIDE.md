# CUSTOMIZE_GUIDE.md

## 목적

이 문서는 현재 구현된 `workTimeline` MVP를 수정하거나 옵션을 조정할 때 참고하는 문서다. 구현되지 않은 기능은 “미구현” 또는 “예정”으로 표시한다.

옵션 이름, callback 이름, JSON field 이름은 JSP 화면과 직접 연결되므로 기존 이름을 삭제하거나 의미를 바꾸지 않는다. 내부 중복 제거가 필요하면 공통 helper를 추가하되 외부 API는 유지한다.

## 주요 option 목록

```javascript
{
  viewType: 'week',
  currentDate: null,
  visibleStartDate: null,
  visibleEndDate: null,
  todayDate: null,
  weekStartsOn: 1,
  weeklyDisplayMode: 'timeline',
  enableTaskDrag: true,
  enableTaskEndDateEdit: true,
  defaultTaskEditable: false,
  tasks: [],
  employees: [],
  holidays: [],
  apiUrl: null,
  employeeColumnWidth: 220,
  dayCellMinWidth: 96,
  maxVisibleTasksPerDay: 3,
  maxVisibleTaskBarsPerWeek: 3,
  monthRangeBarMinDays: 2,
  taskColorMode: 'status',
  randomTaskColorPaletteSize: 8,
  taskColorSeedField: 'taskId',
  taskClickFunctionName: null,
  taskMoveFunctionName: null,
  taskEndDateChangeFunctionName: null,
  onTaskClick: null,
  onTaskMove: null,
  onTaskEndDateChange: null,
  onMoreClick: null
}
```

| Option | 구현 상태 | 설명 |
| --- | --- | --- |
| `viewType` | 구현 | `week` 또는 `month` |
| `currentDate` | 구현 | 현재 view 기준일 |
| `visibleStartDate`, `visibleEndDate` | 구현 | 주간 view 고정 범위 테스트용. 월간 view는 `currentDate` 기준 월 범위를 사용 |
| `todayDate` | 구현 | today 표시 기준값 |
| `weekStartsOn` | 구현 | `0` 일요일 시작, `1` 월요일 시작 |
| `weeklyDisplayMode` | 구현 | 주간 표시 방식. `timeline` 또는 `cardSection` |
| `enableTaskDrag` | 구현 | 주간 `cardSection` 업무 card/bar drag 시작일 변경 허용 여부. 기본값 `true` |
| `enableTaskEndDateEdit` | 구현 | 주간 `cardSection` 업무 card/bar double click 종료일 변경 허용 여부. 기본값 `true` |
| `defaultTaskEditable` | 구현 | task의 `canEdit`이 없을 때 수정 가능 여부. 기본값 `false` |
| `employees` | 구현 | direct data 직원 목록 |
| `tasks` | 구현 | direct data 업무 목록 |
| `holidays` | 구현 | direct data 휴일 목록 |
| `apiUrl` | 구조만 있음 | 실제 AJAX loading은 미구현. pending 상태를 표시함 |
| `employeeColumnWidth` | 구현 | 주간 직원 컬럼 너비 |
| `dayCellMinWidth` | 구현 | 주간 날짜 cell 최소 너비 |
| `maxVisibleTasksPerDay` | 구현 | 월간 날짜 cell 하나에 표시할 day-list 업무 label 최대 개수 |
| `maxVisibleTaskBarsPerWeek` | 구현 | 월간 week row에 표시할 bar lane 최대 개수 |
| `monthRangeBarMinDays` | 구현 | 월간 progress bar로 표시할 최소 업무 기간 일수. 기본값 `2` |
| `taskColorMode` | 구현 | 업무 색상 정책. `status` 또는 `random`, 기본값 `status` |
| `randomTaskColorPaletteSize` | 구현 | `wt-task-color-random-N` palette class 개수. 기본값 `8` |
| `taskColorSeedField` | 구현 | random 색상 계산 기준 task field. 기본값 `taskId` |
| `taskClickFunctionName` | 구현 | `onTaskClick`이 없을 때 호출할 전역 함수 이름 |
| `taskMoveFunctionName` | 구현 | `onTaskMove`가 없을 때 cardSection drag 완료 후 호출할 전역 함수 이름 |
| `taskEndDateChangeFunctionName` | 구현 | `onTaskEndDateChange`가 없을 때 cardSection 종료일 변경 후 호출할 전역 함수 이름 |

## Callback 목록

| Callback | 구현 상태 | 호출 시점 |
| --- | --- | --- |
| `onInit(instance)` | 구현 | 초기 렌더 후 |
| `onRangeChange(range, instance)` | 구현 | view 변경, 이동, today, goTo 후 |
| `onDataLoaded(data, instance)` | 구현 | `setData()` 호출 후 |
| `onTaskClick(task, payload, event)` | 구현 | 업무 bar 클릭 시. 첫 번째 인자 `task`는 기존 호환 유지 |
| `onTaskMove(payload)` | 구현 | `enableTaskDrag: true`이고 task가 수정 가능할 때 cardSection 업무 card/bar drag 완료 시 |
| `onTaskEndDateChange(payload)` | 구현 | `enableTaskEndDateEdit: true`이고 task가 수정 가능할 때 cardSection 업무 card/bar 종료일 변경 완료 시 |
| `onMoreClick(date, hiddenTasks, allTasks)` | 구현 | 월간 `... N` 클릭 시 |
| `onEmployeeClick(employee, event)` | 구현 | 주간 직원 row 클릭 시 |
| `onError(error, instance)` | 구현 | 잘못된 날짜 또는 미구현 API loading 경로 |

## 상태값별 CSS class

업무 상태는 `normalizeStatus()`를 통해 다음 값만 허용한다.

- `TODO`
- `IN_PROGRESS`
- `DONE`
- `DELAYED`
- `HOLD`

CSS class는 다음 형식으로 붙는다.

```text
wt-task-status-todo
wt-task-status-in-progress
wt-task-status-done
wt-task-status-delayed
wt-task-status-hold
```

주간 bar와 월간 bar 모두 같은 상태 class를 사용한다.

## 토요일/일요일/휴일 색상 수정 방법

수정 대상 CSS:

```css
.wt-root .wt-day-sunday { ... }
.wt-root .wt-day-saturday { ... }
.wt-root .wt-month-day.wt-day-sunday { ... }
.wt-root .wt-month-day.wt-day-saturday { ... }
.wt-root .wt-date-holiday,
.wt-root .wt-date-substitute-holiday { ... }
.wt-root .wt-month-day.wt-date-holiday,
.wt-root .wt-month-day.wt-date-substitute-holiday { ... }
```

휴일은 요일과 관계없이 일요일과 같은 빨간색 계열로 표시한다. class 이름은 반드시 `wt-` prefix를 유지한다.

## 업무 bar 색상 수정 방법

상태별 색상은 `src/work-timeline.css`의 `wt-task-status-*` class에서 수정한다.

```css
.wt-root .wt-task-status-in-progress {
  border-color: #bfdbfe;
  background: #dbeafe;
  color: #1d4ed8;
}
```

JavaScript에 색상값을 hard-code하지 않는다.

## 업무 기간 표시 문자열 수정 방법

업무 기간 텍스트는 공통 formatter에서 만든다. `startDate`와 `endDate`가 같으면 날짜를 한 번만 표시하고, 서로 다르면 `startDate ~ endDate` 형식으로 표시한다.

```text
2026-06-12 ~ 2026-06-12  X
2026-06-12               O
2026-06-12 ~ 2026-06-15  O
```

이 규칙은 주간 timeline, 주간 cardSection, 월간 날짜 cell 업무 item, 월간 progress bar title, 월간 `... N` modal, demo callback alert에 동일하게 적용한다. 표시 문자열만 바꾸며 날짜 계산, drag/drop, clipping 로직은 바꾸지 않는다.


## 업무 색상 모드와 palette 수정 방법

`taskColorMode`는 모든 업무 표시 요소의 색상 class 계산에 적용된다.

```javascript
$('#taskCalendar').workTimeline({
  taskColorMode: 'random',
  taskColorSeedField: 'taskId',
  randomTaskColorPaletteSize: 8,
  tasks: demoTasks,
  employees: demoEmployees
});
```

- `status`: 기존 `wt-task-status-*` class를 사용한다.
- `random`: `taskId` 기준 hash로 `wt-task-color-random-N` class를 사용한다.
- 같은 `taskId`는 주간/월간과 새로고침 후에도 같은 class를 사용한다.
- `canEdit: false` 업무는 random 색상 class와 `wt-task-readonly` class가 함께 적용된다.

랜덤 palette는 CSS에서 수정한다. JavaScript에 hex 색상값을 추가하지 않는다.

```css
.wt-root .wt-task-color-random-0 {
  border-color: #bfdbfe;
  background: #dbeafe;
  color: #1d4ed8;
}

.wt-root .wt-task-color-random-1 {
  border-color: #bbf7d0;
  background: #dcfce7;
  color: #15803d;
}

.wt-root .wt-task-color-random-2 { ... }
```

## 월간 `... N` 표시 개수 수정 방법

월간 `... N`은 날짜 cell별 day-list 업무 개수로 계산한다. `maxVisibleTasksPerDay`는 날짜 cell 하나에 표시할 최대 day-list 업무 label 개수다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'month',
  maxVisibleTasksPerDay: 3,
  monthRangeBarMinDays: 2,
  tasks: demoTasks,
  employees: demoEmployees
});
```

월간 업무는 먼저 progress bar 업무와 날짜 cell 목록 업무로 분리한다.

```text
durationDays >= monthRangeBarMinDays
  -> progress bar 대상, 날짜 cell 목록과 ... N 계산에서 제외

durationDays < monthRangeBarMinDays
  -> 날짜 cell 목록 대상
```

기본값 `monthRangeBarMinDays: 2`에서는 하루짜리 업무만 날짜 cell 목록에 표시하고, 2일 이상 업무는 progress bar로 표시한다.

날짜별 업무 목록은 day-list 업무만 대상으로 다음 기준으로 계산한다.

```text
dayTasks = tasks.filter(task =>
  task.startDate <= currentDate
  AND task.endDate >= currentDate
)

visibleTasks = dayTasks.slice(0, maxVisibleTasksPerDay)
hiddenTasks = dayTasks.slice(maxVisibleTasksPerDay)
```

`hiddenTasks.length > 0`일 때만 해당 날짜 cell 안에 `... N`을 표시한다. progress bar 업무는 `... N` 계산과 modal에 포함하지 않는다. 주 전체 업무가 많다는 이유만으로 `... N`을 표시하지 않는다. `maxVisibleTaskBarsPerWeek`는 연속 bar layer의 lane 표시 제한 용도이며, 날짜 cell `... N` 계산 기준이 아니다.

## 업무 클릭 function 변경 방법

간단한 JSP 화면에서는 전역 함수를 지정할 수 있다.

```javascript
function openTaskDetail(task) {
  alert(task.title);
}

$('#taskCalendar').workTimeline({
  taskClickFunctionName: 'openTaskDetail'
});
```

더 명확한 방식은 `onTaskClick` callback이다.

```javascript
$('#taskCalendar').workTimeline({
  onTaskClick: function (task, context, event) {
    openTaskPopup(task.taskId);
  }
});
```

`onTaskClick`이 있으면 `taskClickFunctionName`은 호출되지 않는다.

## Modal/popup 디자인 수정 방법

월간 `... N` 기본 modal은 다음 class를 사용한다.

- `wt-modal-overlay`
- `wt-modal`
- `wt-modal-header`
- `wt-modal-title`
- `wt-modal-close`
- `wt-modal-summary`
- `wt-modal-task-list`
- `wt-modal-task`

기본 modal을 사용하지 않으려면 `onMoreClick`에서 직접 팝업을 열고 `false`를 반환한다. `date`는 클릭한 날짜이고, `hiddenTasks`와 `allTasks`는 해당 날짜에 포함되는 업무 목록만 전달된다.

```javascript
$('#taskCalendar').workTimeline({
  onMoreClick: function (date, hiddenTasks, allTasks) {
    openCustomMorePopup(date, hiddenTasks, allTasks);
    return false;
  }
});
```

## 주간에서 업무 없는 직원 숨김 처리 기준

주간 view는 `employees`가 있더라도 visible range와 겹치는 업무가 없는 직원 row를 표시하지 않는다.

```text
task.startDate <= visibleEndDate
AND
task.endDate >= visibleStartDate
```

직원 row를 항상 표시하는 옵션은 현재 미구현이다.

## 주간 cardSection 수정 방법

`weeklyDisplayMode: 'cardSection'`은 주간 view를 7개 날짜 섹션으로 표시한다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'week',
  weeklyDisplayMode: 'cardSection',
  tasks: demoTasks,
  employees: demoEmployees
});
```

cardSection은 업무를 주간 7일 grid 위에 긴 card/bar로 표시한다. 이전 주에 시작한 업무는 `visibleStartDate`부터, 다음 주까지 이어지는 업무는 `visibleEndDate`까지 clipping한 card/bar로 표시한다. 직원별 row timeline을 보고 싶다면 `weeklyDisplayMode: 'timeline'`을 사용한다.

card/bar 표시 조건:

```text
task.startDate <= visibleEndDate
AND task.endDate >= visibleStartDate
```

card/bar 표시 범위:

```text
displayStartDate = max(task.startDate, visibleStartDate)
displayEndDate = min(task.endDate, visibleEndDate)
```

card/bar 위치:

```text
startIndex = daysBetween(visibleStartDate, displayStartDate)
endIndex = daysBetween(visibleStartDate, displayEndDate)
left = (startIndex / 7) * 100%
width = ((endIndex - startIndex + 1) / 7) * 100%
```

card/bar 전체가 click, drag/drop, double click 이벤트 대상이다.

cardSection 업무 card/bar는 `enableTaskDrag: true`일 때 native HTML5 drag로 다른 날짜 섹션에 이동할 수 있다. 이동은 기존 기간을 유지하는 `keepDuration` 방식이다.

```text
durationDays = oldEndDate - oldStartDate + 1
newEndDate = newStartDate + durationDays - 1
```

drag 완료 후 내부 `task.startDate`, `task.endDate`를 변경하고 `onTaskMove` 또는 `taskMoveFunctionName`을 호출한다. taskCalendar는 서버 저장 API를 호출하지 않는다.

`enableTaskDrag: false`이면 card/bar에 `draggable` 속성을 부여하지 않고 시작일 변경을 수행하지 않는다. 이 경우 `onTaskMove`와 `taskMoveFunctionName`은 호출되지 않으며, click 상세와 double click 종료일 변경은 유지된다.

task별 수정 권한은 `canEdit`으로 제어한다. `canEdit: true`인 업무만 drag 시작일 변경과 double click 종료일 변경이 가능하다. `canEdit: false`인 업무는 `wt-task-readonly` class가 붙고, 수정 callback은 호출되지 않는다. `canEdit`이 없는 업무는 `defaultTaskEditable`을 따르며 기본값은 `false`이다.

권한 판단은 taskCalendar 내부에서 로그인 사용자를 조회하지 않는다. 외부 업무 시스템이 로그인 사용자 기준으로 권한을 계산한 뒤 `canEdit`과 전역 option을 전달한다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'week',
  weeklyDisplayMode: 'cardSection',
  enableTaskDrag: true,
  enableTaskEndDateEdit: true,
  defaultTaskEditable: false,
  tasks: [
    { taskId: 'T001', title: '수정 가능 업무', startDate: '2026-06-02', endDate: '2026-06-05', canEdit: true },
    { taskId: 'T002', title: '수정 불가 업무', startDate: '2026-06-03', endDate: '2026-06-06', canEdit: false }
  ]
});
```

`canEdit`은 프론트 UI 제어용이다. 서버 저장 API는 `taskId`와 로그인 사용자를 기준으로 권한을 반드시 다시 검증해야 한다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'week',
  weeklyDisplayMode: 'cardSection',
  enableTaskDrag: userCanEditSchedule,
  taskMoveFunctionName: 'onTaskMoveDummy'
});
```

스타일 수정 대상:

```css
.wt-root .wt-week-card-sections { ... }
.wt-root .wt-week-card-day { ... }
.wt-root .wt-week-task-card { ... }
.wt-root .wt-week-range-bar { ... }
.wt-root .wt-week-range-bar-start { ... }
.wt-root .wt-week-range-bar-end { ... }
.wt-root .wt-week-range-content { ... }
.wt-root .wt-task-drag-enabled { ... }
.wt-root .wt-task-drag-disabled { ... }
.wt-root .wt-task-editable { ... }
.wt-root .wt-task-readonly { ... }
.wt-root .wt-week-task-title { ... }
.wt-root .wt-week-task-owner { ... }
.wt-root .wt-week-task-period { ... }
.wt-root .wt-week-task-status { ... }
.wt-root .wt-card-dragging { ... }
.wt-root .wt-drop-target-active { ... }
```

drag 후에는 `render()`가 다시 실행되어 card/bar 위치가 새 `startDate`, `endDate` 기준으로 재계산된다.

업무 card/bar를 double click하면 종료일 변경 modal이 열린다. 종료일 변경은 내부 `task.endDate`만 변경하며 시작일은 바꾸지 않는다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'week',
  weeklyDisplayMode: 'cardSection',
  taskEndDateChangeFunctionName: 'onTaskEndDateChangeDummy'
});
```

종료일 변경 modal 스타일 수정 대상:

```css
.wt-root .wt-end-date-modal-backdrop { ... }
.wt-root .wt-end-date-modal-card { ... }
.wt-root .wt-end-date-modal-input { ... }
.wt-root .wt-end-date-modal-error { ... }
.wt-root .wt-end-date-modal-actions { ... }
```

종료일 유효성:

```text
newEndDate는 YYYY-MM-DD 형식
newEndDate >= task.startDate
```

종료일 변경 성공 후에도 `render()`가 다시 실행되어 card/bar 길이가 새 `endDate` 기준으로 재계산된다.

날짜 변경 callback payload는 공통 식별 필드를 포함한다.

```javascript
{
  task: task,
  taskId: task.taskId,
  title: task.title,
  departmentId: task.departmentId,
  departmentName: task.departmentName,
  employeeId: task.employeeId,
  employeeName: task.employeeName,
  oldStartDate: '2026-06-02',
  oldEndDate: '2026-06-04',
  newStartDate: '2026-06-05',
  newEndDate: '2026-06-07',
  changeType: 'move',
  source: 'cardSection'
}
```

## 월간에서 업무 bar를 이어서 표시하는 기준

월간 view는 날짜 cell 안에 업무를 반복 append하지 않는다. 월 visible range로 업무를 잘라낸 뒤, week row별 segment를 만든다.

```text
displayStartDate = max(task.startDate, visibleStartDate)
displayEndDate = min(task.endDate, visibleEndDate)

segmentStartDate = max(displayStartDate, weekStartDate)
segmentEndDate = min(displayEndDate, weekEndDate)
```

segment가 유효하면 week row의 `.wt-month-week-bars` layer에 `.wt-month-bar`를 렌더링한다.

```text
segmentStartDate <= segmentEndDate
```

월간 bar layer와 lane을 수정할 때는 `renderMonthWeekRow()`, `buildMonthWeekSegments()`, `buildMonthSegmentLanes()`, `renderMonthSegmentBar()`를 함께 확인한다. 날짜 cell별 `... N`은 `renderMonthDay()`, `getTasksOnDate()`, `renderMoreButton()` 흐름을 확인한다.
