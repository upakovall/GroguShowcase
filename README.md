# 🌐 Grogu Multi-Application Showcase Suite

This repository showcases how the standalone **`grogu-copilot`** library powers **two completely distinct web platforms** without any hardcoded domain logic.

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
- *"Переключи на светлую тему и масштабируй воркеры до 5"*
- *"Отфильтруй упавшие сервера"*
- *"Открой окно деплоя"*

### In Quantum Trade Terminal (Port 8050):
- *"Купи 2 биткоина с 5x плечом"*
- *"Перейди на вкладку риск-менеджмента"*
- *"Включи автохеджирование и поставь стоп лосс на 8 процентов"*
- *"Купи 100 биткоинов"* *(Демонстрация MCP-валидатора: отклонит с предупреждением о лимите)*
