// ============================================================

// HOT WHEELS COLLECTION APP

// Complete replacement app.js

// ============================================================

const $ = (selector) => document.querySelector(selector);

let collection = [];

let currentPhoto = "";

let selectedId = null;

let stream = null;

// ------------------------------------------------------------

// STORAGE

// ------------------------------------------------------------

const STORAGE_KEY = "hotwheels_collection_v2";

function loadCollection() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {

            // Try to recover the old version's collection

            const oldSaved = localStorage.getItem("hw_collection");

            if (oldSaved) {

                collection = JSON.parse(oldSaved);

                localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));

                return;

            }

            collection = [];

            return;

        }

        const parsed = JSON.parse(saved);

        collection = Array.isArray(parsed) ? parsed : [];

    } catch (error) {

        console.error("Could not load collection:", error);

        collection = [];

        showToast("Could not load saved collection");

    }

}

function saveCollection() {

    try {

        localStorage.setItem(

            STORAGE_KEY,

            JSON.stringify(collection)

        );

        return true;

    } catch (error) {

        console.error("Could not save collection:", error);

        if (error.name === "QuotaExceededError") {

            showToast("Storage is full. Try a smaller photo.");

        } else {

            showToast("Could not save the car.");

        }

        return false;

    }

}

// ------------------------------------------------------------

// ID GENERATOR

// ------------------------------------------------------------

function createId() {

    return (

        Date.now().toString(36) +

        Math.random().toString(36).substring(2, 10)

    );

}

// ------------------------------------------------------------

// TOAST

// ------------------------------------------------------------

function showToast(message) {

    const toast = $("#toast");

    if (!toast) {

        alert(message);

        return;

    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2200);

}

// ------------------------------------------------------------

// MODALS

// ------------------------------------------------------------

function openModal(id) {

    const modal = $("#" + id);

    if (!modal) {

        console.error("Modal not found:", id);

        return;

    }

    modal.classList.remove("hidden");

    modal.setAttribute("aria-hidden", "false");

}

function closeModal(id) {

    const modal = $("#" + id);

    if (!modal) return;

    modal.classList.add("hidden");

    modal.setAttribute("aria-hidden", "true");

    if (id === "scanner") {

        stopCamera();

    }

}

// ------------------------------------------------------------

// CAMERA

// ------------------------------------------------------------

async function startCamera() {

    openModal("scanner");

    const video = $("#video");

    const message = $("#cameraMessage");

    if (!navigator.mediaDevices ||

        !navigator.mediaDevices.getUserMedia) {

        message.textContent =

            "Camera access isn't available here. Use Choose Photo instead.";

        return;

    }

    try {

        stream = await navigator.mediaDevices.getUserMedia({

            video: {

                facingMode: {

                    ideal: "environment"

                }

            },

            audio: false

        });

        video.srcObject = stream;

        await video.play();

        message.textContent =

            "Point the camera at the front of the Hot Wheels package.";

    } catch (error) {

        console.error("Camera error:", error);

        message.textContent =

            "Camera access wasn't available. Use Choose Photo instead.";

        showToast("Camera unavailable — choose a photo instead.");

    }

}

function stopCamera() {

    if (stream) {

        stream.getTracks().forEach(track => {

            track.stop();

        });

        stream = null;

    }

    const video = $("#video");

    if (video) {

        video.srcObject = null;

    }

}

// ------------------------------------------------------------

// PHOTO FILE HANDLING

// ------------------------------------------------------------

function readFileAsDataURL(file) {

    return new Promise((resolve, reject) => {

        if (!file) {

            reject(new Error("No file selected."));

            return;

        }

        const reader = new FileReader();

        reader.onload = () => {

            resolve(reader.result);

        };

        reader.onerror = () => {

            reject(new Error("Could not read the selected photo."));

        };

        reader.readAsDataURL(file);

    });

}

// ------------------------------------------------------------

// IMAGE COMPRESSION

// Prevents iPhone photos from filling localStorage.

// ------------------------------------------------------------

function compressImage(dataUrl, maxWidth = 1400, quality = 0.78) {

    return new Promise((resolve, reject) => {

        const image = new Image();

        image.onload = () => {

            let width = image.width;

            let height = image.height;

            if (width > maxWidth) {

                const ratio = maxWidth / width;

                width = maxWidth;

                height = Math.round(height * ratio);

            }

            const canvas = document.createElement("canvas");

            canvas.width = width;

            canvas.height = height;

            const context = canvas.getContext("2d");

            if (!context) {

                reject(new Error("Could not create image canvas."));

                return;

            }

            context.drawImage(

                image,

                0,

                0,

                width,

                height

            );

            resolve(

                canvas.toDataURL(

                    "image/jpeg",

                    quality

                )

            );

        };

        image.onerror = () => {

            reject(new Error("Could not process image."));

        };

        image.src = dataUrl;

    });

}

// ------------------------------------------------------------

