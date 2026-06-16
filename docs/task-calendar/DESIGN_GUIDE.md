# DESIGN_GUIDE.md

## 디자인 원칙

`taskCalendar`는 업무 시스템 안에서 반복적으로 사용하는 운영 UI다. 장식보다 읽기 쉬움, 예측 가능한 동작, 좁은 화면에서도 유지되는 정보 밀도를 우선한다.

- 업무명, 담당자, 기간, 상태를 빠르게 읽을 수 있어야 한다.
- 색상은 상태 구분을 돕는 수준으로 제한한다.
- 기존 JSP 업무 시스템의 레이아웃과 CSS를 침범하지 않는다.
- 큰 hero, 카드형 마케팅 레이아웃, 과한 그림자와 장식은 사용하지 않는다.
- 전체 캘린더 영역은 흰색 배경, 둥근 모서리, 얇은 border, 약한 shadow를 가진 card형 UI로 표시한다.
- 배경과 경계선은 연한 회색/흰색 계열을 사용하고, 주요 상호작용과 active 상태에는 부드러운 파란색을 사용한다.
- 상태 색상은 강한 원색 대신 업무 시스템에서 오래 보아도 부담 없는 soft color를 사용한다.
- 상태별 색상 변경은 CSS의 `wt-task-status-*` class에서 처리하고 JavaScript에 색상값을 hard-code하지 않는다.
- 랜덤 색상 모드는 `wt-task-color-random-*` class를 사용하며 실제 palette 색상은 CSS에서만 관리한다.

## Layout

기본 구조는 다음과 같다.

```text
.wt-root
  .wt-toolbar
  .wt-grid (week view)
    .wt-employee-column
    .wt-timeline
      .wt-date-header
      .wt-timeline-body
  .wt-week-card-sections (week cardSection mode)
    .wt-week-card-day
      .wt-week-task-card
  .wt-month (month view)
    .wt-month-weekdays
    .wt-month-grid
      .wt-month-week-row
        .wt-month-week-days
        .wt-month-week-bars
```

## Toolbar

toolbar에는 view 이동과 현재 기간 표시를 배치한다.

- 왼쪽: 이전, 오늘, 다음 버튼
- 가운데 또는 왼쪽 다음: 현재 기간 label
- 오른쪽: `week` / `month` view 전환 control
- 버튼은 작고 명확한 텍스트를 사용한다.
- 업무 시스템 안에서 Bootstrap 버튼과 함께 배치되어도 어색하지 않은 크기를 유지한다.
- toolbar 버튼은 둥근 pill 또는 둥근 사각형 형태를 사용한다.
- 기본 버튼은 흰색 배경과 연한 border를 사용하고, hover 시 연한 파란색 배경 또는 파란색 border로 반응한다.
- 현재 선택된 view button은 파란색 배경과 흰색 텍스트로 명확히 구분한다.

권장 class:

- `wt-toolbar`
- `wt-toolbar-button`
- `wt-toolbar-title`
- `wt-view-switch`
- `wt-view-switch-button`

## 직원 컬럼

직원 컬럼은 고정 너비를 기본으로 한다.

- 이름은 가장 중요한 정보로 표시한다.
- 부서, 직급, 사번 등 보조 정보는 작은 텍스트로 표시할 수 있다.
- timeline body가 세로 스크롤될 때 직원 row와 timeline row의 높이가 항상 일치해야 한다.
- 가로 스크롤 시 직원 컬럼은 sticky 처리를 권장한다.
- 직원 컬럼은 주간 보기에서만 사용하고, 월간 보기에서는 표시하지 않는다.

권장 class:

- `wt-employee-column`
- `wt-employee-row`
- `wt-employee-name`
- `wt-employee-meta`

## 날짜 헤더

날짜 header는 visible range의 각 날짜를 동일 너비 cell로 표시한다.

