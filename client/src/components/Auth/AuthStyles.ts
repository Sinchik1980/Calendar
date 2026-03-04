import styled from 'styled-components';

export const AuthContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

export const AuthCard = styled.div`
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
`;

export const AuthTitle = styled.h2`
  margin: 0 0 24px;
  text-align: center;
  color: #333;
`;

export const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const AuthInput = styled.input`
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #4285f4;
  }
`;

export const AuthButton = styled.button`
  padding: 10px;
  background: #4285f4;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: #3367d6;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

export const AuthLink = styled.a`
  color: #4285f4;
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
  text-align: center;

  &:hover {
    text-decoration: underline;
  }
`;

export const AuthError = styled.div`
  color: #d93025;
  font-size: 13px;
  text-align: center;
  padding: 8px;
  background: #fce4ec;
  border-radius: 4px;
`;

export const AuthSuccess = styled.div`
  color: #1b5e20;
  font-size: 13px;
  text-align: center;
  padding: 8px;
  background: #e8f5e9;
  border-radius: 4px;
`;
