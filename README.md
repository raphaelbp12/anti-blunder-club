# Anti-Blunder Club

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) running on your machine
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension
- A GitHub account with access to this repository

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:raphaelbp12/anti-blunder-club.git
cd anti-blunder-club
```

### 2. Open in the DevContainer

1. Open the project folder in VS Code.
2. When prompted **"Reopen in Container"**, click it. Alternatively, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Dev Containers: Reopen in Container**.
3. Wait for the container to build and start. On first run this will pull the base image and install dependencies.

### 3. Set up GitHub credentials

The DevContainer mounts your host `~/.gitconfig`, so your **name** and **email** are already available inside the container. However, you still need to authenticate for git operations (push, pull from private repos, etc.).

#### Log in with the GitHub CLI

From the VS Code integrated terminal inside the container, run:

```bash
gh auth login
```

Follow the interactive prompts:
- **Account:** GitHub.com
- **Protocol:** HTTPS
- **Authenticate:** Login with a web browser (or paste a token)

#### Configure git to use `gh` for credentials

After logging in, set `gh` as the credential helper for the current repository:

```bash
git config --local credential.helper '!gh auth git-credential'
```

Then switch the remote to HTTPS so it matches the `gh` auth protocol:

```bash
git remote set-url origin https://github.com/raphaelbp12/anti-blunder-club.git
```

Verify everything works:

```bash
git fetch origin
```

> **Note:** The credential helper is stored in `.git/config` (local, not committed). If you rebuild the container or clone the repo fresh, you will need to repeat the `gh auth login` and `git config` steps above.

> **VS Code extensions** (GitLens, Git Graph, GitHub Copilot) will pick up the HTTPS remote and `gh` credential helper automatically — no extra configuration needed.

### 4. Set up Claude Code (optional)

If you want to use Claude Code inside the container, make sure the `ANTHROPIC_AUTH_TOKEN` environment variable is set on your **host machine** before opening the DevContainer. The container forwards it automatically.

```bash
# On your host shell, before opening VS Code:
export ANTHROPIC_AUTH_TOKEN="sk-ant-..."
```

Once inside the container, verify it's available:

```bash
claude  # starts an interactive session
```

## Git Workflow

| Branch prefix | Purpose               |
| ------------- | --------------------- |
| `main`        | Protected, no direct pushes |
| `feat/*`      | Feature branches      |
| `fix/*`       | Bug fixes             |
| `chore/*`     | Tooling, deps, config |

Always open a pull request and squash merge into `main`.

## License

Anti-Blunder Club is distributed under the [GNU General Public License v3.0 or later](./LICENSE) (GPL-3.0-or-later).

### Credits

- Heavily inspired by [WintrChess](https://github.com/WintrCat/wintrchess) (GPL-3.0). Its analysis pipeline and Stockfish integration patterns informed the design of this project; some modules are adapted from it.
- Uses [Stockfish](https://stockfishchess.org/) (GPL-3.0) as its chess engine.

### SPDX headers for adapted files

Files adapted from WintrChess (or other GPL-3.0 sources) must carry an SPDX header at the top:

```ts
// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from WintrChess (https://github.com/WintrCat/wintrchess), GPL-3.0.
```
