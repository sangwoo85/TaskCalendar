# REVIEW_CHECKLIST.md

구현 완료 후 아래 항목을 기준으로 `taskCalendar`를 검수한다.

## 환경

- [ ] Spring Boot + JSP 화면에서 `<script>` / `<link>` tag로 로딩된다.
- [ ] jQuery 기반 초기화가 가능하다.
- [ ] 현재 MVP에서는 `$('#target').workTimeline(...)`로 초기화한다.
- [ ] `taskCalendar` plugin alias가 필요하면 별도 구현 여부를 확인한다.
- [ ] React, Vue, Angular 의존이 없다.
- [ ] npm, webpack, vite 같은 빌드 도구가 런타임 필수 조건이 아니다.
- [ ] CDN 의존이 없다.
- [ ] 외부 유료 라이브러리를 사용하지 않는다.

## 라이브러리 구조

- [ ] 현재 MVP 구현 파일이 `src/work-timeline.js`, `src/work-timeline.css` 기준으로 정리되어 있다.
- [ ] 향후 배포 파일명을 `task-calendar.js`, `task-calendar.css`로 바꾸는 경우 README와 사용 문서를 함께 갱신한다.
- [ ] 전역 객체 또는 jQuery plugin 방식으로 사용할 수 있다.
- [ ] 하나의 페이지에 여러 calendar instance를 생성할 수 있다.
- [ ] instance별 option, data, event handler가 서로 섞이지 않는다.
- [ ] `destroy()` 호출 시 DOM과 event handler가 정리된다.

## 날짜 로직

- [ ] 모든 날짜 입력은 `YYYY-MM-DD` date-only 형식을 기준으로 처리한다.
- [ ] timezone 변환 때문에 날짜가 하루 밀리지 않는다.
- [ ] 업무 시작일과 종료일은 모두 포함된다.
- [ ] 다음 overlap 조건이 주간/월간 view 모두에 동일하게 적용된다.

```text
task.startDate <= visibleEndDate
AND
task.endDate >= visibleStartDate
```

- [ ] 실제 bar 범위는 다음 규칙으로 계산된다.

```text
displayStartDate = max(task.startDate, visibleStartDate)
displayEndDate = min(task.endDate, visibleEndDate)
```

- [ ] view 밖에 완전히 있는 업무는 표시되지 않는다.
- [ ] view 시작일 이전부터 시작한 업무는 첫 visible date부터 표시된다.
- [ ] view 종료일 이후까지 이어지는 업무는 마지막 visible date까지 표시된다.

## 주간 view

