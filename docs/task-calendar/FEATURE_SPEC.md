# FEATURE_SPEC.md

## 목적

`taskCalendar`는 직원별 업무 기간을 주간 또는 월간 타임라인으로 표시하는 JavaScript UI 컴포넌트다. 직원은 세로 row로 배치하고, 각 업무는 시작일~종료일 범위를 가로 bar로 표시한다.

일반 캘린더의 시간 슬롯, 반복 일정, 개인 일정 관리 기능은 범위에 포함하지 않는다.

현재 MVP 구현 파일은 `src/work-timeline.js`, `src/work-timeline.css`이며 jQuery plugin 이름은 `workTimeline`이다. `taskCalendar`는 프로젝트/컴포넌트 명칭이고, `taskCalendar` plugin alias는 아직 구현되어 있지 않다.

이 문서는 현재 `version2_card_section` 브랜치 구현 기준을 따른다. 문서에 “예정”, “미구현”으로 표시된 항목은 현재 동작으로 간주하지 않는다.

## 지원 view

### 주간 보기
- 기준일이 속한 주를 표시한다.
- 기본 주 시작일은 월요일로 한다.
- 옵션으로 `weekStartsOn`을 제공할 수 있으며 값은 `0`(일요일) 또는 `1`(월요일)을 우선 지원한다.
- `weeklyDisplayMode` 옵션으로 `timeline` 또는 `cardSection`을 선택할 수 있다.
- `enableTaskDrag` 옵션으로 주간 `cardSection` 업무 card/bar의 시작일 drag 변경을 켜거나 끌 수 있다.
- `enableTaskEndDateEdit` 옵션으로 주간 `cardSection` 업무 card/bar의 double click 종료일 변경을 켜거나 끌 수 있다.
- task별 `canEdit` 값과 `defaultTaskEditable` 옵션으로 수정 가능한 업무만 drag/종료일 변경을 허용한다.
- 기본값은 기존 호환성을 위해 `timeline`이다.
- 날짜 header는 7일을 표시한다.
- 업무 bar는 해당 주와 겹치는 기간만 잘라서 표시한다.
- 일요일 column은 빨간색 계열, 토요일 column은 파란색 계열로 구분한다.
- `holidays` 데이터에 포함된 날짜는 요일과 관계없이 일요일과 같은 빨간색 계열로 구분하고 휴일명을 표시한다.
- 해당 주의 visible range와 겹치는 업무가 없는 직원은 표시하지 않는다.

#### 주간 `timeline` 모드
- 기존 직원별 row timeline 구조를 사용한다.
- 직원은 세로 row로 배치하고, 업무는 visible range와 겹치는 기간만큼 bar로 표시한다.
- 같은 직원의 겹치는 업무는 lane stacking으로 분리한다.
- 해당 주 visible range와 겹치는 업무가 없는 직원은 표시하지 않는다.

