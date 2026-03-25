from config.extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    folders = db.relationship('Folder', back_populates='user', lazy=True, cascade="all, delete-orphan")
    bookmarks = db.relationship('Bookmark', back_populates='user', lazy=True, cascade="all, delete-orphan")
