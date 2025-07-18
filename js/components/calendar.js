// Calendar component for training session planning
class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.currentWeekStart = this.getWeekStart(this.currentDate);
        this.sessions = [];
    }

    render() {
        this.loadSessions();
        this.renderCalendar();
        this.updateWeekDisplay();
        this.bindEvents();
    }

    bindEvents() {
        const prevBtn = document.getElementById('prev-week');
        const nextBtn = document.getElementById('next-week');

        if (prevBtn) {
            prevBtn.onclick = () => this.previousWeek();
        }
        if (nextBtn) {
            nextBtn.onclick = () => this.nextWeek();
        }
    }

    loadSessions() {
        // Load sessions for the current week
        const weekDates = this.getWeekDates(this.currentWeekStart);
        this.sessions = [];
        
        weekDates.forEach(date => {
            const daySessions = window.db.getSessionsByDate(date);
            this.sessions.push(...daySessions);
        });
    }

    renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;

        calendarGrid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        dayHeaders.forEach(day => {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'calendar-day-header';
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

    createDayCell(date) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        const dateObj = new Date(date);
        const today = new Date();
        
        // Check if it's today
        if (dateObj.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }

        // Day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = dateObj.getDate();
        dayDiv.appendChild(dayHeader);

        // Sessions for this day
        const daySessions = this.sessions.filter(session => session.date === date);
        
        daySessions.forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = `training-session status-${session.status.toLowerCase().replace(' ', '-')}`;
            sessionDiv.textContent = `${session.duration}min`;
            sessionDiv.title = `${session.duration} minutes - ${session.status}`;
            sessionDiv.onclick = () => window.modal.showSessionDetails(session.id);
            dayDiv.appendChild(sessionDiv);
        });

        // Add session button
        const addBtn = document.createElement('button');
        addBtn.className = 'add-session-btn';
        addBtn.textContent = '+';
        addBtn.title = 'Add training session';
        addBtn.onclick = () => window.modal.showSessionForm(null, date);
        dayDiv.appendChild(addBtn);

        return dayDiv;
    }

    updateWeekDisplay() {
        const currentWeekElement = document.getElementById('current-week');
        if (!currentWeekElement) return;

        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startMonth = this.currentWeekStart.toLocaleDateString('en-US', { month: 'short' });
        const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
        const startDay = this.currentWeekStart.getDate();
        const endDay = weekEnd.getDate();
        const year = this.currentWeekStart.getFullYear();

        if (startMonth === endMonth) {
            currentWeekElement.textContent = `${startMonth} ${startDay} - ${endDay}, ${year}`;
        } else {
            currentWeekElement.textContent = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
        }
    }

    previousWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        this.render();
    }

    nextWeek() {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
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
