# CUSTOMIZE_GUIDE.md

## 목적

이 문서는 현재 구현된 `workTimeline` MVP를 수정하거나 옵션을 조정할 때 참고하는 문서다. 구현되지 않은 기능은 “미구현” 또는 “예정”으로 표시한다.

## 주요 option 목록

```javascript
{
  viewType: 'week',
  currentDate: null,
  visibleStartDate: null,
  visibleEndDate: null,
  todayDate: null,
  weekStartsOn: 1,
  tasks: [],
  employees: [],
  holidays: [],
  apiUrl: null,
  employeeColumnWidth: 220,
  dayCellMinWidth: 96,
  maxVisibleTasksPerDay: 3,
  maxVisibleTaskBarsPerWeek: 3,
  taskClickFunctionName: null,
  onTaskClick: null,
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
| `employees` | 구현 | direct data 직원 목록 |
| `tasks` | 구현 | direct data 업무 목록 |
| `holidays` | 구현 | direct data 휴일 목록 |
| `apiUrl` | 구조만 있음 | 실제 AJAX loading은 미구현. pending 상태를 표시함 |
| `employeeColumnWidth` | 구현 | 주간 직원 컬럼 너비 |
| `dayCellMinWidth` | 구현 | 주간 날짜 cell 최소 너비 |
| `maxVisibleTasksPerDay` | 호환 유지 | 기존 월간 item 방식 옵션. 현재 월간 bar 방식에서는 `maxVisibleTaskBarsPerWeek`가 우선 |
| `maxVisibleTaskBarsPerWeek` | 구현 | 월간 week row에 표시할 bar lane 최대 개수 |
| `taskClickFunctionName` | 구현 | `onTaskClick`이 없을 때 호출할 전역 함수 이름 |

## Callback 목록

| Callback | 구현 상태 | 호출 시점 |
| --- | --- | --- |
| `onInit(instance)` | 구현 | 초기 렌더 후 |
| `onRangeChange(range, instance)` | 구현 | view 변경, 이동, today, goTo 후 |
| `onDataLoaded(data, instance)` | 구현 | `setData()` 호출 후 |
| `onTaskClick(task, context, event)` | 구현 | 업무 bar 클릭 시 |
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

## 월간 `... N` 표시 개수 수정 방법

월간 bar overflow는 `maxVisibleTaskBarsPerWeek`로 제어한다.

```javascript
$('#taskCalendar').workTimeline({
  viewType: 'month',
  maxVisibleTaskBarsPerWeek: 4,
  tasks: demoTasks,
  employees: demoEmployees
});
```

`maxVisibleTasksPerDay`는 현재 코드에서 fallback으로만 사용된다. 새 월간 bar 표시 기준은 `maxVisibleTaskBarsPerWeek`를 사용한다.

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

기본 modal을 사용하지 않으려면 `onMoreClick`에서 직접 팝업을 열고 `false`를 반환한다.

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

월간 bar layer, lane, overflow를 수정할 때는 `renderMonthWeekRow()`, `buildMonthWeekSegments()`, `buildMonthSegmentLanes()`, `renderMonthSegmentBar()`를 함께 확인한다.
