"""Nexus Cloud Studio (DevOps & Infrastructure Platform).

Host Application #1 integrating the decoupled Grogu Voice AI Copilot.
Runs on Port 8000.
"""

import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from grogu_copilot import create_copilot_router, MCPRegistry, UIAction, ViewContext, ActionType

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nexus_cloud_app")

app = FastAPI(
    title="Nexus Cloud Studio",
    description="DevOps & Cluster Infrastructure Management powered by Grogu Voice AI Copilot",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MCP Inversion-of-Control Registry
host_registry = MCPRegistry()

# Custom safety validator: Prevent node count > 20
def validate_node_scaling(action: UIAction, ctx: ViewContext):
    if action.target_id == "nodes_slider":
        val = action.payload.get("value", 1)
        if float(val) > 20:
            return False, "Cluster capacity limit: Maximum allowed node count is 20."
    return True, None

host_registry.register_action_validator(ActionType.SET_INPUT_VALUE.value, validate_node_scaling)

import os

# Mount the decoupled Grogu Copilot Router
llm_backend = os.getenv("LLM_BACKEND", "dynamic")
llm_api_base = os.getenv("LLM_API_BASE", "http://localhost:8001/v1")
llm_model_name = os.getenv("LLM_MODEL_NAME", "Qwen/Qwen2.5-7B-Instruct-AWQ")
llm_api_key = os.getenv("LLM_API_KEY", None)

copilot_router = create_copilot_router(
    registry=host_registry,
    llm_backend=llm_backend,
    llm_api_base=llm_api_base,
    llm_api_key=llm_api_key,
    model_name=llm_model_name,
    endpoint_path="/ws/copilot",
    stt_model_size="base",
    stt_device="cpu",
)
app.include_router(copilot_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": "Nexus Cloud Studio",
        "voice_agent": "Grogu Voice AI Copilot",
        "vram_policy": "Strict 16GB limit (CPU STT/TTS)",
        "port": 8000
    }

# Mount static frontend directory
STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Starting Nexus Cloud Studio on http://127.0.0.1:8000")
    print("Powered by Grogu Voice AI Copilot")
    print("=" * 60)
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