- [ ] 기준일이 속한 주의 visible range가 계산된다.
- [ ] 기본 주 시작일은 월요일이다.
- [ ] header에 7일이 표시된다.
- [ ] `weeklyDisplayMode` 기본값은 `timeline`이다.
- [ ] `weeklyDisplayMode: 'timeline'`에서 기존 직원별 timeline이 유지된다.
- [ ] `weeklyDisplayMode: 'cardSection'`에서 7개 날짜 섹션이 표시된다.
- [ ] `enableTaskDrag` 기본값은 `true`이다.
- [ ] `enableTaskEndDateEdit` 기본값은 `true`이다.
- [ ] `defaultTaskEditable` 기본값은 `false`이다.
- [ ] cardSection 날짜 column 위에 업무 기간을 가로지르는 card/bar가 표시된다.
- [ ] 하루짜리 업무는 1일 column만 차지하는 card/bar로 표시된다.
- [ ] 여러 날 업무는 하나의 DOM card/bar가 `displayStartDate~displayEndDate`를 span한다.
- [ ] cardSection 업무 card/bar에는 업무명, 부서명, 담당자명, 시작일, 종료일, 상태가 표시된다.
- [ ] cardSection 업무 card/bar 클릭 시 `onTaskClick` 또는 `taskClickFunctionName`이 동작한다.
- [ ] `enableTaskDrag: true`에서 cardSection 업무 card/bar는 드래그 가능한 cursor를 표시한다.
- [ ] `enableTaskDrag: true`에서 업무 card/bar를 다른 날짜 섹션으로 drop하면 새 시작일로 변경된다.
- [ ] `enableTaskDrag: true`에서 drag 이동 시 기존 기간이 유지되어 `newEndDate`가 자동 계산된다.
- [ ] `enableTaskDrag: true`에서 drag 완료 후 `onTaskMove` 또는 `taskMoveFunctionName`이 payload와 함께 호출된다.
- [ ] `enableTaskDrag: false`에서 업무 card/bar에 `draggable` 속성이 부여되지 않는다.
- [ ] `enableTaskDrag: false`에서 업무 card/bar는 drag 가능한 cursor를 표시하지 않는다.
- [ ] `enableTaskDrag: false`에서 drop target hover 스타일이 동작하지 않는다.
- [ ] `enableTaskDrag: false`에서 시작일 변경, 내부 task 데이터 변경, `onTaskMove`/`taskMoveFunctionName` 호출이 발생하지 않는다.
- [ ] `enableTaskDrag: false`에서도 업무 click 상세가 동작한다.
- [ ] `enableTaskDrag: false`에서도 double click 종료일 변경이 동작한다.
- [ ] 사용자 권한 판단은 외부 업무 시스템에서 수행하고 task별 `canEdit`과 전역 option으로 전달한다.
- [ ] `canEdit=true` 업무는 drag 가능하다.
- [ ] `canEdit=true` 업무는 double click 종료일 변경 가능하다.
- [ ] `canEdit=false` 업무는 drag 불가능하다.
- [ ] `canEdit=false` 업무는 double click 종료일 변경 불가능하다.
- [ ] `canEdit=false` 업무도 click 상세 보기는 가능하다.
- [ ] `canEdit=false` 업무에서 `onTaskMove`가 호출되지 않는다.
- [ ] `canEdit=false` 업무에서 `onTaskEndDateChange`가 호출되지 않는다.
- [ ] `canEdit`이 없을 때 `defaultTaskEditable` 옵션이 적용된다.
- [ ] 수정 불가 업무는 `wt-task-readonly` class로 구분된다.
- [ ] `API_SPEC.md`에 `canEdit` 필드가 문서화되어 있다.
- [ ] 서버 권한 재검증 필요성이 문서화되어 있다.
- [ ] taskCalendar는 서버 저장을 직접 수행하지 않는다.
- [ ] 같은 날짜에 drop하면 move callback이 호출되지 않는다.
- [ ] drag 후 업무 상세 click callback이 중복 실행되지 않는다.
- [ ] cardSection 업무 card/bar를 double click하면 종료일 변경 modal이 열린다.
- [ ] 종료일 변경 modal에 업무명, 시작일, 현재 종료일, 새 종료일 입력란이 표시된다.
- [ ] 새 종료일이 `YYYY-MM-DD` 형식이 아니면 변경하지 않고 경고를 표시한다.
- [ ] 새 종료일이 시작일보다 빠르면 변경하지 않고 경고를 표시한다.
- [ ] 종료일 변경 성공 후 내부 `task.endDate`가 갱신되고 화면이 다시 렌더링된다.
- [ ] 종료일 변경 성공 후 `onTaskEndDateChange` 또는 `taskEndDateChangeFunctionName`이 호출된다.
- [ ] double click 시 업무 상세 click callback이 중복 실행되지 않는다.
- [ ] drag와 double click 기능이 서로 방해하지 않는다.
- [ ] card/bar는 visible range 안에서 `displayStartDate`, `displayEndDate`로 clipping된다.
- [ ] 이전 주에 시작한 업무는 `visibleStartDate`부터 clipped card/bar로 표시된다.
- [ ] 다음 주까지 이어지는 업무는 `visibleEndDate`까지 clipped card/bar로 표시된다.
- [ ] 기간이 겹치는 card/bar는 서로 다른 lane에 표시된다.
- [ ] card/bar decorative arrow는 카드 click, drag, double click을 방해하지 않는다.
- [ ] drag 후 card/bar 위치가 새 시작일/종료일 기준으로 다시 계산된다.
- [ ] double click 종료일 변경 후 card/bar 길이가 새 종료일 기준으로 다시 계산된다.
- [ ] `prev`, `next`, `today` 이동이 주 단위로 동작한다.
- [ ] 주를 넘어가는 업무가 overlap 규칙에 따라 잘려 표시된다.
- [ ] 해당 주와 겹치는 업무가 없는 직원은 표시되지 않는다.
- [ ] 해당 주와 겹치는 업무가 1개 이상 있는 직원만 표시된다.
- [ ] 일요일 column은 빨간색 계열로 표시된다.
- [ ] 토요일 column은 파란색 계열로 표시된다.
- [ ] 휴일 또는 대체휴일 날짜 column은 빨간색 계열로 표시된다.
- [ ] 주간 날짜 header에 휴일명이 표시된다.

## 월간 view

