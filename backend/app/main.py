from fastapi import FastAPI

app = FastAPI(title="Loop", description="DSA prep app with round robin revision")


@app.get("/health")
def health():
    return {"status": "ok"}
