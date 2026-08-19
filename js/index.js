/* ContactHub Phase 3: simple filtering, sorting, details, and recent contacts. */
var contacts = [];
var currentIndex = -1;
var currentSearchTerm = "";
var currentGroupFilter = "all";
var currentSort = "natural";
var currentImageData = "";
var pendingImageRead = Promise.resolve();
var darkModeEnabled = false;

function applyTheme(isDark) {
  darkModeEnabled = Boolean(isDark);
  document.documentElement.setAttribute("data-theme", darkModeEnabled ? "dark" : "light");

  var toggle = document.getElementById("themeToggle");
  var icon = document.getElementById("themeToggleIcon");
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(darkModeEnabled));
    toggle.setAttribute("title", darkModeEnabled ? "Switch to light mode" : "Switch to dark mode");
  }
  if (icon) {
    icon.className = darkModeEnabled ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }

  try {
    localStorage.setItem("contacthub-theme", darkModeEnabled ? "dark" : "light");
  } catch (error) {
    // Theme still applies for the current session when storage is unavailable.
  }
}

function initializeTheme() {
  var savedTheme = "";
  try {
    savedTheme = localStorage.getItem("contacthub-theme") || "";
  } catch (error) {
    savedTheme = "";
  }

  if (savedTheme === "dark") {
    applyTheme(true);
  } else if (savedTheme === "light") {
    applyTheme(false);
  } else {
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark);
  }
}

function showStorageError(message) {
  window.setTimeout(function () {
    if (typeof Swal !== "undefined") {
      Swal.fire({ icon: "error", title: "Storage Error", text: message });
    } else {
      window.alert(message);
    }
  }, 0);
}

function createContactId() {
  return "contact-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function normalizeContact(contact) {
  var item = contact && typeof contact === "object" ? contact : {};
  var createdAt = Number(item.createdAt);

  return {
    id: typeof item.id === "string" ? item.id : "",
    name: typeof item.name === "string" ? item.name : "",
    phone: typeof item.phone === "string" ? item.phone : "",
    email: typeof item.email === "string" ? item.email : "",
    group: typeof item.group === "string" ? item.group : "",
    address: typeof item.address === "string" ? item.address : "",
    notes: typeof item.notes === "string" ? item.notes : "",
    fav: item.fav === true,
    emg: item.emg === true,
    image: typeof item.image === "string" ? item.image : "",
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : 0,
  };
}

function ensureContactIdentity() {
  var usedIds = {};
  var changed = false;

  contacts.forEach(function (contact) {
    if (!contact.id || usedIds[contact.id]) {
      contact.id = createContactId();
      changed = true;
    }
    usedIds[contact.id] = true;
  });

  return changed;
}

function loadContacts() {
  try {
    var savedContacts = localStorage.getItem("contacts");

    if (savedContacts === null) {
      contacts = [];
      return;
    }

    var parsedContacts = JSON.parse(savedContacts);

    if (!Array.isArray(parsedContacts)) {
      throw new Error("Stored contacts are not an array.");
    }

    contacts = parsedContacts.map(normalizeContact);
    if (ensureContactIdentity()) {
      saveContacts();
    }
  } catch (error) {
    contacts = [];
    showStorageError(
      "Saved contact data could not be read. The current list is empty, but the stored value was not deleted."
    );
  }
}

function saveContacts() {
  try {
    localStorage.setItem("contacts", JSON.stringify(contacts));
    return true;
  } catch (error) {
    showStorageError(
      "Contacts could not be saved. Please check your browser storage and try again."
    );
    return false;
  }
}

function escapeHTML(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSafeImageSource(image) {
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(image)) return image;
  if (/^image\/[a-zA-Z0-9._-]+$/.test(image)) return image;
  return "";
}

function getInitial(name) {
  return escapeHTML((name || "?").charAt(0).toUpperCase());
}

function contactAvatar(contact) {
  var image = getSafeImageSource(contact.image);
  return image
    ? '<img src="' + image + '" alt="' + escapeHTML(contact.name) + '">'
    : getInitial(contact.name);
}

function showImagePreview(image) {
  var avatar = document.getElementById("userAvatar");
  var safeImage = getSafeImageSource(image || "");

  avatar.innerHTML = safeImage
    ? '<img src="' + safeImage + '" alt="Selected contact photo">'
    : '<i class="fa-solid fa-user" aria-hidden="true"></i>';
}