#### 주간 `cardSection` 모드
- version2 실험 기능이다.
- 주간 7일을 날짜 섹션으로 표시한다.
- 날짜 섹션은 배경 column과 drop target 역할을 하며, 업무는 주간 grid 위의 긴 card/bar로 표시한다.
- 업무 card/bar는 업무명, 부서명, 담당자명, 시작일, 종료일, 상태를 표시한다.
- 업무 card/bar 클릭은 기존 `onTaskClick` 또는 `taskClickFunctionName` 흐름을 그대로 사용한다.
- 업무 card/bar는 native drag로 다른 날짜 섹션에 이동할 수 있다.
- drag 이동은 `keepDuration` 방식이며, 기존 업무 기간을 유지한 채 `startDate`와 `endDate`를 함께 변경한다.
- 같은 날짜에 drop한 경우 날짜 변경과 move callback을 수행하지 않는다.
- drag 완료 후에는 `onTaskMove` 또는 `taskMoveFunctionName`을 호출한다.
- `enableTaskDrag: false`이면 업무 card/bar에 `draggable` 속성을 부여하지 않고 시작일 변경, 내부 task 데이터 변경, `onTaskMove`/`taskMoveFunctionName` 호출을 수행하지 않는다.
- `enableTaskDrag: false`이어도 업무 click 상세와 double click 종료일 변경은 기존처럼 유지한다.
- drag 시작일 변경 가능 조건은 `enableTaskDrag === true AND task.canEdit === true`이다.
- double click 종료일 변경 가능 조건은 `enableTaskEndDateEdit === true AND task.canEdit === true`이다.
- `task.canEdit`이 `undefined`이면 `defaultTaskEditable` option을 따른다. 기본값은 보안상 `false`이다.
- `canEdit: false` 업무는 drag/종료일 변경 callback을 호출하지 않지만 업무 click 상세는 기존처럼 가능하다.
- taskCalendar는 로그인 사용자나 권한을 직접 조회하지 않는다. 외부 업무 시스템/API가 task별 권한 결과를 계산해 `canEdit`으로 전달한다.
- `canEdit`은 프론트 UI 제어용이며, 최종 수정 권한 검증은 서버 저장 API에서 다시 수행해야 한다.
- 업무 card/bar를 double click하면 종료일 변경 modal을 표시한다.
- 종료일 변경 modal에는 업무명, 시작일, 현재 종료일, 새 종료일 입력란을 표시한다.
- 새 종료일은 `YYYY-MM-DD` 형식이어야 하며 `task.startDate`보다 빠를 수 없다.
- 종료일 변경 성공 후 내부 `task.endDate`를 변경하고 `onTaskEndDateChange` 또는 `taskEndDateChangeFunctionName`을 호출한다.
- taskCalendar는 서버 저장을 직접 수행하지 않는다. DB 저장, API 호출, 권한 체크, 승인 처리는 사용하는 업무 시스템의 move callback에서 처리한다.
- taskCalendar는 drag 이동과 종료일 변경 모두 서버 저장을 직접 수행하지 않는다. 실제 저장은 각 callback에서 처리한다.
- drag 후 이어서 발생할 수 있는 click 이벤트와 double click 시 발생하는 단일 click 이벤트는 업무 상세 click과 중복되지 않도록 무시한다.
- `cardSection` 업무는 날짜별 작은 카드 나열이 아니라, 주간 7일 grid 위에서 `displayStartDate~displayEndDate`를 가로지르는 card/bar로 표시한다.
- 하루짜리 업무는 1일 column만 차지하는 card/bar로 표시한다.
- 여러 날 업무는 하나의 DOM card/bar가 시작일~종료일 column을 span한다.
- card/bar는 `displayStartDate = max(task.startDate, visibleStartDate)`, `displayEndDate = min(task.endDate, visibleEndDate)` 기준으로 clipping한다.
- 이전 주에 시작한 업무는 `visibleStartDate`부터, 다음 주까지 이어지는 업무는 `visibleEndDate`까지 clipped card/bar로 표시한다.
- card/bar 전체가 click, drag/drop, double click 이벤트 대상이다.

