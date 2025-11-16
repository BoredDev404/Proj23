// app.js - Main application logic
const LifeTrackerApp = {
    init() {
        this.currentDate = new Date();
        this.currentViewMonth = new Date();
        this.workoutViewMonth = new Date();
        this.hygieneViewMonth = new Date();
        this.selectedWorkoutTemplate = null;
        
        this.setupEventListeners();
        this.updateCurrentDate();
        this.initializeApp();
    },

    async initializeApp() {
        try {
            await db.open();
            console.log('Database opened successfully');
            
            // Check if we have any workout templates, if not create a default one
            const templates = await db.workoutTemplates.toArray();
            if (templates.length === 0) {
                const defaultTemplateId = await db.workoutTemplates.add({
                    name: "Full Body Workout",
                    createdAt: new Date()
                });
                this.selectedWorkoutTemplate = defaultTemplateId;
                
                // Add some default exercises
                await db.workoutExercises.bulkAdd([
                    { templateId: defaultTemplateId, name: "Squats", pr: "", order: 1, createdAt: new Date() },
                    { templateId: defaultTemplateId, name: "Push-ups", pr: "", order: 2, createdAt: new Date() },
                    { templateId: defaultTemplateId, name: "Pull-ups", pr: "", order: 3, createdAt: new Date() }
                ]);
            } else {
                this.selectedWorkoutTemplate = templates[0].id;
            }
            
            this.renderAllPages();
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    },

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = item.getAttribute('data-page');
                this.showPage(targetPage);
            });
        });

        // Module cards on dashboard
        document.addEventListener('click', (e) => {
            if (e.target.closest('.module-card')) {
                const card = e.target.closest('.module-card');
                const targetPage = card.getAttribute('data-page');
                this.showPage(targetPage);
            }
        });

        // Settings button
        document.getElementById('settingsButton').addEventListener('click', () => {
            this.showPage('database');
        });

        // Modal handlers
        this.setupModalHandlers();
    },

    setupModalHandlers() {
        // Dopamine modal
        document.getElementById('closeDopamineModal').addEventListener('click', () => {
            this.hideModal('dopamineModal');
        });

        document.getElementById('cancelDopamineLog').addEventListener('click', () => {
            this.hideModal('dopamineModal');
        });

        document.getElementById('saveDopamineLog').addEventListener('click', () => {
            this.saveDopamineEntry();
        });

        // Habit modal
        document.getElementById('closeHabitModal').addEventListener('click', () => {
            this.hideModal('habitModal');
        });

        document.getElementById('cancelHabit').addEventListener('click', () => {
            this.hideModal('habitModal');
        });

        document.getElementById('saveHabit').addEventListener('click', () => {
            this.saveHabit();
        });

        // Workout modal
        document.getElementById('closeWorkoutModal').addEventListener('click', () => {
            this.hideModal('workoutModal');
        });

        document.getElementById('cancelWorkout').addEventListener('click', () => {
            this.hideModal('workoutModal');
        });

        document.getElementById('saveWorkout').addEventListener('click', () => {
            this.saveWorkoutTemplate();
        });

        // Exercise modal
        document.getElementById('closeExerciseModal').addEventListener('click', () => {
            this.hideModal('exerciseModal');
        });

        document.getElementById('cancelExercise').addEventListener('click', () => {
            this.hideModal('exerciseModal');
        });

        document.getElementById('saveExercise').addEventListener('click', () => {
            this.saveExercise();
        });
    },

    updateCurrentDate() {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = 
            this.currentDate.toLocaleDateString('en-US', options);
    },

    showPage(pageId) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageId) {
                item.classList.add('active');
            }
        });

        // Show selected page
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');

        // Render page content
        switch(pageId) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'dopamine':
                this.renderDopaminePage();
                break;
            case 'hygiene':
                this.renderHygienePage();
                break;
            case 'workout':
                this.renderWorkoutPage();
                break;
            case 'database':
                this.renderDatabasePage();
                break;
        }
    },

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },

    // Dashboard
    async renderDashboard() {
        const today = this.formatDate(new Date());
        const currentStreak = await this.calculateCurrentStreak();
        const completionRate = await this.calculateTodayCompletion(today);

        document.getElementById('currentStreak').textContent = currentStreak;
        document.getElementById('todayCompletion').textContent = completionRate + '%';

        // Render calendar
        this.renderDashboardCalendar();
    },

    async renderDashboardCalendar() {
        const calendarEl = document.getElementById('dashboardCalendar');
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        let calendarHTML = '';
        
        // Day headers
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        days.forEach(day => {
            calendarHTML += `<div class="calendar-day empty"><div class="day-name">${day}</div></div>`;
        });
        
        // Empty days before first day of month
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        
        // Days of the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayDate = new Date(now.getFullYear(), now.getMonth(), i);
            const dateKey = this.formatDate(dayDate);
            let dayClass = 'calendar-day future';
            
            // Check if it's today
            if (i === now.getDate() && now.getMonth() === now.getMonth() && now.getFullYear() === now.getFullYear()) {
                dayClass += ' current';
            }
            
            // Check dopamine status for this day
            const dopamineEntry = await db.dopamineEntries.where('date').equals(dateKey).first();
            if (dopamineEntry) {
                dayClass += dopamineEntry.status === 'passed' ? ' passed' : ' failed';
            }
            
            calendarHTML += `
                <div class="${dayClass}" data-date="${dateKey}">
                    <div class="day-number">${i}</div>
                </div>
            `;
        }
        
        calendarEl.innerHTML = calendarHTML;
    },

    // Dopamine Page
    async renderDopaminePage() {
        const dopamineEl = document.getElementById('dopamine');
        const currentStreak = await this.calculateCurrentStreak();
        const longestStreak = await this.calculateLongestStreak();
        const recentEntries = await this.getRecentDopamineEntries();

        dopamineEl.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Dopamine Control</div>
                    <div class="card-more" id="dopamineCalendarNav">
                        <i class="fas fa-calendar"></i>
                    </div>
                </div>
                
                <div class="calendar-container">
                    <div class="calendar-header">
                        <div class="calendar-month">${this.currentViewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                        <div class="calendar-nav">
                            <div class="calendar-nav-btn" id="prevDopamineMonth">
                                <i class="fas fa-chevron-left"></i>
                            </div>
                            <div class="calendar-nav-btn" id="nextDopamineMonth">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="calendar" id="dopamineCalendar">
                        ${await this.renderDopamineCalendar()}
                    </div>
                </div>
                
                <div class="streak-display">
                    <div class="streak-info">
                        <div class="streak-value">${currentStreak}</div>
                        <div class="streak-label">Current Streak</div>
                    </div>
                    <div class="streak-info">
                        <div class="streak-value">${longestStreak}</div>
                        <div class="streak-label">Longest Streak</div>
                    </div>
                </div>
                
                <button class="btn btn-primary" id="logDopamineStatus">
                    <i class="fas fa-plus"></i> Log Today's Status
                </button>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Recent Entries</div>
                </div>
                <div id="dopamineEntries">
                    ${recentEntries.length > 0 ? recentEntries : `
                        <div class="empty-state">
                            <i class="fas fa-brain"></i>
                            <p>No entries yet</p>
                            <p>Start tracking your progress today!</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('prevDopamineMonth').addEventListener('click', () => {
            this.currentViewMonth.setMonth(this.currentViewMonth.getMonth() - 1);
            this.renderDopaminePage();
        });

        document.getElementById('nextDopamineMonth').addEventListener('click', () => {
            this.currentViewMonth.setMonth(this.currentViewMonth.getMonth() + 1);
            this.renderDopaminePage();
        });

        document.getElementById('logDopamineStatus').addEventListener('click', () => {
            this.showDopamineModal();
        });

        // Add click handlers for entries
        dopamineEl.querySelectorAll('.edit-dopamine').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const entryId = parseInt(btn.getAttribute('data-id'));
                this.editDopamineEntry(entryId);
            });
        });
    },

    async renderDopamineCalendar() {
        const firstDay = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth(), 1);
        const lastDay = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth() + 1, 0);
        const today = new Date();
        
        let calendarHTML = '';
        
        // Day headers
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        days.forEach(day => {
            calendarHTML += `<div class="calendar-day empty"><div class="day-name">${day}</div></div>`;
        });
        
        // Empty days before first day of month
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        
        // Days of the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayDate = new Date(this.currentViewMonth.getFullYear(), this.currentViewMonth.getMonth(), i);
            const dateKey = this.formatDate(dayDate);
            let dayClass = 'calendar-day future';
            
            // Check if it's today
            if (i === today.getDate() && this.currentViewMonth.getMonth() === today.getMonth() && this.currentViewMonth.getFullYear() === today.getFullYear()) {
                dayClass += ' current';
            }
            
            // Check dopamine status
            const dopamineEntry = await db.dopamineEntries.where('date').equals(dateKey).first();
            if (dopamineEntry) {
                dayClass += dopamineEntry.status === 'passed' ? ' passed' : ' failed';
                if (dopamineEntry.notes) {
                    dayClass += ' has-notes';
                }
            }
            
            calendarHTML += `
                <div class="${dayClass}" data-date="${dateKey}">
                    <div class="day-number">${i}</div>
                </div>
            `;
        }
        
        return calendarHTML;
    },

    showDopamineModal(entry = null) {
        const today = this.formatDate(new Date());
        document.getElementById('dopamineDate').value = entry ? entry.date : today;
        document.getElementById('dopamineStatus').value = entry ? entry.status : 'passed';
        document.getElementById('dopamineNotes').value = entry ? entry.notes : '';
        
        if (entry) {
            document.querySelector('#dopamineModal .modal-title').textContent = 'Edit Dopamine Entry';
            document.getElementById('saveDopamineLog').setAttribute('data-edit-id', entry.id);
        } else {
            document.querySelector('#dopamineModal .modal-title').textContent = 'Log Dopamine Status';
            document.getElementById('saveDopamineLog').removeAttribute('data-edit-id');
        }
        
        this.showModal('dopamineModal');
    },

    async saveDopamineEntry() {
        const date = document.getElementById('dopamineDate').value;
        const status = document.getElementById('dopamineStatus').value;
        const notes = document.getElementById('dopamineNotes').value;
        const editId = document.getElementById('saveDopamineLog').getAttribute('data-edit-id');

        if (!date) {
            alert('Please select a date');
            return;
        }

        try {
            if (editId) {
                // Update existing entry
                await db.dopamineEntries.update(parseInt(editId), {
                    date,
                    status,
                    notes,
                    createdAt: new Date()
                });
            } else {
                // Create new entry
                await db.dopamineEntries.add({
                    date,
                    status,
                    notes,
                    createdAt: new Date()
                });
            }

            this.hideModal('dopamineModal');
            this.renderDopaminePage();
            this.renderDashboard();
        } catch (error) {
            console.error('Error saving dopamine entry:', error);
            alert('Error saving entry. Please try again.');
        }
    },

    async getRecentDopamineEntries() {
        const entries = await db.dopamineEntries.orderBy('date').reverse().limit(5).toArray();
        
        return entries.map(entry => `
            <div class="log-entry">
                <div class="log-date">
                    ${new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    <div class="log-actions">
                        <div class="log-action edit-dopamine" data-id="${entry.id}">
                            <i class="fas fa-edit"></i>
                        </div>
                    </div>
                </div>
                <div class="log-status ${entry.status === 'passed' ? 'status-passed' : 'status-failed'}">
                    ${entry.status === 'passed' ? 'Successful Day' : 'Challenging Day'}
                </div>
                <div class="log-notes">${entry.notes || 'No notes'}</div>
            </div>
        `).join('');
    },

    async editDopamineEntry(entryId) {
        const entry = await db.dopamineEntries.get(entryId);
        if (entry) {
            this.showDopamineModal(entry);
        }
    },

    // Hygiene Page
    async renderHygienePage() {
        const hygieneEl = document.getElementById('hygiene');
        const habits = await db.hygieneHabits.toArray();
        const today = this.formatDate(new Date());
        const completionRate = await this.calculateHygieneCompletion(today);

        let habitsHTML = '';
        for (const habit of habits) {
            const completed = await this.isHabitCompletedToday(habit.id);
            habitsHTML += `
                <div class="habit-item ${completed ? 'swipe-completed' : ''}" data-habit-id="${habit.id}">
                    <div class="habit-icon">
                        <i class="fas fa-${this.getHabitIcon(habit.name)}"></i>
                    </div>
                    <div class="habit-info">
                        <div class="habit-name">${habit.name}</div>
                        <div class="habit-desc">${habit.description}</div>
                    </div>
                    <div class="habit-check ${completed ? 'completed' : ''}">
                        <i class="fas fa-check"></i>
                    </div>
                </div>
            `;
        }

        hygieneEl.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Daily Hygiene</div>
                    <div class="card-more">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
                </div>
                
                ${habitsHTML || `
                    <div class="empty-state">
                        <i class="fas fa-shower"></i>
                        <p>No habits added yet</p>
                    </div>
                `}
                
                <div class="completion-card">
                    <div class="completion-value">${completionRate}%</div>
                    <div class="completion-label">Today's Completion</div>
                </div>
            </div>
            
            <button class="btn btn-primary" id="addHygieneHabit">
                <i class="fas fa-plus"></i> Add New Habit
            </button>

            <div class="card mt-20">
                <div class="card-header">
                    <div class="card-title">Hygiene Calendar</div>
                </div>
                
                <div class="calendar-container">
                    <div class="calendar-header">
                        <div class="calendar-month">${this.hygieneViewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                        <div class="calendar-nav">
                            <div class="calendar-nav-btn" id="prevHygieneMonth">
                                <i class="fas fa-chevron-left"></i>
                            </div>
                            <div class="calendar-nav-btn" id="nextHygieneMonth">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="calendar" id="hygieneCalendar">
                        ${await this.renderHygieneCalendar()}
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        document.getElementById('addHygieneHabit').addEventListener('click', () => {
            this.showHabitModal();
        });

        document.getElementById('prevHygieneMonth').addEventListener('click', () => {
            this.hygieneViewMonth.setMonth(this.hygieneViewMonth.getMonth() - 1);
            this.renderHygienePage();
        });

        document.getElementById('nextHygieneMonth').addEventListener('click', () => {
            this.hygieneViewMonth.setMonth(this.hygieneViewMonth.getMonth() + 1);
            this.renderHygienePage();
        });

        // Add click handlers for habits
        hygieneEl.querySelectorAll('.habit-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const habitId = parseInt(item.getAttribute('data-habit-id'));
                const completed = item.classList.contains('swipe-completed');
                this.toggleHabitCompletion(habitId, !completed);
            });
        });
    },

    getHabitIcon(habitName) {
        const icons = {
            'Brush Teeth': 'tooth',
            'Face Wash': 'water',
            'Bath / Shower': 'bath',
            'Hair Care': 'wind',
            'Perfume / Cologne': 'spray-can'
        };
        return icons[habitName] || 'check-circle';
    },

    async toggleHabitCompletion(habitId, completed) {
        const today = this.formatDate(new Date());
        
        try {
            // Check if completion record already exists for today
            const existingCompletion = await db.hygieneCompletions
                .where('habitId').equals(habitId)
                .and(item => item.date === today)
                .first();

            if (existingCompletion) {
                await db.hygieneCompletions.update(existingCompletion.id, { 
                    completed,
                    createdAt: new Date()
                });
            } else {
                await db.hygieneCompletions.add({
                    habitId,
                    date: today,
                    completed,
                    createdAt: new Date()
                });
            }

            await this.updateDailyCompletion();
            this.renderHygienePage();
            this.renderDashboard();
        } catch (error) {
            console.error('Error toggling habit completion:', error);
        }
    },

    async isHabitCompletedToday(habitId) {
        const today = this.formatDate(new Date());
        const completion = await db.hygieneCompletions
            .where('habitId').equals(habitId)
            .and(item => item.date === today)
            .first();
        
        return completion ? completion.completed : false;
    },

    async calculateHygieneCompletion(date) {
        const habits = await db.hygieneHabits.toArray();
        const completions = await db.hygieneCompletions.where('date').equals(date).toArray();
        
        let completedCount = 0;
        habits.forEach(habit => {
            const completion = completions.find(c => c.habitId === habit.id);
            if (completion && completion.completed) {
                completedCount++;
            }
        });
        
        return habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;
    },

    async renderHygieneCalendar() {
        const firstDay = new Date(this.hygieneViewMonth.getFullYear(), this.hygieneViewMonth.getMonth(), 1);
        const lastDay = new Date(this.hygieneViewMonth.getFullYear(), this.hygieneViewMonth.getMonth() + 1, 0);
        const today = new Date();
        
        let calendarHTML = '';
        
        // Day headers
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        days.forEach(day => {
            calendarHTML += `<div class="calendar-day empty"><div class="day-name">${day}</div></div>`;
        });
        
        // Empty days before first day of month
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        
        // Days of the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayDate = new Date(this.hygieneViewMonth.getFullYear(), this.hygieneViewMonth.getMonth(), i);
            const dateKey = this.formatDate(dayDate);
            let dayClass = 'calendar-day future';
            
            // Check if it's today
            if (i === today.getDate() && this.hygieneViewMonth.getMonth() === today.getMonth() && this.hygieneViewMonth.getFullYear() === today.getFullYear()) {
                dayClass += ' current';
            }
            
            // Check hygiene completion for this day
            const completionRate = await this.calculateHygieneCompletion(dateKey);
            if (completionRate >= 80) {
                dayClass += ' passed';
            } else if (completionRate > 0) {
                // Partial completion - could add a different style
                dayClass += ' future'; // Keep as future for now
            }
            
            calendarHTML += `
                <div class="${dayClass}" data-date="${dateKey}">
                    <div class="day-number">${i}</div>
                </div>
            `;
        }
        
        return calendarHTML;
    },

    showHabitModal() {
        document.getElementById('habitName').value = '';
        document.getElementById('habitDescription').value = '';
        this.showModal('habitModal');
    },

    async saveHabit() {
        const name = document.getElementById('habitName').value;
        const description = document.getElementById('habitDescription').value;

        if (!name) {
            alert('Please enter a habit name');
            return;
        }

        try {
            // Get the next order value
            const habits = await db.hygieneHabits.toArray();
            const nextOrder = habits.length > 0 ? Math.max(...habits.map(h => h.order)) + 1 : 1;

            await db.hygieneHabits.add({
                name,
                description,
                order: nextOrder,
                createdAt: new Date()
            });

            this.hideModal('habitModal');
            this.renderHygienePage();
        } catch (error) {
            console.error('Error saving habit:', error);
            alert('Error saving habit. Please try again.');
        }
    },

    // Workout Page (simplified for now)
    async renderWorkoutPage() {
        const workoutEl = document.getElementById('workout');
        const templates = await db.workoutTemplates.toArray();
        
        let templatesHTML = '';
        templates.forEach(template => {
            templatesHTML += `
                <div class="workout-option ${template.id === this.selectedWorkoutTemplate ? 'active' : ''}" data-template-id="${template.id}">
                    ${template.name}
                </div>
            `;
        });

        workoutEl.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Workout Tracker</div>
                </div>
                
                <div class="workout-selector" id="workoutTemplates">
                    ${templatesHTML}
                    <div class="workout-option" id="addWorkoutTemplate">
                        <i class="fas fa-plus"></i> New
                    </div>
                </div>
                
                <button class="btn rest-day-btn" id="logRestDay">
                    <i class="fas fa-bed"></i> Log Rest Day
                </button>
                
                <button class="btn missed-workout-btn" id="logMissedWorkout">
                    <i class="fas fa-times"></i> Missed Workout
                </button>
                
                <div class="calendar-container">
                    <div class="calendar-header">
                        <div class="calendar-month">${this.workoutViewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                        <div class="calendar-nav">
                            <div class="calendar-nav-btn" id="prevWorkoutMonth">
                                <i class="fas fa-chevron-left"></i>
                            </div>
                            <div class="calendar-nav-btn" id="nextWorkoutMonth">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="calendar" id="workoutCalendar">
                        ${await this.renderWorkoutCalendar()}
                    </div>
                </div>
            </div>
            
            <div id="workoutExercisesContent">
                ${await this.renderWorkoutExercises()}
            </div>
        `;

        // Add event listeners
        document.getElementById('addWorkoutTemplate').addEventListener('click', () => {
            this.showWorkoutModal();
        });

        document.getElementById('logRestDay').addEventListener('click', () => {
            this.logWorkoutDay('rest');
        });

        document.getElementById('logMissedWorkout').addEventListener('click', () => {
            this.logWorkoutDay('missed');
        });

        document.getElementById('prevWorkoutMonth').addEventListener('click', () => {
            this.workoutViewMonth.setMonth(this.workoutViewMonth.getMonth() - 1);
            this.renderWorkoutPage();
        });

        document.getElementById('nextWorkoutMonth').addEventListener('click', () => {
            this.workoutViewMonth.setMonth(this.workoutViewMonth.getMonth() + 1);
            this.renderWorkoutPage();
        });

        // Template selection
        workoutEl.querySelectorAll('.workout-option[data-template-id]').forEach(option => {
            option.addEventListener('click', () => {
                this.selectedWorkoutTemplate = parseInt(option.getAttribute('data-template-id'));
                this.renderWorkoutPage();
            });
        });
    },

    async renderWorkoutCalendar() {
        const firstDay = new Date(this.workoutViewMonth.getFullYear(), this.workoutViewMonth.getMonth(), 1);
        const lastDay = new Date(this.workoutViewMonth.getFullYear(), this.workoutViewMonth.getMonth() + 1, 0);
        const today = new Date();
        
        let calendarHTML = '';
        
        // Day headers
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        days.forEach(day => {
            calendarHTML += `<div class="calendar-day empty"><div class="day-name">${day}</div></div>`;
        });
        
        // Empty days before first day of month
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        
        // Days of the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayDate = new Date(this.workoutViewMonth.getFullYear(), this.workoutViewMonth.getMonth(), i);
            const dateKey = this.formatDate(dayDate);
            let dayClass = 'calendar-day future';
            
            // Check if it's today
            if (i === today.getDate() && this.workoutViewMonth.getMonth() === today.getMonth() && this.workoutViewMonth.getFullYear() === today.getFullYear()) {
                dayClass += ' current';
            }
            
            // Check workout history
            const workoutEntry = await db.workoutHistory.where('date').equals(dateKey).first();
            if (workoutEntry) {
                if (workoutEntry.type === 'completed') {
                    dayClass += ' passed';
                } else if (workoutEntry.type === 'rest' || workoutEntry.type === 'missed') {
                    dayClass += ' failed';
                }
            }
            
            calendarHTML += `
                <div class="${dayClass}" data-date="${dateKey}">
                    <div class="day-number">${i}</div>
                </div>
            `;
        }
        
        return calendarHTML;
    },

    async renderWorkoutExercises() {
        if (!this.selectedWorkoutTemplate) {
            return `
                <div class="card">
                    <div class="empty-state">
                        <i class="fas fa-dumbbell"></i>
                        <p>Select a workout template to view exercises</p>
                    </div>
                </div>
            `;
        }

        const exercises = await db.workoutExercises
            .where('templateId')
            .equals(this.selectedWorkoutTemplate)
            .toArray();

        if (exercises.length === 0) {
            return `
                <div class="card">
                    <div class="empty-state">
                        <i class="fas fa-dumbbell"></i>
                        <p>No exercises in this template</p>
                        <button class="btn btn-primary mt-20" id="addExerciseBtn">
                            <i class="fas fa-plus"></i> Add Exercise
                        </button>
                    </div>
                </div>
            `;
        }

        let exercisesHTML = '';
        for (const exercise of exercises) {
            exercisesHTML += `
                <div class="exercise-card">
                    <div class="exercise-header">
                        <div class="exercise-name">${exercise.name}</div>
                        <div class="exercise-pr">${exercise.pr ? 'PR: ' + exercise.pr : 'No PR set'}</div>
                    </div>
                    <div class="sets-container">
                        <div class="set-row">
                            <div class="set-number">1</div>
                            <div class="set-input">
                                <div class="input-group">
                                    <label>Weight</label>
                                    <input type="text" placeholder="e.g., 50 lbs">
                                </div>
                                <div class="input-group">
                                    <label>Reps</label>
                                    <input type="text" placeholder="e.g., 12">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        return exercisesHTML + `
            <button class="btn btn-primary mt-20" id="completeWorkout">
                <i class="fas fa-check-circle"></i> Complete Workout
            </button>

            <button class="btn btn-secondary mt-10" id="addExerciseBtn">
                <i class="fas fa-plus"></i> Add Exercise
            </button>
        `;
    },

    showWorkoutModal() {
        document.getElementById('workoutName').value = '';
        this.showModal('workoutModal');
    },

    async saveWorkoutTemplate() {
        const name = document.getElementById('workoutName').value;

        if (!name) {
            alert('Please enter a workout name');
            return;
        }

        try {
            const templateId = await db.workoutTemplates.add({
                name,
                createdAt: new Date()
            });

            this.selectedWorkoutTemplate = templateId;
            this.hideModal('workoutModal');
            this.renderWorkoutPage();
        } catch (error) {
            console.error('Error saving workout template:', error);
            alert('Error saving workout template. Please try again.');
        }
    },

    async logWorkoutDay(type) {
        const today = this.formatDate(new Date());

        try {
            // Check if entry already exists for today
            const existingEntry = await db.workoutHistory
                .where('date')
                .equals(today)
                .first();

            if (existingEntry) {
                await db.workoutHistory.update(existingEntry.id, {
                    type,
                    createdAt: new Date()
                });
            } else {
                await db.workoutHistory.add({
                    date: today,
                    type,
                    createdAt: new Date()
                });
            }

            await this.updateDailyCompletion();
            this.renderWorkoutPage();
            this.renderDashboard();
            alert(`${type === 'rest' ? 'Rest day' : 'Missed workout'} logged successfully!`);
        } catch (error) {
            console.error('Error logging workout day:', error);
            alert('Error logging workout day. Please try again.');
        }
    },

    // Database Page
    async renderDatabasePage() {
        const databaseEl = document.getElementById('database');
        
        const dopamineEntries = await db.dopamineEntries.toArray();
        const hygieneHabits = await db.hygieneHabits.toArray();
        const hygieneCompletions = await db.hygieneCompletions.toArray();
        const workoutTemplates = await db.workoutTemplates.toArray();
        const workoutExercises = await db.workoutExercises.toArray();
        const workoutHistory = await db.workoutHistory.toArray();

        databaseEl.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Database Viewer</div>
                    <div class="card-more">
                        <i class="fas fa-database"></i>
                    </div>
                </div>
                
                <div class="database-section">
                    <h3>Dopamine Entries (${dopamineEntries.length})</h3>
                    <table class="database-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dopamineEntries.map(entry => `
                                <tr>
                                    <td>${entry.date}</td>
                                    <td>${entry.status}</td>
                                    <td>${entry.notes || ''}</td>
                                    <td class="database-actions">
                                        <button class="log-action edit-dopamine" data-id="${entry.id}">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="log-action delete-dopamine" data-id="${entry.id}">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="database-section">
                    <h3>Hygiene Habits (${hygieneHabits.length})</h3>
                    <table class="database-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${hygieneHabits.map(habit => `
                                <tr>
                                    <td>${habit.name}</td>
                                    <td>${habit.description}</td>
                                    <td class="database-actions">
                                        <button class="log-action delete-habit" data-id="${habit.id}">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="database-section">
                    <h3>Workout History (${workoutHistory.length})</h3>
                    <table class="database-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${workoutHistory.map(history => `
                                <tr>
                                    <td>${history.date}</td>
                                    <td>${history.type}</td>
                                    <td class="database-actions">
                                        <button class="log-action delete-workout" data-id="${history.id}">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Add event listeners for database actions
        databaseEl.querySelectorAll('.edit-dopamine').forEach(btn => {
            btn.addEventListener('click', () => {
                const entryId = parseInt(btn.getAttribute('data-id'));
                this.editDopamineEntry(entryId);
            });
        });

        databaseEl.querySelectorAll('.delete-dopamine').forEach(btn => {
            btn.addEventListener('click', () => {
                const entryId = parseInt(btn.getAttribute('data-id'));
                this.deleteDopamineEntry(entryId);
            });
        });

        databaseEl.querySelectorAll('.delete-habit').forEach(btn => {
            btn.addEventListener('click', () => {
                const habitId = parseInt(btn.getAttribute('data-id'));
                this.deleteHabit(habitId);
            });
        });

        databaseEl.querySelectorAll('.delete-workout').forEach(btn => {
            btn.addEventListener('click', () => {
                const historyId = parseInt(btn.getAttribute('data-id'));
                this.deleteWorkoutHistory(historyId);
            });
        });
    },

    async deleteDopamineEntry(entryId) {
        if (confirm('Are you sure you want to delete this dopamine entry?')) {
            try {
                await db.dopamineEntries.delete(entryId);
                this.renderDatabasePage();
                this.renderDopaminePage();
                this.renderDashboard();
            } catch (error) {
                console.error('Error deleting dopamine entry:', error);
                alert('Error deleting entry. Please try again.');
            }
        }
    },

    async deleteHabit(habitId) {
        if (confirm('Are you sure you want to delete this habit? This will also delete all completion records for this habit.')) {
            try {
                await db.hygieneHabits.delete(habitId);
                // Also delete related completions
                await db.hygieneCompletions.where('habitId').equals(habitId).delete();
                this.renderDatabasePage();
                this.renderHygienePage();
                this.renderDashboard();
            } catch (error) {
                console.error('Error deleting habit:', error);
                alert('Error deleting habit. Please try again.');
            }
        }
    },

    async deleteWorkoutHistory(historyId) {
        if (confirm('Are you sure you want to delete this workout history entry?')) {
            try {
                await db.workoutHistory.delete(historyId);
                this.renderDatabasePage();
                this.renderWorkoutPage();
                this.renderDashboard();
            } catch (error) {
                console.error('Error deleting workout history:', error);
                alert('Error deleting workout history. Please try again.');
            }
        }
    },

    // Calculation methods
    async calculateCurrentStreak() {
        const entries = await db.dopamineEntries.orderBy('date').toArray();
        let currentStreak = 0;
        const today = new Date();
        
        // Start from today and go backwards
        for (let i = 0; i < 365; i++) { // Check up to a year back
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateKey = this.formatDate(checkDate);
            
            const entry = entries.find(e => e.date === dateKey);
            if (entry && entry.status === 'passed') {
                currentStreak++;
            } else {
                break;
            }
        }
        
        return currentStreak;
    },

    async calculateLongestStreak() {
        const entries = await db.dopamineEntries.orderBy('date').toArray();
        let longestStreak = 0;
        let currentStreak = 0;
        
        // Sort entries by date
        entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        for (const entry of entries) {
            if (entry.status === 'passed') {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }
        
        return longestStreak;
    },

    async calculateTodayCompletion(date) {
        let completion = 0;
        let totalItems = 3; // dopamine, workout, hygiene
        
        // Check dopamine
        const dopamineEntry = await db.dopamineEntries.where('date').equals(date).first();
        if (dopamineEntry && dopamineEntry.status === 'passed') completion++;
        
        // Check workout
        const workoutEntry = await db.workoutHistory.where('date').equals(date).first();
        if (workoutEntry && (workoutEntry.type === 'completed' || workoutEntry.type === 'rest')) completion++;
        
        // Check hygiene
        const hygieneCompletion = await this.calculateHygieneCompletion(date);
        if (hygieneCompletion >= 80) completion++;
        
        return Math.round((completion / totalItems) * 100);
    },

    async updateDailyCompletion() {
        const today = this.formatDate(new Date());
        const dopamineCompleted = await this.isDopamineCompletedToday();
        const workoutCompleted = await this.isWorkoutCompletedToday();
        const hygieneCompleted = await this.calculateHygieneCompletion(today) >= 80;
        const totalCompletion = await this.calculateTodayCompletion(today);
        
        const existing = await db.dailyCompletion.where('date').equals(today).first();
        
        if (existing) {
            await db.dailyCompletion.update(existing.id, {
                dopamineCompleted,
                workoutCompleted,
                hygieneCompleted,
                totalCompletion,
                createdAt: new Date()
            });
        } else {
            await db.dailyCompletion.add({
                date: today,
                dopamineCompleted,
                workoutCompleted,
                hygieneCompleted,
                totalCompletion,
                createdAt: new Date()
            });
        }
    },

    async isDopamineCompletedToday() {
        const today = this.formatDate(new Date());
        const entry = await db.dopamineEntries.where('date').equals(today).first();
        return entry && entry.status === 'passed';
    },

    async isWorkoutCompletedToday() {
        const today = this.formatDate(new Date());
        const entry = await db.workoutHistory.where('date').equals(today).first();
        return entry && (entry.type === 'completed' || entry.type === 'rest');
    },

    // Initialize all pages
    renderAllPages() {
        this.renderDashboard();
        this.renderDopaminePage();
        this.renderHygienePage();
        this.renderWorkoutPage();
        this.renderDatabasePage();
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    LifeTrackerApp.init();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}
