// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И СОСТОЯНИЕ ==========
let currentTab = 'home';
let tasks = [];
let dailyTemplates = [];
let swipeStartX = 0;
let currentSwipeTaskId = null;
let swipeThreshold = 60;
let currentCalendarDate = new Date(); // Текущая дата для календаря
let calendarViewDate = new Date(); // Дата для отображения в календаре (может отличаться от текущей)
let dayStatistics = {}; // Статистика по дням

// Элементы DOM
const mainContentEl = document.getElementById('main-content');
const currentDateEl = document.getElementById('current-date');
const bottomNavButtons = document.querySelectorAll('.nav-btn');
const popupOverlay = document.getElementById('popup-overlay');
const templatesPopupOverlay = document.getElementById('templates-popup-overlay');
const dayPopupOverlay = document.getElementById('day-popup-overlay');
const dayPopupTitle = document.getElementById('day-popup-title');
const dayTasksList = document.getElementById('day-tasks-list');
const closeDayBtn = document.getElementById('close-day-btn');
const newTaskInput = document.getElementById('new-task-input');
const saveTaskBtn = document.getElementById('save-task-btn');
const cancelBtn = document.getElementById('cancel-btn');
const closeTemplatesBtn = document.getElementById('close-templates-btn');
const addTemplateBtn = document.getElementById('add-template-btn');
const newTemplateText = document.getElementById('new-template-text');
const newTemplateEmoji = document.getElementById('new-template-emoji');
const templatesListEl = document.getElementById('templates-list');
const addTaskBtn = document.createElement('button');

// Ключи для localStorage
const STORAGE_KEYS = {
    TASKS: 'taskPlanner_tasks',
    TEMPLATES: 'taskPlanner_templates',
    DAY_STATS: 'taskPlanner_dayStats',
    CALENDAR_VIEW: 'taskPlanner_calendarView' // Новый ключ для сохранения состояния календаря
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    initApp();
});

function initApp() {
    updateCurrentDate();
    renderTab('home');
    setupEventListeners();
    createFloatingAddButton();
    updateDayStatistics(); // Обновляем статистику при запуске
}

// ========== РАБОТА С LOCALSTORAGE ==========

function loadFromStorage() {
    // Загружаем задачи
    const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (savedTasks) {
        try {
            tasks = JSON.parse(savedTasks);
        } catch (e) {
            tasks = [];
        }
    }

    // Загружаем шаблоны
    const savedTemplates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (savedTemplates) {
        try {
            dailyTemplates = JSON.parse(savedTemplates);
        } catch (e) {
            dailyTemplates = getDefaultTemplates();
        }
    } else {
        dailyTemplates = getDefaultTemplates();
        saveTemplates();
    }

    // Загружаем статистику дней
    const savedDayStats = localStorage.getItem(STORAGE_KEYS.DAY_STATS);
    if (savedDayStats) {
        try {
            dayStatistics = JSON.parse(savedDayStats);
        } catch (e) {
            dayStatistics = {};
        }
    }

    // Загружаем состояние календаря
    const savedCalendarView = localStorage.getItem(STORAGE_KEYS.CALENDAR_VIEW);
    if (savedCalendarView) {
        try {
            const savedDate = JSON.parse(savedCalendarView);
            calendarViewDate = new Date(savedDate.year, savedDate.month, 1);
        } catch (e) {
            calendarViewDate = new Date(); // По умолчанию текущий месяц
        }
    } else {
        calendarViewDate = new Date(); // По умолчанию текущий месяц
    }
}

function getDefaultTemplates() {
    return [
        { id: 1, text: "Утренняя зарядка", emoji: "💪" },
        { id: 2, text: "Чтение 30 минут", emoji: "📚" },
        { id: 3, text: "Спланировать день", emoji: "📝" },
        { id: 4, text: "Прогулка", emoji: "🚶" },
        { id: 5, text: "Выучить 10 слов", emoji: "🧠" },
        { id: 6, text: "Медитация", emoji: "🧘" }
    ];
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    updateDayStatistics(); // Обновляем статистику при сохранении задач
}

