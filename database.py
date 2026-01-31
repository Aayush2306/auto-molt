from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./openclaw_platform.db")

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Deployment(Base):
    __tablename__ = "deployments"
    
    id = Column(Integer, primary_key=True, index=True)
    deployment_id = Column(String(12), unique=True, index=True, nullable=False)
    status = Column(String(50), nullable=False, default='pending')
    
    # User info
    user_email = Column(String(255), nullable=True)
    anthropic_key_masked = Column(String(50), nullable=False)
    
    # Droplet info
    droplet_id = Column(Integer, nullable=True)
    droplet_region = Column(String(20), nullable=False)
    ip_address = Column(String(45), nullable=True)
    dashboard_url = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "deployment_id": self.deployment_id,
            "status": self.status,
            "user_email": self.user_email,
            "droplet_id": self.droplet_id,
            "droplet_region": self.droplet_region,
            "ip_address": self.ip_address,
            "dashboard_url": self.dashboard_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error_message": self.error_message
        }


# Create tables
def init_db():
    Base.metadata.create_all(bind=engine)


# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
