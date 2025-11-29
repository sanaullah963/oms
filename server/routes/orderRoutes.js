
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { parseOrderDetails } = require('../utils/parser'); // পরবর্তী ধাপে তৈরি করা হবে

// --- ১. GET /api/orders - সমস্ত অর্ডার ফেচ করা ---
router.get('/', async (req, res) => {
    try {
        // নতুন অর্ডারগুলি সবার উপরে দেখানোর জন্য createdAt: -1 (Descending) ব্যবহার করা হয়েছে
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: 'Failed to fetch orders.' });
    }
});

// --- ২. POST /api/orders/manual-single - ম্যানুয়াল অর্ডার সেভ করা ---
router.post('/manual-single', async (req, res) => {
    // এখানে io (Socket.IO instance) access করার জন্য app.get('io') ব্যবহার করতে হবে
    const io = req.app.get('io'); 
        
    console.log("req.body:", req.body);
    try {
        const { rawInputText, totalCOD, productCode } = req.body;
        
        // ফ্রন্ট-এন্ড নিশ্চিত করবে যে rawInputText এবং totalCOD আছে
        if (!rawInputText || !totalCOD) {
            return res.status(400).json({ message: 'Raw input text and COD amount are required.' });
        }
        const parsedData = parseOrderDetails(rawInputText);
        
        // খ. ডেটা যাচাই
        if (!parsedData.castomerName || !parsedData.castomerPhone || !parsedData.castomerAddress) {
             return res.status(400).json({ 
                message: 'Parsing failed. Please ensure Name, Phone, and Address are present in the text.' 
            });
        }

        // গ. নতুন অ্যাক্টিভিটি তৈরি
        const initialActivities = [
            {
                type: 'Order Created',
                description: 'Manual order created from raw text input.'
            },
            {
                type: 'Status Updated',
                description: `Status set to Pending.`,
                details: { newStatus: 'Pending' }
            }
        ];

        // ঘ. নতুন অর্ডার ডকুমেন্ট তৈরি ও সেভ
        const newOrder = new Order({
            rawInputText,
            castomerName: parsedData.castomerName,
            castomerPhone: parsedData.castomerPhone,
            castomerAddress: parsedData.castomerAddress,
            productCode: productCode, // ফ্রন্ট-এন্ড থেকে বা পার্সিং লজিক থেকে আসবে
            totalCOD: totalCOD,
            activities: initialActivities
        });
        console.log("newOrder:", newOrder);
        const savedOrder = await newOrder.save();
        console.log("mongos saved:", savedOrder);
        
        // ঙ. রিয়েল-টাইম আপডেট (ভার্সন ২.০ এর জন্য সেটআপ)
        if (io) {
            io.emit('new_order_added', savedOrder);
        }

        res.status(201).json({ 
            message: 'Order created successfully!', 
            order: savedOrder 
        });

    } catch (error) {
        console.error("Error saving manual order:", error);
        res.status(500).json({ message: 'Server error while processing order.' });
    }
});

//--- delete //api/orders/delete/:id
router.delete('/delete/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log(orderId);
        
        const deletedOrder = await Order.findByIdAndDelete(orderId);
        if (!deletedOrder) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        res.status(200).json({ message: 'সফলভাবে ডিলিট করা হয়েছে' });
    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({ message: 'Server error while deleting order.' });
    }
});

module.exports = router;