function saveTemplates() {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(dailyTemplates));
}

function saveDayStatistics() {
    localStorage.setItem(STORAGE_KEYS.DAY_STATS, JSON.stringify(dayStatistics));
}

function saveCalendarView() {
    const calendarState = {
        year: calendarViewDate.getFullYear(),
        month: calendarViewDate.getMonth()
    };
    localStorage.setItem(STORAGE_KEYS.CALENDAR_VIEW, JSON.stringify(calendarState));
}

// ========== СТАТИСТИКА ДНЕЙ ==========

function updateDayStatistics() {
    // Группируем задачи по дням
    const tasksByDay = {};
    
    tasks.forEach(task => {
        if (!tasksByDay[task.date]) {
            tasksByDay[task.date] = [];
        }
        tasksByDay[task.date].push(task);
    });
    
    // Обновляем статистику для каждого дня
    Object.keys(tasksByDay).forEach(date => {
        const dayTasks = tasksByDay[date];
        const totalTasks = dayTasks.length;
        const completedTasks = dayTasks.filter(task => task.completed).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        dayStatistics[date] = {
            total: totalTasks,
            completed: completedTasks,
            completionRate: completionRate,
            hasTasks: totalTasks > 0
        };
    });
    
    saveDayStatistics();
}

function getDayStats(dateString) {
    return dayStatistics[dateString] || {
        total: 0,
        completed: 0,
        completionRate: 0,
        hasTasks: false
    };
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========

function updateCurrentDate() {
    const now = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('ru-RU', options);
}

function renderTab(tabName) {
    currentTab = tabName;

    bottomNavButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    let html = '';
    if (tabName === 'home') {
        const todayStats = getTodayStats();
        html = `
            <div class="tab-content active" id="home-tab">
                <h2>Сегодня</h2>
                
                <!-- ПРОГРЕСС БАР (ПЕРВЫЙ) -->
                <div class="progress-section">
                    <div class="progress-header">
                        <div class="progress-title">Прогресс выполнения</div>
                        <div class="progress-percent">${todayStats.completionRate}%</div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill" style="width: ${todayStats.completionRate}%"></div>
                    </div>
                    <div class="progress-numbers">
                        <span>Выполнено: ${todayStats.completed}</span>
                        <span>Всего: ${todayStats.total}</span>
                    </div>
                </div>
                
                <!-- ЗАДАЧИ (ВТОРЫЕ) -->
                <div class="task-section">
                    <h3>Мои задачи</h3>
                    <div class="tasks-container" id="tasks-container">
                        ${renderTaskList()}
                    </div>
                </div>
                
                <!-- ШАБЛОНЫ (ТРЕТЬИ) -->
                <div class="quick-add-section">
                    <h3>Быстрое добавление</h3>
                    <div class="templates-container" id="templates-container">
                        ${renderTemplates()}
                    </div>
                    <button class="btn-manage-templates" id="manage-templates-btn" title="Управление шаблонами">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </div>
        `;
        addTaskBtn.style.display = 'flex';
    } else if (tabName === 'calendar') {
        html = `
            <div class="tab-content active" id="calendar-tab">
                <h2>Календарь</h2>
                <div class="calendar-container">
                    ${renderCalendar()}
                </div>
            </div>
        `;
        addTaskBtn.style.display = 'none';
    } else if (tabName === 'stats') {
        const stats = calculateStats();
        const monthlyStats = getMonthlyStats();
        html = `
            <div class="tab-content active" id="stats-tab">
                <h2>Статистика</h2>
                <div class="stats-container">
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalDays}</div>
                        <div class="stat-label">Активных дней</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.completedTasks}</div>
                        <div class="stat-label">Выполнено задач</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.averageCompletion}%</div>
                        <div class="stat-label">Средний прогресс</div>
                    </div>
                </div>
                <div class="progress-section">
                    <div class="progress-header">
                        <div class="progress-title">Текущий месяц</div>
                        <div class="progress-percent">${monthlyStats.completionRate}%</div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${monthlyStats.completionRate}%"></div>
                    </div>
                    <div class="progress-numbers">
                        <span>Дней с задачами: ${monthlyStats.daysWithTasks}</span>
                        <span>Всего дней: ${monthlyStats.totalDaysInMonth}</span>
                    </div>
                </div>
                <div class="recent-tasks">
                    <h3>Последние задачи</h3>
                    ${renderRecentTasks(stats.recentTasks)}
                </div>
            </div>
        `;
        addTaskBtn.style.display = 'none';
    }

    mainContentEl.innerHTML = html;

    if (tabName === 'home') {
        attachTaskEvents();
        attachTemplateEvents();
        attachSwipeEvents();
        document.getElementById('manage-templates-btn').addEventListener('click', showTemplatesPopup);
    } else if (tabName === 'calendar') {
        attachCalendarEvents();
    }
}

// ========== КАЛЕНДАРЬ (ИСПРАВЛЕННЫЙ) ==========

function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const today = new Date();
    const todayFormatted = getDateString(today);
    
    // Первый день месяца
    const firstDay = getLocalDate(year, month, 1);
    // Последний день месяца
    const lastDay = getLocalDate(year, month + 1, 0);
    
    // Получаем день недели (0 - воскресенье, 1 - понедельник, и т.д.)
    let firstDayWeekday = firstDay.getDay();
    // Преобразуем: если воскресенье (0), делаем его 7, чтобы неделя начиналась с понедельника (1)
    if (firstDayWeekday === 0) firstDayWeekday = 7;
    
    // Первый день календаря (отсчитываем назад до понедельника)
    const calendarFirstDay = new Date(firstDay);
    calendarFirstDay.setDate(firstDay.getDate() - (firstDayWeekday - 1));
    
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    // Неделя начинается с понедельника
    const weekdayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    let calendarHTML = `
        <div class="calendar-header">
            <div class="calendar-title">${monthNames[month]} ${year}</div>
            <div class="calendar-nav">
                <button class="calendar-nav-btn" id="prev-month-btn">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="calendar-nav-btn" id="next-month-btn">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
        
        <div class="calendar-weekdays">
            ${weekdayNames.map(day => `<div class="weekday">${day}</div>`).join('')}
        </div>
        
        <div class="calendar-days">
    `;
    
    // Генерируем 42 дня (6 недель), начиная с понедельника
    for (let i = 0; i < 42; i++) {
        const currentDate = new Date(calendarFirstDay);
        currentDate.setDate(calendarFirstDay.getDate() + i);
        
        const dayFormatted = getDateString(currentDate);
        const dayNumber = currentDate.getDate();
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = dayFormatted === todayFormatted;
        
        const dayStats = getDayStats(dayFormatted);
        
        let dayClasses = ['calendar-day'];
        
        if (!isCurrentMonth) {
            dayClasses.push('other-month');
        } else {
            dayClasses.push('current-month');
        }
        
        if (isToday) {
            dayClasses.push('today');
        }
        
        if (dayStats.hasTasks) {
            dayClasses.push('has-tasks');
            
            if (dayStats.completionRate === 100) {
                dayClasses.push('completed-100');
            } else if (dayStats.completionRate > 0) {
                dayClasses.push('completed-partial');
            }
        }
        
        if (isCurrentMonth) {
            calendarHTML += `
                <div class="${dayClasses.join(' ')}" data-date="${dayFormatted}">
                    ${dayNumber}
                </div>
            `;
        } else {
            calendarHTML += `
                <div class="${dayClasses.join(' ')}">
                    ${dayNumber}
                </div>
            `;
        }
    }
    
    calendarHTML += `
        </div>
        
        <div class="calendar-stats">
            <h4>Легенда календаря</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-indicator completed-100"></div>
                    <div class="stat-label">100% выполнено</div>
                </div>
                <div class="stat-item">
                    <div class="stat-indicator completed-partial"></div>
                    <div class="stat-label">Частично выполнено</div>
                </div>
                <div class="stat-item">
                    <div class="stat-indicator no-tasks"></div>
                    <div class="stat-label">Задач нет</div>
                </div>
                <div class="stat-item">
                    <div class="stat-indicator" style="border-color: #6a11cb; background-color: rgba(106, 17, 203, 0.1);"></div>
                    <div class="stat-label">Сегодня</div>
                </div>
                <div class="stat-item">
                    <div class="stat-indicator has-tasks" style="position: relative; border: 2px solid #f0f0f0;">
                        <div style="position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; background-color: #6a11cb; border-radius: 50%;"></div>
                    </div>
                    <div class="stat-label">Есть задачи</div>
                </div>
                <div class="stat-item">
                    <div class="stat-indicator" style="border-color: #999; background-color: #f5f5f5;"></div>
                    <div class="stat-label">Другой месяц</div>
                </div>
            </div>
        </div>
    `;
    
    return calendarHTML;
}

