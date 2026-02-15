from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, bots, games, leaderboard, players

app = FastAPI(title="Fantasy Basketball Bidding API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(bots.router, prefix="/api")
app.include_router(games.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")
app.include_router(players.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
