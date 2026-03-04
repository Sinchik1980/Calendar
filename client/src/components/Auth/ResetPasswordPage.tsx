import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
import {
  AuthContainer, AuthCard, AuthTitle, AuthForm,
  AuthInput, AuthButton, AuthError, AuthSuccess,
} from './AuthStyles';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      setSuccess(res.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reset password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContainer>
      <AuthCard>
        <AuthTitle>Reset Password</AuthTitle>
        <AuthForm onSubmit={handleSubmit}>
          {error && <AuthError>{error}</AuthError>}
          {success && <AuthSuccess>{success}</AuthSuccess>}
          <AuthInput
            type="password"
            placeholder="New password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <AuthInput
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
          <AuthButton type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </AuthButton>
        </AuthForm>
      </AuthCard>
    </AuthContainer>
  );
};

export default ResetPasswordPage;
