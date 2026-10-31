"""FastAPI application entry point for ArchMind AI."""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db.models import init_db
from .db import repo
from .routes import projects, documents, analysis, clarifications, architecture, validation, impact, ask, export

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ArchMind AI backend...")
    await init_db()
    yield
    logger.info("Shutting down ArchMind AI backend...")


app = FastAPI(
    title="ArchMind AI",
    description="AI Software Architect Agent - API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(analysis.router)
app.include_router(clarifications.router)
app.include_router(architecture.router)
app.include_router(validation.router)
app.include_router(impact.router)
app.include_router(ask.router)
app.include_router(export.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ArchMind AI"}