- [ ] 기준일이 속한 달을 일반 calendar grid 형태로 표시한다.
- [ ] 월간 view는 직원별 row timeline이 아니다.
- [ ] 7개 요일 컬럼을 표시하고 한 주가 끝나면 다음 줄로 내려간다.
- [ ] 월간 업무는 날짜별 반복 item이 아니라 기간을 잇는 bar로 표시된다.
- [ ] 월간 업무 bar는 날짜 cell 내부에 반복 append되지 않고 week row의 task bar layer에 렌더링된다.
- [ ] 같은 week row 안의 업무 bar는 날짜 column마다 끊기지 않고 하나의 긴 pill처럼 보인다.
- [ ] 업무 bar에 업무명, 부서명, 직원명이 확인 가능하다.
- [ ] `prev`, `next`, `today` 이동이 월 단위로 동작한다.
- [ ] 월을 넘어가는 업무가 overlap 규칙에 따라 잘려 표시된다.
- [ ] 월 이전에 시작한 업무는 월 시작일 기준으로 잘려 표시된다.
- [ ] 월 이후까지 이어지는 업무는 월 마지막 날 기준으로 잘려 표시된다.
- [ ] week row를 넘어가는 업무는 week row별 segment bar로 나뉘어 표시된다.
- [ ] 월간 view에서 progress bar 업무가 날짜 cell 목록에 중복 표시되지 않는다.
- [ ] 여러 날짜 업무는 progress bar로만 표시된다.
- [ ] 하루짜리 업무는 날짜 cell 목록에 표시된다.
- [ ] progress bar 업무는 progress bar 클릭으로 상세 확인 가능하다.
- [ ] `monthRangeBarMinDays` 옵션이 기준대로 동작한다.
- [ ] 월과 겹치지 않는 업무는 어떤 날짜 칸에도 표시되지 않는다.
- [ ] 월간 view에서 `... N`은 날짜 cell별로 표시된다.
- [ ] `maxVisibleTasksPerDay`는 일자별 최대 표시 개수로 동작한다.
- [ ] 특정 날짜에 업무가 6개이고 `maxVisibleTasksPerDay`가 3이면 `... 3`이 표시된다.
- [ ] `... N` 클릭 시 해당 날짜의 숨김 업무만 modal에 표시된다.
- [ ] `... N` 계산에서 progress bar 업무는 제외된다.
- [ ] `... N` modal에 progress bar 업무가 포함되지 않는다.
- [ ] 같은 주의 다른 날짜 업무가 modal에 섞이지 않는다.
- [ ] 주 전체 업무가 많다는 이유만으로 `... N`이 표시되지 않는다.
- [ ] 휴일명과 `... N` 표시가 서로 겹치지 않는다.
- [ ] modal/popup에는 클릭한 날짜, 전체 업무 개수, 숨겨진 업무의 업무명, 부서명, 직원명, 시작일, 종료일, 상태가 표시된다.
- [ ] modal/popup은 닫기 버튼으로 닫을 수 있고 내부 스크롤이 가능하다.
- [ ] today 날짜 칸이 구분되어 표시된다.
- [ ] 월간 업무 bar 클릭 시 `onTaskClick` 또는 `taskClickFunctionName`이 동작한다.
- [ ] 월간 업무 bar segment 클릭 시 `onTaskClick` 또는 `taskClickFunctionName`에 원본 task가 전달된다.
- [ ] 월간 일요일 요일 header와 날짜 칸은 빨간색 계열로 표시된다.
- [ ] 월간 토요일 요일 header와 날짜 칸은 파란색 계열로 표시된다.
- [ ] 월간 휴일 또는 대체휴일 날짜 칸은 빨간색 계열로 표시된다.
- [ ] 월간 날짜 칸에서 휴일명이 업무 bar 영역보다 위에 표시된다.
- [ ] 날짜 숫자/휴일명 영역과 업무 bar 영역이 겹치지 않는다.
- [ ] 업무가 있는 날짜에 불필요한 상단 선 또는 깨진 border가 생기지 않는다.
- [ ] 일요일/토요일/휴일 배경과 날짜 숫자 색상이 날짜 cell 전체에서 자연스럽게 보인다.
- [ ] 휴일명은 월간 업무 bar overflow 제한과 무관하게 표시된다.

## Task rendering

- [ ] 주간 보기에서는 직원별 row에 해당 직원의 업무만 표시된다.
- [ ] 주간 보기에서는 visible range와 겹치지 않는 업무만 가진 직원 row가 숨겨진다.
- [ ] 같은 직원의 겹치는 업무는 서로 덮이지 않고 lane으로 stacking된다.
- [ ] 같은 lane에는 날짜가 겹치는 업무가 배치되지 않는다.
- [ ] 업무명은 길어도 layout을 깨지 않고 말줄임 처리된다.
- [ ] 월간 업무 bar는 긴 제목이어도 layout을 깨지 않고 말줄임 처리된다.
- [ ] status별 class가 task bar에 적용된다.
- [ ] today indicator가 visible range 안에서 정확한 위치에 표시된다.
- [ ] 주간 보기에서는 해당 주와 겹치는 업무가 없는 직원 row가 표시되지 않는다.

