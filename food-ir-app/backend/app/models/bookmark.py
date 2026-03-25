from config.extensions import db
from datetime import datetime

class Bookmark(db.Model):
    __tablename__ = 'bookmarks'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    recipe_id = db.Column(db.Integer, nullable=False)
    folder_id = db.Column(db.Integer, db.ForeignKey('folders.id', ondelete='CASCADE'), nullable=True)
    rating = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='bookmarks')
    folder = db.relationship('Folder', back_populates='bookmarks')
