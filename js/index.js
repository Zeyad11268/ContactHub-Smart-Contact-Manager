/* ========================================
   GLOBAL VARIABLES
   contacts: array of contact objects, persisted to localStorage
   currentIndex: index of the contact currently being edited, -1 = none
======================================== */
var contacts = [];
var currentIndex = -1;

/* ========================================
   DOM ELEMENTS
   Elements are looked up inline via getElementById() where they are
   used (existing project convention) rather than cached up front.
======================================== */

/* ========================================
   LOCAL STORAGE
======================================== */

// Loads any previously saved contacts from localStorage into the
// global `contacts` array. Falls back to an empty array if nothing
// is stored yet or the saved data can't be parsed.
function loadContacts() {
  try {
    if (localStorage.getItem("contacts") !== null) {
      contacts = JSON.parse(localStorage.getItem("contacts"));
    }
  } catch (e) {
    contacts = [];
  }
}

// Persists the current `contacts` array to localStorage.
function saveContacts() {
  localStorage.setItem("contacts", JSON.stringify(contacts));
}

/* ========================================
   INITIALIZATION
   Restores contacts from localStorage (if present) and renders
   the list, counters, and sidebar panels on first paint.
======================================== */
loadContacts();
refreshUI();

// If the user cancels/closes the modal while editing (without saving),
// make sure the form goes back to "Add" mode for next time.
document
  .getElementById("exampleModal")
  .addEventListener("hidden.bs.modal", function () {
    document.getElementById("addConBut").classList.remove("d-none");
    document.getElementById("updateConBut").classList.add("d-none");
    currentIndex = -1;
  });

/* ========================================
   HELPER FUNCTIONS
======================================== */

// Reads and trims all Add/Edit Contact modal fields into one object.
function getFormData() {
  var file = document.getElementById("photoInput").files[0];

  return {
    name: document.getElementById("nameInput").value.trim(),
    phone: document.getElementById("phoneInput").value.trim(),
    email: document.getElementById("emailInput").value.trim(),
    group: document.getElementById("groupInput").value,
    address: document.getElementById("addressInput").value.trim(),
    notes: document.getElementById("notesInput").value.trim(),
    fav: document.getElementById("favoriteInput").checked,
    emg: document.getElementById("emergencyInput").checked,

    image: file ? "image/" + file.name : "",
  };
}

// Resets all Add/Edit Contact modal fields to their default state.
function clearForm() {
  document.getElementById("nameInput").value = "";
  document.getElementById("phoneInput").value = "";
  document.getElementById("emailInput").value = "";
  document.getElementById("groupInput").value = "Select Group";
  document.getElementById("addressInput").value = "";
  document.getElementById("notesInput").value = "";
  document.getElementById("favoriteInput").checked = false;
  document.getElementById("emergencyInput").checked = false;
  document.getElementById("photoInput").value = "";
}

// Returns the real position of a contact inside the full `contacts`
// array. When rendering a filtered/searched list, each item carries
// an `originalIndex` (set in searchContacts()); this must be checked
// with typeof rather than a truthy check, because index 0 is a
// perfectly valid (but falsy) originalIndex.
function getRealIndex(item, i) {
  if (typeof item.originalIndex !== "undefined") {
    return item.originalIndex;
  }
  return i;
}

/* ========================================
   VALIDATION
======================================== */

