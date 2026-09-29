const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");
const Razorpay = require("razorpay");

const db = require("./database");

dotenv.config({
    path: path.join(__dirname, ".env")
});

const app = express();

const PORT =
    process.env.PORT || 5000;

// ======================================================
// RAZORPAY
// ======================================================

const razorpay = new Razorpay({

    key_id:
        process.env.RAZORPAY_KEY_ID,

    key_secret:
        process.env.RAZORPAY_KEY_SECRET

});

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(
    express.json({
        limit: "15mb"
    })
);

// ======================================================
// UPLOAD DIRECTORIES
// ======================================================

const uploadsDir =
    path.join(
        __dirname,
        "uploads"
    );

const originalDir =
    path.join(
        uploadsDir,
        "original"
    );

const previewDir =
    path.join(
        uploadsDir,
        "preview"
    );

fs.mkdirSync(
    uploadsDir,
    {
        recursive: true
    }
);

fs.mkdirSync(
    originalDir,
    {
        recursive: true
    }
);

fs.mkdirSync(
    previewDir,
    {
        recursive: true
    }
);

// ======================================================
// MULTER
// ======================================================

const storage =
    multer.diskStorage({

        destination:
            (req, file, cb) => {

                cb(
                    null,
                    originalDir
                );

            },

        filename:
            (req, file, cb) => {

                const extension =
                    path
                        .extname(
                            file.originalname
                        )
                        .toLowerCase();

                const filename =
                    `${Date.now()}-${crypto.randomUUID()}${extension}`;

                cb(
                    null,
                    filename
                );

            }

    });

const upload =
    multer({

        storage,

        limits: {

            fileSize:
                15 * 1024 * 1024

        },

        fileFilter:
            (req, file, cb) => {

                if (
                    !file.mimetype.startsWith(
                        "image/"
                    )
                ) {

                    return cb(
                        new Error(
                            "Only image files are allowed."
                        )
                    );

                }

                cb(
                    null,
                    true
                );

            }

    });

// ======================================================
// FRONTEND
// ======================================================

// ADMIN

app.use(
    "/admin",
    express.static(
        path.join(
            __dirname,
            "../admin"
        )
    )
);

// CUSTOMER

app.use(
    "/customer",
    express.static(
        path.join(
            __dirname,
            "../admin/customer"
        )
    )
);

// ROOT

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../admin/customer/index.html"
            )
        );

    }
);

// ======================================================
// GET ALL PHOTOS
// ======================================================

app.get(
    "/api/photos",
    (req, res) => {

        try {

            const photos =
                db
                    .prepare(`
                        SELECT
                            id,
                            title,
                            price,
                            description,
                            status,
                            image,
                            created_at
                        FROM photos
                        ORDER BY id DESC
                    `)
                    .all();

            res.json(
                photos
            );

        } catch (error) {

            console.error(
                "GET PHOTOS ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to load photos."

            });

        }

    }
);

// ======================================================
// CREATE PHOTO
// ======================================================

app.post(
    "/api/photos",
    upload.single("image"),
    async (req, res) => {

        try {

            const {
                title,
                price,
                description,
                status
            } = req.body;

            if (
                !title ||
                !price ||
                !req.file
            ) {

                if (req.file) {

                    fs.unlinkSync(
                        req.file.path
                    );

                }

                return res.status(400).json({

                    message:
                        "Title, price and image are required."

                });

            }

            const numericPrice =
                Number(price);

            if (
                !Number.isFinite(
                    numericPrice
                ) ||
                numericPrice <= 0
            ) {

                fs.unlinkSync(
                    req.file.path
                );

                return res.status(400).json({

                    message:
                        "Please enter a valid price."

                });

            }

            const originalFilename =
                req.file.filename;

            // BLURRED PREVIEW

            const previewFilename =
                path.parse(
                    originalFilename
                ).name + ".jpg";

            const previewPath =
                path.join(
                    previewDir,
                    previewFilename
                );

            await sharp(
                req.file.path
            )
                .resize({

                    width: 1000,

                    height: 1000,

                    fit: "inside",

                    withoutEnlargement:
                        true

                })
                .blur(18)
                .jpeg({

                    quality: 75

                })
                .toFile(
                    previewPath
                );

            const imageUrl =
                `/api/photos/preview/${previewFilename}`;

            const result =
                db
                    .prepare(`
                        INSERT INTO photos
                        (
                            title,
                            price,
                            description,
                            status,
                            image
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `)
                    .run(

                        title,

                        numericPrice,

                        description || "",

                        status ||
                            "published",

                        JSON.stringify({

                            preview:
                                imageUrl,

                            original:
                                originalFilename

                        })

                    );

            const photo =
                db
                    .prepare(`
                        SELECT *
                        FROM photos
                        WHERE id = ?
                    `)
                    .get(
                        result.lastInsertRowid
                    );

            res.status(201).json({

                message:
                    "Photo uploaded successfully! 🎉",

                photo

            });

        } catch (error) {

            console.error(
                "CREATE PHOTO ERROR:",
                error
            );

            if (
                req.file &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                try {

                    fs.unlinkSync(
                        req.file.path
                    );

                } catch {}

            }

            res.status(500).json({

                message:
                    "Failed to upload photo."

            });

        }

    }
);

