const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});
const app = express();

const PORT = process.env.PORT || 5000;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(
    express.json({
        limit: "15mb"
    })
);


// =====================================================
// RAZORPAY
// =====================================================

const razorpay = new Razorpay({

    key_id: process.env.RAZORPAY_KEY_ID,

    key_secret: process.env.RAZORPAY_KEY_SECRET

});


// =====================================================
// TEST ROUTE
// =====================================================

app.get("/", (req, res) => {

    res.json({

        message: "Pay-to-Unlock backend is running! 🚀"

    });

});


// =====================================================
// TEMPORARY DATABASE
// =====================================================

let photos = [];

let purchases = [];


// =====================================================
// GET ALL PHOTOS
// =====================================================

app.get("/api/photos", (req, res) => {

    res.json(photos);

});


// =====================================================
// ADD PHOTO
// =====================================================

app.post("/api/photos", (req, res) => {

    const {

        title,

        price,

        description,

        status,

        image

    } = req.body;


    // Check title

    if (!title) {

        return res.status(400).json({

            message: "Photo title is required."

        });

    }


    // Check price

    if (!price || Number(price) <= 0) {

        return res.status(400).json({

            message: "Valid price is required."

        });

    }


    // Check image

    if (!image) {

        return res.status(400).json({

            message: "Photo image is required."

        });

    }


    // Create photo

    const newPhoto = {

        id: Date.now(),

        title: title,

        price: Number(price),

        description: description || "",

        status: status || "published",

        image: image

    };


    // Save photo

    photos.push(newPhoto);


    res.status(201).json({

        message: "Photo published successfully! 🎉",

        photo: newPhoto

    });

});


// =====================================================
// UPDATE PHOTO
// =====================================================

app.put("/api/photos/:id", (req, res) => {

    const id = Number(req.params.id);


    const photo = photos.find(

        item => item.id === id

    );


    if (!photo) {

        return res.status(404).json({

            message: "Photo not found."

        });

    }


    const {

        title,

        price,

        description,

        status,

        image

    } = req.body;


    // Update title

    if (title !== undefined) {

        photo.title = title;

    }


    // Update price

    if (price !== undefined) {

        if (Number(price) <= 0) {

            return res.status(400).json({

                message: "Invalid price."

            });

        }


        photo.price = Number(price);

    }


    // Update description

    if (description !== undefined) {

        photo.description = description;

    }


    // Update status

    if (status !== undefined) {

        photo.status = status;

    }


    // Update image

    if (image !== undefined) {

        photo.image = image;

    }


    res.json({

        message: "Photo updated successfully.",

        photo: photo

    });

});


// =====================================================
// DELETE PHOTO
// =====================================================

app.delete("/api/photos/:id", (req, res) => {

    const id = Number(req.params.id);


    const oldLength = photos.length;


    photos = photos.filter(

        photo => photo.id !== id

    );


    if (photos.length === oldLength) {

        return res.status(404).json({

            message: "Photo not found."

        });

    }


    res.json({

        message: "Photo deleted successfully."

    });

});


// =====================================================
// CREATE RAZORPAY ORDER
// =====================================================

app.post("/api/create-order", async (req, res) => {

    try {

        const { photoId } = req.body;


        // Find photo

        const photo = photos.find(

            item => item.id === Number(photoId)

        );


        if (!photo) {

            return res.status(404).json({

                message: "Photo not found."

            });

        }


        // Check published status

        if (photo.status !== "published") {

            return res.status(400).json({

                message: "This photo is not available."

            });

        }


        // Convert rupees to paise

        const amountInPaise = Math.round(

            photo.price * 100

        );


        // Razorpay order

        const options = {

            amount: amountInPaise,

            currency: "INR",

            receipt: `photo_${photo.id}_${Date.now()}`,

            notes: {

                photoId: String(photo.id),

                photoTitle: photo.title

            }

        };


        const order = await razorpay.orders.create(

            options

        );


        res.json({

            success: true,

            orderId: order.id,

            amount: order.amount,

            currency: order.currency,

            keyId: process.env.RAZORPAY_KEY_ID,

            photoId: photo.id

        });


    } catch (error) {

        console.error(

            "Razorpay order error:",

            error

        );


        res.status(500).json({

            success: false,

            message: "Could not create payment order."

        });

    }

});


// =====================================================
// VERIFY RAZORPAY PAYMENT
// =====================================================

app.post("/api/verify-payment", (req, res) => {

    try {

        const {

            razorpay_order_id,

            razorpay_payment_id,

            razorpay_signature,

            photoId

        } = req.body;


        // Check payment information

        if (

            !razorpay_order_id ||

            !razorpay_payment_id ||

            !razorpay_signature ||

            !photoId

        ) {

            return res.status(400).json({

                success: false,

                message: "Missing payment information."

            });

        }


        // Create signature body

        const body =

            razorpay_order_id +

            "|" +

            razorpay_payment_id;


        // Generate expected signature

        const expectedSignature =

            crypto

                .createHmac(

                    "sha256",

                    process.env.RAZORPAY_KEY_SECRET

                )

                .update(body)

                .digest("hex");


        // Compare signatures

        const isValid =

            expectedSignature === razorpay_signature;


        if (!isValid) {

            return res.status(400).json({

                success: false,

                message: "Payment verification failed."

            });

        }


        // Find purchased photo

        const photo = photos.find(

            item => item.id === Number(photoId)

        );


        if (!photo) {

            return res.status(404).json({

                success: false,

                message: "Photo not found."

            });

        }


        // =================================================
        // SAVE PURCHASE
        // =================================================

        const purchase = {

            id: Date.now(),

            photoId: photo.id,

            paymentId: razorpay_payment_id,

            orderId: razorpay_order_id,

            amount: photo.price,

            purchasedAt: new Date().toISOString()

        };


        purchases.push(purchase);


        console.log(

            "Purchase recorded:",

            purchase

        );


        // =================================================
        // SEND SUCCESS RESPONSE
        // =================================================

        res.json({

            success: true,

            message: "Payment verified successfully! 🎉",

            photoId: photo.id,

            paymentId: razorpay_payment_id

        });


    } catch (error) {

        console.error(

            "Payment verification error:",

            error

        );


        res.status(500).json({

            success: false,

            message: "Payment verification failed."

        });

    }

});


// =====================================================
// GET PURCHASES
// =====================================================

app.get("/api/purchases", (req, res) => {

    res.json(purchases);

});
// =====================================================
// DASHBOARD STATISTICS
// =====================================================

app.get("/api/stats", (req, res) => {

    const totalPhotos = photos.length;

    const totalPurchases = purchases.length;

    const totalRevenue = purchases.reduce(
        (total, purchase) => {
            return total + Number(purchase.amount);
        },
        0
    );

    res.json({

        totalPhotos: totalPhotos,

        totalPurchases: totalPurchases,

        totalRevenue: totalRevenue

    });

});


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Server running on port ${PORT}`
    );

});