// Checks every field in order and stops at the first problem found,
// showing a single specific SweetAlert for that field. Returns true
// only when every field passes.
function validateContact(contact) {
  var nameRegex = /^[A-Za-z\u0600-\u06FF\s]+$/;
  var digitsOnlyRegex = /^[0-9]+$/;
  var egyptianPhoneRegex = /^(010|011|012|015)[0-9]{8}$/;
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---- Name ----
  if (contact.name === "") {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Please enter the contact name.",
    });
    return false;
  }
  if (contact.name.length < 3 || !nameRegex.test(contact.name)) {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Name must be at least 3 characters.",
    });
    return false;
  }

  // ---- Phone ----
  if (contact.phone === "") {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Please enter the phone number.",
    });
    return false;
  }
  if (!digitsOnlyRegex.test(contact.phone)) {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Phone number must contain only digits.",
    });
    return false;
  }
  if (!egyptianPhoneRegex.test(contact.phone)) {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Please enter a valid Egyptian mobile number.",
    });
    return false;
  }

  // ---- Email ----
  if (contact.email === "") {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Please enter the email address.",
    });
    return false;
  }
  if (!emailRegex.test(contact.email)) {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Please enter a valid email address.",
    });
    return false;
  }

  // ---- Address ----
  if (contact.address === "") {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Please enter the address.",
    });
    return false;
  }
  if (contact.address.length < 5) {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Address is too short.",
    });
    return false;
  }

  // ---- Notes (optional) ----
  if (contact.notes.length > 300) {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Notes cannot exceed 300 characters.",
    });
    return false;
  }

  // ---- Group ----
  if (contact.group === "" || contact.group === "Select Group") {
    Swal.fire({
      icon: "error",
      title: "Validation Error",
      text: "Please select a contact group.",
    });
    return false;
  }

  // ---- Duplicate Phone ----
  for (var i = 0; i < contacts.length; i++) {
    if (contacts[i].phone === contact.phone && i !== currentIndex) {
      Swal.fire({
        icon: "error",
        title: "Duplicate Phone",
        text:
          'This phone number is already registered under the name "' +
          contacts[i].name +
          '". Please enter a different phone number.',
      });

      return false;
    }
  }

  return true;
}
// Validates the phone number input field and shows/hides the error message.
function validatePhoneNumber() {
  var phone = document.getElementById("phoneInput").value.trim();
  var phoneError = document.getElementById("phoneError");

  var digitsOnlyRegex = /^[0-9]+$/;
  var egyptianPhoneRegex = /^(010|011|012|015)[0-9]{8}$/;

  if (phone === "" || !digitsOnlyRegex.test(phone) || !egyptianPhoneRegex.test(phone)) {
    phoneError.classList.remove("d-none");
    return false;
  }

  phoneError.classList.add("d-none");
  return true;
}

// Validates the name input field and shows/hides the error message.
function validateName() {
  var name = document.getElementById("nameInput").value.trim();
  var nameError = document.getElementById("nameError");

  var nameRegex = /^[A-Za-z\u0600-\u06FF\s]{2,50}$/;

  if (name === "" || !nameRegex.test(name)) {
    nameError.classList.remove("d-none");
    return false;
  }

  nameError.classList.add("d-none");
  return true;
}

document.getElementById("nameInput").addEventListener("blur", validateName);
document.getElementById("phoneInput").addEventListener("blur", validatePhoneNumber);

/* ========================================
   CRUD OPERATIONS
======================================== */

// Validates and adds a new contact, then resets the form and re-renders.
function addContact() {
  var contact = getFormData();

  if (!validateContact(contact)) {
    return;
  }

  // اقفل الـ Modal
  var modal = bootstrap.Modal.getInstance(
    document.getElementById("exampleModal"),
  );
  modal.hide();

  // اعرض رسالة النجاح
  Swal.fire({
    icon: "success",
    title: "Success!",
    text: "Contact added successfully.",
    timer: 1500,
    showConfirmButton: false,
  });

  contacts.push(contact);
  clearForm();
  renderContacts();
}

// Populates the modal with an existing contact's data for editing.
function editContact(index) {
  currentIndex = index;

  document.getElementById("nameInput").value = contacts[index].name;
  document.getElementById("phoneInput").value = contacts[index].phone;
  document.getElementById("emailInput").value = contacts[index].email;
  document.getElementById("groupInput").value = contacts[index].group;
  document.getElementById("addressInput").value = contacts[index].address;
  document.getElementById("notesInput").value = contacts[index].notes;
  document.getElementById("favoriteInput").checked = contacts[index].fav;
  document.getElementById("emergencyInput").checked = contacts[index].emg;
  document.getElementById("photoInput").value = ""; // Reset file input

  document.getElementById("addConBut").classList.add("d-none");
  document.getElementById("updateConBut").classList.remove("d-none");

  var modal = new bootstrap.Modal(document.getElementById("exampleModal"));
  modal.show();
}

// Validates and saves changes to the contact currently being edited.
function updateContact() {
  var contact = getFormData();

  if (!validateContact(contact)) {
    return;
  }

  contacts[currentIndex] = contact;

  clearForm();

  // close Modal
  // (closing the modal fires 'hidden.bs.modal' above, which already
  // resets the Add/Update button visibility and currentIndex)
  var modal = bootstrap.Modal.getInstance(
    document.getElementById("exampleModal"),
  );
  modal.hide();
  // success message
  Swal.fire({
    icon: "success",
    title: "Success!",
    text: "Contact updated successfully.",
    timer: 1500,
    showConfirmButton: false,
  });

  renderContacts();
}

// Deletes a contact after user confirmation (SweetAlert2).
function deleteContact(index) {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to recover this contact!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, Delete",
    cancelButtonText: "Cancel",
  }).then(function (result) {
    if (result.isConfirmed) {
      contacts.splice(index, 1);
      renderContacts();

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Contact deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  });
}

/* ========================================
   SEARCH
======================================== */

