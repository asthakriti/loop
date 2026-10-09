from fastapi import FastAPI

from app.routers import auth, bank

app = FastAPI(title="Loop", description="DSA prep app with round robin revision")

app.include_router(auth.router)
app.include_router(bank.router)


@app.get("/health")
def health():
    return {"status": "ok"}
