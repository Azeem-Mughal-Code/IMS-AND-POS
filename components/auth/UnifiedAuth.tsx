
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserIcon, SearchIcon, ShieldCheckIcon, CheckCircleIcon, ClipboardIcon, TagIcon } from '../Icons';
import { Modal } from '../common/Modal';

export const UnifiedAuth: React.FC = () => {
    const { login, loginByEmail, registerBusiness, enterGuestMode, resetPassword } = useAuth();
    const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
    
    // Login State
    const [loginIdentifier, setLoginIdentifier] = useState(''); // Can be storeCode or email
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Register State
    const [regBusinessName, setRegBusinessName] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    
    // Recovery State
    const [recEmail, setRecEmail] = useState('');
    const [recKey, setRecKey] = useState('');
    const [recNewPassword, setRecNewPassword] = useState('');

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
    const [recoveryKey, setRecoveryKey] = useState('');
    const [registeredStoreCode, setRegisteredStoreCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [copiedStoreCode, setCopiedStoreCode] = useState(false);
    const [isSavedConfirmed, setIsSavedConfirmed] = useState(false);

    // Determine if loginIdentifier looks like an email
    const isLoginEmail = loginIdentifier.includes('@');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (mode === 'login') {
            if (isLoginEmail) {
                // Login by Email
                const result = await loginByEmail(loginIdentifier, password);
                if (!result.success) {
                    setError(result.message || 'Login failed.');
                }
            } else {
                // Login by Store Code + Username
                const result = await login(loginIdentifier, username, password);
                if (!result.success) {
                    setError(result.message || 'Login failed.');
                }
            }
        } else if (mode === 'register') {
            if (regPassword.length < 4) {
                setError("Password must be at least 4 characters.");
                return;
            }
            const result = await registerBusiness(regBusinessName, regUsername, regEmail, regPassword);
            if (result.success) {
                if (result.recoveryKey && result.storeCode) {
                    setRecoveryKey(result.recoveryKey);
                    setRegisteredStoreCode(result.storeCode);
                    setIsSavedConfirmed(false);
                    setIsRecoveryModalOpen(true);
                }
            } else {
                setError(result.message || 'Registration failed.');
            }
        } else if (mode === 'recovery') {
            if (recNewPassword.length < 4) {
                setError("New Password must be at least 4 characters.");
                return;
            }
            const result = await resetPassword(recEmail, recKey, recNewPassword);
            if (result.success) {
                setSuccessMessage("Password reset successfully! Redirecting to login...");
                setTimeout(() => {
                    setMode('login');
                    setSuccessMessage('');
                    // Optional: pre-fill login fields?
                    setLoginIdentifier(recEmail); // Since we just used email, might be handy
                }, 2000);
            } else {
                setError(result.message || 'Recovery failed.');
            }
        }
    };

    const handleRegistrationSuccess = async () => {
        setIsRecoveryModalOpen(false);
        // Auto login using the registration credentials
        // Prefer Store Code login for fresh registration stability
        const result = await login(registeredStoreCode, regUsername, regPassword);
        if (!result.success) {
            setError(result.message || 'Login failed after registration.');
        }
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(recoveryKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyStoreCode = () => {
        navigator.clipboard.writeText(registeredStoreCode);
        setCopiedStoreCode(true);
        setTimeout(() => setCopiedStoreCode(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4 transition-colors duration-300">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-2">
                    IMS & POS
                </h1>
                <p className="text-gray-600 dark:text-gray-300 font-medium">Retail Management System</p>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl rounded-2xl overflow-hidden">
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button 
                        onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}
                        className={`flex-1 py-4 text-sm font-semibold transition-all ${
                            mode === 'login' 
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => { setMode('register'); setError(''); setSuccessMessage(''); }}
                        className={`flex-1 py-4 text-sm font-semibold transition-all ${
                            mode === 'register' 
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        Register
                    </button>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {mode === 'login' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store Code or Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <SearchIcon />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={loginIdentifier} 
                                            onChange={e => setLoginIdentifier(e.target.value)} 
                                            required 
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400"
                                            placeholder="WS-XXXXXX or email@example.com"
                                        />
                                    </div>
                                </div>
                                
                                {!isLoginEmail && (
                                    <div className="animate-fadeIn">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                        <input 
                                            type="text" 
                                            value={username} 
                                            onChange={e => setUsername(e.target.value)} 
                                            required={!isLoginEmail}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="username"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                    />
                                    <div className="text-right mt-1">
                                        <button 
                                            type="button"
                                            onClick={() => { setMode('recovery'); setError(''); setSuccessMessage(''); }}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {mode === 'register' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                                    <input 
                                        type="text" 
                                        value={regBusinessName} 
                                        onChange={e => setRegBusinessName(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="My Shop"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner Email</label>
                                    <input 
                                        type="email" 
                                        value={regEmail} 
                                        onChange={e => setRegEmail(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner Username</label>
                                    <input 
                                        type="text" 
                                        value={regUsername} 
                                        onChange={e => setRegUsername(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="admin"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                    <input 
                                        type="password" 
                                        value={regPassword} 
                                        onChange={e => setRegPassword(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </>
                        )}

                        {mode === 'recovery' && (
                            <div className="space-y-4">
                                <div className="text-sm text-gray-600 dark:text-gray-300 mb-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">Admin Account Recovery</p>
                                    <p>This feature is for <strong>Administrators</strong> only. Cashiers must contact their manager to reset passwords.</p>
                                </div>
                                
                                <div className="text-sm text-red-600 dark:text-red-400 mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                                    <p className="font-bold">⚠️ Warning: Data Integrity</p>
                                    <p>Using the wrong Recovery Key will result in <strong>garbled or encrypted data</strong> upon login.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        value={recEmail} 
                                        onChange={e => setRecEmail(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recovery Key</label>
                                    <textarea 
                                        value={recKey} 
                                        onChange={e => setRecKey(e.target.value)} 
                                        required 
                                        rows={3}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-xs"
                                        placeholder="Paste your long base64 recovery key string here..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                                    <input 
                                        type="password" 
                                        value={recNewPassword} 
                                        onChange={e => setRecNewPassword(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="New Password"
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => { setMode('login'); setError(''); }}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline w-full text-center mt-2"
                                >
                                    Back to Login
                                </button>
                            </div>
                        )}

                        {error && <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-md">{error}</p>}
                        {successMessage && <p className="text-green-500 text-sm text-center bg-green-50 dark:bg-green-900/20 p-2 rounded-md">{successMessage}</p>}
                        
                        <button 
                            type="submit" 
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                            {mode === 'login' ? 'Log In' : mode === 'register' ? 'Create Business' : 'Reset Password'}
                        </button>
                    </form>
                </div>
            </div>

            {mode === 'login' && (
                <div className="mt-8 flex flex-col items-center">
                    <button
                        onClick={enterGuestMode}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-lg transition-all duration-200 group"
                    >
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                            <UserIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">Try Demo Mode</span>
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Note: Data in demo mode is stored locally and will be lost upon logout.
                    </p>
                </div>
            )}

            <Modal isOpen={isRecoveryModalOpen} onClose={handleRegistrationSuccess} title="Registration Successful!" size="lg">
                <div className="space-y-6">
                    
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-5 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2 text-blue-800 dark:text-blue-200">
                            <TagIcon className="w-5 h-5" />
                            <h3 className="font-semibold uppercase tracking-wider text-xs">Your Store Code</h3>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <p className="text-3xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-tight select-all">
                                {registeredStoreCode}
                            </p>
                            <button 
                                onClick={handleCopyStoreCode}
                                className="p-2 bg-white dark:bg-blue-900/50 rounded-full shadow-sm hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors text-blue-600 dark:text-blue-300"
                                title="Copy Store Code"
                            >
                                {copiedStoreCode ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                            You can log in using this code + username, OR using your email.
                        </p>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
                        <div className="flex items-start gap-3 mb-3">
                            <ShieldCheckIcon className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-red-800 dark:text-red-200">Save Your Recovery Key</h3>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                    This key is the <strong>ONLY</strong> way to restore your data if you forget your password. We cannot recover it for you.
                                </p>
                            </div>
                        </div>
                        
                        <div className="relative">
                            <textarea 
                                readOnly
                                value={recoveryKey} 
                                className="w-full h-24 p-3 rounded-md bg-white dark:bg-gray-800 font-mono text-xs text-gray-800 dark:text-gray-200 break-all border border-red-200 dark:border-red-800 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <button 
                                onClick={handleCopyKey}
                                className="absolute top-2 right-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-md shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
                                title="Copy to Clipboard"
                            >
                                {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-semibold text-center">
                            ⚠️ Do not share this key with anyone. Store it in a secure location.
                        </div>
                    </div>

                    <label className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 cursor-pointer select-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                        <input 
                            type="checkbox" 
                            checked={isSavedConfirmed} 
                            onChange={(e) => setIsSavedConfirmed(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            I have saved my Store Code and Recovery Key.
                        </span>
                    </label>

                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={handleRegistrationSuccess} 
                            disabled={!isSavedConfirmed}
                            className={`w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg transition-all duration-200 ${!isSavedConfirmed ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-blue-700 hover:scale-[1.02]'}`}
                        >
                            Continue to App
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
