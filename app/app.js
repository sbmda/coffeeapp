// Registering serviceWorker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
    .then(registration => {
        console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch(error => {
        console.log("Service Worker registration failed:", error);
    });
}

// Check for IndexedDB support
if (!window.indexedDB) {
    console.error("IndexedDB is not supported in this browser.");
}

// Open or create the IndexedDB
const request = indexedDB.open("coffeeShopDB", 1);
let db;

request.onsuccess = (event) => {
    db = event.target.result;
    displayEntries(); // Load existing entries on success
};

request.onerror = (event) => {
    console.error("Database error:", event.target.error);
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    const objectStore = db.createObjectStore("entries", { keyPath: "id", autoIncrement: true });
    objectStore.createIndex("name", "name", { unique: false });
    objectStore.createIndex("order", "order", { unique: false });
};

let entryToDeleteId;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("sortByPrice").onclick = () => sortEntries("price");
    document.getElementById("sortByRating").onclick = () => sortEntries("rating");
    document.getElementById("sortByName").onclick = () => sortEntries("name");
    document.getElementById("postDelete").onclick = () => displayEntries();

    // Function to handle the deletion
    document.getElementById("deleteConfirm").addEventListener("click", function() {
        deleteEntry(entryToDeleteId);
        $('#supprimerModal').modal('hide'); // Hide the confirmation modal
    });


    document.querySelectorAll('.open-supprimer').forEach(function(button) { // pour tous les boutons de classe open-supprimer...
        button.addEventListener('click', function () { // event listener pour chaque bouton
          $('#supprimerModal').modal('show'); // avec jQuery, ouverture de la modal de confirmation pour supprimer
          entryToDeleteId = this.getAttribute('id');
        });
    });


    document.getElementById("searchBtn").onclick = () => {
        const searchQuery = document.getElementById("searchInput").value.toLowerCase();
        console.log(searchQuery);
        searchEntries(searchQuery); // Call the search function
    };

    // Add new entry on button click
    document.getElementById("finalAddBtn").onclick = async (event) => {
        const name = document.getElementById("newName").value;
        const address = document.getElementById("newAddress").value;
        const order = document.getElementById("newOrder").value;
        const price = parseFloat(document.getElementById("newPrice").value) || 0; // Default to 0 if parsing fails
        const rating = document.querySelector("input[name='rating']:checked")?.value || null;
        const review = document.getElementById("newReview").value;
        const photoFile = document.getElementById("newPhoto").files[0];
        
        // Convert image file to Blob
        const photoBlob = photoFile ? await getPhotoBlob(photoFile) : null;
        
        // Create entry object to store in IndexedDB
        const entry = {
            name,
            address,
            order,
            price,
            rating,
            review,
            photo: photoBlob // Store the photo Blob in the entry
        };

        console.log('Adding entry:', entry);
        addEntry(entry); // Store entry in IndexedDB
        document.getElementById("addMessage").innerHTML = '<div class="alert alert-success" role="alert">New entry added successfully!</div>';
        document.getElementById("ajouterForm").reset(); // Clear form after submission
    };
});

