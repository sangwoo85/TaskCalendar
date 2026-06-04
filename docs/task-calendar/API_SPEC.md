# API_SPEC.md

## 기본 원칙

Spring Boot API는 `taskCalendar`가 표시해야 하는 visible range와 view 정보를 받아 직원 목록과 업무 목록을 반환한다.

- 날짜는 모두 `YYYY-MM-DD` date-only 형식이다.
- 서버와 클라이언트는 업무 기간의 시작일과 종료일을 모두 포함하는 것으로 해석한다.
- 시간, timezone, timestamp 기반 계산은 API 계약에 포함하지 않는다.
- 화면에 표시할 업무 필터링은 서버와 클라이언트 모두 같은 overlap 조건을 따른다.
- 현재 MVP의 `apiUrl` 실제 AJAX loading은 미구현이다. 이 문서는 향후 Spring Boot 연동 시 맞춰야 할 API 계약이다.

## Request

권장 endpoint:

```http
GET /api/tasks/timeline
```

Query parameters:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `viewType` | string | yes | `week` 또는 `month` |
| `startDate` | string | yes | visible range 시작일, `YYYY-MM-DD` |
| `endDate` | string | yes | visible range 종료일, `YYYY-MM-DD` |
| `departmentId` | string | no | 부서 필터 |
| `employeeId` | string | no | 특정 직원 필터 |
| `status` | string | no | 업무 상태 필터 |
| `keyword` | string | no | 업무명 또는 직원명 검색어 |

Example:

```http
GET /api/tasks/timeline?viewType=month&startDate=2026-06-01&endDate=2026-06-30&departmentId=DEV
```

## Response JSON

정상 응답은 다음 구조를 사용한다.

```json
{
  "range": {
    "viewType": "month",
    "startDate": "2026-06-01",
    "endDate": "2026-06-30"
  },
  "employees": [],
  "tasks": [],
  "holidays": []
}
```

## Employee object

```json
{
  "id": "E001",
  "name": "김민수",
  "departmentId": "DEV",
  "departmentName": "개발팀",
  "positionName": "대리",
  "sortOrder": 10
}
```

Fields:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | 직원 식별자 |
| `name` | string | yes | 직원명 |
| `departmentId` | string | no | 부서 식별자 |
| `departmentName` | string | no | 부서명 |
| `positionName` | string | no | 직급명 |
| `sortOrder` | number | no | 표시 순서 |

## Task object

```json
{
  "taskId": "T1001",
  "employeeId": "E001",
  "employeeName": "김민수",
  "departmentId": "DEV",
  "departmentName": "개발팀",
  "title": "그룹웨어 결재 화면 개선",
  "startDate": "2026-06-03",
  "endDate": "2026-06-12",
  "status": "IN_PROGRESS",
  "progressRate": 40,
  "description": "결재 목록과 상세 화면 UI 개선"
}
```

Fields:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `taskId` | string | yes | 업무 식별자 |
| `employeeId` | string | yes | 담당 직원 식별자 |
| `employeeName` | string | no | 담당 직원명, 월간 bar 표시용 |
| `departmentId` | string | no | 부서 식별자 |
| `departmentName` | string | no | 부서명, 월간 bar 표시용 |
| `title` | string | yes | 업무명 |
| `startDate` | string | yes | 업무 시작일, `YYYY-MM-DD` |
| `endDate` | string | yes | 업무 종료일, `YYYY-MM-DD` |
| `status` | string | no | `TODO`, `IN_PROGRESS`, `DONE`, `DELAYED`, `HOLD` |
| `progressRate` | number | no | 진행률, 0~100 |
| `description` | string | no | 상세 설명 |

`startDate`가 `endDate`보다 늦은 데이터는 잘못된 데이터로 간주한다.

## Holiday object

```json
{
  "date": "2026-06-05",
  "name": "대체공휴일",
  "type": "SUBSTITUTE_HOLIDAY"
}
```

