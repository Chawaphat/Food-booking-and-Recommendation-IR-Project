from config.extensions import db
from datetime import datetime

class Folder(db.Model):
    __tablename__ = 'folders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='folders')
    bookmarks = db.relationship('Bookmark', back_populates='folder', lazy=True, cascade="all, delete-orphan")