// OPEN PHOTO REVIEW

// ------------------------------------------------------------

async function handlePhoto(dataUrl) {

    try {

        showToast("Preparing photo...");

        currentPhoto = await compressImage(dataUrl);

        stopCamera();

        closeModal("scanner");

        const preview = $("#preview");

        if (preview) {

            preview.src = currentPhoto;

        }

        // Clear previous form values

        $("#carName").value = "";

        $("#series").value = "";

        $("#year").value = new Date().getFullYear();

        $("#number").value = "";

        $("#notes").value = "";

        const aiStatus = $("#aiStatus");

        if (aiStatus) {

            aiStatus.textContent =

                "Photo captured. AI identification will be connected here. Review the information before adding the car.";

        }

        openModal("review");

    } catch (error) {

        console.error("Photo processing failed:", error);

        showToast("Could not process that photo.");

    }

}

// ------------------------------------------------------------

// CAPTURE CAMERA PHOTO

// ------------------------------------------------------------

function capturePhoto() {

    const video = $("#video");

    const canvas = $("#canvas");

    if (!video ||

        !canvas ||

        !video.videoWidth ||

        !video.videoHeight) {

        showToast("Camera isn't ready yet.");

        return;

    }

    canvas.width = video.videoWidth;

    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {

        showToast("Could not capture photo.");

        return;

    }

    context.drawImage(

        video,

        0,

        0,

        canvas.width,

        canvas.height

    );

    const dataUrl = canvas.toDataURL(

        "image/jpeg",

        0.88

    );

    handlePhoto(dataUrl);

}

// ------------------------------------------------------------

// RENDER COLLECTION

// ------------------------------------------------------------

function render() {

    const count = $("#count");

    if (count) {

        count.textContent = collection.length;

    }

    const searchInput = $("#search");

    const searchTerm =

        searchInput

            ? searchInput.value.trim().toLowerCase()

            : "";

    const filtered = collection.filter(car => {

        const searchableText = [

            car.name,

            car.series,

            car.year,

            car.number,

            car.notes

        ]

            .filter(Boolean)

            .join(" ")

            .toLowerCase();

        return searchableText.includes(searchTerm);

    });

    const grid = $("#collection");

    if (!grid) return;

    if (filtered.length === 0) {

        grid.innerHTML = "";

    } else {

        grid.innerHTML = filtered

            .map(car => {

                const name =

                    escapeHtml(

                        car.name || "Unnamed Hot Wheels"

                    );

                const meta =

                    escapeHtml(

                        [

                            car.series,

                            car.year

                        ]

                            .filter(Boolean)

                            .join(" • ")

                    );

                const image =

                    car.photo || "";

                return `

                    <article

                        class="card"

                        data-id="${escapeHtml(car.id)}"

                    >

                        <img

                            src="${image}"

                            alt="${name}"

                            loading="lazy"

                        >

                        <div class="card-info">

                            <div class="card-title">

                                ${name}

                            </div>

                            <div class="card-meta">

                                ${meta}

                            </div>

                        </div>

                    </article>

                `;

            })

            .join("");

    }

    const empty = $("#empty");

    if (empty) {

        empty.style.display =

            collection.length === 0

                ? "block"

                : "none";

    }

    document

        .querySelectorAll(".card")

        .forEach(card => {

            card.addEventListener(

                "click",

                () => {

                    showDetails(

                        card.dataset.id

                    );

                }

            );

        });

}

// ------------------------------------------------------------

// ESCAPE HTML

// ------------------------------------------------------------

