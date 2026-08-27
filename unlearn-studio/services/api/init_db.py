"""
Database initialization script for NullMind.

Creates all tables and seeds initial data.
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from services.api.models import Base, Target


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://unlearn:unlearn@localhost:5432/nullmind"
)


def init_database():
    """Initialize the database schema."""
    engine = create_engine(DATABASE_URL)
    
    print("Creating database tables...")
    Base.metadata.create_all(engine)
    print("Tables created successfully.")
    
    # Seed initial data
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Add default targets
        default_targets = [
            Target(
                name="python",
                display_name="Python",
                description="Python programming language",
                category="programming",
                language="python",
            ),
            Target(
                name="javascript",
                display_name="JavaScript",
                description="JavaScript programming language",
                category="programming",
                language="javascript",
            ),
            Target(
                name="typescript",
                display_name="TypeScript",
                description="TypeScript programming language",
                category="programming",
                language="typescript",
            ),
            Target(
                name="cpp",
                display_name="C++",
                description="C++ programming language",
                category="programming",
                language="cpp",
            ),
            Target(
                name="rust",
                display_name="Rust",
                description="Rust programming language",
                category="programming",
                language="rust",
            ),
        ]
        
        for target in default_targets:
            existing = session.query(Target).filter_by(name=target.name).first()
            if not existing:
                session.add(target)
                print(f"  Added target: {target.display_name}")
        
        session.commit()
        print("Database initialized successfully.")
        
    except Exception as e:
        session.rollback()
        print(f"Error initializing database: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    init_database()
