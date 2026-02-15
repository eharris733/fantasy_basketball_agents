from fastapi import APIRouter, HTTPException
from database import get_supabase
from models import UserCreate, UserResponse

router = APIRouter(tags=["users"])


@router.post("/users", response_model=UserResponse)
def create_user(body: UserCreate):
    db = get_supabase()
    result = db.table("users").insert({"username": body.username}).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")
    return result.data[0]


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str):
    db = get_supabase()
    result = db.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]
