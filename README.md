# Food Booking and Recommendation Engine (IR Project)

An advanced search and recommendation engine for food recipes utilizing Elasticsearch, TF-IDF, and BM25 ranking algorithms.

## 📌 Prerequisites

Before running the application, make sure you have the following installed:

- **Python** (v3.9+)
- **Node.js** (v16+)
- **Elasticsearch** (Running natively or via Docker on port `9200`)
- **PostgreSQL** (Running on port `5432`, Database: `foodapp`, Username: `admin`, Password: `1234`)

---

## 🚀 Setup Instructions

### Step 1: Download Raw Dataset

Due to file size constraints, please manually acquire the raw data.

1. Download the dataset from Kaggle _(Insert Kaggle link here if applicable)_.
2. Place the `recipes.csv` and `reviews.csv` files inside the `food-ir-app/backend/data/raw/` directory (Create the folder if it does not exist).

### Step 2: Automated Preparation (.ipynb)

We have provided a Jupyter Notebook to automate everything from dependency installation to Elasticsearch indexing.

- Open **`setup.ipynb`** in the root directory via VS Code or Jupyter Server.
- Run all cells sequentially. _(Ensure your Elasticsearch is running before hitting the index-building cells)._

---

## 💻 Running the Application

Once setup is complete, you can launch the servers.

### Start the Backend (API Server)

Open a terminal in the `food-ir-app/backend/` directory:

```bash
export FLASK_APP=app/app.py
flask run
```

_The API will be available at `http://localhost:5000` (or `5002` depending on your active config)._

### Start the Frontend

Open a **new** terminal in the `food-ir-app/frontend/` directory:

```bash
npm install
npm run dev
```

_The web interface will be accessible via Vite (typically `http://localhost:5173`)._
