// Database API Adapter - Replaces SQLite with API calls
class DatabaseAPI {
    constructor() {
        this.api = new APIClient();
        this.isInitialized = false;
    }

    async initialize() {
        if (!this.api.isAuthenticated()) {
            throw new Error('User must be authenticated to access database');
        }

        try {
            await this.api.initialize();
            this.isInitialized = true;
            console.log('Database API initialized successfully');
        } catch (error) {
            console.error('Database API initialization failed:', error);
            throw error;
        }
    }

    // Piano Pieces methods
    async getAllPieces() {
        try {
            const pieces = await this.api.getAllPieces();
            return pieces;
        } catch (error) {
            console.error('Error fetching all pieces:', error);
            return [];
        }
    }

    async getPieceById(id) {
        try {
            const piece = await this.api.getPieceById(id);
            return piece;
        } catch (error) {
            console.error('Error fetching piece by ID:', error);
            return null;
        }
    }

    async addPiece(pieceData) {
        try {
            // Convert frontend data format to API format
            const apiData = {
                name: pieceData.name,
                composer: pieceData.composer,
                work_classification: pieceData.work_classification,
                source: pieceData.source,
                status: pieceData.status || 'In Training',
                play_count: pieceData.play_count || 0
            };

            const piece = await this.api.addPiece(apiData);
            return piece;
        } catch (error) {
            console.error('Error adding piece:', error);
            throw error;
        }
    }

    async updatePiece(id, pieceData) {
        try {
            // Convert frontend data format to API format
            const apiData = {
                name: pieceData.name,
                composer: pieceData.composer,
                work_classification: pieceData.work_classification,
                source: pieceData.source,
                status: pieceData.status,
                play_count: pieceData.play_count
            };

            await this.api.updatePiece(id, apiData);
        } catch (error) {
            console.error('Error updating piece:', error);
            throw error;
        }
    }

    async deletePiece(id) {
        try {
            await this.api.deletePiece(id);
        } catch (error) {
            console.error('Error deleting piece:', error);
            throw error;
        }
    }

    async getPiecesByStatus(status) {
        try {
            const pieces = await this.api.getPiecesByStatus(status);
            return pieces;
        } catch (error) {
            console.error('Error fetching pieces by status:', error);
            return [];
        }
    }

    async markPieceAsPlayed(id) {
        try {
            await this.api.markPieceAsPlayed(id);
        } catch (error) {
            console.error('Error marking piece as played:', error);
            throw error;
        }
    }

    // Exercises methods
    async getAllExercises() {
        try {
            const exercises = await this.api.getAllExercises();
            return exercises;
        } catch (error) {
            console.error('Error fetching all exercises:', error);
            return [];
        }
    }

    async getExerciseById(id) {
        try {
            const exercise = await this.api.getExerciseById(id);
            return exercise;
        } catch (error) {
            console.error('Error fetching exercise by ID:', error);
            return null;
        }
    }

    async addExercise(exerciseData) {
        try {
            const exercise = await this.api.addExercise(exerciseData);
            return exercise;
        } catch (error) {
            console.error('Error adding exercise:', error);
            throw error;
        }
    }

    async updateExercise(id, exerciseData) {
        try {
            await this.api.updateExercise(id, exerciseData);
        } catch (error) {
            console.error('Error updating exercise:', error);
            throw error;
        }
    }

    async deleteExercise(id) {
        try {
            await this.api.deleteExercise(id);
        } catch (error) {
            console.error('Error deleting exercise:', error);
            throw error;
        }
    }

    async markExerciseAsPracticed(id) {
        try {
            await this.api.markExerciseAsPracticed(id);
        } catch (error) {
            console.error('Error marking exercise as practiced:', error);
            throw error;
        }
    }

    // Sessions methods
    async getAllSessions() {
        try {
            const sessions = await this.api.getAllSessions();
            return sessions;
        } catch (error) {
            console.error('Error fetching all sessions:', error);
            return [];
        }
    }

    async getSessionById(id) {
        try {
            const session = await this.api.getSessionById(id);
            return session;
        } catch (error) {
            console.error('Error fetching session by ID:', error);
            return null;
        }
    }