// ======================================================
// UPDATE PHOTO
// ======================================================

app.put(
    "/api/photos/:id",
    upload.single("image"),
    async (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );

            const existingPhoto =
                db
                    .prepare(`
                        SELECT *
                        FROM photos
                        WHERE id = ?
                    `)
                    .get(id);

            if (!existingPhoto) {

                if (req.file) {

                    fs.unlinkSync(
                        req.file.path
                    );

                }

                return res.status(404).json({

                    message:
                        "Photo not found."

                });

            }

            const {
                title,
                price,
                description,
                status
            } = req.body;

            let imageData =
                existingPhoto.image;

            // NEW IMAGE

            if (req.file) {

                let oldOriginalFilename =
                    null;

                try {

                    const oldImageData =
                        JSON.parse(
                            existingPhoto.image
                        );

                    oldOriginalFilename =
                        oldImageData.original;

                } catch {}

                // DELETE OLD ORIGINAL

                if (
                    oldOriginalFilename
                ) {

                    const oldOriginalPath =
                        path.join(
                            originalDir,
                            path.basename(
                                oldOriginalFilename
                            )
                        );

                    if (
                        fs.existsSync(
                            oldOriginalPath
                        )
                    ) {

                        fs.unlinkSync(
                            oldOriginalPath
                        );

                    }

                    const oldPreviewFilename =
                        path.parse(
                            oldOriginalFilename
                        ).name + ".jpg";

                    const oldPreviewPath =
                        path.join(
                            previewDir,
                            oldPreviewFilename
                        );

                    if (
                        fs.existsSync(
                            oldPreviewPath
                        )
                    ) {

                        fs.unlinkSync(
                            oldPreviewPath
                        );

                    }

                }

                // NEW PREVIEW

                const previewFilename =
                    path.parse(
                        req.file.filename
                    ).name + ".jpg";

                const previewPath =
                    path.join(
                        previewDir,
                        previewFilename
                    );

                await sharp(
                    req.file.path
                )
                    .resize({

                        width: 1000,

                        height: 1000,

                        fit: "inside",

                        withoutEnlargement:
                            true

                    })
                    .blur(18)
                    .jpeg({

                        quality: 75

                    })
                    .toFile(
                        previewPath
                    );

                imageData =
                    JSON.stringify({

                        preview:
                            `/api/photos/preview/${previewFilename}`,

                        original:
                            req.file.filename

                    });

            }

            db
                .prepare(`
                    UPDATE photos
                    SET
                        title = ?,
                        price = ?,
                        description = ?,
                        status = ?,
                        image = ?
                    WHERE id = ?
                `)
                .run(

                    title ||
                        existingPhoto.title,

                    Number(
                        price ||
                        existingPhoto.price
                    ),

                    description ??
                        existingPhoto.description,

                    status ||
                        existingPhoto.status,

                    imageData,

                    id

                );

            const updatedPhoto =
                db
                    .prepare(`
                        SELECT *
                        FROM photos
                        WHERE id = ?
                    `)
                    .get(id);

            res.json({

                message:
                    "Photo updated successfully! ✅",

                photo:
                    updatedPhoto

            });

        } catch (error) {

            console.error(
                "UPDATE PHOTO ERROR:",
                error
            );

            if (
                req.file &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                try {

                    fs.unlinkSync(
                        req.file.path
                    );

                } catch {}

            }

            res.status(500).json({

                message:
                    "Failed to update photo."

            });

        }

    }
);

