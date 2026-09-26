// ============================
// ELEMENTS
// ============================

const photoInput =
    document.getElementById("photoInput");

const uploadBox =
    document.getElementById("uploadBox");

const uploadContent =
    document.getElementById("uploadContent");

const previewImage =
    document.getElementById("previewImage");

const changeImageBtn =
    document.getElementById("changeImageBtn");

const photoTitle =
    document.getElementById("photoTitle");

const photoPrice =
    document.getElementById("photoPrice");

const photoDescription =
    document.getElementById("photoDescription");

const photoStatus =
    document.getElementById("photoStatus");

const publishBtn =
    document.getElementById("publishBtn");

const resetBtn =
    document.getElementById("resetBtn");

const photoGallery =
    document.getElementById("photoGallery");

const emptyMessage =
    document.getElementById("emptyMessage");

const photoCount =
    document.getElementById("photoCount");


// ============================
// VARIABLES
// ============================

let selectedImageData = null;

let photos = [];

let editingPhotoId = null;


// ============================
// OPEN FILE PICKER
// ============================

uploadBox.addEventListener(
    "click",
    function (event) {

        if (
            event.target === photoInput
        ) {
            return;
        }

        photoInput.click();

    }
);


// ============================
// CHOOSE IMAGE
// ============================

photoInput.addEventListener(
    "change",
    function () {

        const file =
            this.files[0];

        if (!file) {
            return;
        }


        if (
            !file.type.startsWith("image/")
        ) {

            alert(
                "Please select an image file."
            );

            return;
        }


        compressImage(file);

    }
);


// ============================
// COMPRESS IMAGE
// ============================

function compressImage(file) {

    const reader =
        new FileReader();


    reader.onload = function (event) {

        const img =
            new Image();


        img.onload = function () {

            const canvas =
                document.createElement(
                    "canvas"
                );


            const maxWidth = 1200;

            const maxHeight = 1200;


            let width =
                img.width;

            let height =
                img.height;


            if (
                width > maxWidth ||
                height > maxHeight
            ) {

                const ratio =
                    Math.min(
                        maxWidth / width,
                        maxHeight / height
                    );


                width =
                    Math.round(
                        width * ratio
                    );

                height =
                    Math.round(
                        height * ratio
                    );

            }


            canvas.width = width;

            canvas.height = height;


            const context =
                canvas.getContext(
                    "2d"
                );


            context.drawImage(
                img,
                0,
                0,
                width,
                height
            );


            selectedImageData =
                canvas.toDataURL(
                    "image/jpeg",
                    0.75
                );


            // SHOW PREVIEW

            previewImage.src =
                selectedImageData;


            previewImage.style.display =
                "block";


            // HIDE "ADD IMAGE"

            uploadContent.style.display =
                "none";


            // SHOW CHANGE BUTTON

            changeImageBtn.style.display =
                "block";

        };


        img.onerror = function () {

            alert(
                "Could not load this image."
            );

        };


        img.src =
            event.target.result;

    };


    reader.onerror = function () {

        alert(
            "Could not read the image."
        );

    };


    reader.readAsDataURL(file);

}


// ============================
// CHANGE IMAGE
// ============================

changeImageBtn.addEventListener(
    "click",
    function () {

        photoInput.click();

    }
);


// ============================
// PUBLISH / UPDATE
// ============================

