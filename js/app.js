// Main application controller
class App {
    constructor() {
        this.currentView = 'dashboard';
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Show loading screen
            this.showLoading();

            // Initialize database
            await window.db.initialize();

            // Apply language translations
            this.applyLanguage();

            // Initialize navigation
            this.initializeNavigation();

            // Show the application
            this.hideLoading();
            this.showView('dashboard');

            this.isInitialized = true;
            console.log('Piano Practice Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('main-nav').classList.add('hidden');
        document.getElementById('main-content').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('main-nav').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
    }

    showError(message) {
        const loadingElement = document.getElementById('loading');
        loadingElement.innerHTML = `
            <div style="text-align: center; color: #dc3545;">
                <h2>Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Reload Application
                </button>
            </div>
        `;
    }

    applyLanguage() {
        // Apply language translations to elements with data-lang attribute
        const elements = document.querySelectorAll('[data-lang]');
        elements.forEach(element => {
            const key = element.getAttribute('data-lang');
            if (window.lang[key]) {
                if (element.tagName === 'INPUT' && element.type === 'submit') {
                    element.value = window.lang[key];
                } else {
                    element.textContent = window.lang[key];
                }
            }
        });
    }

    initializeNavigation() {
        // Initialize mobile menu
        this.initializeMobileMenu();
        
        // Add click handlers to navigation links
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                const viewName = href.substring(1); // Remove the # symbol
                this.showView(viewName);
                // Close mobile menu after navigation
                this.closeMobileMenu();
            });
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            const viewName = e.state?.view || 'dashboard';
            this.showView(viewName, false);
        });

        // Set initial URL state
        history.replaceState({ view: 'dashboard' }, '', '#dashboard');
    }

    initializeMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (mobileMenuToggle && navMenu) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });

            // Close mobile menu on window resize if screen becomes large
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    this.closeMobileMenu();
                }
            });

            // Handle touch events for mobile
            let touchStartX = 0;
            let touchEndX = 0;

            navMenu.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            });

            navMenu.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                this.handleSwipeGesture();
            });

            // Swipe right to close menu
            const handleSwipeGesture = () => {
                if (touchEndX > touchStartX + 50) {
                    this.closeMobileMenu();
                }
            };
            this.handleSwipeGesture = handleSwipeGesture;
        }
    }

    toggleMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (mobileMenuToggle && navMenu) {
            mobileMenuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (navMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
    }

    closeMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (mobileMenuToggle && navMenu) {
            mobileMenuToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showView(viewName, updateHistory = true) {
        if (!this.isInitialized) return;

        // Hide all views
        const views = document.querySelectorAll('.view');
        views.forEach(view => view.classList.add('hidden'));

        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.remove('hidden');
            this.currentView = viewName;

            // Update navigation active state
            this.updateNavigation(viewName);

            // Update browser history
            if (updateHistory) {
                history.pushState({ view: viewName }, '', `#${viewName}`);
            }

            // Render the view content
            this.renderView(viewName);
        }
    }

    updateNavigation(activeView) {
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${activeView}`) {
                link.classList.add('active');
            }
        });
    }

    renderView(viewName) {
        switch (viewName) {
            case 'dashboard':
                window.dashboard.render();
                break;
            case 'calendar':
                window.calendar.render();
                break;
            case 'pieces':
                window.pieces.render();
                break;
            case 'exercises':
                window.exercises.render();
                break;
            case 'sessions':
                window.sessions.render();
                break;
            default:
                console.warn(`Unknown view: ${viewName}`);
        }
    }

    refreshCurrentView() {
        this.renderView(this.currentView);
        
        // Also refresh dashboard stats if we're not currently on dashboard
        if (this.currentView !== 'dashboard') {
            window.dashboard.updateStats();
        }
        
        // Refresh calendar if we're not currently on calendar
        if (this.currentView !== 'calendar') {
            window.calendar.loadSessions();
        }
    }

    // Utility methods for components
    formatDate(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    formatDateTime(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes} min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
        }
    }

    // Export/Import functionality for future use
    exportData() {
        try {
            const data = {
                pieces: window.db.getAllPieces(),
                exercises: window.db.getAllExercises(),
                sessions: window.db.getAllSessions(),
                statistics: window.db.getPracticeStatistics(365), // Last year
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };

            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `piano-practice-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Error exporting data. Please try again.');
        }
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data structure
                if (!data.pieces || !data.exercises || !data.sessions) {
                    throw new Error('Invalid data format');
                }

                // Confirm import
                if (confirm('This will replace all existing data. Are you sure you want to continue?')) {
                    // Clear existing data and import new data
                    // Note: This would require additional database methods
                    console.log('Import functionality would be implemented here');
                    alert('Import functionality will be available in a future version.');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                alert('Error importing data. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    // Keyboard shortcuts
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when no modal is open
            if (!document.getElementById('modal-container').classList.contains('hidden')) {
                return;
            }

            // Ctrl/Cmd + key combinations
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.showView('dashboard');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showView('calendar');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showView('pieces');
                        break;
                    case '4':
                        e.preventDefault();
                        this.showView('exercises');
                        break;
                    case '5':
                        e.preventDefault();
                        this.showView('sessions');
                        break;
                    case 'n':
                        e.preventDefault();
                        this.handleNewItemShortcut();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportData();
                        break;
                }
            }
        });
    }

    handleNewItemShortcut() {
        switch (this.currentView) {
            case 'pieces':
                window.modal.showPieceForm();
                break;
            case 'exercises':
                window.modal.showExerciseForm();
                break;
            case 'sessions':
                window.modal.showSessionForm();
                break;
            case 'calendar':
                window.modal.showSessionForm();
                break;
        }
    }

    // Theme management (for future dark mode support)
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('piano-practice-theme', theme);
    }

    getTheme() {
        return localStorage.getItem('piano-practice-theme') || 'light';
    }

    // Settings management
    getSettings() {
        const defaultSettings = {
            theme: 'light',
            language: 'en',
            defaultSessionDuration: 60,
            weekStartsOn: 'monday',
            showCompletedSessions: true,
            autoSave: true
        };

        const saved = localStorage.getItem('piano-practice-settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    saveSettings(settings) {
        localStorage.setItem('piano-practice-settings', JSON.stringify(settings));
    }

    // Performance monitoring
    logPerformance(action, startTime) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`${action} took ${duration.toFixed(2)}ms`);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.initialize();
});

// Handle page visibility changes to save data
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.db) {
        window.db.saveToLocalStorage();
    }
});

// Handle beforeunload to save data
window.addEventListener('beforeunload', () => {
    if (window.db) {
        window.db.saveToLocalStorage();
    }
});

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Could send error reports to a logging service in production
});

// Service Worker registration for future PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker would be registered here for offline support
        console.log('Service Worker support detected (not implemented yet)');
    });
}
