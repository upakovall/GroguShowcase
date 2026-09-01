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

import sys
quantum_dir = Path(__file__).resolve().parent.parent / "quantum_trading"
if str(quantum_dir) not in sys.path:
    sys.path.insert(0, str(quantum_dir))

try:
    from trading_service import TradingService
    trading_service = TradingService()

    def risk_policy_validator(action: UIAction, ctx: ViewContext):
        if action.target_id == "trade_amount_input":
            amount = float(action.payload.get("value", 0))
            if amount > 50.0:
                return False, "Risk Policy Alert: Single transaction limit is 50.0 units."
        return True, None

    host_registry.register_action_validator(ActionType.SET_INPUT_VALUE.value, risk_policy_validator)

    def on_order_execute_hook(action: UIAction, ctx: ViewContext):
        if action.target_id == "execute_trade_btn":
            asset = ctx.state_summary.get("selected_asset", "BTC/USD")
            order_type = ctx.state_summary.get("order_type", "MARKET_BUY")
            amount = float(ctx.state_summary.get("trade_amount", 1.0))
            leverage = int(ctx.state_summary.get("leverage", 1))
            order = trading_service.execute_order(asset, order_type, amount, leverage)
            return {"executed_order": order}
        return None

    host_registry.register_action_hook(ActionType.CLICK_BUTTON.value, on_order_execute_hook)

    @app.get("/api/portfolio")
    async def get_portfolio():
        return {
            "portfolio": trading_service.portfolio,
            "orders": trading_service.active_orders,
            "risk_settings": trading_service.risk_settings,
        }
except Exception as e:
    logger.warning(f"Could not load trading service: {e}")

# Mount Quantum Trading static directory under /trade
QUANTUM_STATIC_DIR = Path(__file__).resolve().parent.parent / "quantum_trading" / "static"
if QUANTUM_STATIC_DIR.exists():
    app.mount("/trade", StaticFiles(directory=str(QUANTUM_STATIC_DIR), html=True), name="quantum_static")

# Mount static frontend directory for Nexus Cloud
STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print("=" * 60)
    print(f"Starting Nexus Cloud Studio on http://{host}:{port}")
    print("Powered by Grogu Voice AI Copilot")
    print("=" * 60)
    uvicorn.run("main:app", host=host, port=port, reload=False)
