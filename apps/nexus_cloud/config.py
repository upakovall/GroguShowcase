"""Configuration and Settings for Voice AI Copilot Backend."""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Server settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    APP_NAME: str = "Nexus Cloud Studio"
    
    # 16GB VRAM Budget & Device Policy
    TOTAL_VRAM_BUDGET_GB: float = 16.0
    LLM_MAX_VRAM_GB: float = 11.0  # Max allocated for weights + KV cache
    STT_DEVICE: str = "cpu"        # Offload to CPU (compute_type=int8) to guarantee 0 VRAM contention
    STT_COMPUTE_TYPE: str = "int8"
    STT_MODEL_SIZE: str = "base.en" # "base.en" or "small.en"
    TTS_DEVICE: str = "cpu"        # Run PiperTTS / Kokoro ONNX on CPU (0 VRAM)
    
    # LLM Runtime Configuration
    LLM_BACKEND: str = "mock"      # "mock", "vllm", "llama_cpp", "runpod", or "openai_compatible"
    LLM_API_BASE: Optional[str] = "http://localhost:8001/v1"
    LLM_API_KEY: Optional[str] = None
    LLM_MODEL_NAME: str = "Qwen/Qwen2.5-7B-Instruct-AWQ"
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 512
    
    # Audio Specs
    AUDIO_SAMPLE_RATE: int = 16000
    AUDIO_CHANNELS: int = 1
    AUDIO_CHUNK_SIZE: int = 1024
    
    # Static & Frontend paths
    SERVE_FRONTEND: bool = True


settings = Settings()
