# CI/CD 配置说明（Docker 自动部署）

当前仓库包含两条流水线：

- `/.github/workflows/ci.yml`：代码质量与构建检查
- `/.github/workflows/cd.yml`：构建 Docker 镜像并自动部署

## 1) CI（持续集成）

触发时机：

- `pull_request`
- `push` 到 `main` / `master` / `develop`

执行内容：

1. `pnpm install --frozen-lockfile`
2. `pnpm db:generate`
3. `pnpm lint`（当前告警，不阻断）
4. `pnpm build`（阻断）

## 2) CD（持续部署）

触发时机：

- 手动触发：`workflow_dispatch`
- 自动触发：`push` 到 `main`

执行流程：

1. GitHub Actions 构建镜像并推送到 `ghcr.io/<owner>/<repo>`
2. 自动 SSH 到服务器创建 `DEPLOY_PATH`
3. 自动上传仓库中的 `docker-compose.prod.yml` 到 `DEPLOY_PATH`
4. 可选：从 `DEPLOY_ENV_B64` 自动写入 `DEPLOY_PATH/.env`
5. 自动执行：
  - `docker compose up -d db redis`
  - 等待 `db/redis` healthy
  - 从 `ghcr.nju.edu.cn/<owner>/<repo>` 拉取应用镜像
  - `docker compose run --rm app pnpm exec prisma migrate deploy`
  - `docker compose up -d app`

说明：

- 该流程已移除服务器 `git pull` 依赖。
- 服务器不需要 clone 代码仓库。
- `docker-compose.prod.yml` 已内置 `Postgres + Redis` 服务，不需要单独部署它们。

## 3) Secrets（GitHub 仓库）

在仓库 `Settings -> Secrets and variables -> Actions` 中添加：

必填：

- `DEPLOY_HOST`：服务器地址
- `DEPLOY_USER`：SSH 用户
- `DEPLOY_SSH_KEY`：SSH 私钥内容
- `DEPLOY_PATH`：部署目录（例如 `/opt/resume`）
- `DEPLOY_PORT`：SSH 端口（默认 `22`）
- `DEPLOY_ENV_B64`：生产 `.env` 的 base64（设置后每次部署会重写远端 `.env`）

## 4) 本地一键写 Secrets

新增脚本：

- `/scripts/deploy/setup-github-secrets.sh`

示例：

```bash
cd "/Users/mierku/Personal/idaa/一键投递/website"

scripts/deploy/setup-github-secrets.sh \
  --repo <你的GitHub用户名>/resume \
  --deploy-host <服务器IP或域名> \
  --deploy-user <SSH用户名> \
  --deploy-path /opt/resume \
  --ssh-key-path ~/.ssh/id_ed25519 \
  --deploy-port 22 \
  --env-file .env
```

执行后会自动写入仓库 secrets（含可选 `DEPLOY_ENV_B64`）。

## 5) 服务器前置条件

需要：

1. 服务器可通过 SSH 登录
2. 服务器可访问互联网（拉 `ghcr.nju.edu.cn` 镜像）
3. 可选：如果服务器未安装 Docker，workflow 会尝试自动安装（需要 root 或 sudo 权限）

## 6) 首次部署

1. 本地 push 到 `main`
2. 到 GitHub `Actions` 查看 `CD (Docker)` 运行结果
3. 成功后访问你的域名或服务器端口验证服务

## 7) `.env` 最低建议项（容器内置 Postgres/Redis）

如果你用 `DEPLOY_ENV_B64` 自动下发 `.env`，建议至少包含：

- `POSTGRES_PASSWORD`（务必改成强密码）
- `POSTGRES_DB`（例如 `resume`）
- `AUTH_SECRET`
- `SESSION_SECRET`
- `INTERNAL_SYNC_TOKEN`
- `AI_API_KEY` 或 `DASHSCOPE_API_KEY`

说明：

- `DATABASE_URL` 和 `REDIS_URL` 在生产 compose 中会自动指向容器内的 `db` 和 `redis`，不需要你手动改为公网地址。
