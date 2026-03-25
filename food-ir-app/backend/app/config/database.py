import os

def get_db_url():
    return os.environ.get("DATABASE_URL", "postgresql://admin:1234@localhost:5432/foodapp")
