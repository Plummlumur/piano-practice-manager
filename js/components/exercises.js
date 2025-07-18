// Finger Exercises component for managing the exercises collection
class Exercises {
    constructor() {
        this.viewMode = 'list'; // 'list' or 'card'
        this.exercises = [];
    }

    render() {
        this.loadExercises();
        this.renderExercises();
        this.bindEvents();
    }

    bindEvents() {
        const toggleBtn = document.getElementById('toggle-exercises-view');
        const addBtn = document.getElementById('add-exercise-btn');

        if (toggleBtn) {
            toggleBtn.onclick = () => this.toggleView();
        }
        if (addBtn) {
            addBtn.onclick = () => window.modal.showExerciseForm();
        }
    }

    loadExercises() {
        this.exercises = window.db.getAllExercises();
    }

    renderExercises() {
        const container = document.getElementById('exercises-container');
        if (!container) return;

        container.className = `items-container ${this.viewMode}-view`;
        container.innerHTML = '';

        if (this.exercises.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No finger exercises added yet</h3>
                    <p>Build your technical foundation by adding finger exercises!</p>
                    <button onclick="window.modal.showExerciseForm()" class="btn btn-primary">Add Your First Exercise</button>
                </div>
            `;
            return;
        }

        this.exercises.forEach(exercise => {
            const exerciseElement = this.createExerciseElement(exercise);
            container.appendChild(exerciseElement);
        });

        // Update toggle button text
        const toggleBtn = document.getElementById('toggle-exercises-view');
        if (toggleBtn) {
            toggleBtn.textContent = this.viewMode === 'list' ? 'Card View' : 'List View';
        }
    }

    createExerciseElement(exercise) {
        if (this.viewMode === 'list') {
            return this.createListItem(exercise);
        } else {
            return this.createCardItem(exercise);
        }
    }

    createListItem(exercise) {
        const div = document.createElement('div');
        div.className = 'item-card list-item';
        
        const lastPracticedText = exercise.last_practiced_date 
            ? new Date(exercise.last_practiced_date).toLocaleDateString()
            : 'Never';
        
        const createdText = new Date(exercise.creation_date).toLocaleDateString();

        div.innerHTML = `
            <div class="list-item-content">
                <div class="list-item-title">${exercise.name}</div>
                <div class="list-item-meta">
                    ${exercise.description || 'No description'}
                </div>
                <div class="list-item-meta">
                    Last Practiced: ${lastPracticedText} • Added: ${createdText}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-primary" onclick="exercises.editExercise(${exercise.id})">
                    ${window.lang.edit}
                </button>
                <button class="btn btn-danger" onclick="exercises.deleteExercise(${exercise.id})">
                    ${window.lang.delete}
                </button>
            </div>
        `;

        return div;
    }

    createCardItem(exercise) {
        const div = document.createElement('div');
        div.className = 'item-card';
        
        const lastPracticedText = exercise.last_practiced_date 
            ? new Date(exercise.last_practiced_date).toLocaleDateString()
            : 'Never';
        
        const createdText = new Date(exercise.creation_date).toLocaleDateString();

        div.innerHTML = `
            <h3>${exercise.name}</h3>
            <div class="item-meta">
                ${exercise.description ? `<p><strong>Description:</strong><br>${exercise.description}</p>` : '<p><em>No description</em></p>'}
                <p><strong>Last Practiced:</strong> ${lastPracticedText}</p>
                <p><strong>Added:</strong> ${createdText}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary" onclick="exercises.editExercise(${exercise.id})">
                    ${window.lang.edit}
                </button>
                <button class="btn btn-danger" onclick="exercises.deleteExercise(${exercise.id})">
                    ${window.lang.delete}
                </button>
            </div>
        `;

        return div;
    }

    toggleView() {
        this.viewMode = this.viewMode === 'list' ? 'card' : 'list';
        this.renderExercises();
    }

    editExercise(exerciseId) {
        const exercise = this.exercises.find(ex => ex.id === exerciseId);
        if (exercise) {
            window.modal.showExerciseForm(exercise);
        }
    }

    deleteExercise(exerciseId) {
        const exercise = this.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        window.modal.confirmDelete(
            `Are you sure you want to delete the exercise "${exercise.name}"?`,
            () => {
                try {
                    window.db.deleteExercise(exerciseId);
                    this.render();
                    window.app.refreshCurrentView();
                } catch (error) {
                    console.error('Error deleting exercise:', error);
                    alert('Error deleting exercise. Please try again.');
                }
            }
        );
    }

    refresh() {
        this.render();
    }

    // Search functionality
    searchExercises(query) {
        if (!query.trim()) {
            this.loadExercises();
        } else {
            const allExercises = window.db.getAllExercises();
            this.exercises = allExercises.filter(exercise => 
                exercise.name.toLowerCase().includes(query.toLowerCase()) ||
                (exercise.description && exercise.description.toLowerCase().includes(query.toLowerCase()))
            );
        }
        this.renderExercises();
    }

    sortExercises(sortBy) {
        switch (sortBy) {
            case 'name':
                this.exercises.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'lastPracticed':
                this.exercises.sort((a, b) => {
                    if (!a.last_practiced_date && !b.last_practiced_date) return 0;
                    if (!a.last_practiced_date) return 1;
                    if (!b.last_practiced_date) return -1;
                    return new Date(b.last_practiced_date) - new Date(a.last_practiced_date);
                });
                break;
            case 'created':
                this.exercises.sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date));
                break;
            case 'needsPractice':
                // Sort by exercises that haven't been practiced in a while
                this.exercises.sort((a, b) => {
                    const aDate = a.last_practiced_date ? new Date(a.last_practiced_date) : new Date(0);
                    const bDate = b.last_practiced_date ? new Date(b.last_practiced_date) : new Date(0);
                    return aDate - bDate; // Oldest first
                });
                break;
            default:
                // Default sort by creation date (newest first)
                this.exercises.sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date));
        }
        this.renderExercises();
    }

    getStatistics() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const stats = {
            total: this.exercises.length,
            practicedThisWeek: this.exercises.filter(ex => 
                ex.last_practiced_date && new Date(ex.last_practiced_date) > weekAgo
            ).length,
            practicedThisMonth: this.exercises.filter(ex => 
                ex.last_practiced_date && new Date(ex.last_practiced_date) > monthAgo
            ).length,
            neverPracticed: this.exercises.filter(ex => !ex.last_practiced_date).length,
            needsAttention: this.exercises.filter(ex => {
                if (!ex.last_practiced_date) return true;
                const lastPracticed = new Date(ex.last_practiced_date);
                const daysSince = (now - lastPracticed) / (1000 * 60 * 60 * 24);
                return daysSince > 7; // Haven't practiced in over a week
            }).length,
            recentlyAdded: this.exercises.filter(ex => {
                return new Date(ex.creation_date) > weekAgo;
            }).length
        };

        return stats;
    }

    // Get exercises that need attention (haven't been practiced recently)
    getExercisesNeedingAttention() {
        const now = new Date();
        return this.exercises.filter(exercise => {
            if (!exercise.last_practiced_date) return true;
            const lastPracticed = new Date(exercise.last_practiced_date);
            const daysSince = (now - lastPracticed) / (1000 * 60 * 60 * 24);
            return daysSince > 7; // Haven't practiced in over a week
        }).sort((a, b) => {
            // Sort by longest time since practice
            const aDate = a.last_practiced_date ? new Date(a.last_practiced_date) : new Date(0);
            const bDate = b.last_practiced_date ? new Date(b.last_practiced_date) : new Date(0);
            return aDate - bDate;
        });
    }

    // Mark exercise as practiced (useful for quick updates)
    markAsPracticed(exerciseId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const exercise = this.exercises.find(ex => ex.id === exerciseId);
            if (exercise) {
                exercise.last_practiced_date = today;
                window.db.updateExercise(exerciseId, exercise);
                this.render();
            }
        } catch (error) {
            console.error('Error marking exercise as practiced:', error);
            alert('Error updating exercise. Please try again.');
        }
    }
}

// Global exercises instance
window.exercises = new Exercises();
