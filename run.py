"""Unified development runner for Agentic Shop Engine (Django backend + React frontend)."""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"


def find_backend_python() -> str:
    """Return the backend virtualenv Python interpreter if present, else current Python."""
    candidates = [
        BACKEND_DIR / "venv" / "Scripts" / "python.exe",
        BACKEND_DIR / "venv" / "bin" / "python",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return sys.executable


def find_npm() -> str:
    """Resolve the npm executable across Windows and POSIX platforms."""
    if os.name == "nt":
        npm_exe = shutil.which("npm.cmd") or shutil.which("npm")
    else:
        npm_exe = shutil.which("npm")
    if not npm_exe:
        raise FileNotFoundError(
            "Could not find 'npm' on PATH. Please install Node.js (https://nodejs.org/)."
        )
    return npm_exe


def stream_output(proc: subprocess.Popen[str], label: str) -> None:
    """Forward child stdout/stderr lines with a clear service prefix."""
    if not proc.stdout:
        return
    try:
        for line in proc.stdout:
            text = line.rstrip("\r\n")
            if text:
                print(f"[{label}] {text}", flush=True)
    except ValueError:
        pass


def terminate_process(proc: subprocess.Popen[str], label: str) -> None:
    """Gracefully stop a child process and its descendants across Windows and POSIX."""
    if proc.poll() is not None:
        return

    print(f"[RUNNER] Stopping {label} (pid={proc.pid})...", flush=True)
    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            proc.wait(timeout=5)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def spawn_service(
    cmd: list[str],
    cwd: Path,
    env: dict[str, str],
    label: str,
) -> tuple[subprocess.Popen[str], threading.Thread]:
    """Launch a child service with merged stdout/stderr and a background log reader."""
    kwargs: dict[str, object] = {
        "cwd": str(cwd),
        "env": env,
        "stdin": subprocess.DEVNULL,
        "stdout": subprocess.PIPE,
        "stderr": subprocess.STDOUT,
        "text": True,
        "bufsize": 1,
    }
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True

    proc = subprocess.Popen(cmd, **kwargs)  # type: ignore[arg-type]
    thread = threading.Thread(target=stream_output, args=(proc, label), daemon=True)
    thread.start()
    return proc, thread


def ensure_frontend_dependencies(npm_exe: str, force_install: bool = False) -> None:
    """Install frontend npm packages when node_modules is missing or --install is passed."""
    if not (FRONTEND_DIR / "package.json").is_file():
        raise FileNotFoundError(f"Missing frontend/package.json at {FRONTEND_DIR}")

    node_modules = FRONTEND_DIR / "node_modules"
    if force_install or not node_modules.exists():
        print("[RUNNER] Installing frontend dependencies (npm install)...", flush=True)
        result = subprocess.run([npm_exe, "install"], cwd=str(FRONTEND_DIR), check=False)
        if result.returncode != 0:
            raise RuntimeError(f"npm install failed with exit code {result.returncode}")


def wait_and_open_browser(url: str, timeout_seconds: float = 15.0) -> None:
    """Open the storefront URL once the Vite dev server responds."""
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1.0):
                webbrowser.open(url)
                return
        except urllib.error.URLError:
            time.sleep(0.4)
        except Exception:
            time.sleep(0.4)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Agentic Shop Engine backend (Django) and frontend (React/Vite)."
    )
    parser.add_argument("--backend-only", action="store_true", help="Start only the Django backend.")
    parser.add_argument("--frontend-only", action="store_true", help="Start only the React frontend.")
    parser.add_argument("--backend-host", default="127.0.0.1", help="Django bind host (default: 127.0.0.1).")
    parser.add_argument("--backend-port", type=int, default=8000, help="Django port (default: 8000).")
    parser.add_argument("--frontend-host", default="127.0.0.1", help="Vite bind host (default: 127.0.0.1).")
    parser.add_argument("--frontend-port", type=int, default=5173, help="Vite port (default: 5173).")
    parser.add_argument(
        "--migrate",
        action="store_true",
        help="Run 'python manage.py migrate' before starting the Django server.",
    )
    parser.add_argument(
        "--install",
        action="store_true",
        help="Force 'npm install' in frontend before starting Vite.",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Automatically open the frontend URL in your default browser.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.backend_only and args.frontend_only:
        print("Error: --backend-only and --frontend-only cannot be used together.", file=sys.stderr)
        return 2

    run_backend = not args.frontend_only
    run_frontend = not args.backend_only

    processes: list[tuple[str, subprocess.Popen[str]]] = []
    threads: list[threading.Thread] = []

    try:
        backend_url = f"http://{args.backend_host}:{args.backend_port}"
        frontend_url = f"http://{args.frontend_host}:{args.frontend_port}"

        if run_backend:
            manage_py = BACKEND_DIR / "manage.py"
            if not manage_py.is_file():
                raise FileNotFoundError(f"Could not find Django manage.py at {manage_py}")

            backend_python = find_backend_python()
            backend_env = os.environ.copy()
            backend_env["PYTHONUNBUFFERED"] = "1"

            if args.migrate:
                print("[RUNNER] Applying Django migrations...", flush=True)
                mig = subprocess.run(
                    [backend_python, "manage.py", "migrate"],
                    cwd=str(BACKEND_DIR),
                    env=backend_env,
                    check=False,
                )
                if mig.returncode != 0:
                    return mig.returncode

            print(f"[RUNNER] Starting Django backend at {backend_url}", flush=True)
            b_proc, b_thread = spawn_service(
                [backend_python, "manage.py", "runserver", f"{args.backend_host}:{args.backend_port}"],
                cwd=BACKEND_DIR,
                env=backend_env,
                label="BACKEND",
            )
            processes.append(("BACKEND", b_proc))
            threads.append(b_thread)

        if run_frontend:
            npm_exe = find_npm()
            ensure_frontend_dependencies(npm_exe, force_install=args.install)

            frontend_env = os.environ.copy()
            frontend_env["VITE_BACKEND_URL"] = backend_url

            print(f"[RUNNER] Starting React/Vite frontend at {frontend_url}", flush=True)
            f_proc, f_thread = spawn_service(
                [
                    npm_exe,
                    "run",
                    "dev",
                    "--",
                    "--host",
                    args.frontend_host,
                    "--port",
                    str(args.frontend_port),
                ],
                cwd=FRONTEND_DIR,
                env=frontend_env,
                label="FRONTEND",
            )
            processes.append(("FRONTEND", f_proc))
            threads.append(f_thread)

            if args.open:
                threading.Thread(
                    target=wait_and_open_browser,
                    args=(frontend_url,),
                    daemon=True,
                ).start()

        print("[RUNNER] Services running. Press Ctrl+C to stop.", flush=True)

        while True:
            for label, proc in processes:
                code = proc.poll()
                if code is not None:
                    print(f"[RUNNER] {label} exited with code {code}. Shutting down...", flush=True)
                    return code
            time.sleep(0.4)

    except KeyboardInterrupt:
        print("\n[RUNNER] Interrupt received. Shutting down...", flush=True)
        return 0
    except Exception as exc:
        print(f"[RUNNER] Error: {exc}", file=sys.stderr, flush=True)
        return 1
    finally:
        for label, proc in reversed(processes):
            terminate_process(proc, label)
        for thread in threads:
            thread.join(timeout=1.0)


if __name__ == "__main__":
    raise SystemExit(main())
