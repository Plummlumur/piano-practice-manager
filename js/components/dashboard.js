// Dashboard component for statistics and overview
class Dashboard {
    constructor() {
        this.practiceTimeChart = null;
        this.piecesStatusChart = null;
    }

    render() {
        this.updateStats();
        this.renderCharts();
    }

    updateStats() {
        const stats = window.db.getDashboardStats();
        
        document.getElementById('total-pieces-count').textContent = stats.totalPieces;
        document.getElementById('training-pieces-count').textContent = stats.trainingPieces;
        document.getElementById('repertoire-pieces-count').textContent = stats.repertoirePieces;
        document.getElementById('total-sessions-count').textContent = stats.totalSessions;
    }

    renderCharts() {
        this.renderPracticeTimeChart();
        this.renderPiecesStatusChart();
    }

    renderPracticeTimeChart() {
        const ctx = document.getElementById('practice-time-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.practiceTimeChart) {
            this.practiceTimeChart.destroy();
        }

        const practiceData = window.db.getPracticeStatistics(7);
        
        // Fill in missing days with zero values
        const last7Days = this.getLast7Days();
        const chartData = last7Days.map(date => {
            const dayData = practiceData.find(d => d.date === date);
            return {
                date: date,
                minutes: dayData ? dayData.total_minutes : 0,
                sessions: dayData ? dayData.session_count : 0
            };
        });

        this.practiceTimeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(d => this.formatDateLabel(d.date)),
                datasets: [{
                    label: 'Practice Minutes',
                    data: chartData.map(d => d.minutes),
                    backgroundColor: 'rgba(0, 123, 255, 0.6)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const dataIndex = context.dataIndex;
                                const sessions = chartData[dataIndex].sessions;
                                return `Sessions: ${sessions}`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderPiecesStatusChart() {
        const ctx = document.getElementById('pieces-status-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.piecesStatusChart) {
            this.piecesStatusChart.destroy();
        }

        const stats = window.db.getDashboardStats();
        
        if (stats.totalPieces === 0) {
            // Show empty state
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
            const context = ctx.getContext('2d');
            context.font = '16px Arial';
            context.fillStyle = '#666';
            context.textAlign = 'center';
            context.fillText('No pieces added yet', ctx.width / 2, ctx.height / 2);
            return;
        }

        this.piecesStatusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['In Training', 'Repertoire'],
                datasets: [{
                    data: [stats.trainingPieces, stats.repertoirePieces],
                    backgroundColor: [
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(40, 167, 69, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 193, 7, 1)',
                        'rgba(40, 167, 69, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        return days;
    }

    formatDateLabel(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }

    destroy() {
        if (this.practiceTimeChart) {
            this.practiceTimeChart.destroy();
            this.practiceTimeChart = null;
        }
        if (this.piecesStatusChart) {
            this.piecesStatusChart.destroy();
            this.piecesStatusChart = null;
        }
    }
}

// Global dashboard instance
window.dashboard = new Dashboard();
