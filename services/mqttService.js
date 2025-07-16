const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.callbacks = {};
  }

  connect() {
    const options = {
      host: process.env.MQTT_HOST,
      port: parseInt(process.env.MQTT_PORT),
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: process.env.MQTT_CLIENT_ID,
      protocol: 'mqtts',
      rejectUnauthorized: false
    };

    this.client = mqtt.connect(options);

    this.client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      this.isConnected = true;
      
      // Subscribe to RFID topic
      this.client.subscribe(process.env.MQTT_TOPIC_SUBSCRIBE, (err) => {
        if (err) {
          console.error('❌ Failed to subscribe to topic:', err);
        } else {
          console.log(`📡 Subscribed to topic: ${process.env.MQTT_TOPIC_SUBSCRIBE}`);
        }
      });
    });

    this.client.on('message', (topic, message) => {
      const data = message.toString();
      console.log(`📨 Received message from ${topic}:`, data);
      
      // Call registered callbacks
      if (this.callbacks[topic]) {
        this.callbacks[topic].forEach(callback => callback(data));
      }
    });

    this.client.on('error', (err) => {
      console.error('❌ MQTT connection error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 MQTT connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      console.log('🔄 Reconnecting to MQTT broker...');
    });
  }

  onMessage(topic, callback) {
    if (!this.callbacks[topic]) {
      this.callbacks[topic] = [];
    }
    this.callbacks[topic].push(callback);
  }

  publish(topic, message) {
    if (this.isConnected && this.client) {
      this.client.publish(topic, message, (err) => {
        if (err) {
          console.error('❌ Failed to publish message:', err);
        } else {
          console.log(`📤 Published to ${topic}:`, message);
        }
      });
    } else {
      console.error('❌ MQTT client not connected');
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

module.exports = new MQTTService();