function escapeHtml(value) {

    return String(value || "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}

// ------------------------------------------------------------

// SHOW DETAILS

// ------------------------------------------------------------

function showDetails(id) {

    const car =

        collection.find(

            item => item.id === id

        );

    if (!car) {

        showToast("Car not found.");

        return;

    }

    selectedId = id;

    $("#detailTitle").textContent =

        car.name || "Unnamed Hot Wheels";

    $("#detailImage").src =

        car.photo || "";

    $("#detailImage").alt =

        car.name || "Hot Wheels package";

    $("#detailMeta").textContent =

        [

            car.series,

            car.year,

            car.number

        ]

            .filter(Boolean)

            .join(" • ");

    $("#detailNotes").textContent =

        car.notes || "No notes.";

    openModal("details");

}

// ------------------------------------------------------------

// ADD CAR

// ------------------------------------------------------------

function addCar() {

    try {

        if (!currentPhoto) {

            showToast(

                "Please choose or take a photo first."

            );

            return;

        }

        const name =

            $("#carName").value.trim();

        const series =

            $("#series").value.trim();

        const year =

            $("#year").value.trim();

        const number =

            $("#number").value.trim();

        const notes =

            $("#notes").value.trim();

        if (!name) {

            showToast(

                "Please enter the car name."

            );

            $("#carName").focus();

            return;

        }

        const newCar = {

            id: createId(),

            name: name,

            series: series,

            year: year,

            number: number,

            notes: notes,

            photo: currentPhoto,

            createdAt: Date.now()

        };

        // Add newest car to beginning

        collection.unshift(newCar);

        // Attempt save

        const saved = saveCollection();

        if (!saved) {

            // Undo if storage failed

            collection.shift();

            return;

        }

        // Reset photo after successful save

        currentPhoto = "";

        // Close review

        closeModal("review");

        // Reset form

        $("#carName").value = "";

        $("#series").value = "";

        $("#year").value = "";

        $("#number").value = "";

        $("#notes").value = "";

        // Refresh collection

        render();

        showToast(

            `${name} added to your collection!`

        );

    } catch (error) {

        console.error(

            "ADD CAR ERROR:",

            error

        );

        showToast(

            "Something went wrong while adding the car."

        );

    }

}

// ------------------------------------------------------------

// DELETE CAR

// ------------------------------------------------------------

function deleteSelectedCar() {

    if (!selectedId) {

        return;

    }

    const car =

        collection.find(

            item => item.id === selectedId

        );

    if (!car) {

        return;

    }

    const confirmed =

        confirm(

            `Remove "${car.name}" from your collection?`

        );

    if (!confirmed) {

        return;

    }

    collection =

        collection.filter(

            item => item.id !== selectedId

        );

    saveCollection();

    selectedId = null;

    closeModal("details");

    render();

    showToast("Car removed.");

}

// ------------------------------------------------------------

// EVENT LISTENERS

// ------------------------------------------------------------

function setupEvents() {

    // Scan buttons

    const scanBtn = $("#scanBtn");

    if (scanBtn) {

        scanBtn.addEventListener(

            "click",

            startCamera

        );

    }

    const emptyScan = $("#emptyScan");

    if (emptyScan) {

        emptyScan.addEventListener(

            "click",

            startCamera

        );

    }

    const navScan = $("#navScan");

    if (navScan) {

        navScan.addEventListener(

            "click",

            startCamera

        );

    }

    // Camera capture

    const captureBtn = $("#captureBtn");

    if (captureBtn) {

        captureBtn.addEventListener(

            "click",

            capturePhoto

        );

    }

    // Photo upload

    const photoInput = $("#photoInput");

    if (photoInput) {

        photoInput.addEventListener(

            "change",

            async event => {

                const file =

                    event.target.files &&

                    event.target.files[0];

                if (!file) {

                    return;

                }

                try {

                    const dataUrl =

                        await readFileAsDataURL(

                            file

                        );

                    await handlePhoto(

                        dataUrl

                    );

                } catch (error) {

                    console.error(

                        error

                    );

                    showToast(

                        "Could not load that photo."

                    );

                }

                // Allows choosing the same image again

                event.target.value = "";

            }

        );

    }

    // Search

    const search = $("#search");

    if (search) {

        search.addEventListener(

            "input",

            render

        );

    }

    // Save / submit

    const saveBtn = $("#saveBtn");

    if (saveBtn) {

        saveBtn.addEventListener(

            "click",

            addCar

        );

    }

    // Delete

    const deleteBtn = $("#deleteBtn");

    if (deleteBtn) {

        deleteBtn.addEventListener(

            "click",

            deleteSelectedCar

        );

    }

    // Close buttons

    document

        .querySelectorAll("[data-close]")

        .forEach(button => {

            button.addEventListener(

                "click",

                () => {

                    closeModal(

                        button.dataset.close

                    );

                }

            );

        });

    // Sort

    const sortBtn = $("#sortBtn");

    if (sortBtn) {

        sortBtn.addEventListener(

            "click",

            () => {

                collection.reverse();

                saveCollection();

                render();

                showToast(

                    "Collection order changed."

                );

            }

        );

    }

    // Close modal when tapping outside panel

    document

        .querySelectorAll(".modal")

        .forEach(modal => {

            modal.addEventListener(

                "click",

                event => {

                    if (

                        event.target === modal

                    ) {

                        closeModal(

                            modal.id

                        );

                    }

                }

            );

        });

}

// ------------------------------------------------------------

// SERVICE WORKER

// ------------------------------------------------------------

function registerServiceWorker() {

    if (

        "serviceWorker" in navigator

    ) {

        window.addEventListener(

            "load",

            () => {

                navigator.serviceWorker

                    .register("./sw.js")

                    .then(() => {

                        console.log(

                            "Service worker registered."

                        );

                    })

                    .catch(error => {

                        console.warn(

                            "Service worker failed:",

                            error

                        );

                    });

            }

        );

    }

}

// ------------------------------------------------------------

// INITIALIZE

// ------------------------------------------------------------

function init() {

    console.log(

        "Hot Wheels Collection starting..."

    );

    loadCollection();

    setupEvents();

    registerServiceWorker();

    render();

    console.log(

        `Loaded ${collection.length} cars.`

    );

}

document.addEventListener(

    "DOMContentLoaded",

    init

);