- 주간 보기: 7개 날짜 cell
- 월간 보기: 7개 요일 컬럼을 가진 calendar grid
- 오늘 날짜는 별도 class로 표시한다.
- 주말은 은은하게 구분할 수 있다.
- 일요일은 빨간색 계열, 토요일은 파란색 계열로 구분한다.
- 휴일과 대체휴일은 일요일과 동일한 빨간색 계열로 구분하고 휴일명을 함께 표시한다.
- 월간 보기 날짜 칸은 날짜 숫자와 휴일명을 표시하고, 업무 bar는 week row의 별도 bar 영역에 표시한다.
- 월간 날짜 칸은 연한 border로 구분하고 내부 여백을 두어 휴일명이 답답해 보이지 않게 한다.
- 월간 날짜 cell layer와 task bar layer는 같은 week row 좌표계를 공유하되, 날짜 숫자/휴일명 영역과 bar lane 영역은 겹치지 않게 분리한다.
- 월간 task bar layer는 날짜 cell 내부에 업무를 반복 append하지 않는다.
- 월간 progress bar로 표시되는 업무는 날짜 cell 내부 목록에 중복 표시하지 않는다.
- 기본값 `monthRangeBarMinDays: 2`에서는 여러 날짜 업무는 progress bar, 하루짜리 업무는 날짜 cell 목록으로 표시한다.
- 월간 날짜 cell 안에는 일자별 업무 label을 `maxVisibleTasksPerDay` 개수까지만 표시하고, 초과분은 같은 날짜 cell 안에 `... N`으로 표시한다.
- 월간 `... N`은 week row 하단이 아니라 해당 날짜 cell 안에서 날짜 숫자, 휴일명, 업무 label 다음 순서로 표시한다.
- 업무 bar 때문에 날짜 cell border가 끊기거나 업무가 있는 날짜 위쪽에 별도 선이 생기지 않아야 한다.
- 오늘 날짜는 연한 파란색 배경 또는 얇은 파란색 inset border로 강조한다.
- 휴일명은 날짜 숫자 아래에 작게 표시하고 긴 이름은 ellipsis 처리한다.
- 일요일/토요일/휴일 색상은 날짜 숫자에만 의존하지 않고 날짜 cell 전체 배경에도 은은하게 적용할 수 있다.

권장 class:

- `wt-date-header`
- `wt-date-cell`
- `wt-date-cell-today`
- `wt-date-cell-weekend`
- `wt-date-sunday`
- `wt-date-saturday`
- `wt-date-holiday`
- `wt-date-substitute-holiday`
- `wt-holiday-name`
- `wt-day-sunday`
- `wt-day-saturday`
- `wt-month`
- `wt-month-weekdays`
- `wt-month-grid`
- `wt-month-week-row`
- `wt-month-week-days`
- `wt-month-week-bars`
- `wt-month-day`
- `wt-month-day-today`
- `wt-month-day-task-list`
- `wt-month-day-task`
- `wt-month-day-more`
- `wt-month-cell-more`
- `wt-month-bar`
- `wt-month-more`

## Timeline body

timeline body는 employee row와 1:1로 대응한다.

- 날짜 cell grid와 task bar가 같은 좌표계를 사용해야 한다.
- row 경계선은 옅게 표시한다.
- timeline body는 주간 보기에서 사용한다.
- 월간 보기는 timeline body 대신 `wt-month-grid` calendar grid를 사용한다.
- 세로 스크롤은 전체 grid 또는 body 영역 중 하나로 일관되게 처리한다.
- 주간 timeline은 직원 컬럼과 날짜 영역의 구분을 유지하되, grid line은 연하고 얇게 표시한다.
- 오늘 column은 연한 파란색 배경으로 강조한다.

권장 class:

- `wt-timeline`
- `wt-timeline-body`
- `wt-timeline-row`
- `wt-timeline-cell`
- `wt-scroll-area`

## Week cardSection

`weeklyDisplayMode: 'cardSection'`은 version2 실험용 주간 UX다.

