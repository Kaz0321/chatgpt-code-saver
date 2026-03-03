# WSL Playwright Japanese Input Setup

This repository contains the minimum settings that were confirmed to work on `WSL2 + WSLg + Playwright Chromium` for:

- ChatGPT rendering in a visible browser
- Japanese IME input with `fcitx5 + mozc`
- Japanese text rendering without tofu glyphs

## Confirmed working path

Use `X11/XWayland` for this environment.

```bash
npm run open:chatgpt:x11-ime
```

`Wayland` startup still exists in [open-chatgpt-gpu.js](/mnt/c/_Codex/gpt-code-saver-extension/tests/tools/open-chatgpt-gpu.js), but the stable path on this machine was `X11`.

## Required packages

Install these once on the target WSL environment:

```bash
sudo apt-get update
sudo apt-get install -y im-config fcitx5 fcitx5-mozc fcitx5-config-qt fcitx5-frontend-gtk3 fcitx5-frontend-gtk4 fcitx5-frontend-qt5 fcitx5-frontend-qt6
```

## One-time setup

Run:

```bash
bash tests/tools/setup-wsl-ja-ime.sh
```

This writes only the settings that were actually needed:

- `~/.profile`
- `~/.xprofile`
- `~/.config/fcitx5/profile`

The script sets:

```bash
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
export SDL_IM_MODULE=fcitx
export INPUT_METHOD=fcitx
```

and configures `fcitx5` default IM as `mozc`.

## Japanese font rendering

Linux-side Japanese fonts were not required on this machine.

Instead, Chromium is launched with [fontconfig-windows-ja.conf](/mnt/c/_Codex/gpt-code-saver-extension/tests/config/fontconfig-windows-ja.conf), which exposes `C:\Windows\Fonts` to fontconfig inside WSL.

This fixed tofu glyphs for Japanese text.

## Launch

Reopen the WSL session, or reload the shell:

```bash
source ~/.profile
```

Then launch:

```bash
npm run open:chatgpt:x11-ime
```

## Validation

Package check:

```bash
dpkg -l | grep -E 'fcitx5|mozc|im-config'
```

IME process check:

```bash
pgrep -af fcitx5
```

Japanese font check:

```bash
FONTCONFIG_PATH=/etc/fonts FONTCONFIG_FILE="$PWD/tests/config/fontconfig-windows-ja.conf" fc-match sans:lang=ja
```

Expected result on this machine:

```text
msgothic.ttc: "MS Gothic" "Regular"
```

## Input switching

Switch to Japanese:

```bash
fcitx5-remote -n mozc
```

Switch back to English:

```bash
fcitx5-remote -n keyboard-us
```

Or use `Ctrl+Space`.