### 월간 보기
- 기준일이 속한 달의 1일부터 말일까지 표시한다.
- 일반 캘린더처럼 7개 요일 컬럼을 가진 calendar grid로 표시한다.
- 월간 보기는 직원별 row timeline이 아니다.
- 일요일 날짜와 요일 header는 빨간색 계열, 토요일 날짜와 요일 header는 파란색 계열로 구분한다.
- `holidays` 데이터에 포함된 날짜 칸은 일요일과 같은 빨간색 계열로 구분하고 날짜 숫자 아래에 휴일명을 표시한다.
- 한 주가 끝나면 다음 줄로 내려가며, 업무는 날짜별 반복 item이 아니라 기간을 잇는 bar 형태로 표시한다.
- 월간 업무 bar는 먼저 월 visible range로 잘라낸 뒤, calendar week row 단위로 다시 segment를 나누어 표시한다.
- 한 업무가 여러 주에 걸치면 각 week row마다 별도 segment bar로 표시하되, 클릭 callback에는 같은 원본 task를 전달한다.
- 업무 bar는 날짜 cell 내부에 날짜별로 반복 append하지 않고, week row 단위의 task bar layer에 한 번만 렌더링한다.
- `monthRangeBarMinDays` 이상인 업무는 progress bar 대상이며 날짜 cell 내부 목록에 중복 표시하지 않는다.
- 기본값 `monthRangeBarMinDays: 2`에서는 2일 이상 업무는 progress bar, 하루짜리 업무는 날짜 cell 목록으로 표시한다.
- 날짜 숫자/휴일명 영역과 task bar 영역은 분리하며, task bar 때문에 날짜 cell border가 끊기거나 별도 상단 선이 생기면 안 된다.
- 월간 보기에서 휴일명은 날짜 숫자 아래, 업무 bar 영역보다 위에 표시하며 overflow 제한 대상에 포함하지 않는다.
- 업무 bar에는 업무명과 부서/직원 이름이 함께 보여야 한다.
- `maxVisibleTasksPerDay`는 날짜 cell 하나에 표시할 최대 day-list 업무 label 개수다.
- 월간 `... N`은 week row가 아니라 날짜 cell별로 계산하고 해당 날짜 cell 안에 표시한다.
- 특정 날짜의 day-list 업무 포함 조건은 `task.startDate <= currentDate AND task.endDate >= currentDate`이며, progress bar 대상 업무는 제외한다.
- `... N` 버튼을 클릭하면 클릭한 날짜의 숨겨진 업무 목록만 단순 modal/popup으로 표시한다.
- `... N` modal에는 progress bar 대상 업무를 포함하지 않는다. progress bar 업무는 progress bar 클릭으로 상세 확인한다.
- 주 전체 업무가 많아도 날짜별 업무 수가 `maxVisibleTasksPerDay` 이하이면 `... N`을 표시하지 않는다.

## 이동 기능

- `prev`: 현재 view 기준으로 이전 주 또는 이전 달로 이동한다.
- `next`: 현재 view 기준으로 다음 주 또는 다음 달로 이동한다.
- `today`: 오늘 날짜가 포함된 주 또는 월로 이동한다.
- 이동 후 데이터 로딩이 필요한 경우 향후 `apiUrl` loading을 다시 호출한다. 현재 MVP에서는 direct data를 다시 렌더링한다.
- 이동 후 `onRangeChange` callback을 호출한다.

## 직원 row

- 직원 1명은 하나의 timeline row로 표시한다.
- 직원 row는 왼쪽 직원 컬럼과 오른쪽 timeline 영역으로 구성한다.
- 주간 `timeline` 모드에서는 해당 주 visible range와 겹치는 업무가 1개 이상 있는 직원만 표시한다.
- 해당 주와 겹치는 업무가 없는 직원은 employee 목록에 포함되어 있어도 숨긴다.
- 직원 정렬은 서버 응답 순서를 기본으로 유지한다.
- 옵션으로 향후 `employeeSort` callback을 확장할 수 있다.
- 직원 row 구조는 주간 보기에서만 사용한다.
- 월간 보기는 직원 row 없이 calendar week row 안에 업무 bar를 표시한다.

## 업무 bar 표시

업무는 다음 필드를 기준으로 표시한다.

- `id`: 업무 식별자
- `employeeId`: 소속 직원 식별자
- `title`: 업무명
- `startDate`: 업무 시작일
- `endDate`: 업무 종료일
- `status`: 업무 상태

업무 기간은 양 끝 날짜를 모두 포함한다. 예를 들어 `2026-06-01`부터 `2026-06-03`까지의 업무는 1일, 2일, 3일 총 3일에 걸쳐 표시한다.

## 업무 기간 겹침 조건

업무는 화면 기간과 하나라도 겹치면 표시한다.

```text
task.startDate <= visibleEndDate
AND
task.endDate >= visibleStartDate
```