// ======================================================
// DELETE PHOTO
// ======================================================

app.delete(
    "/api/photos/:id",
    (req, res) => {

        try {

            const id =
                Number(
                    req.params.id
                );

            const photo =
                db
                    .prepare(`
                        SELECT *
                        FROM photos
                        WHERE id = ?
                    `)
                    .get(id);

            if (!photo) {

                return res.status(404).json({

                    message:
                        "Photo not found."

                });

            }

            let originalFilename =
                null;

            try {

                const imageData =
                    JSON.parse(
                        photo.image
                    );

                originalFilename =
                    imageData.original;

            } catch {}

            if (
                originalFilename
            ) {

                const originalPath =
                    path.join(
                        originalDir,
                        path.basename(
                            originalFilename
                        )
                    );

                if (
                    fs.existsSync(
                        originalPath
                    )
                ) {

                    fs.unlinkSync(
                        originalPath
                    );

                }

                const previewFilename =
                    path.parse(
                        originalFilename
                    ).name + ".jpg";

                const previewPath =
                    path.join(
                        previewDir,
                        previewFilename
                    );

                if (
                    fs.existsSync(
                        previewPath
                    )
                ) {

                    fs.unlinkSync(
                        previewPath
                    );

                }

            }

            db
                .prepare(`
                    DELETE FROM photos
                    WHERE id = ?
                `)
                .run(id);

            res.json({

                message:
                    "Photo deleted successfully."

            });

        } catch (error) {

            console.error(
                "DELETE PHOTO ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to delete photo."

            });

        }

    }
);

// ======================================================
// BLURRED PREVIEW
// ======================================================

app.get(
    "/api/photos/preview/:filename",
    (req, res) => {

        const filename =
            path.basename(
                req.params.filename
            );

        const previewPath =
            path.join(
                previewDir,
                filename
            );

        if (
            !fs.existsSync(
                previewPath
            )
        ) {

            return res.status(404).json({

                message:
                    "Preview not found."

            });

        }

        res.sendFile(
            previewPath
        );

    }
);

// ======================================================
// CREATE RAZORPAY ORDER
// ======================================================

app.post(
    "/api/create-order",
    async (req, res) => {

        try {

            const {
                photoId
            } = req.body;

            const photo =
                db
                    .prepare(`
                        SELECT *
                        FROM photos
                        WHERE id = ?
                    `)
                    .get(
                        Number(
                            photoId
                        )
                    );

            if (!photo) {

                return res.status(404).json({

                    message:
                        "Photo not found."

                });

            }

            const amount =
                Math.round(
                    Number(
                        photo.price
                    ) * 100
                );

            const order =
                await razorpay
                    .orders
                    .create({

                        amount:

                            amount,

                        currency:
                            "INR",

                        receipt:
                            `photo_${photo.id}_${Date.now()}`,

                        notes: {

                            photo_id:
                                String(
                                    photo.id
                                )

                        }

                    });

            res.json({

                success:
                    true,

                keyId:
                    process.env.RAZORPAY_KEY_ID,

                orderId:
                    order.id,

                amount:
                    order.amount,

                currency:
                    order.currency,

                order:
                    order

            });

        } catch (error) {

            console.error(
                "CREATE ORDER ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to create payment order."

            });

        }

    }
);

// ======================================================
// ORDERS ALIAS
// ======================================================

app.post(
    "/api/orders",
    async (req, res) => {

        try {

            const {
                photoId
            } = req.body;

            const photo =
                db
                    .prepare(`
                        SELECT *
                        FROM photos
                        WHERE id = ?
                    `)
                    .get(
                        Number(
                            photoId
                        )
                    );

            if (!photo) {

                return res.status(404).json({

                    message:
                        "Photo not found."

                });

            }

            const order =
                await razorpay
                    .orders
                    .create({

                        amount:
                            Math.round(
                                Number(
                                    photo.price
                                ) * 100
                            ),

                        currency:
                            "INR",

                        receipt:
                            `photo_${photo.id}_${Date.now()}`,

                        notes: {

                            photo_id:
                                String(
                                    photo.id
                                )

                        }

                    });

            res.json({

                success:
                    true,

                keyId:
                    process.env.RAZORPAY_KEY_ID,

                orderId:
                    order.id,

                amount:
                    order.amount,

                currency:
                    order.currency,

                order:
                    order

            });

        } catch (error) {

            console.error(
                "CREATE ORDER ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to create payment order."

            });

        }

    }
);