- 7일을 동일한 날짜 column grid로 표시한다.
- 업무는 날짜 column 안에 작은 카드로 나열하지 않고, 시작일~종료일 column을 가로지르는 긴 card/bar로 표시한다.
- 날짜 column은 header, drop target, 배경 grid 역할을 한다.
- 업무 card/bar는 업무명, 부서/담당자, 기간, 상태를 순서대로 표시한다.
- 카드가 길어져도 날짜 섹션 grid가 깨지지 않도록 제목과 보조 텍스트는 ellipsis 처리한다.
- drag 가능한 카드는 `grab` cursor를 사용한다.
- drag 중인 카드는 약한 opacity로 표시하고, drop 가능한 날짜 섹션은 연한 파란색 highlight를 사용한다.
- drag feedback은 기존 cardSection 디자인을 깨지 않는 수준의 최소 스타일로 제한한다.
- 업무 card/bar를 double click하면 종료일 변경 modal을 표시한다.
- 종료일 변경 modal은 기존 업무용 card형 modal 톤을 따르되, 월간 `... N` modal과 class를 분리한다.
- 종료일 입력은 기본 text input을 사용하고 외부 date picker를 사용하지 않는다.
- 유효성 오류는 modal 안의 짧은 메시지와 alert로 확인 가능해야 한다.
- 일요일/토요일/휴일 색상은 기존 주간/월간 규칙과 같은 방향을 따른다.
- 여러 날 업무는 하나의 card/bar가 visible range 안에서 clipping되어 span된다.
- card/bar 끝부분에는 진행 방향을 암시하는 작은 arrow 느낌을 줄 수 있다.
- 이전 주에 시작한 업무는 bar 앞쪽에 이어짐 표시를, 다음 주까지 이어지는 업무는 bar 끝쪽에 이어짐 표시를 둘 수 있다.
- card/bar 내부 decorative element는 카드 click, drag, double click을 방해하지 않아야 한다.
- `enableTaskDrag: true`인 card/bar는 `wt-task-drag-enabled` class와 `grab` cursor로 drag 가능 상태를 표시한다.
- `enableTaskDrag: false`인 card/bar는 `wt-task-drag-disabled` class를 사용하고 `move`/`grab` cursor나 drop target highlight를 사용하지 않는다.
- `canEdit: true`인 업무는 `wt-task-editable`, `canEdit: false` 또는 기본 정책상 수정 불가인 업무는 `wt-task-readonly` class를 사용한다.
- `wt-task-readonly`는 약한 opacity, dashed border, 기본 pointer cursor 정도로만 구분하고 과한 잠금 아이콘은 사용하지 않는다.
- 수정 불가 업무도 click 상세는 가능해야 하므로 hover 스타일은 유지하되 drag 가능한 느낌을 주지 않는다.
- drag 잠금 상태에서도 click 상세와 double click 종료일 변경이 가능해야 하므로 잠금 아이콘 같은 과한 표현은 1차 구현에서 사용하지 않는다.
- 상태별 색상은 기존 task status class에서 관리하고 JavaScript에 색상값을 hard-code하지 않는다.

권장 class:

- `wt-week-card-sections`
- `wt-week-card-day`
- `wt-week-day-section`
- `wt-week-day-drop-target`
- `wt-week-card-day-header`
- `wt-week-card-day-title`
- `wt-week-card-weekday`
- `wt-week-card-date`
- `wt-week-card-count`
- `wt-week-task-card`
- `wt-week-range-bar`
- `wt-week-range-bar-start`
- `wt-week-range-bar-end`
- `wt-week-range-bar-single`
- `wt-week-range-content`
- `wt-week-card-draggable`
- `wt-task-drag-enabled`
- `wt-task-drag-disabled`
- `wt-task-editable`
- `wt-task-readonly`
- `wt-week-task-title`
- `wt-week-task-owner`
- `wt-week-task-period`
- `wt-week-task-status`
- `wt-week-card-empty`
- `wt-card-dragging`
- `wt-drop-target-active`
- `wt-end-date-modal-backdrop`
- `wt-end-date-modal-card`
- `wt-end-date-modal-title`
- `wt-end-date-modal-body`
- `wt-end-date-modal-input`
- `wt-end-date-modal-error`
- `wt-end-date-modal-actions`

## Task bar

task bar는 업무 기간을 나타내는 핵심 요소다.

- bar의 왼쪽은 `displayStartDate`, 오른쪽은 `displayEndDate`에 맞춘다.
- 업무명이 길면 말줄임 처리한다.
- hover 시 title 또는 tooltip으로 전체 업무명을 확인할 수 있어야 한다.
- 클릭 가능한 경우 cursor를 명확히 표시한다.
- 같은 직원 row에서 겹치는 업무는 lane으로 분리해 겹치지 않게 표시한다.
- 월간 보기에서는 업무 기간을 calendar week row 안에서 이어지는 bar로 표시한다.
- 월간 bar가 week row를 넘으면 다음 week row에 별도 segment bar로 나누어 표시한다.
- 같은 week row 안의 월간 bar는 하나의 긴 pill처럼 보여야 하며 날짜 column마다 끊어진 item처럼 보이면 안 된다.
- 월간 bar에는 `[부서/직원] 업무명`을 표시하고 긴 업무명은 말줄임 처리한다.
- 월간 휴일명은 bar 영역보다 위에 표시하고 긴 이름은 ellipsis 처리한다.
- 월간 날짜 cell에서 일자별 표시 개수를 초과한 업무는 같은 날짜 cell 안의 `... N` 버튼으로 표시한다.
- 주간 task bar는 둥근 pill 형태로 표시하고, 텍스트는 작지만 선명하게 읽히도록 한다.
- 월간 task bar는 작은 soft pill 형태로 표시한다.
- `... N`은 클릭 가능한 작은 label로 표시하고 hover 시 약하게 강조한다.

