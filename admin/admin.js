// ============================================================
// PAY-TO-UNLOCK ADMIN PANEL
// ============================================================

// Local Node.js backend
const API_BASE = window.location.origin;

// ============================================================
// DOM ELEMENTS
// ============================================================

const photoInput = document.getElementById("photoInput");
const previewImage = document.getElementById("previewImage");
const uploadContent = document.getElementById("uploadContent");

const photoTitle = document.getElementById("photoTitle");
const photoPrice = document.getElementById("photoPrice");
const photoStatus = document.getElementById("photoStatus");
const photoDescription = document.getElementById("photoDescription");

const publishBtn = document.getElementById("publishBtn");
const resetBtn = document.getElementById("resetBtn");
const changeImageBtn = document.getElementById("changeImageBtn");

const photoGallery = document.getElementById("photoGallery");
const photoCount = document.getElementById("photoCount");

const purchaseTableBody =
    document.getElementById("purchaseTableBody");

const totalPhotos =
    document.getElementById("totalPhotos");

const totalPurchases =
    document.getElementById("totalPurchases");

const totalRevenue =
    document.getElementById("totalRevenue");

// ============================================================
// STATE
// ============================================================

let selectedFile = null;
let editingPhotoId = null;
let photos = [];

// ============================================================
// HELPER
// ============================================================

function getImageData(photo) {

    if (!photo || !photo.image) {
        return {
            preview: "",
            original: ""
        };
    }

    // New backend format
    try {

        const parsed = JSON.parse(photo.image);

        if (parsed && typeof parsed === "object") {
            return parsed;
        }

    } catch (error) {
        // Old database format
    }

    // Old image format
    return {
        preview: photo.image,
        original: photo.image
    };
}


// ============================================================
// IMAGE FILE SELECTION
// ============================================================

if (photoInput) {

    photoInput.addEventListener("change", function () {

        const file = this.files[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {

            alert("Please select a valid image.");

            this.value = "";

            return;
        }

        selectedFile = file;

        const reader = new FileReader();

        reader.onload = function (event) {

            if (previewImage) {

                previewImage.src =
                    event.target.result;

                previewImage.style.display =
                    "block";
            }

            if (uploadContent) {

                uploadContent.style.display =
                    "none";
            }
        };

        reader.readAsDataURL(file);

    });
}


// ============================================================
// CHANGE IMAGE BUTTON
// ============================================================

if (changeImageBtn) {

    changeImageBtn.addEventListener(
        "click",
        function () {

            if (photoInput) {
                photoInput.click();
            }

        }
    );
}


// ============================================================
// DRAG & DROP
// ============================================================

const uploadArea =
    document.querySelector(".upload-area");

if (uploadArea) {

    uploadArea.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            uploadArea.classList.add(
                "drag-over"
            );

        }
    );


    uploadArea.addEventListener(
        "dragleave",
        function () {

            uploadArea.classList.remove(
                "drag-over"
            );

        }
    );


    uploadArea.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            uploadArea.classList.remove(
                "drag-over"
            );

            const file =
                event.dataTransfer.files[0];

            if (!file) {
                return;
            }

            if (!file.type.startsWith("image/")) {

                alert(
                    "Please drop a valid image."
                );

                return;
            }

            selectedFile = file;

            const dataTransfer =
                new DataTransfer();

            dataTransfer.items.add(file);

            if (photoInput) {
                photoInput.files =
                    dataTransfer.files;
            }

            const reader =
                new FileReader();

            reader.onload =
                function (event) {

                    if (previewImage) {

                        previewImage.src =
                            event.target.result;

                        previewImage.style.display =
                            "block";
                    }

                    if (uploadContent) {

                        uploadContent.style.display =
                            "none";
                    }

                };

            reader.readAsDataURL(file);

        }
    );
}


// ============================================================
// PUBLISH / UPDATE PHOTO
// ============================================================

