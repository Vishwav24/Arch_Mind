"""Application configuration using pydantic-settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """ArchMind AI application settings loaded from environment variables."""

    # --- API Keys ---
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    COHERE_API_KEY: str = ""
    CLOUDFLARE_AI_API_KEY: str = ""
    CLOUDFLARE_ACCOUNT_ID: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # --- Database ---
    DATABASE_URL: str = "sqlite+aiosqlite:///./archmind.db"

    # --- Primary Models (Gemini) ---
    PRIMARY_REASONING_MODEL: str = "gemini-flash-latest"
    PRIMARY_FAST_MODEL: str = "gemini-flash-latest"

    # --- Groq Models ---
    GROQ_REASONING_MODEL: str = "openai/gpt-oss-120b"
    GROQ_FAST_MODEL: str = "qwen/qwen3.8-27b"

    # --- OpenRouter Models ---
    OPENROUTER_REASONING_MODEL: str = "qwen/qwen3-235b-a22b:free"
    OPENROUTER_FAST_MODEL: str = "qwen/qwen3-30b-a3b:free"

    # --- Embedding ---
    EMBEDDING_MODEL: str = "text-embedding-004"

    # --- Limits ---
    MAX_TOKENS_PER_REQUEST: int = 8000

    # --- Feature Flags ---
    CACHE_ENABLED: bool = True
    DEBUG: bool = False

    model_config = {
        "env_file": [".env", "../.env", "backend/.env"],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
