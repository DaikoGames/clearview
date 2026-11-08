#!/usr/bin/env bash
# Builds the full extension (with the offline thumbnail model) into /tmp/air-build and zips it.
# Model: haywoodsloan/ai-image-detector-deploy (Apache-2.0), exported to ONNX and int8-quantized.
# Large binaries never enter the repo (10 MB limit); the zip is uploaded as a CDN asset.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
W=${AIR_WORK_DIR:-/tmp/air-work}; B=${AIR_BUILD_DIR:-/tmp/air-build}; PY=${AIR_PY_DIR:-/tmp/air-py}
export AIR_MODEL_REVISION=4ae1822603cb1ec980c217cfde1ef1b8e0477a16
mkdir -p "$W"
step="${1:-all}"

if [[ $step == deps || $step == all ]]; then
  pip download --no-deps -q -d "$W" torch==2.5.1+cpu --index-url https://download.pytorch.org/whl/cpu
  pip install -q --target "$PY" "$W"/torch-*.whl transformers==4.48.3 onnx==1.17.0 onnxruntime==1.20.1 'numpy<2'
fi
if [[ $step == model || $step == all ]]; then
  [ -f "$W/q.onnx" ] || (cd "$W" && PYTHONPATH="$PY" python3 - <<'EOF'
import os, torch
from transformers import AutoModelForImageClassification
m = AutoModelForImageClassification.from_pretrained('haywoodsloan/ai-image-detector-deploy', revision=os.environ['AIR_MODEL_REVISION']).eval()
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
  mkdir -p "$B/licenses"
  curl -fsSL https://raw.githubusercontent.com/microsoft/onnxruntime/v1.20.1/LICENSE -o "$B/licenses/onnxruntime.txt"
  curl -fsSL https://www.apache.org/licenses/LICENSE-2.0.txt -o "$B/licenses/model-apache-2.0.txt"
  printf 'Model: haywoodsloan/ai-image-detector-deploy\nRevision: %s\nLicense: Apache-2.0\nRuntime: onnxruntime-web 1.20.1 (MIT)\n' "$AIR_MODEL_REVISION" > "$B/licenses/NOTICE.txt"
  (cd "$B/model" && split -b 45m -d -a 1 "$W/q.onnx" part)
  [ "$(ls "$B/model" | wc -l)" = 5 ] || { echo "model part count changed; update PARTS in ai-frame.js"; exit 1; }
  rm -f /tmp/ai-video-radar.zip
  python3 - "$B" /tmp/ai-video-radar.zip <<'EOF'
import pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2], 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file(): z.write(p, p.relative_to(root))
EOF
  ls -la /tmp/ai-video-radar.zip
fi