if (publishBtn) {

    publishBtn.addEventListener(
        "click",
        async function () {

            try {

                // --------------------------------------------
                // VALIDATION
                // --------------------------------------------

                const title =
                    photoTitle
                        ? photoTitle.value.trim()
                        : "";

                const price =
                    photoPrice
                        ? photoPrice.value.trim()
                        : "";

                const description =
                    photoDescription
                        ? photoDescription.value.trim()
                        : "";

                const status =
                    photoStatus
                        ? photoStatus.value
                        : "published";


                if (!title) {

                    alert(
                        "Please enter a photo title."
                    );

                    return;
                }


                if (!price || Number(price) <= 0) {

                    alert(
                        "Please enter a valid price."
                    );

                    return;
                }


                // New photo requires image
                if (!editingPhotoId && !selectedFile) {

                    alert(
                        "Please select a photo/image first."
                    );

                    return;
                }


                // --------------------------------------------
                // BUTTON STATE
                // --------------------------------------------

                publishBtn.disabled = true;

                publishBtn.textContent =
                    editingPhotoId
                        ? "Updating..."
                        : "Uploading...";


                // --------------------------------------------
                // FORM DATA
                // --------------------------------------------

                const formData =
                    new FormData();

                formData.append(
                    "title",
                    title
                );

                formData.append(
                    "price",
                    price
                );

                formData.append(
                    "description",
                    description
                );

                formData.append(
                    "status",
                    status
                );


                // Add image only when selected
                if (selectedFile) {

                    formData.append(
                        "image",
                        selectedFile
                    );
                }


                // --------------------------------------------
                // CREATE
                // --------------------------------------------

                let response;


                if (!editingPhotoId) {

                    response =
                        await fetch(
                            `${API_BASE}/api/photos`,
                            {
                                method: "POST",
                                body: formData
                            }
                        );

                }


                // --------------------------------------------
                // UPDATE
                // --------------------------------------------

                else {

                    response =
                        await fetch(
                            `${API_BASE}/api/photos/${editingPhotoId}`,
                            {
                                method: "PUT",
                                body: formData
                            }
                        );

                }


                // --------------------------------------------
                // READ RESPONSE SAFELY
                // --------------------------------------------

                const responseText =
                    await response.text();

                let data = {};

                try {

                    data =
                        responseText
                            ? JSON.parse(responseText)
                            : {};

                } catch (error) {

                    console.error(
                        "Invalid server response:",
                        responseText
                    );

                    throw new Error(
                        "Server returned an invalid response."
                    );
                }


                // --------------------------------------------
                // SERVER ERROR
                // --------------------------------------------

                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        `Server error (${response.status})`
                    );
                }


                // --------------------------------------------
                // SUCCESS
                // --------------------------------------------

                alert(
                    editingPhotoId
                        ? "Photo updated successfully! ✅"
                        : "Photo published successfully! 🎉"
                );


                editingPhotoId = null;

                publishBtn.textContent =
                    "Publish Photo";


                resetForm();


                await loadPhotos();

                await loadDashboardStats();


            } catch (error) {

                console.error(
                    "Publish error:",
                    error
                );


                alert(
                    "Could not save photo.\n\n" +
                    error.message
                );


            } finally {

                publishBtn.disabled = false;

                publishBtn.textContent =
                    "Publish Photo";

            }

        }
    );
}


// ============================================================
// LOAD PHOTOS
// ============================================================

