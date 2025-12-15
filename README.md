# Hi, I'm Yao Xiang 

[![Profile Views](https://komarev.com/ghpvc/?username=Yxiang-828&color=blue)](https://yxiang-828.github.io)

Computer Engineering @ NUS (Year 2). Hardware design (Verilog, Arduino, C/C++) + software automation (Python, Java, JavaScript, TypeScript). Building AI tools and efficient systems.

**Website:** [yxiang-828.github.io](https://yxiang-828.github.io/) | **LinkedIn:** [linkedin.com/in/yao-xiang-733b06329](https://www.linkedin.com/in/yao-xiang-733b06329/) | **Email:** [xiangyao888@gmail.com](mailto:xiangyao888@gmail.com)

##  Repos
- [Wingman](https://github.com/Yxiang-828/Wingman) - Personal Assistant Desktop App 
- [Helper Tools](https://github.com/Yxiang-828/Helper_Tools) - 7 CLI Tools (File Scanner, AI Upscalers, Media Processors) 
- [Dual-Mode AV Disruptor](https://github.com/Yxiang-828/HacX-AV-Sensor-Disruptor) - HacX 2025 Hackathon Project
- [FPGA Calculator](https://github.com/Yxiang-828/EE2026-Project-Vivado) - EE2026 Scientific Calculator & Grapher
- [FlowCLI](https://github.com/AY2526S1-CS2113-W13-2/tp) - CS2113 Task Manager

---

##  Personal Projects

### Wingman  AI Personal Assistant
**Team Project - NUS Orbital Apollo 2025**

<img src="https://raw.githubusercontent.com/Yxiang-828/Yxiang-828.github.io/main/images/7409.png" width="400" alt="Wingman Screenshot">

**Local-first desktop app** | React + TypeScript + Electron + Python/FastAPI

Task manager, calendar, mood diary with Ollama-powered AI chat. SQLite + Supabase auth. 6 custom themes. Full privacy, packaged cross-platform distribution.

<details>
<summary><b> Themes</b></summary>

<div align="center">
<table>
<tr>
<td align="center"><img src="https://raw.githubusercontent.com/Yxiang-828/Wingman/main/src/assets/backgrounds/dark-theme.png" width="200" alt="Dark Theme"/><br/><b> Dark</b></td>
<td align="center"><img src="https://raw.githubusercontent.com/Yxiang-828/Wingman/main/src/assets/backgrounds/light-theme.png" width="200" alt="Light Theme"/><br/><b> Light</b></td>
<td align="center"><img src="https://raw.githubusercontent.com/Yxiang-828/Wingman/main/src/assets/backgrounds/yandere-theme.png" width="200" alt="Yandere Theme"/><br/><b> Yandere</b></td>
</tr>
<tr>
<td align="center"><img src="https://raw.githubusercontent.com/Yxiang-828/Wingman/main/src/assets/backgrounds/kuudere-theme.png" width="200" alt="Kuudere Theme"/><br/><b> Kuudere</b></td>
<td align="center"><img src="https://raw.githubusercontent.com/Yxiang-828/Wingman/main/src/assets/backgrounds/tsundere-theme.png" width="200" alt="Tsundere Theme"/><br/><b> Tsundere</b></td>
<td align="center"><img src="https://raw.githubusercontent.com/Yxiang-828/Wingman/main/src/assets/backgrounds/dandere-theme.png" width="200" alt="Dandere Theme"/><br/><b> Dandere</b></td>
</tr>
</table>
</div>

</details>

[View Repository](https://github.com/Yxiang-828/Wingman) 

---

### Helper Tools  -- Self-Efficiency CLI Tools
**Individual Project**

**7 automation tools** | PowerShell + Python + .NET + AI Models

Built to solve daily workflow bottlenecks: find/delete large files, upscale images, extract video content, transcribe audio. Offline, fast, no GUI overhead.

> **Note:** Showing 2 of 7 tools below. [View repository](https://github.com/Yxiang-828/Helper_Tools) for all tools and documentation.

## Examples
#### AI Image Upscaler  Real-ESRGAN + EDSR

<div align="center">

| **Real-ESRGAN 4x (GPU 2-5s)** | **EDSR 4x (CPU 15-30s)** |
|:---:|:---:|
| ![Real-ESRGAN](https://raw.githubusercontent.com/Yxiang-828/Helper_Tools/main/image_upscaler/samples/realesrgan_1.png) | ![EDSR](https://raw.githubusercontent.com/Yxiang-828/Helper_Tools/main/image_upscaler/samples/edsr_1.png) |
| *Left: Blurry  Right: GAN upscaled* | *Left: Blurry  Right: CNN upscaled* |

AMD Vulkan acceleration. GAN for dramatic recovery, CNN for precise sharpening.

</div>

#### File Scanner  O(M log K) Min-Heap

```powershell
PS C:\> .\file_scanner.ps1 -FileType game -TopCount 10

Target Type  : GAME Files
Extensions   : .unity3d, .pak, .wad, .bsa, .esp, .esm

[81.4s] Found 95,551 files | 1,173 files/sec

Total Size (Top 10): 53.38 GB
  1. (11.61 GB) pakchunk26-WindowsNoEditor.pak
  2. (9.14 GB) pakchunk34-WindowsNoEditor.pak
```

.NET BFS traversal + SortedSet min-heap. Scans entire C:\ in ~2min vs Windows Explorer's 40min.

#### All 8 Tools

| Tool | Purpose | Tech |
|------|---------|------|
| **File Scanner** | Find/delete large files for storage cleanup | .NET + Min-Heap (1,173-8,821 files/sec) |
| **Image Upscaler** | Restore/Sharpen images with AI | Real-ESRGAN + Vulkan (2-5s/image) |
| **Video Upscaler** | AI frame enhancement for videos | Real-ESRGAN + FFmpeg |
| **Subtitle/MP3 Extractor** | Extract embedded subs + mp3 from videos | FFmpeg automation |
| **Audio Transcriber** | Convert mp3 to text transcripts | Whisper AI (GPU 3-5x faster) |
| **Video to GIF** | Convert videos to GIFs (speed & quality customisable) | MoviePy + auto-scaling |
| **Unity Extractor** | Extract assets from .unity3d files and convert to PNG | UnityPy parser |


[View Repository](https://github.com/Yxiang-828/Helper_Tools) 

---

##  Highlights & Hackathons

### Dual-Mode AV Disruptor (HacX 2025)
**Team Project** | *Python, Raspberry Pi, CARLA, mmWave Radar*
*   Developed a non-destructive prototype to halt hostile autonomous vehicles by disrupting LiDAR and camera sensors.
*   Implemented dual-mode logic (Smoke Bomb vs Smart Obstacle) with safety features (thermal monitoring).
*   Validated system effectiveness using **CARLA simulation** and hardware field tests (15m range).
*   [View Repository](https://github.com/Yxiang-828/HacX-AV-Sensor-Disruptor)

### FPGA Graphic Calculator (EE2026)
**Team Project** | *Verilog, Vivado, Basys 3 FPGA*
*   Designed a multifunction scientific calculator and grapher on an Artix-7 FPGA.
*   **Keypad Interface:** Engineered a pipelined input system with debouncing and OLED visualization.
*   **Polynomial Solver:** Implemented a **Newton-Raphson** root finder using **Q22.14 fixed-point arithmetic**.
*   [View Repository](https://github.com/Yxiang-828/EE2026-Project-Vivado)

### FlowCLI (CS2113)
**Team Lead** | *Java, JUnit, Gradle, GitHub Actions*
*   Developed a keyboard-optimized CLI task manager for developers to track project deadlines and priorities.
*   Implemented advanced filtering, sorting, and data export features.
*   Managed CI/CD pipelines using **GitHub Actions** and enforced code quality with **Checkstyle**.
*   [View Repository](https://github.com/AY2526S1-CS2113-W13-2/tp)

---

##  Experience
**Singapore Armed Forces (Sungei Gedong Camp)** | *Signaller* | **Nov 2022 - Jan 2024**
*   **Awards:** Best Unit Award, Outstanding Conduct Grade.
*   Managed signal equipment, electric circuits, and IP address configurations for mission-critical communications.
*   Mentored junior personnel in technical operations, contributing to the unit's operational readiness.

---

##  Tech Stack
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
-  **Website:** https://yxiang-828.github.io/
-  **LinkedIn:** [linkedin.com/in/yao-xiang-733b06329](https://www.linkedin.com/in/yao-xiang-733b06329/)
-  **Email:** [xiangyao888@gmail.com](mailto:xiangyao888@gmail.com)






