import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Shield, CheckCircle, AlertCircle, Lock } from 'lucide-react';

const ActionHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const mode = searchParams.get('mode');
    const actionCode = searchParams.get('oobCode');
    const continueUrl = searchParams.get('continueUrl');

    const [verifiedEmail, setVerifiedEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('loading'); // loading, success, error, input
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!actionCode) {
            setStatus('error');
            setMessage('Invalid link. No action code found.');
            return;
        }

        switch (mode) {
            case 'resetPassword':
                handleResetPasswordInit(actionCode);
                break;
            case 'recoverEmail':
                handleRecoverEmail(actionCode);
                break;
            case 'verifyEmail':
                handleVerifyEmail(actionCode);
                break;
            default:
                setStatus('error');
                setMessage('Invalid mode.');
        }
    }, [actionCode, mode]);

    const handleResetPasswordInit = async (code) => {
        try {
            const email = await verifyPasswordResetCode(auth, code);
            setVerifiedEmail(email);
            setStatus('input'); // Ready for user input
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        try {
            await confirmPasswordReset(auth, actionCode, newPassword);
            setStatus('success');
            setMessage('Password has been reset successfully! You can now login with your new password.');
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    const handleVerifyEmail = async (code) => {
        try {
            await applyActionCode(auth, code);
            setStatus('success');
            setMessage('Email verified successfully! You can now access all features.');
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    const handleRecoverEmail = async (code) => {
        try {
            await applyActionCode(auth, code);
            setStatus('success');
            setMessage('Email restoration successful. Please reset your password immediately for security.');
        } catch (error) {
            setStatus('error');
            setMessage(error.message);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-blue"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-black relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/20 rounded-full blur-[100px]" />
            </div>

            <Card className="w-full max-w-md p-8 border-white/10 bg-black/80 backdrop-blur-xl relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="text-center mb-8">
                    {status === 'success' ? (
                        <div className="mx-auto w-16 h-16 bg-neon-green/20 rounded-full flex items-center justify-center mb-4 border border-neon-green/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                            <CheckCircle size={32} className="text-neon-green" />
                        </div>
                    ) : status === 'error' ? (
                        <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                            <AlertCircle size={32} className="text-red-500" />
                        </div>
                    ) : (
                        <div className="mx-auto w-16 h-16 bg-neon-blue/20 rounded-full flex items-center justify-center mb-4 border border-neon-blue/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                            <Shield size={32} className="text-neon-blue" />
                        </div>
                    )}

                    <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
                        {mode === 'resetPassword' ? 'Reset Password' :
                            mode === 'verifyEmail' ? 'Verify Email' :
                                mode === 'recoverEmail' ? 'Restore Email' : 'Authentication'}
                    </h1>

                    {(status === 'success' || status === 'error') && (
                        <p className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                            {message}
                        </p>
                    )}
                </div>

                {status === 'input' && mode === 'resetPassword' && (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-6">
                            <p className="text-sm text-gray-400 mb-1">Resetting password for:</p>
                            <p className="font-bold text-white tracking-wide">{verifiedEmail}</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">New Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="pl-10"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Confirm Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <Input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="pl-10"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <Button type="submit" variant="primary" className="w-full mt-6 h-12 text-sm tracking-widest font-black uppercase shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] transition-all">
                            Save New Password
                        </Button>
                    </form>
                )}

                {(status === 'success' || status === 'error') && (
                    <Button
                        onClick={() => navigate('/admin')}
                        variant="outline"
                        className="w-full mt-6 border-white/20 hover:bg-white hover:text-black transition-colors"
                    >
                        Return to Login
                    </Button>
                )}
            </Card>
        </div>
    );
};

export default ActionHandler;
