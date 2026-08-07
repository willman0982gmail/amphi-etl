#!/usr/bin/env bash
# Build, install, and start Amphi against JupyterLab 4.5.9.
#
# Mirrors docs/build-install-jupyterlab-4.5.9.md:
#   1) create/activate .venv (unless --no-venv)
#   2) install JupyterLab 4.5.9 + runtime deps
#   3) jlpm (fallback: npm) install + build:prod
#   4) build & install jupyterlab-amphi, then amphi-scheduler
#   5) start JupyterLab (unless --no-start)
#
# Usage:
#   ./scripts/build-install-jupyterlab-4.5.9.sh [options]
#
# Options:
#   --no-venv              Use the current Python env (skip .venv create/activate)
#   --no-start             Build & install only; do not launch JupyterLab
#   --notebook-dir DIR     Workspace for jupyter lab (default: <repo>/examples)
#   --port PORT            JupyterLab port (default: 8888)
#   --npm-registry URL     Set Yarn/npm registry (corporate Artifactory npm mirror)
#   --non-editable         pip install . instead of pip install -e .
#   -h, --help             Show this help

set -euo pipefail

JUPYTERLAB_VERSION="4.5.9"
VENV_DIR=".venv"
USE_VENV=1
START_LAB=1
EDITABLE=1
NOTEBOOK_DIR=""
PORT="8888"
NPM_REGISTRY=""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

usage() {
  awk '
    NR == 1 { next }
    /^#/ {
      sub(/^# ?/, "")
      print
      next
    }
    { exit }
  ' "$0"
}

log()  { printf '\n==> %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-venv)       USE_VENV=0; shift ;;
    --no-start)      START_LAB=0; shift ;;
    --non-editable)  EDITABLE=0; shift ;;
    --notebook-dir)  NOTEBOOK_DIR="${2:-}"; shift 2 ;;
    --port)          PORT="${2:-}"; shift 2 ;;
    --npm-registry)  NPM_REGISTRY="${2:-}"; shift 2 ;;
    -h|--help)       usage; exit 0 ;;
    *)               die "Unknown option: $1 (try --help)" ;;
  esac
done

if [[ -z "${NOTEBOOK_DIR}" ]]; then
  NOTEBOOK_DIR="${REPO_ROOT}/examples"
fi

cd "${REPO_ROOT}"

# ---------------------------------------------------------------------------
# 1) Virtualenv
# ---------------------------------------------------------------------------
if [[ "${USE_VENV}" -eq 1 ]]; then
  if [[ ! -d "${REPO_ROOT}/${VENV_DIR}" ]]; then
    log "Creating virtualenv ${REPO_ROOT}/${VENV_DIR}"
    if have python3; then
      python3 -m venv "${REPO_ROOT}/${VENV_DIR}"
    elif have python; then
      python -m venv "${REPO_ROOT}/${VENV_DIR}"
    else
      die "python3/python not found"
    fi
  else
    log "Reusing existing virtualenv ${REPO_ROOT}/${VENV_DIR}"
  fi
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/${VENV_DIR}/bin/activate"
else
  log "Skipping venv (--no-venv); using $(command -v python || command -v python3)"
fi

if have python; then
  PYTHON=python
elif have python3; then
  PYTHON=python3
else
  die "python not found in PATH"
fi

log "Python: $(${PYTHON} -V) ($(command -v "${PYTHON}"))"

# ---------------------------------------------------------------------------
# 2) JupyterLab + build/runtime tooling
# ---------------------------------------------------------------------------
log "Upgrading pip / setuptools / wheel / build"
${PYTHON} -m pip install --upgrade pip setuptools wheel build

log "Installing JupyterLab == ${JUPYTERLAB_VERSION}"
${PYTHON} -m pip install "jupyterlab==${JUPYTERLAB_VERSION}"

log "Installing optional JupyterLab companions (best-effort)"
${PYTHON} -m pip install 'jupyterlab-git==0.52.0' 'jupyterlab-lsp==5.1.0' openpyxl || true

JL_VER="$(${PYTHON} -m jupyter lab --version 2>/dev/null || true)"
[[ "${JL_VER}" == "${JUPYTERLAB_VERSION}" ]] \
  || die "Expected JupyterLab ${JUPYTERLAB_VERSION}, got: ${JL_VER:-unknown}"
log "JupyterLab ${JL_VER} OK"

# ---------------------------------------------------------------------------
# JS package manager: prefer jlpm, fall back to npm
# ---------------------------------------------------------------------------
resolve_js_pm() {
  if have jlpm; then
    JS_PM=jlpm
  elif have npm; then
    JS_PM=npm
    printf 'WARNING: jlpm not found; falling back to npm\n' >&2
    printf '         (Yarn Berry workspaces / yarn.lock may need jlpm.)\n' >&2
  else
    die "Neither jlpm nor npm found. Install JupyterLab (for jlpm) or Node.js (for npm)."
  fi
  log "Using JS package manager: ${JS_PM} ($(command -v "${JS_PM}"))"
}

