# Nexus E-Commerce - Backend API

The backend REST API for the Nexus Multi-Vendor E-Commerce platform. Built with Node.js, Express, TypeScript, and MongoDB, this API provides a secure, scalable, and role-based foundation for managing users, vendors, products, and orders.

## 🚀 Tech Stack

* **Runtime:** Node.js
* **Framework:** Express.js
* **Language:** TypeScript
* **Database:** MongoDB
* **ODM:** Mongoose
* **Authentication:** JSON Web Tokens (JWT) & bcryptjs
* **Security:** Native Node `crypto` (for OTP generation)
* **Email Services:** Nodemailer (SMTP)

---

## ✨ Key Features

* **Role-Based Access Control (RBAC):** Distinct authorization levels for `ADMIN`, `VENDOR`, `CUSTOMER`, and `DELIVERY`.
* **Advanced Authentication:** * Standard JWT-based login for all users.
  * **2-Factor Authentication (2FA)** for Admin accounts via Email OTP.
  * OTP auto-expiration (5 mins) and anti-reuse deletion logic.
* **Security Management:** Protected endpoints requiring current password validation to toggle sensitive security settings (like 2FA).
* **Profile & Address Management:** Endpoints for users to update profiles, upload avatars, and manage multiple delivery addresses (including setting default addresses).
* **Product & Inventory API:** Comprehensive CRUD operations for global and vendor-specific product management with dynamic category extraction and stock tracking.

---

## 📂 Folder Structure

```text
/src
├── controllers    # Request handlers and business logic
├── middleware     # Custom middleware (auth checking, role verification)
├── models         # Mongoose database schemas
├── routes         # Express route definitions
├── utils          # Helper functions (e.g., Nodemailer email sender)
└── server.ts      # Application entry point
