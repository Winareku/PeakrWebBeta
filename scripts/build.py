#!/usr/bin/env python3
"""
build.py – Construir extensiones para Chrome, Firefox y Opera
Copia src/ a dist/{target}, renombra el manifiesto correcto,
y limpia archivos innecesarios para cada plataforma.
"""
import sys
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

TARGETS = {
    "chromium": "manifest.chromium.json",
    "opera": "manifest.opera.json",
    "firefox": "manifest.firefox.json"
}

def build_target(name, manifest_file):
    """Construir extensión para una plataforma específica."""
    target_dir = DIST / name
    print(f"Construyendo {name}...")

    if target_dir.exists():
        shutil.rmtree(target_dir)

    # 1. Copiar todo el código fuente
    shutil.copytree(SRC, target_dir)

    # 2. Asignar el manifiesto correcto
    manifest_src = target_dir / "manifests" / manifest_file
    manifest_dst = target_dir / "manifest.json"
    shutil.copy2(manifest_src, manifest_dst)

    # 3. Limpiar carpeta de manifiestos
    shutil.rmtree(target_dir / "manifests")

    # 4. Eliminar backgrounds de otras plataformas (para evitar linters)
    background_dir = target_dir / "background"
    if background_dir.exists():
        for script in background_dir.iterdir():
            if script.name != f"{name}.js" and script.is_file():
                script.unlink()
        # Renombrar el script correcto a un nombre genérico si es necesario
        correct_script = background_dir / f"{name}.js"
        if correct_script.exists():
            generic_script = background_dir / "background.js"
            shutil.move(str(correct_script), str(generic_script))

    # 5. Actualizar las referencias en manifest.json si es necesario
    manifest_path = target_dir / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest_content = f.read()
        # Actualizar referencia del background script si existe
        manifest_content = manifest_content.replace(
            f"background/{name}.js",
            "background/background.js"
        )
        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(manifest_content)

    print(f"✓ Completado: {name}")

def main():
    """Construir todas las plataformas."""
    DIST.mkdir(exist_ok=True)
    for name, manifest in TARGETS.items():
        build_target(name, manifest)
    print("\n✓ Todas las builds finalizadas exitosamente.")

if __name__ == "__main__":
    main()
