import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS

from routes.search import search_bp
from routes.auth import auth_bp
from routes.folders import folders_bp
from routes.bookmarks import bookmarks_bp

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

    # app.register_blueprint(recommendations_bp, url_prefix='/api')
    
    @app.route('/api/health')
    def health_check():
        return {"status": "ok", "message": "Backend is running!"}

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get("PORT", 5002))
    app.run(host='0.0.0.0', port=port, debug=True)