화면에 표시할 실제 bar 범위는 다음과 같이 계산한다.

```text
displayStartDate = max(task.startDate, visibleStartDate)
displayEndDate = min(task.endDate, visibleEndDate)
```

이 규칙은 주간 보기와 월간 보기 모두 동일하게 적용한다.

월간 보기에서는 월 visible range로 잘라낸 업무를 calendar week row별 segment로 나눈다.

```text
taskDisplayStartDate = max(task.startDate, visibleStartDate)
taskDisplayEndDate = min(task.endDate, visibleEndDate)

segmentStartDate = max(taskDisplayStartDate, weekStartDate)
segmentEndDate = min(taskDisplayEndDate, weekEndDate)
segmentStartDate <= segmentEndDate
```

week row 안에서의 column 계산은 다음 기준을 사용한다.

```text
startColumn = dayOfWeek(segmentStartDate)
spanDays = daysBetween(segmentStartDate, segmentEndDate) + 1
```

## Holiday 표시

휴일 데이터는 `holidays` option으로 직접 주입할 수 있다.

```json
{
  "date": "2026-06-05",
  "name": "대체공휴일",
  "type": "SUBSTITUTE_HOLIDAY"
}
```

- `date`: 필수, `YYYY-MM-DD`
- `name`: 필수, 화면에 표시할 휴일명
- `type`: 선택, `HOLIDAY`, `SUBSTITUTE_HOLIDAY`, `COMPANY_HOLIDAY`, `TEMPORARY_HOLIDAY` 등
- 1차 구현에서는 type별 색상 차등을 두지 않고 모든 holiday를 일요일과 동일한 빨간색 계열로 표시한다.
- `SUBSTITUTE_HOLIDAY`는 실제 요일이 평일 또는 토요일이어도 빨간색 계열로 표시한다.
- 주간 보기에서는 날짜 header에 휴일명을 표시한다.
- 월간 보기에서는 날짜 숫자 아래, 업무 bar 영역 위에 휴일명을 표시한다.
- 월간 `... N` modal/popup은 week row overflow 목록을 표시한다. 날짜별 휴일 상세 modal이 필요한 경우 별도 확장으로 다룬다.

## 다중 업무 row stacking

같은 직원에게 같은 기간에 겹치는 업무가 여러 개 있으면 bar가 서로 덮이지 않도록 같은 직원 row 내부에서 여러 lane으로 쌓는다.

- 같은 lane에는 날짜가 겹치는 업무를 동시에 배치하지 않는다.
- 업무 정렬 기준은 `startDate ASC`, `endDate ASC`, `title ASC`를 기본으로 한다.
- 가장 위 lane부터 가능한 위치를 찾고, 배치 가능한 lane이 없으면 새 lane을 추가한다.
- 직원 row 높이는 필요한 lane 수에 따라 증가한다.
- 너무 많은 lane이 생기는 경우 향후 `maxLanes` 옵션과 overflow 표시를 추가할 수 있다.

## 상태 계산

기본 상태는 서버가 내려준 `task.status`를 우선 사용한다.

권장 status 값:

- `TODO`: 예정 또는 대기
- `IN_PROGRESS`: 진행 중
- `DONE`: 완료
- `DELAYED`: 지연
- `HOLD`: 보류

서버가 status를 제공하지 않는 경우 클라이언트는 오늘 날짜를 기준으로 보조 상태를 계산할 수 있다.

- `DONE` 판정은 서버 status가 있을 때만 한다.
- `startDate > today`: `TODO`
- `startDate <= today <= endDate`: `IN_PROGRESS`
- `endDate < today`: `DELAYED`

자동 계산은 표시 보조 용도이며, 실제 업무 상태의 원본은 서버 데이터로 간주한다.

## 데이터 로딩 방식

