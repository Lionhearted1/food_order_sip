const mongoose = require('mongoose');
const Order = require('../models/order');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

async function sendOtpToEmail(email, otp) {
    try {
        // Configure nodemailer transporter with your email service provider's credentials
        const transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // Use `true` for port 465, `false` for all other ports
            auth: {
              user: "moceane.brekke60@ethereal.email",
              pass: "q3ht1e9aWY5Gf8kFtq",
            },
          });

        // Send OTP to the user's email
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: email,
            subject: 'Order Placement OTP',
            text: `Your OTP for order placement is: ${otp}`,
            otp
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email');
    }
}

exports.placeOrder = async (req, res) => {
    try {
        const { userId, foodId, paymentMode, quantity } = req.body;

        const userIdObject = new mongoose.Types.ObjectId(userId);

        const newOrder = new Order({
            userId: userIdObject,
            foodId,
            paymentMode,
            quantity,
            orderId: generateOrderId(),
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await newOrder.save();
        sendOtpToEmail('a4adityashetty@gmail.com', newOrder.orderId);

        res.json({ success: true, message: 'Order placed successfully', orderId: newOrder.orderId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.submitFeedback = async (req, res) => {
    try {
        const { rating, imageLink } = req.body;
        const orderId = req.params.orderId;

        // Handle file upload
        upload.single('file')(req, res, async function (err) {
            if (err) {
                console.error('File upload error:', err);
                return res.status(500).json({ error: 'File upload error' });
            }

            try {
                // Extract text data from file
                const textData = await extractTextFromFile(req.file);

                // Update order with feedback data
                const updatedOrder = await Order.findByIdAndUpdate(orderId, {
                    rating,
                    imageLink,
                    fileData: textData ? textData.link : null,
                    updatedAt: new Date()
                }, { new: true });

                if (!updatedOrder) {
                    return res.status(404).json({ error: 'Order not found' });
                }

                res.json({ success: true, message: 'Feedback submitted successfully', updatedOrder });
            } catch (error) {
                console.error('Error processing feedback:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

function generateOrderId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
}




async function extractTextFromFile(file) {
    if (!file || !file.path) {
        console.error('Error extracting text from file: File or file path is missing');
        return null;
    }

    try {
        // Read text from file
        const text = fs.readFileSync(file.path, 'utf-8');

        // Save extracted text to a new file
        const textFilePath = `uploads/text_${Date.now()}.txt`;
        fs.writeFileSync(textFilePath, text);

        return { link: textFilePath };
    } catch (error) {
        console.error('Error extracting text from file:', error);
        return null;
    }
}