// Filters contacts by name/phone/email as the user types. Each match
// keeps track of its real position (originalIndex) in the full
// `contacts` array, so favorite/emergency toggles and edit/delete
// still target the correct contact while a filter is active.
function searchContacts() {
  var searchTerm = document.getElementById("searchInput").value.toLowerCase();
  var filteredContacts = [];

  for (var i = 0; i < contacts.length; i++) {
    var contact = {
      name: contacts[i].name,
      phone: contacts[i].phone,
      email: contacts[i].email,
      address: contacts[i].address,
      notes: contacts[i].notes,
      fav: contacts[i].fav,
      emg: contacts[i].emg,
      group: contacts[i].group,
      image: contacts[i].image,
      originalIndex: i,
    };
    if (
      contact.name.toLowerCase().indexOf(searchTerm) !== -1 ||
      contact.phone.indexOf(searchTerm) !== -1 ||
      contact.email.toLowerCase().indexOf(searchTerm) !== -1
    ) {
      filteredContacts.push(contact);
    }
  }

  display(filteredContacts);
}

/* ========================================
   FAVORITES
======================================== */

// Toggles the favorite flag for a given contact index and re-renders.
function addFav(index) {
  contacts[index].fav = !contacts[index].fav;
  renderContacts();
}

// Renders the Favorites sidebar panel.
function displayFavorites() {
  var favCounter = 0;
  var html = ``;

  for (var i = 0; i < contacts.length; i++) {
    if (contacts[i].fav) {
      favCounter++;

      html += `<div class="contact-row">
                                    <div class="avatar">${
                                      contacts[i].image
                                        ? `<img src="${contacts[i].image}" alt="${contacts[i].name}">`
                                        : contacts[i].name
                                            .charAt(0)
                                            .toUpperCase()
                                    }</div>
                                    <div class="contact-info">
                                        <h6>${contacts[i].name}</h6>
                                        <p>${contacts[i].phone}</p>
                                    </div>
                                    <a href="tel:${contacts[i].phone}" class="call-btn call-btn-green">
                                      <i class="fa-solid fa-phone"></i>
                                    </a>
                                </div>`;
    }
  }

  if (favCounter !== 0) {
    document.getElementById("favorfavorites-contacts").innerHTML = html;
    document.getElementById("noFavorits").classList.add("d-none");
  } else {
    document.getElementById("favorfavorites-contacts").innerHTML = "";
    document.getElementById("noFavorits").classList.remove("d-none");
  }
}

/* ========================================
   EMERGENCY
======================================== */

// Toggles the emergency flag for a given contact index and re-renders.
function addEmg(index) {
  contacts[index].emg = !contacts[index].emg;
  renderContacts();
}

// Renders the Emergency sidebar panel.
function displayEmergency() {
  var emgCounter = 0;
  var html = ``;
  for (var i = 0; i < contacts.length; i++) {
    if (contacts[i].emg) {
      emgCounter++;

      html += `<div class="contact-row">
                                    <div class="avatar">${
                                      contacts[i].image
                                        ? `<img src="${contacts[i].image}" alt="${contacts[i].name}">`
                                        : contacts[i].name
                                            .charAt(0)
                                            .toUpperCase()
                                    }</div>
                                    <div class="contact-info">
                                        <h6>${contacts[i].name}</h6>
                                        <p>${contacts[i].phone}</p>
                                    </div>
                                    <a href="tel:${contacts[i].phone}" class="call-btn call-btn-green">
                                        <i class="fa-solid fa-phone"></i>
                                    </a>
                                </div>`;
    }
  }

  if (emgCounter === 0) {
    html = `<div class="noEmergency text-center">
            <p class="empty-text">No emergency contacts</p>
            </div>`;
  }
  document.getElementById("emergency-contacts").innerHTML = html;
}

/* ========================================
   COUNTERS
======================================== */

// Updates the "Favorites" stat card counter.
function updateFavoritesCounter() {
  var count = 0;

  for (var i = 0; i < contacts.length; i++) {
    if (contacts[i].fav) {
      count++;
    }
  }

  document.getElementById("favoriteCount").innerHTML = count;
}

// Updates the "Emergency" stat card counter.
function updateEmergencyCounter() {
  var count = 0;
  for (var i = 0; i < contacts.length; i++) {
    if (contacts[i].emg) {
      count++;
    }
  }
  document.getElementById("emergencyCount").innerHTML = count;
}

// Keeps the "Total" stat card and the "Manage and organize your X
// contacts" line in sync. Both #contactCount elements need unique
// ids in the HTML — see the index.html fix note.
function updateContactCount() {
  var count = contacts.length;
  var countEl1 = document.getElementById("contactCount");
  var countEl2 = document.getElementById("contactCount2");

  if (countEl1) {
    countEl1.innerHTML = count;
  }
  if (countEl2) {
    countEl2.innerHTML = count;
  }
}

