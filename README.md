# AnubisX Crypt: High-Performance Web-Based Encryption System

**A hybrid parallel computing encryption tool utilizing OpenMP and MPI, wrapped in a modern web interface.**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

## 📖 Project Overview

**AnubisX Crypt** is a three-tier web application designed to bridge the gap between theoretical High-Performance Computing (HPC) concepts and practical web development.

Modern encryption is computationally expensive, especially as data volumes scale into terabytes. This project solves that bottleneck by offloading the heavy cryptographic workloads from the web server to compiled C++ executables that utilize parallel computing strategies.

The system features a **Smart Auto-Configuration Engine** that automatically selects the most efficient execution model based on file size and system load.

### 📺 System Demo

(https://youtu.be/6A7XxfK2hnE)

---

## 📸 Screenshots

### 1. The AnubisX Interface
A modern, user-friendly dashboard designed with Vite and Tailwind CSS.
<img width="1919" height="986" alt="Screenshot 2026-01-07 224927" src="https://github.com/user-attachments/assets/fcb791a7-b4fd-4204-ab35-fa7cb13a248a" />

*Figure 1: System Landing Page*

### 2. Performance Visualization
Real-time benchmarking comparing Serial, OpenMP, MPI, and Hybrid execution times.
<img width="1907" height="987" alt="Screenshot 2026-01-07 224948" src="https://github.com/user-attachments/assets/eb7ac803-1ce3-4d69-9557-17cac6a61191" />

*Figure 3: Performance Visualization Dashboard*

---

## 🚀 Key Features

* **Four Execution Strategies:**
    * **Serial:** Baseline execution for simple tasks.
    * **OpenMP (Shared Memory):** Utilizes multi-core processors for desktop-level parallelism.
    * **MPI (Distributed Memory):** Distributes workloads across networked nodes for big data.
    * **Hybrid (MPI + OpenMP):** Combines inter-node distribution with intra-node multi-threading for maximum efficiency.
* **Intelligent Auto-Configuration:** The system analyzes input files to automatically select the fastest model.
* **Real-Time Monitoring:** Logs every decision (e.g., "Auto-selected Fast Model: Hybrid") and displays it to the user for transparency.
* **Interactive Dashboard:** Drag-and-drop file upload with immediate integrity verification.

---

## 🏗️ System Architecture

The project follows a **three-tier architecture**:

1.  **Frontend Layer:** Built with **Vite, TypeScript, and Tailwind CSS**. Handles user interaction, file uploads, and visualization metrics via asynchronous API calls.
2.  **Backend Controller:** A **Python Flask** middleware acting as an orchestrator. It does not perform encryption itself but delegates tasks to the C++ layer.
3.  **Computational Layer:** Compiled **C++ executables** that implement the logic for Serial, OpenMP, and MPI encryption.

### 🧠 Decision Logic (Smart Select)

The Auto-Configuration Engine uses the following logic to optimize performance:

| File Size | Recommended Strategy | Reasoning |
| :--- | :--- | :--- |
| **Small (< 10MB)** | **Serial / OpenMP** | Avoiding the network initialization overhead of MPI is faster for small files. |
| **Large (> 100MB)** | **MPI / Hybrid** | The volume of data requires distributed processing power; overhead is negligible compared to computation savings. |

---

## 🛠️ Technology Stack

* **Frontend:** React (Vite), TypeScript, Tailwind CSS.
* **Backend:** Python Flask.
* **HPC Libraries:**
    * **OpenMP** (Open Multi-Processing).
    * **MPI** (Message Passing Interface).
* **Encryption Target:** Advanced Server Log Encryption.

---

## 👥 Team & Acknowledgments

* **Mostafa Wael Hamdy** (wmostafa021@gmail.com)
* **Elaf Wael Hamdy** (elafwael5@gmail.com)
* **Mariam Ahmed Gadelrab** (mariam.gadelrab2003@gmail.com)
* **Seifeldeen Mohamed** (seifeldeenm819@gmail.com)

---

## 📂 Installation & Usage

*(Note: Adjust the commands below based on your actual repository structure)*

### Prerequisites
* Python 3.8+
* Node.js & npm
* C++ Compiler (GCC/G++) with OpenMP support
* MPI Implementation (e.g., MPICH or OpenMPI)

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 2. frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Compile C++ Executables
```bash
# Example compilation for Hybrid mode
mpic++ -fopenmp hybrid_encrypt.cpp -o hybrid_encrypt
```
