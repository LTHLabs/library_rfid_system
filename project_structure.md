# 📚 RFID Library System

## 🗂️ Project Structure

```
rfid-library-system/
├── package.json
├── server.js
├── .env
├── .gitignore
├── README.md
├── models/
│   ├── User.js
│   └── Transaction.js
├── routes/
│   └── api.js
├── services/
│   └── mqttService.js
└── public/
    └── index.html
```

## 🚀 Setup Instructions

Siap! Kita lanjut ke **Installation Steps - Clone/Setup Project** tahap demi tahap, untuk menyiapkan struktur proyek backend kamu.

---

## ✅ **Langkah 1: Buat Folder Project**

Buka terminal kamu dan jalankan:

```bash
mkdir library-rfid-system
cd library-rfid-system
```

---

## ✅ **Langkah 2: Inisialisasi Proyek Node.js**

```bash
npm init -y
```

Ini akan menghasilkan file `package.json` untuk menyimpan daftar dependencies dan konfigurasi project.

---

## ✅ **Langkah 3: Install Dependencies**

### 📦 Dependencies utama:

```bash
npm install express mongoose mqtt cors dotenv
```

Kegunaan:

* `express`: backend web server
* `mongoose`: ODM untuk MongoDB
* `mqtt`: koneksi MQTT dengan ESP8266
* `cors`: mengizinkan koneksi dari frontend
* `dotenv`: membaca file `.env`

### 📦 Dependencies development (opsional):

```bash
npm install --save-dev nodemon
```

`nodemon` membantu restart otomatis saat file diubah.

---

## ✅ **Langkah 4: Buat Struktur Folder**

```bash
mkdir models public routes middleware utils esp8266
mkdir public/css public/js
touch server.js .env .gitignore README.md
```

> Catatan:

* `models`: tempat file model MongoDB (User, Book, Transaction)
* `routes`: API endpoint
* `middleware`: seperti autentikasi, validasi
* `utils`: file koneksi MQTT dan MongoDB
* `esp8266`: untuk menyimpan kode program NodeMCU
* `public`: frontend HTML/CSS/JS

---

## ✅ **Langkah 5: Isi `.gitignore`**

Supaya file sensitif tidak ikut ke GitHub:

`.gitignore`:

```
node_modules/
.env
```

---

## ✅ **Langkah 6: Tambahkan Script Nodemon (opsional)**

Di dalam `package.json`, tambahkan:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}


## ✅ **Langkah 7: Jalankan Server**

npm run dev
```

✅ MongoDB Connected
🚀 Server running at http://localhost:3000

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env` file with your MongoDB and MQTT credentials:
```env
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/rfid_library

# MQTT Configuration (HiveMQ Cloud)
MQTT_HOST=your-hivemq-host.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=your-mqtt-username
MQTT_PASSWORD=your-mqtt-password
MQTT_CLIENT_ID=LibraryServer

# MQTT Topics
MQTT_TOPIC_SUBSCRIBE=rfid/qu
MQTT_TOPIC_PUBLISH=rfid/response
```

### 3. MongoDB Atlas Setup
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create new cluster
3. Create database user
4. Get connection string
5. Update `MONGODB_URI` in `.env`

### 4. HiveMQ Cloud Setup
1. Create account at [HiveMQ Cloud](https://www.hivemq.com/cloud/)
2. Create new cluster
3. Create credentials
4. Update MQTT settings in `.env`

### 5. Run the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔧 API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:userId` - Get user transactions

### Statistics
- `GET /api/stats` - Get system statistics
- `GET /health` - Health check

## 📡 MQTT Topics

### Subscribe Topics
- `rfid/qu` - Receives UID from ESP8266

### Publish Topics
- `rfid/response` - Sends response back to ESP8266

## 🔄 System Flow

1. **ESP8266** reads RFID card → sends UID to `rfid/qu`
2. **Backend** receives UID via MQTT
3. **Process Logic**:
   - New user → Create user record
   - Existing user → Toggle borrow/return status
   - Save transaction to database
4. **Response** sent back to ESP8266 via `rfid/response`
5. **Frontend** displays real-time data

## 📊 Database Schema

### Users Collection
```javascript
{
  uid: "A1B2C3D4",
  name: "User_A1B2C3D4",
  email: "",
  status: "active",
  totalBorrowed: 5,
  totalReturned: 3,
  currentlyBorrowing: true,
  createdAt: Date,
  updatedAt: Date
}
```

### Transactions Collection
```javascript
{
  user: ObjectId,
  uid: "A1B2C3D4",
  type: "borrow", // or "return"
  bookTitle: "Library Book",
  timestamp: Date,
  returnDate: Date,
  status: "active" // or "completed"
}
```

## 🚀 Deployment Options

### Vercel
```bash
npm install -g vercel
vercel
```

### Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Render
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Environment variables for secrets
- MongoDB connection security
- MQTT SSL/TLS encryption

## 🎯 Features

- ✅ Real-time RFID processing
- ✅ User management
- ✅ Transaction logging
- ✅ Web dashboard
- ✅ System health monitoring
- ✅ Responsive design
- ✅ Auto-refresh data
- ✅ MongoDB integration
- ✅ MQTT communication
- ✅ REST API

## 📱 Frontend Features

- Modern responsive design
- Real-time status indicators
- Auto-refresh functionality
- Interactive navigation
- Statistics dashboard
- User management table
- Transaction history
- System health monitoring

## 🔧 ESP8266 Integration

Your existing ESP8266 code will work perfectly with this system. The backend automatically:
- Subscribes to `rfid/qu` topic
- Processes incoming UIDs
- Manages user creation/updates
- Tracks borrow/return logic
- Sends responses back to ESP8266

## 🐛 Troubleshooting

### Common Issues

1. **MQTT Connection Failed**
   - Check HiveMQ credentials
   - Verify SSL/TLS settings
   - Check firewall settings

2. **MongoDB Connection Error**
   - Verify connection string
   - Check database permissions
   - Ensure IP whitelist

3. **ESP8266 Not Connecting**
   - Check WiFi credentials
   - Verify MQTT broker settings
   - Check SSL certificate

## 📝 Notes

- System automatically creates users on first RFID scan
- Borrow/return logic based on user's current status
- All timestamps in Indonesian timezone
- Frontend updates every 30 seconds
- Supports unlimited users and transactions
- Serverless-ready architecture