function setFieldError(inputId, errorId, isValid, message) {
  var input = document.getElementById(inputId);
  var error = document.getElementById(errorId);

  if (!input || !error) return isValid;
  input.classList.toggle("is-invalid", !isValid);
  error.textContent = message;
  error.classList.toggle("d-none", isValid);
  input.setAttribute("aria-invalid", String(!isValid));
  return isValid;
}

function validateName() {
  var value = document.getElementById("nameInput").value.trim();
  return setFieldError(
    "nameInput",
    "nameError",
    /^[A-Za-z\u0600-\u06FF\s]{3,50}$/.test(value),
    "Name must contain only letters and spaces and be 3–50 characters."
  );
}

function validatePhoneNumber() {
  var value = document.getElementById("phoneInput").value.trim();
  return setFieldError(
    "phoneInput",
    "phoneError",
    /^(010|011|012|015)[0-9]{8}$/.test(value),
    "Enter a valid Egyptian mobile number, for example 01012345678."
  );
}

function validateEmail() {
  var value = document.getElementById("emailInput").value.trim();
  return setFieldError(
    "emailInput",
    "emailError",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Enter a valid email address."
  );
}

function validateAddress() {
  var value = document.getElementById("addressInput").value.trim();
  return setFieldError(
    "addressInput",
    "addressError",
    value.length >= 5,
    "Address is required and must be at least 5 characters."
  );
}

function validateGroup() {
  var value = document.getElementById("groupInput").value;
  var valid = value !== "" && value !== "Select Group";
  var input = document.getElementById("groupInput");
  var error = document.getElementById("groupError");

  if (input && error) {
    input.classList.toggle("is-invalid", !valid);
    error.classList.toggle("d-none", valid);
    input.setAttribute("aria-invalid", String(!valid));
  }
  return valid;
}

function validateContact(contact) {
  var valid = true;
  if (!validateName()) valid = false;
  if (!validatePhoneNumber()) valid = false;
  if (!validateEmail()) valid = false;
  if (!validateAddress()) valid = false;
  if (!validateGroup()) valid = false;

  if (contact.notes.length > 300) {
    valid = false;
    if (typeof Swal !== "undefined") {
      Swal.fire({ icon: "error", title: "Validation Error", text: "Notes cannot exceed 300 characters." });
    }
  }

  for (var i = 0; i < contacts.length; i++) {
    if (contacts[i].phone === contact.phone && i !== currentIndex) {
      valid = false;
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "error",
          title: "Duplicate Phone",
          text: 'This phone number is already registered under the name "' + escapeHTML(contacts[i].name) + '".',
        });
      }
      break;
    }
  }
  return valid;
}

function getFormData() {
  var oldContact = currentIndex >= 0 ? contacts[currentIndex] : null;
  return {
    id: oldContact ? oldContact.id : "",
    createdAt: oldContact ? oldContact.createdAt : 0,
    name: document.getElementById("nameInput").value.trim(),
    phone: document.getElementById("phoneInput").value.trim(),
    email: document.getElementById("emailInput").value.trim(),
    group: document.getElementById("groupInput").value,
    address: document.getElementById("addressInput").value.trim(),
    notes: document.getElementById("notesInput").value.trim(),
    fav: document.getElementById("favoriteInput").checked,
    emg: document.getElementById("emergencyInput").checked,
    image: currentImageData,
  };
}

function resetValidationMessages() {
  [["nameInput", "nameError"], ["phoneInput", "phoneError"], ["emailInput", "emailError"], ["addressInput", "addressError"], ["groupInput", "groupError"]].forEach(function (field) {
    var input = document.getElementById(field[0]);
    var error = document.getElementById(field[1]);
    if (input) {
      input.classList.remove("is-invalid");
      input.setAttribute("aria-invalid", "false");
    }
    if (error) error.classList.add("d-none");
  });
  document.getElementById("imageError").classList.add("d-none");
}

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
  currentImageData = "";
  pendingImageRead = Promise.resolve();
  resetValidationMessages();
  showImagePreview("");
}

function setFormMode(isEditing) {
  document.getElementById("addConBut").classList.toggle("d-none", isEditing);
  document.getElementById("updateConBut").classList.toggle("d-none", !isEditing);
  document.getElementById("exampleModalLabel").textContent = isEditing ? "Edit Contact" : "Add New Contact";
}

