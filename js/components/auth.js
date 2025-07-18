// Authentication component
class Auth {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    // Show login form
    showLoginForm() {
        const content = `
            <div class="auth-container">
                <div class="auth-header">
                    <h2>Welcome to Con Bravura</h2>
                    <p>Please sign in to access your practice journal</p>
                </div>
                <form id="login-form" class="auth-form">
                    <div class="form-group">
                        <label for="login-username">Username or Email</label>
                        <input type="text" id="login-username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" name="password" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Sign In</button>
                        <button type="button" onclick="auth.showRegisterForm()" class="btn btn-secondary">Create Account</button>
                    </div>
                </form>
                <div class="auth-demo">
                    <p>Demo Account:</p>
                    <p><strong>Username:</strong> demo_user</p>
                    <p><strong>Password:</strong> DemoPassword123!</p>
                    <button onclick="auth.loginDemo()" class="btn btn-outline">Use Demo Account</button>
                </div>
            </div>
        `;

        this.showAuthModal('Sign In', content);
        this.bindLoginForm();
    }

    // Show register form
    showRegisterForm() {
        const content = `
            <div class="auth-container">
                <div class="auth-header">
                    <h2>Create Account</h2>
                    <p>Join Con Bravura to start tracking your practice</p>
                </div>
                <form id="register-form" class="auth-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="register-firstname">First Name</label>
                            <input type="text" id="register-firstname" name="firstName">
                        </div>
                        <div class="form-group">
                            <label for="register-lastname">Last Name</label>
                            <input type="text" id="register-lastname" name="lastName">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="register-username">Username *</label>
                        <input type="text" id="register-username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="register-email">Email *</label>
                        <input type="email" id="register-email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="register-password">Password *</label>
                        <input type="password" id="register-password" name="password" required>
                        <small>Must be at least 8 characters with uppercase, lowercase, and number</small>
                    </div>
                    <div class="form-group">
                        <label for="register-confirm-password">Confirm Password *</label>
                        <input type="password" id="register-confirm-password" name="confirmPassword" required>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Create Account</button>
                        <button type="button" onclick="auth.showLoginForm()" class="btn btn-secondary">Back to Sign In</button>
                    </div>
                </form>
            </div>
        `;

        this.showAuthModal('Create Account', content);
        this.bindRegisterForm();
    }

    // Show authentication modal
    showAuthModal(title, content) {
        const modalHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="auth.hideAuthModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;

        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = modalHTML;
        modalContainer.classList.remove('hidden');
        
        // Add auth-specific styling
        modalContainer.classList.add('auth-modal');
    }

    // Hide authentication modal
    hideAuthModal() {
        const modalContainer = document.getElementById('modal-container');
        modalContainer.classList.add('hidden');
        modalContainer.classList.remove('auth-modal');
        modalContainer.innerHTML = '';
    }

    // Bind login form events
    bindLoginForm() {
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin(e);
            });
        }
    }

    // Bind register form events
    bindRegisterForm() {
        const form = document.getElementById('register-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister(e);
            });
        }
    }

    // Handle login
    async handleLogin(e) {
        try {
            const formData = new FormData(e.target);
            const credentials = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            this.showLoading('Signing in...');
            
            const response = await window.db.login(credentials);
            this.currentUser = response.user;
            this.isAuthenticated = true;

            this.hideAuthModal();
            this.showSuccess('Welcome back!');
            
            // Initialize the main application
            await window.app.initialize();
            
        } catch (error) {
            console.error('Login failed:', error);
            this.showError('Login failed: ' + error.message);
        }
    }

    // Handle registration
    async handleRegister(e) {
        try {
            const formData = new FormData(e.target);
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');

            if (password !== confirmPassword) {
                this.showError('Passwords do not match');
                return;
            }

            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: password,
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName')
            };

            this.showLoading('Creating account...');
            
            const response = await window.db.register(userData);
            this.currentUser = response.user;
            this.isAuthenticated = true;

            this.hideAuthModal();
            this.showSuccess('Account created successfully!');
            
            // Initialize the main application
            await window.app.initialize();
            
        } catch (error) {
            console.error('Registration failed:', error);
            this.showError('Registration failed: ' + error.message);
        }
    }

    // Demo login
    async loginDemo() {
        try {
            const credentials = {
                username: 'demo_user',
                password: 'DemoPassword123!'
            };

            this.showLoading('Signing in with demo account...');
            
            const response = await window.db.login(credentials);
            this.currentUser = response.user;
            this.isAuthenticated = true;

            this.hideAuthModal();
            this.showSuccess('Welcome to the demo!');
            
            // Initialize the main application
            await window.app.initialize();
            
        } catch (error) {
            console.error('Demo login failed:', error);
            this.showError('Demo login failed: ' + error.message);
        }
    }

    // Logout
    async logout() {
        try {
            await window.db.logout();
            this.currentUser = null;
            this.isAuthenticated = false;
            
            // Redirect to login
            this.showLoginForm();
            
        } catch (error) {
            console.error('Logout failed:', error);
            this.showError('Logout failed: ' + error.message);
        }
    }

    // Check if user is authenticated
    checkAuth() {
        return window.db.isAuthenticated();
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Show loading state
    showLoading(message) {
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="auth-loading">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // Show error message
    showError(message) {
        const existingError = document.querySelector('.auth-error');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.innerHTML = `
            <p>${message}</p>
            <button onclick="this.parentElement.remove()" class="btn btn-sm">Dismiss</button>
        `;

        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.insertBefore(errorDiv, authContainer.firstChild);
        }
    }

    // Show success message
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'auth-success';
        successDiv.innerHTML = `<p>${message}</p>`;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    // Initialize authentication
    async initialize() {
        if (this.checkAuth()) {
            try {
                const profile = await window.db.getProfile();
                this.currentUser = profile.user;
                this.isAuthenticated = true;
                return true;
            } catch (error) {
                console.error('Failed to get user profile:', error);
                this.currentUser = null;
                this.isAuthenticated = false;
                return false;
            }
        }
        return false;
    }
}

// Global auth instance
window.auth = new Auth();