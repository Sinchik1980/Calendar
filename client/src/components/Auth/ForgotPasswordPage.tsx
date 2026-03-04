import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';
import {
  AuthContainer, AuthCard, AuthTitle, AuthForm,
  AuthInput, AuthButton, AuthLink, AuthError, AuthSuccess,
} from './AuthStyles';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSuccess(res.message);
    } catch {
      setError('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContainer>
      <AuthCard>
        <AuthTitle>Forgot Password</AuthTitle>
        <AuthForm onSubmit={handleSubmit}>
          {error && <AuthError>{error}</AuthError>}
          {success && <AuthSuccess>{success}</AuthSuccess>}
          <AuthInput
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <AuthButton type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </AuthButton>
          <AuthLink onClick={() => navigate('/login')}>
            Back to Sign In
          </AuthLink>
        </AuthForm>
      </AuthCard>
    </AuthContainer>
  );
};

export default ForgotPasswordPage;
