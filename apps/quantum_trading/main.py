"""FinTech Quantum Terminal - Host Application.

Demonstrates seamless integration of the decoupled Grogu Voice AI Copilot module
into an entirely distinct architectural domain (Financial Trading & Risk Engine).
"""

import os
import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Add Grogu module path to sys.path
grogu_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Grogu"))
if grogu_path not in sys.path:
    sys.path.insert(0, grogu_path)

from grogu_copilot import (
    create_copilot_router,
    MCPRegistry,
    ViewContext,
    UIAction,
    ActionType,
)
from trading_service import TradingService

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("fintech_terminal")

# Instantiate trading domain service
trading_service = TradingService()

# 1. Initialize Inversion of Control Registry
trader_mcp = MCPRegistry()

# 2. Register Custom Risk & Safety Validator
def risk_policy_validator(action: UIAction, ctx: ViewContext):
    """Enforces host financial risk policies."""
    if action.target_id == "trade_amount_input":
        amount = float(action.payload.get("value", 0))
        if amount > 50.0:
            return False, "Risk Policy Alert: Single transaction limit is 50.0 units."
    return True, None

trader_mcp.register_action_validator(ActionType.SET_INPUT_VALUE.value, risk_policy_validator)

# 3. Register Custom Action Hook to record orders on server
def on_order_execute_hook(action: UIAction, ctx: ViewContext):
    """Server-side trade execution hook."""
    if action.target_id == "execute_trade_btn":
        asset = ctx.state_summary.get("selected_asset", "BTC/USD")
        order_type = ctx.state_summary.get("order_type", "MARKET_BUY")
        amount = float(ctx.state_summary.get("trade_amount", 1.0))
        leverage = int(ctx.state_summary.get("leverage", 1))
        order = trading_service.execute_order(asset, order_type, amount, leverage)
        return {"executed_order": order}
    return None

trader_mcp.register_action_hook(ActionType.CLICK_BUTTON.value, on_order_execute_hook)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("Starting FinTech Quantum Terminal (Port 8050)")
    logger.info("Integrated with decoupled Grogu Voice AI Copilot")
    logger.info("=" * 60)
    yield
    logger.info("Shutting down FinTech Quantum Terminal.")


app = FastAPI(
    title="FinTech Quantum Terminal",
    description="Professional Crypto & Asset Trading Platform with UI-Aware Voice AI Copilot",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Mount decoupled Grogu Copilot router
copilot_router = create_copilot_router(
    registry=trader_mcp,
    llm_backend="mock",
    endpoint_path="/ws/copilot",
)
app.include_router(copilot_router)

# 5. Domain REST APIs
@app.get("/api/portfolio")
async def get_portfolio():
    return {
        "portfolio": trading_service.portfolio,
        "orders": trading_service.active_orders,
        "risk_settings": trading_service.risk_settings,
    }

# 6. Mount Static Frontend
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Fix utf-8 output encoding for Windows
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")
    uvicorn.run(app, host="127.0.0.1", port=8050)
