# FEATURE_SPEC.md

## 목적

`taskCalendar`는 직원별 업무 기간을 주간 또는 월간 타임라인으로 표시하는 JavaScript UI 컴포넌트다. 직원은 세로 row로 배치하고, 각 업무는 시작일~종료일 범위를 가로 bar로 표시한다.

일반 캘린더의 시간 슬롯, 반복 일정, 개인 일정 관리 기능은 범위에 포함하지 않는다.

현재 MVP 구현 파일은 `src/work-timeline.js`, `src/work-timeline.css`이며 jQuery plugin 이름은 `workTimeline`이다. `taskCalendar`는 프로젝트/컴포넌트 명칭이고, `taskCalendar` plugin alias는 아직 구현되어 있지 않다.

## 지원 view

### 주간 보기
- 기준일이 속한 주를 표시한다.
- 기본 주 시작일은 월요일로 한다.
- 옵션으로 `weekStartsOn`을 제공할 수 있으며 값은 `0`(일요일) 또는 `1`(월요일)을 우선 지원한다.
- 날짜 header는 7일을 표시한다.
- 업무 bar는 해당 주와 겹치는 기간만 잘라서 표시한다.
- 일요일 column은 빨간색 계열, 토요일 column은 파란색 계열로 구분한다.
- `holidays` 데이터에 포함된 날짜는 요일과 관계없이 일요일과 같은 빨간색 계열로 구분하고 휴일명을 표시한다.
- 해당 주의 visible range와 겹치는 업무가 없는 직원은 표시하지 않는다.

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
- 날짜 숫자/휴일명 영역과 task bar 영역은 분리하며, task bar 때문에 날짜 cell border가 끊기거나 별도 상단 선이 생기면 안 된다.
- 월간 보기에서 휴일명은 날짜 숫자 아래, 업무 bar 영역보다 위에 표시하며 overflow 제한 대상에 포함하지 않는다.
- 업무 bar에는 업무명과 부서/직원 이름이 함께 보여야 한다.
- 한 week row에 겹치는 bar lane이 많으면 `maxVisibleTaskBarsPerWeek` 개수까지만 표시하고 `... N` 버튼으로 숨겨진 개수를 표시한다.
- `... N` 버튼을 클릭하면 해당 week row의 숨겨진 업무 목록을 단순 modal/popup으로 표시한다.

## 이동 기능

- `prev`: 현재 view 기준으로 이전 주 또는 이전 달로 이동한다.
- `next`: 현재 view 기준으로 다음 주 또는 다음 달로 이동한다.
- `today`: 오늘 날짜가 포함된 주 또는 월로 이동한다.
- 이동 후 데이터 로딩이 필요한 경우 향후 `apiUrl` loading을 다시 호출한다. 현재 MVP에서는 direct data를 다시 렌더링한다.
- 이동 후 `onRangeChange` callback을 호출한다.

## 직원 row

- 직원 1명은 하나의 timeline row로 표시한다.
- 직원 row는 왼쪽 직원 컬럼과 오른쪽 timeline 영역으로 구성한다.
- 주간 보기에서는 해당 주 visible range와 겹치는 업무가 1개 이상 있는 직원만 표시한다.
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

향후 구현 시 다음 method를 제공한다.

- `render()`: 현재 옵션과 데이터로 다시 렌더링한다.
- `reload()`: 현재 visible range 기준으로 데이터를 다시 로딩한다.
- `setView(viewType)`: `week` 또는 `month`로 view를 변경한다.
- `goTo(date)`: 지정한 `YYYY-MM-DD` 날짜가 포함된 view range로 이동한다.
- `prev()`: 이전 주 또는 이전 달로 이동한다.
- `next()`: 다음 주 또는 다음 달로 이동한다.
- `today()`: 오늘 날짜가 포함된 기간으로 이동한다.
- `setData(employees, tasks)`: 직접 데이터로 화면을 갱신한다.
- `destroy()`: DOM, event handler, 내부 상태를 정리한다.

## Options

- `maxVisibleTasksPerDay`: 기존 날짜 칸 item 방식과의 호환을 위해 유지하는 옵션, 월간 bar 방식에서는 `maxVisibleTaskBarsPerWeek`가 우선한다.
- `maxVisibleTaskBarsPerWeek`: 월간 week row에 표시할 업무 bar lane 최대 개수, 기본값 `3`
- `taskClickFunctionName`: `onTaskClick`이 없을 때 호출할 전역 함수 이름, 기본값 `null`
- `holidays`: 휴일 목록, 기본값 `[]`

## Callbacks

- `onInit(instance)`: 초기화 완료 후 호출한다.
- `onRangeChange(range, instance)`: view range가 변경된 후 호출한다.
- `onDataLoaded(data, instance)`: 데이터 로딩 성공 후 호출한다.
- `onTaskClick(task, context, event)`: 업무 bar 클릭 시 호출한다.
- `onMoreClick(date, hiddenTasks, allTasks)`: 월간 보기에서 `... N` 클릭 시 호출한다. 월간 bar overflow에서는 `date`에 week row의 표시 범위 문자열을 전달할 수 있다.
- `onEmployeeClick(employee, event)`: 직원 영역 클릭 시 호출한다.
- `onError(error, instance)`: API 실패 또는 렌더링 불가 오류 발생 시 호출한다.

`context`에는 최소한 `employee`, `displayStartDate`, `displayEndDate`, `visibleStartDate`, `visibleEndDate`를 포함한다.

업무 클릭은 `onTaskClick`을 우선한다. `onTaskClick`이 없고 `taskClickFunctionName`이 지정되어 있으면 `window[taskClickFunctionName](task, context, event)`를 호출한다.

월간 `... N` 클릭은 `onMoreClick`을 먼저 호출한다. callback이 `false`를 반환하지 않으면 기본 modal/popup을 열어 숨겨진 업무 목록을 표시한다.

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
