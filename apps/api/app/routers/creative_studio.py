from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import json

from app.database import get_db
from app.dependencies import get_current_context, CurrentContext
from app.models.artifact import Artifact, ArtifactType, ArtifactStatus
from app.schemas.creative_studio import FluxGenerateRequest, FluxGenerateResponse
from app.providers.openrouter import OpenRouterClient

router = APIRouter(prefix="/creative-studio", tags=["creative-studio"])


@router.post("/flux/generate", response_model=FluxGenerateResponse)
async def flux_generate(
    req: FluxGenerateRequest,
    db: Session = Depends(get_db),
    context: CurrentContext = Depends(get_current_context),
):
    """
    Creative Studio -> FLUX image generation:
    - Calls OpenRouter FLUX image model
    - Stores result as an Artifact (draft)
    - Returns artifact_id + base64 image URLs for immediate UI render
    """
    try:
        client = OpenRouterClient()
        result = await client.generate_image_flux(
            prompt=req.prompt,
            aspect_ratio=req.aspect_ratio,
            max_images=req.n_images,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Image generation failed: {str(e)}")

    artifact_payload = {
        "kind": "creative_studio_image",
        "provider": "openrouter",
        "model": "flux",
        "prompt": req.prompt,
        "aspect_ratio": req.aspect_ratio,
        "images": [{"data_url": u} for u in result.images],
        "assistant_text": result.text,
    }

    artifact = Artifact(
        id=str(uuid.uuid4()),
        workspace_id=context.workspace_id,
        employee_id=req.employee_id,
        thread_id=req.thread_id,
        type=ArtifactType.SOCIAL_POST,
        status=ArtifactStatus.DRAFT,
        title=req.title or "Creative Studio Image",
        content_json=json.dumps(artifact_payload),
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)

    # Audit (existing pattern)
    from app.services.audit_log_service import AuditLogService, AuditAction, AuditEntityType

    AuditLogService.log_creation(
        db=db,
        workspace_id=context.workspace_id,
        user_id=context.user_id,
        entity_type=AuditEntityType.ARTIFACT,
        entity_id=artifact.id,
        initial_values={"type": artifact.type, "title": artifact.title},
    )

    return FluxGenerateResponse(artifact_id=artifact.id, images=result.images)
