# API_SPEC.md

## API 개요

현재 `workTimeline` MVP는 `employees`, `tasks`, `holidays` 배열을 직접 주입하는 방식으로 동작한다.

`apiUrl` option은 구조만 있으며 실제 AJAX loading은 아직 미구현이다. 현재 기간 변경 데이터 조회는 `enableRemoteDataLoad`와 사용자가 등록한 custom function을 통해 처리한다. 이 문서는 Spring Boot API를 붙일 때 맞춰야 할 권장 JSON 계약과, 현재 direct data가 실제로 요구하는 필드 구조를 함께 정리한다.

현재 구현에서 `workTimeline`이 직접 호출하는 저장 API는 없다. drag/drop, double click으로 변경된 날짜 저장은 callback을 받은 업무 시스템이 별도로 처리한다.

`workTimeline`은 기간 변경 조회 API URL도 직접 알 필요가 없다. `prev`, `next`, `today`, view 전환, `reload()` 시 `onRangeChange(payload)` 또는 `rangeChangeFunctionName(payload)`를 호출하고, 실제 AJAX 요청은 해당 custom function 내부에서 수행한다.

## 기본 원칙

- 날짜는 모두 `YYYY-MM-DD` date-only 문자열이다.
- 업무 시작일과 종료일은 모두 포함한다.
- 시간, 분, 초, timezone, timestamp 기반 계산은 사용하지 않는다.
- 업무 조회는 주간/월간 모두 같은 overlap 조건을 사용한다.
- `weeklyDisplayMode`, `taskColorMode`는 클라이언트 렌더링 option이며 API 필수 parameter가 아니다.

## 전체 response 구조

향후 API loading 구현 시 권장하는 응답 구조다. 현재 코드에 바로 주입할 때는 `employees`, `tasks`, `holidays` 배열을 꺼내 `workTimeline` option 또는 `setData()`/`setHolidays()`에 전달한다.

```json
{
  "success": true,
  "viewType": "week",
  "visibleStartDate": "2026-06-01",
  "visibleEndDate": "2026-06-07",
  "employees": [
    {
      "id": "E001",
      "name": "김상우",
      "departmentId": "D001",
      "departmentName": "개발팀",
      "positionName": "과장",
      "sortOrder": 10
    }
  ],
  "tasks": [
    {
      "taskId": "T001",
      "title": "정산 API 개선",
      "departmentId": "D001",
      "departmentName": "개발팀",
      "employeeId": "E001",
      "employeeName": "김상우",
      "startDate": "2026-06-02",
      "endDate": "2026-06-05",
      "status": "IN_PROGRESS",
      "progressRate": 40,
      "canEdit": true
    }
  ],
  "holidays": [
    {
      "date": "2026-06-05",
      "name": "대체공휴일",
      "type": "SUBSTITUTE_HOLIDAY"
    }
  ]
}
```

주의: employee는 현재 코드 기준으로 `id`, `name`을 사용한다. 백엔드 DTO가 `employeeId`, `employeeName`을 반환한다면 화면 주입 전에 `id`, `name`으로 매핑해야 한다.

## Employee object

```json
{
  "id": "E001",
  "name": "김상우",
  "departmentId": "D001",
  "departmentName": "개발팀",
  "positionName": "과장",
  "sortOrder": 10
}
```

| Field | Type | Required | 설명 |
| --- | --- | --- | --- |
| `id` | string | yes | 직원 식별자. task의 `employeeId`와 매칭된다. |
| `name` | string | yes | 직원명 |
| `departmentId` | string | no | 부서 ID |
| `departmentName` | string | no | 부서명 |
| `positionName` | string | no | 직급/직책 |
| `sortOrder` | number | no | 표시 순서. 현재 정렬 로직은 별도 구현되어 있지 않으므로 서버 정렬 권장 |

## Task object

