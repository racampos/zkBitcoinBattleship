# Installation Guide - Dojo 1.7.0

## Option 1: Using dojoup (Recommended - Simpler)

This is the easiest way to install Dojo without needing asdf:

```bash
# Install dojoup
curl -L https://install.dojoengine.org | bash

# Restart your shell or source your profile
source ~/.bashrc  # or ~/.zshrc

# Install Dojo 1.7.0
dojoup install 1.7.0

# Verify installation
sozo --version  # Should show 1.7.0
katana --version  # Should show 1.7.0
torii --version  # Should show 1.7.0
```

## Option 2: Using asdf (If you prefer version management)

First install asdf, then install Dojo:

```bash
# Install asdf (choose your shell)
# For zsh:
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.0
echo '. "$HOME/.asdf/asdf.sh"' >> ~/.zshrc
source ~/.zshrc

# For bash:
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.0
echo '. "$HOME/.asdf/asdf.sh"' >> ~/.bashrc
source ~/.bashrc

# Then install Dojo using asdf
curl -L https://raw.githubusercontent.com/dojoengine/dojo/main/dojoup/asdf-install | bash

# Install specific version
asdf install dojo 1.7.0
asdf global dojo 1.7.0
```

## Quick Start (After Installation)

```bash
# Verify everything is installed
sozo --version
katana --version
torii --version

# Build the project
cd chain/dojo
sozo build

# Expected output: Successful compilation with no errors
```

## Troubleshooting

### "command not found: sozo"

After installing with dojoup, you may need to restart your shell:

```bash
# Close and reopen your terminal, OR:
source ~/.bashrc  # or ~/.zshrc
```

### Permission denied

```bash
chmod +x ~/.dojo/bin/*
```

### Check installation path

```bash
which sozo
# Should show: /Users/<your-user>/.dojo/bin/sozo
```

## Next Steps After Installation

Once Dojo is installed successfully:

1. Build the project: `cd chain/dojo && sozo build`
2. Start local devnet: `katana --dev` (in separate terminal)
3. Deploy contracts: `sozo migrate`
4. Start indexer: `torii --world <WORLD_ADDR>`

See `SETUP_STATUS.md` for full development roadmap.