async function loadPhotos() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/photos`
            );


        if (!response.ok) {

            throw new Error(
                `Could not load photos (${response.status}).`
            );
        }


        photos =
            await response.json();


        renderPhotos();


    } catch (error) {

        console.error(
            "Load photos error:",
            error
        );


        if (photoGallery) {

            photoGallery.innerHTML = `

                <div class="empty-message">

                    <div>⚠️</div>

                    <h3>
                        Backend not connected
                    </h3>

                    <p>
                        Make sure server.js is running
                        on port 5000.
                    </p>

                </div>

            `;

        }

    }
}


// ============================================================
// RENDER PHOTO GALLERY
// ============================================================

function renderPhotos() {

    if (!photoGallery) {
        return;
    }


    photoGallery.innerHTML = "";


    if (photoCount) {

        photoCount.textContent =
            photos.length;

    }


    if (photos.length === 0) {

        photoGallery.innerHTML = `

            <div class="empty-message">

                <div>📷</div>

                <h3>No photos yet</h3>

                <p>
                    Upload your first photo.
                </p>

            </div>

        `;

        return;
    }


    photos.forEach(function (photo) {

        const card =
            document.createElement("div");

        card.className =
            "photo-card";


        // --------------------------------------------
        // IMAGE
        // --------------------------------------------

        const image =
            document.createElement("img");

        const imageData =
            getImageData(photo);


        if (imageData.preview) {

            image.src =
                imageData.preview.startsWith("http")
                    ? imageData.preview
                    : `${API_BASE}${imageData.preview}`;

        }

        image.alt =
            photo.title || "Photo";


        // --------------------------------------------
        // INFO
        // --------------------------------------------

        const info =
            document.createElement("div");

        info.className =
            "photo-info";


        const title =
            document.createElement("h3");

        title.textContent =
            photo.title;


        const price =
            document.createElement("div");

        price.className =
            "photo-price";

        price.textContent =
            `₹${photo.price}`;


        const description =
            document.createElement("p");

        description.className =
            "photo-description";

        description.textContent =
            photo.description ||
            "No description";


        // --------------------------------------------
        // STATUS
        // --------------------------------------------

        const status =
            document.createElement("span");

        status.className =
            "photo-status";

        status.textContent =
            photo.status || "published";


        // --------------------------------------------
        // ACTIONS
        // --------------------------------------------

        const actions =
            document.createElement("div");

        actions.className =
            "photo-actions";


        // EDIT BUTTON

        const editButton =
            document.createElement("button");

        editButton.type =
            "button";

        editButton.textContent =
            "✏️ Edit";

        editButton.className =
            "edit-btn";


        editButton.addEventListener(
            "click",
            function () {

                editPhoto(photo);

            }
        );


        // DELETE BUTTON

        const deleteButton =
            document.createElement("button");

        deleteButton.type =
            "button";

        deleteButton.textContent =
            "🗑️ Delete";

        deleteButton.className =
            "delete-btn";


        deleteButton.addEventListener(
            "click",
            function () {

                deletePhoto(photo.id);

            }
        );


        // --------------------------------------------
        // BUILD CARD
        // --------------------------------------------

        actions.appendChild(
            editButton
        );

        actions.appendChild(
            deleteButton
        );


        info.appendChild(title);

        info.appendChild(price);

        info.appendChild(description);

        info.appendChild(status);

        info.appendChild(actions);


        card.appendChild(image);

        card.appendChild(info);


        photoGallery.appendChild(card);

    });

}


// ============================================================
// EDIT PHOTO
// ============================================================

function editPhoto(photo) {

    editingPhotoId =
        photo.id;


    if (photoTitle) {

        photoTitle.value =
            photo.title || "";

    }


    if (photoPrice) {

        photoPrice.value =
            photo.price || "";

    }


    if (photoStatus) {

        photoStatus.value =
            photo.status || "published";

    }


    if (photoDescription) {

        photoDescription.value =
            photo.description || "";

    }


    selectedFile = null;


    if (photoInput) {

        photoInput.value = "";

    }


    const imageData =
        getImageData(photo);


    if (
        previewImage &&
        imageData.preview
    ) {

        previewImage.src =
            imageData.preview.startsWith("http")
                ? imageData.preview
                : `${API_BASE}${imageData.preview}`;

        previewImage.style.display =
            "block";

    }


    if (uploadContent) {

        uploadContent.style.display =
            "none";

    }


    if (publishBtn) {

        publishBtn.textContent =
            "Update Photo";

    }


    // Scroll to form

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ============================================================
// DELETE PHOTO
// ============================================================

async function deletePhoto(photoId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this photo?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE}/api/photos/${photoId}`,
                {
                    method: "DELETE"
                }
            );


        const responseText =
            await response.text();


        let data = {};

        try {

            data =
                responseText
                    ? JSON.parse(responseText)
                    : {};

        } catch (error) {

            throw new Error(
                "Invalid server response."
            );

        }


        if (!response.ok) {

            throw new Error(
                data.message ||
                `Delete failed (${response.status})`
            );

        }


        alert(
            "Photo deleted successfully. 🗑️"
        );


        await loadPhotos();

        await loadDashboardStats();


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );


        alert(
            "Could not delete photo.\n\n" +
            error.message
        );

    }

}