function attachCalendarEvents() {
    document.getElementById('prev-month-btn').addEventListener('click', () => {
        calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
        saveCalendarView(); // Сохраняем состояние календаря
        renderTab('calendar');
    });
    
    document.getElementById('next-month-btn').addEventListener('click', () => {
        calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
        saveCalendarView(); // Сохраняем состояние календаря
        renderTab('calendar');
    });
    
    // Кнопка "Текущий месяц"
    const currentMonthBtn = document.createElement('button');
    currentMonthBtn.className = 'calendar-nav-btn';
    currentMonthBtn.innerHTML = '<i class="fas fa-calendar-day"></i>';
    currentMonthBtn.title = 'Текущий месяц';
    currentMonthBtn.addEventListener('click', () => {
        calendarViewDate = new Date(); // Сбрасываем на текущий месяц
        saveCalendarView(); // Сохраняем состояние календаря
        renderTab('calendar');
    });
    
    // Добавляем кнопку в заголовок календаря
    const calendarNav = document.querySelector('.calendar-nav');
    if (calendarNav) {
        calendarNav.insertBefore(currentMonthBtn, document.getElementById('next-month-btn'));
    }
    
    // Клик по дням календаря
    document.querySelectorAll('.calendar-day[data-date]').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            const date = dayEl.dataset.date;
            showDayTasks(date);
        });
    });
}

