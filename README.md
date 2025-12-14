# MyPocket - Smart Expense Tracker 💰

A modern, mobile-first expense tracking app built with Nuxt 3, Vue 3, and Tailwind CSS. Track your spending with smart insights, automatic categorization, and anomaly detection.

## ✨ Features

### Core Functionality
- **📊 Transaction Management** - Add, edit, and delete transactions manually
- **📥 CSV Import** - Upload bank statements in CSV format with automatic column detection
- **📤 Export Data** - Export your transactions to CSV for backup or analysis
- **💾 Local Storage** - All data stored locally in your browser (no backend needed)

### Smart Features
- **🤖 Auto-Categorization** - Intelligent category detection based on transaction descriptions
- **⚠️ Anomaly Detection** - Automatically identifies unusual spending patterns using statistical analysis
- **🔄 Recurring Payment Detection** - Finds subscriptions and regular payments with confidence scores
- **💡 Smart Insights** - AI-powered insights about your spending habits
- **📈 Trend Analysis** - Visual breakdown of spending by category

### UX Features
- **📱 Mobile-First Design** - Optimized for touch interfaces and small screens
- **🌙 Dark Mode** - Automatic dark/light theme support
- **⚡ Fast & Responsive** - Built with Vue 3 and Nuxt for optimal performance
- **🎨 Modern UI** - Clean, card-based design with Tailwind CSS
- **👆 Easy Navigation** - Bottom tab bar for thumb-friendly access

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

## Setup

Make sure to install dependencies:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The app will be available at `http://localhost:3000`

## 📖 Usage

### Adding Transactions
1. Click the **➕** button in the bottom navigation
2. Fill in the details (description, amount, category, date)
3. The app will auto-suggest a category based on the description
4. Choose whether it's an expense or income
5. Click "Add Transaction"

### Importing from CSV
1. Go to **Settings** (⚙️ in bottom nav)
2. Click "Upload CSV from your bank"
3. Select your bank's CSV export file
4. The app automatically detects columns for date, amount, and description
5. Transactions are imported and categorized automatically

### Trying Demo Data
1. Go to **Settings**
2. Click **"🎲 Load Demo Data"**
3. The app will generate 60 days of sample transactions

## 🧠 Smart Features

### Auto-Categorization
Uses keyword matching to automatically categorize transactions (groceries, dining, transport, entertainment, utilities, shopping, health, income, transfer, other).

### Anomaly Detection
Uses statistical analysis (standard deviation) to identify unusual spending - flags transactions that are 2+ standard deviations above the mean.

### Recurring Payment Detection
Automatically identifies subscriptions and regular payments by analyzing time intervals between similar transactions. Shows confidence scores and predicts next payment dates.

## 🏗️ Tech Stack
- **Framework**: Nuxt 3 (Vue 3)
- **Styling**: Tailwind CSS
- **State Management**: Vue Composables
- **Date Handling**: date-fns
- **CSV Parsing**: papaparse
- **TypeScript**: Full type safety

## 🔒 Privacy
- 100% local - all data stored in browser localStorage
- No backend, no external services
- No tracking or analytics
- Export your data anytime

## 📱 Project Structure
```
components/     # Vue components for each view
composables/    # useTransactions state management
types/          # TypeScript definitions
utils/          # Categories, CSV parser, demo data
app.vue         # Main layout with navigation
```

Check out the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) for more information.

---

**Made with ❤️ for smart expense tracking**
