// Calendar component for training session planning
class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.currentWeekStart = this.getWeekStart(this.currentDate);
        this.currentMonthStart = this.getMonthStart(this.currentDate);
        this.sessions = [];
        this.viewMode = 'week'; // 'week' or 'month'
    }

    render() {
        this.loadSessions();
        this.renderCalendar();
        this.updatePeriodDisplay();
        this.bindEvents();
    }

    bindEvents() {
        const prevBtn = document.getElementById('prev-period');
        const nextBtn = document.getElementById('next-period');
        const viewToggle = document.getElementById('calendar-view-toggle');

        if (prevBtn) {
            prevBtn.onclick = () => this.previousPeriod();
        }
        if (nextBtn) {
            nextBtn.onclick = () => this.nextPeriod();
        }
        if (viewToggle) {
            viewToggle.onclick = () => this.toggleView();
        }
    }

    loadSessions() {
        // Load sessions for the current period (week or month)
        const dates = this.viewMode === 'week' ? 
            this.getWeekDates(this.currentWeekStart) : 
            this.getMonthDates(this.currentMonthStart);
        
        this.sessions = [];
        
        dates.forEach(date => {
            const daySessions = window.db.getSessionsByDate(date);
            this.sessions.push(...daySessions);
        });
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;

        calendarGrid.innerHTML = '';
        calendarGrid.className = `calendar-grid ${this.viewMode}-view`;
        
        if (this.viewMode === 'week') {
            this.renderWeekView(calendarGrid);
        } else {
            this.renderMonthView(calendarGrid);
        }
    }

    renderWeekView(calendarGrid) {
        // Add day headers
        const dayHeaders = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        dayHeaders.forEach(day => {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'calendar-day-header week-header';
            headerDiv.textContent = window.lang[day.toLowerCase()] || day;
            calendarGrid.appendChild(headerDiv);
        });

        // Add day cells
        const weekDates = this.getWeekDates(this.currentWeekStart);
        weekDates.forEach(date => {
            const dayDiv = this.createDayCell(date);
            calendarGrid.appendChild(dayDiv);
        });
    }

    renderMonthView(calendarGrid) {
        // Add day headers
        const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dayHeaders.forEach(day => {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'calendar-day-header month-header';
            headerDiv.textContent = day;
            calendarGrid.appendChild(headerDiv);
        });

        // Add day cells for the entire month
        const monthDates = this.getMonthDates(this.currentMonthStart);
        monthDates.forEach(date => {
            const dayDiv = this.createDayCell(date, true);
            calendarGrid.appendChild(dayDiv);
        });
    }

    createDayCell(date, isMonthView = false) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        const dateObj = new Date(date);
        const today = new Date();
        
        // Check if it's today
        if (dateObj.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }

        // Check if it's outside current month (for month view)
        if (isMonthView) {
            const currentMonth = this.currentMonthStart.getMonth();
            const currentYear = this.currentMonthStart.getFullYear();
            
            if (dateObj.getMonth() !== currentMonth || dateObj.getFullYear() !== currentYear) {
                dayDiv.classList.add('other-month');
            }
        }

        // Day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-number';
        dayHeader.textContent = dateObj.getDate();
        dayDiv.appendChild(dayHeader);

        // Sessions for this day
        const daySessions = this.sessions.filter(session => session.date === date);
        
        if (this.viewMode === 'month' && daySessions.length > 0) {
            // In month view, show session count if there are sessions
            const sessionCount = document.createElement('div');
            sessionCount.className = 'session-count';
            sessionCount.textContent = `${daySessions.length} session${daySessions.length > 1 ? 's' : ''}`;
            sessionCount.onclick = () => this.showDayDetails(date, daySessions);
            dayDiv.appendChild(sessionCount);
        } else {
            // In week view, show individual sessions
            daySessions.forEach(session => {
                const sessionDiv = document.createElement('div');
                sessionDiv.className = `training-session status-${session.status.toLowerCase().replace(' ', '-')}`;
                sessionDiv.textContent = `${session.duration}min`;
                sessionDiv.title = `${session.duration} minutes - ${session.status}`;
                sessionDiv.onclick = () => window.modal.showSessionDetails(session.id);
                dayDiv.appendChild(sessionDiv);
            });
        }

        // Add session button
        const addBtn = document.createElement('button');
        addBtn.className = 'add-session-btn';
        addBtn.textContent = '+';
        addBtn.title = 'Add practice session';
        addBtn.onclick = () => window.modal.showSessionForm(null, date);
        dayDiv.appendChild(addBtn);

        return dayDiv;
    }

    updatePeriodDisplay() {
        const currentPeriodElement = document.getElementById('current-period');
        if (!currentPeriodElement) return;

        if (this.viewMode === 'week') {
            const weekEnd = new Date(this.currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            const startMonth = this.currentWeekStart.toLocaleDateString('en-US', { month: 'short' });
            const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
            const startDay = this.currentWeekStart.getDate();
            const endDay = weekEnd.getDate();
            const year = this.currentWeekStart.getFullYear();

            if (startMonth === endMonth) {
                currentPeriodElement.textContent = `${startMonth} ${startDay} - ${endDay}, ${year}`;
            } else {
                currentPeriodElement.textContent = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
            }
        } else {
            const monthName = this.currentMonthStart.toLocaleDateString('en-US', { month: 'long' });
            const year = this.currentMonthStart.getFullYear();
            currentPeriodElement.textContent = `${monthName} ${year}`;
        }
    }

    previousPeriod() {
        if (this.viewMode === 'week') {
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        } else {
            this.currentMonthStart.setMonth(this.currentMonthStart.getMonth() - 1);
        }
        this.render();
    }

    nextPeriod() {
        if (this.viewMode === 'week') {
            this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        } else {
            this.currentMonthStart.setMonth(this.currentMonthStart.getMonth() + 1);
        }
        this.render();
    }

    toggleView() {
        this.viewMode = this.viewMode === 'week' ? 'month' : 'week';
        
        // Update toggle button text
        const toggleBtn = document.getElementById('calendar-view-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = this.viewMode === 'week' ? 'Month View' : 'Week View';
        }
        
        // Sync dates when switching views
        if (this.viewMode === 'month') {
            this.currentMonthStart = this.getMonthStart(this.currentWeekStart);
        } else {
            this.currentWeekStart = this.getWeekStart(this.currentMonthStart);
        }
        
        this.render();
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    }

    getWeekDates(weekStart) {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    }

    getMonthStart(date) {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), 1);
    }

    getMonthDates(monthStart) {
        const dates = [];
        const year = monthStart.getFullYear();
        const month = monthStart.getMonth();
        
        // Get first day of month and find the Monday of that week
        const firstDay = new Date(year, month, 1);
        const startDate = this.getWeekStart(firstDay);
        
        // Get last day of month and find the Sunday of that week
        const lastDay = new Date(year, month + 1, 0);
        const endDate = new Date(lastDay);
        endDate.setDate(lastDay.getDate() + (7 - lastDay.getDay()) % 7);
        
        // Generate all dates from start to end
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    }

    showDayDetails(date, sessions) {
        // Show modal with all sessions for the selected day
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        let content = `<h3>Sessions for ${formattedDate}</h3>`;
        content += '<div class="day-sessions-list">';
        
        sessions.forEach(session => {
            content += `
                <div class="session-item">
                    <div class="session-info">
                        <span class="session-duration">${session.duration} minutes</span>
                        <span class="session-status status-${session.status.toLowerCase().replace(' ', '-')}">${session.status}</span>
                    </div>
                    <div class="session-actions">
                        <button onclick="window.modal.showSessionDetails(${session.id})" class="btn btn-primary">View Details</button>
                    </div>
                </div>
            `;
        });
        
        content += '</div>';
        
        // Show in modal (assuming modal component exists)
        if (window.modal) {
            window.modal.showCustomContent('Day Sessions', content);
        }
    }

    goToToday() {
        this.currentDate = new Date();
        this.currentWeekStart = this.getWeekStart(this.currentDate);
        this.render();
    }

    goToDate(date) {
        this.currentDate = new Date(date);
        this.currentWeekStart = this.getWeekStart(this.currentDate);
        this.render();
    }

    refresh() {
        this.render();
    }
}

// Global calendar instance
window.calendar = new Calendar();
