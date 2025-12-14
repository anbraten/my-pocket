import type { Transaction } from '~/types'

export const generateDemoData = (): Omit<Transaction, 'id'>[] => {
  const now = new Date()
  const data: Omit<Transaction, 'id'>[] = []

  // Generate transactions for the last 60 days
  for (let i = 0; i < 60; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Random number of transactions per day (0-3)
    const transactionsPerDay = Math.floor(Math.random() * 4)

    for (let j = 0; j < transactionsPerDay; j++) {
      const transaction = generateRandomTransaction(date)
      data.push(transaction)
    }
  }

  // Add some recurring subscriptions
  for (let i = 0; i < 3; i++) {
    const subscriptionDate = new Date(now)
    subscriptionDate.setDate(subscriptionDate.getDate() - (i * 30))
    data.push({
      date: subscriptionDate,
      amount: -9.99,
      description: 'Netflix Subscription',
      category: 'entertainment',
      merchant: 'Netflix',
      isRecurring: true
    })
  }

  for (let i = 0; i < 3; i++) {
    const subscriptionDate = new Date(now)
    subscriptionDate.setDate(subscriptionDate.getDate() - (i * 30) - 5)
    data.push({
      date: subscriptionDate,
      amount: -4.99,
      description: 'Spotify Premium',
      category: 'entertainment',
      merchant: 'Spotify',
      isRecurring: true
    })
  }

  return data
}

const generateRandomTransaction = (date: Date): Omit<Transaction, 'id'> => {
  const merchants = [
    { name: 'Whole Foods', category: 'groceries', amountRange: [30, 120] },
    { name: 'Starbucks', category: 'dining', amountRange: [4, 12] },
    { name: 'Shell Gas Station', category: 'transport', amountRange: [35, 70] },
    { name: 'Amazon', category: 'shopping', amountRange: [15, 200] },
    { name: 'Uber', category: 'transport', amountRange: [8, 35] },
    { name: 'Target', category: 'shopping', amountRange: [20, 100] },
    { name: 'CVS Pharmacy', category: 'health', amountRange: [10, 50] },
    { name: 'Electric Company', category: 'utilities', amountRange: [80, 150] },
    { name: 'Chipotle', category: 'dining', amountRange: [10, 18] },
    { name: 'Movie Theater', category: 'entertainment', amountRange: [12, 35] },
    { name: 'Gym Membership', category: 'health', amountRange: [40, 80] },
    { name: "Joe's Pizza", category: 'dining', amountRange: [15, 30] },
    { name: 'Trader Joes', category: 'groceries', amountRange: [25, 90] }
  ] as const

  const merchant = merchants[Math.floor(Math.random() * merchants.length)]
  const amount = -(merchant.amountRange[0] + Math.random() * (merchant.amountRange[1] - merchant.amountRange[0]))

  // Occasionally add an anomaly (3x normal amount)
  const isAnomaly = Math.random() < 0.05
  const finalAmount = isAnomaly ? amount * 3 : amount

  return {
    date,
    amount: parseFloat(finalAmount.toFixed(2)),
    description: merchant.name,
    category: merchant.category as any,
    merchant: merchant.name,
    isAnomaly
  }
}
