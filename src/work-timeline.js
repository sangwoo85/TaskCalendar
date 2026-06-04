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
    employees: [],
    tasks: [],
    holidays: [],
    apiUrl: null,
    employeeColumnWidth: 220,
    dayCellMinWidth: 96,
    maxVisibleTasksPerDay: 3,
    maxVisibleTaskBarsPerWeek: 3,
    taskClickFunctionName: null,
    labels: {
      employee: '직원',
      prev: '이전',
      next: '다음',
      today: '오늘',
      week: '주간',
      month: '월간',
      empty: '표시할 직원 또는 업무가 없습니다.',
      apiPending: 'API loading은 구조만 준비되어 있습니다.',
      monthPending: 'Monthly view는 구조만 준비되어 있습니다.'
    },
    onInit: null,
    onRangeChange: null,
    onDataLoaded: null,
    onTaskClick: null,
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
    this.destroyed = false;
    this.render();
    call(this.options.onInit, this, [this]);
  }

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

    this.element.appendChild(this.viewType === 'month' ? this.renderMonthCalendar() : this.renderTimelineGrid());
    this.bindToolbarEvents();
    this.bindContentEvents();
    return this;
  };

  WorkTimeline.prototype.reload = function () {
    if (!this.options.apiUrl) {
      return this.render();
    }
    return this.fail('API_LOADING_PENDING', this.options.labels.apiPending);
  };

  WorkTimeline.prototype.setView = function (viewType) {
    this.viewType = viewType === 'month' ? 'month' : 'week';
    this.render();
    call(this.options.onRangeChange, this, [this.getRangeContext(), this]);
    return this;
  };

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

  WorkTimeline.prototype.prev = function () {
    this.move(this.viewType === 'month' ? -1 : -7);
    return this;
  };

  WorkTimeline.prototype.next = function () {
    this.move(this.viewType === 'month' ? 1 : 7);
    return this;
  };

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

  WorkTimeline.prototype.setData = function (employees, tasks) {
    this.employees = arrayOrEmpty(employees);
    this.tasks = arrayOrEmpty(tasks);
    this.render();
    call(this.options.onDataLoaded, this, [{ employees: this.employees, tasks: this.tasks }, this]);
    return this;
  };

  WorkTimeline.prototype.setHolidays = function (holidays) {
    this.holidays = normalizeHolidays(holidays);
    this.render();
    return this;
  };

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

  WorkTimeline.prototype.renderMonthCalendar = function () {
    if (!this.tasks.length) {
      return this.renderState('wt-state-empty', this.options.labels.empty);
    }

    var month = el('div', 'wt-month');
    var header = el('div', 'wt-month-weekdays');
    var grid = el('div', 'wt-month-grid');
    var today = this.options.todayDate || formatToday();
    var tasks = getVisibleTasks(this.tasks, this.range);
    var holidayMap = buildHolidayMap(this.holidays);
    var calendarDays = buildMonthCalendarDays(this.range, this.options.weekStartsOn);
    var weekdayStart = this.options.weekStartsOn === 0 ? 0 : 1;

    for (var i = 0; i < 7; i += 1) {
      var weekday = (weekdayStart + i) % 7;
      header.appendChild(el('div', 'wt-month-weekday ' + getDayClass(weekday), weekdayLabel(weekday)));
    }

    for (var j = 0; j < calendarDays.length; j += 7) {
      grid.appendChild(this.renderMonthWeekRow(calendarDays.slice(j, j + 7), tasks, today, holidayMap));
    }

    month.appendChild(header);
    month.appendChild(grid);
    return month;
  };

  WorkTimeline.prototype.renderMonthWeekRow = function (weekDays, visibleTasks, today, holidayMap) {
    var row = el('div', 'wt-month-week-row');
    var days = el('div', 'wt-month-week-days');
    var bars = el('div', 'wt-month-week-bars');
    var segments = buildMonthWeekSegments(visibleTasks, weekDays, this.range);
    var lanes = buildMonthSegmentLanes(segments);
    var maxVisible = Math.max(Number(this.options.maxVisibleTaskBarsPerWeek) || Number(this.options.maxVisibleTasksPerDay) || 3, 0);
    var visibleLaneCount = Math.min(lanes.length, maxVisible);
    var allTasks = uniqueTasksFromSegments(segments);
    var hiddenTasks = uniqueTasksFromSegments(flattenLanes(lanes.slice(maxVisible)));
    var renderedLaneCount = visibleLaneCount + (hiddenTasks.length ? 1 : 0);

    row.style.setProperty('--wt-month-visible-lanes', Math.max(renderedLaneCount, 1));

    for (var i = 0; i < weekDays.length; i += 1) {
      days.appendChild(this.renderMonthDay(weekDays[i], today, holidayMap));
    }

    for (var laneIndex = 0; laneIndex < visibleLaneCount; laneIndex += 1) {
      for (var taskIndex = 0; taskIndex < lanes[laneIndex].length; taskIndex += 1) {
        bars.appendChild(renderMonthSegmentBar(lanes[laneIndex][taskIndex], laneIndex, this.range, weekDays[0], weekDays[6]));
      }
    }

    if (hiddenTasks.length) {
      var moreButton = renderMoreButton(formatWeekRange(weekDays, this.range), hiddenTasks, allTasks, null, 'wt-month-week-more');
      moreButton.style.gridRow = (visibleLaneCount + 1);
      bars.appendChild(moreButton);
    }

    row.appendChild(days);
    row.appendChild(bars);
    return row;
  };

  WorkTimeline.prototype.renderMonthDay = function (dateText, today, holidayMap) {
    var isCurrentMonth = dateText >= this.range.startDate && dateText <= this.range.endDate;
    var info = parseDateOnly(dateText);
    var holiday = isCurrentMonth ? holidayMap[dateText] : null;
    var className = 'wt-month-day ' + getDayClass(info.weekday) + getHolidayClass(holiday) + (isCurrentMonth ? '' : ' wt-month-day-empty') + (dateText === today ? ' wt-month-day-today' : '');
    var day = el('div', className);

    day.appendChild(el('div', 'wt-month-day-number', String(info.day)));
    if (holiday) {
      day.appendChild(renderHolidayName(holiday));
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
      var employeeNode;

      if (closeNode) {
        self.closeMoreModal();
        return;
      }

      if (moreNode && moreNode.__wtMore) {
        self.handleMoreClick(moreNode.__wtMore.date, moreNode.__wtMore.hiddenTasks, moreNode.__wtMore.allTasks, moreNode.__wtMore.holiday);
        return;
      }

      if (taskNode && taskNode.__wtTask) {
        self.handleTaskClick(taskNode.__wtTask, taskNode.__wtContext, event);
        return;
      }

      employeeNode = closest(event.target, '.wt-employee-row');
      if (employeeNode && employeeNode.__wtEmployee) {
        call(self.options.onEmployeeClick, self, [employeeNode.__wtEmployee, event]);
      }
    });
  };

  WorkTimeline.prototype.handleTaskClick = function (task, context, event) {
    if (typeof this.options.onTaskClick === 'function') {
      this.options.onTaskClick.call(this, task, context, event);
      return;
    }

    if (this.options.taskClickFunctionName && typeof window[this.options.taskClickFunctionName] === 'function') {
      window[this.options.taskClickFunctionName](task, context, event);
    }
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

  WorkTimeline.prototype.on = function (target, type, handler) {
    target.addEventListener(type, handler, false);
    this.handlers.push({ target: target, type: type, handler: handler });
  };

  WorkTimeline.prototype.unbindEvents = function () {
    for (var i = 0; i < this.handlers.length; i += 1) {
      var item = this.handlers[i];
      item.target.removeEventListener(item.type, item.handler, false);
    }
    this.handlers = [];
    this.closeMoreModal();
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
    var bar = button('wt-task-bar wt-task-clickable wt-task-status-' + status.toLowerCase().replace(/_/g, '-'), item.task.title || '');
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

  function renderMonthSegmentBar(segment, laneIndex, range, weekStartDate, weekEndDate) {
    var task = segment.task;
    var status = normalizeStatus(task.status);
    var owner = formatTaskOwner(task);
    var node = button('wt-month-bar wt-task-clickable wt-task-status-' + status.toLowerCase().replace(/_/g, '-'), '');

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

      if (task.startDate <= range.endDate && task.endDate >= range.startDate) {
        var displayStartDate = maxDateText(task.startDate, range.startDate);
        var displayEndDate = minDateText(task.endDate, range.endDate);
        grouped[task.employeeId].push({
          task: task,
          displayStartDate: displayStartDate,
          displayEndDate: displayEndDate,
          startOffset: dayDiff(range.startDate, displayStartDate),
          endOffset: dayDiff(range.startDate, displayEndDate)
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
      if (task.startDate <= range.endDate && task.endDate >= range.startDate) {
        visible.push(task);
      }
    }
    visible.sort(function (a, b) {
      return compare(a.startDate, b.startDate) || compare(a.endDate, b.endDate) || compare(a.title, b.title);
    });
    return visible;
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
      var displayStartDate = maxDateText(task.startDate, range.startDate);
      var displayEndDate = minDateText(task.endDate, range.endDate);
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

  function uniqueTasksFromSegments(segments) {
    var result = [];
    var seen = {};
    for (var i = 0; i < segments.length; i += 1) {
      var task = segments[i].task;
      var key = task.taskId || task.id || [task.employeeId, task.title, task.startDate, task.endDate].join('|');
      if (!seen[key]) {
        seen[key] = true;
        result.push(task);
      }
    }
    return result;
  }

  function formatWeekRange(weekDays, range) {
    var startDate = maxDateText(weekDays[0], range.startDate);
    var endDate = minDateText(weekDays[weekDays.length - 1], range.endDate);
    return startDate + ' ~ ' + endDate;
  }

  function formatTaskOwner(task) {
    var departmentName = task.departmentName || task.departmentId || '';
    var employeeName = task.employeeName || task.employeeId || '';
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