function handlePhotoChange(event) {
  var file = event.target.files[0];
  var imageError = document.getElementById("imageError");
  imageError.classList.add("d-none");
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    imageError.textContent = "Please select an image file.";
    imageError.classList.remove("d-none");
    event.target.value = "";
    currentImageData = "";
    showImagePreview("");
    return;
  }

  pendingImageRead = new Promise(function (resolve) {
    var reader = new FileReader();
    reader.onload = function () {
      currentImageData = reader.result;
      showImagePreview(currentImageData);
      resolve();
    };
    reader.onerror = function () {
      imageError.textContent = "The selected image could not be read.";
      imageError.classList.remove("d-none");
      event.target.value = "";
      resolve();
    };
    reader.readAsDataURL(file);
  });
}

function showSuccess(message) {
  if (typeof Swal !== "undefined") {
    Swal.fire({ icon: "success", title: "Success!", text: message, timer: 1500, showConfirmButton: false });
  }
}

async function addContact() {
  await pendingImageRead;
  var contact = getFormData();
  if (!validateContact(contact)) return;

  contact.id = createContactId();
  contact.createdAt = Date.now();
  contacts.push(contact);

  if (!renderContacts()) {
    contacts.pop();
    refreshUI();
    return;
  }

  bootstrap.Modal.getInstance(document.getElementById("exampleModal")).hide();
  showSuccess("Contact added successfully.");
}

function editContact(index) {
  if (!contacts[index]) return;
  currentIndex = index;
  var contact = contacts[index];
  document.getElementById("nameInput").value = contact.name;
  document.getElementById("phoneInput").value = contact.phone;
  document.getElementById("emailInput").value = contact.email;
  document.getElementById("groupInput").value = contact.group || "Select Group";
  document.getElementById("addressInput").value = contact.address;
  document.getElementById("notesInput").value = contact.notes;
  document.getElementById("favoriteInput").checked = contact.fav;
  document.getElementById("emergencyInput").checked = contact.emg;
  document.getElementById("photoInput").value = "";
  currentImageData = contact.image || "";
  pendingImageRead = Promise.resolve();
  resetValidationMessages();
  showImagePreview(currentImageData);
  setFormMode(true);
  new bootstrap.Modal(document.getElementById("exampleModal")).show();
}

async function updateContact() {
  await pendingImageRead;
  var contact = getFormData();
  if (!validateContact(contact)) return;

  var oldContact = contacts[currentIndex];
  contacts[currentIndex] = contact;
  if (!renderContacts()) {
    contacts[currentIndex] = oldContact;
    refreshUI();
    return;
  }

  bootstrap.Modal.getInstance(document.getElementById("exampleModal")).hide();
  showSuccess("Contact updated successfully.");
}

function deleteContact(index) {
  if (!contacts[index]) return;
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
    if (!result.isConfirmed) return;
    var deletedContact = contacts.splice(index, 1)[0];
    if (!renderContacts()) {
      contacts.splice(index, 0, deletedContact);
      refreshUI();
      return;
    }
    showSuccess("Contact deleted successfully.");
  });
}

function addFav(index) {
  if (!contacts[index]) return;
  contacts[index].fav = !contacts[index].fav;
  renderContacts();
}

function addEmg(index) {
  if (!contacts[index]) return;
  contacts[index].emg = !contacts[index].emg;
  renderContacts();
}

function getFilteredContacts() {
  var searchTerm = currentSearchTerm.toLowerCase();
  var group = currentGroupFilter;

  return contacts
    .map(function (contact, index) {
      return { contact: contact, originalIndex: index };
    })
    .filter(function (item) {
      var contact = item.contact;
      var searchableText = [contact.name, contact.phone, contact.email, contact.address, contact.notes].join(" ").toLowerCase();
      var matchesSearch = !searchTerm || searchableText.indexOf(searchTerm) !== -1;
      var matchesGroup = group === "all" || contact.group === group;
      return matchesSearch && matchesGroup;
    });
}

function sortVisibleContacts(items) {
  if (currentSort === "natural") return items;

  return items.slice().sort(function (a, b) {
    if (currentSort === "name-asc" || currentSort === "name-desc") {
      var nameResult = a.contact.name.localeCompare(b.contact.name, undefined, { sensitivity: "base" });
      return currentSort === "name-desc" ? -nameResult : nameResult;
    }

    var aDate = a.contact.createdAt || 0;
    var bDate = b.contact.createdAt || 0;
    if (aDate === 0 && bDate === 0) return b.originalIndex - a.originalIndex;
    if (aDate === 0) return 1;
    if (bDate === 0) return -1;
    return currentSort === "newest" ? bDate - aDate : aDate - bDate;
  });
}

