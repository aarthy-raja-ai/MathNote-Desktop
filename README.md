# MathNote Desktop 💻

> **Every Number. Clearly Noted.**

MathNote Desktop is a premium, high-performance finance and accounting dashboard designed for small businesses and retail shops. Built with Electron, React, and TypeScript, it provides full offline capabilities alongside real-time Supabase cloud synchronization.

![Version](https://img.shields.io/badge/version-1.5.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

---

## ✨ Features

### 📅 Indian Financial Year (FY) Transition
- **Automatic Sequence Resets**: Document sequences (Invoices, Purchase Bills, Purchase Orders, Quotations) automatically reset to `0001` at the beginning of each Indian Financial Year (April 1st).
- **Virtual Year Partitioning**: Toggle active financial years (e.g. `26-27`) globally. Viewing or editing past financial year records preserves calculations without mixing data into the current year.

### 🏢 Multi-Company Support
- **Multi-Branch Management**: Add, update, switch, or delete multiple companies or business outlets.
- **Partitioned Data Layouts**: Transactions, inventory, contacts, and dashboard metrics are automatically isolated based on the active company selection.

### 💾 Automatic Local Backups (On Close)
- **Auto-Save on Exit**: The application intercepts window close signals to safely save database snapshots to a custom directory of your choice.
- **User-Selected Backup Folders**: Configure custom local paths directly under **Settings > Data Management**.

### ☁️ Supabase Cloud Sync
- **Real-Time Data Replicating**: Live-syncs transactions, contacts, inventory, and company metadata across your Desktop and Mobile apps.
- **Automatic Data Upgrades**: Automatic translation of field names between local storage and remote PostgreSQL columns.

---

## 🛠️ Tech Stack
- **Shell Wrapper**: Electron 33
- **Framework**: React 19, React Router DOM 7
- **Language**: TypeScript
- **Styling**: Vanilla CSS with custom modern palettes
- **Charts**: Recharts
- **Icons**: Lucide React
- **Bundler**: Vite with vite-plugin-electron

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/aarthy-raja-ai/MathNote-Desktop.git
   cd MathNote-Desktop
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### Building Installer
To package the app into a production-ready Windows installer:
```bash
npm run build
```
The compiled installer will be saved inside the `release` folder.

---

## 📄 License
This project is licensed under the MIT License.

---
Made with ❤️ for modern businesses
