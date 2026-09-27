#!/usr/bin/env python3
"""Generate the site's extra imagery and footage with the OpenAI API.

Reads the key from the OPENAI_API_KEY environment variable (never from a file
in the repo) and hands it to curl on stdin, so it never appears in a process
list. Uses curl so the environment's HTTPS proxy settings apply as-is.

    python3 tools/generate_media.py              # run every job not yet on disk
    python3 tools/generate_media.py --dry-run    # show what would run
    python3 tools/generate_media.py take-remmen  # only the named job(s)
    python3 tools/generate_media.py --force ...  # regenerate even if present

Models can be overridden with OPENAI_IMAGE_MODEL / OPENAI_VIDEO_MODEL.
"""
import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.openai.com/v1"
IMAGE_MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1")
VIDEO_MODEL = os.environ.get("OPENAI_VIDEO_MODEL", "sora-2")


def curl(args, key, body=None):
    """Run curl with the auth header supplied on stdin; return (status, bytes)."""
    header = f"Authorization: Bearer {key}\n"
    cmd = ["curl", "-sS", "-m", "600", "-H", "@-", "-w", "\n%{http_code}", *args]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "--data-binary", body]
    res = subprocess.run(cmd, input=header.encode(), capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(f"curl failed: {res.stderr.decode().strip()}")
    out, _, status = res.stdout.rpartition(b"\n")
    return int(status or 0), out


def fail(status, raw):
    try:
        msg = json.loads(raw)["error"]["message"]
    except Exception:
        msg = raw[:300].decode(errors="replace")
    raise RuntimeError(f"HTTP {status}: {msg}")


def gen_image(job, style, key):
    body = json.dumps({
        "model": IMAGE_MODEL,
        "prompt": f"{job['prompt']} {style}",
        "size": job.get("size", "1536x1024"),
        "quality": job.get("quality", "high"),
        "output_format": "webp",
        "output_compression": 82,
        "n": 1,
    })
    status, raw = curl([f"{API}/images/generations"], key, body)
    if status != 200:
        fail(status, raw)
    return base64.b64decode(json.loads(raw)["data"][0]["b64_json"])


def gen_video(job, style, key):
    status, raw = curl([
        f"{API}/videos",
        "-F", f"model={VIDEO_MODEL}",
        "-F", f"prompt={job['prompt']} {style}",
        "-F", f"size={job.get('size', '1280x720')}",
        "-F", f"seconds={job.get('seconds', '8')}",
    ], key)
    if status not in (200, 201):
        fail(status, raw)
    vid = json.loads(raw)["id"]
    print(f"    queued {vid}", flush=True)
    while True:
        time.sleep(10)
        status, raw = curl([f"{API}/videos/{vid}"], key)
        if status != 200:
            fail(status, raw)
        info = json.loads(raw)
        print(f"    {info.get('status')} {info.get('progress', '')}", flush=True)
        if info.get("status") == "completed":
            break
        if info.get("status") == "failed":
            raise RuntimeError(json.dumps(info.get("error") or info))
    status, raw = curl([f"{API}/videos/{vid}/content"], key)
    if status != 200:
        fail(status, raw)
    return raw


def main(argv):
    flags = {a for a in argv if a.startswith("--")}
    only = [a for a in argv if not a.startswith("--")]
    spec = json.loads((ROOT / "tools/media-prompts.json").read_text())
    jobs = [j for j in spec["jobs"] if not only or j["id"] in only]

    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key and "--dry-run" not in flags:
        sys.exit("OPENAI_API_KEY is not set. Add it in the environment settings and start a new session.")

    for job in jobs:
        out = ROOT / job["out"]
        if out.exists() and "--force" not in flags:
            print(f"skip  {job['id']} (exists)")
            continue
        model = IMAGE_MODEL if job["type"] == "image" else VIDEO_MODEL
        print(f"{'plan' if '--dry-run' in flags else 'make'}  {job['id']} [{job['type']} · {model} · {job.get('size')}] -> {job['out']}", flush=True)
        if "--dry-run" in flags:
            continue
        try:
            data = (gen_image if job["type"] == "image" else gen_video)(job, spec["style"], key)
        except Exception as e:  # keep going with the other jobs
            print(f"    ERROR {e}", flush=True)
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(data)
        print(f"    saved {len(data) // 1024} KB", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