    async addSession(sessionData) {
        try {
            // Convert frontend data format to API format
            const apiData = {
                date: sessionData.date,
                duration: sessionData.duration,
                status: sessionData.status || 'Planned',
                notes: sessionData.notes,
                pieces: sessionData.pieces || [],
                exercises: sessionData.exercises || []
            };

            const session = await this.api.addSession(apiData);
            return session;
        } catch (error) {
            console.error('Error adding session:', error);
            throw error;
        }
    }

    async updateSession(id, sessionData) {
        try {
            // Convert frontend data format to API format
            const apiData = {
                date: sessionData.date,
                duration: sessionData.duration,
                status: sessionData.status,
                notes: sessionData.notes
            };

            await this.api.updateSession(id, apiData);
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }

    async deleteSession(id) {
        try {
            await this.api.deleteSession(id);
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }

    async getSessionsByDate(date) {
        try {
            const sessions = await this.api.getSessionsByDate(date);
            return sessions;
        } catch (error) {
            console.error('Error fetching sessions by date:', error);
            return [];
        }
    }

    // Statistics methods
    async getDashboardStats() {
        try {
            const stats = await this.api.getDashboardStats();
            return stats;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return {
                totalPieces: 0,
                trainingPieces: 0,
                repertoirePieces: 0,
                totalSessions: 0,
                completedSessions: 0,
                totalPracticeMinutes: 0,
                totalExercises: 0
            };
        }
    }

    async getPracticeStatistics(days) {
        try {
            const stats = await this.api.getPracticeStatistics(days);
            return stats;
        } catch (error) {
            console.error('Error fetching practice statistics:', error);
            return [];
        }
    }

    async getPieceStatistics() {
        try {
            const stats = await this.api.getPieceStatistics();
            return stats;
        } catch (error) {
            console.error('Error fetching piece statistics:', error);
            return [];
        }
    }

    async getExerciseStatistics() {
        try {
            const stats = await this.api.getExerciseStatistics();
            return stats;
        } catch (error) {
            console.error('Error fetching exercise statistics:', error);
            return [];
        }
    }

    // User preferences methods
    async getUserPreferences() {
        try {
            const preferences = await this.api.getUserPreferences();
            return preferences;
        } catch (error) {
            console.error('Error fetching user preferences:', error);
            return {};
        }
    }

    async updateUserPreferences(preferences) {
        try {
            await this.api.updateUserPreferences(preferences);
        } catch (error) {
            console.error('Error updating user preferences:', error);
            throw error;
        }
    }

    // Compatibility methods for existing frontend code
    async saveToLocalStorage() {
        // This method is called by the existing frontend but not needed for API client
        // Data is automatically saved to server through API calls
        console.log('saveToLocalStorage called on API database - data is automatically saved to server');
    }

    async loadFromLocalStorage() {
        // This method is called by the existing frontend but not needed for API client
        // Data is loaded from server through API calls
        console.log('loadFromLocalStorage called on API database - data is loaded from server');
    }

    // Authentication methods
    async login(credentials) {
        try {
            const response = await this.api.login(credentials);
            await this.initialize();
            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    async register(userData) {
        try {
            const response = await this.api.register(userData);
            await this.initialize();
            return response;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.api.logout();
            this.isInitialized = false;
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    isAuthenticated() {
        return this.api.isAuthenticated();
    }

    async getProfile() {
        try {
            const profile = await this.api.getProfile();
            return profile;
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    }

    async updateProfile(profileData) {
        try {
            await this.api.updateProfile(profileData);
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    async changePassword(passwordData) {
        try {
            await this.api.changePassword(passwordData);
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    async exportUserData() {
        try {
            const data = await this.api.exportUserData();
            return data;
        } catch (error) {
            console.error('Error exporting user data:', error);
            throw error;
        }
    }

    async deleteAccount(password) {
        try {
            await this.api.deleteAccount(password);
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    }
}

// Export the database API
window.DatabaseAPI = DatabaseAPI;