"""Employees router."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.schemas.guidelines import GuidelineResponse, GuidelineUpdate

from app.models.employee import Employee
from app.schemas.employees import EmployeeResponse
from app.routers.guidelines import get_guideline, update_guideline

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("/{employee_id}/guidelines", response_model=GuidelineResponse)
async def get_employee_guidelines(
    employee_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    # Wrapper endpoint for compatibility.
    # Delegates to the canonical guideline logic.
    return await get_guideline(
        employee_id=employee_id,
        db=db,
        context=context,
    )


@router.put("/{employee_id}/guidelines", response_model=GuidelineResponse)
async def update_employee_guidelines(
    employee_id: str,
    guideline_update: GuidelineUpdate,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    # Wrapper endpoint for compatibility.
    # Delegates to the canonical guideline logic.
    return await update_guideline(
        employee_id=employee_id,
        guideline_update=guideline_update,
        db=db,
        context=context,
    )


@router.get("", response_model=list[EmployeeResponse])
async def list_employees(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """List all employees."""
    # Demo: return mock employees
    employees = db.query(Employee).all()
    return employees


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """Get employee by ID."""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee
