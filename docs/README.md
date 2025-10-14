# 📚 Documentation Index

Welcome to the ZK Bitcoin Battleship documentation! This directory contains all technical documentation, development notes, and guides for the project.

---

## 🚀 Getting Started

Start here if you're new to the project:

- **[Main README](../README.md)** - Project overview, features, and quick start
- **[Installation Guide](../INSTALL_GUIDE.md)** - Detailed setup instructions
- **[Product Requirements](../PRD.md)** - Original project specification

---

## 📦 Deployment

Everything you need to deploy the game to production:

- **[Production Deployment Success](deployment/PRODUCTION_DEPLOYMENT_SUCCESS.md)** ⭐ - **START HERE** - Complete deployment guide with all fixes
- **[AWS Torii Setup](deployment/AWS_TORII_SETUP.md)** - Deploy Dojo indexer on AWS EC2
- **[Vercel Deployment](deployment/VERCEL_DEPLOYMENT.md)** - Deploy frontend to Vercel
- **[Pre-Deployment Checklist](deployment/PRE_DEPLOYMENT_CHECKLIST.md)** - Testing checklist before going live
- **[Deployment Notes](deployment/DEPLOYMENT_NOTES.md)** - General deployment considerations
- **[Deployment Overview](deployment/DEPLOYMENT.md)** - Architecture and strategy

**Key Insights:**

- RPC provider compatibility matters (Alchemy vs Cartridge)
- gRPC + HTTP polling for resilience
- Security headers can break integrations
- Nginx tuning for long-lived connections

---

## 🔧 Development

Development session notes and implementation tracking:

- **[Implementation Plan](development/IMPLEMENTATION_PLAN.md)** - Original development roadmap
- **[Session Summary](development/SESSION_SUMMARY.md)** - Development session highlights
- **[Progress Tracker](development/PROGRESS.md)** - Feature completion tracking
- **[Setup Status](development/SETUP_STATUS.md)** - Environment setup checklist
- **[Systems Complete](development/SYSTEMS_COMPLETE.md)** - Completed contract systems
- **[Testing Status](development/TESTING_STATUS.md)** - Test coverage and results
- **[End of Session 2](development/END_OF_SESSION_2.md)** - Session 2 retrospective
- **[Versions](development/VERSIONS.md)** - Dependency versions and compatibility

---

## 🔗 Integrations

Documentation for external service integrations:

### Bitcoin & Cross-Chain

- **[BTC Integration Plan](integrations/BTC_INTEGRATION_PLAN.md)** - Bitcoin deposit and staking design
- **[Atomiq Integration](integrations/atomiq/)** - Complete Atomiq SDK troubleshooting journey

### Atomiq SDK (BTC ↔ Starknet Swaps)

The Atomiq integration was challenging but successful. These docs capture the debugging journey:

- **[Live Coding Session](integrations/atomiq/ATOMIQ_LIVE_CODING_SESSION.md)** - Real-time debugging session
- **[Bug Research Report](integrations/atomiq/ATOMIQ_BUG_RESEARCH_REPORT.md)** - Deep dive into issues
- **[Fix Summary](integrations/atomiq/ATOMIQ_FIX_SUMMARY.md)** - What worked and why
- **[Official Fix](integrations/atomiq/ATOMIQ_OFFICIAL_FIX.md)** - Final implementation
- **[Research Prompt](integrations/atomiq/ATOMIQ_RESEARCH_PROMPT_DETAILED.md)** - Investigation methodology
- **[Research Report](integrations/atomiq/ATOMIQ_RESEARCH_REPORT.md)** - Findings and solutions

**Key Takeaway:** Use `_TESTNET_WBTC_VESU` token identifier for Sepolia, not hardcoded addresses.

---

## 🐛 Debugging

Troubleshooting guides for specific issues:

- **[Board Commit Debug Prompt](debugging/BOARD_COMMIT_DEBUG_PROMPT.md)** - Issue analysis
- **[Board Commit Debug Response](debugging/BOARD_COMMIT_DEBUG_RESPONSE.md)** - Solution details