function getVisibleContacts() {
  return sortVisibleContacts(getFilteredContacts());
}

function searchContacts() {
  currentSearchTerm = document.getElementById("searchInput").value.trim();
  refreshUI();
}

function updateFavoritesCounter() {
  var count = contacts.filter(function (contact) { return contact.fav; }).length;
  document.getElementById("favoriteCount").textContent = count;
  document.getElementById("favoritesWidgetCount").textContent = count;
}

function updateEmergencyCounter() {
  var count = contacts.filter(function (contact) { return contact.emg; }).length;
  document.getElementById("emergencyCount").textContent = count;
  document.getElementById("emergencyWidgetCount").textContent = count;
}

function updateContactCount() {
  document.getElementById("contactCount").textContent = contacts.length;
  document.getElementById("contactCount2").textContent = contacts.length;
}

function updateResultCount(items) {
  var resultCount = document.getElementById("resultCount");
  if (items.length === 0) {
    resultCount.textContent = "";
    return;
  }
  resultCount.textContent = items.length + (items.length === 1 ? " contact found" : " contacts found");
}

function getRealIndex(item, index) {
  return typeof item.originalIndex === "number" ? item.originalIndex : index;
}

function display(items) {
  var html = "";

  items.forEach(function (item, index) {
    var contact = item.contact;
    var realIndex = getRealIndex(item, index);
    var phone = encodeURIComponent(contact.phone);

    html +=
      '<div class="col-12 col-lg-6"><div class="card contact-card compact-contact-card smart-contact-card shadow-sm"><div class="card-body compact-card-body">' +
      '<div class="smart-card-head"><div class="compact-identity"><div class="avatar position-relative">' + contactAvatar(contact) +
      '</div><div class="contact-title"><h5 class="contact-name">' + escapeHTML(contact.name) + '</h5>' +
      (contact.group ? '<span class="compact-group">' + escapeHTML(contact.group) + "</span>" : '<span class="compact-group muted-group">No group</span>') +
      '</div></div><div class="smart-card-status" aria-label="Contact status">' +
      '<button type="button" class="smart-status-btn favorite-status-btn ' + (contact.fav ? "is-active" : "") + '" aria-label="Toggle favorite" aria-pressed="' + String(contact.fav) + '" title="Toggle favorite" onclick="addFav(' + realIndex + ')"><i class="' + (contact.fav ? "fa-solid" : "fa-regular") + ' fa-star" aria-hidden="true"></i></button>' +
      '<button type="button" class="smart-status-btn emergency-status-btn ' + (contact.emg ? "is-active" : "") + '" aria-label="Toggle emergency" aria-pressed="' + String(contact.emg) + '" title="Toggle emergency" onclick="addEmg(' + realIndex + ')"><i class="' + (contact.emg ? "fa-solid fa-heart-pulse" : "fa-regular fa-heart") + '" aria-hidden="true"></i></button>' +
      '</div></div>' +
      '<div class="compact-phone"><span class="info-icon phone-icon"><i class="fa-solid fa-phone" aria-hidden="true"></i></span><span>' + escapeHTML(contact.phone) + '</span></div>' +
      '</div><div class="card-footer compact-card-footer"><div class="compact-card-actions">' +
      '<a href="tel:' + phone + '" class="compact-call-btn" aria-label="Call ' + escapeHTML(contact.name) + '"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>Call</span></a>' +
      '<button type="button" class="view-details-btn" aria-label="View details for ' + escapeHTML(contact.name) + '" onclick="showDetails(' + realIndex + ')"><i class="fa-solid fa-eye" aria-hidden="true"></i><span>View Details</span></button>' +
      '</div></div></div></div>';
  });

  document.getElementById("contactsList").innerHTML = html;
  updateResultCount(items);
  var emptyList = document.getElementById("emptyList");
  var emptyTitle = emptyList.querySelector(".empty-title");
  var emptyText = emptyList.querySelector(".empty-text");

  if (items.length > 0) {
    emptyList.classList.add("d-none");
  } else {
    emptyList.classList.remove("d-none");
    if (currentSearchTerm) {
      emptyTitle.textContent = "No contacts found";
      emptyText.textContent = "Try a different search.";
    } else if (currentGroupFilter !== "all") {
      emptyTitle.textContent = "No contacts in this group";
      emptyText.textContent = "Try another group or select All Groups.";
    } else {
      emptyTitle.textContent = "No contacts yet";
      emptyText.textContent = "Add your first contact to get started.";
    }
  }
}

