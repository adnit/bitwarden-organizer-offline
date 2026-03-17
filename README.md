# Bitwarden Organizer Offline

A privacy-focused, 100% local web application to analyze, clean, and deduplicate your Bitwarden vault exports.

![Bitwarden Organizer Logo](public/favicon.svg)

## 🛡️ Privacy First
This application process all data **entirely in your browser**. 
- Your vault data never leaves your computer.
- Your Master Password is only used locally to derive decryption keys.
- No tracking, no analytics, no cloud storage.

## ✨ Features

- **Local Decryption**: Supports password-protected Bitwarden JSON exports (both PBKDF2 and Argon2id).
- **Intelligent Deduplication**: Automatically groups identical items (same domain, username, and password) for bulk merging.
- **Granular Conflict Resolution**: Manually resolve items with overlapping domains but different credentials. Pick fields from different versions to craft the perfect entry.
- **Security Audit**: Identifies password reuse across different accounts and services.
- **Clean Export**: Generates a new, cleaned Bitwarden JSON file ready to be imported back into your vault.
- **Modern UI**: A premium, responsive interface built with Tailwind CSS and Radix UI, featuring dark mode and smooth animations.

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix UI)
- **Cryptography**: 
  - Standard Web Crypto API for AES-CBC and PBKDF2.
  - [hash-wasm](https://github.com/DanHansen/hash-wasm) for high-performance Argon2id (WebAssembly).
- **Icons**: [Lucide React](https://lucide.dev/)

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/adnit/bitwarden-organizer-offline.git
   cd bitwarden-organizer-offline
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Deployment

The project is configured for GitHub Pages via GitHub Actions.
1. Push to the `master` branch.
2. The workflow in `.github/workflows/main.yml` will automatically build and deploy.

## 📖 How to Use

1. **Export**: In your Bitwarden client, go to Tools → Export Vault. Choose **JSON (Encrypted)** and select **Password protected**.
2. **Upload**: Drag and drop your `.json` file into this app.
3. **Unlock**: Enter the password you set during export.
4. **Clean**: 
   - Review **Auto-Merges** to remove exact duplicates.
   - Resolve **Conflicts** where entries differ slightly.
   - Check the **Password Audit** for security risks.
5. **Export**: Download your cleaned `.json` file and import it back into Bitwarden!

## 📜 License
MIT License - see [LICENSE](LICENSE) for details.
