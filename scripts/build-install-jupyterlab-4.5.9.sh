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
#   --python PATH          Python interpreter used to create .venv (must be >= 3.10)
#   --recreate-venv        Delete and recreate .venv even if it already exists
#   --non-editable         pip install . instead of pip install -e .
#   --ca-bundle PATH       PEM CA bundle for SSL (SSL_CERT_FILE / REQUESTS_CA_BUNDLE)
#   --corp-ca PATH         Append corporate root CA PEM to certifi (TLS inspection / Artifactory)
#   --readonly-extensions  Start Lab with LabApp.extension_manager=readonly (no PyPI fetch)
#   -h, --help             Show this help
#
# Note: jupyterlab-amphi/requirements.txt pins matplotlib==3.10.8 which requires
# Python >= 3.10. The script refuses Python 3.9 and prefers 3.11–3.13 when available.
#
# SSL: JupyterLab's Extension Manager uses httpx against PyPI. Missing macOS / corp
# CAs cause: SSL: CERTIFICATE_VERIFY_FAILED ... unable to get local issuer certificate.
# This script installs certifi, exports SSL_CERT_FILE, and can merge a corp CA.

set -euo pipefail

JUPYTERLAB_VERSION="4.5.9"
MIN_PY_MAJOR=3
MIN_PY_MINOR=10
VENV_DIR=".venv"
USE_VENV=1
START_LAB=1
EDITABLE=1
RECREATE_VENV=0
NOTEBOOK_DIR=""
PORT="8888"
NPM_REGISTRY=""
PYTHON_BIN=""
CA_BUNDLE=""
CORP_CA=""
READONLY_EXTENSIONS=0
LAB_EXTRA_ARGS=()

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Non-interactive shells (CI / IDE agents) often omit Homebrew /usr/local from PATH.
export PATH="/usr/local/bin:/opt/homebrew/bin:${HOME}/miniconda3/bin:${HOME}/anaconda3/bin:${PATH}"

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

# Print "major.minor" for an interpreter, or empty on failure.
py_version() {
  local bin="$1"
  "$bin" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null || true
}

# Return 0 if $1 (major.minor) >= MIN_PY_MAJOR.MIN_PY_MINOR
py_version_ok() {
  local ver="$1"
  [[ -n "${ver}" ]] || return 1
  local major minor
  major="${ver%%.*}"
  minor="${ver#*.}"
  minor="${minor%%.*}"
  if (( major > MIN_PY_MAJOR )); then
    return 0
  fi
  if (( major == MIN_PY_MAJOR && minor >= MIN_PY_MINOR )); then
    return 0
  fi
  return 1
}

# Prefer an explicit --python, else newest available 3.13→3.10, else python3/python if new enough.
# Also probes common Homebrew / Miniconda / Anaconda prefixes when not on PATH.
resolve_python_for_venv() {
  if [[ -n "${PYTHON_BIN}" ]]; then
    have "${PYTHON_BIN}" || [[ -x "${PYTHON_BIN}" ]] \
      || die "--python '${PYTHON_BIN}' not found or not executable"
    local ver
    ver="$(py_version "${PYTHON_BIN}")"
    py_version_ok "${ver}" \
      || die "--python '${PYTHON_BIN}' is Python ${ver:-unknown}; need >= ${MIN_PY_MAJOR}.${MIN_PY_MINOR} (matplotlib==3.10.8)"
    printf '%s\n' "${PYTHON_BIN}"
    return 0
  fi

  local candidate ver path
  local -a candidates=()

  for candidate in python3.13 python3.12 python3.11 python3.10 python3 python; do
    if have "${candidate}"; then
      candidates+=("$(command -v "${candidate}")")
    fi
  done

  for path in \
      "${HOME}/miniconda3/bin" \
      "${HOME}/anaconda3/bin" \
      "/opt/homebrew/bin" \
      "/usr/local/bin"; do
    for candidate in python3.13 python3.12 python3.11 python3.10; do
      if [[ -x "${path}/${candidate}" ]]; then
        candidates+=("${path}/${candidate}")
      fi
    done
  done

  # Deduplicate while preserving order
  local -a unique=()
  local c u seen
  for c in "${candidates[@]}"; do
    seen=0
    for u in "${unique[@]+"${unique[@]}"}"; do
      [[ "${u}" == "${c}" ]] && seen=1 && break
    done
    [[ "${seen}" -eq 0 ]] && unique+=("${c}")
  done

  for candidate in "${unique[@]+"${unique[@]}"}"; do
    ver="$(py_version "${candidate}")"
    if py_version_ok "${ver}"; then
      printf '%s\n' "${candidate}"
      return 0
    fi
    printf 'WARNING: skipping %s (Python %s < %s.%s)\n' \
      "${candidate}" "${ver:-unknown}" "${MIN_PY_MAJOR}" "${MIN_PY_MINOR}" >&2
  done

  die "No Python >= ${MIN_PY_MAJOR}.${MIN_PY_MINOR} found. Install 3.10+ (e.g. python3.11/3.12/3.13) or pass --python /path/to/python. macOS /usr/bin/python3 is often 3.9 and cannot install matplotlib==3.10.8."
}