// ============================================================
// RESET FORM
// ============================================================

function resetForm() {

    editingPhotoId = null;

    selectedFile = null;


    if (photoInput) {

        photoInput.value = "";

    }


    if (photoTitle) {

        photoTitle.value = "";

    }


    if (photoPrice) {

        photoPrice.value = "";

    }


    if (photoDescription) {

        photoDescription.value = "";

    }


    if (photoStatus) {

        photoStatus.value =
            "published";

    }


    if (previewImage) {

        previewImage.src = "";

        previewImage.style.display =
            "none";

    }


    if (uploadContent) {

        uploadContent.style.display =
            "block";

    }


    if (publishBtn) {

        publishBtn.textContent =
            "Publish Photo";

    }

}


// ============================================================
// RESET BUTTON
// ============================================================

if (resetBtn) {

    resetBtn.addEventListener(
        "click",
        function () {

            resetForm();

        }
    );

}


// ============================================================
// LOAD PURCHASES
// ============================================================

async function loadPurchases() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/purchases`
            );


        if (!response.ok) {

            throw new Error(
                `Could not load purchases (${response.status}).`
            );

        }


        const purchases =
            await response.json();


        if (!purchaseTableBody) {
            return;
        }


        purchaseTableBody.innerHTML =
            "";


        if (
            !purchases ||
            purchases.length === 0
        ) {

            purchaseTableBody.innerHTML = `

                <tr>

                    <td colspan="5">

                        No purchases yet.

                    </td>

                </tr>

            `;

            return;
        }


        purchases.forEach(
            function (purchase) {

                const row =
                    document.createElement("tr");


                const photo =
                    photos.find(
                        function (item) {

                            return (
                                Number(item.id) ===
                                Number(purchase.photo_id)
                            );

                        }
                    );


                const photoTitle =
                    photo
                        ? photo.title
                        : (
                            purchase.photo_title ||
                            `Photo #${purchase.photo_id}`
                        );


                const amount =
                    Number(
                        purchase.amount || 0
                    ).toFixed(2);


                const date =
                    purchase.purchased_at
                        ? new Date(
                            purchase.purchased_at
                        ).toLocaleString()
                        : "-";


                row.innerHTML = `

                    <td>
                        ${photoTitle}
                    </td>

                    <td>
                        ₹${amount}
                    </td>

                    <td>
                        ${purchase.payment_id || "-"}
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


                purchaseTableBody.appendChild(
                    row
                );

            }
        );


    } catch (error) {

        console.error(
            "Purchases error:",
            error
        );

    }

}


// ============================================================
// DASHBOARD STATISTICS
// ============================================================

async function loadDashboardStats() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/stats`
            );


        if (!response.ok) {

            throw new Error(
                `Could not load statistics (${response.status}).`
            );

        }


        const stats =
            await response.json();


        if (totalPhotos) {

            totalPhotos.textContent =
                stats.totalPhotos ?? 0;

        }


        if (totalPurchases) {

            totalPurchases.textContent =
                stats.totalPurchases ?? 0;

        }


        if (totalRevenue) {

            totalRevenue.textContent =
                `₹${Number(
                    stats.totalRevenue || 0
                ).toFixed(2)}`;

        }


    } catch (error) {

        console.error(
            "Dashboard stats error:",
            error
        );

    }

}


// ============================================================
// INITIAL LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        await loadPhotos();

        await loadPurchases();

        await loadDashboardStats();

    }
);