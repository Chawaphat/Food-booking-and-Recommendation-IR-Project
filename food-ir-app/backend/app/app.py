import os
import sys
import threading

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS

from routes.search import search_bp
from routes.auth import auth_bp
from routes.folders import folders_bp
from routes.bookmarks import bookmarks_bp
from routes.recommendations import recommendations_bp
from routes.folder_recommend import folder_recommend_bp
from routes.trending import trending_bp
from routes.similar import similar_bp

from config.extensions import db
from config.database import get_db_url
from models.user import User

def create_app():
    app = Flask(__name__)
    
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})
    
    # Configure Database
    app.config['SQLALCHEMY_DATABASE_URI'] = get_db_url()
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)

    with app.app_context():
        db.create_all()
        # Seed mock user if not exists
        if not User.query.filter_by(id=1).first():
            mock_user = User(username="mock_user", password_hash="mock_hash")
            db.session.add(mock_user)
            db.session.commit()
    
    # Register blueprints
    app.register_blueprint(search_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(folders_bp, url_prefix='/api/folders')
    app.register_blueprint(bookmarks_bp, url_prefix='/api/bookmarks')
    app.register_blueprint(recommendations_bp, url_prefix='/api')
    app.register_blueprint(folder_recommend_bp, url_prefix='/api')
    app.register_blueprint(trending_bp, url_prefix='/api')
    app.register_blueprint(similar_bp, url_prefix='/api')

    # Pre-warm heavy services in a background thread so they are ready
    # before the first request arrives.
    def _warm_services():
        try:
            from services.image_fallback_service import image_fallback_service
            image_fallback_service._load_tfidf()
        except Exception as e:
            print(f"[app] Image fallback warm-up failed: {e}")
        try:
            from services.vector_service import vector_service
            vector_service.load()
        except Exception as e:
            print(f"[app] Vector service warm-up failed: {e}")
        try:
            from services.trending_service import trending_service
            trending_service.load()
        except Exception as e:
            print(f"[app] Trending service warm-up failed: {e}")
        try:
            from services.similar_service import similar_service
            similar_service.load()
        except Exception as e:
            print(f"[app] Similar service warm-up failed: {e}")

    t = threading.Thread(target=_warm_services, daemon=True, name="service-warmup")
    t.start()

    @app.route('/api/health')
    def health_check():
        return {"status": "ok", "message": "Backend is running!"}

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get("PORT", 5002))
    app.run(host='0.0.0.0', port=port, debug=True)
