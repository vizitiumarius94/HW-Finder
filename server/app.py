import os
import json
import time
from typing import Optional, List

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import jwt  # PyJWT
from jwt.algorithms import RSAAlgorithm


app = FastAPI(title="HW Finder Admin API")

# Allow local dev + same-origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PORT = int(os.getenv("PORT", "8000"))

GITHUB_APP_ID = os.getenv("GITHUB_APP_ID")
GITHUB_INSTALLATION_ID = os.getenv("GITHUB_INSTALLATION_ID")
GITHUB_REPO = os.getenv("GITHUB_REPO")  # owner/repo
GITHUB_APP_PRIVATE_KEY = os.getenv("GITHUB_APP_PRIVATE_KEY")

ALLOWED_PATHS = [p.strip() for p in os.getenv("ALLOWED_PATHS", "data.json").split(",") if p.strip()]

if not all([GITHUB_APP_ID, GITHUB_INSTALLATION_ID, GITHUB_REPO, GITHUB_APP_PRIVATE_KEY]):
    # Fail fast at runtime when endpoints are hit
    pass


class UpdateCarPayload(BaseModel):
    # Full updated data.json payload
    data_json: dict


def github_headers(token: str):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }


def create_jwt_app() -> str:
    # Create JWT for GitHub App authentication
    app_id = int(GITHUB_APP_ID)
    now = int(time.time())
    payload = {
        "iat": now - 60,
        "exp": now + (10 * 60),
        "iss": app_id,
    }
    return jwt.encode(payload, GITHUB_APP_PRIVATE_KEY, algorithm="RS256")


def get_installation_access_token() -> str:
    jwt_token = create_jwt_app()
    url = f"https://api.github.com/app/installations/{GITHUB_INSTALLATION_ID}/access_tokens"
    resp = requests.post(url, headers={
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/vnd.github+json",
    })
    if resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"GitHub installation token failed: {resp.status_code} {resp.text}")
    return resp.json()["token"]


def get_contents(path: str, token: str):
    owner, repo = GITHUB_REPO.split("/", 1)
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    resp = requests.get(url, headers=github_headers(token))
    if resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"GitHub contents fetch failed: {resp.status_code} {resp.text}")
    return resp.json()


def update_contents(path: str, new_content_bytes: bytes, message: str, token: str, sha: str):
    owner, repo = GITHUB_REPO.split("/", 1)
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"

    import base64
    content_b64 = base64.b64encode(new_content_bytes).decode("utf-8")

    payload = {
        "message": message,
        "content": content_b64,
        "sha": sha,
    }
    resp = requests.put(url, headers=github_headers(token), json=payload)
    if resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"GitHub contents update failed: {resp.status_code} {resp.text}")


@app.post("/admin/commit-data-json")
def commit_data_json(payload: UpdateCarPayload):
    if not all([GITHUB_APP_ID, GITHUB_INSTALLATION_ID, GITHUB_REPO, GITHUB_APP_PRIVATE_KEY]):
        raise HTTPException(status_code=500, detail="Server not configured. Set env vars in server/.env")

    if "data_json" not in payload or not isinstance(payload.data_json, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")

    path = "data.json"
    if path not in ALLOWED_PATHS:
        raise HTTPException(status_code=403, detail="Path not allowed")

    token = get_installation_access_token()

    current = get_contents(path, token)
    sha = current.get("sha")

    new_bytes = json.dumps(payload.data_json, indent=2, ensure_ascii=False).encode("utf-8")
    update_contents(
        path=path,
        new_content_bytes=new_bytes,
        message=f"Admin update data.json ({int(time.time())})",
        token=token,
        sha=sha,
    )

    return {"ok": True}