/* ========================================
   UI RENDERING
======================================== */

// Renders the main contact list from a given array of contacts
// (used for both the full list and filtered/search results).
function display(arr) {
  var html = ``;

  for (var i = 0; i < arr.length; i++) {
    var realIndex = getRealIndex(arr[i], i);

    html += `
                         <div class="col-12 col-lg-6">
                            <div class="card contact-card shadow-sm">

                                <div class="card-body">

                                    <div class="contact-header">

                                      <div class="avatar position-relative">

                                          ${
                                            arr[i].image
                                              ? `<img src="${arr[i].image}" alt="${arr[i].name}">`
                                              : arr[i].name
                                                  .charAt(0)
                                                  .toUpperCase()
                                          }

                                          ${
                                            arr[i].fav
                                              ? `<span class="contact-badge favorite-badge">
                                                      <i class="fa-solid fa-star"></i>
                                                </span>`
                                              : ""
                                          }

                                          ${
                                            arr[i].emg
                                              ? `<span class="contact-badge emergency-badge">
                                                      <i class="fa-solid fa-heart"></i>
                                                </span>`
                                              : ""
                                          }

                                      </div>

                                      <div class="contact-title">

                                          <h5 class="contact-name">
                                              ${arr[i].name}
                                          </h5>

                                      <div class="contact-item">
                                          <div class="info-icon phone-icon">
                                              <i class="fa-solid fa-phone"></i>
                                          </div>

                                          <span>${arr[i].phone}</span>
                                      </div>

                                      </div>

                                  </div>

                                  <div class="contact-content">


                                      <div class="contact-item">
                                          <div class="info-icon email-icon">
                                              <i class="fa-solid fa-envelope"></i>
                                          </div>

                                          <span>${arr[i].email}</span>
                                      </div>

                                      <div class="contact-item align-items-start">
                                          <div class="info-icon location-icon">
                                              <i class="fa-solid fa-location-dot"></i>
                                          </div>

                                          <span class="address">
                                              ${arr[i].address}
                                          </span>
                                      </div>

                                      ${
                                        arr[i].group
                                          ? `<div class="contact-badge-work">${arr[i].group}</div>`
                                          : ""
                                      }

                                  </div>

                                </div>

                                <div class="card-footer">

                                    <div class="d-flex justify-content-between align-items-center">

                                        <div class="d-flex gap-2">

                                            <a href="tel:${arr[i].phone}" class="action-btn phone-btn">
                                                <i class="fa-solid fa-phone"></i>
                                            </a>

                                            <a href="mailto:${arr[i].email}" class="action-btn mail-btn">
                                              <i class="fa-solid fa-envelope"></i>
                                            </a>

                                        </div>

                                        <div class="action-icons">

                                            ${
                                              arr[i].fav
                                                ? '<i class="fa-solid fa-star text-warning " onclick="addFav(' +
                                                  realIndex +
                                                  ')"></i>'
                                                : '<i class="fa-regular fa-star fav-icon" onclick="addFav(' +
                                                  realIndex +
                                                  ')"></i>'
                                            }
                                            ${
                                              arr[i].emg
                                                ? '<i class="fa-solid fa-heart text-danger" onclick="addEmg(' +
                                                  realIndex +
                                                  ')"></i>'
                                                : '<i class="fa-regular fa-heart emg-icon" onclick="addEmg(' +
                                                  realIndex +
                                                  ')"></i>'
                                            }   
                                            <i class="fa-solid fa-pen edit-icon" onclick="editContact(${realIndex})"></i>
                                            <i class="fa-solid fa-trash del-icon" onclick="deleteContact(${realIndex})"></i>

                                        </div>

                                    </div>

                                </div>

                            </div>
                        </div> `;
  }

  document.getElementById("contactsList").innerHTML = html;

  if (arr.length > 0) {
    document.getElementById("emptyList").classList.add("d-none");
  } else {
    document.getElementById("emptyList").classList.remove("d-none");
  }
}

// Central place that keeps storage, the main list, the counters,
// and both side panels (favorites/emergency) all in sync.
function renderContacts() {
  saveContacts();
  refreshUI();
}

// Shared "refresh everything on screen" sequence, used both on the
// initial page load and by renderContacts() after any change.
function refreshUI() {
  display(contacts);
  updateFavoritesCounter();
  updateEmergencyCounter();
  displayFavorites();
  displayEmergency();
  updateContactCount();
}
document.getElementById("nameInput").addEventListener("blur", validateName);
document.getElementById("phoneInput").addEventListener("blur", validatePhoneNumber);