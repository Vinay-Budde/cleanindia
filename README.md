# CleanIndia – Civic Issue Reporting Platform

CleanIndia is a full-stack web application that enables citizens to report civic issues such as potholes, garbage accumulation, drainage overflow, and other infrastructure problems. Users can submit complaints with location details and images, while the platform visualizes issues on an interactive map to help authorities monitor and resolve them efficiently.

---

## 🌐 Live Demo

- **Live Website:** [https://cleanindia-two.vercel.app/](https://cleanindia-two.vercel.app/)

---

## 🚀 Features

- 📍 Location-based issue reporting
- 🗺 Interactive map visualization using OpenStreetMap
- 🧾 Complaint lifecycle tracking (Pending → In Progress → Resolved)
- 📷 Image-based complaint submission
- 🔐 Secure user authentication with JWT
- 🛡 Role-based authorization (User & Admin)
- ⚡ Responsive modern UI
- ☁ Cloud database storage with MongoDB Atlas

---

## 🔐 Authentication & Authorization

CleanIndia implements a complete authentication and authorization system to ensure secure access control for both regular users and administrators.

### Authentication Flow

1. **Registration** – Users sign up with their name, email, and password. Passwords are hashed using **bcrypt** before storage.
2. **Login** – Users authenticate with their credentials. On success, the server issues a signed **JWT (JSON Web Token)** with a configurable expiry.
3. **Token Verification** – Every protected API route validates the JWT from the `Authorization: Bearer <token>` header using a middleware function.
4. **Logout** – Handled client-side by clearing the stored token.

### Authorization: Role-Based Access Control (RBAC)

The system defines two roles:

| Role    | Permissions |
|---------|-------------|
| `user`  | Register, log in, submit complaints, view own complaints, view the public map |
| `admin` | All user permissions + view all complaints, update complaint status, delete complaints, access the admin dashboard |

### Protected Routes

**User Routes (require valid JWT)**

| Method | Endpoint                  | Description                      |
|--------|---------------------------|----------------------------------|
| POST   | `/api/complaints`         | Submit a new complaint           |
| GET    | `/api/complaints/mine`    | View own submitted complaints    |

**Admin Routes (require valid JWT + admin role)**

| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| GET    | `/api/admin/complaints`         | View all complaints                |
| PATCH  | `/api/admin/complaints/:id`     | Update complaint status            |
| DELETE | `/api/admin/complaints/:id`     | Delete a complaint                 |
| GET    | `/api/admin/dashboard`          | Access admin analytics dashboard   |

### Auth Middleware

```typescript
// Verifies JWT and attaches user to request
export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Not authorized" });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id).select("-password");
  next();
};

// Restricts access to admin role only
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
```

### Security Practices

- Passwords hashed with **bcrypt** (salt rounds: 10)
- JWT signed with a secret stored in environment variables
- Tokens expire after a set duration (e.g., `7d`)
- Protected routes reject requests without a valid token with `401 Unauthorized`
- Admin-only routes return `403 Forbidden` to non-admin users
- Sensitive fields (e.g., `password`) excluded from API responses using `.select("-password")`

---

## 🛠 Tech Stack

### Frontend
- React (Vite + TypeScript)
- Tailwind CSS
- Leaflet + OpenStreetMap

### Backend
- Node.js + Express.js
- REST APIs
- JWT Authentication
- bcrypt

### Database
- MongoDB Atlas
- Mongoose ODM

### Deployment
- **Frontend** → Vercel
- **Backend** → Render

---

## 📂 Project Structure

```
cleanindia
│
├── backend
│   ├── src
│   │   ├── controllers
│   │   │   ├── authController.ts
│   │   │   ├── complaintController.ts
│   │   │   └── adminController.ts
│   │   ├── middleware
│   │   │   └── authMiddleware.ts
│   │   ├── models
│   │   │   ├── User.ts
│   │   │   └── Complaint.ts
│   │   ├── routes
│   │   │   ├── authRoutes.ts
│   │   │   ├── complaintRoutes.ts
│   │   │   └── adminRoutes.ts
│   │   └── index.ts
│   ├── dist
│   ├── package.json
│   └── tsconfig.json
│
├── frontend
│   ├── public
│   ├── src
│   │   ├── assets
│   │   ├── components
│   │   ├── pages
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── UserDashboard.tsx
│   │   │   └── AdminDashboard.tsx
│   │   ├── context
│   │   │   └── AuthContext.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
└── README.md
```

---

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Vinay-Budde/cleanindia.git
cd cleanindia
```

### 2. Run the Backend

```bash
cd backend
npm install
npm run dev
```

### 3. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## 🔑 Environment Variables

### Backend `.env`

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

### Frontend `.env`

```env
VITE_API_URL=https://your-backend-url
```

> ⚠️ Never commit `.env` files. Use `.env.example` as a reference template.

---

## 🧪 API Endpoints

### Auth

| Method | Endpoint             | Access  | Description          |
|--------|----------------------|---------|----------------------|
| POST   | `/api/auth/register` | Public  | Register a new user  |
| POST   | `/api/auth/login`    | Public  | Log in and get token |

### Complaints

| Method | Endpoint                    | Access     | Description                    |
|--------|-----------------------------|------------|--------------------------------|
| POST   | `/api/complaints`           | User       | Submit a new complaint         |
| GET    | `/api/complaints/mine`      | User       | View own complaints            |
| GET    | `/api/complaints/map`       | Public     | Get all complaints for map     |

### Admin

| Method | Endpoint                        | Access | Description                  |
|--------|---------------------------------|--------|------------------------------|
| GET    | `/api/admin/complaints`         | Admin  | List all complaints          |
| PATCH  | `/api/admin/complaints/:id`     | Admin  | Update complaint status      |
| DELETE | `/api/admin/complaints/:id`     | Admin  | Delete a complaint           |
| GET    | `/api/admin/dashboard`          | Admin  | View dashboard analytics     |

---

## 📌 Future Improvements

- AI-based issue severity detection
- Duplicate complaint detection
- Heatmap visualization of complaints
- Mobile application version
- Email notifications on complaint status updates
- OAuth login (Google / GitHub)

---

## 👨‍💻 Author

**Vinay Budde**  
GitHub: [https://github.com/Vinay-Budde](https://github.com/Vinay-Budde)

---

## 📜 License

This project is built for educational and demonstration purposes.
