// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И СОСТОЯНИЕ ==========
let currentTab = 'home';
let tasks = [];
let dailyTemplates = [];
let swipeStartX = 0;
let currentSwipeTaskId = null;
let swipeThreshold = 60;

// Элементы DOM
const mainContentEl = document.getElementById('main-content');
const currentDateEl = document.getElementById('current-date');
const bottomNavButtons = document.querySelectorAll('.nav-btn');
const popupOverlay = document.getElementById('popup-overlay');
const templatesPopupOverlay = document.getElementById('templates-popup-overlay');
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
    TEMPLATES: 'taskPlanner_templates'
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
}

// ========== РАБОТА С LOCALSTORAGE ==========

function loadFromStorage() {
    const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (savedTasks) {
        try {
            tasks = JSON.parse(savedTasks);
        } catch (e) {
            tasks = [];
        }
    }

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
}

function saveTemplates() {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(dailyTemplates));
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
                <p class="placeholder-text">Здесь скоро появится календарь 📅</p>
                <p class="placeholder-text">(В разработке)</p>
            </div>
        `;
        addTaskBtn.style.display = 'none';
    } else if (tabName === 'stats') {
        const stats = calculateStats();
        html = `
            <div class="tab-content active" id="stats-tab">
                <h2>Статистика</h2>
                <div class="stats-container">
                    <div class="stat-card">
                        <div class="stat-number">${stats.total}</div>
                        <div class="stat-label">Всего задач</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.completed}</div>
                        <div class="stat-label">Выполнено</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.completionRate}%</div>
                        <div class="stat-label">Прогресс</div>
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
    }
}

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
    const today = new Date().toISOString().split('T')[0];
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

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            popupOverlay.style.display = 'none';
            templatesPopupOverlay.style.display = 'none';
        }
        if (e.key === 'Enter' && popupOverlay.style.display === 'flex') {
            saveNewTask();
        }
    });
}

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

function addTaskFromTemplate(e) {
    const templateId = parseInt(e.currentTarget.dataset.templateId);
    const template = dailyTemplates.find(t => t.id === templateId);
    
    if (template) {
        const newTask = {
            id: Date.now(),
            text: template.text,
            emoji: template.emoji,
            completed: false,
            date: new Date().toISOString().split('T')[0],
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
            date: new Date().toISOString().split('T')[0]
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

// ========== СТАТИСТИКА И ПРОГРЕСС ==========

function getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.date === today);
    const total = todayTasks.length;
    const completed = todayTasks.filter(task => task.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, completionRate };
}

function calculateStats() {
    const todayStats = getTodayStats();
    
    const recentTasks = [...tasks]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    return { 
        total: todayStats.total, 
        completed: todayStats.completed, 
        completionRate: todayStats.completionRate, 
        recentTasks 
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (dateString === today) return 'Сегодня';
    if (dateString === yesterday) return 'Вчера';
    
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