권장 class:

- `wt-task-bar`
- `wt-month-bar`
- `wt-task-title`
- `wt-task-lane`
- `wt-task-clickable`
- `wt-modal-overlay`
- `wt-modal`
- `wt-modal-task`

## 상태별 스타일

상태 class는 task bar에 추가한다.

- `wt-task-status-todo`: 예정 또는 대기
- `wt-task-status-in-progress`: 진행 중
- `wt-task-status-done`: 완료
- `wt-task-status-delayed`: 지연
- `wt-task-status-hold`: 보류

권장 스타일 방향:

- `TODO`: 연한 회색/파란색
- `IN_PROGRESS`: 연한 파란색 또는 민트색
- `DONE`: 연한 초록색
- `DELAYED`: 연한 빨간색
- `HOLD`: 연한 노란색/주황색

색상만으로 의미를 전달하지 않고, 필요하면 label이나 tooltip에서도 status를 확인할 수 있게 한다.


## 업무 색상 모드

업무 색상은 `taskColorMode` option으로 제어한다.

- `status`: 기본값이며 기존 상태값 기반 soft color를 사용한다.
- `random`: task seed 기반 deterministic random color를 사용한다.
- random 모드는 주간 timeline, 주간 cardSection, 월간 progress bar, 월간 날짜 cell 업무 item에 동일하게 적용한다.
- 같은 `taskId`는 view가 바뀌어도 같은 `wt-task-color-random-N` class를 사용한다.
- `canEdit: false` 업무는 random 색상 class와 `wt-task-readonly` class를 함께 가져야 한다.
- 색상 palette를 바꿀 때는 CSS의 `wt-task-color-random-*` class만 수정한다.

## Modal

월간 보기에서 `... N` 클릭 시 표시되는 modal은 단순하고 업무용 화면에 어울리는 card형 popup으로 표시한다.

- 화면 중앙에 배치한다.
- 흰색 배경, 둥근 모서리, 얇은 border, 약한 shadow를 사용한다.
- 상단에는 날짜 제목과 닫기 버튼을 배치한다.
- 휴일명이 있으면 제목 아래 또는 요약 영역 위에 표시한다.
- 내부 업무 목록은 최대 높이를 두고 스크롤 가능하게 한다.
- 업무 항목은 구분선 또는 작은 card 형태로 분리한다.

## Today indicator

오늘 날짜가 visible range 안에 있으면 세로 indicator를 표시한다.

- header cell에는 `wt-date-cell-today`를 추가한다.
- body에는 `wt-today-indicator`를 표시한다.
- 업무 bar보다 과하게 눈에 띄지 않되, 현재 위치를 즉시 파악할 수 있어야 한다.

## Scroll behavior

- 직원 컬럼은 가로 스크롤 시 고정되는 sticky 동작을 권장한다.
- 날짜 header는 세로 스크롤 시 고정되는 sticky 동작을 고려한다.
- sticky를 적용할 때 z-index는 `wt-` 내부에서만 최소한으로 사용한다.
- 스크롤 동기화가 필요한 경우 `destroy()`에서 event listener를 반드시 제거한다.
- 월간 view의 날짜 칸은 7열 grid 안에서 유지하며, 업무명이 길면 ellipsis 처리한다.

## CSS naming 규칙

- 모든 class는 `wt-` prefix로 시작한다.
- id selector를 스타일 기준으로 사용하지 않는다.
- `body`, `table`, `button`, `div` 같은 전역 element selector에 직접 스타일을 주지 않는다.
- Bootstrap, jQuery UI, 사내 공통 CSS와 충돌할 수 있는 이름을 피한다.
- 상태 modifier는 `wt-task-status-*` 형식을 사용한다.
- 랜덤 색상 modifier는 `wt-task-color-random-*` 형식을 사용한다.
- root class 아래 scoped selector를 사용한다.

예시:

```css
.wt-root .wt-toolbar-button {
  /* future implementation */
}
```

## 접근성과 사용성

- 버튼에는 명확한 텍스트 또는 `aria-label`을 제공한다.
- keyboard focus가 사라지지 않게 한다.
- task bar 클릭 callback이 있으면 keyboard 접근도 고려한다.
- 작은 화면에서는 직원 컬럼과 날짜 cell이 지나치게 좁아지지 않도록 최소 너비를 둔다.
