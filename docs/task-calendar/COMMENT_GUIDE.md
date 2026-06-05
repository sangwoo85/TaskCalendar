# COMMENT_GUIDE.md

## 목적

이 문서는 `workTimeline` 코드를 유지보수할 때 주석을 어떤 기준으로 남길지 정의한다.

## 주석 원칙

1. 무엇을 하는 코드인지보다 왜 필요한 코드인지 설명한다.
2. 단순 코드 해석 주석은 작성하지 않는다.
3. 날짜 계산, overlap 계산, clipping 계산에는 주석을 남긴다.
4. 월간 segment 계산에는 주석을 남긴다.
5. cardSection 긴 card/bar 위치 계산에는 주석을 남긴다.
6. drag/drop 날짜 변경 처리에는 주석을 남긴다.
7. double click 종료일 변경 처리에는 주석을 남긴다.
8. click/double click/drag 충돌 방지 로직에는 주석을 남긴다.
9. public method와 callback 설명에는 JSDoc 스타일 주석을 우선 사용한다.

## 주석을 남겨야 하는 영역

- `getVisibleRange()`: week/month visible range 결정
- `isDateOnly()`, `parseDateOnly()`, `dayDiff()`, `addDays()`: date-only 계산
- `isTaskOverlapping()`, `clipDateRange()`: 공통 overlap 조건과 visible range clipping
- `groupVisibleTasks()`, `getVisibleTasks()`: 공통 overlap 조건을 사용하는 visible task 선별
- `buildWeekRangeItems()`: cardSection 긴 card/bar 위치 계산
- `buildLanes()`: 주간 timeline/cardSection lane stacking
- `splitMonthTasks()`, `getTaskDurationDays()`: 월간 progress bar 업무와 날짜 cell 목록 업무 분리
- `buildMonthWeekSegments()`: 월간 week row segment 계산
- `buildMonthSegmentLanes()`: 월간 bar lane stacking
- `isTaskEditable()`, `canDragTask()`, `canEditTaskEndDate()`: 외부 권한 값을 UI 동작에 반영하는 조건
- `handleCardDrop()`, `moveTaskByDrag()`: drag/drop 날짜 변경
- `delayTaskClick()`, `handleCardDoubleClick()`: click/double click 충돌 방지
- `changeTaskEndDate()`: double click 종료일 변경 반영
- `buildTaskChangePayload()`, `buildTaskClickPayload()`: callback payload 생성
- `invokeConfiguredCallback()`: inline callback과 JSP 전역 functionName fallback 호출 순서
- `statusClass()`: status 값과 CSS class 연결
- `unbindEvents()`, `destroy()`: DOM/event cleanup

## 좋은 주석 예시

```javascript
/**
 * 현재 표시 기간과 업무 기간이 겹치는지 확인한다.
 * 주간/월간 모두 동일한 overlap 기준을 사용한다.
 *
 * 날짜는 YYYY-MM-DD date-only 문자열 기준으로 비교한다.
 */
function isTaskOverlapping(task, visibleStartDate, visibleEndDate) {
  ...
}
```

```javascript
/**
 * cardSection mode에서 업무 기간을 7일 주간 grid 기준의 column 범위로 변환한다.
 * 여러 날 업무는 날짜별 카드가 아니라 하나의 긴 card/bar로 렌더링된다.
 */
function calculateWeeklyCardBarRange(task, visibleStartDate, visibleEndDate) {
  ...
}
```

```javascript
/**
 * double click 시 단일 click callback이 중복 실행되지 않도록
 * click 실행을 지연시키고 dblclick 발생 시 click timer를 취소한다.
 */
function bindTaskCardEvents($card, task) {
  ...
}
```

## 나쁜 주석 예시

```javascript
// i 증가
i++;
```

```javascript
// 버튼 클릭
$button.on('click', function () {});
```

```javascript
// task 렌더링
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
- JSON 계약은 `API_SPEC.md`에 둔다.
- DOM 구조와 CSS 원칙은 `DESIGN_GUIDE.md`와 `ARCHITECTURE.md`에 둔다.
- 코드 주석은 해당 규칙을 왜 코드에서 특별히 처리하는지 짧게 연결한다.
