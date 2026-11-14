#!/bin/bash
# Start / stop CrystalBudget local Vite server (http://127.0.0.1:8080)

set -euo pipefail

# AppleScript "do shell script" often inherits a dead cwd → npm fails with uv_cwd EPERM.
cd "${HOME}" 2>/dev/null || cd / || true

PROJECT_DIR="/Users/gena/Documents/cb_v2"
PORT=8080
HOST="127.0.0.1"
SUPPORT_DIR="${HOME}/Library/Application Support/CrystalBudget"
NODE_DIR="${SUPPORT_DIR}/node"
PID_FILE="${SUPPORT_DIR}/dev-server.pid"
LOG_FILE="${SUPPORT_DIR}/dev-server.log"
NODE_VERSION="v24.21.0"
NODE_ARCH="darwin-arm64"
NODE_TARBALL="node-${NODE_VERSION}-${NODE_ARCH}.tar.gz"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_TARBALL}"

mkdir -p "${SUPPORT_DIR}"
cd "${SUPPORT_DIR}"

ensure_node() {
  if [[ -x "${NODE_DIR}/bin/node" ]]; then
    export PATH="${NODE_DIR}/bin:${PATH}"
    return 0
  fi

  # Prefer a durable copy over /tmp (vanishes between reboots)
  if [[ -x /tmp/node-local/node/bin/node ]]; then
    echo "Копирую Node из /tmp в Application Support…"
    rm -rf "${NODE_DIR}"
    mkdir -p "${SUPPORT_DIR}"
    cp -R /tmp/node-local/node "${NODE_DIR}"
    export PATH="${NODE_DIR}/bin:${PATH}"
    return 0
  fi

  if command -v node >/dev/null 2>&1; then
    return 0
  fi

  echo "Скачиваю Node ${NODE_VERSION}…"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "${NODE_URL}" -o "${tmp}/${NODE_TARBALL}"
  tar -xzf "${tmp}/${NODE_TARBALL}" -C "${tmp}"
  rm -rf "${NODE_DIR}"
  mv "${tmp}/node-${NODE_VERSION}-${NODE_ARCH}" "${NODE_DIR}"
  rm -rf "${tmp}"
  export PATH="${NODE_DIR}/bin:${PATH}"
}

is_running() {
  if [[ -f "${PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      return 0
    fi
  fi
  lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1
}

current_pid() {
  if [[ -f "${PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      echo "${pid}"
      return 0
    fi
  fi
  lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null | head -n 1
}

cmd_status() {
  if is_running; then
    echo "running $(current_pid)"
  else
    echo "stopped"
  fi
}

cmd_start() {
  if is_running; then
    echo "Уже запущено (pid $(current_pid)) → http://${HOST}:${PORT}"
    return 0
  fi

  ensure_node

  if [[ ! -d "${PROJECT_DIR}" ]]; then
    echo "Не найден проект: ${PROJECT_DIR}" >&2
    return 1
  fi
  if ! cat "${PROJECT_DIR}/package.json" >/dev/null 2>&1 || ! (cd "${PROJECT_DIR}" && pwd -P >/dev/null 2>&1); then
    echo "NO_DOCUMENTS_ACCESS" >&2
    return 3
  fi

  cd "${PROJECT_DIR}"

  if [[ ! -d node_modules ]]; then
    echo "Ставлю зависимости…"
    npm install
  fi

  : > "${LOG_FILE}"
  # Keep cwd locked to the project for the whole process tree
  nohup env -u npm_config_prefix \
    npm run dev -- --host "${HOST}" --port "${PORT}" \
    >>"${LOG_FILE}" 2>&1 &
  local pid=$!
  echo "${pid}" > "${PID_FILE}"

  local i
  for i in $(seq 1 40); do
    if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Запущено → http://${HOST}:${PORT}"
      return 0
    fi
    if ! kill -0 "${pid}" 2>/dev/null; then
      echo "Не удалось запустить. Лог: ${LOG_FILE}" >&2
      tail -n 40 "${LOG_FILE}" >&2 || true
      rm -f "${PID_FILE}"
      return 1
    fi
    sleep 0.25
  done

  echo "Процесс жив, порт ещё открывается… http://${HOST}:${PORT}"
  echo "Лог: ${LOG_FILE}"
}

cmd_stop() {
  cd "${HOME}" 2>/dev/null || cd / || true

  if [[ -f "${PID_FILE}" ]]; then
    local pid
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
      sleep 0.4
      if kill -0 "${pid}" 2>/dev/null; then
        kill -9 "${pid}" 2>/dev/null || true
      fi
    fi
    rm -f "${PID_FILE}"
  fi

  local pids
  pids="$(lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "${pids}" | while read -r p; do
      [[ -n "${p}" ]] || continue
      kill "${p}" 2>/dev/null || true
      sleep 0.2
      kill -9 "${p}" 2>/dev/null || true
    done
  fi

  pkill -f "${PROJECT_DIR}.*vite" 2>/dev/null || true
  echo "Остановлено"
}

cmd_open() {
  open "http://${HOST}:${PORT}/"
}

case "${1:-}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  restart) cmd_stop; cmd_start ;;
  open) cmd_open ;;
  *) echo "Usage: $0 {start|stop|status|restart|open}"; exit 1 ;;
esac
