const express = require("express");
const cors = require("cors");

const app = express();

const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));


// ============================
// TEST ROUTE
// ============================

app.get("/", (req, res) => {
    res.json({
        message: "Pay-to-Unlock backend is running! 🚀"
    });
});


// ============================
// PHOTO API
// ============================

let photos = [];


// Get all photos
app.get("/api/photos", (req, res) => {

    res.json(photos);

});


// Add a photo
app.post("/api/photos", (req, res) => {

    const {
        title,
        price,
        description,
        status,
        image
    } = req.body;


    if (!title || !price || !image) {

        return res.status(400).json({
            message: "Title, price and image are required."
        });

    }


    const newPhoto = {

        id: Date.now(),

        title: title,

        price: Number(price),

        description: description || "",

        status: status || "published",

        image: image

    };


    photos.push(newPhoto);


    res.status(201).json({

        message: "Photo uploaded successfully! 🎉",

        photo: newPhoto

    });

});


// Delete photo
app.delete("/api/photos/:id", (req, res) => {

    const id = Number(req.params.id);

    photos = photos.filter(
        photo => photo.id !== id
    );

    res.json({
        message: "Photo deleted successfully."
    });

});


// ============================
// START SERVER
// ============================

app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});