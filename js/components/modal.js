// Modal component for forms and dialogs
class Modal {
    constructor() {
        this.container = document.getElementById('modal-container');
        this.currentModal = null;
    }

    show(content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const header = document.createElement('div');
        header.className = 'modal-header';
        
        const title = document.createElement('h3');
        title.textContent = options.title || 'Modal';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.hide();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.innerHTML = content;
        
        modal.appendChild(header);
        modal.appendChild(body);
        
        if (options.footer) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            footer.innerHTML = options.footer;
            modal.appendChild(footer);
        }
        
        this.container.innerHTML = '';
        this.container.appendChild(modal);
        this.container.classList.remove('hidden');
        this.currentModal = modal;
        
        // Close on background click
        this.container.onclick = (e) => {
            if (e.target === this.container) {
                this.hide();
            }
        };
        
        // Close on Escape key
        document.addEventListener('keydown', this.handleEscape);
        
        return modal;
    }

    hide() {
        this.container.classList.add('hidden');
        this.container.innerHTML = '';
        this.currentModal = null;
        document.removeEventListener('keydown', this.handleEscape);
    }

    handleEscape = (e) => {
        if (e.key === 'Escape') {
            this.hide();
        }
    }

    showPieceForm(piece = null) {
        const isEdit = piece !== null;
        const title = isEdit ? 'Edit Piano Piece' : 'Add Piano Piece';
        
        const content = `
            <form id="piece-form">
                <div class="form-group">
                    <label for="piece-name">${window.lang.piece_name} *</label>
                    <input type="text" id="piece-name" name="name" required value="${piece?.name || ''}">
                </div>
                <div class="form-group">
                    <label for="piece-composer">${window.lang.composer} *</label>
                    <input type="text" id="piece-composer" name="composer" required value="${piece?.composer || ''}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="piece-work">${window.lang.work_classification}</label>
                        <input type="text" id="piece-work" name="work_classification" value="${piece?.work_classification || ''}">
                    </div>
                    <div class="form-group">
                        <label for="piece-status">${window.lang.status} *</label>
                        <select id="piece-status" name="status" required>
                            <option value="In Training" ${piece?.status === 'In Training' ? 'selected' : ''}>${window.lang.status_training}</option>
                            <option value="Repertoire" ${piece?.status === 'Repertoire' ? 'selected' : ''}>${window.lang.status_repertoire}</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="piece-source">${window.lang.source}</label>
                        <input type="text" id="piece-source" name="source" value="${piece?.source || ''}">
                    </div>
                    <div class="form-group">
                        <label for="piece-play-count">${window.lang.play_count}</label>
                        <input type="number" id="piece-play-count" name="play_count" min="0" value="${piece?.play_counter || 0}">
                    </div>
                </div>
            </form>
        `;
        
        const footer = `
            <button type="button" onclick="modal.hide()" class="btn btn-secondary">${window.lang.cancel}</button>
            <button type="button" onclick="modal.savePiece(${piece?.id || 'null'})" class="btn btn-primary">${window.lang.save}</button>
        `;
        
        this.show(content, { title, footer });
    }

    savePiece(pieceId) {
        const form = document.getElementById('piece-form');
        const formData = new FormData(form);
        
        const pieceData = {
            name: formData.get('name').trim(),
            composer: formData.get('composer').trim(),
            work_classification: formData.get('work_classification').trim(),
            source: formData.get('source').trim(),
            status: formData.get('status'),
            play_count: parseInt(formData.get('play_count')) || 0
        };
        
        // Validation
        if (!pieceData.name || !pieceData.composer) {
            alert(window.lang.required_field);
            return;
        }
        
        try {
            if (pieceId) {
                window.db.updatePiece(pieceId, pieceData);
            } else {
                window.db.addPiece(pieceData);
            }
            
            this.hide();
            window.app.refreshCurrentView();
        } catch (error) {
            console.error('Error saving piece:', error);
            alert('Error saving piece. Please try again.');
        }
    }

    showPlayCountForm(piece, currentCount) {
        const title = 'Edit Play Count';
        
        const content = `
            <div class="play-count-form">
                <p><strong>${piece.name}</strong> by ${piece.composer}</p>
                <div class="form-group">
                    <label for="play-count-input">${window.lang.play_count}:</label>
                    <input type="number" id="play-count-input" min="0" value="${currentCount}" 
                           style="width: 100px; text-align: center; font-size: 1.2rem;">
                </div>
                <p style="font-size: 0.9rem; color: #666; margin-top: 1rem;">
                    ${window.lang.play_count_note || 'This represents how many times you have played this piece.'}
                </p>
            </div>
        `;
        
        const footer = `
            <button type="button" onclick="modal.hide()" class="btn btn-secondary">${window.lang.cancel}</button>
            <button type="button" onclick="modal.savePlayCount(${piece.id})" class="btn btn-primary">${window.lang.save}</button>
        `;
        
        this.show(content, { title, footer });
        
        // Focus and select the input
        setTimeout(() => {
            const input = document.getElementById('play-count-input');
            if (input) {
                input.focus();
                input.select();
            }
        }, 100);
    }

    savePlayCount(pieceId) {
        const input = document.getElementById('play-count-input');
        const playCount = parseInt(input.value) || 0;
        
        if (playCount < 0) {
            alert('Play count cannot be negative.');
            return;
        }
        
        try {
            const piece = window.db.getPieceById(pieceId);
            if (!piece) {
                throw new Error('Piece not found');
            }
            
            // Update only the play count, keeping other fields unchanged
            const updatedPiece = {
                name: piece.name,
                composer: piece.composer,
                work_classification: piece.work_classification,
                source: piece.source,
                status: piece.status,
                play_count: playCount
            };
            
            window.db.updatePiece(pieceId, updatedPiece);
            
            this.hide();
            window.app.refreshCurrentView();
        } catch (error) {
            console.error('Error updating play count:', error);
            alert('Error updating play count. Please try again.');
        }
    }

    showExerciseForm(exercise = null) {
        const isEdit = exercise !== null;
        const title = isEdit ? 'Edit Finger Exercise' : 'Add Finger Exercise';
        
        const content = `
            <form id="exercise-form">
                <div class="form-group">
                    <label for="exercise-name">${window.lang.exercise_name} *</label>
                    <input type="text" id="exercise-name" name="name" required value="${exercise?.name || ''}">
                </div>
                <div class="form-group">
                    <label for="exercise-description">${window.lang.exercise_description}</label>
                    <textarea id="exercise-description" name="description" rows="4">${exercise?.description || ''}</textarea>
                </div>
            </form>
        `;
        
        const footer = `
            <button type="button" onclick="modal.hide()" class="btn btn-secondary">${window.lang.cancel}</button>
            <button type="button" onclick="modal.saveExercise(${exercise?.id || 'null'})" class="btn btn-primary">${window.lang.save}</button>
        `;
        
        this.show(content, { title, footer });
    }

    saveExercise(exerciseId) {
        const form = document.getElementById('exercise-form');
        const formData = new FormData(form);
        
        const exerciseData = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim()
        };
        
        // Validation
        if (!exerciseData.name) {
            alert(window.lang.required_field);
            return;
        }
        
        try {
            if (exerciseId) {
                window.db.updateExercise(exerciseId, exerciseData);
            } else {
                window.db.addExercise(exerciseData);
            }
            
            this.hide();
            window.app.refreshCurrentView();
        } catch (error) {
            console.error('Error saving exercise:', error);
            alert('Error saving exercise. Please try again.');
        }
    }

    showSessionForm(session = null, selectedDate = null) {
        const isEdit = session !== null;
        const title = isEdit ? 'Edit Training Session' : 'Add Training Session';
        
        // Get available exercises and pieces
        const exercises = window.db.getAllExercises();
        const trainingPieces = window.db.getPiecesByStatus('In Training');
        const repertoirePieces = window.db.getPiecesByStatus('Repertoire');
        
        const sessionDetails = isEdit ? window.db.getSessionDetails(session.id) : null;
        
        const content = `
            <form id="session-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="session-date">${window.lang.session_date} *</label>
                        <input type="date" id="session-date" name="date" required 
                               value="${session?.date || selectedDate || new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label for="session-duration">${window.lang.session_duration} *</label>
                        <input type="number" id="session-duration" name="duration" min="1" max="600" required 
                               value="${session?.duration || 60}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="session-exercises">${window.lang.select_exercises} *</label>
                    <select id="session-exercises" name="exercises" multiple size="4" required>
                        ${exercises.map(ex => `
                            <option value="${ex.id}" ${sessionDetails?.exercises.some(e => e.id === ex.id) ? 'selected' : ''}>
                                ${ex.name}
                            </option>
                        `).join('')}
                    </select>
                    ${exercises.length === 0 ? `<p class="text-muted">${window.lang.no_items_available}</p>` : ''}
                </div>
                
                <div class="form-group">
                    <label for="session-training">${window.lang.select_training_pieces} *</label>
                    <select id="session-training" name="training" multiple size="4" required>
                        ${trainingPieces.map(piece => `
                            <option value="${piece.id}" ${sessionDetails?.trainingPieces.some(p => p.id === piece.id) ? 'selected' : ''}>
                                ${piece.name} - ${piece.composer}
                            </option>
                        `).join('')}
                    </select>
                    ${trainingPieces.length === 0 ? `<p class="text-muted">${window.lang.no_items_available}</p>` : ''}
                </div>
                
                <div class="form-group">
                    <label for="session-repertoire">${window.lang.select_repertoire_pieces} *</label>
                    <select id="session-repertoire" name="repertoire" multiple size="4" required>
                        ${repertoirePieces.map(piece => `
                            <option value="${piece.id}" ${sessionDetails?.repertoirePieces.some(p => p.id === piece.id) ? 'selected' : ''}>
                                ${piece.name} - ${piece.composer} (${window.lang.play_count}: ${piece.play_counter})
                            </option>
                        `).join('')}
                    </select>
                    ${repertoirePieces.length === 0 ? `<p class="text-muted">${window.lang.no_items_available}</p>` : ''}
                </div>
            </form>
        `;
        
        const footer = `
            <button type="button" onclick="modal.hide()" class="btn btn-secondary">${window.lang.cancel}</button>
            <button type="button" onclick="modal.saveSession(${session?.id || 'null'})" class="btn btn-primary">${window.lang.save}</button>
        `;
        
        this.show(content, { title, footer });
    }

    saveSession(sessionId) {
        const form = document.getElementById('session-form');
        const formData = new FormData(form);
        
        const exerciseSelect = document.getElementById('session-exercises');
        const trainingSelect = document.getElementById('session-training');
        const repertoireSelect = document.getElementById('session-repertoire');
        
        const sessionData = {
            date: formData.get('date'),
            duration: parseInt(formData.get('duration')),
            fingerExercises: Array.from(exerciseSelect.selectedOptions).map(opt => parseInt(opt.value)),
            trainingPieces: Array.from(trainingSelect.selectedOptions).map(opt => parseInt(opt.value)),
            repertoirePieces: Array.from(repertoireSelect.selectedOptions).map(opt => parseInt(opt.value))
        };
        
        // Validation
        if (!sessionData.date || !sessionData.duration) {
            alert(window.lang.required_field);
            return;
        }
        
        if (sessionData.duration < 1 || sessionData.duration > 600) {
            alert(window.lang.invalid_duration);
            return;
        }
        
        if (sessionData.fingerExercises.length === 0 || 
            sessionData.trainingPieces.length === 0 || 
            sessionData.repertoirePieces.length === 0) {
            alert('All three sections (exercises, training pieces, repertoire pieces) are required.');
            return;
        }
        
        // Check daily limit (10 hours = 600 minutes)
        const existingSessions = window.db.getSessionsByDate(sessionData.date);
        const totalDuration = existingSessions
            .filter(s => sessionId ? s.id !== sessionId : true)
            .reduce((sum, s) => sum + s.duration, 0) + sessionData.duration;
        
        if (totalDuration > 600) {
            alert(window.lang.max_hours_exceeded);
            return;
        }
        
        try {
            if (sessionId) {
                // For editing, we need to delete and recreate associations
                window.db.deleteSession(sessionId);
                window.db.addSession(sessionData);
            } else {
                window.db.addSession(sessionData);
            }
            
            this.hide();
            window.app.refreshCurrentView();
        } catch (error) {
            console.error('Error saving session:', error);
            alert('Error saving session. Please try again.');
        }
    }

    showSessionDetails(sessionId) {
        const sessionDetails = window.db.getSessionDetails(sessionId);
        if (!sessionDetails) return;
        
        const content = `
            <div class="session-details">
                <div class="session-info">
                    <p><strong>${window.lang.session_date}:</strong> ${sessionDetails.date}</p>
                    <p><strong>${window.lang.session_duration}:</strong> ${sessionDetails.duration} minutes</p>
                    <p><strong>${window.lang.session_status}:</strong> 
                        <span class="status-badge status-${sessionDetails.status.toLowerCase().replace(' ', '-')}">
                            ${sessionDetails.status}
                        </span>
                    </p>
                </div>
                
                <div class="session-content">
                    <h4>${window.lang.finger_exercises_section}</h4>
                    <ul>
                        ${sessionDetails.exercises.map(ex => `<li>${ex.name}</li>`).join('')}
                    </ul>
                    
                    <h4>${window.lang.training_pieces_section}</h4>
                    <ul>
                        ${sessionDetails.trainingPieces.map(piece => `<li>${piece.name} - ${piece.composer}</li>`).join('')}
                    </ul>
                    
                    <h4>${window.lang.repertoire_pieces_section}</h4>
                    <ul>
                        ${sessionDetails.repertoirePieces.map(piece => `<li>${piece.name} - ${piece.composer}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        let footer = `<button type="button" onclick="modal.hide()" class="btn btn-secondary">${window.lang.cancel}</button>`;
        
        if (sessionDetails.status === 'Planned') {
            footer = `
                <button type="button" onclick="modal.hide()" class="btn btn-secondary">${window.lang.cancel}</button>
                <button type="button" onclick="modal.completeSession(${sessionId})" class="btn btn-primary">${window.lang.complete}</button>
            `;
        }
        
        this.show(content, { title: 'Training Session Details', footer });
    }

    completeSession(sessionId) {
        if (confirm('Mark this training session as completed?')) {
            try {
                window.db.completeSession(sessionId);
                this.hide();
                window.app.refreshCurrentView();
                alert(window.lang.session_completed);
            } catch (error) {
                console.error('Error completing session:', error);
                alert('Error completing session. Please try again.');
            }
        }
    }

    confirmDelete(message, callback) {
        const content = `<p>${message}</p>`;
        const footer = `
            <button type="button" onclick="modal.hide()" class="btn btn-secondary">${window.lang.cancel}</button>
            <button type="button" onclick="modal.executeDelete()" class="btn btn-danger">${window.lang.delete}</button>
        `;
        
        this.deleteCallback = callback;
        this.show(content, { title: 'Confirm Delete', footer });
    }

    executeDelete() {
        if (this.deleteCallback) {
            this.deleteCallback();
            this.deleteCallback = null;
        }
        this.hide();
    }
}

// Global modal instance
window.modal = new Modal();