---

## 🔄 Migrations

Major refactoring and migration guides:

- **[React Migration](migrations/REACT_MIGRATION.md)** - Vanilla JS → React migration
- **[Dojo 1.7 Migration](DOJO_1.7_MIGRATION.md)** - Dojo framework upgrade

---

## 🎨 UX & Design

User experience improvements and design decisions:

- **[UX Improvements](ux/UX_IMPROVEMENTS.md)** - UI/UX enhancements and rationale

---

## 🛠️ Tooling

Development tools and configuration:

- **[Tooling Guide](TOOLING.md)** - Dev tools, scripts, and workflows

---

## 🔐 Zero-Knowledge Proofs

ZK proof implementation (currently disabled for UX):

- **[ZK Integration Status](../zk/ZK_INTEGRATION_STATUS.md)** - Complete Garaga/Noir implementation status
- **[Circuit README](../zk/circuits/README.md)** - Noir circuit specifications
- **[Circuit Testing Guide](../zk/circuits/TESTING.md)** - How to test circuits (21/21 passing)
- **[BoardCommit Circuit](../zk/circuits/BOARD_COMMIT.md)** - Board validation circuit
- **[ShotResult Circuit](../zk/circuits/SHOT_RESULT.md)** - Shot proof circuit

**Status:** ✅ Fully implemented (21/21 tests passing), ⏸️ Disabled due to 10-30s proof times

---

## 📊 Quick Reference

### Live URLs

| Service      | URL                            |
| ------------ | ------------------------------ |
| **Frontend** | https://zkbattleship.fun       |
| **Torii**    | https://torii.zkbattleship.fun |
| **Network**  | Starknet Sepolia Testnet       |

### Key Contracts

| Contract        | Address                                                              |
| --------------- | -------------------------------------------------------------------- |
| **World**       | `0x4b9579af308a28c5c1c54a869af4a448e14a41ca6c4e69caccb0aba3a24be69`  |
| **Escrow**      | `0xfc378fb3dc5c81094e305ef23099d3c7fbd7305ce0998c2e80df4792056b30`   |
| **WBTC (Vesu)** | `0x04861ba938aed21f2cd7740acd3765ac4d2974783a3218367233de0153490cb6` |

### Technology Stack

- **Frontend:** React 18.3.1 + Vite 6.0.11
- **Blockchain:** Dojo 1.0.11 (Starknet Sepolia)
- **Wallet:** Cartridge Controller 0.6.3
- **Cross-Chain:** Atomiq SDK 0.3.4
- **Bitcoin:** Xverse (PSBT signing, Testnet3)
- **ZK Proofs:** Noir v1.0.0-beta.5 + Garaga v0.18.1

---

## 🎯 Document Priorities for Judges

If you're evaluating this project, **read these first**:

1. **[Main README](../README.md)** - Project overview
2. **[Production Deployment Success](deployment/PRODUCTION_DEPLOYMENT_SUCCESS.md)** - What we built and how
3. **[ZK Integration Status](../zk/ZK_INTEGRATION_STATUS.md)** - Technical depth (ZK implementation)
4. **[PRD](../PRD.md)** - Original vision and goals

These four documents provide the complete picture of:

- ✅ **What we built** (fully functional game)
- ✅ **How we built it** (deployment journey with 8 critical fixes)
- ✅ **Technical depth** (complete ZK proof system)
- ✅ **Vision** (original goals and achievements)

---

## 📝 Contributing

This documentation was created during active development and captures:

- Real-time debugging sessions
- Design decisions and trade-offs
- Lessons learned
- Production deployment journey

It serves as both:

- **Developer reference** for understanding the codebase
- **Historical record** of the development process
- **Knowledge base** for future improvements

---

## 📧 Contact

**Project:** ZK Bitcoin Battleship  
**Network:** Starknet Sepolia Testnet  
**Status:** ✅ Production Ready (Testnet)

**Built with ❤️ using Dojo, Starknet, and Bitcoin**