require_active_python() {
  local ver
  ver="$(py_version "${PYTHON}")"
  py_version_ok "${ver}" || die \
    "Active Python is ${ver:-unknown} ($(command -v "${PYTHON}")). Need >= ${MIN_PY_MAJOR}.${MIN_PY_MINOR} because jupyterlab-amphi pins matplotlib==3.10.8.
Fix:
  rm -rf ${REPO_ROOT}/${VENV_DIR}
  ./scripts/build-install-jupyterlab-4.5.9.sh --recreate-venv
Or:
  ./scripts/build-install-jupyterlab-4.5.9.sh --python \$(command -v python3.13)"
}

# Install certifi and export SSL_* so httpx/requests (JupyterLab Extension Manager → PyPI)
# and pip do not fail with CERTIFICATE_VERIFY_FAILED on macOS / corp TLS inspection.
configure_ssl() {
  log "Configuring SSL CA certificates (certifi)"
  ${PYTHON} -m pip install --upgrade certifi >/dev/null

  local certifi_pem combined
  certifi_pem="$(${PYTHON} -c 'import certifi; print(certifi.where())')"
  [[ -f "${certifi_pem}" ]] || die "certifi CA bundle not found at ${certifi_pem}"

  # Honor CLI / env overrides (CORP_CA_FILE is a common corp convention)
  if [[ -z "${CORP_CA}" && -n "${CORP_CA_FILE:-}" ]]; then
    CORP_CA="${CORP_CA_FILE}"
  fi
  if [[ -z "${CA_BUNDLE}" && -n "${SSL_CERT_FILE:-}" && -f "${SSL_CERT_FILE}" ]]; then
    # Keep an explicitly pre-set SSL_CERT_FILE unless --ca-bundle/--corp-ca requested
    if [[ -z "${CORP_CA}" ]]; then
      log "Using existing SSL_CERT_FILE=${SSL_CERT_FILE}"
      export REQUESTS_CA_BUNDLE="${SSL_CERT_FILE}"
      export CURL_CA_BUNDLE="${SSL_CERT_FILE}"
      export NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-${SSL_CERT_FILE}}"
      return 0
    fi
  fi

  if [[ -n "${CA_BUNDLE}" ]]; then
    [[ -f "${CA_BUNDLE}" ]] || die "--ca-bundle not found: ${CA_BUNDLE}"
    combined="${CA_BUNDLE}"
  elif [[ -n "${CORP_CA}" ]]; then
    [[ -f "${CORP_CA}" ]] || die "--corp-ca / CORP_CA_FILE not found: ${CORP_CA}"
    combined="${REPO_ROOT}/${VENV_DIR}/amphi-ca-bundle.pem"
    mkdir -p "$(dirname "${combined}")"
    cat "${certifi_pem}" "${CORP_CA}" >"${combined}"
    log "Merged certifi + corp CA → ${combined}"
  else
    combined="${certifi_pem}"
  fi

  export SSL_CERT_FILE="${combined}"
  export REQUESTS_CA_BUNDLE="${combined}"
  export CURL_CA_BUNDLE="${combined}"
  # Helps Node/jlpm when corp TLS inspection is present
  export NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-${combined}}"

  log "SSL_CERT_FILE=${SSL_CERT_FILE}"

  # Quick sanity check (non-fatal): can we verify a public TLS endpoint?
  if ! ${PYTHON} -c 'import urllib.request; urllib.request.urlopen("https://pypi.org/simple/pip/", timeout=10)' >/dev/null 2>&1; then
    printf 'WARNING: TLS check to pypi.org failed. Extension Manager may still error with\n' >&2
    printf '         CERTIFICATE_VERIFY_FAILED. Pass --corp-ca /path/to/corp-root.pem\n' >&2
    printf '         or start with --readonly-extensions to avoid PyPI metadata fetches.\n' >&2
  else
    log "TLS check to pypi.org OK"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-venv)       USE_VENV=0; shift ;;
    --no-start)      START_LAB=0; shift ;;
    --non-editable)  EDITABLE=0; shift ;;
    --recreate-venv) RECREATE_VENV=1; shift ;;
    --readonly-extensions) READONLY_EXTENSIONS=1; shift ;;
    --notebook-dir)  NOTEBOOK_DIR="${2:-}"; shift 2 ;;
    --port)          PORT="${2:-}"; shift 2 ;;
    --npm-registry)  NPM_REGISTRY="${2:-}"; shift 2 ;;
    --python)        PYTHON_BIN="${2:-}"; shift 2 ;;
    --ca-bundle)     CA_BUNDLE="${2:-}"; shift 2 ;;
    --corp-ca)       CORP_CA="${2:-}"; shift 2 ;;
    -h|--help)       usage; exit 0 ;;
    *)               die "Unknown option: $1 (try --help)" ;;
  esac
