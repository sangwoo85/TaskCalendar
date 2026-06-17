# API_USAGE_GUIDE.md

## 문서 정보

| 항목 | 내용 |
| --- | --- |
| 문서명 | taskCalendar API 사용자 가이드 |
| 대상 버전 | `version2_card_section` |
| 문서 버전 | `v1.0.0` |
| 작성일 | 2026-06-17 |
| 기준 파일 | `src/work-timeline.js`, `docs/task-calendar/API_SPEC.md` |

## 목적

이 문서는 Spring Boot + JSP + jQuery 환경에서 `workTimeline`을 서버 API와 연결하는 방법을 설명한다.

현재 `workTimeline`은 API URL을 내부에 직접 고정하지 않는다. 대신 사용자가 작성한 조회 function을 `onRangeChange` 또는 `rangeChangeFunctionName`에 등록하면, 캘린더가 기간을 변경할 때 해당 function을 호출한다.

즉, 실제 `fetch`, `$.ajax`, 인증 header, 공통 request wrapper, error 처리 방식은 사용하는 업무 시스템에서 구현한다.

## 현재 API 연동 방식

현재 구현 기준으로 API 연동은 다음 방식이다.

```javascript
$('#taskCalendar').workTimeline({
  enableRemoteDataLoad: true,
  loadOnInit: true,
  onRangeChange: loadTaskCalendarData
});
```

핵심 option은 다음과 같다.

| Option | 기본값 | 설명 |
| --- | --- | --- |
| `enableRemoteDataLoad` | `false` | `true`이면 기간 변경 시 custom 조회 function을 호출한다. |
| `loadOnInit` | `true` | `enableRemoteDataLoad: true`일 때 최초 렌더링 후 조회 function을 호출한다. |
| `defaultDate` | `null` | 최초 진입 기준 날짜. 없으면 `currentDate`, `todayDate`, 오늘 날짜 순서로 사용한다. |
| `onRangeChange` | `null` | 기간 변경 시 호출할 callback function. Promise 또는 response object를 반환해야 한다. |
| `rangeChangeFunctionName` | `null` | 전역 함수명으로 조회 function을 연결할 때 사용한다. |

주의: 현재 실제 jQuery plugin 이름은 `taskCalendar`가 아니라 `workTimeline`이다.

## 호출 시점

`enableRemoteDataLoad: true`일 때 조회 function은 아래 시점에 호출된다.

| Action | 발생 시점 |
| --- | --- |
| `init` | 최초 진입. `loadOnInit: true`일 때 |
| `prev` | 이전 주/이전 달 버튼 클릭 |
| `next` | 다음 주/다음 달 버튼 클릭 |
| `today` | 오늘 버튼 클릭 |
| `viewChange` | 주간/월간 view 전환 |
| `goTo` | public method로 특정 날짜 이동 |
| `reload` | public method `reload()` 호출 |

## Request payload 구조

`workTimeline`이 `onRangeChange(payload)`에 전달하는 request payload 구조는 다음과 같다.

```json
{
  "viewType": "month",
  "weeklyDisplayMode": "cardSection",
  "visibleStartDate": "2026-07-01",
  "visibleEndDate": "2026-07-31",
  "baseDate": "2026-07-15",
  "baseDateParam": "20260715",
  "action": "next",
  "previousVisibleStartDate": "2026-06-01",
  "previousVisibleEndDate": "2026-06-30"
}
```

| Field | Type | 설명 |
| --- | --- | --- |
| `viewType` | string | 현재 view. `week` 또는 `month` |
| `weeklyDisplayMode` | string | 주간 표시 방식. `timeline` 또는 `cardSection` |
| `visibleStartDate` | string | 화면 표시 시작일, `YYYY-MM-DD` |
| `visibleEndDate` | string | 화면 표시 종료일, `YYYY-MM-DD` |
| `baseDate` | string | 조회 대표 날짜, `YYYY-MM-DD` |
| `baseDateParam` | string | 조회 API parameter용 날짜, `YYYYMMDD` |
| `action` | string | 호출 사유 |
| `previousVisibleStartDate` | string | 이동 전 화면 표시 시작일 |
| `previousVisibleEndDate` | string | 이동 전 화면 표시 종료일 |