Fields:

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `date` | string | yes | 휴일 날짜, `YYYY-MM-DD` |
| `name` | string | yes | 화면에 표시할 휴일명 |
| `type` | string | no | `HOLIDAY`, `SUBSTITUTE_HOLIDAY`, `COMPANY_HOLIDAY`, `TEMPORARY_HOLIDAY` |

1차 구현에서는 type별 색상 차등을 두지 않는다. 모든 holiday는 일요일과 동일한 빨간색 계열로 표시할 수 있으며, `SUBSTITUTE_HOLIDAY`도 같은 규칙을 따른다.

## Error response

API 실패 시 HTTP status code와 함께 다음 구조를 권장한다.

```json
{
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

## Mock response

```json
{
  "range": {
    "viewType": "month",
    "startDate": "2026-06-01",
    "endDate": "2026-06-30"
  },
  "employees": [
    {
      "id": "E001",
      "name": "김민수",
      "departmentId": "DEV",
      "departmentName": "개발팀",
      "positionName": "대리",
      "sortOrder": 10
    },
    {
      "id": "E002",
      "name": "이서연",
      "departmentId": "DEV",
      "departmentName": "개발팀",
      "positionName": "과장",
      "sortOrder": 20
    }
  ],
  "tasks": [
    {
      "taskId": "T1001",
      "employeeId": "E001",
      "employeeName": "김민수",
      "departmentId": "DEV",
      "departmentName": "개발팀",
      "title": "그룹웨어 결재 화면 개선",
      "startDate": "2026-06-03",
      "endDate": "2026-06-12",
      "status": "IN_PROGRESS",
      "progressRate": 40
    },
    {
      "taskId": "T1002",
      "employeeId": "E001",
      "employeeName": "김민수",
      "departmentId": "DEV",
      "departmentName": "개발팀",
      "title": "월간 보고서 자동화",
      "startDate": "2026-05-28",
      "endDate": "2026-06-05",
      "status": "DELAYED",
      "progressRate": 70
    },
    {
      "taskId": "T1003",
      "employeeId": "E002",
      "employeeName": "이서연",
      "departmentId": "DEV",
      "departmentName": "개발팀",
      "title": "인사 평가 일정 정리",
      "startDate": "2026-06-17",
      "endDate": "2026-06-25",
      "status": "TODO",
      "progressRate": 0
    }
  ],
  "holidays": [
    {
      "date": "2026-06-05",
      "name": "대체공휴일",
      "type": "SUBSTITUTE_HOLIDAY"
    },
    {
      "date": "2026-06-17",
      "name": "회사창립기념일",
      "type": "COMPANY_HOLIDAY"
    }
  ]
}
```

## Holiday API option

휴일은 timeline API 응답의 `holidays` 배열에 포함하거나 별도 API로 조회할 수 있다.

```http
GET /api/task-calendar/holidays?startDate=2026-06-01&endDate=2026-06-30
```

별도 API를 사용할 경우 응답은 `Holiday object` 배열을 반환하는 것을 권장한다.

## Backend query condition

서버는 화면 기간과 겹치는 업무만 반환하는 것을 권장한다.

```sql
WHERE task.start_date <= :endDate
  AND task.end_date >= :startDate
```

직원 목록은 다음 중 하나의 정책을 선택한다.

- 필터 조건에 해당하는 모든 직원을 반환하고, 업무가 없는 직원도 빈 row로 표시한다.
- 기간 내 업무가 있는 직원만 반환한다.

업무 시스템에서는 첫 번째 정책을 기본으로 권장한다. 담당자의 일정 공백도 확인할 수 있기 때문이다. 단, 현재 주간 MVP 구현은 클라이언트에서 visible range와 겹치는 업무가 없는 직원을 숨긴다.

## Spring Boot controller 예시

```java
@GetMapping("/api/tasks/timeline")
public TaskTimelineResponse getTimeline(
    @RequestParam String viewType,
    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
    @RequestParam(required = false) String departmentId,
    @RequestParam(required = false) String employeeId,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String keyword
) {
    // validate range and query timeline data
}
```