// Helper function to convert file to Blob
function getPhotoBlob(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(new Blob([reader.result])); // Convert ArrayBuffer to Blob
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Function to add entry to IndexedDB
function addEntry(entry) {
    const transaction = db.transaction("entries", "readwrite");
    const store = transaction.objectStore("entries");
    const request = store.add(entry);

    request.onsuccess = () => {
        console.log("Entry successfully added to IndexedDB");
        displayEntries(); // Refresh display after adding the entry
    };

    request.onerror = (event) => {
        console.error("Error adding entry:", event.target.error);
    };
}

function displayEntries() {
    const transaction = db.transaction("entries", "readonly");
    const store = transaction.objectStore("entries");
    const request = store.getAll(); // Fetch all entries

    request.onsuccess = (event) => {
        const entries = event.target.result;
        console.log('Fetched entries:', entries); // Log fetched entries
        const mainContainer = document.getElementById("mainContainer");
        
        // Clear the mainContainer before displaying new entries
        mainContainer.innerHTML = ''; 

        // Loop through entries and create cards
        entries.forEach(entry => {
            // Create card element
            const card = document.createElement("div");
            card.className = "card mb-3 shadow"; // Bootstrap card class
            card.style = "max-width: 540px;";

            // Create card body
            const cardBody = document.createElement("div");
            cardBody.className = "card-body";

            // Add content to card
            cardBody.innerHTML = `
                <h5 class="card-title">${entry.name}</h5>
                <p class="card-text"><strong>Address:</strong> ${entry.address}</p>
                <p class="card-text"><strong>Order:</strong> ${entry.order}</p>
                <p class="card-text"><strong>Price:</strong> $${entry.price}</p>
                <p class="card-text"><strong>Rating:</strong> ${entry.rating ? `${entry.rating} stars` : 'Not rated'}</p>
                <p class="card-text"><strong>Review:</strong> ${entry.review}</p>
            `;

            // Check if there's a photo and add it to the card
            if (entry.photo) {
                const photoURL = URL.createObjectURL(entry.photo);
                const img = document.createElement("img");
                img.src = photoURL;
                img.className = "card-img-top";
                img.alt = "Coffeeshop Image";
                card.appendChild(img);
            }

            // Delete button
            const deleteButton = document.createElement("button");
            deleteButton.className = "btn btn-outline-secondary open-supprimer";
            deleteButton.setAttribute("id", entry.id); // Store the entry ID as a data attribute
            deleteButton.innerHTML = `<img src="img/bootstrap-icons-1.11.3/trash-fill.svg" alt="delete">`;

            // Append button group to card body
            cardBody.appendChild(deleteButton);  

            // Append the card body to the card
            card.appendChild(cardBody);

            // Append the card to the main container
            mainContainer.appendChild(card);

            // Add delete button listeners after displaying entries
            addDeleteButtonListeners();
        });
    };

    request.onerror = (event) => {
        console.error("Error loading entries:", event.target.error);
    };
}

function sortEntries(criteria) {
    const transaction = db.transaction("entries", "readonly");
    const store = transaction.objectStore("entries");
    const request = store.getAll(); // Fetch all entries

    request.onsuccess = (event) => {
        const entries = event.target.result;

        // Sort entries based on the criteria
        entries.sort((a, b) => {
            if (criteria === "price") {
                return a.price - b.price; // Sort by price (ascending)
            } else if (criteria === "rating") {
                return (b.rating || 0) - (a.rating || 0); // Sort by rating (descending)
            } else if (criteria === "name") {
                return a.name.localeCompare(b.name); // Sort by name (alphabetically)
            }
        });

        // Display the sorted entries
        displaySortedEntries(entries);
    };

    request.onerror = (event) => {
        console.error("Error loading entries:", event.target.error);
    };
}

function displaySortedEntries(entries) {
    const mainContainer = document.getElementById("mainContainer");
    
    // Clear the mainContainer before displaying new entries
    mainContainer.innerHTML = '';

    // Loop through entries and create cards
    entries.forEach(entry => {
        // Create card element
        const card = document.createElement("div");
        card.className = "card mb-3 shadow"; // Bootstrap card class
        card.style = "max-width: 540px;";

        // Create card body
        const cardBody = document.createElement("div");
        cardBody.className = "card-body";

        // Add content to card
        cardBody.innerHTML = `
            <h5 class="card-title">${entry.name}</h5>
            <p class="card-text"><strong>Address:</strong> ${entry.address}</p>
            <p class="card-text"><strong>Order:</strong> ${entry.order}</p>
            <p class="card-text"><strong>Price:</strong> $${entry.price}</p>
            <p class="card-text"><strong>Rating:</strong> ${entry.rating ? `${entry.rating} stars` : 'Not rated'}</p>
            <p class="card-text"><strong>Review:</strong> ${entry.review}</p>
        `;

        // Check if there's a photo and add it to the card
        if (entry.photo) {
            const photoURL = URL.createObjectURL(entry.photo);
            const img = document.createElement("img");
            img.src = photoURL;
            img.className = "card-img-top";
            img.alt = "Coffeeshop Image";
            card.appendChild(img);
        }

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.className = "btn btn-outline-secondary open-supprimer";
        deleteButton.setAttribute("id", entry.id); // Store the entry ID as a data attribute
        deleteButton.innerHTML = `<img src="img/bootstrap-icons-1.11.3/trash-fill.svg" alt="delete">`;

        // Append button group to card body
        cardBody.appendChild(deleteButton);  

        // Append the card body to the card
        card.appendChild(cardBody);

        // Append the card to the main container
        mainContainer.appendChild(card);

        addDeleteButtonListeners();

    });
}

function searchEntries(query) {
    const transaction = db.transaction("entries", "readonly");
    const store = transaction.objectStore("entries");
    const request = store.getAll(); // Fetch all entries

    request.onsuccess = (event) => {
        const entries = event.target.result;

        // Filter entries based on the search query
        const filteredEntries = entries.filter(entry => {
            return (
                entry.name.toLowerCase().includes(query) ||
                entry.address.toLowerCase().includes(query) ||
                entry.order.toLowerCase().includes(query) ||
                entry.review.toLowerCase().includes(query)
            );
        });

        // Display the filtered entries
        displaySortedEntries(filteredEntries);
    };

    request.onerror = (event) => {
        console.error("Error loading entries:", event.target.error);
    };
}


// Attach event listeners to delete buttons when displaying entries
function addDeleteButtonListeners() {
    document.querySelectorAll('.open-supprimer').forEach(function(button) {
        button.addEventListener('click', function() {
            // Show the delete confirmation modal
            $('#supprimerModal').modal('show');
            // Get the ID of the entry from the button's data attribute
            entryToDeleteId = this.getAttribute('id');
        });
    });
}

// Your existing deleteEntry function
function deleteEntry(id) {
    const transaction = db.transaction("entries", "readwrite");
    const store = transaction.objectStore("entries");
    const request = store.delete(Number(id)); // Use the ID passed

    request.onsuccess = () => {
        console.log("Entry successfully deleted from IndexedDB");
        displayEntries(); // Refresh the displayed entries
        $('#deleteConfirmer').modal('show'); // Show the success modal
    };

    request.onerror = (event) => {
        console.error("Error deleting entry:", event.target.error);
    };
}