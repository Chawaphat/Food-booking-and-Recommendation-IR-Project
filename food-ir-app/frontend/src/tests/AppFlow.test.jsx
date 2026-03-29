import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import LandingPage from '../pages/LandingPage';
import { vi } from 'vitest';

// ── Mock Services ────────────────────────────────────────────────────────────
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../services/api', () => ({
  getRecommendations: vi.fn().mockResolvedValue({ for_you: [], from_folder: [], random: [] }),
  searchRecipes: vi.fn().mockResolvedValue([]),
}));

// Provide window.alert mock for flow 3
const originalAlert = window.alert;
beforeAll(() => {
  window.alert = vi.fn();
});
afterAll(() => {
  window.alert = originalAlert;
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

describe('Application User Flows (Integration)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 1: Login -> Redirect
  // ─────────────────────────────────────────────────────────────────────────────
  test('Flow 1: User logs in successfully and redirects to home', async () => {
    const authValue = { login: mockLogin, user: null, isLoggedIn: false };
    mockLogin.mockResolvedValueOnce(true);

    renderWithProviders(<LoginPage />, authValue);

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Enter your username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), { target: { value: 'password123' } });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    // Expect navigation to home page
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 2: Search Interaction
  // ─────────────────────────────────────────────────────────────────────────────
  test('Flow 2: Authenticated user searches and navigates to results', async () => {
    const authValue = { login: mockLogin, user: { username: 'testuser' }, isLoggedIn: true };
    renderWithProviders(<LandingPage />, authValue);

    // Type query
    const searchInput = await screen.findByPlaceholderText(/Search for ingredients, dishes/i);
    fireEvent.change(searchInput, { target: { value: 'chicken' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    // Expect correct navigate routing triggered instead of doing API calls here directly
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/search?q=chicken');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Flow 3: Protected UI (Unauthenticated Search Attempt)
  // ─────────────────────────────────────────────────────────────────────────────
  test('Flow 3: Unauthenticated user is blocked from searching and redirected', async () => {
    const authValue = { login: vi.fn(), user: null, isLoggedIn: false };
    renderWithProviders(<LandingPage />, authValue);

    // Should say sign in placeholder
    const searchInput = await screen.findByPlaceholderText(/Sign in to search recipes/i);
    
    // Try typing
    fireEvent.change(searchInput, { target: { value: 'beef' } });
    
    // Try submitting
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));

    // Expect alert and redirect to login
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Please login first to use search.');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

});
