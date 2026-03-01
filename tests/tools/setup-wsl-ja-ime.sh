#!/usr/bin/env bash
set -eu

profile_file="${HOME}/.profile"
xprofile_file="${HOME}/.xprofile"
fcitx_profile_dir="${HOME}/.config/fcitx5"
fcitx_profile_file="${fcitx_profile_dir}/profile"

ime_block=$(cat <<'EOF'
# >>> fcitx5 ime >>>
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
export SDL_IM_MODULE=fcitx
export INPUT_METHOD=fcitx
# <<< fcitx5 ime <<<
EOF
)

fcitx_profile=$(cat <<'EOF'
[Groups/0]
# Group Name
Name=Default
# Layout
Default Layout=us
# Default Input Method
DefaultIM=mozc

[Groups/0/Items/0]
# Name
Name=keyboard-us
# Layout
Layout=

[Groups/0/Items/1]
# Name
Name=mozc
# Layout
Layout=

[GroupOrder]
0=Default
EOF
)

append_block_if_missing() {
  target_file="$1"
  touch "${target_file}"
  if ! grep -Fq "# >>> fcitx5 ime >>>" "${target_file}"; then
    printf '\n%s\n' "${ime_block}" >> "${target_file}"
  fi
}

append_block_if_missing "${profile_file}"
append_block_if_missing "${xprofile_file}"

mkdir -p "${fcitx_profile_dir}"
printf '%s\n' "${fcitx_profile}" > "${fcitx_profile_file}"

cat <<'EOF'
Configured:
- ~/.profile
- ~/.xprofile
- ~/.config/fcitx5/profile

Next:
1. Install packages if needed:
   sudo apt-get update
   sudo apt-get install -y im-config fcitx5 fcitx5-mozc fcitx5-config-qt fcitx5-frontend-gtk3 fcitx5-frontend-gtk4 fcitx5-frontend-qt5 fcitx5-frontend-qt6
2. Reopen WSL or run:
   source ~/.profile
3. Launch:
   npm run open:chatgpt:x11-ime
EOF
