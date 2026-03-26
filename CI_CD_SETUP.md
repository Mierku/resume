# CI/CD 配置说明（Docker 版）

当前仓库包含两条流水线：

- `/.github/workflows/ci.yml`：代码质量与构建检查
- `/.github/workflows/cd.yml`：构建 Docker 镜像并部署

## 1) CI（持续集成）

触发时机：

- `pull_request`
- `push` 到 `main` / `master` / `develop`

执行内容：

1. `pnpm install --frozen-lockfile`
2. `pnpm db:generate`
3. `pnpm lint`（当前告警，不阻断）
4. `pnpm build`（阻断）

说明：

- 由于仓库当前有现存 lint 问题，lint 暂时为非阻断。
- 等 lint 全部修复后，把 `ci.yml` 中 `continue-on-error: true` 去掉即可。

## 2) CD（Docker 持续部署）

触发时机：

- 手动触发：`workflow_dispatch`
- 自动触发：`push` 到 `main`

执行流程：

1. GitHub Actions 使用 `Dockerfile` 构建镜像
2. 镜像推送到 `ghcr.io/<owner>/<repo>`
3. 通过 SSH 登录服务器
4. 在 `DEPLOY_PATH` 拉最新代码（用于同步 `docker-compose.prod.yml`）
5. `docker compose pull`
6. `docker compose run --rm app pnpm exec prisma migrate deploy`
7. `docker compose up -d`

## 3) 必填 Secrets

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中添加：

- `DEPLOY_HOST`：服务器地址
- `DEPLOY_USER`：SSH 用户
- `DEPLOY_SSH_KEY`：SSH 私钥
- `DEPLOY_PATH`：服务器仓库目录（例如 `/var/www/website`）
- `GHCR_USERNAME`：可拉取 GHCR 镜像的用户名
- `GHCR_TOKEN`：可拉取 GHCR 镜像的 Token（至少 `read:packages`）

可选：

- `DEPLOY_PORT`：SSH 端口（默认 `22`）

## 4) 服务器前置条件

服务器需提前准备：

1. Docker（含 `docker compose`）
2. Git
3. 项目仓库已 clone 到 `DEPLOY_PATH`
4. `DEPLOY_PATH/.env` 已配置生产环境变量
5. 数据库可访问（用于 `prisma migrate deploy`）

## 5) 新增的 Docker 文件

- `/Dockerfile`
- `/.dockerignore`
- `/docker-compose.prod.yml`

## 6) 首次上线建议

1. 服务器上先手动执行一次：
   - `cd <DEPLOY_PATH>`
   - `docker login ghcr.io -u <GHCR_USERNAME>`
   - `IMAGE_NAME=ghcr.io/<owner>/<repo> IMAGE_TAG=latest docker compose -f docker-compose.prod.yml pull app`
   - `IMAGE_NAME=ghcr.io/<owner>/<repo> IMAGE_TAG=latest docker compose -f docker-compose.prod.yml run --rm app pnpm exec prisma migrate deploy`
   - `IMAGE_NAME=ghcr.io/<owner>/<repo> IMAGE_TAG=latest docker compose -f docker-compose.prod.yml up -d app`
2. 访问站点确认功能正常后，再完全依赖自动 CD。
