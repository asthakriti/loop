from fastapi import FastAPI

from app.routers import auth, badges, bank, my_problems, progress, settings, today

app = FastAPI(title="Loop", description="DSA prep app with round robin revision")

app.include_router(auth.router)
app.include_router(bank.router)
app.include_router(my_problems.router)
app.include_router(today.router)
app.include_router(settings.router)
app.include_router(progress.router)
app.include_router(badges.router)


@app.get("/health")
def health():
    return {"status": "ok"}