```json
{
  "taskId": "T001",
  "title": "정산 API 개선",
  "departmentId": "D001",
  "departmentName": "개발팀",
  "employeeId": "E001",
  "employeeName": "김상우",
  "startDate": "2026-06-02",
  "endDate": "2026-06-05",
  "status": "IN_PROGRESS",
  "progressRate": 40,
  "canEdit": true,
  "description": "정산 API 성능 개선"
}
```

| Field | Type | Required | 설명 |
| --- | --- | --- | --- |
| `taskId` | string | yes | 업무 식별자. drag/endDate 변경 시 task key로 사용 |
| `id` | string | no | `taskId`가 없을 때 대체 key로 사용 가능 |
| `title` | string | yes | 업무명 |
| `departmentId` | string | no | 부서 ID |
| `departmentName` | string | no | 부서명 |
| `employeeId` | string | yes | 담당 직원 ID |
| `employeeName` | string | no | 담당 직원명. cardSection/month 표시 fallback |
| `startDate` | string | yes | 업무 시작일, `YYYY-MM-DD` |
| `endDate` | string | yes | 업무 종료일, `YYYY-MM-DD` |
| `status` | string | no | `TODO`, `IN_PROGRESS`, `DONE`, `DELAYED`, `HOLD` |
| `progressRate` | number | no | 진행률. 현재 UI 핵심 렌더링에는 사용하지 않음 |
| `canEdit` | boolean | no | 현재 로그인 사용자가 해당 업무를 수정할 수 있는지 여부. 주간 `cardSection` drag/종료일 변경 UI 제어에 사용 |
| `description` | string | no | 상세 설명 |

`startDate > endDate`인 task는 잘못된 데이터로 간주하며 렌더링에서 제외된다.

`canEdit`은 프론트 UI 제어용이다. `canEdit: false`이면 taskCalendar가 drag 시작일 변경과 double click 종료일 변경을 막지만, 사용자가 개발자 도구로 값을 조작할 수 있으므로 최종 수정 권한 검증은 서버 저장 API에서 반드시 다시 수행해야 한다.

## Holiday object

```json
{
  "date": "2026-06-05",
  "name": "대체공휴일",
  "type": "SUBSTITUTE_HOLIDAY"
}
```

| Field | Type | Required | 설명 |
| --- | --- | --- | --- |
| `date` | string | yes | 휴일 날짜, `YYYY-MM-DD` |
| `name` | string | yes | 화면에 표시할 휴일명 |
| `type` | string | no | `HOLIDAY`, `SUBSTITUTE_HOLIDAY`, `COMPANY_HOLIDAY`, `TEMPORARY_HOLIDAY` 등 |

현재 구현은 type별 색상 차등을 두지 않고, 휴일/대체휴일을 일요일과 같은 빨간색 계열로 표시한다.

## 주간 조회 기준

주간 view는 7일 visible range를 기준으로 데이터를 조회한다.

```http
GET /api/tasks/timeline?viewType=week&startDate=2026-06-01&endDate=2026-06-07
```

`weeklyDisplayMode: 'timeline'`과 `weeklyDisplayMode: 'cardSection'`은 같은 API 데이터를 사용할 수 있다.

## 월간 조회 기준

월간 view는 기준 월의 1일부터 말일까지를 visible range로 사용한다.

```http
GET /api/tasks/timeline?viewType=month&startDate=2026-06-01&endDate=2026-06-30
```

월간 렌더링은 받은 task를 calendar week row 단위 segment로 나누어 연속 bar로 표시한다.

월간 progress bar와 날짜 cell 목록 분리는 API가 아니라 클라이언트 표시 옵션인 `monthRangeBarMinDays`로 결정한다. 기본값 `2`에서는 2일 이상 업무는 progress bar 대상이고, 하루짜리 업무는 날짜 cell 목록 대상이다. progress bar 대상 업무는 날짜 cell 목록, `... N` 계산, `... N` modal에서 제외한다.

월간 `... N` 표시 여부는 `maxVisibleTasksPerDay`로 결정한다. 기준은 week row 전체가 아니라 날짜 cell 하나이며, 해당 날짜의 day-list 업무 포함 조건은 `task.startDate <= currentDate AND task.endDate >= currentDate`이다. `onMoreClick(date, hiddenTasks, allTasks)`의 `date`, `hiddenTasks`, `allTasks`도 클릭한 날짜의 day-list 업무 기준으로 전달한다.

