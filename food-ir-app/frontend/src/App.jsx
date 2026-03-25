import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SearchPage from './pages/SearchPage';
import BookmarksPage from './pages/BookmarksPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/bookmarks/folder/:folderId" element={<BookmarksPage />} />
      </Routes>
    </Router>
  );
}

export default App;
