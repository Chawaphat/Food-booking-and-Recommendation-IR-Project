import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import { vi } from 'vitest';

// Create mocks
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

// Mock useNavigate from react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithProviders = (ui, authValue) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('LoginPage Component (Unit)', () => {
  const authValue = {
    login: mockLogin,
    user: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders username and password inputs', () => {
    renderWithProviders(<LoginPage />, authValue);
    
    expect(screen.getByPlaceholderText(/Enter your username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  test('User can type text into inputs', () => {
    renderWithProviders(<LoginPage />, authValue);
    
    const usernameInput = screen.getByPlaceholderText(/Enter your username/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);

    fireEvent.change(usernameInput, { target: { value: 'alice' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });

    expect(usernameInput.value).toBe('alice');
    expect(passwordInput.value).toBe('secret123');
  });

  test('Submit button exists and triggers login handler', async () => {
    mockLogin.mockResolvedValueOnce(true);
    renderWithProviders(<LoginPage />, authValue);
    
    const usernameInput = screen.getByPlaceholderText(/Enter your username/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(usernameInput, { target: { value: 'alice' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('alice', 'secret123');
    });
  });
});
