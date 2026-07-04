"""
app.py – Servidor Flask para Peakr (versión self-hosted multiusuario)
====================================================================
Persiste los datos de forma aislada por usuario en la carpeta user_data/
"""

import json
import os
import logging
import requests
from flask import Flask, jsonify, request, send_from_directory

# ── Configuración ──────────────────────────────────────────────────────────────

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR    = os.path.join(BASE_DIR, "static")
USER_DATA_DIR = os.path.join(BASE_DIR, "user_data")

# Asegurar que la carpeta de datos de usuarios exista en tu PC
os.makedirs(USER_DATA_DIR, exist_ok=True)

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


# ── Helpers de persistencia por Usuario ────────────────────────────────────────

def get_user_file(username: str) -> str:
    """Sanitiza el nombre de usuario y devuelve la ruta de su archivo JSON."""
    # Filtra caracteres para prevenir vulnerabilidades de path traversal
    safe_username = "".join([c for c in username if c.isalnum() or c in ('_', '-')]).strip()
    if not safe_username:
        safe_username = "default"
    return os.path.join(USER_DATA_DIR, f"data_{safe_username}.json")


def load_user_data(username: str) -> dict:
    """Lee el JSON específico de un usuario. Devuelve {'songs': []} si es nuevo."""
    user_file = get_user_file(username)
    if os.path.exists(user_file):
        try:
            with open(user_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log.error("Error leyendo datos del usuario %s: %s", username, e)
    return {"songs": []}


def save_user_data(username: str, data: dict) -> bool:
    """Persiste los datos en el JSON del usuario correspondiente."""
    user_file = get_user_file(username)
    try:
        with open(user_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        log.error("Error guardando datos del usuario %s: %s", username, e)
        return False


# ── Rutas de la Aplicación y API ──────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/songs", methods=["GET"])
def api_get_songs():
    """Devuelve las canciones del usuario especificado en la cabecera 'X-User'."""
    username = request.headers.get("X-User", "default").strip()
    log.info("Cargando biblioteca para el usuario: '%s'", username)
    return jsonify(load_user_data(username))


@app.route("/api/songs", methods=["POST"])
def api_post_songs():
    """Guarda la biblioteca del usuario especificado en la cabecera 'X-User'."""
    username = request.headers.get("X-User", "default").strip()
    data = request.get_json()
    
    if not data or "songs" not in data:
        return jsonify({"error": "Formato inválido. Debe contener la lista 'songs'."}), 400

    if save_user_data(username, data):
        log.info("Biblioteca de '%s' actualizada. Total canciones: %d", username, len(data["songs"]))
        return jsonify({"success": True, "saved": len(data["songs"])})
    return jsonify({"error": "No se pudieron persistir los datos en el servidor"}), 500


@app.route("/api/songs", methods=["DELETE"])
def api_delete_songs():
    """Limpia la biblioteca del usuario de la cabecera 'X-User'."""
    username = request.headers.get("X-User", "default").strip()
    if save_user_data(username, {"songs": []}):
        log.info("Biblioteca del usuario '%s' reseteada por completo.", username)
        return jsonify({"success": True, "message": f"Biblioteca de {username} eliminada"})
    return jsonify({"error": "No se pudo limpiar la biblioteca"}), 500


# ── Proxy Deezer (Inalterado para evitar CORS) ───────────────────────────────

DEEZER_API = "https://api.deezer.com/search"
DEEZER_TIMEOUT = 6

@app.route("/api/deezer/search", methods=["GET"])
def api_deezer_search():
    q     = request.args.get("q", "").strip()
    limit = request.args.get("limit", "1")

    if not q:
        return jsonify({"error": "El parámetro 'q' es obligatorio"}), 400

    try:
        r = requests.get(DEEZER_API, params={"q": q, "limit": limit}, timeout=DEEZER_TIMEOUT)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        log.error("Error en Deezer proxy: %s", e)
        return jsonify({"error": "No se pudo contactar con Deezer"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)