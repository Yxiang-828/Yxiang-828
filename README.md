# Hi, I'm Yao Xiang 

[![Profile Views](https://komarev.com/ghpvc/?username=Yxiang-828&color=blue)](https://yxiang-828.github.io)

Computer Engineering (+ AI Minor) @ NUS (Year 2) | Teaching Assistant (CS2113). Hardware design (Verilog, Arduino, C/C++) + software automation (Python, Java, JavaScript, TypeScript). Building AI tools and efficient systems.

 Website: https://yxiang-828.github.io/

### Aiko — my personal AI hub (Apr 2026 → Present)

Side project I've been building for about a month. The "Mothership" name is literal: it's where all my other projects — hackathon code, CLI helpers, weekend tools — eventually plug in and become skills Aiko can call. Instead of having a graveyard of half-remembered Python scripts, they all end up as one thing I can talk to.

**Stack** — Linux background daemon in TypeScript / Node. Brain is local **Ollama** by default, **OpenRouter** (`minimax/minimax-m2.5`, swap with `AIKO_MODEL`) when I want something faster. I reach it from my phone on a React Native / Expo app over a **Tailscale** tunnel, or on a TOTP-gated **Telegram** bot.

**Skills so far** — local image-gen with FLUX.2 Klein on ComfyUI, local Whisper transcription, ElevenLabs TTS, plus the boring useful stuff: shell, git, docker, file ops, calendar, web fetch, diary, system control. New ones get added whenever I write something I'd want to reuse.

**Also inside** — a small software factory built on the Gemini CLI (architect / executor / auditor lanes, each a Gemini process with its own role prompt, mutex-gated, phase-routed) that handles short build tasks in the background while I'm working on something else.

Not public, but happy to demo. Longer write-up at [yxiang-828.github.io/projects/aiko.html](https://yxiang-828.github.io/projects/aiko.html).

---

### 🏆 Highlights & Hackathons

### [PLAN.AI — Deep-Research Architect Co-Pilot](https://github.com/Yxiang-828/PLAN_AI) (AI-Engineer Hackathon · Apr 2026)

The Architect's co-pilot. A planner that researches across **9 sources** (GitHub, arXiv, Semantic Scholar, Reddit, Stack Exchange, Wikipedia, Hacker News, Tavily, Firecrawl) and synthesizes inline-cited 22-section technical blueprints with Mermaid C4 diagrams.

- Three research depths (Quick / Standard / **STORM-lite Deep** with Engineer / PM / SRE personas).
- React + Vite + Vercel Edge serverless catch-all; client-side API keys, localStorage workspaces, workspace branching + merge.
- **Shipping Floor** compiles each blueprint into Architect / Executor / Auditor tasks with React-Flow + dagre topology.
- Full case study: [yxiang-828.github.io/projects/planai.html](https://yxiang-828.github.io/projects/planai.html)

### [Synapxe × IMDA AI Innovation Challenge 2026 — Mera: The Digital Health Companion](https://github.com/Yxiang-828/Synapxe_IMDA_AI_Innovation_Challenge) (Team Lead · Feb–Mar 2026)
<div align="center">
<img src="./images/mera_circular.png" width="120" alt="Mera Logo">
<br/>

**⚡ Try on Telegram [@Meramerarabot](https://t.me/Meramerarabot)**

</div>

Architected a fully functional agentic Telegram health bot for aged & chronically ill patients. Deployed a Dockerized "Open Claw" multi-LLM stack using Singapore's sovereign AI models: **SEA-LION** (reasoning/vision) + **MERaLiON** (ASR/SER).

#### 🚀 Key Features & Innovation
- **3 WASM Clinical Mini-Apps**: Smile Checker, Mobility FSM, and rPPG Heart Rate running 100 % on-device for total privacy.
- **Multimodal Fusion**: Voice biomarkers (fatigue/sentiment) + visual symmetry in real-time.
- **Agentic FSM**: Autonomous 4-state loop from passive monitoring to clinical intervention.

<div align="center">
<img src="./images/games.png" width="800" alt="Mera Clinical Games">
<p><i>Clinical Edge-Games: Smile Symmetry, Mobility FSM, and rPPG Heart Rate</i></p>
</div>

#### 📊 Empirical Validation
- **100 % Smile Precision** (zero false positives)
- **92–98 % Mobility Accuracy** (skeletal FSM tracking)
- **3.70 MAE rPPG** (0.93 Pearson vs clinical oximeter)

[View Repository](https://github.com/Yxiang-828/Synapxe_IMDA_AI_Innovation_Challenge) | [Try on Telegram @Meramerarabot](https://t.me/Meramerarabot)

### [Shoppo — TinyFish Telegram Shopping Agent](https://github.com/Yxiang-828/TinyFish-SG-Hackathon) (TinyFish-SG Hackathon · Mar 2026)

Telegram-native shopping agent that turns messy user intent into TinyFish marketplace fan-out, evidence-backed ranking, and a clearer shortlist across **Carousell, Lazada, Amazon SG, and Alibaba**.

- **FastAPI + SQLite + SSE** backend; Telegram Bot API frontend.
- Cross-marketplace search planner with structured-output decision support.
- Designed for budget-bounded, evidence-cited shopping where users see *why* one listing beat another.

### [VibeWithSG × Duality AI — Offroad Autonomy Semantic Segmentation](https://github.com/Yxiang-828/VibeWithSG) (Solo, Team SyntaxError · Apr–May 2026)

Solo submission for desert-biome semantic segmentation. **DINOv2-L + DPT** with last-8-block LLRD fine-tune, multi-scale + HFlip TTA on H100.

- **Final test mIoU 0.4214** (0.691 pixel accuracy) on the 1 002-image OOD desert test set.
- **Val mIoU 0.6361** — honest val/test gap explained as pure distribution shift.
- Diagnosed and fixed two silent dataset bugs (missing `Flowers=600`, 16-bit PIL `I;16` mask saturation) before training.

### More Hackathons
- [Hack4Good 2026](https://github.com/Yxiang-828/Hack4Good2026) — Care Guardian System: Modular Care Infrastructure
- [Dual-Mode AV Disruptor](https://github.com/Yxiang-828/HacX-AV-Sensor-Disruptor) — HacX 2025 (HTX + Microsoft) hardware prototype

---

## 💻 Personal Projects

### Wingman  AI Personal Assistant
**Team Project - NUS Orbital Apollo 2025**

<img src="./images/7409.png" width="400" alt="Wingman Screenshot">

**Local-first desktop app** | React + TypeScript + Electron + Python/FastAPI

Task manager, calendar, mood diary with Ollama-powered AI chat. SQLite + Supabase auth. 6 custom themes. Full privacy, packaged cross-platform distribution.

<details>
<summary><b> Themes</b></summary>

<div align="center">
<table>
<tr>
<td align="center"><img src="./images/dark-theme.png" width="200" alt="Dark Theme"/><br/><b> Dark</b></td>
<td align="center"><img src="./images/light-theme.png" width="200" alt="Light Theme"/><br/><b> Light</b></td>
<td align="center"><img src="./images/yandere-theme.png" width="200" alt="Yandere Theme"/><br/><b> Yandere</b></td>
</tr>
<tr>
<td align="center"><img src="./images/kuudere-theme.png" width="200" alt="Kuudere Theme"/><br/><b> Kuudere</b></td>
<td align="center"><img src="./images/tsundere-theme.png" width="200" alt="Tsundere Theme"/><br/><b> Tsundere</b></td>
<td align="center"><img src="./images/dandere-theme.png" width="200" alt="Dandere Theme"/><br/><b> Dandere</b></td>
</tr>
</table>
</div>

</details>

[View Repository](https://github.com/Yxiang-828/Wingman) 

### More Personal Projects
- [Helper Tools](https://github.com/Yxiang-828/Helper_Tools) - 7 CLI Tools (File Scanner, AI Upscalers, Media Processors) 
- [Matrix Solver](https://github.com/Yxiang-828/MatrixSolver) - Matrix Solver (Ridge Regression, Linear Regression, Matrix Arithmetic, Gradient Descent etc. calculator)

---

## 👨‍🏫 Experiences

### Undergraduate Teaching Assistant (CS2113) @ National University of Singapore
*(Jan 2026 - Present)*
- Mentoring students in **Software Engineering & Object-Oriented Programming**.
- Guiding tutorials on Java, JUnit testing, and collaborative GitHub workflows.

## Tech Stack
![C](https://img.shields.io/badge/C-00599C?style=for-the-badge&logo=c&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![C++](https://img.shields.io/badge/C%2B%2B-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white)
![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Verilog](https://img.shields.io/badge/Verilog-000000?style=for-the-badge&logo=verilog&logoColor=white)
![Arduino](https://img.shields.io/badge/Arduino-00979D?style=for-the-badge&logo=arduino&logoColor=white)

##  Get in touch
-  Website: https://yxiang-828.github.io/
-  LinkedIn: https://www.linkedin.com/in/yao-xiang-733b06329
-  Email: xiangyao888@gmail.com






