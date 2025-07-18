// Training Sessions component for managing the sessions collection
class Sessions {
    constructor() {
        this.viewMode = 'list'; // 'list' or 'card'
        this.sessions = [];
    }

    render() {
        this.loadSessions();
        this.renderSessions();
        this.bindEvents();
    }

    bindEvents() {
        const toggleBtn = document.getElementById('toggle-sessions-view');
        const addBtn = document.getElementById('add-session-btn');

        if (toggleBtn) {
            toggleBtn.onclick = () => this.toggleView();
        }
        if (addBtn) {
            addBtn.onclick = () => window.modal.showSessionForm();
        }
    }

    loadSessions() {
        this.sessions = window.db.getAllSessions();
    }

    renderSessions() {
        const container = document.getElementById('sessions-container');
        if (!container) return;

        container.className = `items-container ${this.viewMode}-view`;
        container.innerHTML = '';

        if (this.sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No training sessions recorded yet</h3>
                    <p>Start tracking your practice by adding your first training session!</p>
                    <button onclick="window.modal.showSessionForm()" class="btn btn-primary">Add Your First Session</button>
                </div>
            `;
            return;
        }

        this.sessions.forEach(session => {
            const sessionElement = this.createSessionElement(session);
            container.appendChild(sessionElement);
        });

        // Update toggle button text
        const toggleBtn = document.getElementById('toggle-sessions-view');
        if (toggleBtn) {
            toggleBtn.textContent = this.viewMode === 'list' ? 'Card View' : 'List View';
        }
    }

    createSessionElement(session) {
        if (this.viewMode === 'list') {
            return this.createListItem(session);
        } else {
            return this.createCardItem(session);
        }
    }

    createListItem(session) {
        const div = document.createElement('div');
        div.className = 'item-card list-item';
        
        const sessionDate = new Date(session.date).toLocaleDateString();
        const createdDate = new Date(session.creation_date).toLocaleDateString();
        const completedDate = session.completion_date 
            ? new Date(session.completion_date).toLocaleDateString()
            : null;

        div.innerHTML = `
            <div class="list-item-content">
                <div class="list-item-title">Training Session - ${sessionDate}</div>
                <div class="list-item-meta">
                    Duration: ${session.duration} minutes • 
                    <span class="status-badge status-${session.status.toLowerCase().replace(' ', '-')}">
                        ${session.status}
                    </span>
                </div>
                <div class="list-item-meta">
                    Created: ${createdDate}
                    ${completedDate ? ` • Completed: ${completedDate}` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-secondary" onclick="sessions.viewSessionDetails(${session.id})">
                    ${window.lang.view_details}
                </button>
                ${session.status === 'Planned' ? `
                    <button class="btn btn-primary" onclick="sessions.completeSession(${session.id})">
                        ${window.lang.complete}
                    </button>
                ` : ''}
                <button class="btn btn-danger" onclick="sessions.deleteSession(${session.id})">
                    ${window.lang.delete}
                </button>
            </div>
        `;

        return div;
    }

    createCardItem(session) {
        const div = document.createElement('div');
        div.className = 'item-card';
        
        const sessionDate = new Date(session.date).toLocaleDateString();
        const createdDate = new Date(session.creation_date).toLocaleDateString();
        const completedDate = session.completion_date 
            ? new Date(session.completion_date).toLocaleDateString()
            : null;

        // Get session details for preview
        const sessionDetails = window.db.getSessionDetails(session.id);
        const exerciseCount = sessionDetails ? sessionDetails.exercises.length : 0;
        const trainingPieceCount = sessionDetails ? sessionDetails.trainingPieces.length : 0;
        const repertoirePieceCount = sessionDetails ? sessionDetails.repertoirePieces.length : 0;

        div.innerHTML = `
            <h3>Training Session</h3>
            <div class="item-meta">
                <p><strong>Date:</strong> ${sessionDate}</p>
                <p><strong>Duration:</strong> ${session.duration} minutes</p>
                <p><strong>Status:</strong> 
                    <span class="status-badge status-${session.status.toLowerCase().replace(' ', '-')}">
                        ${session.status}
                    </span>
                </p>
                <p><strong>Content:</strong></p>
                <ul style="margin-left: 1rem; margin-bottom: 1rem;">
                    <li>${exerciseCount} finger exercise${exerciseCount !== 1 ? 's' : ''}</li>
                    <li>${trainingPieceCount} training piece${trainingPieceCount !== 1 ? 's' : ''}</li>
                    <li>${repertoirePieceCount} repertoire piece${repertoirePieceCount !== 1 ? 's' : ''}</li>
                </ul>
                <p><strong>Created:</strong> ${createdDate}</p>
                ${completedDate ? `<p><strong>Completed:</strong> ${completedDate}</p>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary" onclick="sessions.viewSessionDetails(${session.id})">
                    ${window.lang.view_details}
                </button>
                ${session.status === 'Planned' ? `
                    <button class="btn btn-primary" onclick="sessions.completeSession(${session.id})">
                        ${window.lang.complete}
                    </button>
                ` : ''}
                <button class="btn btn-danger" onclick="sessions.deleteSession(${session.id})">
                    ${window.lang.delete}
                </button>
            </div>
        `;

        return div;
    }

    toggleView() {
        this.viewMode = this.viewMode === 'list' ? 'card' : 'list';
        this.renderSessions();
    }

    viewSessionDetails(sessionId) {
        window.modal.showSessionDetails(sessionId);
    }

    completeSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        if (confirm(`Mark the training session from ${new Date(session.date).toLocaleDateString()} as completed?`)) {
            try {
                window.db.completeSession(sessionId);
                this.render();
                window.app.refreshCurrentView();
                alert(window.lang.session_completed);
            } catch (error) {
                console.error('Error completing session:', error);
                alert('Error completing session. Please try again.');
            }
        }
    }

    deleteSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        const sessionDate = new Date(session.date).toLocaleDateString();
        window.modal.confirmDelete(
            `Are you sure you want to delete the training session from ${sessionDate}?`,
            () => {
                try {
                    window.db.deleteSession(sessionId);
                    this.render();
                    window.app.refreshCurrentView();
                } catch (error) {
                    console.error('Error deleting session:', error);
                    alert('Error deleting session. Please try again.');
                }
            }
        );
    }

    refresh() {
        this.render();
    }

    // Filter functionality
    filterByStatus(status) {
        if (status === 'all') {
            this.loadSessions();
        } else {
            const allSessions = window.db.getAllSessions();
            this.sessions = allSessions.filter(session => session.status === status);
        }
        this.renderSessions();
    }

    filterByDateRange(startDate, endDate) {
        const allSessions = window.db.getAllSessions();
        this.sessions = allSessions.filter(session => {
            const sessionDate = new Date(session.date);
            return sessionDate >= new Date(startDate) && sessionDate <= new Date(endDate);
        });
        this.renderSessions();
    }

    // Search functionality
    searchSessions(query) {
        if (!query.trim()) {
            this.loadSessions();
        } else {
            const allSessions = window.db.getAllSessions();
            this.sessions = allSessions.filter(session => {
                const sessionDetails = window.db.getSessionDetails(session.id);
                if (!sessionDetails) return false;

                // Search in exercises
                const exerciseMatch = sessionDetails.exercises.some(ex => 
                    ex.name.toLowerCase().includes(query.toLowerCase())
                );

                // Search in pieces
                const pieceMatch = [...sessionDetails.trainingPieces, ...sessionDetails.repertoirePieces]
                    .some(piece => 
                        piece.name.toLowerCase().includes(query.toLowerCase()) ||
                        piece.composer.toLowerCase().includes(query.toLowerCase())
                    );

                return exerciseMatch || pieceMatch;
            });
        }
        this.renderSessions();
    }

    sortSessions(sortBy) {
        switch (sortBy) {
            case 'date':
                this.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'duration':
                this.sessions.sort((a, b) => b.duration - a.duration);
                break;
            case 'status':
                this.sessions.sort((a, b) => a.status.localeCompare(b.status));
                break;
            case 'created':
                this.sessions.sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date));
                break;
            default:
                // Default sort by date (newest first)
                this.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        this.renderSessions();
    }