## 기간 변경 custom function 응답

`enableRemoteDataLoad: true`이면 기간 변경 시 custom function은 Promise/jqXHR 또는 일반 object를 반환할 수 있다.

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
```

`baseDate`는 조회 기준 날짜이고 `baseDateParam`은 업무 시스템 API에서 쓰기 쉬운 `YYYYMMDD` 형식이다. 월간 view에서는 표시 월의 15일을 사용하고, 주간 view에서는 `visibleStartDate + 3일`을 사용한다. `today` action은 오늘 날짜를 기준으로 전달한다.

응답 구조는 다음 필드를 지원한다.

```json
{
  "success": true,
  "employees": [],
  "tasks": [],
  "holidays": []
}
```

- `success`는 선택 필드다.
- `success === false`이면 데이터를 갱신하지 않고 기존 화면 데이터를 유지한다.
- `employees`, `tasks`, `holidays` 중 응답에 포함된 필드만 내부 데이터에 반영한다.
- `tasks: []`처럼 빈 배열이 명시되면 해당 데이터를 빈 배열로 갱신한다.
- API 실패나 Promise reject 시 기존 데이터를 유지하고 `console.warn`만 수행한다.

## 색상 표시와 API 관계

`taskColorMode`는 클라이언트 표시 옵션이다. API response field를 변경하지 않는다.

- `taskColorMode: 'status'`: task의 `status` 값을 기준으로 기존 상태 색상을 표시한다.
- `taskColorMode: 'random'`: 기본적으로 task의 `taskId`를 seed로 사용해 deterministic random 색상 class를 계산한다.
- 같은 `taskId`는 새로고침, 주간/월간 view 전환 후에도 같은 색상 class를 사용한다.
- `taskId`가 없으면 클라이언트가 `title + startDate + employeeId` 조합을 fallback seed로 사용한다.
- 서버는 random 색상값을 내려줄 필요가 없으며, 실제 색상 palette는 CSS에서 관리한다.

## Backend query condition

서버는 화면 기간과 겹치는 업무만 반환하는 것을 권장한다.

```sql
WHERE task_start_date <= :visibleEndDate
  AND task_end_date >= :visibleStartDate
```

이 조건은 주간 timeline, 주간 cardSection, 월간 view 모두 동일하다.

## Error response 예시

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "startDate must be less than or equal to endDate.",
    "details": {
      "startDate": "2026-06-30",
      "endDate": "2026-06-01"
    }
  }
}
```

권장 error code:

- `INVALID_DATE_FORMAT`
- `INVALID_DATE_RANGE`
- `INVALID_VIEW_TYPE`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `INTERNAL_ERROR`

## 저장 API 책임

`workTimeline`은 drag/drop 시작일 변경이나 double click 종료일 변경 후 서버 저장 API를 직접 호출하지 않는다.

라이브러리는 내부 task 데이터를 변경하고 callback payload를 호출한다. 실제 DB 저장, 권한 검증, 승인 처리, 실패 rollback은 사용하는 업무 시스템에서 callback 내부에 구현한다.

```javascript
function onTaskMoveDummy(payload) {
  $.ajax({
    url: '/api/task-calendar/task-date',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      taskId: payload.taskId,
      startDate: payload.newStartDate,
      endDate: payload.newEndDate
    })
  });
}

function onTaskEndDateChangeDummy(payload) {
  // 실제 운영에서는 여기서 ajax로 종료일 저장 처리한다.
}
```

저장 API endpoint, request body, rollback 정책은 현재 미구현이며 업무 시스템별 확장 범위다.

서버는 저장 요청을 받을 때 `taskId`와 로그인 사용자를 기준으로 수정 권한을 재검증해야 한다. 프론트의 `canEdit` 값은 편의 UI 제어이며 보안 경계가 아니다.
