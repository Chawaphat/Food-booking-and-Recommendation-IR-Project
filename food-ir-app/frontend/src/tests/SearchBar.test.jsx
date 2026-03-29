import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LandingPage from '../pages/LandingPage';
import { vi } from 'vitest';

// ── Mock the API so it doesn't fail on render
vi.mock('../services/api', () => ({
  getRecommendations: vi.fn().mockResolvedValue({
    for_you: [],
    from_folder: [],
    random: []
  })
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Provides auth context with different logged in states
const renderWithProviders = (ui, isLoggedIn = true) => {
  return render(
    <AuthContext.Provider value={{ isLoggedIn, user: isLoggedIn ? { username: 'testuser' } : null }}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('SearchBar (LandingPage - Unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Input renders correctly', async () => {
    renderWithProviders(<LandingPage />, true);
    // Find input by its placeholder text
    const searchInput = await screen.findByPlaceholderText(/Search for ingredients, dishes/i);
    expect(searchInput).toBeInTheDocument();
  });

  test('User can type text into search bar', async () => {
    renderWithProviders(<LandingPage />, true);
    const searchInput = await screen.findByPlaceholderText(/Search for ingredients, dishes/i);
    
    fireEvent.change(searchInput, { target: { value: 'pasta' } });
    expect(searchInput.value).toBe('pasta');
  });

  test('Search button triggers navigation handler', async () => {
    renderWithProviders(<LandingPage />, true);
    
    // Type a query
    const searchInput = await screen.findByPlaceholderText(/Search for ingredients, dishes/i);
    fireEvent.change(searchInput, { target: { value: 'chicken' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(submitBtn);

    // Expect navigation to search page with query parameter
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/search?q=chicken');
    });
  });
});