    getStatistics() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const completedSessions = this.sessions.filter(s => s.status === 'Completed');
        const plannedSessions = this.sessions.filter(s => s.status === 'Planned');

        const stats = {
            total: this.sessions.length,
            completed: completedSessions.length,
            planned: plannedSessions.length,
            totalMinutes: completedSessions.reduce((sum, s) => sum + s.duration, 0),
            averageDuration: completedSessions.length > 0 
                ? (completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length).toFixed(1)
                : 0,
            thisWeek: this.sessions.filter(s => new Date(s.date) > weekAgo).length,
            thisMonth: this.sessions.filter(s => new Date(s.date) > monthAgo).length,
            longestSession: completedSessions.length > 0 
                ? Math.max(...completedSessions.map(s => s.duration))
                : 0,
            shortestSession: completedSessions.length > 0 
                ? Math.min(...completedSessions.map(s => s.duration))
                : 0,
            recentlyCompleted: completedSessions.filter(s => 
                s.completion_date && new Date(s.completion_date) > weekAgo
            ).length
        };

        return stats;
    }

    // Get upcoming planned sessions
    getUpcomingSessions() {
        const today = new Date().toISOString().split('T')[0];
        return this.sessions
            .filter(session => session.status === 'Planned' && session.date >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Get overdue planned sessions
    getOverdueSessions() {
        const today = new Date().toISOString().split('T')[0];
        return this.sessions
            .filter(session => session.status === 'Planned' && session.date < today)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Get practice streak (consecutive days with completed sessions)
    getPracticeStreak() {
        const completedSessions = this.sessions
            .filter(s => s.status === 'Completed')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (completedSessions.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < completedSessions.length; i++) {
            const sessionDate = new Date(completedSessions[i].date);
            sessionDate.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

            if (daysDiff === streak) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else if (daysDiff > streak) {
                break;
            }
        }

        return streak;
    }
}

// Global sessions instance
window.sessions = new Sessions();