function displayFavorites() {
  var favorites = contacts.filter(function (contact) { return contact.fav; });
  var html = "";
  favorites.forEach(function (contact) {
    var index = contacts.indexOf(contact);
    html += '<div class="widget-contact-item"><div class="widget-contact-main"><div class="avatar widget-avatar">' + contactAvatar(contact) + '</div><div class="widget-contact-copy"><strong>' + escapeHTML(contact.name) + '</strong><span>' + escapeHTML(contact.phone) + '</span></div></div><div class="widget-contact-actions"><button type="button" class="widget-view-btn" aria-label="View ' + escapeHTML(contact.name) + ' details" title="View details" onclick="showDetails(' + index + ')"><i class="fa-solid fa-eye" aria-hidden="true"></i></button><a href="tel:' + encodeURIComponent(contact.phone) + '" class="widget-call-btn" aria-label="Call ' + escapeHTML(contact.name) + '" title="Call"><i class="fa-solid fa-phone" aria-hidden="true"></i></a></div></div>';
  });
  document.getElementById("favorfavorites-contacts").innerHTML = html;
  document.getElementById("noFavorits").classList.toggle("d-none", favorites.length > 0);
}

function displayEmergency() {
  var emergencyContacts = contacts.filter(function (contact) { return contact.emg; });
  var html = "";
  emergencyContacts.forEach(function (contact) {
    var index = contacts.indexOf(contact);
    html += '<div class="widget-contact-item"><div class="widget-contact-main"><div class="avatar widget-avatar">' + contactAvatar(contact) + '</div><div class="widget-contact-copy"><strong>' + escapeHTML(contact.name) + '</strong><span>' + escapeHTML(contact.phone) + '</span></div></div><div class="widget-contact-actions"><button type="button" class="widget-view-btn" aria-label="View ' + escapeHTML(contact.name) + ' details" title="View details" onclick="showDetails(' + index + ')"><i class="fa-solid fa-eye" aria-hidden="true"></i></button><a href="tel:' + encodeURIComponent(contact.phone) + '" class="widget-call-btn" aria-label="Call ' + escapeHTML(contact.name) + '" title="Call"><i class="fa-solid fa-phone" aria-hidden="true"></i></a></div></div>';
  });
  if (emergencyContacts.length === 0) html = '<div class="noEmergency text-center"><p class="empty-text">No emergency contacts</p></div>';
  document.getElementById("emergency-contacts").innerHTML = html;
}

