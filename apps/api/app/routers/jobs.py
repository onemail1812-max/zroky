"""Jobs router."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import enforce_admin, CurrentContext
from app.models.job import Job

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("")
async def list_jobs(
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(enforce_admin),
):
    """List jobs."""
    jobs = db.query(Job).filter(Job.workspace_id == context.workspace_id).all()
    return [
        {
            "id": j.id,
            "type": j.type,
            "status": j.status,
            "attempts": j.attempts,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


@router.post("/run/{job_id}")
async def run_job_manual(
    job_id: str,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(enforce_admin),
):
    """Manually trigger job execution (dev only, stub implementation)."""
    job = db.query(Job).filter(Job.id == job_id, Job.workspace_id == context.workspace_id).first()
    if not job:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")

    # Stub: mark as done
    from app.models.job import JobStatus
    job.status = JobStatus.DONE
    db.commit()

    return {"message": "Job executed"}
