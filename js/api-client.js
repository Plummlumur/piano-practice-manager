// API Client for Con Bravura Backend
class APIClient {
    constructor(baseURL = 'http://localhost:3000/api') {
        this.baseURL = baseURL;
        this.token = this.getStoredToken();
        this.isInitialized = false;
    }

    // Token management
    getStoredToken() {
        return localStorage.getItem('con_bravura_token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('con_bravura_token', token);
        } else {
            localStorage.removeItem('con_bravura_token');
        }
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authentication token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            
            // Handle authentication errors
            if (error.status === 401) {
                this.setToken(null);
                // Redirect to login or show login modal
                window.location.hash = '#login';
            }
            
            throw error;
        }
    }

    // Authentication methods
    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.warn('Logout request failed:', error);
        } finally {
            this.setToken(null);
        }
    }

    async getProfile() {
        return await this.request('/auth/profile');
    }

    async updateProfile(profileData) {
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async changePassword(passwordData) {
        return await this.request('/auth/password', {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });
    }

    // Pieces methods
    async getAllPieces() {
        const response = await this.request('/pieces');
        return response.pieces || [];
    }

    async getPieceById(id) {
        const response = await this.request(`/pieces/${id}`);
        return response.piece;
    }

    async addPiece(pieceData) {
        const response = await this.request('/pieces', {
            method: 'POST',
            body: JSON.stringify(pieceData)
        });
        return response.piece;
    }

    async updatePiece(id, pieceData) {
        return await this.request(`/pieces/${id}`, {
            method: 'PUT',
            body: JSON.stringify(pieceData)
        });
    }

    async deletePiece(id) {
        return await this.request(`/pieces/${id}`, {
            method: 'DELETE'
        });
    }

    async getPiecesByStatus(status) {
        const response = await this.request(`/pieces/status/${status}`);
        return response.pieces || [];
    }

    async markPieceAsPlayed(id) {
        return await this.request(`/pieces/${id}/play`, {
            method: 'POST'
        });
    }

    // Exercises methods
    async getAllExercises() {
        const response = await this.request('/exercises');
        return response.exercises || [];
    }

    async getExerciseById(id) {
        const response = await this.request(`/exercises/${id}`);
        return response.exercise;
    }

    async addExercise(exerciseData) {
        const response = await this.request('/exercises', {
            method: 'POST',
            body: JSON.stringify(exerciseData)
        });
        return response.exercise;
    }

    async updateExercise(id, exerciseData) {
        return await this.request(`/exercises/${id}`, {
            method: 'PUT',
            body: JSON.stringify(exerciseData)
        });
    }

    async deleteExercise(id) {
        return await this.request(`/exercises/${id}`, {
            method: 'DELETE'
        });
    }

    async markExerciseAsPracticed(id) {
        return await this.request(`/exercises/${id}/practice`, {
            method: 'POST'
        });
    }

    // Sessions methods
    async getAllSessions(filters = {}) {
        const params = new URLSearchParams();
        if (filters.from) params.append('from', filters.from);
        if (filters.to) params.append('to', filters.to);
        if (filters.status) params.append('status', filters.status);
        
        const queryString = params.toString();
        const endpoint = queryString ? `/sessions?${queryString}` : '/sessions';
        
        const response = await this.request(endpoint);
        return response.sessions || [];
    }

    async getSessionById(id) {
        const response = await this.request(`/sessions/${id}`);
        return response.session;
    }

    async addSession(sessionData) {
        const response = await this.request('/sessions', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
        return response.session;
    }

    async updateSession(id, sessionData) {
        return await this.request(`/sessions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(sessionData)
        });
    }

    async deleteSession(id) {
        return await this.request(`/sessions/${id}`, {
            method: 'DELETE'
        });
    }

    async getSessionsByDate(date) {
        const sessions = await this.getAllSessions({ from: date, to: date });
        return sessions;
    }

    async getSessionsByDateRange(from, to) {
        const response = await this.request(`/sessions/range/${from}/${to}`);
        return response.sessions || [];
    }

    // Statistics methods
    async getDashboardStats() {
        const response = await this.request('/statistics/dashboard');
        return response.stats;
    }

    async getPracticeStatistics(days) {
        const response = await this.request(`/statistics/practice/${days}`);
        return response.practiceStats || [];
    }

    async getPieceStatistics() {
        const response = await this.request('/statistics/pieces');
        return response.pieceStats || [];
    }

    async getExerciseStatistics() {
        const response = await this.request('/statistics/exercises');
        return response.exerciseStats || [];
    }

    async getMonthlyStatistics(year, month) {
        const response = await this.request(`/statistics/monthly/${year}/${month}`);
        return response;
    }

    async getStreakInfo() {
        const response = await this.request('/statistics/streak');
        return response;
    }

    // User methods
    async getUserPreferences() {
        const response = await this.request('/users/preferences');
        return response.preferences || {};
    }

    async updateUserPreferences(preferences) {
        return await this.request('/users/preferences', {
            method: 'PUT',
            body: JSON.stringify({ preferences })
        });
    }

    async getUserActivity(days = 30) {
        const response = await this.request(`/users/activity?days=${days}`);
        return response.activities || [];
    }

    async getUserProfileSummary() {
        const response = await this.request('/users/profile/summary');
        return response;
    }

    async exportUserData() {
        const response = await this.request('/users/export');
        return response;
    }

    async deleteAccount(password) {
        return await this.request('/users/account', {
            method: 'DELETE',
            body: JSON.stringify({ password })
        });
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Initialize the API client
    async initialize() {
        if (!this.isAuthenticated()) {
            throw new Error('Authentication required');
        }

        try {
            // Verify token is still valid
            await this.getProfile();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('API initialization failed:', error);
            this.setToken(null);
            throw error;
        }
    }

    // Compatibility methods for existing frontend code
    async saveToLocalStorage() {
        // This method is called by the existing frontend but not needed for API client
        // We'll keep it for compatibility but it won't do anything
        console.log('saveToLocalStorage called on API client - data is automatically saved to server');
    }

    async loadFromLocalStorage() {
        // This method is called by the existing frontend but not needed for API client
        // We'll keep it for compatibility but it won't do anything
        console.log('loadFromLocalStorage called on API client - data is loaded from server');
    }
}

// Export the API client
window.APIClient = APIClient;