function formatCreatedAt(contact) {
  if (!contact.createdAt) return "Existing contact";
  return new Date(contact.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function displayRecentlyAdded() {
  var recent = contacts.map(function (contact, index) { return { contact: contact, index: index }; });
  recent.sort(function (a, b) {
    if (a.contact.createdAt && b.contact.createdAt) return b.contact.createdAt - a.contact.createdAt;
    if (a.contact.createdAt) return -1;
    if (b.contact.createdAt) return 1;
    return b.index - a.index;
  });
  recent = recent.slice(0, 4);

  var html = "";
  recent.forEach(function (item) {
    html += '<button type="button" class="recent-contact-item" aria-label="View ' + escapeHTML(item.contact.name) + ' details" onclick="showDetails(' + item.index + ')"><span class="avatar recent-avatar">' + contactAvatar(item.contact) + '</span><span class="recent-contact-copy"><strong>' + escapeHTML(item.contact.name) + '</strong><span class="recent-meta"><span class="recent-group-pill">' + escapeHTML(item.contact.group || "No group") + '</span><small>' + formatCreatedAt(item.contact) + '</small></span></span><i class="fa-solid fa-chevron-right recent-chevron" aria-hidden="true"></i></button>';
  });
  if (recent.length === 0) html = '<div class="noRecent text-center"><p class="empty-text">No recently added contacts</p></div>';
  document.getElementById("recent-contacts").innerHTML = html;
}

function showDetails(index) {
  var contact = contacts[index];
  if (!contact) return;
  var phone = encodeURIComponent(contact.phone);
  var email = encodeURIComponent(contact.email);
  var body = document.getElementById("detailsModalBody");

  body.innerHTML = '<div class="details-profile"><div class="details-avatar avatar">' + contactAvatar(contact) + '</div><div><h5>' + escapeHTML(contact.name) + '</h5><p>' + escapeHTML(contact.group || "No group") + '</p></div></div>' +
    '<div class="details-status"><span class="status-pill ' + (contact.fav ? "is-active favorite-status" : "") + '"><i class="fa-solid fa-star" aria-hidden="true"></i> ' + (contact.fav ? "Favorite" : "Not favorite") + '</span><span class="status-pill ' + (contact.emg ? "is-active emergency-status" : "") + '"><i class="' + (contact.emg ? "fa-solid fa-heart-pulse" : "fa-regular fa-heart") + '" aria-hidden="true"></i> ' + (contact.emg ? "Emergency" : "Standard") + '</span></div>' +
    '<div class="details-list"><div><i class="fa-solid fa-phone" aria-hidden="true"></i><span>' + escapeHTML(contact.phone) + '</span></div><div><i class="fa-solid fa-envelope" aria-hidden="true"></i><span>' + escapeHTML(contact.email) + '</span></div><div><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>' + escapeHTML(contact.address) + '</span></div><div><i class="fa-solid fa-note-sticky" aria-hidden="true"></i><span>' + escapeHTML(contact.notes || "No notes added") + '</span></div></div>' +
    '<div class="details-actions"><a href="tel:' + phone + '" class="btn action-btn phone-btn" aria-label="Call ' + escapeHTML(contact.name) + '"><i class="fa-solid fa-phone" aria-hidden="true"></i> Call</a><a href="mailto:' + email + '" class="btn action-btn mail-btn" aria-label="Email ' + escapeHTML(contact.name) + '"><i class="fa-solid fa-envelope" aria-hidden="true"></i> Email</a><button type="button" class="btn details-edit-btn" onclick="editFromDetails(' + index + ')"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</button><button type="button" class="btn details-delete-btn" onclick="deleteFromDetails(' + index + ')"><i class="fa-solid fa-trash" aria-hidden="true"></i> Delete</button></div>';

  new bootstrap.Modal(document.getElementById("detailsModal")).show();
}

function editFromDetails(index) {
  bootstrap.Modal.getInstance(document.getElementById("detailsModal")).hide();
  window.setTimeout(function () { editContact(index); }, 180);
}

function deleteFromDetails(index) {
  bootstrap.Modal.getInstance(document.getElementById("detailsModal")).hide();
  window.setTimeout(function () { deleteContact(index); }, 180);
}

function refreshUI() {
  var visibleContacts = getVisibleContacts();
  display(visibleContacts);
  updateFavoritesCounter();
  updateEmergencyCounter();
  displayFavorites();
  displayEmergency();
  displayRecentlyAdded();
  updateContactCount();
}

function renderContacts() {
  var saved = saveContacts();
  refreshUI();
  return saved;
}

initializeTheme();
loadContacts();
refreshUI();

document.getElementById("themeToggle").addEventListener("click", function () {
  applyTheme(!darkModeEnabled);
});

document.getElementById("photoInput").addEventListener("change", handlePhotoChange);
document.getElementById("searchInput").addEventListener("input", searchContacts);
document.getElementById("groupFilter").addEventListener("change", function (event) {
  currentGroupFilter = event.target.value;
  refreshUI();
});
document.getElementById("sortSelect").addEventListener("change", function (event) {
  currentSort = event.target.value;
  refreshUI();
});
document.getElementById("nameInput").addEventListener("input", validateName);
document.getElementById("nameInput").addEventListener("blur", validateName);
document.getElementById("phoneInput").addEventListener("input", validatePhoneNumber);
document.getElementById("phoneInput").addEventListener("blur", validatePhoneNumber);
document.getElementById("emailInput").addEventListener("input", validateEmail);
document.getElementById("emailInput").addEventListener("blur", validateEmail);
document.getElementById("addressInput").addEventListener("input", validateAddress);
document.getElementById("addressInput").addEventListener("blur", validateAddress);
document.getElementById("groupInput").addEventListener("change", validateGroup);

document.getElementById("exampleModal").addEventListener("show.bs.modal", function () {
  if (currentIndex === -1) {
    clearForm();
    setFormMode(false);
  }
});

document.getElementById("exampleModal").addEventListener("hidden.bs.modal", function () {
  clearForm();
  currentIndex = -1;
  setFormMode(false);
});

document.getElementById("detailsModal").addEventListener("hidden.bs.modal", function () {
  document.getElementById("detailsModalBody").innerHTML = "";
});
