import os
from flask import Flask
from flask_cors import CORS

from routes.search import search_bp
from routes.recipes import recipes_bp
# from routes.auth import auth_bp
from routes.bookmarks import bookmarks_bp
from routes.recommendations import recommend_bp

def create_app():
    app = Flask(__name__)
    
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})
    
    # Register blueprints
    app.register_blueprint(search_bp, url_prefix='/api/search')
    # app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(bookmarks_bp, url_prefix='/api')
    app.register_blueprint(recipes_bp, url_prefix="/api")
    app.register_blueprint(recommend_bp, url_prefix="/api")

    # app.register_blueprint(recommendations_bp, url_prefix='/api')
    
    @app.route('/api/health')
    def health_check():
        return {"status": "ok", "message": "Backend is running!"}

    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
