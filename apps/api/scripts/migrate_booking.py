
from app.database import engine, Base
from app.models.booking_link import BookingLink

def migrate():
    print("Migrating BookingLink table...")
    Base.metadata.create_all(bind=engine)
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
