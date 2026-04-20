<div align="center">

![Rydex Banner](https://rydexx.netlify.app/logo.png)

# 🚀 Rydex

**The Ultimate Multi-Vehicle Booking & Logistics Platform**

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Installation](#-getting-started) • [Portfolio](#-my-portfolio)

---

</div>

## 📖 Overview

**Rydex** is a high-performance, full-stack vehicle booking ecosystem designed for the modern world. Whether it's a quick bike ride across town or a heavy-duty truck delivery across the state, Rydex connects users with reliable partners through a seamless, real-time experience.

Built with **Next.js 16**, **Socket.io**, and **MongoDB**, Rydex offers a robust infrastructure for real-time tracking, secure payments, and dynamic logistics management.

---

## 🛠 Tech Stack

### Frontend & UI
- **Framework**: `Next.js 16` (App Router)
- **Styling**: `Tailwind CSS 4`
- **Animations**: `Framer Motion`
- **State Management**: `Redux Toolkit`
- **Maps**: `Leaflet` & `React Leaflet`
- **Charts**: `Recharts`
- **Icons**: `Lucide React`

### Backend & Real-time
- **Runtime**: `Node.js` & `Next.js API Routes`
- **Database**: `MongoDB` with `Mongoose`
- **Real-time**: `Socket.io` (Dedicated Server)
- **Auth**: `NextAuth.js`
- **Communications**: `Nodemailer` & `Zegocloud` (Video/Voice)

### Payments & Cloud
- **Gateways**: `Stripe` & `Razorpay`
- **Media Storage**: `Cloudinary`

---

## ✨ Key Features

### 👤 For Users
- **Multi-Vehicle Support**: Book Bikes, Cars, Buses, or Trucks instantly.
- **Live Ride Tracking**: Real-time map updates with Leaflet and Socket.io.
- **Secure Payments**: Integrated with Razorpay and Stripe for global & local transactions.
- **Real-time Chat**: Connect with partners instantly via the integrated chat system.

### 🚛 For Partners
- **Earnings Dashboard**: Track weekly and monthly performance with interactive Recharts.
- **OTP Verification**: Secure ride starts with mandatory OTP validation.
- **Active Ride Management**: Real-time location updates and trip status control.
- **Video KYC**: Quick onboarding and verification via Zegocloud integration.

### 🛡 For Admins
- **Full Control**: Comprehensive dashboard to manage users, partners, and bookings.
- **Earnings Analysis**: Monitor platform-wide revenue and partner commissions.
- **Geo-Monitoring**: Track active vehicles and logistics flow in real-time.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- MongoDB Atlas or Local Instance
- Redis (Optional, for Socket.io scaling)

### 1. Clone the repository
```bash
git clone https://github.com/Zuhaib-dev/rydex.git
cd rydex
```

### 2. Setup `rydexx` (Frontend & API)
```bash
cd rydexx
npm install
npm run dev
```

### 3. Setup `socketServer` (Real-time Engine)
```bash
cd ../socketServer
npm install
npm run dev
```

---

## 🔗 My Portfolio

> [!TIP]
> This project is a testament to my dedication to building high-quality, scalable applications. Check out my other work!

- **Portfolio**: [your-portfolio-link.com](https://your-portfolio-link.com)
- **GitHub**: [@Zuhaib-dev](https://github.com/Zuhaib-dev)
- **LinkedIn**: [Connect with me](https://linkedin.com/in/your-profile)
- **Twitter**: [@your_handle](https://twitter.com/your_handle)

---

<div align="center">
  <p>Built with ❤️ by Zuhaib</p>
</div>