// ======================================================
// VERIFY PAYMENT
// ======================================================

app.post(
    "/api/payment/verify",
    (req, res) => {

        try {

            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                photo_id
            } = req.body;

            if (
                !razorpay_order_id ||
                !razorpay_payment_id ||
                !razorpay_signature ||
                !photo_id
            ) {

                return res.status(400).json({

                    message:
                        "Missing payment information."

                });

            }

            const generatedSignature =
                crypto
                    .createHmac(
                        "sha256",
                        process.env.RAZORPAY_KEY_SECRET
                    )
                    .update(
                        `${razorpay_order_id}|${razorpay_payment_id}`
                    )
                    .digest(
                        "hex"
                    );

            const expected =
                Buffer.from(
                    generatedSignature
                );

            const received =
                Buffer.from(
                    razorpay_signature
                );

            if (
                expected.length !==
                    received.length ||
                !crypto.timingSafeEqual(
                    expected,
                    received
                )
            ) {

                return res.status(400).json({

                    message:
                        "Payment verification failed."

                });

            }

            const photo =
                db
                    .prepare(`
                        SELECT *
                        FROM photos
                        WHERE id = ?
                    `)
                    .get(
                        Number(
                            photo_id
                        )
                    );

            if (!photo) {

                return res.status(404).json({

                    message:
                        "Photo not found."

                });

            }

            const existingPurchase =
                db
                    .prepare(`
                        SELECT *
                        FROM purchases
                        WHERE payment_id = ?
                    `)
                    .get(
                        razorpay_payment_id
                    );

            if (
                !existingPurchase
            ) {

                db
                    .prepare(`
                        INSERT INTO purchases
                        (
                            photo_id,
                            payment_id,
                            order_id,
                            amount
                        )
                        VALUES (?, ?, ?, ?)
                    `)
                    .run(

                        Number(
                            photo_id
                        ),

                        razorpay_payment_id,

                        razorpay_order_id,

                        Number(
                            photo.price
                        )

                    );

            }

            res.json({

                success:
                    true,

                message:
                    "Payment verified successfully! 🔓",

                photoId:
                    Number(
                        photo_id
                    ),

                paymentId:
                    razorpay_payment_id

            });

        } catch (error) {

            console.error(
                "PAYMENT VERIFY ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Payment verification failed."

            });

        }

    }
);

// ======================================================
// VERIFY PAYMENT ALIAS
// ======================================================

app.post(
    "/api/verify-payment",
    (req, res) => {

        try {

            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                photo_id
            } = req.body;

            if (
                !razorpay_order_id ||
                !razorpay_payment_id ||
                !razorpay_signature ||
                !photo_id
            ) {

                return res.status(400).json({

                    message:
                        "Missing payment information."

                });

            }

            const generatedSignature =
                crypto
                    .createHmac(
                        "sha256",
                        process.env.RAZORPAY_KEY_SECRET
                    )
                    .update(
                        `${razorpay_order_id}|${razorpay_payment_id}`
                    )
                    .digest(
                        "hex"
                    );

            if (
                generatedSignature !==
                razorpay_signature
            ) {

                return res.status(400).json({

                    message:
                        "Payment verification failed."

                });

            }

            const photo =
                db
                    .prepare(`
                        SELECT *
                        FROM photos
                        WHERE id = ?
                    `)
                    .get(
                        Number(
                            photo_id
                        )
                    );

            if (!photo) {

                return res.status(404).json({

                    message:
                        "Photo not found."

                });

            }

            const existingPurchase =
                db
                    .prepare(`
                        SELECT *
                        FROM purchases
                        WHERE payment_id = ?
                    `)
                    .get(
                        razorpay_payment_id
                    );

            if (
                !existingPurchase
            ) {

                db
                    .prepare(`
                        INSERT INTO purchases
                        (
                            photo_id,
                            payment_id,
                            order_id,
                            amount
                        )
                        VALUES (?, ?, ?, ?)
                    `)
                    .run(

                        Number(
                            photo_id
                        ),

                        razorpay_payment_id,

                        razorpay_order_id,

                        Number(
                            photo.price
                        )

                    );

            }

            res.json({

                success:
                    true,

                message:
                    "Payment verified successfully! 🔓",

                photoId:
                    Number(
                        photo_id
                    ),

                paymentId:
                    razorpay_payment_id

            });

        } catch (error) {

            console.error(
                "VERIFY PAYMENT ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Payment verification failed."

            });

        }

    }
);

