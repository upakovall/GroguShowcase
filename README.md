# 🌐 Grogu Multi-Application Showcase Suite

This repository showcases how the standalone **`grogu-copilot`** library powers **two completely distinct web platforms** with **Continuous Voice Conversation (Client-Side VAD)** without any hardcoded domain logic or backend VAD CPU overhead.

---

## 🏗️ Architecture & Included Applications

```
GroguShowcase/
├── run_all.py                       # Unified runner starting both apps
├── apps/
│   ├── nexus_cloud/                 # ☁️ Host App 1: Cloud & DevOps Platform (Port 8000)
│   │   ├── main.py                  # FastAPI server with Grogu integration
│   │   └── static/                  # Web dashboard UI
│   │
│   └── quantum_trading/             # 📈 Host App 2: Crypto & Asset Trading Desk (Port 8050)
│       ├── main.py                  # FastAPI server with Order Engine & MCP Hooks
│       ├── trading_service.py       # Domain-specific financial logic
│       └── static/                  # Multi-tab Trading SPA
```

---

## ⚡ Quick Start

### 1. Install the standalone `grogu-copilot` library:
```bash
pip install -e "../grogu-copilot"
# or: pip install git+https://github.com/your-username/grogu-copilot.git
```

### 2. Launch both applications at once:
```bash
python run_all.py
```

### 3. Open in Browser:
- **Nexus Cloud Studio**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Quantum Trade Terminal**: [http://127.0.0.1:8050](http://127.0.0.1:8050)

---

## 🎙️ Sample Voice Commands to Test

### In Nexus Cloud Studio (Port 8000):
- *"Switch to light theme and scale workers to 5"*
- *"Filter unhealthy servers"*
- *"Open deployment modal"*
- *"Tell me how Kubernetes autoscaling works under the hood"* (Small talk / deep dive)

### In Quantum Trade Terminal (Port 8050):
- *"Buy 2 Bitcoins with 5x leverage"*
- *"Switch to risk management tab"*
- *"Enable auto-hedging and set stop loss to 8 percent"*
- *"Buy 100 Bitcoins"* *(MCP validator demonstration: will reject with a limit alert)*
- *"What's your strategy advice for high market volatility?"* (Conversational reasoning)

---

## 🚀 RunPod & Remote GPU Deployment (Ollama / vLLM)

### 1. Pull Latest Changes on Both Repos:
```bash
# 1. Update Core Library
cd /workspace/grogu-copilot
git pull origin main
pip install -e .

# 2. Update Showcase Apps
cd /workspace/GroguShowcase
git pull origin master
```

### 2. Start Ollama Server (or vLLM with 65% VRAM limit):
```bash
# Start Ollama daemon in background
OLLAMA_HOST=0.0.0.0:11434 ollama serve > ollama.log 2>&1 &

# Pull LLM model
ollama pull qwen2.5:14b
```

*(Alternative via vLLM with explicit 65% GPU memory limit for 16GB out of 24GB):*
```bash
vllm serve Qwen/Qwen2.5-14B-Instruct-AWQ --port 8001 --gpu-memory-utilization 0.65
```

### 3. Launch Showcase with Ollama:
```bash
cd /workspace/GroguShowcase

export LLM_BACKEND=ollama
export LLM_API_BASE=http://127.0.0.1:11434/v1
export LLM_MODEL_NAME=qwen2.5:14b
export STT_DEVICE=cpu

python run_all.py
```