publishBtn.addEventListener(
    "click",
    async function () {

        const title =
            photoTitle.value.trim();


        const price =
            Number(
                photoPrice.value
            );


        const description =
            photoDescription.value.trim();


        const status =
            photoStatus.value;


        // VALIDATION

        if (!selectedImageData) {

            alert(
                "Please select a photo."
            );

            return;
        }


        if (!title) {

            alert(
                "Please enter a photo title."
            );

            return;
        }


        if (
            !price ||
            price <= 0
        ) {

            alert(
                "Please enter a valid price."
            );

            return;
        }


        // BUTTON LOADING

        publishBtn.disabled =
            true;


        publishBtn.textContent =
            editingPhotoId
                ? "Updating..."
                : "Publishing...";


        try {

            const photoData = {

                title: title,

                price: price,

                description: description,

                status: status,

                image: selectedImageData

            };


            let response;


            // UPDATE

            if (editingPhotoId) {

                response =
                    await fetch(
                        `https://patient-creativity-production-c87f.up.railway.app/api/photos/${editingPhotoId}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    photoData
                                )
                        }
                    );

            }

            // CREATE

            else {

                response =
                    await fetch(
                        "https://patient-creativity-production-c87f.up.railway.app/api/photos",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    photoData
                                )
                        }
                    );

            }


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Something went wrong."
                );

            }


            alert(
                editingPhotoId
                    ? "Photo updated successfully! ✅"
                    : "Photo published successfully! 🎉"
            );


            editingPhotoId =
                null;


            publishBtn.textContent =
                "Publish Photo";


            await loadPhotos();


            resetForm();

        }


        catch (error) {

            console.error(
                error
            );


            alert(
                "Could not save photo.\n\n" +
                error.message
            );

        }


        finally {

            publishBtn.disabled =
                false;

            publishBtn.textContent =
                "Publish Photo";

        }

    }
);


// ============================
// LOAD PHOTOS
// ============================

async function loadPhotos() {

    try {

        const response =
            await fetch(
                "https://patient-creativity-production-c87f.up.railway.app/api/photos"
            );


        if (!response.ok) {

            throw new Error(
                "Could not load photos."
            );

        }


        photos =
            await response.json();


        renderPhotos();

    }


    catch (error) {

        console.error(
            error
        );


        photoGallery.innerHTML = `

            <div class="empty-message">

                <div>
                    ⚠️
                </div>

                <h3>
                    Backend not connected
                </h3>

                <p>
                    Make sure server.js is running.
                </p>

            </div>

        `;

    }

}


// ============================
// RENDER PHOTOS
// ============================

function renderPhotos() {

    photoGallery.innerHTML = "";


    photoCount.textContent =
        photos.length;


    if (
        photos.length === 0
    ) {

        photoGallery.appendChild(
            emptyMessage
        );

        return;

    }


    photos.forEach(
        function (photo) {


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "photo-card";


            const image =
                document.createElement(
                    "img"
                );


            image.src =
                photo.image;


            image.alt =
                photo.title;


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "photo-info";


            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                photo.title;


            const price =
                document.createElement(
                    "div"
                );


            price.className =
                "photo-price";


            price.textContent =
                `₹${photo.price}`;


            const description =
                document.createElement(
                    "p"
                );


            description.className =
                "photo-description";


            description.textContent =
                photo.description ||
                "No description";


            const actions =
                document.createElement(
                    "div"
                );


            actions.className =
                "photo-actions";


            const editButton =
                document.createElement(
                    "button"
                );


            editButton.className =
                "edit-btn";


            editButton.textContent =
                "Edit";


            editButton.addEventListener(
                "click",
                function () {

                    editPhoto(
                        photo.id
                    );

                }
            );


            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.className =
                "delete-btn";


            deleteButton.textContent =
                "Delete";


            deleteButton.addEventListener(
                "click",
                function () {

                    deletePhoto(
                        photo.id
                    );

                }
            );


            actions.appendChild(
                editButton
            );


            actions.appendChild(
                deleteButton
            );


            info.appendChild(
                title
            );


            info.appendChild(
                price
            );


            info.appendChild(
                description
            );


            info.appendChild(
                actions
            );


            card.appendChild(
                image
            );


            card.appendChild(
                info
            );


            photoGallery.appendChild(
                card
            );

        }
    );

}


// ============================
// EDIT PHOTO
// ============================

function editPhoto(id) {

    const photo =
        photos.find(
            item =>
                item.id === id
        );


    if (!photo) {
        return;
    }


    editingPhotoId =
        id;


    photoTitle.value =
        photo.title;


    photoPrice.value =
        photo.price;


    photoDescription.value =
        photo.description;


    photoStatus.value =
        photo.status;


    selectedImageData =
        photo.image;


    previewImage.src =
        photo.image;


    previewImage.style.display =
        "block";


    uploadContent.style.display =
        "none";


    changeImageBtn.style.display =
        "block";


    publishBtn.textContent =
        "Update Photo";


    document
        .getElementById("upload")
        .scrollIntoView({
            behavior: "smooth"
        });

}


// ============================
// DELETE PHOTO
// ============================

async function deletePhoto(id) {

    const confirmed =
        confirm(
            "Delete this photo?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `https://patient-creativity-production-c87f.up.railway.app/api/photos/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Delete failed."
            );

        }


        await loadPhotos();


    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "Could not delete photo."
        );

    }

}


