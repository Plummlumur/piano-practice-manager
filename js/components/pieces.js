// Piano Pieces component for managing the pieces collection
class Pieces {
    constructor() {
        this.viewMode = 'list'; // 'list' or 'card'
        this.pieces = [];
    }

    render() {
        this.loadPieces();
        this.renderPieces();
        this.bindEvents();
    }

    bindEvents() {
        const toggleBtn = document.getElementById('toggle-pieces-view');
        const addBtn = document.getElementById('add-piece-btn');

        if (toggleBtn) {
            toggleBtn.onclick = () => this.toggleView();
        }
        if (addBtn) {
            addBtn.onclick = () => window.modal.showPieceForm();
        }
    }

    loadPieces() {
        this.pieces = window.db.getAllPieces();
    }

    renderPieces() {
        const container = document.getElementById('pieces-container');
        if (!container) return;

        container.className = `items-container ${this.viewMode}-view`;
        container.innerHTML = '';

        if (this.pieces.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No piano pieces added yet</h3>
                    <p>Start building your repertoire by adding your first piece!</p>
                    <button onclick="window.modal.showPieceForm()" class="btn btn-primary">Add Your First Piece</button>
                </div>
            `;
            return;
        }

        this.pieces.forEach(piece => {
            const pieceElement = this.createPieceElement(piece);
            container.appendChild(pieceElement);
        });

        // Update toggle button text
        const toggleBtn = document.getElementById('toggle-pieces-view');
        if (toggleBtn) {
            toggleBtn.textContent = this.viewMode === 'list' ? 'Card View' : 'List View';
        }
    }

    createPieceElement(piece) {
        if (this.viewMode === 'list') {
            return this.createListItem(piece);
        } else {
            return this.createCardItem(piece);
        }
    }

    createListItem(piece) {
        const div = document.createElement('div');
        div.className = 'item-card list-item';
        
        const lastPlayedText = piece.last_played_date 
            ? new Date(piece.last_played_date).toLocaleDateString()
            : 'Never';
        
        const createdText = new Date(piece.creation_date).toLocaleDateString();

        div.innerHTML = `
            <div class="list-item-content">
                <div class="list-item-title">${piece.name}</div>
                <div class="list-item-meta">
                    ${piece.composer} 
                    ${piece.work_classification ? `• ${piece.work_classification}` : ''}
                    ${piece.source ? `• ${piece.source}` : ''}
                </div>
                <div class="list-item-meta">
                    <span class="status-badge status-${piece.status.toLowerCase().replace(' ', '-')}">
                        ${piece.status}
                    </span>
                    • Play Count: ${piece.play_counter}
                    • Last Played: ${lastPlayedText}
                    • Added: ${createdText}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-primary" onclick="pieces.editPiece(${piece.id})">
                    ${window.lang.edit}
                </button>
                <button class="btn btn-danger" onclick="pieces.deletePiece(${piece.id})">
                    ${window.lang.delete}
                </button>
            </div>
        `;

        return div;
    }

    createCardItem(piece) {
        const div = document.createElement('div');
        div.className = 'item-card';
        
        const lastPlayedText = piece.last_played_date 
            ? new Date(piece.last_played_date).toLocaleDateString()
            : 'Never';
        
        const createdText = new Date(piece.creation_date).toLocaleDateString();

        div.innerHTML = `
            <h3>${piece.name}</h3>
            <div class="item-meta">
                <strong>Composer:</strong> ${piece.composer}<br>
                ${piece.work_classification ? `<strong>Work:</strong> ${piece.work_classification}<br>` : ''}
                ${piece.source ? `<strong>Source:</strong> ${piece.source}<br>` : ''}
                <strong>Status:</strong> 
                <span class="status-badge status-${piece.status.toLowerCase().replace(' ', '-')}">
                    ${piece.status}
                </span><br>
                <strong>Play Count:</strong> ${piece.play_counter}<br>
                <strong>Last Played:</strong> ${lastPlayedText}<br>
                <strong>Added:</strong> ${createdText}
            </div>
            <div class="item-actions">
                <button class="btn btn-primary" onclick="pieces.editPiece(${piece.id})">
                    ${window.lang.edit}
                </button>
                <button class="btn btn-danger" onclick="pieces.deletePiece(${piece.id})">
                    ${window.lang.delete}
                </button>
            </div>
        `;

        return div;
    }

    toggleView() {
        this.viewMode = this.viewMode === 'list' ? 'card' : 'list';
        this.renderPieces();
    }

    editPiece(pieceId) {
        const piece = window.db.getPieceById(pieceId);
        if (piece) {
            window.modal.showPieceForm(piece);
        }
    }

    deletePiece(pieceId) {
        const piece = window.db.getPieceById(pieceId);
        if (!piece) return;

        window.modal.confirmDelete(
            `Are you sure you want to delete "${piece.name}" by ${piece.composer}?`,
            () => {
                try {
                    window.db.deletePiece(pieceId);
                    this.render();
                    window.app.refreshCurrentView();
                } catch (error) {
                    console.error('Error deleting piece:', error);
                    alert('Error deleting piece. Please try again.');
                }
            }
        );
    }

    refresh() {
        this.render();
    }

    // Filter and search functionality
    filterByStatus(status) {
        if (status === 'all') {
            this.pieces = window.db.getAllPieces();
        } else {
            this.pieces = window.db.getPiecesByStatus(status);
        }
        this.renderPieces();
    }

    searchPieces(query) {
        if (!query.trim()) {
            this.loadPieces();
        } else {
            const allPieces = window.db.getAllPieces();
            this.pieces = allPieces.filter(piece => 
                piece.name.toLowerCase().includes(query.toLowerCase()) ||
                piece.composer.toLowerCase().includes(query.toLowerCase()) ||
                (piece.work_classification && piece.work_classification.toLowerCase().includes(query.toLowerCase())) ||
                (piece.source && piece.source.toLowerCase().includes(query.toLowerCase()))
            );
        }
        this.renderPieces();
    }

    sortPieces(sortBy) {
        switch (sortBy) {
            case 'name':
                this.pieces.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'composer':
                this.pieces.sort((a, b) => a.composer.localeCompare(b.composer));
                break;
            case 'status':
                this.pieces.sort((a, b) => a.status.localeCompare(b.status));
                break;
            case 'playCount':
                this.pieces.sort((a, b) => b.play_counter - a.play_counter);
                break;
            case 'lastPlayed':
                this.pieces.sort((a, b) => {
                    if (!a.last_played_date && !b.last_played_date) return 0;
                    if (!a.last_played_date) return 1;
                    if (!b.last_played_date) return -1;
                    return new Date(b.last_played_date) - new Date(a.last_played_date);
                });
                break;
            case 'created':
                this.pieces.sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date));
                break;
            default:
                // Default sort by creation date (newest first)
                this.pieces.sort((a, b) => new Date(b.creation_date) - new Date(a.creation_date));
        }
        this.renderPieces();
    }

    getStatistics() {
        const stats = {
            total: this.pieces.length,
            inTraining: this.pieces.filter(p => p.status === 'In Training').length,
            repertoire: this.pieces.filter(p => p.status === 'Repertoire').length,
            totalPlayCount: this.pieces.reduce((sum, p) => sum + p.play_counter, 0),
            averagePlayCount: 0,
            mostPlayedPiece: null,
            recentlyAdded: this.pieces.filter(p => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(p.creation_date) > weekAgo;
            }).length
        };

        if (stats.total > 0) {
            stats.averagePlayCount = (stats.totalPlayCount / stats.total).toFixed(1);
            stats.mostPlayedPiece = this.pieces.reduce((max, p) => 
                p.play_counter > max.play_counter ? p : max
            );
        }

        return stats;
    }
}

// Global pieces instance
window.pieces = new Pieces();