## API loading

- [ ] `apiUrl` 방식 자동 AJAX loading은 현재 미구현임을 문서와 화면에서 명확히 표시한다.
- [ ] `enableRemoteDataLoad=false`이면 기존처럼 direct data 기준으로 동작한다.
- [ ] `enableRemoteDataLoad=true`이면 이전/다음 기간 변경 시 custom function이 호출된다.
- [ ] `defaultDate`를 지정하면 최초 캘린더가 해당 날짜 기준으로 표시된다.
- [ ] `defaultDate`가 없으면 오늘 날짜 기준으로 표시된다.
- [ ] `enableRemoteDataLoad=true`, `loadOnInit=true`이면 최초 조회 callback이 호출된다.
- [ ] 최초 조회 payload에 `baseDate`와 `baseDateParam`이 포함된다.
- [ ] 월간 next 이동 시 `baseDateParam`이 이동한 월의 15일 기준으로 전달된다.
- [ ] 월간 prev 이동 시 `baseDateParam`이 이동한 월의 15일 기준으로 전달된다.
- [ ] 주간 이동 시 `baseDateParam`이 해당 주의 중간 날짜 기준으로 전달된다.
- [ ] custom function에서 `payload.baseDateParam`을 `searchDate`로 사용할 수 있다.
- [ ] `onRangeChange`가 `rangeChangeFunctionName`보다 우선 호출된다.
- [ ] payload에 `viewType`, `visibleStartDate`, `visibleEndDate`, `action`이 포함된다.
- [ ] custom function이 jqXHR/Promise를 반환하면 완료 후 데이터를 갱신한다.
- [ ] custom function이 object를 반환해도 데이터를 갱신한다.
- [ ] response에 포함된 `employees`, `tasks`, `holidays` 필드만 갱신한다.
- [ ] `response.tasks=[]`이면 업무 없는 캘린더가 표시된다.
- [ ] `success === false`이면 기존 데이터가 유지된다.
- [ ] API 실패 시 기존 데이터가 유지되고 캘린더가 깨지지 않는다.
- [ ] 빠른 prev/next 클릭 시 오래된 응답이 마지막 화면을 덮어쓰지 않는다.
- [ ] 월간/주간 모두 기간 변경 데이터 조회가 동작한다.
- [ ] request parameter에 `viewType`, `startDate`, `endDate`가 포함된다.
- [ ] API 응답의 `employees`, `tasks`, `range`를 검증한다.
- [ ] loading 상태가 표시된다.
- [ ] error 응답 또는 네트워크 실패 시 error 상태가 표시된다.
- [ ] `reload()` 호출 시 현재 visible range 기준으로 다시 요청한다.
- [ ] `onDataLoaded`, `onError` callback이 적절히 호출된다.

## Direct data loading

- [ ] 초기 option으로 `employees`, `tasks`를 직접 전달할 수 있다.
- [ ] 초기 option으로 `holidays`를 직접 전달할 수 있다.
- [ ] `setData(employees, tasks)`로 데이터를 교체할 수 있다.
- [ ] `setHolidays(holidays)`로 휴일 데이터를 교체할 수 있다.
- [ ] direct data 방식에서도 API loading과 같은 날짜, stacking, rendering 규칙이 적용된다.

## Public methods and callbacks

- [ ] `render()`가 현재 상태를 기준으로 다시 렌더링한다.
- [ ] `setView('week')`, `setView('month')`가 동작한다.
- [ ] `goTo('YYYY-MM-DD')`가 지정 날짜가 포함된 range로 이동한다.
- [ ] `prev()`, `next()`, `today()`가 viewType에 맞게 동작한다.
- [ ] `destroy()` 후에는 click, scroll, resize event가 남지 않는다.
- [ ] `onTaskClick`이 첫 번째 인자로 기존 `task`를 전달하고 두 번째 인자로 click payload를 전달한다.
- [ ] `onTaskMove`가 공통 식별 필드, `durationDays`, `moveMode`, `changeType: 'move'`, `source: 'cardSection'`을 포함한 keepDuration payload를 전달한다.
- [ ] `onTaskEndDateChange`가 공통 식별 필드, 변경 전후 날짜, `changeType: 'endDate'`, `source: 'cardSection'`을 포함한 payload를 전달한다.
- [ ] `taskClickFunctionName`이 지정되고 `onTaskClick`이 없으면 전역 함수가 호출된다.
- [ ] `taskMoveFunctionName`이 지정되고 `onTaskMove`가 없으면 전역 함수가 호출된다.
- [ ] `taskEndDateChangeFunctionName`이 지정되고 `onTaskEndDateChange`가 없으면 전역 함수가 호출된다.
- [ ] `onMoreClick`이 월간 `... N` 클릭 시 호출된다.
- [ ] `onEmployeeClick`이 employee를 전달한다.
- [ ] `onRangeChange`가 이동 또는 view 변경 후 호출된다.

