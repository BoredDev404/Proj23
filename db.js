// db.js - IndexedDB setup with Dexie.js
const db = new Dexie('LifeTrackerDB');

db.version(2).stores({
    dopamineEntries: '++id, date, status, notes, createdAt',
    hygieneHabits: '++id, name, description, order, createdAt',
    hygieneCompletions: '++id, habitId, date, completed, createdAt',
    workoutTemplates: '++id, name, createdAt',
    workoutExercises: '++id, templateId, name, pr, order, createdAt',
    workoutSets: '++id, exerciseId, weight, reps, order, createdAt',
    workoutHistory: '++id, date, type, templateId, exercises, notes, createdAt',
    dailyCompletion: '++id, date, dopamineCompleted, workoutCompleted, hygieneCompleted, totalCompletion, createdAt'
});

// Initialize with default data
db.on('populate', async () => {
    // Add default hygiene habits
    await db.hygieneHabits.bulkAdd([
        { id: 1, name: "Brush Teeth", description: "Morning and evening routine", order: 1, createdAt: new Date() },
        { id: 2, name: "Face Wash", description: "Cleanse and refresh your skin", order: 2, createdAt: new Date() },
        { id: 3, name: "Bath / Shower", description: "Full body cleanse", order: 3, createdAt: new Date() },
        { id: 4, name: "Hair Care", description: "Style and maintain hair", order: 4, createdAt: new Date() },
        { id: 5, name: "Perfume / Cologne", description: "Apply your favorite scent", order: 5, createdAt: new Date() }
    ]);

    // Add default workout templates
    const templateId = await db.workoutTemplates.add({
        name: "Chest & Triceps",
        createdAt: new Date()
    });

    await db.workoutExercises.bulkAdd([
        { templateId, name: "Bench Press", pr: "185 lbs", order: 1, createdAt: new Date() },
        { templateId, name: "Incline Dumbbell Press", pr: "65 lbs", order: 2, createdAt: new Date() },
        { templateId, name: "Tricep Pushdown", pr: "70 lbs", order: 3, createdAt: new Date() }
    ]);

    // Add some sample dopamine entries for the current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    for (let i = 1; i <= currentDate.getDate(); i++) {
        if (i % 7 !== 0) { // Skip every 7th day to simulate some failures
            await db.dopamineEntries.add({
                date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
                status: 'passed',
                notes: i % 3 === 0 ? 'Feeling great and focused!' : '',
                createdAt: new Date()
            });
        }
    }
});

export default db;