// ======================================================
// PROTECTED ORIGINAL IMAGE
// ======================================================

app.get(
    "/api/photos/original/:id",
    (req, res) => {

        try {

            const photoId =
                Number(
                    req.params.id
                );

            const paymentId =
                req.query.payment_id;

            if (!paymentId) {

                return res.status(403).json({

                    message:
                        "Payment required to access this photo."

                });

            }

            const purchase =
                db
                    .prepare(`
                        SELECT *
                        FROM purchases
                        WHERE photo_id = ?
                        AND payment_id = ?
                    `)
                    .get(
                        photoId,
                        paymentId
                    );

            if (!purchase) {

                return res.status(403).json({

                    message:
                        "You have not purchased this photo."

                });

            }

            const photo =
                db
                    .prepare(`
                        SELECT *
                        FROM photos
                        WHERE id = ?
                    `)
                    .get(
                        photoId
                    );

            if (!photo) {

                return res.status(404).json({

                    message:
                        "Photo not found."

                });

            }

            let originalFilename =
                null;

            try {

                const imageData =
                    JSON.parse(
                        photo.image
                    );

                originalFilename =
                    imageData.original;

            } catch {}

            if (!originalFilename) {

                return res.status(404).json({

                    message:
                        "Original image not found."

                });

            }

            const originalPath =
                path.join(
                    originalDir,
                    path.basename(
                        originalFilename
                    )
                );

            if (
                !fs.existsSync(
                    originalPath
                )
            ) {

                return res.status(404).json({

                    message:
                        "Original image file not found."

                });

            }

            res.sendFile(
                originalPath
            );

        } catch (error) {

            console.error(
                "ORIGINAL IMAGE ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to access original image."

            });

        }

    }
);

// ======================================================
// PURCHASES
// ======================================================

app.get(
    "/api/purchases",
    (req, res) => {

        try {

            const purchases =
                db
                    .prepare(`
                        SELECT
                            purchases.id,
                            purchases.photo_id,
                            purchases.payment_id,
                            purchases.order_id,
                            purchases.amount,
                            purchases.purchased_at,
                            photos.title
                        FROM purchases
                        LEFT JOIN photos
                        ON purchases.photo_id = photos.id
                        ORDER BY purchases.id DESC
                    `)
                    .all();

            res.json(
                purchases
            );

        } catch (error) {

            console.error(
                "PURCHASES ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to load purchases."

            });

        }

    }
);

// ======================================================
// STATS
// ======================================================

app.get(
    "/api/stats",
    (req, res) => {

        try {

            const photoCount =
                db
                    .prepare(`
                        SELECT COUNT(*) AS count
                        FROM photos
                    `)
                    .get()
                    .count;

            const purchaseCount =
                db
                    .prepare(`
                        SELECT COUNT(*) AS count
                        FROM purchases
                    `)
                    .get()
                    .count;

            const revenue =
                db
                    .prepare(`
                        SELECT COALESCE(
                            SUM(amount),
                            0
                        ) AS total
                        FROM purchases
                    `)
                    .get()
                    .total;

            res.json({

                photoCount,

                purchaseCount,

                revenue

            });

        } catch (error) {

            console.error(
                "STATS ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Failed to load statistics."

            });

        }

    }
);

// ======================================================
// GENERAL ERROR HANDLER
// ======================================================

app.use(
    (error, req, res, next) => {

        console.error(
            error
        );

        if (
            error instanceof
            multer.MulterError
        ) {

            return res.status(400).json({

                message:
                    `Upload error: ${error.message}`

            });

        }

        if (error) {

            return res.status(400).json({

                message:
                    error.message ||
                    "Something went wrong."

            });

        }

        next();

    }
);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success:
                true,

            message:
                "Pay-to-Unlock backend is running! 🚀"

        });

    }
);

// ======================================================
// TEST ROUTE
// ======================================================

app.get(
    "/test",
    (req, res) => {

        res.send(
            "TEST WORKS"
        );

    }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            "Private upload storage ready 🔒"
        );

    }
);