from fastapi import APIRouter, HTTPException
from database import get_supabase
from models import BotCreate, BotUpdate, BotResponse

router = APIRouter(tags=["bots"])


@router.post("/bots", response_model=BotResponse)
def create_bot(body: BotCreate):
    db = get_supabase()
    result = (
        db.table("bots")
        .insert(
            {
                "user_id": body.user_id,
                "name": body.name,
                "strategy_prompt": body.strategy_prompt,
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create bot")
    return result.data[0]


@router.get("/bots/user/{user_id}", response_model=list[BotResponse])
def get_user_bots(user_id: str):
    db = get_supabase()
    result = (
        db.table("bots")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


@router.put("/bots/{bot_id}", response_model=BotResponse)
def update_bot(bot_id: str, body: BotUpdate):
    db = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = "now()"
    result = db.table("bots").update(updates).eq("id", bot_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Bot not found")
    return result.data[0]


@router.delete("/bots/{bot_id}")
def delete_bot(bot_id: str):
    db = get_supabase()
    db.table("bots").delete().eq("id", bot_id).execute()
    return {"ok": True}
