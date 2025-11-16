// app.js - Main application logic
import db from './db.js';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(() => console.log("Service worker registered"))
        .catch(err => console.error("SW registration failed:", err));
}

class LifeTrackerApp {
    constructor() {
        this.currentDate = new Date();
        this.currentViewMonth = new Date();
        this.workoutViewMonth = new Date();
        this.hygieneViewMonth = new Date();
        this.selectedWorkoutTemplate = 1;
        this.swipeStartX = 0;
        this.swipeEndX = 0;
        
        this.init();
    }

    async init() {
        // Initialize the app
        await this.setupDatabase();
        this.setupEventListeners();
        this.updateCurrentDate();
        await this.loadAllData();
        this.renderAllPages();
        
        console.log('Life Tracker App initialized successfully');
    }

    async setupDatabase() {
        try {
            await db.open();
            console.log('Database opened successfully');
        } catch (error) {
            console.error('Failed to open database:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetPage = item.getAttribute('data-page');
                this.showPage(targetPage);
            });
        });

        // Settings button
        document.getElementById('settingsButton').addEventListener('click', () => {
            this.showPage('database');
        });

        // Swipe functionality for hygiene habits
        this.setupSwipeListeners();
    }

    setupSwipeListeners() {
        document.addEventListener('touchstart', (e) => {
            this.swipeStartX = e.changedTouches[0].screenX;
        });

        document.addEventListener('touchend', (e) => {
            this.swipeEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = this.swipeEndX - this.swipeStartX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            const habitItem = document.elementFromPoint(this.swipeEndX, 100);
            if (habitItem && habitItem.closest('.habit-item')) {
                const habitId = parseInt(habitItem.closest('.habit-item').getAttribute('data-habit-id'));
                if (swipeDistance > 0) {
                    this.toggleHabitCompletion(habitId, true);
                } else {
                    this.toggleHabitCompletion(habitId, false);
                }
            }
        }
    }

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
    }

    async loadAllData() {
        // This method would load all necessary data from IndexedDB
        // For now, we'll render pages directly from the database
    }

    updateCurrentDate() {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = 
            this.currentDate.toLocaleDateString('en-US', options);
    }

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
    }

    // Dashboard Rendering
    async renderDashboard() {
        const dashboardEl = document.getElementById('dashboard');
        
        // Calculate completion rate for today
        const todayCompletion = await this.calculateTodayCompletion();
        
        dashboardEl.innerHTML = `
            <div class="welcome-card">
                <h2>Welcome back!</h2>
                <p>Your journey to self-improvement continues</p>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${await this.getCurrentStreak()}</div>
                        <div class="stat-label">Day Streak</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${todayCompletion}%</div>
                        <div class="stat-label">Today's Completion</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Today's Overview</div>
                    <div class="card-more">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
                </div>
                
                <div class="module-card" data-page="dopamine">
                    <div class="module-icon" style="background: var(--ig-primary);">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div class="module-info">
                        <div class="module-title">Dopamine Control</div>
                        <div class="module-desc">${await this.getCurrentStreak()}-day streak • Log today's status</div>
                    </div>
                    <div class="module-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
                
                <div class="module-card" data-page="hygiene">
                    <div class="module-icon" style="background: var(--ig-blue);">
                        <i class="fas fa-shower"></i>
                    </div>
                    <div class="module-info">
                        <div class="module-title">Personal Hygiene</div>
                        <div class="module-desc">${await this.getTodaysHygieneCompletion()}</div>
                    </div>
                    <div class="module-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
                
                <div class="module-card" data-page="workout">
                    <div class="module-icon" style="background: var(--success);">
                        <i class="fas fa-dumbbell"></i>
                    </div>
                    <div class="module-info">
                        <div class="module-title">Workout</div>
                        <div class="module-desc">${await this.getTodaysWorkoutStatus()}</div>
                    </div>
                    <div class="module-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Weekly Progress</div>
                    <div class="card-more">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
                </div>
                
                <div class="calendar-container">
                    ${this.renderCalendar(this.currentDate, 'dashboard')}
                </div>
            </div>
        `;

        // Add event listeners to module cards
        dashboardEl.querySelectorAll('.module-card').forEach(card => {
            card.addEventListener('click', () => {
                const targetPage = card.getAttribute('data-page');
                this.showPage(targetPage);
            });
        });
    }

    // Dopamine Page Rendering
    async renderDopaminePage() {
        const dopamineEl = document.getElementById('dopamine');
        const currentStreak = await this.getCurrentStreak();
        const longestStreak = await this.getLongestStreak();
        const recentEntries = await this.getRecentDopamineEntries();
        
        dopamineEl.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Dopamine Control</div>
                    <div class="card-more">
                        <i class="fas fa-ellipsis-h"></i>
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
                    
                    ${this.renderCalendar(this.currentViewMonth, 'dopamine')}
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
                
                <button class="btn btn-primary" id="logDopamineStatus">Log Today's Status</button>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Recent Entries</div>
                    <div class="card-more">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
                </div>
                
                <div id="dopamineEntries">
                    ${recentEntries}
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
    }

    // Hygiene Page Rendering
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
                
                ${habitsHTML}
                
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
                    <div class="card-more">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
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
                    
                    ${await this.renderHygieneCalendar()}
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
                if (!e.target.closest('.habit-check')) {
                    const habitId = parseInt(item.getAttribute('data-habit-id'));
                    const completed = item.classList.contains('swipe-completed');
                    this.toggleHabitCompletion(habitId, !completed);
                }
            });
        });
    }

    // Workout Page Rendering
    async renderWorkoutPage() {
        const workoutEl = document.getElementById('workout');
        const templates = await db.workoutTemplates.toArray();
        const selectedTemplate = await db.workoutTemplates.get(this.selectedWorkoutTemplate);
        const exercises = selectedTemplate ? await db.workoutExercises.where('templateId').equals(selectedTemplate.id).toArray() : [];
        
        let templatesHTML = '';
        templates.forEach(template => {
            templatesHTML += `
                <div class="workout-option ${template.id === this.selectedWorkoutTemplate ? 'active' : ''}" data-template-id="${template.id}">
                    ${template.name}
                </div>
            `;
        });

        let exercisesHTML = '';
        for (const exercise of exercises) {
            const sets = await db.workoutSets.where('exerciseId').equals(exercise.id).toArray();
            exercisesHTML += `
                <div class="exercise-card">
                    <div class="exercise-header">
                        <div class="exercise-name">${exercise.name}</div>
                        <div class="exercise-pr">PR: ${exercise.pr}</div>
                    </div>
                    <div class="sets-container">
                        ${sets.map((set, index) => `
                            <div class="set-row">
                                <div class="set-number">${index + 1}</div>
                                <div class="set-input">
                                    <div class="input-group">
                                        <label>Weight</label>
                                        <input type="text" value="${set.weight}" data-exercise="${exercise.id}" data-set="${set.id}" data-field="weight">
                                    </div>
                                    <div class="input-group">
                                        <label>Reps</label>
                                        <input type="text" value="${set.reps}" data-exercise="${exercise.id}" data-set="${set.id}" data-field="reps">
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        workoutEl.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">Workout Tracker</div>
                    <div class="card-more">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
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
                    
                    ${this.renderCalendar(this.workoutViewMonth, 'workout')}
                </div>
            </div>
            
            ${exercisesHTML}
            
            <button class="btn btn-primary mt-20" id="completeWorkout">
                <i class="fas fa-check-circle"></i> Complete Workout
            </button>

            <button class="btn btn-secondary mt-10" id="addExercise">
                <i class="fas fa-plus"></i> Add Exercise
            </button>
        `;

        // Add event listeners
        workoutEl.querySelectorAll('.workout-option[data-template-id]').forEach(option => {
            option.addEventListener('click', () => {
                this.selectedWorkoutTemplate = parseInt(option.getAttribute('data-template-id'));
                this.renderWorkoutPage();
            });
        });

        document.getElementById('addWorkoutTemplate').addEventListener('click', () => {
            this.showWorkoutModal();
        });

        document.getElementById('logRestDay').addEventListener('click', () => {
            this.logWorkoutDay('rest');
        });

        document.getElementById('logMissedWorkout').addEventListener('click', () => {
            this.logWorkoutDay('missed');
        });

        document.getElementById('completeWorkout').addEventListener('click', () => {
            this.logWorkoutDay('completed');
        });

        document.getElementById('addExercise').addEventListener('click', () => {
            this.showExerciseModal();
        });

        document.getElementById('prevWorkoutMonth').addEventListener('click', () => {
            this.workoutViewMonth.setMonth(this.workoutViewMonth.getMonth() - 1);
            this.renderWorkoutPage();
        });

        document.getElementById('nextWorkoutMonth').addEventListener('click', () => {
            this.workoutViewMonth.setMonth(this.workoutViewMonth.getMonth() + 1);
            this.renderWorkoutPage();
        });

        // Add input change handlers
        workoutEl.querySelectorAll('.set-input input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateWorkoutSet(
                    parseInt(e.target.getAttribute('data-exercise')),
                    parseInt(e.target.getAttribute('data-set')),
                    e.target.getAttribute('data-field'),
                    e.target.value
                );
            });
        });
    }

    // Database Page Rendering
    async renderDatabasePage() {
        const databaseEl = document.getElementById('database');
        
        const dopamineEntries = await db.dopamineEntries.toArray();
        const hygieneHabits = await db.hygieneHabits.toArray();
        const hygieneCompletions = await db.hygieneCompletions.toArray();
        const workoutTemplates = await db.workoutTemplates.toArray();
        const workoutExercises = await db.workoutExercises.toArray();
        const workoutHistory = await db.workoutHistory.toArray();
        const dailyCompletions = await db.dailyCompletion.toArray();

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
                                    <td>
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
                                    <td>
                                        <button class="log-action edit-habit" data-id="${habit.id}">
                                            <i class="fas fa-edit"></i>
                                        </button>
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
                                <th>Template</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${workoutHistory.map(history => `
                                <tr>
                                    <td>${history.date}</td>
                                    <td>${history.type}</td>
                                    <td>${history.templateId}</td>
                                    <td>
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

        databaseEl.querySelectorAll('.edit-habit').forEach(btn => {
            btn.addEventListener('click', () => {
                const habitId = parseInt(btn.getAttribute('data-id'));
                this.editHabit(habitId);
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
    }

    // Calendar rendering function
    renderCalendar(date, type) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
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
            const dayDate = new Date(date.getFullYear(), date.getMonth(), i);
            const dateKey = this.formatDate(dayDate);
            let dayClass = 'calendar-day future';
            
            // Check if it's today
            if (i === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
                dayClass += ' current';
            }
            
            // For dopamine calendar, check status
            if (type === 'dopamine') {
                // This would check dopamine entries from database
                // For now, we'll use a simple pattern
                if (i % 7 !== 0 && i <= today.getDate()) {
                    dayClass += ' passed';
                } else if (i % 7 === 0 && i <= today.getDate()) {
                    dayClass += ' failed';
                }
            }
            
            // For workout calendar
            if (type === 'workout') {
                // This would check workout history from database
                // For now, we'll use a simple pattern
                if (i % 3 === 0 && i <= today.getDate()) {
                    dayClass += ' passed'; // Workout completed
                } else if (i % 5 === 0 && i <= today.getDate()) {
                    dayClass += ' failed'; // Rest day or missed
                }
            }
            
            calendarHTML += `
                <div class="${dayClass}" data-date="${dateKey}">
                    <div class="day-number">${i}</div>
                </div>
            `;
        }
        
        return calendarHTML;
    }

    // Helper methods
    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    getHabitIcon(habitName) {
        const icons = {
            'Brush Teeth': 'tooth',
            'Face Wash': 'water',
            'Bath / Shower': 'bath',
            'Hair Care': 'wind',
            'Perfume / Cologne': 'spray-can'
        };
        return icons[habitName] || 'check-circle';
    }

    // Data methods (to be implemented)
    async getCurrentStreak() {
        // Implement streak calculation from dopamine entries
        return 14;
    }

    async getLongestStreak() {
        // Implement longest streak calculation
        return 21;
    }

    async getRecentDopamineEntries() {
        const entries = await db.dopamineEntries.orderBy('date').reverse().limit(5).toArray();
        return entries.map(entry => `
            <div class="log-entry">
                <div class="log-date">
                    ${new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    <div class="log-actions">
                        <div class="log-action edit-entry" data-id="${entry.id}">
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
    }

    async calculateTodayCompletion() {
        // Calculate completion based on dopamine, workout, and hygiene
        const today = this.formatDate(new Date());
        let completion = 0;
        let totalItems = 3; // dopamine, workout, hygiene
        
        // Check dopamine
        const dopamineEntry = await db.dopamineEntries.where('date').equals(today).first();
        if (dopamineEntry && dopamineEntry.status === 'passed') completion++;
        
        // Check workout
        const workoutEntry = await db.workoutHistory.where('date').equals(today).first();
        if (workoutEntry && workoutEntry.type === 'completed') completion++;
        
        // Check hygiene
        const hygieneCompletion = await this.calculateHygieneCompletion(today);
        if (hygieneCompletion > 80) completion++;
        
        return Math.round((completion / totalItems) * 100);
    }

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
    }

    async isHabitCompletedToday(habitId) {
        const today = this.formatDate(new Date());
        const completion = await db.hygieneCompletions
            .where('habitId').equals(habitId)
            .and(item => item.date === today)
            .first();
        
        return completion ? completion.completed : false;
    }

    async getTodaysHygieneCompletion() {
        const today = this.formatDate(new Date());
        const completionRate = await this.calculateHygieneCompletion(today);
        const habits = await db.hygieneHabits.toArray();
        const completions = await db.hygieneCompletions.where('date').equals(today).toArray();
        const completedCount = completions.filter(c => c.completed).length;
        
        return `${completedCount}/${habits.length} completed • ${completionRate}% done`;
    }

    async getTodaysWorkoutStatus() {
        const today = this.formatDate(new Date());
        const workoutEntry = await db.workoutHistory.where('date').equals(today).first();
        
        if (workoutEntry) {
            if (workoutEntry.type === 'completed') {
                const template = await db.workoutTemplates.get(workoutEntry.templateId);
                return `${template ? template.name : 'Workout'} • Completed`;
            } else if (workoutEntry.type === 'rest') {
                return 'Rest Day • Completed';
            } else {
                return 'Missed Workout';
            }
        } else {
            return 'Not logged yet';
        }
    }

    async updateDailyCompletion() {
        const today = this.formatDate(new Date());
        const dopamineCompleted = await this.isDopamineCompletedToday();
        const workoutCompleted = await this.isWorkoutCompletedToday();
        const hygieneCompleted = await this.calculateHygieneCompletion(today) > 80;
        const totalCompletion = await this.calculateTodayCompletion();
        
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
    }

    async isDopamineCompletedToday() {
        const today = this.formatDate(new Date());
        const entry = await db.dopamineEntries.where('date').equals(today).first();
        return entry && entry.status === 'passed';
    }

    async isWorkoutCompletedToday() {
        const today = this.formatDate(new Date());
        const entry = await db.workoutHistory.where('date').equals(today).first();
        return entry && (entry.type === 'completed' || entry.type === 'rest');
    }

    // Modal methods (to be implemented)
    showDopamineModal() {
        // Implementation for dopamine modal
        console.log('Show dopamine modal');
    }

    showHabitModal() {
        // Implementation for habit modal
        console.log('Show habit modal');
    }

    showWorkoutModal() {
        // Implementation for workout modal
        console.log('Show workout modal');
    }

    showExerciseModal() {
        // Implementation for exercise modal
        console.log('Show exercise modal');
    }

    // Data update methods (to be implemented)
    async updateWorkoutSet(exerciseId, setId, field, value) {
        // Implementation for updating workout sets
        console.log('Update workout set:', exerciseId, setId, field, value);
    }

    async logWorkoutDay(type) {
        // Implementation for logging workout day
        console.log('Log workout day:', type);
    }

    // Database edit/delete methods (to be implemented)
    async editDopamineEntry(entryId) {
        // Implementation for editing dopamine entry
        console.log('Edit dopamine entry:', entryId);
    }

    async deleteDopamineEntry(entryId) {
        // Implementation for deleting dopamine entry
        console.log('Delete dopamine entry:', entryId);
    }

    async editHabit(habitId) {
        // Implementation for editing habit
        console.log('Edit habit:', habitId);
    }

    async deleteHabit(habitId) {
        // Implementation for deleting habit
        console.log('Delete habit:', habitId);
    }

    async deleteWorkoutHistory(historyId) {
        // Implementation for deleting workout history
        console.log('Delete workout history:', historyId);
    }

    // Hygiene calendar rendering
    async renderHygieneCalendar() {
        // This would render a calendar showing hygiene completion patterns
        // For now, return a simple calendar
        return this.renderCalendar(this.hygieneViewMonth, 'hygiene');
    }

    // Render all pages initially
    renderAllPages() {
        this.renderDashboard();
        this.renderDopaminePage();
        this.renderHygienePage();
        this.renderWorkoutPage();
        this.renderDatabasePage();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LifeTrackerApp();
});
