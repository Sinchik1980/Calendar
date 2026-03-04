import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AuthContainer, AuthCard, AuthTitle, AuthForm,
  AuthInput, AuthButton, AuthLink, AuthError,
} from './AuthStyles';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContainer>
      <AuthCard>
        <AuthTitle>Sign In</AuthTitle>
        <AuthForm onSubmit={handleSubmit}>
          {error && <AuthError>{error}</AuthError>}
          <AuthInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <AuthInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <AuthButton type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </AuthButton>
          <AuthLink onClick={() => navigate('/register')}>
            Don't have an account? Sign Up
          </AuthLink>
          <AuthLink onClick={() => navigate('/forgot-password')}>
            Forgot Password?
          </AuthLink>
        </AuthForm>
      </AuthCard>
    </AuthContainer>
  );
};

export default LoginPage;
