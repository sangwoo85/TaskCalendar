# COMMENT_GUIDE.md

## 목적

이 문서는 `taskCalendar` 구현 코드를 유지보수할 때 주석을 어떤 기준으로 남길지 정의한다.

## 주석 원칙

1. 무엇을 하는 코드인지보다 왜 필요한 코드인지 설명한다.
2. 단순한 코드 해석 주석은 작성하지 않는다.
3. 날짜 계산, 월간 segment 계산, overflow 처리, destroy 처리에는 주석을 남긴다.
4. public method와 callback에는 JSDoc 스타일 주석을 작성한다.
5. 복잡한 DOM 구조에는 짧은 구조 설명 주석을 작성한다.
6. 임시 구현이나 TODO는 명확히 표시한다.

## 주석을 남겨야 하는 영역

- `getVisibleRange()`: week/month visible range 결정
- `parseDateOnly()`, `dayDiff()`, `addDays()`: date-only 계산
- `groupVisibleTasks()`: overlap 조건과 직원별 그룹핑
- `buildLanes()`: 주간 task stacking
- `buildMonthWeekSegments()`: 월간 week row segment 계산
- `buildMonthSegmentLanes()`: 월간 bar lane stacking
- `renderMonthWeekRow()`: date cells layer와 task bars layer 구조
- `renderMoreButton()`, `openMoreModal()`: overflow 표시와 기본 modal
- `destroy()`, `unbindEvents()`: DOM/event cleanup

## JSDoc 권장 대상

현재 코드는 JSDoc이 많지 않다. 다음 public method에는 향후 JSDoc을 우선 추가한다.

- `render()`
- `reload()`
- `setView(viewType)`
- `goTo(dateText)`
- `prev()`
- `next()`
- `today()`
- `setData(employees, tasks)`
- `setHolidays(holidays)`
- `destroy()`

Callback 설명에는 전달 인자를 명시한다.

```javascript
/**
 * 업무 bar 클릭 시 호출한다.
 *
 * @callback onTaskClick
 * @param {Object} task 원본 task object
 * @param {Object} context 표시 range와 segment context
 * @param {MouseEvent} event 클릭 이벤트
 */
```

## 좋은 주석 예시

```javascript
// 월간 view에서는 업무가 한 주를 넘어갈 수 있으므로,
// 하나의 task를 week row 단위의 segment로 나누어 렌더링한다.
function buildMonthTaskSegments(task, weeks) {
  ...
}
```

```javascript
/**
 * 현재 표시 기간과 업무 기간이 겹치는지 확인한다.
 * 날짜는 YYYY-MM-DD date-only 문자열을 기준으로 비교한다.
 *
 * @param {Object} task
 * @param {string} visibleStartDate
 * @param {string} visibleEndDate
 * @returns {boolean}
 */
function isTaskVisible(task, visibleStartDate, visibleEndDate) {
  ...
}
```

```javascript
// destroy 이후 비동기 callback이나 이벤트가 DOM을 다시 만지지 않도록
// instance에 등록한 listener를 모두 제거한다.
this.unbindEvents();
```

## 나쁜 주석 예시

```javascript
// i를 1 증가시킨다.
i++;
```

```javascript
// 버튼 클릭 이벤트
$('.btn').click(function () {});
```

```javascript
// task를 렌더링한다.
renderTask(task);
```

위와 같은 주석은 코드가 이미 말하고 있는 내용을 반복하므로 작성하지 않는다.

## TODO 작성 기준

TODO는 임시 구현의 이유와 제거 조건을 함께 적는다.

```javascript
// TODO(api-loading): apiUrl 실제 AJAX 연동이 들어오면 pending 상태 대신
// 현재 visible range로 GET 요청을 보내고 onDataLoaded/onError를 호출한다.
```

피해야 할 TODO:

```javascript
// TODO 나중에 수정
```

## 문서와 주석의 관계

- 기능 규칙은 `FEATURE_SPEC.md`에 먼저 정리한다.
- DOM 구조와 CSS 원칙은 `DESIGN_GUIDE.md`와 `ARCHITECTURE.md`에 둔다.
- 코드 주석은 해당 규칙을 왜 코드에서 특별히 처리하는지 짧게 연결한다.