done

if [[ -z "${NOTEBOOK_DIR}" ]]; then
  NOTEBOOK_DIR="${REPO_ROOT}/examples"
fi

cd "${REPO_ROOT}"

# ---------------------------------------------------------------------------
# 1) Virtualenv (Python >= 3.10 required)
# ---------------------------------------------------------------------------
if [[ "${USE_VENV}" -eq 1 ]]; then
  VENV_PYTHON="$(resolve_python_for_venv)"
  log "Selected Python for venv: ${VENV_PYTHON} ($(py_version "${VENV_PYTHON}"))"

  if [[ "${RECREATE_VENV}" -eq 1 && -d "${REPO_ROOT}/${VENV_DIR}" ]]; then
    log "Removing existing ${REPO_ROOT}/${VENV_DIR} (--recreate-venv)"
    rm -rf "${REPO_ROOT}/${VENV_DIR}"
  fi

  if [[ -d "${REPO_ROOT}/${VENV_DIR}" ]]; then
    existing_py="${REPO_ROOT}/${VENV_DIR}/bin/python"
    existing_ver="$(py_version "${existing_py}")"
    if ! py_version_ok "${existing_ver}"; then
      log "Existing .venv uses Python ${existing_ver:-unknown} (< ${MIN_PY_MAJOR}.${MIN_PY_MINOR}); recreating with ${VENV_PYTHON}"
      rm -rf "${REPO_ROOT}/${VENV_DIR}"
    else
      log "Reusing existing virtualenv ${REPO_ROOT}/${VENV_DIR} (Python ${existing_ver})"
    fi
  fi

  if [[ ! -d "${REPO_ROOT}/${VENV_DIR}" ]]; then
    log "Creating virtualenv ${REPO_ROOT}/${VENV_DIR} with ${VENV_PYTHON}"
    "${VENV_PYTHON}" -m venv "${REPO_ROOT}/${VENV_DIR}"
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

