from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings as config
from app.routers import auth, badges, bank, byte, my_problems, patterns, progress, settings, stats, today

app = FastAPI(title="Loop", description="DSA prep app with round robin revision")

# Let the React app (another address) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in config.cors_origins.split(",") if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(bank.router)
app.include_router(my_problems.router)
app.include_router(today.router)
app.include_router(settings.router)
app.include_router(progress.router)
app.include_router(badges.router)
app.include_router(byte.router)
app.include_router(patterns.router)
app.include_router(stats.router)


@app.get("/health")
def health():
    return {"status": "ok"}