function showDayTasks(dateString) {
    // Парсим дату из строки YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    const date = getLocalDate(year, month - 1, day);
    
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('ru-RU', options);
    
    const dayTasks = tasks.filter(task => task.date === dateString);
    const dayStats = getDayStats(dateString);
    
    dayPopupTitle.textContent = `Задачи на ${formattedDate}`;
    
    if (dayTasks.length === 0) {
        dayTasksList.innerHTML = '<p class="placeholder-text">Задач на этот день нет</p>';
    } else {
        dayTasksList.innerHTML = dayTasks.map(task => `
            <div class="day-task-item">
                <span class="day-task-emoji">${task.emoji || '📝'}</span>
                <span class="day-task-text ${task.completed ? 'completed' : ''}">
                    ${task.text}
                </span>
                <span class="day-task-status ${task.completed ? 'completed' : 'not-completed'}">
                    ${task.completed ? '✓' : '✗'}
                </span>
            </div>
        `).join('');
    }
    
    // Добавляем статистику дня
    const statsHTML = `
        <div class="progress-section" style="margin-top: 15px;">
            <div class="progress-header">
                <div class="progress-title">Статистика дня</div>
                <div class="progress-percent">${dayStats.completionRate}%</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${dayStats.completionRate}%"></div>
            </div>
            <div class="progress-numbers">
                <span>Выполнено: ${dayStats.completed}</span>
                <span>Всего: ${dayStats.total}</span>
            </div>
        </div>
    `;
    
    dayTasksList.insertAdjacentHTML('beforeend', statsHTML);
    
    dayPopupOverlay.style.display = 'flex';
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ДАТАМИ ==========

function getDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getLocalDate(year, month, day) {
    return new Date(year, month, day);
}

// ========== ШАБЛОНЫ И ЗАДАЧИ ==========

function renderTemplates() {
    if (dailyTemplates.length === 0) {
        return '<p class="placeholder-text">Шаблонов пока нет</p>';
    }

    return dailyTemplates.map(template => `
        <button class="template-btn" data-template-id="${template.id}">
            <span class="template-emoji">${template.emoji}</span>
            <span class="template-text">${template.text}</span>
        </button>
    `).join('');
}

function renderTaskList() {
    const today = getDateString();
    const todayTasks = tasks.filter(task => task.date === today);

    if (todayTasks.length === 0) {
        return '<p class="placeholder-text">Задач на сегодня нет</p>';
    }

    return todayTasks.map(task => `
        <div class="task-item" data-task-id="${task.id}" id="task-${task.id}">
            <div class="task-content">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-task-id="${task.id}"></div>
                <div class="task-text ${task.completed ? 'completed' : ''}">
                    ${task.emoji ? `<span class="task-emoji">${task.emoji}</span>` : ''}
                    ${task.text}
                </div>
            </div>
            <div class="task-actions">
                <button class="delete-action" data-task-id="${task.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderRecentTasks(recentTasks) {
    if (recentTasks.length === 0) {
        return '<p class="placeholder-text">Задач пока нет</p>';
    }

    return recentTasks.map(task => `
        <div class="recent-task-item">
            <span class="recent-task-emoji">${task.emoji || '📝'}</span>
            <span class="recent-task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
            <span class="recent-task-date">${formatDate(task.date)}</span>
        </div>
    `).join('');
}

function createFloatingAddButton() {
    addTaskBtn.classList.add('add-task-btn');
    addTaskBtn.innerHTML = '<i class="fas fa-plus"></i>';
    addTaskBtn.id = 'floating-add-btn';
    document.querySelector('.app').appendChild(addTaskBtn);

    addTaskBtn.addEventListener('click', showAddTaskPopup);
}

function setupEventListeners() {
    bottomNavButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            renderTab(btn.dataset.tab);
        });
    });

    saveTaskBtn.addEventListener('click', saveNewTask);
    cancelBtn.addEventListener('click', () => popupOverlay.style.display = 'none');
    popupOverlay.addEventListener('click', function(e) {
        if (e.target === popupOverlay) popupOverlay.style.display = 'none';
    });

    closeTemplatesBtn.addEventListener('click', () => templatesPopupOverlay.style.display = 'none');
    templatesPopupOverlay.addEventListener('click', function(e) {
        if (e.target === templatesPopupOverlay) templatesPopupOverlay.style.display = 'none';
    });
    addTemplateBtn.addEventListener('click', addNewTemplate);

    closeDayBtn.addEventListener('click', () => dayPopupOverlay.style.display = 'none');
    dayPopupOverlay.addEventListener('click', function(e) {
        if (e.target === dayPopupOverlay) dayPopupOverlay.style.display = 'none';
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            popupOverlay.style.display = 'none';
            templatesPopupOverlay.style.display = 'none';
            dayPopupOverlay.style.display = 'none';
        }
        if (e.key === 'Enter' && popupOverlay.style.display === 'flex') {
            saveNewTask();
        }
    });
}

// ========== СВАЙП ДЛЯ УДАЛЕНИЯ ==========

function attachSwipeEvents() {
    const taskItems = document.querySelectorAll('.task-item');
    
    taskItems.forEach(taskItem => {
        const taskContent = taskItem.querySelector('.task-content');
        const taskActions = taskItem.querySelector('.task-actions');
        let isSwiping = false;
        let startX = 0;
        let currentX = 0;
        let translateX = 0;

        taskItem.addEventListener('mousedown', startSwipe);
        taskItem.addEventListener('mousemove', swipeMove);
        taskItem.addEventListener('mouseup', endSwipe);
        taskItem.addEventListener('mouseleave', endSwipe);

        taskItem.addEventListener('touchstart', startSwipeTouch);
        taskItem.addEventListener('touchmove', swipeMoveTouch);
        taskItem.addEventListener('touchend', endSwipe);

        function startSwipe(e) {
            if (e.button !== 0) return;
            startSwipeCommon(e.clientX);
        }

        function startSwipeTouch(e) {
            if (e.touches.length !== 1) return;
            startSwipeCommon(e.touches[0].clientX);
        }

        function startSwipeCommon(clientX) {
            isSwiping = true;
            startX = clientX;
            currentX = startX;
            taskItem.classList.add('swiping');
        }

        function swipeMove(e) {
            if (!isSwiping) return;
            e.preventDefault();
            currentX = e.clientX;
            updateSwipePosition();
        }

        function swipeMoveTouch(e) {
            if (!isSwiping) return;
            e.preventDefault();
            if (e.touches.length !== 1) return;
            currentX = e.touches[0].clientX;
            updateSwipePosition();
        }

        function updateSwipePosition() {
            translateX = Math.min(0, currentX - startX);
            if (translateX > 0) translateX = 0;
            if (translateX < -80) translateX = -80;
            
            taskContent.style.transform = `translateX(${translateX}px)`;
            taskActions.style.right = `${-translateX}px`;
        }

        function endSwipe() {
            if (!isSwiping) return;
            isSwiping = false;
            taskItem.classList.remove('swiping');

            if (translateX < -swipeThreshold) {
                taskContent.style.transform = 'translateX(-80px)';
                taskActions.style.right = '80px';
            } else {
                taskContent.style.transform = 'translateX(0)';
                taskActions.style.right = '-80px';
            }
        }

        taskContent.addEventListener('click', function(e) {
            if (translateX < -swipeThreshold) {
                e.stopPropagation();
                taskContent.style.transform = 'translateX(0)';
                taskActions.style.right = '-80px';
                translateX = 0;
            }
        });
    });
}

// ========== ОПЕРАЦИИ С ЗАДАЧАМИ ==========

function attachTaskEvents() {
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', toggleTaskStatus);
    });
    
    document.querySelectorAll('.delete-action').forEach(btn => {
        btn.addEventListener('click', deleteTask);
    });
}

function attachTemplateEvents() {
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', addTaskFromTemplate);
    });
}

function addTaskFromTemplate(e) {
    const templateId = parseInt(e.currentTarget.dataset.templateId);
    const template = dailyTemplates.find(t => t.id === templateId);
    
    if (template) {
        const newTask = {
            id: Date.now(),
            text: template.text,
            emoji: template.emoji,
            completed: false,
            date: getDateString(),
            fromTemplate: templateId
        };
        
        tasks.push(newTask);
        saveTasks();
        renderTab('home');
        
        const templateBtn = e.currentTarget;
        templateBtn.classList.add('added');
        setTimeout(() => templateBtn.classList.remove('added'), 500);
    }
}

function toggleTaskStatus(e) {
    const taskId = parseInt(e.currentTarget.dataset.taskId);
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTab('home');
    }
}

function deleteTask(e) {
    e.stopPropagation();
    const taskId = parseInt(e.currentTarget.dataset.taskId);
    
    if (confirm('Удалить эту задачу?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        renderTab('home');
    }
}

function saveNewTask() {
    const text = newTaskInput.value.trim();
    if (text) {
        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            date: getDateString()
        };
        
        tasks.push(newTask);
        saveTasks();
        renderTab('home');
        popupOverlay.style.display = 'none';
    } else {
        alert('Введите текст задачи!');
        newTaskInput.focus();
    }
}

function showAddTaskPopup() {
    newTaskInput.value = '';
    popupOverlay.style.display = 'flex';
    newTaskInput.focus();
}

// ========== СТАТИСТИКА ==========

function getTodayStats() {
    const today = getDateString();
    const todayTasks = tasks.filter(task => task.date === today);
    const total = todayTasks.length;
    const completed = todayTasks.filter(task => task.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, completionRate };
}

function getMonthlyStats() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const firstDay = getLocalDate(currentYear, currentMonth, 1);
    const lastDay = getLocalDate(currentYear, currentMonth + 1, 0);
    const totalDaysInMonth = lastDay.getDate();
    
    let daysWithTasks = 0;
    let totalCompletion = 0;
    
    for (let day = 1; day <= totalDaysInMonth; day++) {
        const date = getLocalDate(currentYear, currentMonth, day);
        const dateString = getDateString(date);
        const dayStats = getDayStats(dateString);
        
        if (dayStats.hasTasks) {
            daysWithTasks++;
            totalCompletion += dayStats.completionRate;
        }
    }
    
    const averageCompletion = daysWithTasks > 0 ? Math.round(totalCompletion / daysWithTasks) : 0;
    
    return {
        daysWithTasks,
        totalDaysInMonth,
        averageCompletion,
        completionRate: averageCompletion
    };
}

function calculateStats() {
    // Общая статистика по всем дням
    const daysWithStats = Object.keys(dayStatistics);
    const totalDays = daysWithStats.length;
    
    let totalTasks = 0;
    let completedTasks = 0;
    let totalCompletion = 0;
    
    daysWithStats.forEach(date => {
        const stats = dayStatistics[date];
        totalTasks += stats.total;
        completedTasks += stats.completed;
        totalCompletion += stats.completionRate;
    });
    
    const averageCompletion = totalDays > 0 ? Math.round(totalCompletion / totalDays) : 0;
    
    // Последние задачи
    const recentTasks = [...tasks]
        .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB - dateA;
        })
        .slice(0, 5);
    
    return {
        totalDays,
        totalTasks,
        completedTasks,
        averageCompletion,
        recentTasks
    };
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = getLocalDate(year, month - 1, day);
    const today = new Date();
    const todayFormatted = getDateString(today);
    
    if (dateString === todayFormatted) return 'Сегодня';
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayFormatted = getDateString(yesterday);
    
    if (dateString === yesterdayFormatted) return 'Вчера';
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// ========== ОПЕРАЦИИ С ШАБЛОНАМИ ==========

function showTemplatesPopup() {
    renderTemplatesList();
    templatesPopupOverlay.style.display = 'flex';
    newTemplateText.value = '';
    newTemplateEmoji.value = '';
    newTemplateText.focus();
}

function renderTemplatesList() {
    templatesListEl.innerHTML = dailyTemplates.map(template => `
        <div class="template-item">
            <span class="template-item-emoji">${template.emoji}</span>
            <span class="template-item-text">${template.text}</span>
            <button class="delete-template-btn" data-template-id="${template.id}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    document.querySelectorAll('.delete-template-btn').forEach(btn => {
        btn.addEventListener('click', deleteTemplate);
    });
}

function addNewTemplate() {
    const text = newTemplateText.value.trim();
    const emoji = newTemplateEmoji.value.trim() || '📝';
    
    if (text) {
        const newTemplate = {
            id: Date.now(),
            text: text,
            emoji: emoji
        };
        
        dailyTemplates.push(newTemplate);
        saveTemplates();
        renderTemplatesList();
        renderTab('home');
        
        newTemplateText.value = '';
        newTemplateEmoji.value = '';
        newTemplateText.focus();
    } else {
        alert('Введите текст шаблона!');
        newTemplateText.focus();
    }
}

function deleteTemplate(e) {
    e.stopPropagation();
    const templateId = parseInt(e.currentTarget.dataset.templateId);
    
    if (confirm('Удалить этот шаблон?')) {
        dailyTemplates = dailyTemplates.filter(t => t.id !== templateId);
        saveTemplates();
        renderTemplatesList();
        renderTab('home');
    }
}