## baseDate 계산 기준

### 월간 view

월간 view에서는 표시 월의 15일을 `baseDate`로 사용한다.

예: 2026년 6월에서 다음 버튼 클릭

```json
{
  "visibleStartDate": "2026-07-01",
  "visibleEndDate": "2026-07-31",
  "baseDate": "2026-07-15",
  "baseDateParam": "20260715",
  "action": "next"
}
```

### 주간 view

주간 view에서는 `visibleStartDate + 3일`을 `baseDate`로 사용한다.

예: 2026-07-06 ~ 2026-07-12 주간

```json
{
  "visibleStartDate": "2026-07-06",
  "visibleEndDate": "2026-07-12",
  "baseDate": "2026-07-09",
  "baseDateParam": "20260709",
  "action": "next"
}
```

### 오늘 이동

`today` action에서는 오늘 날짜 또는 `todayDate` option 값을 `baseDate`로 사용한다.

## 서버 request parameter 예시

업무 시스템 API에는 보통 다음 parameter를 전달하면 된다.

```http
GET /api/task-calendar/search?viewType=month&searchDate=20260715&startDate=2026-07-01&endDate=2026-07-31
```

| Parameter | 값 | 설명 |
| --- | --- | --- |
| `viewType` | `payload.viewType` | `week` 또는 `month` |
| `searchDate` | `payload.baseDateParam` | 서버 조회 기준 날짜. `YYYYMMDD` |
| `startDate` | `payload.visibleStartDate` | 화면 표시 시작일 |
| `endDate` | `payload.visibleEndDate` | 화면 표시 종료일 |

서버는 `searchDate`만 사용해도 되고, `startDate`, `endDate`를 함께 사용해도 된다. 단, 화면과 정확히 맞는 업무 목록을 반환하려면 `startDate`, `endDate` 기준 overlap 조회를 권장한다.

## 서버 조회 조건

업무는 화면 기간과 겹치면 반환해야 한다.

```sql
WHERE task_start_date <= :endDate
  AND task_end_date >= :startDate
```

이 조건은 주간 timeline, 주간 cardSection, 월간 view 모두 동일하다.

## Response 구조

조회 function은 아래 구조의 JSON object 또는 Promise를 반환해야 한다.

```json
{
  "success": true,
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
      "startDate": "2026-07-14",
      "endDate": "2026-07-18",
      "status": "IN_PROGRESS",
      "progressRate": 40,
      "canEdit": true
    }
  ],
  "holidays": [
    {
      "date": "2026-07-17",
      "name": "회사휴일",
      "type": "COMPANY_HOLIDAY"
    }
  ]
}
```

### Employee object

| Field | Required | 설명 |
| --- | --- | --- |
| `id` | yes | 직원 ID. task의 `employeeId`와 매칭된다. |
| `name` | yes | 직원명 |
| `departmentId` | no | 부서 ID |
| `departmentName` | no | 부서명 |
| `positionName` | no | 직급/직책 |
| `sortOrder` | no | 정렬 순서 |

### Task object

| Field | Required | 설명 |
| --- | --- | --- |
| `taskId` | yes | 업무 ID |
| `title` | yes | 업무명 |
| `employeeId` | yes | 담당 직원 ID |
| `employeeName` | no | 담당 직원명 |
| `departmentId` | no | 부서 ID |
| `departmentName` | no | 부서명 |
| `startDate` | yes | 업무 시작일, `YYYY-MM-DD` |
| `endDate` | yes | 업무 종료일, `YYYY-MM-DD` |
| `status` | no | `TODO`, `IN_PROGRESS`, `DONE`, `DELAYED`, `HOLD` |
| `progressRate` | no | 진행률 |
| `canEdit` | no | drag/double click 수정 가능 여부 |