### API loading
- `apiUrl` 옵션이 있으면 view range 변경 시 HTTP GET 요청으로 데이터를 가져오는 구조를 목표로 한다.
- 현재 MVP에서는 실제 AJAX 요청은 미구현이며 pending/error 상태 구조만 준비되어 있다.
- 요청 parameter는 `API_SPEC.md`를 따른다.
- 로딩 중에는 loading 상태를 표시한다.
- 실패 시 error 상태를 표시하고 `onError` callback을 호출한다.

### Direct data loading
- `employees`와 `tasks` 배열을 직접 전달할 수 있다.
- `setData(employees, tasks)` public method로 화면 데이터를 갱신할 수 있다.
- direct data 방식에서도 날짜 겹침, stacking, 상태 표시 규칙은 동일하다.

## Public methods

현재 구현은 다음 method를 제공한다.

- `render()`: 현재 옵션과 데이터로 다시 렌더링한다.
- `reload()`: direct data 모드에서는 현재 데이터로 다시 렌더링한다. `apiUrl` 기반 실제 재조회는 미구현이다.
- `setView(viewType)`: `week` 또는 `month`로 view를 변경한다.
- `goTo(date)`: 지정한 `YYYY-MM-DD` 날짜가 포함된 view range로 이동한다.
- `prev()`: 이전 주 또는 이전 달로 이동한다.
- `next()`: 다음 주 또는 다음 달로 이동한다.
- `today()`: 오늘 날짜가 포함된 기간으로 이동한다.
- `setData(employees, tasks)`: 직접 데이터로 화면을 갱신한다.
- `destroy()`: DOM, event handler, 내부 상태를 정리한다.

## Options

- `maxVisibleTasksPerDay`: 월간 날짜 cell 하나에 표시할 최대 day-list 업무 label 개수, 기본값 `3`
- `maxVisibleTaskBarsPerWeek`: 월간 week row에 표시할 업무 bar lane 최대 개수, 기본값 `3`
- `monthRangeBarMinDays`: 월간 progress bar로 표시할 최소 업무 기간 일수, 기본값 `2`
- `weeklyDisplayMode`: 주간 표시 방식, `timeline` 또는 `cardSection`, 기본값 `timeline`
- `enableTaskDrag`: 주간 `cardSection` 업무 card/bar drag 시작일 변경 허용 여부, 기본값 `true`
- `enableTaskEndDateEdit`: 주간 `cardSection` 업무 card/bar double click 종료일 변경 허용 여부, 기본값 `true`
- `defaultTaskEditable`: task의 `canEdit`이 없을 때 수정 가능 여부, 기본값 `false`
- `taskClickFunctionName`: `onTaskClick`이 없을 때 호출할 전역 함수 이름, 기본값 `null`
- `taskMoveFunctionName`: `onTaskMove`가 없을 때 cardSection drag 완료 후 호출할 전역 함수 이름, 기본값 `null`
- `taskEndDateChangeFunctionName`: `onTaskEndDateChange`가 없을 때 cardSection 종료일 변경 후 호출할 전역 함수 이름, 기본값 `null`
- `holidays`: 휴일 목록, 기본값 `[]`

## Callbacks

- `onInit(instance)`: 초기화 완료 후 호출한다.
- `onRangeChange(range, instance)`: view range가 변경된 후 호출한다.
- `onDataLoaded(data, instance)`: 데이터 로딩 성공 후 호출한다.
- `onTaskClick(task, payload, event)`: 업무 bar 클릭 시 호출한다. 첫 번째 인자 `task`는 기존 호환을 위해 유지한다.
- `onTaskMove(payload)`: 주간 cardSection에서 업무 card/bar drag 완료 후 호출한다.
- `onTaskEndDateChange(payload)`: 주간 cardSection에서 업무 card/bar 종료일 변경 완료 후 호출한다.
- `onMoreClick(date, hiddenTasks, allTasks)`: 월간 보기에서 날짜 cell의 `... N` 클릭 시 호출한다. `date`는 클릭한 날짜이며, `hiddenTasks`와 `allTasks`는 해당 날짜 기준 업무 목록이다.
- `onEmployeeClick(employee, event)`: 직원 영역 클릭 시 호출한다.
- `onError(error, instance)`: API 실패 또는 렌더링 불가 오류 발생 시 호출한다.

