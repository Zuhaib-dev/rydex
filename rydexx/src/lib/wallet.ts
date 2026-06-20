import mongoose from "mongoose";
import connectDb from "./db";
import Wallet from "@/models/wallet.model";

export async function getOrCreateWallet(userId: string | mongoose.Types.ObjectId) {
  await connectDb();
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
  }
  return wallet;
}

export async function creditWallet(
  userId: string | mongoose.Types.ObjectId,
  amount: number,
  reason: string,
  bookingId?: string | mongoose.Types.ObjectId
) {
  if (amount <= 0) throw new Error("Amount must be greater than zero");
  await connectDb();

  const transaction = {
    amount,
    type: "credit",
    reason,
    ...(bookingId && { bookingId }),
    createdAt: new Date(),
  };

  const wallet = await Wallet.findOneAndUpdate(
    { userId },
    {
      $inc: { balance: amount },
      $push: { transactions: transaction },
    },
    { new: true, upsert: true }
  );

  return wallet;
}

export async function debitWallet(
  userId: string | mongoose.Types.ObjectId,
  amount: number,
  reason: string,
  bookingId?: string | mongoose.Types.ObjectId
) {
  if (amount <= 0) throw new Error("Amount must be greater than zero");
  await connectDb();

  const transaction = {
    amount,
    type: "debit",
    reason,
    ...(bookingId && { bookingId }),
    createdAt: new Date(),
  };

  // Ensure balance doesn't go below zero
  const wallet = await Wallet.findOneAndUpdate(
    { userId, balance: { $gte: amount } },
    {
      $inc: { balance: -amount },
      $push: { transactions: transaction },
    },
    { new: true }
  );

  if (!wallet) {
    throw new Error("Insufficient balance or wallet not found");
  }

  return wallet;
}
