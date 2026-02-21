# LoanRestructure Pro

**SME Debt Optimization Engine** — Helps CAs and SME owners find the best loan restructuring strategy and generate professional reports.

![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🏦 Support for 5 Indian loan types: Term Loan, CC/OD, MUDRA, Vehicle/Equipment, Working Capital
- 📊 5 restructuring strategies with detailed savings analysis
- 📄 Downloadable professional report for clients
- 📱 Mobile-responsive — works on phones for in-person demos
- ⚡ Fully client-side — no data leaves the browser

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/loan-restructure-pro.git
cd loan-restructure-pro
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Deploy to GitHub Pages

### One-time setup:

1. Create a new repo on GitHub named `loan-restructure-pro`
2. Update `homepage` in `package.json` — replace `USERNAME` with your GitHub username
3. Run:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/loan-restructure-pro.git
git branch -M main
git push -u origin main
npm run deploy
```

4. Go to **GitHub → Repo → Settings → Pages** → Source should be `gh-pages` branch
5. Your live URL: `https://YOUR_USERNAME.github.io/loan-restructure-pro/`

### Subsequent deploys:

```bash
git add .
git commit -m "Update"
git push
npm run deploy
```

## Tech Stack

- React 18 + Vite
- Zero external UI dependencies
- Pure CSS animations
- Client-side PDF report generation

## License

MIT
