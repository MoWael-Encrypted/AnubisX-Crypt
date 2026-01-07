import os
import uuid
import subprocess
import concurrent.futures
import logging
from pathlib import Path
from flask import Flask, request, send_from_directory, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# ----------------------------
# Paths & Configuration
# ----------------------------
APP_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = APP_DIR / "uploads"
OUTPUT_DIR = APP_DIR / "outputs"
RESULTS_DIR = APP_DIR / "results"
LOGS_DIR = APP_DIR / "logs"

EXE_SERIAL = APP_DIR / "encrypt_serial.exe"
EXE_OMP    = APP_DIR / "encrypt_openmp.exe"
EXE_MPI    = APP_DIR / "encrypt_mpi.exe"

# Microsoft MPI Path
MSMPI_BIN = Path(r"C:\Program Files\Microsoft MPI\Bin\mpiexec.exe")
MPIEXEC = str(MSMPI_BIN) if MSMPI_BIN.exists() else "mpiexec"

ALLOWED_EXT = {".log", ".txt", ".enc", ".dec", ".csv"}
MAX_UPLOAD_MB = 300

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024

for d in [UPLOAD_DIR, OUTPUT_DIR, RESULTS_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ----------------------------
# Logging Setup
# ----------------------------
logging.basicConfig(
    filename=LOGS_DIR / "system.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# ----------------------------
# Helpers
# ----------------------------
def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXT

def detect_hardware():
    """Returns number of logical CPUs available."""
    try:
        count = os.cpu_count()
        if count is None:
            return 4 # Fallback
        return count
    except:
        return 4

def pick_engine_auto(file_size_bytes: int) -> str:
    if file_size_bytes < 20 * 1024 * 1024:    return "serial"
    elif file_size_bytes < 200 * 1024 * 1024: return "openmp"
    else:                                     return "mpi"

def run_command(cmd_list):
    try:
        # Run process. cwd=APP_DIR ensures it looks for DLLs in the backend folder
        p = subprocess.run(
            cmd_list, 
            cwd=str(APP_DIR), 
            capture_output=True, 
            text=True
        )
        out = (p.stdout or "") + (p.stderr or "")
        return p.returncode, out
    except Exception as e:
        return -1, str(e)

def parse_metrics(output_text: str):
    t, thr = 0.0, 0.0
    for line in output_text.splitlines():
        if "Time(s)=" in line and "Throughput(MB/s)=" in line:
            try:
                parts = line.replace('=', ' ').split()
                if "Time(s)" in parts:
                    t = float(parts[parts.index("Time(s)") + 1])
                if "Throughput(MB/s)" in parts:
                    thr = float(parts[parts.index("Throughput(MB/s)") + 1])
            except:
                pass
    return t, thr

def ensure_exes_exist():
    missing = []
    if not EXE_SERIAL.exists(): missing.append(EXE_SERIAL.name)
    if missing:
        msg = f"Server Error: Executables not found in {APP_DIR}: {', '.join(missing)}"
        logger.error(msg)
        return False, msg
    return True, ""

# ----------------------------
# Routes
# ----------------------------

@app.route("/run", methods=["POST"])
def run_job():
    ok, msg = ensure_exes_exist()
    if not ok: return jsonify({"error": msg}), 500

    # Handle multiple files
    files = request.files.getlist('files')
    if not files or all(f.filename == '' for f in files):
        if 'file' in request.files: # Fallback for single file
             files = [request.files['file']]
        else:
            return jsonify({"error": "No files uploaded"}), 400

    mode = request.form.get("mode", "enc").strip()
    # Engine is a preference, but we might override it per file if "auto"
    engine_pref = request.form.get("engine", "auto").strip() 
    key = request.form.get("key", "3").strip()
    chunk = request.form.get("chunk", "1048576").strip()
    
    # Auto-detection logic
    detected_cpus = detect_hardware()
    server_logs = []

    threads_arg = request.form.get("threads", "").strip()
    procs_arg = request.form.get("procs", "").strip()

    # If empty or "0", use detected max
    auto_adjusted = False
    if not threads_arg or threads_arg == "0":
        threads = str(detected_cpus)
        auto_adjusted = True
    else:
        threads = threads_arg

    if not procs_arg or procs_arg == "0":
        procs = str(detected_cpus)
        auto_adjusted = True
    else:
        procs = procs_arg

    if auto_adjusted:
        msg = f"Auto-Configuration Applied: Adjusted to Threads={threads}, Procs={procs} (Host CPUs={detected_cpus})"
        logger.info(msg)
        server_logs.append(msg)
    
    logger.info(f"Job Start. EnginePref={engine_pref} Threads={threads} Procs={procs}")
    server_logs.append(f"Job Start: Engine={engine_pref}, Threads={threads}, Procs={procs}")

    job_id = uuid.uuid4().hex[:8]
    
    # Pre-save all files
    tasks = []
    
    for f in files:
        if f.filename == '': continue
        original_name = secure_filename(f.filename)
        # Create unique ID per file to avoid collision specifically
        file_id = f"{job_id}_{uuid.uuid4().hex[:4]}"
        in_path = UPLOAD_DIR / f"{file_id}_{original_name}"
        f.save(in_path)
        
        # Determine engine for this specific file
        current_engine = engine_pref
        if current_engine == "auto":
            f_size = in_path.stat().st_size
            current_engine = pick_engine_auto(f_size)
            msg = f"File '{original_name}' ({f_size} bytes) -> Auto-selected Engine: {current_engine}"
            logger.info(msg)
            server_logs.append(msg)
            
        out_name = f"{file_id}_{current_engine}_{mode}_{original_name}"
        out_path = OUTPUT_DIR / out_name
        
        cmd = []
        if current_engine == "serial":
            cmd = [str(EXE_SERIAL), "--in", str(in_path), "--out", str(out_path),
                   "--mode", mode, "--key", key, "--chunk", chunk]
        elif current_engine == "openmp":
            cmd = [str(EXE_OMP), "--in", str(in_path), "--out", str(out_path),
                   "--mode", mode, "--key", key, "--chunk", chunk, "--threads", threads]
        elif current_engine == "mpi":
            cmd = [MPIEXEC, "-n", procs, str(EXE_MPI),
                   "--in", str(in_path), "--out", str(out_path),
                   "--mode", mode, "--key", key, "--chunk", chunk, "--threads", threads]
        
        tasks.append({
            "id": file_id,
            "filename": original_name,
            "engine": current_engine,
            "cmd": cmd,
            "out_name": out_name
        })

    # Execute efficiently
    # For MPI, running parallel mpiexec might be tricky on Windows depending on MSMPI config.
    # We will try ThreadPoolExecutor. If strictly sequential desired, set max_workers=1
    
    results = []
    
    # We'll use 4 workers. Note: 4 concurrent MPI jobs might saturate system if procs=4. 
    # But for typical small files or serial/openmp, this is faster.
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        future_to_task = {executor.submit(run_command, t["cmd"]): t for t in tasks}
        
        for future in concurrent.futures.as_completed(future_to_task):
            task = future_to_task[future]
            try:
                rc, out = future.result()
                
                # Save log
                (RESULTS_DIR / f"{task['id']}.log").write_text(out, encoding="utf-8", errors="ignore")
                
                if rc != 0:
                    results.append({
                        "filename": task["filename"],
                        "status": "error",
                        "details": out if out else "Crash/Unknown error"
                    })
                else:
                    t_s, thr = parse_metrics(out)
                    results.append({
                        "filename": task["filename"],
                        "status": "success",
                        "engine": task["engine"],
                        "time": t_s,
                        "throughput": thr,
                        "downloadUrl": f"http://localhost:5000/download/{task['out_name']}"
                    })
            except Exception as e:
                results.append({
                    "filename": task["filename"],
                    "status": "error",
                    "details": str(e)
                })

    return jsonify({"job_id": job_id, "results": results, "logs": server_logs})


@app.route("/benchmark", methods=["POST"])
def benchmark():
    ok, msg = ensure_exes_exist()
    if not ok: return jsonify({"error": msg}), 500
    
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    f = request.files['file']
    
    # Save file once
    job_id = uuid.uuid4().hex[:8]
    in_path = UPLOAD_DIR / f"{job_id}_{secure_filename(f.filename)}"
    f.save(in_path)

    mode = request.form.get("mode", "enc")
    key = request.form.get("key", "3")
    chunk = request.form.get("chunk", "1048576")
    # Auto-detection logic
    detected_cpus = detect_hardware()
    server_logs = []

    threads_arg = request.form.get("threads", "").strip()
    procs_arg = request.form.get("procs", "").strip()

    if not threads_arg or threads_arg == "0":
        threads = str(detected_cpus)
    else:
        threads = threads_arg

    if not procs_arg or procs_arg == "0":
        procs = str(detected_cpus)
    else:
        procs = procs_arg

    logger.info(f"Benchmark Start. Threads={threads} Procs={procs} (Detected CPUs={detected_cpus})")
    server_logs.append(f"Benchmark Start: Threads={threads}, Procs={procs} (Detected CPUs={detected_cpus})")

    # Define tasks
    tasks = [
        ("Serial", [str(EXE_SERIAL), "--in", str(in_path), "--out", str(OUTPUT_DIR/f"{job_id}_ser.out"), "--mode", mode, "--key", key, "--chunk", chunk]),
        ("OpenMP", [str(EXE_OMP),    "--in", str(in_path), "--out", str(OUTPUT_DIR/f"{job_id}_omp.out"), "--mode", mode, "--key", key, "--chunk", chunk, "--threads", threads]),
        ("MPI",    [MPIEXEC, "-n", procs, str(EXE_MPI), "--in", str(in_path), "--out", str(OUTPUT_DIR/f"{job_id}_mpi.out"), "--mode", mode, "--key", key, "--chunk", chunk]),
        ("Hybrid", [MPIEXEC, "-n", procs, str(EXE_MPI), "--in", str(in_path), "--out", str(OUTPUT_DIR/f"{job_id}_hyb.out"), "--mode", mode, "--key", key, "--chunk", chunk, "--threads", threads])
    ]

    results = []

    # Run in PARALLEL using ThreadPoolExecutor
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        # Submit all tasks
        future_to_label = {executor.submit(run_command, cmd): label for label, cmd in tasks}
        
        # Gather results as they finish
        for future in concurrent.futures.as_completed(future_to_label):
            label = future_to_label[future]
            try:
                rc, out = future.result()
                if rc == 0:
                    t, thr = parse_metrics(out)
                    results.append({"label": label, "time": t, "throughput": thr})
                else:
                    results.append({"label": label, "time": 0, "throughput": 0, "error": f"Exit Code {rc}"})
            except Exception as exc:
                results.append({"label": label, "time": 0, "throughput": 0, "error": str(exc)})

    # Sort results to always be Serial -> OpenMP -> MPI -> Hybrid for consistent charting
    order = {"Serial": 0, "OpenMP": 1, "MPI": 2, "Hybrid": 3}
    results.sort(key=lambda x: order.get(x["label"], 99))

    return jsonify({"results": results, "logs": server_logs})

@app.route("/hash", methods=["POST"])
def calculate_hash():
    if 'file' not in request.files: return jsonify({"error": "No file"}), 400
    f = request.files['file']
    if f.filename == '': return jsonify({"error": "No file selected"}), 400
    
    # Calculate SHA256
    import hashlib
    sha256_hash = hashlib.sha256()
    for byte_block in iter(lambda: f.read(4096), b""):
        sha256_hash.update(byte_block)
    
    return jsonify({"filename": f.filename, "sha256": sha256_hash.hexdigest()})

@app.route("/keygen", methods=["GET"])
def keygen():
    # Generate a random integer key for the Caesar cipher
    import secrets
    k = secrets.randbelow(10000) 
    return jsonify({"key": str(k)})

@app.route("/download/<path:filename>")
def download(filename):
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)