# 📚 RFID Library System

## 🏗️ Project Structure

📂 Struktur Folder:
rfid-library-system/
├── server.js
├── .env
├── models/
│ ├── User.js
│ └── Transaction.js
├── routes/api.js
├── services/mqttService.js
├── public/
│ ├── index.html (dashboard admin)
│ ├── addUser.html (form registrasi user)
│ └── js/
│ ├── app.js (dashboard logic)
│ └── register.js (ambil UID via MQTT & kirim user baru)
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env with your MongoDB and MQTT credentials
```

### 3. Run the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 4. Access Dashboard
Open http://localhost:3000 in your browser

## 📊 API Endpoints

### Users
- `GET /api/users` - Get all users (with pagination)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/:uid/active` - Get user's active transactions
- `PUT /api/users/:id` - Update user info

### Transactions
- `GET /api/transactions` - Get all transactions (with pagination)
- `GET /api/transactions/:id` - Get transaction by ID
- `GET /api/transactions?action=borrow` - Filter by action
- `GET /api/transactions?uid=A1B2C3D4` - Filter by UID

### System
- `GET /api/stats` - Get dashboard statistics
- `GET /api/mqtt/status` - Check MQTT connection
- `POST /api/simulate-scan` - Simulate RFID scan (for testing)

## 🔧 MongoDB Collections

### Users Collection
```javascript
{
  uid: "A1B2C3D4",
  name: "John Doe",
  email: "john@library.local",
  status: "active",
  registrationDate: ISODate(),
  lastActivity: ISODate(),
  totalBorrows: 5,
  totalReturns: 4,
  currentlyBorrowing: true
}
```

### Transactions Collection
```javascript
{
  uid: "A1B2C3D4",
  userId: ObjectId("..."),
  action: "borrow",
  bookId: "BOOK_001",
  bookTitle: "JavaScript Guide",
  timestamp: ISODate(),
  status: "success",
  deviceInfo: "ESP8266_RFID_Reader",
  returnDate: null,
  isReturned: false
}
```

## 📡 MQTT Topics

- **Subscribe**: `rfid/qu` - Receives UID from ESP8266
- **Publish**: `rfid/response` - Sends response to ESP8266

### Message Format
**From ESP8266**: `A1B2C3D4` (UID only)
**To ESP8266**: `borrow:A1B2C3D4:John Doe` (action:uid:username)

## 🔄 System Flow

1. ESP8266 scans RFID card → Sends UID to `rfid/qu`
2. Backend receives UID via MQTT
3. Backend checks if user exists:
   - If new → Creates user in MongoDB
   - If existing → Checks for active transactions
4. Backend processes action:
   - No active transaction → Creates "borrow" transaction
   - Has active transaction → Creates "return" transaction
5. Backend sends response to ESP8266 via `rfid/response`
6. Frontend dashboard updates in real-time

## 🖥️ Frontend Features

- **Real-time Dashboard** with live statistics
- **User Management** with pagination
- **Transaction History** with filtering
- **MQTT Status Indicator**
- **RFID Scan Simulator** for testing
- **Mobile Responsive** design

## 🐛 Testing

### Test RFID Scan
```bash
curl -X POST http://localhost:3000/api/simulate-scan \
  -H "Content-Type: application/json" \
  -d '{"uid": "A1B2C3D4"}'
```

### Test API
```bash
# Get users
curl http://localhost:3000/api/users

# Get transactions
curl http://localhost:3000/api/transactions

# Get stats
curl http://localhost:3000/api/stats
```

## 🌐 Deployment

### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway deploy
```

### Environment Variables for Deployment
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
MQTT_HOST=your-mqtt-broker
MQTT_PORT=8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
```

## 🔐 Security Notes

- Use strong passwords for MongoDB and MQTT
- Enable MongoDB IP whitelist
- Use environment variables for sensitive data
- Enable MQTT SSL/TLS in production
- Consider rate limiting for API endpoints

## 🛠️ Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check MONGODB_URI in .env
   - Verify network access to MongoDB Atlas
   - Check username/password

2. **MQTT Connection Failed**
   - Verify MQTT credentials
   - Check firewall settings
   - Ensure SSL/TLS is configured

3. **ESP8266 Not Connecting**
   - Check WiFi credentials
   - Verify MQTT broker settings
   - Check serial monitor for errors

### Debug Mode
```bash
DEBUG=* npm run dev
```

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit your changes
4. Push to the branch
5. Create Pull Request