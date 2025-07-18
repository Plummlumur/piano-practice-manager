// Database management using SQL.js
class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Initialize SQL.js
            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            // Try to load existing database from localStorage
            const savedDb = localStorage.getItem('piano_practice_db');
            if (savedDb) {
                const uint8Array = new Uint8Array(JSON.parse(savedDb));
                this.db = new SQL.Database(uint8Array);
            } else {
                this.db = new SQL.Database();
                await this.createTables();
                await this.insertSampleData();
            }

            this.isInitialized = true;
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    async createTables() {
        const schema = `
            -- Piano Pieces Table
            CREATE TABLE IF NOT EXISTS piano_pieces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                composer TEXT NOT NULL,
                work_classification TEXT,
                source TEXT,
                creation_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'In Training',
                play_counter INTEGER DEFAULT 0,
                last_played_date TEXT
            );

            -- Finger Exercises Table
            CREATE TABLE IF NOT EXISTS finger_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                creation_date TEXT NOT NULL,
                last_practiced_date TEXT
            );

            -- Training Sessions Table
            CREATE TABLE IF NOT EXISTS training_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                duration INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'Planned',
                creation_date TEXT NOT NULL,
                completion_date TEXT
            );

            -- Session Finger Exercises Junction Table
            CREATE TABLE IF NOT EXISTS session_finger_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES training_sessions(id),
                FOREIGN KEY (exercise_id) REFERENCES finger_exercises(id)
            );

            -- Session Training Pieces Junction Table
            CREATE TABLE IF NOT EXISTS session_training_pieces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                piece_id INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES training_sessions(id),
                FOREIGN KEY (piece_id) REFERENCES piano_pieces(id)
            );

            -- Session Repertoire Pieces Junction Table
            CREATE TABLE IF NOT EXISTS session_repertoire_pieces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                piece_id INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES training_sessions(id),
                FOREIGN KEY (piece_id) REFERENCES piano_pieces(id)
            );

            -- Practice Statistics Table
            CREATE TABLE IF NOT EXISTS practice_statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                total_minutes INTEGER NOT NULL,
                session_count INTEGER NOT NULL
            );
        `;

        this.db.exec(schema);
    }

    async insertSampleData() {
        const sampleData = `
            -- Sample Piano Pieces
            INSERT INTO piano_pieces (name, composer, work_classification, source, creation_date, status, play_counter, last_played_date) VALUES
            ('Für Elise', 'Ludwig van Beethoven', 'WoO 59', 'Henle Urtext', '2024-01-15', 'Repertoire', 5, '2024-01-20'),
            ('Moonlight Sonata - 1st Movement', 'Ludwig van Beethoven', 'Op. 27 No. 2', 'Henle Urtext', '2024-01-10', 'Repertoire', 8, '2024-01-18'),
            ('Prelude in C Major', 'Johann Sebastian Bach', 'BWV 846', 'Bach Complete Works', '2024-01-20', 'In Training', 0, null),
            ('Minute Waltz', 'Frédéric Chopin', 'Op. 64 No. 1', 'Peters Edition', '2024-01-25', 'In Training', 0, null),
            ('Clair de Lune', 'Claude Debussy', 'L. 75 No. 3', 'Durand Edition', '2024-02-01', 'In Training', 0, null);

            -- Sample Finger Exercises
            INSERT INTO finger_exercises (name, description, creation_date, last_practiced_date) VALUES
            ('Hanon Exercise No. 1', 'Five-finger patterns for independence and strength', '2024-01-15', '2024-01-20'),
            ('Scales - C Major', 'Major scale practice in C major, both hands', '2024-01-15', '2024-01-19'),
            ('Arpeggios - C Major Triad', 'Broken chord practice in C major', '2024-01-15', '2024-01-18'),
            ('Chromatic Scale', 'Chromatic scale practice for finger dexterity', '2024-01-16', '2024-01-17'),
            ('Octave Exercises', 'Octave stretches and strength building', '2024-01-16', null);

            -- Sample Training Sessions
            INSERT INTO training_sessions (date, duration, status, creation_date, completion_date) VALUES
            ('2024-01-20', 90, 'Completed', '2024-01-20', '2024-01-20'),
            ('2024-01-19', 60, 'Completed', '2024-01-19', '2024-01-19'),
            ('2024-01-18', 75, 'Completed', '2024-01-18', '2024-01-18'),
            ('2024-01-22', 90, 'Planned', '2024-01-21', null),
            ('2024-01-23', 60, 'Planned', '2024-01-21', null);

            -- Sample Session Associations
            INSERT INTO session_finger_exercises (session_id, exercise_id) VALUES
            (1, 1), (1, 2), (2, 1), (2, 3), (3, 2), (3, 4);

            INSERT INTO session_training_pieces (session_id, piece_id) VALUES
            (1, 3), (1, 4), (2, 3), (3, 4), (3, 5);

            INSERT INTO session_repertoire_pieces (session_id, piece_id) VALUES
            (1, 1), (1, 2), (2, 1), (3, 2);

            -- Sample Practice Statistics
            INSERT INTO practice_statistics (date, total_minutes, session_count) VALUES
            ('2024-01-20', 90, 1),
            ('2024-01-19', 60, 1),
            ('2024-01-18', 75, 1),
            ('2024-01-17', 45, 1),
            ('2024-01-16', 60, 1),
            ('2024-01-15', 90, 1),
            ('2024-01-14', 30, 1);
        `;

        this.db.exec(sampleData);
    }

    saveToLocalStorage() {
        if (this.db) {
            const data = this.db.export();
            localStorage.setItem('piano_practice_db', JSON.stringify(Array.from(data)));
        }
    }

    // Piano Pieces CRUD operations
    getAllPieces() {
        const stmt = this.db.prepare("SELECT * FROM piano_pieces ORDER BY creation_date DESC");
        const result = [];
        while (stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result;
    }

    getPieceById(id) {
        const stmt = this.db.prepare("SELECT * FROM piano_pieces WHERE id = ?");
        stmt.bind([id]);
        const result = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return result;
    }

    addPiece(piece) {
        const stmt = this.db.prepare(`
            INSERT INTO piano_pieces (name, composer, work_classification, source, creation_date, status, play_counter)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        `);
        stmt.run([
            piece.name,
            piece.composer,
            piece.work_classification || '',
            piece.source || '',
            new Date().toISOString().split('T')[0],
            piece.status || 'In Training'
        ]);
        stmt.free();
        this.saveToLocalStorage();
    }

    updatePiece(id, piece) {
        const stmt = this.db.prepare(`
            UPDATE piano_pieces 
            SET name = ?, composer = ?, work_classification = ?, source = ?, status = ?, play_counter = ?
            WHERE id = ?
        `);
        stmt.run([
            piece.name,
            piece.composer,
            piece.work_classification || '',
            piece.source || '',
            piece.status,
            piece.play_count || 0,
            id
        ]);
        stmt.free();
        this.saveToLocalStorage();
    }

    deletePiece(id) {
        const stmt = this.db.prepare("DELETE FROM piano_pieces WHERE id = ?");
        stmt.run([id]);
        stmt.free();
        this.saveToLocalStorage();
    }

    getPiecesByStatus(status) {
        const stmt = this.db.prepare("SELECT * FROM piano_pieces WHERE status = ? ORDER BY last_played_date ASC NULLS FIRST");
        stmt.bind([status]);
        const result = [];
        while (stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result;
    }

    // Finger Exercises CRUD operations
    getAllExercises() {
        const stmt = this.db.prepare("SELECT * FROM finger_exercises ORDER BY creation_date DESC");
        const result = [];
        while (stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result;
    }

    addExercise(exercise) {
        const stmt = this.db.prepare(`
            INSERT INTO finger_exercises (name, description, creation_date)
            VALUES (?, ?, ?)
        `);
        stmt.run([
            exercise.name,
            exercise.description || '',
            new Date().toISOString().split('T')[0]
        ]);
        stmt.free();
        this.saveToLocalStorage();
    }

    updateExercise(id, exercise) {
        const stmt = this.db.prepare(`
            UPDATE finger_exercises 
            SET name = ?, description = ?
            WHERE id = ?
        `);
        stmt.run([exercise.name, exercise.description || '', id]);
        stmt.free();
        this.saveToLocalStorage();
    }

    deleteExercise(id) {
        const stmt = this.db.prepare("DELETE FROM finger_exercises WHERE id = ?");
        stmt.run([id]);
        stmt.free();
        this.saveToLocalStorage();
    }

    // Training Sessions CRUD operations
    getAllSessions() {
        const stmt = this.db.prepare("SELECT * FROM training_sessions ORDER BY date DESC");
        const result = [];
        while (stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result;
    }

    getSessionById(id) {
        const stmt = this.db.prepare("SELECT * FROM training_sessions WHERE id = ?");
        stmt.bind([id]);
        const result = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return result;
    }

    addSession(session) {
        const stmt = this.db.prepare(`
            INSERT INTO training_sessions (date, duration, status, creation_date)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run([
            session.date,
            session.duration,
            session.status || 'Planned',
            new Date().toISOString().split('T')[0]
        ]);
        
        const sessionId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
        
        // Add associated exercises and pieces
        if (session.fingerExercises) {
            session.fingerExercises.forEach(exerciseId => {
                const exerciseStmt = this.db.prepare("INSERT INTO session_finger_exercises (session_id, exercise_id) VALUES (?, ?)");
                exerciseStmt.run([sessionId, exerciseId]);
                exerciseStmt.free();
            });
        }
        
        if (session.trainingPieces) {
            session.trainingPieces.forEach(pieceId => {
                const pieceStmt = this.db.prepare("INSERT INTO session_training_pieces (session_id, piece_id) VALUES (?, ?)");
                pieceStmt.run([sessionId, pieceId]);
                pieceStmt.free();
            });
        }
        
        if (session.repertoirePieces) {
            session.repertoirePieces.forEach(pieceId => {
                const pieceStmt = this.db.prepare("INSERT INTO session_repertoire_pieces (session_id, piece_id) VALUES (?, ?)");
                pieceStmt.run([sessionId, pieceId]);
                pieceStmt.free();
            });
        }
        
        stmt.free();
        this.saveToLocalStorage();
        return sessionId;
    }

    completeSession(sessionId) {
        const completionDate = new Date().toISOString().split('T')[0];
        
        // Update session status
        const sessionStmt = this.db.prepare("UPDATE training_sessions SET status = 'Completed', completion_date = ? WHERE id = ?");
        sessionStmt.run([completionDate, sessionId]);
        sessionStmt.free();
        
        // Update exercise last practiced dates
        const exerciseStmt = this.db.prepare(`
            UPDATE finger_exercises 
            SET last_practiced_date = ? 
            WHERE id IN (SELECT exercise_id FROM session_finger_exercises WHERE session_id = ?)
        `);
        exerciseStmt.run([completionDate, sessionId]);
        exerciseStmt.free();
        
        // Update training pieces last played dates
        const trainingStmt = this.db.prepare(`
            UPDATE piano_pieces 
            SET last_played_date = ? 
            WHERE id IN (SELECT piece_id FROM session_training_pieces WHERE session_id = ?)
        `);
        trainingStmt.run([completionDate, sessionId]);
        trainingStmt.free();
        
        // Update repertoire pieces last played dates and increment counters
        const repertoireStmt = this.db.prepare(`
            UPDATE piano_pieces 
            SET last_played_date = ?, play_counter = play_counter + 1 
            WHERE id IN (SELECT piece_id FROM session_repertoire_pieces WHERE session_id = ?)
        `);
        repertoireStmt.run([completionDate, sessionId]);
        repertoireStmt.free();
        
        // Update practice statistics
        const session = this.getSessionById(sessionId);
        if (session) {
            this.updatePracticeStatistics(session.date, session.duration);
        }
        
        this.saveToLocalStorage();
    }

    deleteSession(id) {
        // Delete associated records first
        this.db.exec(`DELETE FROM session_finger_exercises WHERE session_id = ${id}`);
        this.db.exec(`DELETE FROM session_training_pieces WHERE session_id = ${id}`);
        this.db.exec(`DELETE FROM session_repertoire_pieces WHERE session_id = ${id}`);
        
        // Delete the session
        const stmt = this.db.prepare("DELETE FROM training_sessions WHERE id = ?");
        stmt.run([id]);
        stmt.free();
        this.saveToLocalStorage();
    }

    getSessionsByDate(date) {
        const stmt = this.db.prepare("SELECT * FROM training_sessions WHERE date = ? ORDER BY creation_date");
        stmt.bind([date]);
        const result = [];
        while (stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result;
    }

    getSessionDetails(sessionId) {
        const session = this.getSessionById(sessionId);
        if (!session) return null;

        // Get associated exercises
        const exerciseStmt = this.db.prepare(`
            SELECT fe.* FROM finger_exercises fe
            JOIN session_finger_exercises sfe ON fe.id = sfe.exercise_id
            WHERE sfe.session_id = ?
        `);
        exerciseStmt.bind([sessionId]);
        const exercises = [];
        while (exerciseStmt.step()) {
            exercises.push(exerciseStmt.getAsObject());
        }
        exerciseStmt.free();

        // Get associated training pieces
        const trainingStmt = this.db.prepare(`
            SELECT pp.* FROM piano_pieces pp
            JOIN session_training_pieces stp ON pp.id = stp.piece_id
            WHERE stp.session_id = ?
        `);
        trainingStmt.bind([sessionId]);
        const trainingPieces = [];
        while (trainingStmt.step()) {
            trainingPieces.push(trainingStmt.getAsObject());
        }
        trainingStmt.free();

        // Get associated repertoire pieces
        const repertoireStmt = this.db.prepare(`
            SELECT pp.* FROM piano_pieces pp
            JOIN session_repertoire_pieces srp ON pp.id = srp.piece_id
            WHERE srp.session_id = ?
        `);
        repertoireStmt.bind([sessionId]);
        const repertoirePieces = [];
        while (repertoireStmt.step()) {
            repertoirePieces.push(repertoireStmt.getAsObject());
        }
        repertoireStmt.free();

        return {
            ...session,
            exercises,
            trainingPieces,
            repertoirePieces
        };
    }

    // Statistics
    updatePracticeStatistics(date, minutes) {
        const existingStmt = this.db.prepare("SELECT * FROM practice_statistics WHERE date = ?");
        existingStmt.bind([date]);
        
        if (existingStmt.step()) {
            // Update existing record
            const updateStmt = this.db.prepare(`
                UPDATE practice_statistics 
                SET total_minutes = total_minutes + ?, session_count = session_count + 1 
                WHERE date = ?
            `);
            updateStmt.run([minutes, date]);
            updateStmt.free();
        } else {
            // Insert new record
            const insertStmt = this.db.prepare(`
                INSERT INTO practice_statistics (date, total_minutes, session_count) 
                VALUES (?, ?, 1)
            `);
            insertStmt.run([date, minutes]);
            insertStmt.free();
        }
        
        existingStmt.free();
        this.saveToLocalStorage();
    }

    getPracticeStatistics(days = 7) {
        const stmt = this.db.prepare(`
            SELECT * FROM practice_statistics 
            ORDER BY date DESC 
            LIMIT ?
        `);
        stmt.bind([days]);
        const result = [];
        while (stmt.step()) {
            result.push(stmt.getAsObject());
        }
        stmt.free();
        return result.reverse(); // Return in chronological order
    }

    getDashboardStats() {
        const stats = {};
        
        // Total pieces
        const totalPiecesStmt = this.db.prepare("SELECT COUNT(*) as count FROM piano_pieces");
        totalPiecesStmt.step();
        stats.totalPieces = totalPiecesStmt.getAsObject().count;
        totalPiecesStmt.free();
        
        // Training pieces
        const trainingPiecesStmt = this.db.prepare("SELECT COUNT(*) as count FROM piano_pieces WHERE status = 'In Training'");
        trainingPiecesStmt.step();
        stats.trainingPieces = trainingPiecesStmt.getAsObject().count;
        trainingPiecesStmt.free();
        
        // Repertoire pieces
        const repertoirePiecesStmt = this.db.prepare("SELECT COUNT(*) as count FROM piano_pieces WHERE status = 'Repertoire'");
        repertoirePiecesStmt.step();
        stats.repertoirePieces = repertoirePiecesStmt.getAsObject().count;
        repertoirePiecesStmt.free();
        
        // Total sessions
        const totalSessionsStmt = this.db.prepare("SELECT COUNT(*) as count FROM training_sessions");
        totalSessionsStmt.step();
        stats.totalSessions = totalSessionsStmt.getAsObject().count;
        totalSessionsStmt.free();
        
        return stats;
    }
}

// Global database instance
window.db = new DatabaseManager();
