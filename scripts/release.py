#!/usr/bin/env python3
"""
release.py – Orquestar build y compresión para publicación
Ejecuta build.py y genera archivos ZIP listos para las tiendas web.
"""
import subprocess
import sys
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
TARGETS = ["chromium", "opera", "firefox"]

def main():
    """Ejecutar build y crear releases comprimidos."""
    # 1. Ejecutar build.py
    print("═" * 60)
    print("Iniciando proceso de Build...")
    print("═" * 60)
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "build.py")],
        check=False
    )
    if result.returncode != 0:
        print("\n✗ Error durante el build. Abortando.")
        sys.exit(1)
    
    # 2. Comprimir cada plataforma
    print("\n" + "═" * 60)
    print("Empaquetando releases (ZIP)...")
    print("═" * 60)
    for target in TARGETS:
        target_dir = DIST / target
        if target_dir.exists():
            zip_path = str(DIST / target)
            shutil.make_archive(zip_path, 'zip', target_dir)
            zip_file = f"{zip_path}.zip"
            print(f"✓ Generado: {zip_file}")

    print("\n" + "═" * 60)
    print("✓ ¡Release finalizado con éxito!")
    print("═" * 60)
    print(f"\nArchivos listos para publicar en: {DIST}/")

if __name__ == "__main__":
    main()