### Holiday object

| Field | Required | 설명 |
| --- | --- | --- |
| `date` | yes | 휴일 날짜, `YYYY-MM-DD` |
| `name` | yes | 휴일명 |
| `type` | no | `HOLIDAY`, `SUBSTITUTE_HOLIDAY`, `COMPANY_HOLIDAY` 등 |

## fetch 기반 공통 request 예시

공통 `request()`를 쓰는 경우, `request()`는 반드시 JSON 결과를 반환해야 한다.

```javascript
async function request(url, params) {
  var query = new URLSearchParams(params).toString();
  var response = await fetch(url + '?' + query, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('API request failed: ' + response.status);
  }

  return response.json();
}
```

`response.json()`도 Promise를 반환하므로 `return response.json();` 형태가 가능하다.

## onRangeChange 작성 예시

### 권장 방식 1: Promise를 그대로 return

```javascript
function loadTaskCalendarData(payload) {
  return request('/api/task-calendar/search', {
    viewType: payload.viewType,
    searchDate: payload.baseDateParam,
    startDate: payload.visibleStartDate,
    endDate: payload.visibleEndDate
  });
}
```

### 권장 방식 2: async/await 사용

```javascript
async function loadTaskCalendarData(payload) {
  var result = await request('/api/task-calendar/search', {
    viewType: payload.viewType,
    searchDate: payload.baseDateParam,
    startDate: payload.visibleStartDate,
    endDate: payload.visibleEndDate
  });

  return result;
}
```

### 잘못된 방식

아래 코드는 API를 호출하지만 결과를 `workTimeline`에 반환하지 않는다.

```javascript
async function loadTaskCalendarData(payload) {
  request('/api/task-calendar/search', {
    searchDate: payload.baseDateParam
  });
}
```

이 경우 `onRangeChange`의 반환값은 `undefined`다. `workTimeline`은 API 응답을 기다리지 않고 새 데이터를 반영할 수 없다.

반드시 아래 둘 중 하나를 지켜야 한다.

- `return request(...)`
- `var result = await request(...); return result;`

## 초기화 예시

```html
<link rel="stylesheet" href="/static/task-calendar/work-timeline.css">

<div id="taskCalendar"></div>

<script src="/static/jquery/jquery.min.js"></script>
<script src="/static/task-calendar/work-timeline.js"></script>
<script>
  $(function () {
    $('#taskCalendar').workTimeline({
      viewType: 'week',
      weeklyDisplayMode: 'cardSection',
      defaultDate: '2026-07-15',
      enableRemoteDataLoad: true,
      loadOnInit: true,
      onRangeChange: loadTaskCalendarData,
      taskClickFunctionName: 'openTaskDetail'
    });
  });
</script>
```

## 전역 함수명 방식

JSP에서 전역 함수명으로 연결해야 하는 경우 `rangeChangeFunctionName`을 사용할 수 있다.

```javascript
window.loadTaskCalendarData = async function (payload) {
  return request('/api/task-calendar/search', {
    viewType: payload.viewType,
    searchDate: payload.baseDateParam,
    startDate: payload.visibleStartDate,
    endDate: payload.visibleEndDate
  });
};

$('#taskCalendar').workTimeline({
  viewType: 'month',
  defaultDate: '2026-07-15',
  enableRemoteDataLoad: true,
  loadOnInit: true,
  rangeChangeFunctionName: 'loadTaskCalendarData'
});
```

`onRangeChange`가 있으면 `rangeChangeFunctionName`보다 우선 호출된다.

## 빈 데이터 response

조회 결과가 없어도 아래처럼 빈 배열을 명시할 수 있다.

```json
{
  "success": true,
  "employees": [],
  "tasks": [],
  "holidays": []
}
```

주간 view에서는 빈 데이터여도 “데이터가 없습니다” 문구를 표시하지 않고 빈 주간 shell을 렌더링한다.

