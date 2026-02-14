"""
Create demo employee for Aaliyah integration testing
"""
import sys
sys.path.insert(0, 'd:/Zroky/apps/api')

from app.database import SessionLocal
from app.models.employee import Employee
from datetime import datetime

def create_demo_employee():
    db = SessionLocal()
    try:
        # Check if employee already exists
        existing = db.query(Employee).filter(Employee.id == "user_demo_001").first()
        if existing:
            print(f"✅ Employee already exists: {existing.id}")
            return existing
        
        # Create new employee
        employee = Employee(
            id="user_demo_001",
            workspace_id="default_workspace",
            user_id="rashmibeura171@gmail.com",
            role="ADMIN",
            created_at=datetime.utcnow()
        )
        
        db.add(employee)
        db.commit()
        db.refresh(employee)
        
        print(f"✅ Created employee: {employee.id} (workspace: {employee.workspace_id}, user: {employee.user_id})")
        return employee
        
    except Exception as e:
        print(f"❌ Error creating employee: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_demo_employee()