js_install() {
  if [[ "${JS_PM}" == "jlpm" ]]; then
    # Allow lockfile refresh when corporate mirrors change package metadata
    YARN_ENABLE_IMMUTABLE_INSTALLS="${YARN_ENABLE_IMMUTABLE_INSTALLS:-false}" jlpm install
  else
    npm install
  fi
}

js_build_prod() {
  if [[ "${JS_PM}" == "jlpm" ]]; then
    jlpm run build:prod
  else
    npm run build:prod
  fi
}

configure_npm_registry() {
  local dir="$1"
  [[ -z "${NPM_REGISTRY}" ]] && return 0

  log "Configuring npm registry in ${dir}: ${NPM_REGISTRY}"
  if [[ "${JS_PM}" == "jlpm" ]]; then
    (
      cd "${dir}"
      # Project-level Yarn Berry config (do not commit secrets)
      if [[ -f .yarnrc.yml ]]; then
        if grep -q '^npmRegistryServer:' .yarnrc.yml; then
          # portable in-place replace
          tmp="$(mktemp)"
          sed "s|^npmRegistryServer:.*|npmRegistryServer: \"${NPM_REGISTRY}\"|" .yarnrc.yml >"${tmp}"
          mv "${tmp}" .yarnrc.yml
        else
          printf '\nnpmRegistryServer: "%s"\n' "${NPM_REGISTRY}" >>.yarnrc.yml
        fi
      else
        printf 'nodeLinker: node-modules\nnpmRegistryServer: "%s"\n' "${NPM_REGISTRY}" >.yarnrc.yml
      fi
    )
  else
    (
      cd "${dir}"
      npm config set registry "${NPM_REGISTRY}" --location=project
    )
  fi
}

pip_install_reqs_without_dot() {
  # requirements.txt often ends with "." which would trigger hatch/jlpm too early.
  local reqs="$1"
  if [[ ! -f "${reqs}" ]]; then
    return 0
  fi
  local filtered
  filtered="$(mktemp)"
  # Drop blank lines, comments, and a lone "." package self-reference
  grep -vE '^\s*($|#|\.$)' "${reqs}" >"${filtered}" || true
  if [[ -s "${filtered}" ]]; then
    ${PYTHON} -m pip install -r "${filtered}"
  fi
  rm -f "${filtered}"
}

pip_install_package() {
  if [[ "${EDITABLE}" -eq 1 ]]; then
    ${PYTHON} -m pip install -e .
  else
    ${PYTHON} -m pip install .
  fi
}

build_and_install_pkg() {
  local name="$1"
  local dir="${REPO_ROOT}/${name}"

  [[ -d "${dir}" ]] || die "Missing package directory: ${dir}"
  log "Building & installing ${name}"
  cd "${dir}"

  configure_npm_registry "${dir}"
  pip_install_reqs_without_dot requirements.txt

  js_install || die "${name}: JS install failed — fix npm registry/proxy before pip install (see docs §4)"
  js_build_prod || die "${name}: build:prod failed"
  pip_install_package

  cd "${REPO_ROOT}"
  log "${name} installed"
}

# ---------------------------------------------------------------------------
# 3–4) Build + install packages (amphi first, then scheduler)
# ---------------------------------------------------------------------------
resolve_js_pm
have node || die "Node.js is required for frontend builds"
log "Node: $(node -v)"

build_and_install_pkg "jupyterlab-amphi"
# Re-resolve after amphi install (jlpm may appear only after jupyterlab is on PATH)
resolve_js_pm
build_and_install_pkg "amphi-scheduler"

# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------
log "Verifying installation"
${PYTHON} -m pip show jupyterlab jupyterlab-amphi amphi-scheduler | grep -E '^(Name|Version):' || true
${PYTHON} -m jupyter labextension list 2>&1 | grep -E '@amphi/|JupyterLab v' || true
${PYTHON} -m jupyter server extension list 2>&1 | grep -E 'pipeline_scheduler|jupyterlab ' || true

# ---------------------------------------------------------------------------
# 5) Start JupyterLab
# ---------------------------------------------------------------------------
if [[ "${START_LAB}" -eq 1 ]]; then
  mkdir -p "${NOTEBOOK_DIR}"
  log "Starting JupyterLab ${JUPYTERLAB_VERSION}"
  log "  notebook-dir: ${NOTEBOOK_DIR}"
  log "  port:         ${PORT}"
  exec ${PYTHON} -m jupyter lab \
    --notebook-dir="${NOTEBOOK_DIR}" \
    --ContentManager.allow_hidden=True \
    --port="${PORT}"
else
  log "Build & install complete (--no-start). To launch:"
  printf '  source %s/bin/activate\n' "${REPO_ROOT}/${VENV_DIR}"
  printf '  jupyter lab --notebook-dir=%s --ContentManager.allow_hidden=True --port=%s\n' \
    "${NOTEBOOK_DIR}" "${PORT}"
fi
