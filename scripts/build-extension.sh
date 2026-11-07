#!/usr/bin/env bash
# Builds the full extension (with the offline thumbnail model) into /tmp/air-build and zips it.
# Model: haywoodsloan/ai-image-detector-deploy (Apache-2.0), exported to ONNX and int8-quantized.
# Large binaries never enter the repo (10 MB limit); the zip is uploaded as a CDN asset.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
W=/tmp/air-work; B=/tmp/air-build; PY=/tmp/air-py
mkdir -p "$W"
step="${1:-all}"

if [[ $step == deps || $step == all ]]; then
  pip download --no-deps -q -d "$W" torch==2.5.1+cpu --index-url https://download.pytorch.org/whl/cpu
  pip install -q --target "$PY" "$W"/torch-*.whl transformers==4.48.3 onnx
fi
if [[ $step == model || $step == all ]]; then
  [ -f "$W/q.onnx" ] || (cd "$W" && PYTHONPATH="$PY" python3 - <<'EOF'
import torch
from transformers import AutoModelForImageClassification
m = AutoModelForImageClassification.from_pretrained('haywoodsloan/ai-image-detector-deploy').eval()
torch.onnx.export(m, torch.randn(1,3,256,256), 'fp.onnx', input_names=['pixel_values'], output_names=['logits'], opset_version=17)
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic('fp.onnx', 'q.onnx', weight_type=QuantType.QUInt8)
EOF
  )
  rm -f "$W/fp.onnx"
fi
if [[ $step == pack || $step == all ]]; then
  (cd "$W" && [ -d package ] || { npm pack onnxruntime-web@1.20.1 -q >/dev/null && tar xzf onnxruntime-web-1.20.1.tgz; })
  rm -rf "$B" && cp -r "$ROOT/extension" "$B"
  mkdir -p "$B/ort" "$B/model"
  cp "$W"/package/dist/{ort.wasm.min.js,ort-wasm-simd-threaded.mjs,ort-wasm-simd-threaded.wasm} "$B/ort/"
  (cd "$B/model" && split -b 45m -d -a 1 "$W/q.onnx" part)
  [ "$(ls "$B/model" | wc -l)" = 5 ] || { echo "model part count changed; update PARTS in ai-frame.js"; exit 1; }
  rm -f /tmp/ai-video-radar.zip
  (cd "$B" && nix run nixpkgs#zip -- -qr /tmp/ai-video-radar.zip .)
  ls -la /tmp/ai-video-radar.zip
fi
