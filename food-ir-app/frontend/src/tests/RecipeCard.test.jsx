import { render, screen, fireEvent } from '@testing-library/react';
import RecipeCard from '../components/RecipeCard';
import { BookmarkContext } from '../context/BookmarkContext';

// Basic recipe data mock
const mockRecipe = {
  id: 1,
  name: 'Test Chicken Soup',
  image: 'https://example.com/soup.jpg',
  avg_rating: 4.5,
  review_count: 100
};

// Mock the global bookmark context logic
const mockBookmarkValue = {
  isRecipeBookmarked: vi.fn(),
  getBookmarkInfo: vi.fn().mockReturnValue(null),
  refreshBookmarks: vi.fn()
};

const renderWithProviders = (ui) => {
  return render(
    <BookmarkContext.Provider value={mockBookmarkValue}>
      {ui}
    </BookmarkContext.Provider>
  );
};

describe('RecipeCard Component (Unit)', () => {
  const handleClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Displays recipe name correctly', () => {
    renderWithProviders(<RecipeCard recipe={mockRecipe} onClick={handleClick} />);
    expect(screen.getByText('Test Chicken Soup')).toBeInTheDocument();
  });

  test('Displays the recipe image', () => {
    renderWithProviders(<RecipeCard recipe={mockRecipe} onClick={handleClick} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', mockRecipe.image);
    expect(image).toHaveAttribute('alt', mockRecipe.name);
  });

  test('Clicking the card calls onClick handler', () => {
    renderWithProviders(<RecipeCard recipe={mockRecipe} onClick={handleClick} />);
    
    // We click the card itself which acts as a button or clickable div
    const cardElement = screen.getByText('Test Chicken Soup').closest('div.group');
    fireEvent.click(cardElement);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockRecipe);
  });
});