## DOM/event cleanup

- [ ] 재렌더링 시 이전 DOM이 중복 누적되지 않는다.
- [ ] window/document event listener가 중복 등록되지 않는다.
- [ ] AJAX 요청 중 destroy된 instance가 DOM을 갱신하지 않는다.
- [ ] 여러 instance가 같은 페이지에 있어도 event namespace가 충돌하지 않는다.


## Task color mode

- [ ] 기본 `taskColorMode`는 `status`이다.
- [ ] `status` 모드에서는 기존 상태별 색상이 유지된다.
- [ ] `random` 모드에서는 업무별 랜덤 색상이 적용된다.
- [ ] 같은 `taskId`는 항상 같은 색상으로 표시된다.
- [ ] 주간 timeline, 주간 cardSection, 월간 progress bar, 월간 날짜 cell 업무 item에 색상 정책이 모두 적용된다.
- [ ] 주간 cardSection과 월간 progress bar에서 같은 `taskId` 색상이 일치한다.
- [ ] 새로고침 후에도 같은 `taskId` 색상이 유지된다.
- [ ] `canEdit=false` 업무의 readonly 스타일이 유지된다.
- [ ] 랜덤 색상 class는 `wt-` prefix를 사용한다.

## Task date range display

- [ ] `startDate`와 `endDate`가 같은 업무는 날짜가 한 번만 표시된다.
- [ ] `startDate`와 `endDate`가 다른 업무는 `startDate ~ endDate` 형태로 표시된다.
- [ ] 주간 cardSection에서 하루짜리 업무 기간 표시가 중복되지 않는다.
- [ ] 월간 `... N` modal에서 하루짜리 업무 기간 표시가 중복되지 않는다.
- [ ] 기간 표시 수정으로 날짜 계산/drag/drop 동작이 변경되지 않는다.

## CSS 충돌 여부

- [ ] 모든 class가 `wt-` prefix를 사용한다.
- [ ] 전역 element selector로 업무 시스템 전체 스타일을 바꾸지 않는다.
- [ ] Bootstrap, jQuery UI, 사내 공통 CSS와 class 이름이 충돌하지 않는다.
- [ ] root container 밖의 DOM에 영향을 주지 않는다.
- [ ] z-index 사용이 최소화되어 modal, dropdown 등 기존 UI를 가리지 않는다.

## Empty/loading/error 상태

- [ ] 빈 데이터 응답에서도 주간 캘린더가 깨지지 않는다.
- [ ] 주간 view에서 “데이터가 없습니다” 문구가 표시되지 않는다.
- [ ] 월간 보기에서 task가 모두 없을 때 empty 상태가 표시된다.
- [ ] loading 상태에서 사용자가 중복 요청을 발생시키지 않도록 처리된다.
- [ ] error 상태에서 사용자가 다시 시도할 수 있다.

## Documentation

- [ ] `USAGE_GUIDE.md`의 초기화 예시가 실제 plugin 이름과 일치한다.
- [ ] `CUSTOMIZE_GUIDE.md`의 option/callback 목록이 코드 defaults와 일치한다.
- [ ] `ARCHITECTURE.md`의 월간 bar layer 설명이 현재 DOM 구조와 일치한다.
- [ ] `COMMENT_GUIDE.md`의 주석 기준이 코드 수정 시 참고 가능하다.
- [ ] 미구현 기능은 문서에서 구현 완료처럼 표현하지 않는다.

## Code cleanup

- [ ] callback/functionName fallback 호출 로직이 중복 구현되지 않는다.
- [ ] overlap과 clipping 규칙은 공통 helper를 사용하며 주간/월간에서 같은 기준을 유지한다.
- [ ] status CSS class 생성 규칙은 한 곳에서 관리한다.
- [ ] 월간 progress bar 업무와 날짜 cell 목록 업무 분리 규칙이 중복 구현되지 않는다.
- [ ] 임시 `console.log`, 디버깅 alert, 사용하지 않는 테스트 코드가 남아 있지 않다.
- [ ] 정리 작업 후 `node --check src/work-timeline.js`를 통과한다.
