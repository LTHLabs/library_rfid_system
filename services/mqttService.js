const mqtt = require('mqtt');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    const options = {
      host: process.env.MQTT_HOST,
      port: process.env.MQTT_PORT,
      protocol: 'mqtts',
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: process.env.MQTT_CLIENT_ID,
      clean: true,
      connectTimeout: 30000,
      reconnectPeriod: 5000,
      rejectUnauthorized: false
    };

    this.client = mqtt.connect(options);

    this.client.on('connect', () => {
      console.log('🔗 MQTT Connected to HiveMQ Cloud');
      this.isConnected = true;
      
      // Subscribe to RFID topic
      this.client.subscribe(process.env.MQTT_TOPIC_SUBSCRIBE, (err) => {
        if (err) {
          console.error('❌ MQTT Subscribe Error:', err);
        } else {
          console.log(`📡 Subscribed to topic: ${process.env.MQTT_TOPIC_SUBSCRIBE}`);
        }
      });
    });

    this.client.on('message', async (topic, message) => {
      if (topic === process.env.MQTT_TOPIC_SUBSCRIBE) {
        const uid = message.toString().trim().toUpperCase();
        console.log(`📨 Received UID: ${uid}`);
        
        await this.processRFID(uid);
      }
    });

    this.client.on('error', (err) => {
      console.error('❌ MQTT Error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 MQTT Connection Closed');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      console.log('🔄 MQTT Reconnecting...');
    });
  }

  async processRFID(uid) {
    try {
      console.log(`🔍 Processing UID: ${uid}`);
      
      // Find or create user
      let user = await User.findOne({ uid });
      
      if (!user) {
        // Create new user
        user = new User({
          uid,
          name: `User_${uid}`,
          currentlyBorrowing: false
        });
        await user.save();
        console.log(`👤 New user created: ${uid}`);
      }

      // Determine transaction type based on current status
      const transactionType = user.currentlyBorrowing ? 'return' : 'borrow';
      
      // Create transaction
      const transaction = new Transaction({
        user: user._id,
        uid,
        type: transactionType,
        bookTitle: transactionType === 'borrow' ? 'Library Book' : 'Library Book',
        status: transactionType === 'return' ? 'completed' : 'active'
      });
      
      await transaction.save();
      
      // Update user statistics
      if (transactionType === 'borrow') {
        user.totalBorrowed += 1;
        user.currentlyBorrowing = true;
      } else {
        user.totalReturned += 1;
        user.currentlyBorrowing = false;
        
        // Update the previous borrow transaction
        await Transaction.findOneAndUpdate(
          { user: user._id, type: 'borrow', status: 'active' },
          { status: 'completed', returnDate: new Date() }
        );
      }
      
      await user.save();
      
      console.log(`✅ Transaction processed: ${transactionType} for ${uid}`);
      
      // Send response back to ESP8266
      this.publishResponse(uid, transactionType, user.name);
      
    } catch (error) {
      console.error('❌ Error processing RFID:', error);
      this.publishResponse(uid, 'error', 'System Error');
    }
  }

  publishResponse(uid, action, userName) {
    if (this.isConnected) {
      const responseMsg = `${action}:${uid}:${userName}`;
      this.client.publish(process.env.MQTT_TOPIC_PUBLISH, responseMsg);
      console.log(`📤 Response sent: ${responseMsg}`);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      console.log('🔌 MQTT Disconnected');
    }
  }
}

module.exports = new MQTTService();