require_active_python
log "Python: $(${PYTHON} -V) ($(command -v "${PYTHON}"))"

# ---------------------------------------------------------------------------
# 2) JupyterLab + build/runtime tooling
# ---------------------------------------------------------------------------
log "Upgrading pip / setuptools / wheel / build"
${PYTHON} -m pip install --upgrade pip setuptools wheel build

# SSL before further network installs / Lab start (fixes Extension Manager PyPI TLS errors)
configure_ssl

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
  # Also drop jupyterlab / notebook range pins that can pull JL past 4.5.9.
  local reqs="$1"
  if [[ ! -f "${reqs}" ]]; then
    return 0
  fi
  local filtered
  filtered="$(mktemp)"
  # Drop blank lines, comments, a lone "." self-reference, and jupyterlab/notebook constraints
  grep -vE '^\s*($|#|\.$|(jupyterlab|notebook)([<>=!~]=|[<>=]))' "${reqs}" >"${filtered}" || true
  if [[ -s "${filtered}" ]]; then
    ${PYTHON} -m pip install -r "${filtered}"
  fi
  rm -f "${filtered}"
  # Keep the exact JupyterLab version + a notebook line compatible with it
  ${PYTHON} -m pip install "jupyterlab==${JUPYTERLAB_VERSION}" 'notebook>=7.4.0,<7.6'
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
if [[ "${READONLY_EXTENSIONS}" -eq 1 ]]; then
  LAB_EXTRA_ARGS+=(--LabApp.extension_manager=readonly)
fi

if [[ "${START_LAB}" -eq 1 ]]; then
  mkdir -p "${NOTEBOOK_DIR}"
  # Re-apply SSL in case pip upgraded certifi during package installs
  configure_ssl
  log "Starting JupyterLab ${JUPYTERLAB_VERSION}"
  log "  notebook-dir: ${NOTEBOOK_DIR}"
  log "  port:         ${PORT}"
  log "  SSL_CERT_FILE=${SSL_CERT_FILE:-<unset>}"
  if [[ "${READONLY_EXTENSIONS}" -eq 1 ]]; then
    log "  extension_manager=readonly (skips PyPI Extension Manager fetches)"
  fi
  exec ${PYTHON} -m jupyter lab \
    --notebook-dir="${NOTEBOOK_DIR}" \
    --ContentManager.allow_hidden=True \
    --port="${PORT}" \
    "${LAB_EXTRA_ARGS[@]+"${LAB_EXTRA_ARGS[@]}"}"
else
  log "Build & install complete (--no-start). To launch:"
  printf '  source %s/bin/activate\n' "${REPO_ROOT}/${VENV_DIR}"
  printf '  export SSL_CERT_FILE="$(python -c '\''import certifi; print(certifi.where())'\'')"\n'
  printf '  export REQUESTS_CA_BUNDLE="$SSL_CERT_FILE" CURL_CA_BUNDLE="$SSL_CERT_FILE"\n'
  if [[ -n "${CORP_CA}" ]]; then
    printf '  # or use merged bundle:\n'
    printf '  # export SSL_CERT_FILE=%s/%s/amphi-ca-bundle.pem\n' "${REPO_ROOT}" "${VENV_DIR}"
  fi
  printf '  jupyter lab --notebook-dir=%s --ContentManager.allow_hidden=True --port=%s' \
    "${NOTEBOOK_DIR}" "${PORT}"
  if [[ "${READONLY_EXTENSIONS}" -eq 1 ]]; then
    printf ' --LabApp.extension_manager=readonly'
  fi
  printf '\n'
  printf '  # If Extension Manager still fails TLS: add --corp-ca /path/to/corp-root.pem\n'
  printf '  # or --readonly-extensions\n'
fi
