#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy/setup-github-secrets.sh \
    --repo <owner/repo> \
    --deploy-host <host> \
    --deploy-user <user> \
    --deploy-path <path> \
    --ssh-key-path <path_to_private_key> \
    [--deploy-port <port>] \
    [--env-file <path_to_env_file>] \
    [--prod-wechat-app-id <appid>] \
    [--prod-wechat-app-secret <appsecret>] \
    [--prod-wechat-token <token>] \
    [--prod-wechat-aes-key <encoding_aes_key>]

Required secrets that will be set:
  DEPLOY_HOST
  DEPLOY_USER
  DEPLOY_SSH_KEY
  DEPLOY_PATH

Optional:
  DEPLOY_PORT
  DEPLOY_ENV_B64 (derived from --env-file)
  PROD_WECHAT_OA_APP_ID
  PROD_WECHAT_OA_APP_SECRET
  PROD_WECHAT_OA_TOKEN
  PROD_WECHAT_OA_ENCODING_AES_KEY
EOF
}

REPO=""
DEPLOY_HOST=""
DEPLOY_USER=""
DEPLOY_PATH=""
SSH_KEY_PATH=""
DEPLOY_PORT=""
ENV_FILE=""
PROD_WECHAT_OA_APP_ID=""
PROD_WECHAT_OA_APP_SECRET=""
PROD_WECHAT_OA_TOKEN=""
PROD_WECHAT_OA_ENCODING_AES_KEY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --deploy-host)
      DEPLOY_HOST="${2:-}"
      shift 2
      ;;
    --deploy-user)
      DEPLOY_USER="${2:-}"
      shift 2
      ;;
    --deploy-path)
      DEPLOY_PATH="${2:-}"
      shift 2
      ;;
    --ssh-key-path)
      SSH_KEY_PATH="${2:-}"
      shift 2
      ;;
    --deploy-port)
      DEPLOY_PORT="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --prod-wechat-app-id)
      PROD_WECHAT_OA_APP_ID="${2:-}"
      shift 2
      ;;
    --prod-wechat-app-secret)
      PROD_WECHAT_OA_APP_SECRET="${2:-}"
      shift 2
      ;;
    --prod-wechat-token)
      PROD_WECHAT_OA_TOKEN="${2:-}"
      shift 2
      ;;
    --prod-wechat-aes-key)
      PROD_WECHAT_OA_ENCODING_AES_KEY="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$REPO" || -z "$DEPLOY_HOST" || -z "$DEPLOY_USER" || -z "$DEPLOY_PATH" || -z "$SSH_KEY_PATH" ]]; then
  echo "Missing required arguments." >&2
  usage
  exit 1
fi

if [[ ! -f "$SSH_KEY_PATH" ]]; then
  echo "SSH key file not found: $SSH_KEY_PATH" >&2
  exit 1
fi

if [[ -n "$ENV_FILE" && ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

prod_wechat_secret_count=0
[[ -n "$PROD_WECHAT_OA_APP_ID" ]] && prod_wechat_secret_count=$((prod_wechat_secret_count + 1))
[[ -n "$PROD_WECHAT_OA_APP_SECRET" ]] && prod_wechat_secret_count=$((prod_wechat_secret_count + 1))
[[ -n "$PROD_WECHAT_OA_TOKEN" ]] && prod_wechat_secret_count=$((prod_wechat_secret_count + 1))
[[ -n "$PROD_WECHAT_OA_ENCODING_AES_KEY" ]] && prod_wechat_secret_count=$((prod_wechat_secret_count + 1))

if [[ "$prod_wechat_secret_count" -ne 0 && "$prod_wechat_secret_count" -ne 4 ]]; then
  echo "Provide all four --prod-wechat-* args together, or provide none." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI 'gh' is required. Install it first: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Please login first: gh auth login" >&2
  exit 1
fi

echo "Setting repository secrets for $REPO ..."

gh secret set DEPLOY_HOST --repo "$REPO" --body "$DEPLOY_HOST"
gh secret set DEPLOY_USER --repo "$REPO" --body "$DEPLOY_USER"
gh secret set DEPLOY_PATH --repo "$REPO" --body "$DEPLOY_PATH"
gh secret set DEPLOY_SSH_KEY --repo "$REPO" < "$SSH_KEY_PATH"

if [[ -n "$DEPLOY_PORT" ]]; then
  gh secret set DEPLOY_PORT --repo "$REPO" --body "$DEPLOY_PORT"
fi

if [[ -n "$ENV_FILE" ]]; then
  DEPLOY_ENV_B64="$(base64 < "$ENV_FILE" | tr -d '\n')"
  gh secret set DEPLOY_ENV_B64 --repo "$REPO" --body "$DEPLOY_ENV_B64"
fi

if [[ "$prod_wechat_secret_count" -eq 4 ]]; then
  gh secret set PROD_WECHAT_OA_APP_ID --repo "$REPO" --body "$PROD_WECHAT_OA_APP_ID"
  gh secret set PROD_WECHAT_OA_APP_SECRET --repo "$REPO" --body "$PROD_WECHAT_OA_APP_SECRET"
  gh secret set PROD_WECHAT_OA_TOKEN --repo "$REPO" --body "$PROD_WECHAT_OA_TOKEN"
  gh secret set PROD_WECHAT_OA_ENCODING_AES_KEY --repo "$REPO" --body "$PROD_WECHAT_OA_ENCODING_AES_KEY"
fi

echo "Done."
