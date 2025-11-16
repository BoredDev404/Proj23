// db.js - IndexedDB setup with Dexie.js
const db = new Dexie('LifeTrackerDB');

db.version(3).stores({
    dopamineEntries: '++id, date, status, notes, createdAt',
    hygieneHabits: '++id, name, description, order, createdAt',
    hygieneCompletions: '++id, habitId, date, completed, createdAt',
    workoutTemplates: '++id, name, createdAt',
    workoutExercises: '++id, templateId, name, pr, order, createdAt',
    workoutSets: '++id, exerciseId, weight, reps, order, createdAt',
    workoutHistory: '++id, date, type, templateId, exercises, notes, createdAt',
    dailyCompletion: '++id, date, dopamineCompleted, workoutCompleted, hygieneCompleted, totalCompletion, createdAt'
});

// Initialize with default habits only (no sample data)
db.on('populate', function(trans) {
    return trans.table('hygieneHabits').bulkAdd([
        { name: "Brush Teeth", description: "Morning and evening routine", order: 1, createdAt: new Date() },
        { name: "Face Wash", description: "Cleanse and refresh your skin", order: 2, createdAt: new Date() },
        { name: "Bath / Shower", description: "Full body cleanse", order: 3, createdAt: new Date() },
        { name: "Hair Care", description: "Style and maintain hair", order: 4, createdAt: new Date() },
        { name: "Perfume / Cologne", description: "Apply your favorite scent", order: 5, createdAt: new Date() }
    ]);
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = db;
}
