# Food Bookmarking and Recommendation System

A minimal, Apple-style web application for searching, bookmarking, and discovering food recipes. This project features a React (Vite + TailwindCSS) frontend and a Python (Flask) backend, prepared for future integration with Machine Learning / Information Retrieval (IR) models.

## Project Structure
```text
food-ir-app/
├── backend/                  # Python Flask REST API
│   ├── app.py                # Main application entry point
│   ├── config/               # Database and environment configurations
│   ├── models/               # Data structures (e.g., Recipe model)
│   ├── routes/               # API endpoint definitions
│   └── services/             # Core logic (Search, CSV loaders)
└── frontend/                 # React Application (Vite + Tailwind v4)
    ├── src/
    │   ├── components/       # Reusable UI components
    │   ├── pages/            # Main views (Landing, Search)
    │   └── services/         # API integration logic
    └── package.json
```

## Prerequisites
- Node.js (v18+)
- Python (3.9+)

## Running the Backend

The backend is built with Python and Flask. It provides REST API endpoints to serve recipe data, search queries, and bookmarks.

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Flask server:
   ```bash
   python app.py
   ```
   *The server will start on `http://localhost:5000`.*

### Future IR Model Integration
When you are ready to implement the IR model:
- Replace the basic search in `backend/services/search_service.py` with your custom search engine logic.
- Replace the placeholder data in `backend/services/csv_loader.py` to properly ingest your actual `recipes dataset` CSV file.
- Update `backend/routes/recommendations.py` to use your personalized recommendation model instead of returning random recipes.

### Database Connection (Supabase)
Currently, data is held in-memory as a placeholder.
To connect to your Supabase PostgreSQL instance:
1. Update `backend/config/database.py` with your `SUPABASE_URL` and `SUPABASE_KEY`.
2. Connect the initialized `supabase client` to CRUD operations in `backend/routes/bookmarks.py` and `backend/routes/auth.py`.

---

## Running the Frontend

The frontend is a React application set up with Vite and styled using Tailwind CSS v4.

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The application will be accessible at `http://localhost:5173`.*

### Features
- **Clean UI**: Uses modern typography, rounded borders (`-3xl`), and soft shadows for a minimalist aesthetic.
- **Landing Page**: View random recommendations and your bookmarked items.
- **Search**: Enter queries in the search bar to find dishes via the `POST /api/search` backend endpoint.
- **Dish Details**: Click any recipe card to open a detailed modal with ingredients, steps, and a rating/bookmark button.
