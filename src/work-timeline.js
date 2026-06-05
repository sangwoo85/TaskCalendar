(function (window, $) {
  'use strict';

  if (!$ || !$.fn) {
    throw new Error('workTimeline requires jQuery.');
  }

  var pluginName = 'workTimeline';
  var dataKey = 'wt.workTimeline';

  var defaults = {
    viewType: 'week',
    currentDate: null,
    visibleStartDate: null,
    visibleEndDate: null,
    todayDate: null,
    weekStartsOn: 1,
    weeklyDisplayMode: 'timeline',
    enableTaskDrag: true,
    enableTaskEndDateEdit: true,
    defaultTaskEditable: false,
    employees: [],
    tasks: [],
    holidays: [],
    apiUrl: null,
    employeeColumnWidth: 220,
    dayCellMinWidth: 96,
    maxVisibleTasksPerDay: 3,
    maxVisibleTaskBarsPerWeek: 3,
    monthRangeBarMinDays: 2,
    taskClickFunctionName: null,
    taskMoveFunctionName: null,
    taskEndDateChangeFunctionName: null,
    labels: {
      employee: '직원',
      prev: '이전',
      next: '다음',
      today: '오늘',
      week: '주간',
      month: '월간',
      empty: '표시할 직원 또는 업무가 없습니다.',
      emptyDay: '시작 업무 없음',
      apiPending: 'API loading은 구조만 준비되어 있습니다.',
      monthPending: 'Monthly view는 구조만 준비되어 있습니다.'
    },
    onInit: null,
    onRangeChange: null,
    onDataLoaded: null,
    onTaskClick: null,
    onTaskMove: null,
    onTaskEndDateChange: null,
    onMoreClick: null,
    onEmployeeClick: null,
    onError: null
  };

  function WorkTimeline(element, options) {
    this.element = element;
    this.options = extend({}, defaults, options || {});
    this.options.labels = extend({}, defaults.labels, (options && options.labels) || {});
    this.employees = arrayOrEmpty(this.options.employees);
    this.tasks = arrayOrEmpty(this.options.tasks);
    this.holidays = normalizeHolidays(this.options.holidays);
    this.viewType = this.options.viewType === 'month' ? 'month' : 'week';
    this.currentDate = this.options.currentDate || this.options.todayDate || formatToday();
    this.handlers = [];
    this.dragState = null;
    this.taskClickTimer = null;
    this.suppressTaskClickUntil = 0;
    this.destroyed = false;
    this.render();
    call(this.options.onInit, this, [this]);
  }

  /**
   * Rebuild the current view from in-memory data and options.
   */
  WorkTimeline.prototype.render = function () {
    if (this.destroyed) {
      return this;
    }

    this.range = this.getVisibleRange();
    this.unbindEvents();
    this.element.className = mergeClass(this.element.className, 'wt-root');
    this.element.innerHTML = '';
    this.element.appendChild(this.renderToolbar());

    if (this.options.apiUrl) {
      this.element.appendChild(this.renderState('wt-state-pending', this.options.labels.apiPending));
      this.bindToolbarEvents();
      return this;
    }

    if (this.viewType === 'month') {
      this.element.appendChild(this.renderMonthCalendar());
    } else if (this.getWeeklyDisplayMode() === 'cardSection') {
      this.element.appendChild(this.renderWeekCardSections());
    } else {
      this.element.appendChild(this.renderTimelineGrid());
    }
    this.bindToolbarEvents();
    this.bindContentEvents();
    return this;
  };

  /**
   * Rerender direct data mode.
   * apiUrl based fetching is intentionally left pending in the current MVP.
   */
  WorkTimeline.prototype.reload = function () {
    if (!this.options.apiUrl) {
      return this.render();
    }
    return this.fail('API_LOADING_PENDING', this.options.labels.apiPending);
  };

  /**
   * Change view without changing direct data.
   * Consumers that need server data should load it from onRangeChange.
   */
  WorkTimeline.prototype.setView = function (viewType) {
    this.viewType = viewType === 'month' ? 'month' : 'week';
    this.render();
    call(this.options.onRangeChange, this, [this.getRangeContext(), this]);
    return this;
  };

  /**
   * Move the current view to a date-only value.
   * The fixed visible range is cleared so week/month range can be recalculated.
   */
  WorkTimeline.prototype.goTo = function (dateText) {
    if (!isDateOnly(dateText)) {
      return this.fail('INVALID_DATE_FORMAT', 'date must be YYYY-MM-DD.');
    }
    this.currentDate = dateText;
    this.options.visibleStartDate = null;
    this.options.visibleEndDate = null;
    this.render();
    call(this.options.onRangeChange, this, [this.getRangeContext(), this]);
    return this;
  };

  /**
   * Move to previous week or month depending on current view.
   */
  WorkTimeline.prototype.prev = function () {
    this.move(this.viewType === 'month' ? -1 : -7);
    return this;
  };

  /**
   * Move to next week or month depending on current view.
   */
  WorkTimeline.prototype.next = function () {
    this.move(this.viewType === 'month' ? 1 : 7);
    return this;
  };

  /**
   * Move to todayDate and let the view recalculate its visible range.
   */
  WorkTimeline.prototype.today = function () {
    this.currentDate = this.options.todayDate || formatToday();
    this.options.visibleStartDate = null;
    this.options.visibleEndDate = null;
    this.render();
    call(this.options.onRangeChange, this, [this.getRangeContext(), this]);
    return this;
  };

  WorkTimeline.prototype.move = function (dayAmount) {
    this.currentDate = this.viewType === 'month' ? addMonths(this.currentDate, dayAmount) : addDays(this.currentDate, dayAmount);
    this.options.visibleStartDate = null;
    this.options.visibleEndDate = null;
    this.render();
    call(this.options.onRangeChange, this, [this.getRangeContext(), this]);
  };

  /**
   * Replace direct data and rerender the current view.
   * This does not call a server API; API loading is still pending.
   */
  WorkTimeline.prototype.setData = function (employees, tasks) {
    this.employees = arrayOrEmpty(employees);
    this.tasks = arrayOrEmpty(tasks);
    this.render();
    call(this.options.onDataLoaded, this, [{ employees: this.employees, tasks: this.tasks }, this]);
    return this;
  };

  /**
   * Replace holiday data and rerender date headers/cells.
   */
  WorkTimeline.prototype.setHolidays = function (holidays) {
    this.holidays = normalizeHolidays(holidays);
    this.render();
    return this;
  };

  /**
   * Remove DOM and instance event handlers created by this plugin instance.
   */
  WorkTimeline.prototype.destroy = function () {
    this.destroyed = true;
    this.unbindEvents();
    removeClass(this.element, 'wt-root');
    this.element.innerHTML = '';
    setData(this.element, dataKey, null);
  };

  WorkTimeline.prototype.getVisibleRange = function () {
    var start;
    var end;

    if (this.viewType === 'month') {
      start = monthStart(this.currentDate);
      end = monthEnd(this.currentDate);
      return makeRange('month', start, end);
    }

    // Fixed ranges are mainly for JSP/demo verification where the exact week must stay stable.
    if (isDateOnly(this.options.visibleStartDate) && isDateOnly(this.options.visibleEndDate)) {
      return makeRange('week', this.options.visibleStartDate, this.options.visibleEndDate);
    }

    start = startOfWeek(this.currentDate, this.options.weekStartsOn);
    end = addDays(start, 6);
    return makeRange('week', start, end);
  };

  WorkTimeline.prototype.getRangeContext = function () {
    return {
      viewType: this.viewType,
      startDate: this.range.startDate,
      endDate: this.range.endDate
    };
  };

  WorkTimeline.prototype.getWeeklyDisplayMode = function () {
    return this.options.weeklyDisplayMode === 'cardSection' ? 'cardSection' : 'timeline';
  };

  WorkTimeline.prototype.renderToolbar = function () {
    var toolbar = el('div', 'wt-toolbar');
    var nav = el('div', 'wt-toolbar-group');
    var title = el('div', 'wt-toolbar-title', this.formatRangeTitle());
    var viewSwitch = el('div', 'wt-view-switch');

    nav.appendChild(button('wt-toolbar-button', this.options.labels.prev, 'data-wt-action', 'prev'));
    nav.appendChild(button('wt-toolbar-button', this.options.labels.today, 'data-wt-action', 'today'));
    nav.appendChild(button('wt-toolbar-button', this.options.labels.next, 'data-wt-action', 'next'));

    viewSwitch.appendChild(button('wt-view-switch-button' + (this.viewType === 'week' ? ' wt-is-active' : ''), this.options.labels.week, 'data-wt-view', 'week'));
    viewSwitch.appendChild(button('wt-view-switch-button' + (this.viewType === 'month' ? ' wt-is-active' : ''), this.options.labels.month, 'data-wt-view', 'month'));

    toolbar.appendChild(nav);
    toolbar.appendChild(title);
    toolbar.appendChild(viewSwitch);
    return toolbar;
  };

  WorkTimeline.prototype.formatRangeTitle = function () {
    if (this.viewType === 'month') {
      return this.range.startDate.slice(0, 7);
    }
    return this.range.startDate + ' ~ ' + this.range.endDate;
  };

  WorkTimeline.prototype.renderTimelineGrid = function () {
    if (!this.employees.length && !this.tasks.length) {
      return this.renderState('wt-state-empty', this.options.labels.empty);
    }

    var grid = el('div', 'wt-grid wt-grid-' + this.viewType);
    var employeeColumn = el('div', 'wt-employee-column');
    var timeline = el('div', 'wt-timeline');
    var body = el('div', 'wt-timeline-body');
    var groupedTasks = groupVisibleTasks(this.employees, this.tasks, this.range);
    var visibleEmployees = filterEmployeesWithVisibleTasks(this.employees, groupedTasks);
    var today = this.options.todayDate || formatToday();
    var holidayMap = buildHolidayMap(this.holidays);

    if (!visibleEmployees.length) {
      return this.renderState('wt-state-empty', this.options.labels.empty);
    }

    grid.style.setProperty('--wt-employee-column-width', this.options.employeeColumnWidth + 'px');
    grid.style.setProperty('--wt-day-cell-min-width', this.options.dayCellMinWidth + 'px');
    grid.style.setProperty('--wt-day-count', this.range.days.length);

    employeeColumn.appendChild(el('div', 'wt-employee-header', this.options.labels.employee));
    timeline.appendChild(renderDateHeader(this.range.days, today, holidayMap));

    for (var i = 0; i < visibleEmployees.length; i += 1) {
      var employee = visibleEmployees[i];
      var lanes = buildLanes(groupedTasks[employee.id] || []);
      var laneCount = Math.max(lanes.length, 1);
      var rowHeight = 46 + (laneCount * 30);

      employeeColumn.appendChild(renderEmployeeRow(employee, rowHeight));
      body.appendChild(renderTimelineRow(employee, this.range, lanes, rowHeight, today, holidayMap));
    }

    timeline.appendChild(body);
    grid.appendChild(employeeColumn);
    grid.appendChild(timeline);
    return grid;
  };

  WorkTimeline.prototype.renderWeekCardSections = function () {
    if (!this.tasks.length) {
      return this.renderState('wt-state-empty', this.options.labels.empty);
    }

    var wrap = el('div', 'wt-week-card-sections');
    var today = this.options.todayDate || formatToday();
    var holidayMap = buildHolidayMap(this.holidays);
    var employeeMap = buildEmployeeMap(this.employees);
    var rangeItems = buildWeekRangeItems(this.tasks, this.range);
    var lanes = buildLanes(rangeItems);
    var flatItems = flattenLanes(lanes);

    wrap.style.setProperty('--wt-day-count', this.range.days.length);
    wrap.style.setProperty('--wt-week-lane-count', String(Math.max(lanes.length, 1)));

    for (var i = 0; i < this.range.days.length; i += 1) {
      var dateText = this.range.days[i];
      wrap.appendChild(this.renderWeekCardDay(dateText, countWeekItemsOnDate(flatItems, dateText), today, holidayMap));
    }

    if (!flatItems.length) {
      wrap.appendChild(el('div', 'wt-week-card-empty wt-week-range-empty', this.options.labels.empty));
    }

    for (var laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
      for (var taskIndex = 0; taskIndex < lanes[laneIndex].length; taskIndex += 1) {
        wrap.appendChild(renderWeekRangeBar(lanes[laneIndex][taskIndex], laneIndex, employeeMap, this.range, this.canDragTask(lanes[laneIndex][taskIndex].task), this.isTaskEditable(lanes[laneIndex][taskIndex].task)));
      }
    }

    return wrap;
  };

  WorkTimeline.prototype.renderWeekCardDay = function (dateText, taskCount, today, holidayMap) {
    var info = parseDateOnly(dateText);
    var holiday = holidayMap[dateText];
    var className = 'wt-week-card-day wt-week-day-section wt-week-day-drop-target ' + getDateClass(info.weekday) + getHolidayClass(holiday) + (dateText === today ? ' wt-week-card-day-today' : '');
    var day = el('section', className);
    var header = el('div', 'wt-week-card-day-header');
    var title = el('div', 'wt-week-card-day-title');

    day.setAttribute('data-wt-date', dateText);
    title.appendChild(el('span', 'wt-week-card-weekday', weekdayLabel(info.weekday)));
    title.appendChild(el('span', 'wt-week-card-date', String(info.month) + '/' + String(info.day)));
    header.appendChild(title);
    header.appendChild(el('span', 'wt-week-card-count', String(taskCount)));
    day.appendChild(header);

    if (holiday) {
      day.appendChild(renderHolidayName(holiday));
    }

    return day;
  };

  WorkTimeline.prototype.renderMonthCalendar = function () {
    if (!this.tasks.length) {
      return this.renderState('wt-state-empty', this.options.labels.empty);
    }

    var month = el('div', 'wt-month');
    var header = el('div', 'wt-month-weekdays');
    var grid = el('div', 'wt-month-grid');
    var today = this.options.todayDate || formatToday();
    var tasks = getVisibleTasks(this.tasks, this.range);
    var monthTaskGroups = splitMonthTasks(tasks, this.options.monthRangeBarMinDays);
    var holidayMap = buildHolidayMap(this.holidays);
    var calendarDays = buildMonthCalendarDays(this.range, this.options.weekStartsOn);
    var weekdayStart = this.options.weekStartsOn === 0 ? 0 : 1;

    for (var i = 0; i < 7; i += 1) {
      var weekday = (weekdayStart + i) % 7;
      header.appendChild(el('div', 'wt-month-weekday ' + getDayClass(weekday), weekdayLabel(weekday)));
    }

    for (var j = 0; j < calendarDays.length; j += 7) {
      grid.appendChild(this.renderMonthWeekRow(calendarDays.slice(j, j + 7), monthTaskGroups.rangeTasks, monthTaskGroups.dayListTasks, today, holidayMap));
    }

    month.appendChild(header);
    month.appendChild(grid);
    return month;
  };

  WorkTimeline.prototype.renderMonthWeekRow = function (weekDays, rangeTasks, dayListTasks, today, holidayMap) {
    var row = el('div', 'wt-month-week-row');
    var days = el('div', 'wt-month-week-days');
    var bars = el('div', 'wt-month-week-bars');
    var segments = buildMonthWeekSegments(rangeTasks, weekDays, this.range);
    var lanes = buildMonthSegmentLanes(segments);
    var maxVisible = Math.max(Number(this.options.maxVisibleTaskBarsPerWeek) || 3, 0);
    var maxDayTaskSlots = Math.max(Number(this.options.maxVisibleTasksPerDay) || 3, 0) + 1;
    var visibleLaneCount = Math.min(lanes.length, maxVisible);
    var renderedLaneCount = visibleLaneCount;

    row.style.setProperty('--wt-month-visible-lanes', Math.max(renderedLaneCount, 1));
    row.style.setProperty('--wt-month-day-task-slots', String(maxDayTaskSlots));

    for (var i = 0; i < weekDays.length; i += 1) {
      days.appendChild(this.renderMonthDay(weekDays[i], today, holidayMap, dayListTasks));
    }

    for (var laneIndex = 0; laneIndex < visibleLaneCount; laneIndex += 1) {
      for (var taskIndex = 0; taskIndex < lanes[laneIndex].length; taskIndex += 1) {
        bars.appendChild(renderMonthSegmentBar(lanes[laneIndex][taskIndex], laneIndex, this.range, weekDays[0], weekDays[6]));
      }
    }

    row.appendChild(days);
    row.appendChild(bars);
    return row;
  };

  WorkTimeline.prototype.renderMonthDay = function (dateText, today, holidayMap, visibleTasks) {
    var isCurrentMonth = dateText >= this.range.startDate && dateText <= this.range.endDate;
    var info = parseDateOnly(dateText);
    var holiday = isCurrentMonth ? holidayMap[dateText] : null;
    var className = 'wt-month-day ' + getDayClass(info.weekday) + getHolidayClass(holiday) + (isCurrentMonth ? '' : ' wt-month-day-empty') + (dateText === today ? ' wt-month-day-today' : '');
    var day = el('div', className);
    var dayTasks = isCurrentMonth ? getTasksOnDate(visibleTasks, dateText) : [];
    var maxVisibleTasks = Math.max(Number(this.options.maxVisibleTasksPerDay) || 3, 0);
    var visibleDayTasks = dayTasks.slice(0, maxVisibleTasks);
    var hiddenDayTasks = dayTasks.slice(maxVisibleTasks);
    var list;

    day.appendChild(el('div', 'wt-month-day-number', String(info.day)));
    if (holiday) {
      day.appendChild(renderHolidayName(holiday));
    }
    if (visibleDayTasks.length || hiddenDayTasks.length) {
      list = el('div', 'wt-month-day-task-list');
      for (var i = 0; i < visibleDayTasks.length; i += 1) {
        list.appendChild(renderMonthDayTask(visibleDayTasks[i], dateText, this.range));
      }
      if (hiddenDayTasks.length) {
        list.appendChild(renderMoreButton(dateText, hiddenDayTasks, dayTasks, holiday, 'wt-month-day-more wt-month-cell-more'));
      }
      day.appendChild(list);
    }
    return day;
  };

  WorkTimeline.prototype.renderState = function (stateClass, message) {
    return el('div', 'wt-state ' + stateClass, message);
  };

  WorkTimeline.prototype.bindToolbarEvents = function () {
    var self = this;
    this.on(this.element, 'click', function (event) {
      var actionNode = closest(event.target, '[data-wt-action]');
      var viewNode = closest(event.target, '[data-wt-view]');
      if (actionNode) {
        self[actionNode.getAttribute('data-wt-action')]();
      }
      if (viewNode) {
        self.setView(viewNode.getAttribute('data-wt-view'));
      }
    });
  };

  WorkTimeline.prototype.bindContentEvents = function () {
    var self = this;
    this.on(this.element, 'click', function (event) {
      var taskNode = closest(event.target, '.wt-task-clickable');
      var moreNode = closest(event.target, '.wt-month-more');
      var closeNode = closest(event.target, '.wt-modal-close');
      var endDateActionNode = closest(event.target, '[data-wt-enddate-action]');
      var employeeNode;

      if (endDateActionNode) {
        self.handleEndDateModalAction(endDateActionNode.getAttribute('data-wt-enddate-action'));
        return;
      }

      if (closeNode) {
        self.closeMoreModal();
        return;
      }

      if (moreNode && moreNode.__wtMore) {
        self.handleMoreClick(moreNode.__wtMore.date, moreNode.__wtMore.hiddenTasks, moreNode.__wtMore.allTasks, moreNode.__wtMore.holiday);
        return;
      }

      if (taskNode && taskNode.__wtTask) {
        if (self.suppressTaskClickUntil && nowTime() < self.suppressTaskClickUntil) {
          return;
        }
        if (self.isCardSectionTaskNode(taskNode)) {
          event.preventDefault();
          self.delayTaskClick(taskNode.__wtTask, taskNode.__wtContext, event);
          return;
        }
        self.handleTaskClick(taskNode.__wtTask, taskNode.__wtContext, event);
        return;
      }

      employeeNode = closest(event.target, '.wt-employee-row');
      if (employeeNode && employeeNode.__wtEmployee) {
        call(self.options.onEmployeeClick, self, [employeeNode.__wtEmployee, event]);
      }
    });

    this.on(this.element, 'dragstart', function (event) {
      self.handleCardDragStart(event);
    });
    this.on(this.element, 'dblclick', function (event) {
      self.handleCardDoubleClick(event);
    });
    this.on(this.element, 'dragover', function (event) {
      self.handleCardDragOver(event);
    });
    this.on(this.element, 'dragleave', function (event) {
      self.handleCardDragLeave(event);
    });
    this.on(this.element, 'drop', function (event) {
      self.handleCardDrop(event);
    });
    this.on(this.element, 'dragend', function () {
      self.clearCardDragState();
    });
  };

  WorkTimeline.prototype.handleTaskClick = function (task, context, event) {
    var payload = buildTaskClickPayload(task, context, event);

    invokeConfiguredCallback(this, 'onTaskClick', 'taskClickFunctionName', [task, payload, event]);
  };

  WorkTimeline.prototype.isCardSectionTaskNode = function (taskNode) {
    return this.viewType === 'week' && this.getWeeklyDisplayMode() === 'cardSection' && !!closest(taskNode, '.wt-week-task-card');
  };

  WorkTimeline.prototype.delayTaskClick = function (task, context, event) {
    var self = this;
    this.clearTaskClickTimer();
    // cardSection은 click과 dblclick이 같은 card/bar에서 발생하므로
    // 단일 click callback을 잠시 지연시켜 dblclick이 들어오면 취소할 수 있게 한다.
    this.taskClickTimer = window.setTimeout(function () {
      self.taskClickTimer = null;
      self.handleTaskClick(task, context, event);
    }, 300);
  };

  WorkTimeline.prototype.clearTaskClickTimer = function () {
    if (this.taskClickTimer) {
      window.clearTimeout(this.taskClickTimer);
      this.taskClickTimer = null;
    }
  };

  WorkTimeline.prototype.handleCardDoubleClick = function (event) {
    if (this.viewType !== 'week' || this.getWeeklyDisplayMode() !== 'cardSection' || this.dragState) {
      return;
    }

    var card = closest(event.target, '.wt-week-task-card');
    if (!card || !card.__wtTask) {
      return;
    }
    if (!this.canEditTaskEndDate(card.__wtTask)) {
      return;
    }

    event.preventDefault();
    this.clearTaskClickTimer();
    // dblclick 직후 브라우저가 click을 한 번 더 전달할 수 있어 짧게 무시한다.
    this.suppressTaskClickUntil = nowTime() + 350;
    this.openEndDateModal(getTaskKey(card.__wtTask));
  };

  WorkTimeline.prototype.handleCardDragStart = function (event) {
    if (this.viewType !== 'week' || this.getWeeklyDisplayMode() !== 'cardSection' || !this.options.enableTaskDrag) {
      return;
    }

    var card = closest(event.target, '.wt-week-task-card');
    if (!card || !card.__wtTask || !event.dataTransfer) {
      return;
    }
    if (!this.canDragTask(card.__wtTask)) {
      event.preventDefault();
      return;
    }

    var task = card.__wtTask;
    var taskKey = getTaskKey(task);
    if (!taskKey) {
      console.warn('workTimeline: taskId not found for draggable card.', task);
      event.preventDefault();
      return;
    }

    this.dragState = {
      taskKey: taskKey,
      oldStartDate: task.startDate,
      oldEndDate: task.endDate,
      card: card
    };
    this.clearTaskClickTimer();
    card.className = mergeClass(card.className, 'wt-card-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskKey);
  };

  WorkTimeline.prototype.handleCardDragOver = function (event) {
    if (!this.options.enableTaskDrag || !this.dragState) {
      return;
    }

    var day = this.getWeekCardDayFromEvent(event);
    if (!day || !day.getAttribute('data-wt-date')) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    day.className = mergeClass(day.className, 'wt-drop-target-active');
  };

  WorkTimeline.prototype.handleCardDragLeave = function (event) {
    if (!this.options.enableTaskDrag) {
      return;
    }

    var day = this.getWeekCardDayFromEvent(event);
    if (!day || (event.relatedTarget && day.contains(event.relatedTarget))) {
      return;
    }
    removeClass(day, 'wt-drop-target-active');
  };

  WorkTimeline.prototype.handleCardDrop = function (event) {
    if (!this.options.enableTaskDrag || !this.dragState) {
      return;
    }

    var day = this.getWeekCardDayFromEvent(event);
    if (!day) {
      this.clearCardDragState();
      return;
    }

    var newStartDate = day.getAttribute('data-wt-date');
    if (!isDateOnly(newStartDate)) {
      console.warn('workTimeline: invalid drop date.', newStartDate);
      this.clearCardDragState();
      return;
    }

    event.preventDefault();
    removeClass(day, 'wt-drop-target-active');
    // Drop target date becomes the new startDate; moveTaskByDrag keeps the original duration.
    this.moveTaskByDrag(this.dragState.taskKey, newStartDate);
    this.suppressTaskClickUntil = nowTime() + 350;
    this.clearCardDragState();
  };

  WorkTimeline.prototype.getWeekCardDayFromEvent = function (event) {
    var directDay = closest(event.target, '.wt-week-card-day');
    var wrap;
    var rect;
    var x;
    var dayWidth;
    var index;
    var days;

    if (directDay) {
      return directDay;
    }

    // Range bars are absolutely positioned above day columns, so drop can occur on the bar itself.
    // In that case calculate the target day from mouse X inside the 7-day grid.
    wrap = closest(event.target, '.wt-week-card-sections');
    if (!wrap || !wrap.getBoundingClientRect) {
      return null;
    }

    rect = wrap.getBoundingClientRect();
    x = event.clientX - rect.left + wrap.scrollLeft;
    dayWidth = wrap.scrollWidth / this.range.days.length;
    index = Math.floor(x / dayWidth);
    days = wrap.querySelectorAll('.wt-week-card-day');

    if (index < 0) {
      index = 0;
    }
    if (index >= days.length) {
      index = days.length - 1;
    }
    return days[index] || null;
  };

  WorkTimeline.prototype.clearCardDragState = function () {
    var draggingNodes = this.element.querySelectorAll('.wt-card-dragging');
    var activeNodes = this.element.querySelectorAll('.wt-drop-target-active');
    for (var i = 0; i < draggingNodes.length; i += 1) {
      removeClass(draggingNodes[i], 'wt-card-dragging');
    }
    for (var j = 0; j < activeNodes.length; j += 1) {
      removeClass(activeNodes[j], 'wt-drop-target-active');
    }
    this.dragState = null;
  };

  WorkTimeline.prototype.moveTaskByDrag = function (taskKey, newStartDate) {
    if (!this.options.enableTaskDrag) {
      return;
    }

    var task = findTaskByKey(this.tasks, taskKey);
    if (!task) {
      console.warn('workTimeline: taskId not found for move.', taskKey);
      return;
    }
    if (!this.canDragTask(task)) {
      return;
    }

    var oldStartDate = task.startDate;
    var oldEndDate = task.endDate;
    var durationDays;
    var newEndDate;
    var payload;

    if (oldStartDate === newStartDate) {
      return;
    }

    if (!isDateOnly(oldStartDate) || !isDateOnly(oldEndDate) || oldStartDate > oldEndDate) {
      console.warn('workTimeline: invalid task date for move.', task);
      return;
    }

    durationDays = dayDiff(oldStartDate, oldEndDate) + 1;
    newEndDate = addDays(newStartDate, durationDays - 1);
    if (!isDateOnly(newEndDate)) {
      console.warn('workTimeline: failed to calculate newEndDate.', task);
      return;
    }

    task.startDate = newStartDate;
    task.endDate = newEndDate;
    payload = extend(buildTaskChangePayload(task, {
      oldStartDate: oldStartDate,
      oldEndDate: oldEndDate,
      newStartDate: newStartDate,
      newEndDate: newEndDate,
      changeType: 'move'
    }), {
      durationDays: durationDays,
      moveMode: 'keepDuration'
    });

    this.handleTaskMove(payload);
    this.render();
  };

  WorkTimeline.prototype.handleTaskMove = function (payload) {
    invokeConfiguredCallback(this, 'onTaskMove', 'taskMoveFunctionName', [payload]);
  };

  WorkTimeline.prototype.openEndDateModal = function (taskKey) {
    this.closeEndDateModal();

    var task = findTaskByKey(this.tasks, taskKey);
    if (!task) {
      console.warn('workTimeline: taskId not found for endDate change.', taskKey);
      return;
    }

    var overlay = el('div', 'wt-end-date-modal-backdrop');
    var modal = el('div', 'wt-end-date-modal-card');
    var body = el('div', 'wt-end-date-modal-body');
    var actions = el('div', 'wt-end-date-modal-actions');
    var input = el('input', 'wt-end-date-modal-input');
    var error = el('div', 'wt-end-date-modal-error');
    var cancelButton = button('wt-end-date-modal-button', '취소', 'data-wt-enddate-action', 'cancel');
    var applyButton = button('wt-end-date-modal-button wt-end-date-modal-apply', '적용', 'data-wt-enddate-action', 'apply');

    overlay.__wtEndDateTaskKey = taskKey;
    input.type = 'text';
    input.value = task.endDate || '';
    input.placeholder = 'YYYY-MM-DD';
    input.setAttribute('aria-label', '새 종료일');

    modal.appendChild(el('div', 'wt-end-date-modal-title', '업무 종료일 변경'));
    body.appendChild(el('div', 'wt-end-date-modal-row', '업무명: ' + (task.title || '')));
    body.appendChild(el('div', 'wt-end-date-modal-row', '시작일: ' + (task.startDate || '')));
    body.appendChild(el('div', 'wt-end-date-modal-row', '현재 종료일: ' + (task.endDate || '')));
    body.appendChild(el('label', 'wt-end-date-modal-label', '새 종료일'));
    body.appendChild(input);
    body.appendChild(error);
    actions.appendChild(cancelButton);
    actions.appendChild(applyButton);
    modal.appendChild(body);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    this.element.appendChild(overlay);
    this.endDateModal = overlay;
    input.focus();
    input.select();
  };

  WorkTimeline.prototype.handleEndDateModalAction = function (action) {
    if (action === 'cancel') {
      this.closeEndDateModal();
      return;
    }
    if (action === 'apply') {
      this.applyEndDateModal();
    }
  };

  WorkTimeline.prototype.applyEndDateModal = function () {
    if (!this.endDateModal) {
      return;
    }

    var taskKey = this.endDateModal.__wtEndDateTaskKey;
    var input = this.endDateModal.querySelector('.wt-end-date-modal-input');
    var error = this.endDateModal.querySelector('.wt-end-date-modal-error');
    var task = findTaskByKey(this.tasks, taskKey);
    var newEndDate = input ? input.value : '';

    if (!task) {
      console.warn('workTimeline: taskId not found for endDate apply.', taskKey);
      return;
    }
    if (!isDateOnly(newEndDate)) {
      this.showEndDateError(error, '종료일은 YYYY-MM-DD 형식이어야 합니다.');
      return;
    }
    if (newEndDate < task.startDate) {
      this.showEndDateError(error, '종료일은 시작일보다 빠를 수 없습니다.');
      return;
    }
    if (newEndDate === task.endDate) {
      this.closeEndDateModal();
      return;
    }

    this.changeTaskEndDate(taskKey, newEndDate);
  };

  WorkTimeline.prototype.showEndDateError = function (errorNode, message) {
    if (errorNode) {
      errorNode.textContent = message;
    }
    window.alert(message);
  };

  WorkTimeline.prototype.changeTaskEndDate = function (taskKey, newEndDate) {
    var task = findTaskByKey(this.tasks, taskKey);
    if (!task) {
      console.warn('workTimeline: taskId not found for endDate change.', taskKey);
      return;
    }
    if (!this.canEditTaskEndDate(task)) {
      return;
    }

    var oldStartDate = task.startDate;
    var oldEndDate = task.endDate;
    var payload;

    if (!isDateOnly(newEndDate) || newEndDate < task.startDate) {
      console.warn('workTimeline: invalid newEndDate.', newEndDate);
      return;
    }

    // The library mutates direct data for immediate UI feedback only.
    // Persisting this change is the responsibility of the consumer callback.
    task.endDate = newEndDate;
    payload = buildTaskChangePayload(task, {
      oldStartDate: oldStartDate,
      oldEndDate: oldEndDate,
      newStartDate: task.startDate,
      newEndDate: newEndDate,
      changeType: 'endDate'
    });

    this.closeEndDateModal();
    this.render();
    this.handleTaskEndDateChange(payload);
  };

  WorkTimeline.prototype.isTaskEditable = function (task) {
    if (task && typeof task.canEdit === 'boolean') {
      return task.canEdit;
    }
    return this.options.defaultTaskEditable === true;
  };

  WorkTimeline.prototype.canDragTask = function (task) {
    return this.options.enableTaskDrag === true && this.isTaskEditable(task);
  };

  WorkTimeline.prototype.canEditTaskEndDate = function (task) {
    return this.options.enableTaskEndDateEdit === true && this.isTaskEditable(task);
  };

  WorkTimeline.prototype.handleTaskEndDateChange = function (payload) {
    invokeConfiguredCallback(this, 'onTaskEndDateChange', 'taskEndDateChangeFunctionName', [payload]);
  };

  WorkTimeline.prototype.handleMoreClick = function (dateText, hiddenTasks, allTasks, holiday) {
    if (typeof this.options.onMoreClick === 'function') {
      var result = this.options.onMoreClick.call(this, dateText, hiddenTasks, allTasks);
      if (result === false) {
        return;
      }
    }
    this.openMoreModal(dateText, hiddenTasks, allTasks, holiday);
  };

  WorkTimeline.prototype.openMoreModal = function (dateText, hiddenTasks, allTasks, holiday) {
    this.closeMoreModal();

    var overlay = el('div', 'wt-modal-overlay');
    var modal = el('div', 'wt-modal');
    var header = el('div', 'wt-modal-header');
    var title = el('div', 'wt-modal-title', dateText + ' 업무 목록');
    var closeButton = button('wt-modal-close', '닫기');
    var summary = el('div', 'wt-modal-summary', '총 ' + allTasks.length + '건 / 숨김 ' + hiddenTasks.length + '건');
    var list = el('div', 'wt-modal-task-list');

    closeButton.setAttribute('aria-label', '닫기');
    header.appendChild(title);
    header.appendChild(closeButton);
    modal.appendChild(header);
    if (holiday) {
      modal.appendChild(el('div', 'wt-modal-holiday-name', holiday.name));
    }
    modal.appendChild(summary);

    for (var i = 0; i < hiddenTasks.length; i += 1) {
      list.appendChild(renderModalTask(hiddenTasks[i], i + 1));
    }

    modal.appendChild(list);
    overlay.appendChild(modal);
    this.element.appendChild(overlay);
    this.moreModal = overlay;
  };

  WorkTimeline.prototype.closeMoreModal = function () {
    if (this.moreModal && this.moreModal.parentNode) {
      this.moreModal.parentNode.removeChild(this.moreModal);
    }
    this.moreModal = null;
  };

  WorkTimeline.prototype.closeEndDateModal = function () {
    if (this.endDateModal && this.endDateModal.parentNode) {
      this.endDateModal.parentNode.removeChild(this.endDateModal);
    }
    this.endDateModal = null;
  };

  WorkTimeline.prototype.on = function (target, type, handler) {
    target.addEventListener(type, handler, false);
    this.handlers.push({ target: target, type: type, handler: handler });
  };

  WorkTimeline.prototype.unbindEvents = function () {
    this.clearTaskClickTimer();
    // Handlers are registered per instance so multiple JSP widgets can coexist safely.
    // render() also calls this before replacing DOM to avoid duplicate delegated listeners.
    for (var i = 0; i < this.handlers.length; i += 1) {
      var item = this.handlers[i];
      item.target.removeEventListener(item.type, item.handler, false);
    }
    this.handlers = [];
    this.closeMoreModal();
    this.closeEndDateModal();
  };

  WorkTimeline.prototype.fail = function (code, message) {
    var error = { code: code, message: message };
    call(this.options.onError, this, [error, this]);
    return this;
  };

  function renderDateHeader(days, today, holidayMap) {
    var header = el('div', 'wt-date-header');
    for (var i = 0; i < days.length; i += 1) {
      var date = days[i];
      var info = parseDateOnly(date);
      var holiday = holidayMap[date];
      var className = 'wt-date-cell';
      if (date === today) {
        className += ' wt-date-cell-today';
      }
      className += ' ' + getDateClass(info.weekday) + getHolidayClass(holiday);
      if (info.weekday === 0 || info.weekday === 6) {
        className += ' wt-date-cell-weekend';
      }
      header.appendChild(htmlEl('div', className, '<span class="wt-date-day">' + pad(info.day) + '</span><span class="wt-date-weekday">' + weekdayLabel(info.weekday) + '</span>' + renderHolidayNameHtml(holiday)));
    }
    return header;
  }

  function renderEmployeeRow(employee, height) {
    var row = el('div', 'wt-employee-row');
    var meta = [employee.departmentName, employee.positionName].filter(Boolean).join(' / ');
    row.style.height = height + 'px';
    row.__wtEmployee = employee;
    row.appendChild(el('div', 'wt-employee-name', employee.name || employee.id || ''));
    if (meta) {
      row.appendChild(el('div', 'wt-employee-meta', meta));
    }
    return row;
  }

  function renderTimelineRow(employee, range, lanes, height, today, holidayMap) {
    var row = el('div', 'wt-timeline-row');
    row.style.height = height + 'px';

    for (var i = 0; i < range.days.length; i += 1) {
      var info = parseDateOnly(range.days[i]);
      var holiday = holidayMap[range.days[i]];
      row.appendChild(el('div', 'wt-timeline-cell ' + getDateClass(info.weekday) + getHolidayClass(holiday) + (range.days[i] === today ? ' wt-timeline-cell-today' : '')));
    }

    for (var laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
      for (var taskIndex = 0; taskIndex < lanes[laneIndex].length; taskIndex += 1) {
        row.appendChild(renderTaskBar(employee, lanes[laneIndex][taskIndex], laneIndex, range));
      }
    }

    return row;
  }

  function renderTaskBar(employee, item, laneIndex, range) {
    var status = normalizeStatus(item.task.status);
    var bar = button('wt-task-bar wt-task-clickable ' + statusClass(status), item.task.title || '');
    var dayCount = range.days.length;
    var left = (item.startOffset / dayCount) * 100;
    var width = ((item.endOffset - item.startOffset + 1) / dayCount) * 100;

    bar.style.left = left + '%';
    bar.style.width = width + '%';
    bar.style.top = (12 + laneIndex * 30) + 'px';
    bar.title = (item.task.title || '') + ' (' + item.displayStartDate + ' ~ ' + item.displayEndDate + ')';
    bar.innerHTML = '<span class="wt-task-title">' + escapeHtml(item.task.title || '') + '</span>';
    bar.__wtTask = item.task;
    bar.__wtContext = {
      employee: employee,
      displayStartDate: item.displayStartDate,
      displayEndDate: item.displayEndDate,
      visibleStartDate: range.startDate,
      visibleEndDate: range.endDate
    };
    return bar;
  }

  function renderWeekRangeBar(item, laneIndex, employeeMap, range, enableTaskDrag, isTaskEditable) {
    var task = item.task;
    var status = normalizeStatus(task.status);
    var employee = employeeMap[task.employeeId];
    var owner = formatTaskOwnerWithEmployee(task, employee);
    var className = [
      'wt-week-task-card',
      'wt-week-range-bar',
      enableTaskDrag ? 'wt-week-card-draggable wt-task-drag-enabled' : 'wt-task-drag-disabled',
      isTaskEditable ? 'wt-task-editable' : 'wt-task-readonly',
      'wt-task-clickable',
      statusClass(status),
      item.startsBeforeRange ? 'wt-week-range-bar-start' : '',
      item.endsAfterRange ? 'wt-week-range-bar-end' : '',
      item.spanDays === 1 ? 'wt-week-range-bar-single' : ''
    ].join(' ');
    var bar = button(className, '');

    if (enableTaskDrag) {
      bar.setAttribute('draggable', 'true');
    }
    bar.setAttribute('data-wt-task-key', getTaskKey(task));
    bar.style.left = 'calc(' + ((item.startOffset / range.days.length) * 100) + '% + 8px)';
    bar.style.width = 'calc(' + ((item.spanDays / range.days.length) * 100) + '% - 16px)';
    bar.style.top = (74 + laneIndex * 76) + 'px';
    bar.title = (task.title || '') + ' (' + item.displayStartDate + ' ~ ' + item.displayEndDate + ')' + (isTaskEditable ? '' : ' - 수정 권한 없음');
    bar.innerHTML = [
      '<span class="wt-week-range-content">',
      '<span class="wt-week-task-title">' + escapeHtml(task.title || '') + '</span>',
      '<span class="wt-week-task-owner">' + escapeHtml(owner) + '</span>',
      '<span class="wt-week-task-period">' + escapeHtml(item.displayStartDate || '') + ' ~ ' + escapeHtml(item.displayEndDate || '') + '</span>',
      '<span class="wt-week-task-status">' + escapeHtml(status) + '</span>',
      '</span>'
    ].join('');
    bar.__wtTask = task;
    bar.__wtContext = {
      employee: employee || null,
      date: item.displayStartDate,
      displayStartDate: item.displayStartDate,
      displayEndDate: item.displayEndDate,
      visibleStartDate: range.startDate,
      visibleEndDate: range.endDate,
      weeklyDisplayMode: 'cardSection'
    };
    return bar;
  }

  function renderMoreButton(dateText, hiddenTasks, allTasks, holiday, extraClassName) {
    var more = button('wt-month-more' + (extraClassName ? ' ' + extraClassName : ''), '... ' + hiddenTasks.length);
    more.title = dateText + ' 숨겨진 업무 ' + hiddenTasks.length + '건 보기';
    more.__wtMore = {
      date: dateText,
      hiddenTasks: hiddenTasks,
      allTasks: allTasks,
      holiday: holiday
    };
    return more;
  }

  function renderMonthDayTask(task, dateText, range) {
    var status = normalizeStatus(task.status);
    var owner = formatTaskOwner(task);
    var node = button('wt-month-day-task wt-task-clickable ' + statusClass(status), '');
    var clippedRange = clipDateRange(task.startDate, task.endDate, range.startDate, range.endDate);

    node.title = '[' + owner + '] ' + (task.title || '') + ' (' + task.startDate + ' ~ ' + task.endDate + ')';
    node.innerHTML = '<span class="wt-month-day-task-owner">[' + escapeHtml(owner) + ']</span> <span class="wt-month-day-task-title">' + escapeHtml(task.title || '') + '</span>';
    node.__wtTask = task;
    node.__wtContext = {
      date: dateText,
      displayStartDate: clippedRange.startDate,
      displayEndDate: clippedRange.endDate,
      segmentStartDate: dateText,
      segmentEndDate: dateText,
      visibleStartDate: range.startDate,
      visibleEndDate: range.endDate,
      sourceDate: dateText
    };
    return node;
  }

  function renderMonthSegmentBar(segment, laneIndex, range, weekStartDate, weekEndDate) {
    var task = segment.task;
    var status = normalizeStatus(task.status);
    var owner = formatTaskOwner(task);
    var node = button('wt-month-bar wt-task-clickable ' + statusClass(status), '');

    node.style.gridColumn = (segment.startColumn + 1) + ' / span ' + segment.spanDays;
    node.style.gridRow = (laneIndex + 1);
    node.title = '[' + owner + '] ' + (task.title || '') + ' (' + segment.segmentStartDate + ' ~ ' + segment.segmentEndDate + ')';
    node.innerHTML = '<span class="wt-month-bar-owner">[' + escapeHtml(owner) + ']</span> <span class="wt-month-bar-title">' + escapeHtml(task.title || '') + '</span>';
    node.__wtTask = task;
    node.__wtContext = {
      displayStartDate: segment.displayStartDate,
      displayEndDate: segment.displayEndDate,
      segmentStartDate: segment.segmentStartDate,
      segmentEndDate: segment.segmentEndDate,
      visibleStartDate: range.startDate,
      visibleEndDate: range.endDate,
      weekStartDate: weekStartDate,
      weekEndDate: weekEndDate
    };
    return node;
  }

  function renderHolidayName(holiday) {
    return el('div', 'wt-holiday-name', holiday.name);
  }

  function renderHolidayNameHtml(holiday) {
    return holiday ? '<span class="wt-holiday-name">' + escapeHtml(holiday.name) + '</span>' : '';
  }

  function renderModalTask(task, index) {
    var item = el('div', 'wt-modal-task');
    item.appendChild(el('div', 'wt-modal-task-title', index + '. ' + (task.title || '')));
    item.appendChild(el('div', 'wt-modal-task-owner', formatTaskOwner(task)));
    item.appendChild(el('div', 'wt-modal-task-period', task.startDate + ' ~ ' + task.endDate));
    item.appendChild(el('div', 'wt-modal-task-status', normalizeStatus(task.status)));
    return item;
  }

  function groupVisibleTasks(employees, tasks, range) {
    var employeeIds = {};
    var grouped = {};

    for (var i = 0; i < employees.length; i += 1) {
      employeeIds[employees[i].id] = true;
      grouped[employees[i].id] = [];
    }

    for (var j = 0; j < tasks.length; j += 1) {
      var task = tasks[j];
      if (!employeeIds[task.employeeId] || !isDateOnly(task.startDate) || !isDateOnly(task.endDate) || task.startDate > task.endDate) {
        continue;
      }

      if (isTaskOverlapping(task, range.startDate, range.endDate)) {
        var clippedRange = clipDateRange(task.startDate, task.endDate, range.startDate, range.endDate);
        grouped[task.employeeId].push({
          task: task,
          displayStartDate: clippedRange.startDate,
          displayEndDate: clippedRange.endDate,
          startOffset: dayDiff(range.startDate, clippedRange.startDate),
          endOffset: dayDiff(range.startDate, clippedRange.endDate)
        });
      }
    }

    Object.keys(grouped).forEach(function (employeeId) {
      grouped[employeeId].sort(function (a, b) {
        return compare(a.task.startDate, b.task.startDate) || compare(a.task.endDate, b.task.endDate) || compare(a.task.title, b.task.title);
      });
    });

    return grouped;
  }

  function buildWeekRangeItems(tasks, range) {
    var items = [];
    for (var i = 0; i < tasks.length; i += 1) {
      var task = tasks[i];
      var displayStartDate;
      var displayEndDate;
      var startOffset;
      var endOffset;

      if (!isDateOnly(task.startDate) || !isDateOnly(task.endDate) || task.startDate > task.endDate) {
        continue;
      }
      if (!isTaskOverlapping(task, range.startDate, range.endDate)) {
        continue;
      }

      // Clip every task to the visible week before converting it into a range card/bar.
      // This keeps previous/next-week tasks visible only inside the current 7-day viewport.
      var clippedRange = clipDateRange(task.startDate, task.endDate, range.startDate, range.endDate);
      displayStartDate = clippedRange.startDate;
      displayEndDate = clippedRange.endDate;
      startOffset = dayDiff(range.startDate, displayStartDate);
      endOffset = dayDiff(range.startDate, displayEndDate);
      items.push({
        task: task,
        displayStartDate: displayStartDate,
        displayEndDate: displayEndDate,
        startOffset: startOffset,
        endOffset: endOffset,
        spanDays: endOffset - startOffset + 1,
        startsBeforeRange: task.startDate < range.startDate,
        endsAfterRange: task.endDate > range.endDate
      });
    }

    items.sort(function (a, b) {
      return compare(a.displayStartDate, b.displayStartDate) || compare(a.displayEndDate, b.displayEndDate) || compare(a.task.title, b.task.title);
    });
    return items;
  }

  function countWeekItemsOnDate(items, dateText) {
    var count = 0;
    for (var i = 0; i < items.length; i += 1) {
      if (items[i].displayStartDate <= dateText && items[i].displayEndDate >= dateText) {
        count += 1;
      }
    }
    return count;
  }

  function buildEmployeeMap(employees) {
    var map = {};
    for (var i = 0; i < employees.length; i += 1) {
      map[employees[i].id] = employees[i];
    }
    return map;
  }

  function findTaskByKey(tasks, taskKey) {
    for (var i = 0; i < tasks.length; i += 1) {
      if (getTaskKey(tasks[i]) === taskKey) {
        return tasks[i];
      }
    }
    return null;
  }

  function getTaskKey(task) {
    if (!task) {
      return '';
    }
    return task.taskId || task.id ? String(task.taskId || task.id) : '';
  }

  function filterEmployeesWithVisibleTasks(employees, groupedTasks) {
    var result = [];
    for (var i = 0; i < employees.length; i += 1) {
      var employee = employees[i];
      if ((groupedTasks[employee.id] || []).length > 0) {
        result.push(employee);
      }
    }
    return result;
  }

  function getVisibleTasks(tasks, range) {
    var visible = [];
    for (var i = 0; i < tasks.length; i += 1) {
      var task = tasks[i];
      if (!isDateOnly(task.startDate) || !isDateOnly(task.endDate) || task.startDate > task.endDate) {
        continue;
      }
      // Same inclusive overlap rule is shared by week and month rendering.
      if (isTaskOverlapping(task, range.startDate, range.endDate)) {
        visible.push(task);
      }
    }
    visible.sort(function (a, b) {
      return compare(a.startDate, b.startDate) || compare(a.endDate, b.endDate) || compare(a.title, b.title);
    });
    return visible;
  }

  function getTasksOnDate(tasks, dateText) {
    var result = [];
    for (var i = 0; i < tasks.length; i += 1) {
      if (isTaskOverlapping(tasks[i], dateText, dateText)) {
        result.push(tasks[i]);
      }
    }
    return result;
  }

  /**
   * 월간 view에서는 장기 업무와 날짜 cell 목록 업무를 먼저 분리한다.
   * progress bar로 그려진 업무가 날짜 cell과 ... N modal에 중복 표시되지 않도록 한다.
   */
  function splitMonthTasks(tasks, monthRangeBarMinDays) {
    var rangeTasks = [];
    var dayListTasks = [];
    var minDays = Math.max(Number(monthRangeBarMinDays) || 2, 1);

    for (var i = 0; i < tasks.length; i += 1) {
      // Month progress bars and date-cell lists are mutually exclusive to avoid duplicate task display.
      if (getTaskDurationDays(tasks[i]) >= minDays) {
        rangeTasks.push(tasks[i]);
      } else {
        dayListTasks.push(tasks[i]);
      }
    }

    return { rangeTasks: rangeTasks, dayListTasks: dayListTasks };
  }

  function getTaskDurationDays(task) {
    if (!task || !isDateOnly(task.startDate) || !isDateOnly(task.endDate) || task.startDate > task.endDate) {
      return 0;
    }
    return dayDiff(task.startDate, task.endDate) + 1;
  }

  /**
   * 현재 표시 기간과 업무 기간이 겹치는지 확인한다.
   * 주간/월간/날짜 cell 모두 같은 inclusive overlap 규칙을 사용한다.
   */
  function isTaskOverlapping(task, visibleStartDate, visibleEndDate) {
    return task.startDate <= visibleEndDate && task.endDate >= visibleStartDate;
  }

  /**
   * 실제 화면에 그릴 기간을 visible range 안으로 자른다.
   * range bar 위치 계산과 callback context가 같은 clipping 기준을 공유하게 한다.
   */
  function clipDateRange(startDate, endDate, visibleStartDate, visibleEndDate) {
    return {
      startDate: maxDateText(startDate, visibleStartDate),
      endDate: minDateText(endDate, visibleEndDate)
    };
  }

  /**
   * inline callback과 JSP 전역 functionName fallback 호출 순서를 한 곳에서 관리한다.
   * task click, drag 이동, 종료일 변경이 같은 호환성 규칙을 사용한다.
   */
  function invokeConfiguredCallback(instance, callbackName, functionNameOption, args) {
    var options = instance.options;
    var functionName = options[functionNameOption];

    if (typeof options[callbackName] === 'function') {
      options[callbackName].apply(instance, args);
      return true;
    }

    if (functionName && typeof window[functionName] === 'function') {
      window[functionName].apply(window, args);
      return true;
    }

    return false;
  }

  function buildTaskChangePayload(task, values) {
    // Date-change callbacks share a stable payload shape so save handlers can be reused.
    return extend(buildTaskCommonPayload(task), extend({
      oldStartDate: '',
      oldEndDate: '',
      newStartDate: task.startDate || '',
      newEndDate: task.endDate || '',
      changeType: '',
      source: 'cardSection'
    }, values || {}));
  }

  function buildTaskClickPayload(task, context, event) {
    // Keep the original task as the first callback argument, but provide a richer second payload.
    return extend(extend({}, context || {}), extend(buildTaskCommonPayload(task), {
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      source: context && context.weeklyDisplayMode === 'cardSection' ? 'cardSection' : ((context && context.segmentStartDate) ? 'month' : 'timeline'),
      eventType: event && event.type ? event.type : 'click'
    }));
  }

  function buildTaskCommonPayload(task) {
    task = task || {};
    return {
      task: task,
      taskId: task.taskId || task.id || '',
      title: task.title || '',
      departmentId: task.departmentId || '',
      departmentName: task.departmentName || '',
      employeeId: task.employeeId || '',
      employeeName: task.employeeName || '',
      canEdit: typeof task.canEdit === 'boolean' ? task.canEdit : null
    };
  }

  function normalizeHolidays(holidays) {
    var result = [];
    holidays = arrayOrEmpty(holidays);
    for (var i = 0; i < holidays.length; i += 1) {
      var holiday = holidays[i];
      if (holiday && isDateOnly(holiday.date) && holiday.name) {
        result.push({
          date: holiday.date,
          name: String(holiday.name),
          type: holiday.type || 'HOLIDAY'
        });
      }
    }
    return result;
  }

  function buildHolidayMap(holidays) {
    var map = {};
    for (var i = 0; i < holidays.length; i += 1) {
      map[holidays[i].date] = holidays[i];
    }
    return map;
  }

  function buildMonthCalendarDays(range, weekStartsOn) {
    var start = startOfWeek(range.startDate, weekStartsOn);
    var end = addDays(startOfWeek(range.endDate, weekStartsOn), 6);
    return makeRange('monthCalendar', start, end).days;
  }

  function buildMonthWeekSegments(tasks, weekDays, range) {
    var segments = [];
    var weekStartDate = weekDays[0];
    var weekEndDate = weekDays[weekDays.length - 1];

    for (var i = 0; i < tasks.length; i += 1) {
      var task = tasks[i];
      // Month bars are first clipped to the visible month, then split again per calendar week row.
      var clippedRange = clipDateRange(task.startDate, task.endDate, range.startDate, range.endDate);
      var displayStartDate = clippedRange.startDate;
      var displayEndDate = clippedRange.endDate;
      var segmentStartDate = maxDateText(displayStartDate, weekStartDate);
      var segmentEndDate = minDateText(displayEndDate, weekEndDate);

      if (segmentStartDate <= segmentEndDate) {
        segments.push({
          task: task,
          displayStartDate: displayStartDate,
          displayEndDate: displayEndDate,
          segmentStartDate: segmentStartDate,
          segmentEndDate: segmentEndDate,
          startColumn: dayDiff(weekStartDate, segmentStartDate),
          endColumn: dayDiff(weekStartDate, segmentEndDate),
          spanDays: dayDiff(segmentStartDate, segmentEndDate) + 1
        });
      }
    }

    segments.sort(function (a, b) {
      return compare(a.segmentStartDate, b.segmentStartDate) || compare(a.segmentEndDate, b.segmentEndDate) || compare(a.task.title, b.task.title);
    });
    return segments;
  }

  function buildMonthSegmentLanes(segments) {
    var lanes = [];
    for (var i = 0; i < segments.length; i += 1) {
      var segment = segments[i];
      var placed = false;
      for (var laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
        if (canPlaceMonthSegment(lanes[laneIndex], segment)) {
          lanes[laneIndex].push(segment);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push([segment]);
      }
    }
    return lanes;
  }

  function canPlaceMonthSegment(lane, segment) {
    for (var i = 0; i < lane.length; i += 1) {
      if (segment.startColumn <= lane[i].endColumn && segment.endColumn >= lane[i].startColumn) {
        return false;
      }
    }
    return true;
  }

  function flattenLanes(lanes) {
    var result = [];
    for (var i = 0; i < lanes.length; i += 1) {
      for (var j = 0; j < lanes[i].length; j += 1) {
        result.push(lanes[i][j]);
      }
    }
    return result;
  }

  function formatTaskOwner(task) {
    var departmentName = task.departmentName || task.departmentId || '';
    var employeeName = task.employeeName || task.employeeId || '';
    return [departmentName, employeeName].filter(Boolean).join(' / ');
  }

  function formatTaskOwnerWithEmployee(task, employee) {
    var departmentName = task.departmentName || (employee && employee.departmentName) || task.departmentId || '';
    var employeeName = task.employeeName || (employee && employee.name) || task.employeeId || '';
    return [departmentName, employeeName].filter(Boolean).join(' / ');
  }

  function buildLanes(items) {
    var lanes = [];
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      var placed = false;
      for (var laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
        if (canPlace(lanes[laneIndex], item)) {
          lanes[laneIndex].push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push([item]);
      }
    }
    return lanes;
  }

  function canPlace(lane, item) {
    for (var i = 0; i < lane.length; i += 1) {
      if (item.startOffset <= lane[i].endOffset && item.endOffset >= lane[i].startOffset) {
        return false;
      }
    }
    return true;
  }

  function makeRange(viewType, startDate, endDate) {
    var days = [];
    var cursor = startDate;
    while (cursor <= endDate) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return { viewType: viewType, startDate: startDate, endDate: endDate, days: days };
  }

  function isDateOnly(value) {
    // YYYY-MM-DD strings are intentionally compared lexicographically elsewhere.
    // This validation prevents malformed strings from breaking that date-only rule.
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && formatDate(parseDateOnly(value)) === value;
  }

  function parseDateOnly(value) {
    var year = Number(value.slice(0, 4));
    var month = Number(value.slice(5, 7));
    var day = Number(value.slice(8, 10));
    var maxDay = daysInMonth(year, month);
    var dayNumber;
    if (month < 1 || month > 12 || day < 1 || day > maxDay) {
      return { year: 0, month: 0, day: 0, dayNumber: NaN, weekday: NaN };
    }
    // Use civil day numbers instead of Date objects to avoid timezone shifts in JSP pages.
    dayNumber = daysFromCivil(year, month, day);
    return { year: year, month: month, day: day, dayNumber: dayNumber, weekday: mod(dayNumber + 4, 7) };
  }

  function formatDate(parts) {
    return pad(parts.year) + '-' + pad(parts.month) + '-' + pad(parts.day);
  }

  function addDays(value, amount) {
    return civilFromDays(parseDateOnly(value).dayNumber + amount);
  }

  function dayDiff(startDate, endDate) {
    // Difference is inclusive/exclusive depending on caller; range spans add +1 explicitly.
    return parseDateOnly(endDate).dayNumber - parseDateOnly(startDate).dayNumber;
  }

  function startOfWeek(value, weekStartsOn) {
    var info = parseDateOnly(value);
    var firstDay = weekStartsOn === 0 ? 0 : 1;
    return addDays(value, -mod(info.weekday - firstDay, 7));
  }

  function monthStart(value) {
    var info = parseDateOnly(value);
    return pad(info.year) + '-' + pad(info.month) + '-01';
  }

  function monthEnd(value) {
    var info = parseDateOnly(value);
    return pad(info.year) + '-' + pad(info.month) + '-' + pad(daysInMonth(info.year, info.month));
  }

  function addMonths(value, amount) {
    var info = parseDateOnly(value);
    var monthIndex = (info.year * 12) + (info.month - 1) + amount;
    var year = Math.floor(monthIndex / 12);
    var month = mod(monthIndex, 12) + 1;
    var day = Math.min(info.day, daysInMonth(year, month));
    return pad(year) + '-' + pad(month) + '-' + pad(day);
  }

  function daysInMonth(year, month) {
    return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function daysFromCivil(year, month, day) {
    year -= month <= 2 ? 1 : 0;
    var era = Math.floor(year / 400);
    var yoe = year - era * 400;
    var doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
    var doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  }

  function civilFromDays(dayNumber) {
    var z = dayNumber + 719468;
    var era = Math.floor(z / 146097);
    var doe = z - era * 146097;
    var yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    var year = yoe + era * 400;
    var doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    var mp = Math.floor((5 * doy + 2) / 153);
    var day = doy - Math.floor((153 * mp + 2) / 5) + 1;
    var month = mp + (mp < 10 ? 3 : -9);
    year += month <= 2 ? 1 : 0;
    return pad(year) + '-' + pad(month) + '-' + pad(day);
  }

  function formatToday() {
    var now = new Date();
    return pad(now.getFullYear()) + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  function maxDateText(a, b) {
    return a > b ? a : b;
  }

  function minDateText(a, b) {
    return a < b ? a : b;
  }

  function normalizeStatus(status) {
    var value = String(status || 'TODO').toUpperCase();
    return ['TODO', 'IN_PROGRESS', 'DONE', 'DELAYED', 'HOLD'].indexOf(value) >= 0 ? value : 'TODO';
  }

  /**
   * 상태별 색상은 CSS가 책임지므로 JS는 안정적인 wt- class 이름만 만든다.
   */
  function statusClass(status) {
    return 'wt-task-status-' + normalizeStatus(status).toLowerCase().replace(/_/g, '-');
  }

  function button(className, text, attrName, attrValue) {
    var node = el('button', className, text);
    node.type = 'button';
    if (attrName) {
      node.setAttribute(attrName, attrValue);
    }
    return node;
  }

  function el(tagName, className, text) {
    var node = document.createElement(tagName);
    node.className = className || '';
    if (text != null) {
      node.textContent = text;
    }
    return node;
  }

  function htmlEl(tagName, className, html) {
    var node = el(tagName, className);
    node.innerHTML = html;
    return node;
  }

  function closest(node, selector) {
    while (node && node !== document) {
      if (matches(node, selector)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function matches(node, selector) {
    var fn = node.matches || node.msMatchesSelector;
    return !!fn && fn.call(node, selector);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function mergeClass(existing, className) {
    return existing.indexOf(className) >= 0 ? existing : (existing ? existing + ' ' + className : className);
  }

  function removeClass(node, className) {
    node.className = (' ' + node.className + ' ').replace(' ' + className + ' ', ' ').replace(/^\s+|\s+$/g, '');
  }

  function pad(value) {
    return String(value).length < 2 ? '0' + value : String(value);
  }

  function nowTime() {
    return new Date().getTime();
  }

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function weekdayLabel(day) {
    return ['일', '월', '화', '수', '목', '금', '토'][day];
  }

  function getDateClass(weekday) {
    if (weekday === 0) {
      return 'wt-date-sunday';
    }
    if (weekday === 6) {
      return 'wt-date-saturday';
    }
    return '';
  }

  function getDayClass(weekday) {
    if (weekday === 0) {
      return 'wt-day-sunday';
    }
    if (weekday === 6) {
      return 'wt-day-saturday';
    }
    return '';
  }

  function getHolidayClass(holiday) {
    if (!holiday) {
      return '';
    }
    return ' wt-date-holiday' + (holiday.type === 'SUBSTITUTE_HOLIDAY' ? ' wt-date-substitute-holiday' : '');
  }

  function compare(a, b) {
    a = a || '';
    b = b || '';
    return a < b ? -1 : (a > b ? 1 : 0);
  }

  function arrayOrEmpty(value) {
    return Object.prototype.toString.call(value) === '[object Array]' ? value : [];
  }

  function extend(target) {
    for (var i = 1; i < arguments.length; i += 1) {
      var source = arguments[i] || {};
      Object.keys(source).forEach(function (key) {
        target[key] = source[key];
      });
    }
    return target;
  }

  function setData(element, key, value) {
    if ($.data) {
      $.data(element, key, value);
    } else {
      element.__wtData = element.__wtData || {};
      element.__wtData[key] = value;
    }
  }

  function getData(element, key) {
    return $.data ? $.data(element, key) : (element.__wtData && element.__wtData[key]);
  }

  function call(callback, context, args) {
    if (typeof callback === 'function') {
      callback.apply(context, args);
    }
  }

  $.fn[pluginName] = function (option) {
    var args = Array.prototype.slice.call(arguments, 1);
    var result = this;

    this.each(function () {
      var instance = getData(this, dataKey);
      if (!instance && (typeof option === 'object' || option == null)) {
        instance = new WorkTimeline(this, option || {});
        setData(this, dataKey, instance);
      }
      if (instance && typeof option === 'string') {
        if (typeof instance[option] !== 'function' || option.charAt(0) === '_') {
          throw new Error('Unknown workTimeline method: ' + option);
        }
        var methodResult = instance[option].apply(instance, args);
        if (methodResult !== instance && methodResult !== undefined) {
          result = methodResult;
          return false;
        }
      }
    });

    return result;
  };

  window.WorkTimeline = WorkTimeline;
})(window, window.jQuery);