월간 view에서 `tasks: []`이면 empty 상태가 표시된다.

## Error response

서버 오류는 다음 구조를 권장한다.

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "startDate must be less than or equal to endDate."
  }
}
```

`success === false`이면 `workTimeline`은 내부 데이터를 갱신하지 않고 기존 화면 데이터를 유지한다.

`fetch` 자체가 실패하거나 Promise가 reject되어도 기존 데이터를 유지한다.

## 디버그 예시

API 응답을 반환하기 직전에 값을 확인하려면 다음처럼 작성한다.

```javascript
async function loadTaskCalendarData(payload) {
  console.group('[taskCalendar] onRangeChange');
  console.log('payload:', payload);

  var result = await request('/api/task-calendar/search', {
    viewType: payload.viewType,
    searchDate: payload.baseDateParam,
    startDate: payload.visibleStartDate,
    endDate: payload.visibleEndDate
  });

  console.log('response before return:', result);
  console.table(result.tasks || []);
  console.groupEnd();

  return result;
}
```

`return result;` 전에 찍힌 값이 실제로 `workTimeline`에 전달되는 값이다.

## 저장 API와의 관계

조회 API와 저장 API는 분리한다.

`workTimeline`은 drag/drop 시작일 변경, double click 종료일 변경 후 서버 저장 API를 직접 호출하지 않는다.

저장은 아래 callback에서 업무 시스템이 직접 처리한다.

```javascript
async function onTaskMove(payload) {
  await request('/api/task-calendar/move', {
    taskId: payload.taskId,
    oldStartDate: payload.oldStartDate,
    newStartDate: payload.newStartDate,
    oldEndDate: payload.oldEndDate,
    newEndDate: payload.newEndDate
  });
}
```

서버는 저장 API에서 권한을 반드시 다시 검증해야 한다. `canEdit`은 화면 제어용일 뿐 최종 보안 장치가 아니다.

## 체크리스트

- [ ] `enableRemoteDataLoad: true`를 설정했는가
- [ ] `onRangeChange` 또는 `rangeChangeFunctionName`을 설정했는가
- [ ] 조회 function에서 `return request(...)` 또는 `return result`를 하고 있는가
- [ ] `searchDate`에 `payload.baseDateParam`을 전달하는가
- [ ] `startDate`, `endDate`에 visible range를 전달하는가
- [ ] response에 `employees`, `tasks`, `holidays` 배열이 포함되는가
- [ ] employee의 `id`와 task의 `employeeId`가 매칭되는가
- [ ] 날짜가 모두 `YYYY-MM-DD` 형식인가
- [ ] 서버 조회 조건이 overlap 조건인가
- [ ] 실패 시 기존 화면이 유지되는 것을 확인했는가

## 문서 버전 관리

이 문서는 API 사용 방식이 변경될 때 버전을 올린다.

버전 규칙은 다음을 따른다.

| 변경 유형 | 예시 | 버전 증가 |
| --- | --- | --- |
| Major | request/response field 이름 변경, 기존 option 제거 | `v2.0.0` |
| Minor | option 추가, callback payload field 추가, 예제 추가 | `v1.1.0` |
| Patch | 설명 보강, 오타 수정, 예제 주석 보완 | `v1.0.1` |

문서 변경 시 아래 기록을 함께 남긴다.

| Version | Date | 변경 내용 |
| --- | --- | --- |
| `v1.0.0` | 2026-06-17 | 최초 API 사용자 가이드 작성. request/response 구조, fetch/async 예제, 버전 관리 기준 추가 |

## 관련 문서

- `API_SPEC.md`: API/JSON 데이터 계약
- `USAGE_GUIDE.md`: JSP + jQuery 전체 사용법
- `CUSTOMIZE_GUIDE.md`: option/callback/custom style 수정 방법
- `ARCHITECTURE.md`: 내부 렌더링과 remote data flow 구조
- `REVIEW_CHECKLIST.md`: 구현 후 검수 항목
