"""Validate complete release archives, including every offline model part."""
import json
import pathlib
import sys
import zipfile

for path in map(pathlib.Path, sys.argv[1:]):
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        assert not any('.git' in pathlib.PurePosixPath(n).parts for n in names)
        manifest = json.loads(archive.read('manifest.json'))
        assert manifest['manifest_version'] == 3
        required = ['ai-frame.html', 'ai-frame.js', 'ort/ort.wasm.min.js',
                    'ort/ort-wasm-simd-threaded.mjs', 'ort/ort-wasm-simd-threaded.wasm']
        required += [f'model/part{i}' for i in range(5)]
        required += [manifest['action']['default_popup']]
        for script in manifest['content_scripts']:
            required += script['js'] + script['css']
        for name in required:
            assert name in names, f'{path}: missing {name}'
            assert archive.getinfo(name).file_size > 0, f'{path}: empty {name}'
        assert archive.testzip() is None, f'{path}: corrupt ZIP'
        if 'firefox' in path.name:
            assert manifest['browser_specific_settings']['gecko']['data_collection_permissions']['required'] == ['none']
        elif any(target in path.name for target in ['chromium', 'safari']):
            assert 'browser_specific_settings' not in manifest
        print(f'OK: {path.name}, version {manifest["version"]}, offline model bundled')