`context` 또는 click payload에는 최소한 `employee`, `displayStartDate`, `displayEndDate`, `visibleStartDate`, `visibleEndDate`와 업무 식별 필드를 포함한다.

업무 클릭은 `onTaskClick`을 우선한다. `onTaskClick`이 없고 `taskClickFunctionName`이 지정되어 있으면 `window[taskClickFunctionName](task, payload, event)`를 호출한다. 첫 번째 인자는 기존처럼 `task`를 유지하므로 `onTaskClick(task)` 형태의 기존 사용은 깨지지 않는다.

cardSection click payload 예:

```javascript
{
  task: task,
  taskId: 'T001',
  title: '정산 API 개선',
  departmentId: 'D001',
  departmentName: '개발팀',
  employeeId: 'E001',
  employeeName: '김상우',
  startDate: '2026-06-02',
  endDate: '2026-06-05',
  source: 'cardSection',
  eventType: 'click'
}
```

업무 이동은 `onTaskMove`를 우선한다. `onTaskMove`가 없고 `taskMoveFunctionName`이 지정되어 있으면 `window[taskMoveFunctionName](payload)`를 호출한다. 둘 다 없으면 내부 데이터만 변경하고 console log를 남긴다.

`onTaskMove` payload:

```javascript
{
  task: task,
  taskId: 'T001',
  title: '정산 API 개선',
  departmentId: 'D001',
  departmentName: '개발팀',
  employeeId: 'E001',
  employeeName: '김상우',
  oldStartDate: '2026-06-02',
  oldEndDate: '2026-06-04',
  newStartDate: '2026-06-05',
  newEndDate: '2026-06-07',
  durationDays: 3,
  moveMode: 'keepDuration',
  changeType: 'move',
  source: 'cardSection'
}
```

종료일 변경은 `onTaskEndDateChange`를 우선한다. `onTaskEndDateChange`가 없고 `taskEndDateChangeFunctionName`이 지정되어 있으면 `window[taskEndDateChangeFunctionName](payload)`를 호출한다. 둘 다 없으면 내부 데이터만 변경하고 console log를 남긴다.

`onTaskEndDateChange` payload:

```javascript
{
  task: task,
  taskId: 'T001',
  title: '정산 API 개선',
  departmentId: 'D001',
  departmentName: '개발팀',
  employeeId: 'E001',
  employeeName: '김상우',
  oldStartDate: '2026-06-02',
  oldEndDate: '2026-06-05',
  newStartDate: '2026-06-02',
  newEndDate: '2026-06-10',
  changeType: 'endDate',
  source: 'cardSection'
}
```

월간 `... N` 클릭은 `onMoreClick`을 먼저 호출한다. callback이 `false`를 반환하지 않으면 기본 modal/popup을 열어 클릭한 날짜의 숨겨진 업무 목록만 표시한다. week row 전체 업무 목록을 기준으로 `... N`을 계산하거나 callback에 전달하지 않는다.

## Empty, loading, error 상태

### Empty
- employee와 task가 모두 없으면 empty 상태를 표시한다.
- 주간 보기에서 해당 주와 겹치는 업무가 있는 직원이 없으면 empty 상태를 표시한다.
- 월간 보기에서 task가 없으면 empty 상태를 표시한다.

### Loading
- API 요청 중에는 기존 화면 위에 loading 상태를 표시하거나 body 영역에 loading row를 표시한다.
- loading 상태에서도 toolbar의 기본 이동 버튼은 비활성화할 수 있다.

### Error
- API 요청 실패, 응답 형식 오류, 날짜 파싱 실패 시 error 상태를 표시한다.
- error 상태는 사용자가 다시 시도할 수 있도록 `reload()`와 연결 가능한 retry UI를 고려한다.