// ============================
// RESET
// ============================

function resetForm() {

    photoInput.value =
        "";


    photoTitle.value =
        "";


    photoPrice.value =
        "";


    photoDescription.value =
        "";


    photoStatus.value =
        "published";


    selectedImageData =
        null;


    editingPhotoId =
        null;


    previewImage.src =
        "";


    previewImage.style.display =
        "none";


    uploadContent.style.display =
        "flex";


    changeImageBtn.style.display =
        "none";


    publishBtn.textContent =
        "Publish Photo";

}


// ============================
// RESET BUTTON
// ============================

resetBtn.addEventListener(
    "click",
    function () {

        resetForm();

    }
);


// ============================
// INITIAL LOAD
// ============================

loadPhotos();
// =========================
// LOAD PURCHASES
// =========================

async function loadPurchases() {

    try {

        const response = await fetch(
            "https://patient-creativity-production-c87f.up.railway.app/api/purchases"
        );


        if (!response.ok) {

            throw new Error(
                "Could not load purchases."
            );

        }


        const purchases = await response.json();


        const tableBody =
            document.getElementById(
                "purchaseTableBody"
            );


        if (!tableBody) {

            return;

        }


        if (purchases.length === 0) {

            tableBody.innerHTML = `

                <tr>

                    <td colspan="5">

                        No purchases yet.

                    </td>

                </tr>

            `;

            return;

        }


        tableBody.innerHTML = "";


        purchases.forEach(purchase => {

            const row =
                document.createElement("tr");


            const photo =
                typeof photos !== "undefined"

                    ? photos.find(
                        item =>
                            Number(item.id) ===
                            Number(purchase.photoId)
                    )

                    : null;


            const photoTitle =
                photo
                    ? photo.title
                    : `Photo #${purchase.photoId}`;


            const date =
                new Date(
                    purchase.purchasedAt
                ).toLocaleString();


            row.innerHTML = `

                <td>
                    ${photoTitle}
                </td>

                <td>
                    ₹${purchase.amount}
                </td>

                <td>
                    ${purchase.paymentId}
                </td>

                <td>
                    ${date}
                </td>

                <td>

                    <span class="purchase-status">
                        Paid ✓
                    </span>

                </td>

            `;


            tableBody.appendChild(row);

        });


    } catch (error) {

        console.error(
            "Purchase loading error:",
            error
        );

    }

}


// =========================
// LOAD ON PAGE OPEN
// =========================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadPurchases();

    }
);
// =========================
// LOAD DASHBOARD STATS
// =========================

async function loadDashboardStats() {

    try {

        const response = await fetch(
            "https://patient-creativity-production-c87f.up.railway.app/api/stats"
        );

        if (!response.ok) {

            throw new Error(
                "Could not load dashboard statistics."
            );

        }

        const stats = await response.json();


        // Total Photos

        const totalPhotos =
            document.getElementById(
                "totalPhotos"
            );

        if (totalPhotos) {

            totalPhotos.textContent =
                stats.totalPhotos;

        }


        // Total Purchases

        const totalPurchases =
            document.getElementById(
                "totalPurchases"
            );

        if (totalPurchases) {

            totalPurchases.textContent =
                stats.totalPurchases;

        }


        // Total Revenue

        const totalRevenue =
            document.getElementById(
                "totalRevenue"
            );

        if (totalRevenue) {

            totalRevenue.textContent =
                `₹${stats.totalRevenue}`;

        }

    } catch (error) {

        console.error(
            "Dashboard stats error:",
            error
        );

    }

}