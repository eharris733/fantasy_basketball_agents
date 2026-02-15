from fastapi import APIRouter, Query
from database import get_supabase
from models import PlayerResponse

router = APIRouter(tags=["players"])


@router.get("/players", response_model=list[PlayerResponse])
def list_players(
    search: str = Query("", description="Search by name"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    db = get_supabase()
    query = db.table("players").select("*")

    if search:
        query = query.or_(
            f"first_name.ilike.%{search}%,last_name.ilike.%{search}%"
        )

    result = (
        query
        .order("fantasy_points", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data
