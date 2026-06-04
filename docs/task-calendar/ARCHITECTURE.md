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

## 데이터 정규화 흐름

- `arrayOrEmpty()`로 배열 option을 방어적으로 처리한다.
- `normalizeHolidays()`는 유효한 `YYYY-MM-DD` 날짜와 `name`이 있는 휴일만 유지한다.
- task는 렌더링 단계에서 `startDate`, `endDate` 유효성 및 기간 역전을 검사한다.
- status는 `normalizeStatus()`로 허용 목록 외 값을 `TODO`로 처리한다.

## 주간 view 렌더링 흐름

1. `getVisibleRange()`로 주간 range 계산
2. `groupVisibleTasks(employees, tasks, range)`로 직원별 visible task 그룹 생성
3. `filterEmployeesWithVisibleTasks()`로 업무가 없는 직원 제거
4. `renderDateHeader()`로 7일 header 생성
5. 직원별로 `buildLanes()`를 실행하여 겹치는 업무 lane 분리
6. `renderTimelineRow()`에서 날짜 cell과 task bar 렌더링
7. `renderTaskBar()`는 left/width percent로 bar 위치를 계산

주간 view는 직원 row timeline이다.

## 월간 view 렌더링 흐름

1. `getVisibleRange()`로 기준 월의 `startDate`, `endDate` 계산
2. `getVisibleTasks(tasks, range)`로 월과 겹치는 task만 선별
3. `buildMonthCalendarDays(range, weekStartsOn)`로 달력에 필요한 앞/뒤 날짜 포함
4. 7일씩 잘라 `renderMonthWeekRow()` 호출
5. week row마다 날짜 cell layer와 task bar layer를 렌더링

월간 view는 직원 row timeline이 아니라 일반 7열 calendar grid다.

## 월간 연속 bar 렌더링 구조

월간 view의 업무 bar는 날짜 cell 안에 반복 렌더링하지 않는다.

```text
month view
└─ week row
   ├─ date cells layer
   │  ├─ date number
   │  └─ holiday name
   └─ task bars layer
      ├─ task bar lane 1
      ├─ task bar lane 2
      └─ more indicator
```

현재 DOM class:

- `wt-month-week-row`
- `wt-month-week-days`
- `wt-month-day`
- `wt-month-week-bars`
- `wt-month-bar`
- `wt-month-week-more`

`wt-month-week-days`와 `wt-month-week-bars`는 같은 week row 좌표계를 공유한다. 날짜 숫자/휴일명은 위쪽 영역, bar lane은 아래쪽 영역에 배치한다.

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

## 이벤트 바인딩 구조

이벤트는 instance 내부 `this.handlers` 배열에 저장한다.

- toolbar click: `prev`, `today`, `next`, `setView`
- content click: task click, `... N` click, modal close, employee click
- 업무 클릭은 `onTaskClick` 우선, 없으면 `taskClickFunctionName`
- `... N` 클릭은 `onMoreClick` 우선, `false`가 아니면 기본 modal

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
- 날짜 비교는 문자열 비교가 가능하도록 `YYYY-MM-DD` 형식을 유지한다.
- `apiUrl` 실제 loading은 미구현이므로 API 기능을 문서나 UI에서 구현 완료처럼 표현하지 않는다.
- jQuery plugin 이름 변경은 사용 예시, README, demo, 문서를 함께 수정해야 한다.
