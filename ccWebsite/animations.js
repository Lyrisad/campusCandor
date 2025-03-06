// URL de votre Web App Google Apps Script
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyTxVIekVUyRSUafBPEzQGaK2goS1zqMi8qLoeESNhvk3XXbPSFyyjyJkuBWjWG5btvAA/exec";

// ---------------------- Fonctions Utilitaires Globales ----------------------

// Convertit une chaîne "dd/mm/yyyy" en objet Date
function parseDDMMYYYY(dateStr) {
  const parts = dateStr.split("/");
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

// Compare deux dates (objets Date) sur l'année, le mois et le jour uniquement
function isSameDate(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Convertit une date "dd/mm/yyyy" en sa représentation complète attendue par le Sheet
function convertDDMMYYYYToFull(dateStr) {
  const d = parseDDMMYYYY(dateStr);
  return d.toString();
}

// - Otherwise, if it contains a "T" (ISO format), parse accordingly.
function formatDateToDDMMYYYY(dateStr) {
  // If already in dd/mm/yyyy format, return as is.
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  // If it appears to be an ISO date or similar (contains "T"), parse it:
  if (dateStr.indexOf("T") !== -1) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  // Otherwise, try to parse assuming it's in dd/mm/yyyy but maybe not well formatted.
  const d = parseDDMMYYYY(dateStr);
  if (isNaN(d)) return dateStr;
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Helper: Convert a dd/mm/yyyy string back to a full date string (via Date.toString())
function convertDDMMYYYYToFull(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr; // if not in dd/mm/yyyy, return as is
  const d = new Date(parts[2], parts[1] - 1, parts[0]);
  return d.toString();
}

// Retourne un tableau d'objets représentant chaque bloc de participants
function getBlocks(participantsStr) {
  const regex = /(\[.*?\])\s*\((.*?)\)/g;
  let blocks = [];
  let match;
  while ((match = regex.exec(participantsStr)) !== null) {
    blocks.push({
      json: match[1],
      date: match[2],
      fullBlock: match[0],
    });
  }
  return blocks;
}

const contactItems = document.querySelectorAll(".contact-item");
const notificationPopup = document.getElementById("notificationPopup");

const showNotification = (message) => {
  const notifText = notificationPopup.querySelector("p");
  if (notifText) notifText.textContent = message;
  notificationPopup.classList.add("show");
  notificationPopup.classList.remove("hidden");
  setTimeout(() => {
    notificationPopup.classList.add("hidden");
    notificationPopup.classList.remove("show");
  }, 3000);
};

// Compte le nombre total de participants pour une formation à une date donnée
function getParticipantsCount(formation, date) {
  let count = 0;
  if (formation.participants) {
    const regex = /(\[.*?\])\s*\((.*?)\)/g;
    let match;
    const targetDate = parseDDMMYYYY(date);
    while ((match = regex.exec(formation.participants)) !== null) {
      try {
        let storedDate = new Date(match[2]);
        if (isSameDate(storedDate, targetDate)) {
          const empData = JSON.parse(match[1]);
          // Chaque bloc contient un tableau d'un objet
          let empArray = Array.isArray(empData) ? empData : [empData];
          count += empArray.length;
        }
      } catch (e) {
        console.error("Erreur lors du parsing des participants:", e);
      }
    }
  }
  return count;
}

// ---------------------- Début du Script ----------------------
document.addEventListener("DOMContentLoaded", () => {
  const notify = initNotifications();
  initNavigation();
  initAdminPanel();
  initAppointmentForm(notify);
  initEmployeeTable();
  // Launch the archive process when the DOM is loaded
  runArchiveProcess();
  // Then refresh the Historique panel
  fetchArchives();
  fetchTasks();
  fetchTasksHistory();
});

/* =================== Navigation =================== */
function initNavigation() {
  const serviceItems = document.querySelectorAll(".service-item");
  const homePage = document.querySelector("#homePage");
  const formations = document.querySelectorAll(".formation-container");
  const appointmentSection = document.getElementById("appointment-section");
  const adminLogin = document.getElementById("adminLogin");
  const menuAdmin = document.getElementById("menuAdmin");
  const backButtons = document.querySelectorAll(".back-button");
  const menuItems = document.querySelectorAll(".menu-item");
  const appointmentButtons = document.querySelectorAll(".goToForm");
  const adminPanel = document.getElementById("adminPanel");

  const hideAllFormations = () => {
    formations.forEach((formation) => {
      formation.style.display = "none";
    });
  };

  serviceItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetId = item.id.replace("item-", "");
      const targetFormation = document.querySelector(`#${targetId}`);
      if (targetFormation) {
        adminLogin.style.display = "none";
        homePage.style.display = "none";
        appointmentSection.style.display = "none";
        hideAllFormations();
        targetFormation.style.display = "flex";
      }
    });
  });

  backButtons.forEach((button) => {
    button.addEventListener("click", () => {
      homePage.style.display = "flex";
      adminLogin.style.display = "none";
      appointmentSection.style.display = "none";
      adminPanel.style.display = "none";
      hideAllFormations();
      const targetSection = document.getElementById("servicesSection");
      if (targetSection) {
        const sectionPosition =
          targetSection.getBoundingClientRect().top + window.scrollY;
        const offset = window.innerHeight / 10;
        window.scrollTo({
          top: sectionPosition - offset,
          behavior: "smooth",
        });
      }
    });
  });

  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = item.getAttribute("data-target");
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        homePage.style.display = "flex";
        appointmentSection.style.display = "none";
        hideAllFormations();
        adminLogin.style.display = "none";
        adminPanel.style.display = "none";
        setTimeout(() => {
          const sectionPosition =
            targetSection.getBoundingClientRect().top + window.scrollY;
          const offset = window.innerHeight / 10;
          window.scrollTo({
            top: sectionPosition - offset,
            behavior: "smooth",
          });
        }, 100);
      }
    });
  });

  appointmentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      appointmentSection.style.display = "flex";
      hideAllFormations();
      homePage.style.display = "none";
      adminLogin.style.display = "none";
      adminPanel.style.display = "none";
    });
  });

  menuAdmin.addEventListener("click", () => {
    if (getCookie("adminAuth") === "true") {
      document.getElementById("adminPanel").style.display = "flex";
      document.getElementById("adminLogin").style.display = "none";
    } else {
      document.getElementById("adminLogin").style.display = "flex";
      document.getElementById("adminPanel").style.display = "none";
    }
    hideAllFormations();
    homePage.style.display = "none";
    appointmentSection.style.display = "none";
  });
}

/* =================== Notifications =================== */
function initNotifications() {
  const contactItems = document.querySelectorAll(".contact-item");
  const notificationPopup = document.getElementById("notificationPopup");

  const showNotification = (message) => {
    const notifText = notificationPopup.querySelector("p");
    if (notifText) notifText.textContent = message;
    notificationPopup.classList.add("show");
    notificationPopup.classList.remove("hidden");
    setTimeout(() => {
      notificationPopup.classList.add("hidden");
      notificationPopup.classList.remove("show");
    }, 3000);
  };

  contactItems.forEach((item) => {
    item.addEventListener("click", () => {
      const email = item.getAttribute("data-email");
      if (email) {
        navigator.clipboard
          .writeText(email)
          .then(() => showNotification(`Adresse mail copiée (${email})`))
          .catch((err) =>
            console.error("Erreur lors de la copie de l'email : ", err)
          );
      }
    });
  });

  return showNotification;
}

/* =================== Admin Panel =================== */
function initAdminPanel() {
  const adminPanel = document.getElementById("adminPanel");
  const adminLogin = document.getElementById("adminLogin");
  const usernameField = document.getElementById("username");
  const passwordField = document.getElementById("password");
  const submitLogin = document.getElementById("submitLogin");
  const errorMessage = document.getElementById("errorMessage");
  const logoutButton = document.getElementById("logoutButton");
  const addFormationButton = document.getElementById("addFormationButton");
  const formationsTable = document
    .getElementById("formationsTable")
    .querySelector("tbody");
  const formationModal = document.getElementById("formationModal");
  const modalTitle = document.getElementById("modalTitle");
  const formationNameInput = document.getElementById("formationName");
  const formationDatesInput = document.getElementById("formationDates");
  const closeModalButton = document.getElementById("closeModal");

  const validUsername = "CampusCandor";
  const validPassword = "CC1234!";

  let formationsData = [];
  let pendingRequests = [];

  const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.style.color = "red";
  };

  const clearError = () => {
    errorMessage.textContent = "";
  };

  // --- Gestion des formations ---
  const fetchFormations = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=read`);
      const responseJson = await response.json();
      if (!responseJson || !responseJson.values) {
        formationsData = [];
        renderFormations();
        return;
      }
      formationsData = responseJson.values.map((row) => ({
        id: parseInt(row.id),
        name: row.name,
        availableDates: row.availableDates,
        participants: row.participants,
      }));
      window.formationsData = formationsData;
      renderFormations();
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des formations :",
        error.message
      );
    }
  };
  window.fetchFormations = fetchFormations;

  const addFormationToSheet = async (name, dates) => {
    const newId =
      formationsData.length > 0
        ? Math.max(...formationsData.map((f) => f.id)) + 1
        : 1;
    try {
      const url = `${SCRIPT_URL}?action=add&id=${newId}&name=${encodeURIComponent(
        name
      )}&dates=${encodeURIComponent(dates.join(","))}`;
      const response = await fetch(url);
      const result = await response.json();
      console.log("Ajout :", result);
      await fetchFormations();
    } catch (error) {
      console.error("Erreur lors de l'ajout de la formation :", error.message);
    }
  };

  const updateFormationInSheet = async (id, name, dates) => {
    try {
      const url = `${SCRIPT_URL}?action=update&id=${id}&name=${encodeURIComponent(
        name
      )}&dates=${encodeURIComponent(dates.join(","))}`;
      const response = await fetch(url);
      const result = await response.json();
      console.log("Mise à jour :", result);
      await fetchFormations();
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de la formation :",
        error.message
      );
    }
  };

  const deleteFormationFromSheet = async (id) => {
    try {
      const url = `${SCRIPT_URL}?action=delete&id=${id}`;
      const response = await fetch(url);
      const result = await response.json();
      console.log("Suppression :", result);
      await fetchFormations();
    } catch (error) {
      console.error(
        "Erreur lors de la suppression de la formation :",
        error.message
      );
    }
  };

  // --- Affichage des formations ---
  const renderFormations = () => {
    formationsTable.innerHTML = "";
    formationsData.forEach((formation) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formation.id}</td>
        <td class="data-formation">${formation.name}</td>
        <td>${
          formation.availableDates
            ? renderAvailableDates(formation.availableDates, formation)
            : ""
        }</td>
        <td>
          <button class="edit-formation" data-id="${
            formation.id
          }">Modifier</button>
          <button class="delete-formation" data-id="${
            formation.id
          }">Supprimer</button>
        </td>
      `;
      formationsTable.appendChild(row);
    });
    // Attacher l'événement sur les dates cliquables
    document.querySelectorAll(".clickable-date").forEach((span) => {
      span.addEventListener("click", () => {
        const formationId = span.getAttribute("data-formation-id");
        const dateClicked = span.getAttribute("data-date");
        const formation = formationsData.find(
          (f) => f.id === parseInt(formationId)
        );
        if (formation) {
          showParticipantsModal(formation, dateClicked);
        }
      });
    });
  };
  window.formationsData = formationsData;

  function renderAvailableDates(datesStr, formation) {
    if (!datesStr) return "";
    let dates = datesStr.split(",");
    return dates
      .map((d) => {
        let trimmed = d.trim();
        // Use our helper to ensure the date is formatted as dd/mm/yyyy
        let formatted = formatDateToDDMMYYYY(trimmed);
        let count = formation ? getParticipantsCount(formation, formatted) : 0;
        let color = "#3333";
        if (count > 0 && count < 6) {
          color = "#FFA500";
        } else if (count >= 6) {
          color = "#37ec5f";
        }
        return `<span class="clickable-date" data-formation-id="${formation.id}" data-date="${formatted}" style="cursor:pointer; margin-right:5px; background-color:${color};">${formatted} (${count}/12)</span>`;
      })
      .join(" ");
  }

  // --- Gestion des demandes en attente ---
  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?action=readPending`);
      const responseJson = await response.json();
      if (!responseJson || !responseJson.values) {
        pendingRequests = [];
        renderPendingRequests();
        return;
      }
      pendingRequests = responseJson.values;
      renderPendingRequests();
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des demandes en attente :",
        error.message
      );
    }
  };

  const renderPendingRequests = () => {
    const container = document.getElementById("pendingRequests");
    if (!pendingRequests || pendingRequests.length === 0) {
      container.innerHTML =
        "<h3>Demandes en attente</h3><p>Aucune demande de formation en attente.. :(</p>";
    } else {
      container.innerHTML = `
        <h3>Demandes en attente</h3>
        <table id="pendingRequestsTable" border="1">
          <thead>
            <tr>
              <th>ID</th>
              <th>Manager</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Formation</th>
              <th>Date</th>
              <th>Message</th>
              <th>Employees</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </table>
      `;
      const pendingRequestsTable = document.getElementById(
        "pendingRequestsTable"
      );
      const tbody = pendingRequestsTable.querySelector("tbody");

      pendingRequests.forEach((req) => {
        let formattedDate = req.date;
        if (req.date) {
          let d = new Date(req.date);
          if (!isNaN(d)) {
            let dd = d.getDate().toString().padStart(2, "0");
            let mm = (d.getMonth() + 1).toString().padStart(2, "0");
            let yyyy = d.getFullYear();
            formattedDate = `${dd}/${mm}/${yyyy}`;
          }
        }
        let employeesFormatted = "";
        try {
          const empArray = JSON.parse(req.employees);
          if (Array.isArray(empArray)) {
            employeesFormatted = empArray
              .map(
                (emp) =>
                  `${emp.matricule} - ${emp.nameEmployee} (${emp.entity})`
              )
              .join("<br>");
          } else {
            employeesFormatted = req.employees;
          }
        } catch (e) {
          employeesFormatted = req.employees;
        }
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${req.id}</td>
          <td>${req.manager}</td>
          <td>${req.email}</td>
          <td>${req.telephone}</td>
          <td>${req.formation}</td>
          <td>${formattedDate}</td>
          <td>${req.message}</td>
          <td class="employeesList">${employeesFormatted}</td>
          <td>
            <button class="btn-accept" data-id="${req.id}">Accepter</button>
            <button class="btn-refuse" data-id="${req.id}">Refuser</button>
          </td>
        `;
        tbody.appendChild(row);
      });
      tbody.addEventListener("click", (e) => {
        const target = e.target;
        const id = parseInt(target.getAttribute("data-id"));
        if (target.classList.contains("btn-accept")) {
          acceptRequest(id);
        }
        if (target.classList.contains("btn-refuse")) {
          rejectRequest(id);
        }
      });
    }
  };

  const acceptRequest = async (id) => {
    try {
      const url = `${SCRIPT_URL}?action=accept&id=${id}`;
      const response = await fetch(url);
      const result = await response.json();
      console.log("Demande acceptée :", result);
      await fetchPendingRequests();
      await fetchFormations();
    } catch (error) {
      console.error(
        "Erreur lors de l'acceptation de la demande :",
        error.message
      );
    }
  };

  const rejectRequest = async (id) => {
    try {
      const url = `${SCRIPT_URL}?action=deletePending&id=${id}`;
      const response = await fetch(url);
      const result = await response.json();
      console.log("Demande refusée :", result);
      await fetchPendingRequests();
    } catch (error) {
      console.error("Erreur lors du refus de la demande :", error.message);
    }
  };

  if (document.getElementById("pendingRequestsTable")) {
    document
      .getElementById("pendingRequestsTable")
      .addEventListener("click", (e) => {
        const target = e.target;
        const id = parseInt(target.getAttribute("data-id"));
        if (target.classList.contains("btn-accept")) {
          acceptRequest(id);
        }
        if (target.classList.contains("btn-refuse")) {
          rejectRequest(id);
        }
      });
  }
  /* --- Modal Formation --- */
  let isEditing = false;
  let editingFormationId = null;
  const showModal = (title, formation = null) => {
    modalTitle.textContent = title;
    formationNameInput.value = formation ? formation.name : "";
    if (formation && formation.availableDates) {
      // Split the availableDates string by comma, trim each one, then format.
      formationDatesInput.value = formation.availableDates
        .split(",")
        .map((date) => formatDateToDDMMYYYY(date.trim()))
        .join(", ");
    } else {
      formationDatesInput.value = "";
    }
    isEditing = !!formation;
    editingFormationId = formation ? formation.id : null;
    formationModal.style.display = "flex";
  };

  const hideModal = () => {
    formationModal.style.display = "none";
    formationForm.reset();
  };

  if (getCookie("adminAuth") === "true") {
    fetchFormations();
    fetchPendingRequests();
  }

  submitLogin.addEventListener("click", () => {
    const username = usernameField.value.trim();
    const password = passwordField.value;
    if (username === validUsername && password === validPassword) {
      clearError();
      setCookie("adminAuth", "true", 7);
      adminLogin.style.display = "none";
      document.getElementById("adminPanel").style.display = "flex";
      fetchFormations();
      fetchPendingRequests();
    } else {
      showError("Identifiant ou mot de passe incorrect.");
    }
  });

  logoutButton.addEventListener("click", () => {
    document.getElementById("adminPanel").style.display = "none";
    adminLogin.style.display = "flex";
    usernameField.value = "";
    passwordField.value = "";
    clearError();
    eraseCookie("adminAuth");
  });

  addFormationButton.addEventListener("click", () => {
    showModal("Ajouter une Formation");
  });

  // On submit, we assume the user’s input is in "dd/mm/yyyy" format
  formationForm.addEventListener("submit", async (e) => {
    showNotification("Enregistrement en cours, veuillez patienter..");
    setTimeout(() => {
      showNotification("Formation enregistrée avec succès !");
    }, 4000);
    e.preventDefault();
    const name = formationNameInput.value.trim();
    // Here, we assume the availableDates should be stored in dd/mm/yyyy format.
    const dates = formationDatesInput.value.split(",").map((d) => d.trim());
    if (isEditing) {
      await updateFormationInSheet(editingFormationId, name, dates);
    } else {
      await addFormationToSheet(name, dates);
    }
    hideModal();
  });

  closeModalButton.addEventListener("click", hideModal);

  formationsTable.addEventListener("click", async (e) => {
    const target = e.target;
    const id = parseInt(target.getAttribute("data-id"));
    if (target.classList.contains("edit-formation")) {
      const formation = formationsData.find((f) => f.id === id);
      showModal("Modifier une Formation", formation);
    } else if (target.classList.contains("delete-formation")) {
      const ok = await customConfirm(
        "Êtes-vous sûr de vouloir supprimer cette formation ?"
      );
      if (ok) {
        showNotification("Suppression en cours, veuillez patienter..");
        setTimeout(() => {
          showNotification("Formation supprimée avec succès !");
        }, 4000);
        await deleteFormationFromSheet(id);
      }
    }
  });
}

function customConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmModal2");
    const confirmMessage = document.getElementById("confirmMessage2");
    const btnYes = document.getElementById("confirmYes2");
    const btnNo = document.getElementById("confirmNo2");

    confirmMessage.textContent = message;
    modal.style.display = "block";

    function cleanUp() {
      modal.style.display = "none";
      btnYes.removeEventListener("click", onYes);
      btnNo.removeEventListener("click", onNo);
    }

    function onYes() {
      cleanUp();
      resolve(true);
    }
    function onNo() {
      cleanUp();
      resolve(false);
    }

    btnYes.addEventListener("click", onYes);
    btnNo.addEventListener("click", onNo);
  });
}

/* =================== Modal Participants =================== */
function showParticipantsModal(formation, date) {
  console.log("Participants pour la formation :", formation, date);
  const modal = document.getElementById("participantsModal");
  const modalDate = document.getElementById("modalDate");
  const modalTitle = document.getElementById("formation-name-modal");
  const participantsList = document.getElementById("participantsList");
  modalDate.textContent = date;
  modalTitle.textContent = formation.name;

  // Extraction de tous les blocs pour la date concernée
  const regex = /(\[.*?\])\s*\((.*?)\)/g;
  let blocks = [];
  let match;
  const targetDate = parseDDMMYYYY(date);
  while ((match = regex.exec(formation.participants)) !== null) {
    try {
      let storedDate = new Date(match[2]);
      if (isSameDate(storedDate, targetDate)) {
        blocks.push(match[0]);
      }
    } catch (e) {
      console.error("Erreur lors du parsing des blocs :", e);
    }
  }

  // Pour l'affichage, on reconstitue la liste des employés à partir de chaque bloc
  let participants = [];
  blocks.forEach((block) => {
    const m = block.match(/(\[.*?\])\s*\((.*?)\)/);
    if (m && m[1]) {
      try {
        const empData = JSON.parse(m[1]);
        let empArray = Array.isArray(empData) ? empData : [empData];
        participants = participants.concat(empArray);
      } catch (e) {
        console.error("Erreur lors du parsing d'un bloc :", e);
      }
    }
  });

  let htmlContent = "";
  if (participants.length === 0) {
    htmlContent += "<p>Aucun participant pour cette date.</p>";
  } else {
    htmlContent += `
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background-color:#f9f9f9;">
            <th style="padding:8px; border:1px solid #ddd;">N°</th>
            <th style="padding:8px; border:1px solid #ddd;">Matricule</th>
            <th style="padding:8px; border:1px solid #ddd;">Nom/Prenom</th>
            <th style="padding:8px; border:1px solid #ddd;">Entité</th>
            <th style="padding:8px; border:1px solid #ddd;">Action</th>
          </tr>
        </thead>
        <tbody>
    `;
    // Affichage dans l'ordre des blocs (chaque bloc correspond à un ajout)
    let blockList = getBlocks(formation.participants).filter((b) => {
      let d = new Date(b.date);
      return isSameDate(d, targetDate);
    });
    blockList.forEach((block, index) => {
      try {
        const empData = JSON.parse(block.json);
        // Chaque bloc est un tableau contenant un seul objet
        const emp = Array.isArray(empData) ? empData[0] : empData;
        htmlContent += `
          <tr>
            <td style="padding:8px; border:1px solid #ddd;">${index + 1}</td>
            <td style="padding:8px; border:1px solid #ddd;">${
              emp.matricule
            }</td>
            <td style="padding:8px; border:1px solid #ddd;">${
              emp.nameEmployee
            }</td>
            <td style="padding:8px; border:1px solid #ddd;">${emp.entity}</td>
            <td style="padding:8px; border:1px solid #ddd;">
              <button class="btn-remove-participant" data-index="${index}">Retirer</button>
            </td>
          </tr>
        `;
      } catch (e) {
        console.error("Erreur lors de l'affichage d'un bloc :", e);
      }
    });
    htmlContent += `
        </tbody>
      </table>
    `;
  }

  // Section d'ajout manuel d'un participant
  htmlContent += `
    <div id="addParticipantSection" style="margin-top:15px;">
      <h4>Ajouter un participant</h4>
      <input type="text" id="newMatricule" placeholder="Matricule" style="margin-right:5px;" />
      <input type="text" id="newName" placeholder="Nom/Prénom" style="margin-right:5px;" />
      <input type="text" id="newEntity" placeholder="Entité" style="margin-right:5px;" />
      <button id="btnAddParticipant">Ajouter participant(e)</button>
    </div>
  `;

  participantsList.innerHTML = htmlContent;
  modal.style.display = "flex";

  // Gestion de l'ajout d'un participant
  document.getElementById("btnAddParticipant").addEventListener("click", () => {
    document.getElementById("btnAddParticipant").disabled = true;
    const matricule = document.getElementById("newMatricule").value.trim();
    const nameEmployee = document.getElementById("newName").value.trim();
    const entity = document.getElementById("newEntity").value.trim();
    if (!matricule || !nameEmployee || !entity) {
      document.getElementById("btnAddParticipant").disabled = false;
      showNotification("Veuillez remplir tous les champs.");
      return;
    }
    showNotification("Ajout en cours, veuillez patienter..");
    const newParticipant = { matricule, nameEmployee, entity };
    addParticipantToFormation(formation, date, newParticipant);

    setTimeout(() => {
      document.getElementById("btnAddParticipant").disabled = false;
      showNotification("Participant ajouté avec succès !");
      window.fetchFormations();
    }, 4000);
  });

  // Gestion de la suppression d'un participant
  document.querySelectorAll(".btn-remove-participant").forEach((btn) => {
    btn.addEventListener("click", () => {
      showNotification("Effacement en cours, veuillez patienter..");
      const index = parseInt(btn.getAttribute("data-index"));
      removeParticipantFromFormation(formation, date, index);
      setTimeout(() => {
        showNotification("Participant retiré avec succès !");
      }, 4000);
    });
  });
}

document
  .getElementById("closeParticipantsModal")
  .addEventListener("click", () => {
    document.getElementById("participantsModal").style.display = "none";
  });

/* ---------------------- Ajout / Suppression de Participant ---------------------- */

// Lorsqu'on ajoute un participant, on crée un nouveau bloc au format souhaité
async function addParticipantToFormation(formation, date, newParticipant) {
  const fullDateStr = convertDDMMYYYYToFull(date);
  const newBlock = JSON.stringify([newParticipant]) + " (" + fullDateStr + ")";
  if (formation.participants && formation.participants.trim().length > 0) {
    formation.participants = formation.participants.trim() + ", " + newBlock;
  } else {
    formation.participants = newBlock;
  }
  await updateFormationParticipantsInSheet(
    formation.id,
    formation.participants
  );

  // Refresh formations. Use the global function if available; otherwise, use the local one.
  if (typeof window.fetchFormations === "function") {
    await window.fetchFormations();
  } else if (typeof fetchFormations === "function") {
    await fetchFormations();
  } else {
    console.error("fetchFormations function is not available.");
  }

  // Retrieve the updated formation from global data.
  const updatedFormation = window.formationsData.find(
    (f) => f.id === formation.id
  );
  showParticipantsModal(updatedFormation, date);
}

// Lorsqu'on supprime, on reconstruit la chaîne en supprimant le bloc ciblé
async function removeParticipantFromFormation(formation, date, index) {
  // Extraire tous les blocs existants
  let blocks = getBlocks(formation.participants);
  let newBlocks = [];
  let currentDateIndex = 0;
  const targetDate = parseDDMMYYYY(date);

  // Fonction utilitaire pour s'assurer qu'un bloc se termine par ")"
  function fixBlock(blockStr) {
    blockStr = blockStr.trim();
    return blockStr.endsWith("))") ? blockStr : blockStr + ")";
  }

  // Parcourir tous les blocs
  for (let i = 0; i < blocks.length; i++) {
    let block = blocks[i];
    let blockDate = new Date(block.date);
    if (isSameDate(blockDate, targetDate)) {
      // Pour les blocs de la date cible, on ne garde que ceux qui ne correspondent pas à l'index à supprimer
      if (currentDateIndex !== index) {
        newBlocks.push(fixBlock(block.fullBlock));
      }
      currentDateIndex++;
    } else {
      // Les blocs d'autres dates restent inchangés (mais corrigés au besoin)
      newBlocks.push(fixBlock(block.fullBlock));
    }
  }

  // Reconstruire la chaîne à partir des blocs filtrés
  formation.participants = newBlocks.join(", ").trim();

  await updateFormationParticipantsInSheet(
    formation.id,
    formation.participants
  );
  showParticipantsModal(formation, date);
}

// Fonction d'échappement pour utiliser une chaîne dans une regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------------------- Mise à Jour dans le Sheet ---------------------- */
async function updateFormationParticipantsInSheet(id, participantsStr) {
  try {
    const url = `${SCRIPT_URL}?action=updateParticipants&id=${id}&participants=${encodeURIComponent(
      participantsStr
    )}`;
    const response = await fetch(url);
    const result = await response.json();
    console.log("Participants mis à jour :", result);
    if (typeof window.fetchFormations === "function") {
      await window.fetchFormations();
    }
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour des participants :",
      error.message
    );
  }
}

/* =================== Formulaire de Rendez-vous =================== */
function initAppointmentForm(showNotification) {
  emailjs.init("4sYz-WzrDCXInmUCl");
  populateAppointmentFormFormations();
  const form = document.getElementById("appointmentForm");
  const submitButton = document.getElementById("submitForm");
  submitButton.addEventListener("click", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const formationSelect = document.getElementById("formationSelect");
    const dateSelect = document.getElementById("dateSelect");
    const selectedOption =
      formationSelect.options[formationSelect.selectedIndex];
    const formationName = selectedOption ? selectedOption.text : "";
    const date = dateSelect.value;
    const message = document.getElementById("message").value;

    // Récupérer les données du tableau des employés
    const employees = [];
    const rows = document.querySelectorAll("#employeeTable tbody tr");
    rows.forEach((row) => {
      const matricule = row
        .querySelector('input[name="matricule[]"]')
        .value.trim();
      const nameEmployee = row
        .querySelector('input[name="nameEmployee[]"]')
        .value.trim();
      const entity = row.querySelector('input[name="entity[]"]').value.trim();
      if (matricule && nameEmployee && entity) {
        employees.push({ matricule, nameEmployee, entity });
      }
    });

    // Vérifier la limite de participants
    const formationData = window.currentFormationsData.find(
      (f) => parseInt(f.id) === parseInt(formationSelect.value)
    );
    let currentCount = formationData
      ? getParticipantsCount(formationData, date)
      : 0;
    if (currentCount + employees.length > 12) {
      showNotification(
        "La limite de participants pour une formation est de 12, merci de retirer des participants ou de reserver une autre date."
      );
      return;
    }
    // Si le message est vide, on le remplace par "Aucun message"
    const messageText = message.trim() === "" ? "Aucun message" : message;

    // Utilisez "\n" pour un email en texte brut, ou "<br>" si l'email est en HTML
    const employeesList = employees
      .map((emp) => `${emp.matricule} - ${emp.nameEmployee} (${emp.entity})`)
      .join("\n");

    const formData = {
      name,
      email,
      phone,
      formation: formationName,
      date,
      message: messageText,
      employees: employeesList,
    };

    emailjs
      .send("service_x5g594z", "template_mhmywm3", formData)
      .then(() => {
        showNotification("Merci, votre demande a été envoyée avec succès !");
        form.reset();
      })
      .catch((error) => {
        console.error("Erreur lors de l'envoi :", error);
        alert("Une erreur s'est produite, veuillez réessayer.");
      });

    addPendingRequest({
      manager: name,
      email: email,
      telephone: phone,
      formation: formationName,
      date: date,
      message: message,
      employees: JSON.stringify(employees),
    });
  });
}

function addPendingRequest(params) {
  const url =
    SCRIPT_URL +
    "?action=addPending" +
    "&manager=" +
    encodeURIComponent(params.manager) +
    "&email=" +
    encodeURIComponent(params.email) +
    "&telephone=" +
    encodeURIComponent(params.telephone) +
    "&formation=" +
    encodeURIComponent(params.formation) +
    "&date=" +
    encodeURIComponent(params.date) +
    "&message=" +
    encodeURIComponent(params.message) +
    "&employees=" +
    encodeURIComponent(params.employees);

  fetch(url)
    .then((response) => response.json())
    .then((data) => console.log("Demande ajoutée :", data))
    .catch((err) =>
      console.error("Erreur lors de l'ajout de la demande :", err)
    );
}

function populateAppointmentFormFormations() {
  window.handleFormationsData = function (data) {
    let formationsData = [];
    if (data && data.values) {
      formationsData = data.values;
    }
    window.currentFormationsData = formationsData;
    const formationSelect = document.getElementById("formationSelect");
    formationSelect.innerHTML = "";
    formationsData.forEach((formation) => {
      const option = document.createElement("option");
      option.value = formation.id;
      option.text = `${formation.name}`;
      formationSelect.appendChild(option);
    });
    formationSelect.addEventListener("change", () => {
      updateDateSelect(formationSelect, window.currentFormationsData);
    });
    updateDateSelect(formationSelect, window.currentFormationsData);
  };

  const script = document.createElement("script");
  script.src = SCRIPT_URL + "?action=read&callback=handleFormationsData";
  document.body.appendChild(script);
}

function updateDateSelect(formationSelect, formationsData) {
  const dateSelect = document.getElementById("dateSelect");
  dateSelect.innerHTML = "";
  const selectedId = parseInt(formationSelect.value);
  const formation = formationsData.find((f) => parseInt(f.id) === selectedId);
  if (formation && formation.availableDates) {
    let dates = formation.availableDates;
    if (typeof dates === "string") {
      dates = dates.split(",");
    }
    if (dates.length > 0) {
      dates.forEach((d) => {
        // Save the original date string as stored in the formation
        let originalDate = d.trim();
        // Display the date in dd/mm/yyyy format
        let formatted = formatDateToDDMMYYYY(originalDate);
        // getParticipantsCount expects the displayed format
        let count = formation ? getParticipantsCount(formation, formatted) : 0;
        const option = document.createElement("option");
        // Keep the original format for the value so that it is sent to the sheet
        option.value = originalDate;
        option.text = `${formatted} (${count}/12)`;
        dateSelect.appendChild(option);
      });
    } else {
      const option = document.createElement("option");
      option.value = "";
      option.text = "Aucune date disponible";
      dateSelect.appendChild(option);
    }
  } else {
    const option = document.createElement("option");
    option.value = "";
    option.text = "Aucune date disponible";
    dateSelect.appendChild(option);
  }
}

/* =================== Gestion des Cookies =================== */
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie =
    name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + "=; Max-Age=-99999999;";
}

/* =================== Tableau Dynamique Employés =================== */
function initEmployeeTable() {
  const employeeTable = document.getElementById("employeeTable");
  const tbody = employeeTable.querySelector("tbody");
  const MAX_ROWS = 12;
  const MIN_ROWS = 1;

  function updateButtons() {
    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row) => {
      const btnRemove = row.querySelector(".btn-remove");
      btnRemove.disabled = rows.length <= MIN_ROWS;
    });
    const addButtons = tbody.querySelectorAll(".btn-add");
    addButtons.forEach((btn) => {
      btn.disabled = tbody.querySelectorAll("tr").length >= MAX_ROWS;
    });
  }

  function addRow() {
    const currentRows = tbody.querySelectorAll("tr").length;
    if (currentRows < MAX_ROWS) {
      const newRow = tbody.querySelector("tr").cloneNode(true);
      newRow.querySelectorAll("input").forEach((input) => {
        input.value = "";
      });
      tbody.appendChild(newRow);
      updateButtons();
    }
  }

  function removeRow(row) {
    const currentRows = tbody.querySelectorAll("tr").length;
    if (currentRows > MIN_ROWS) {
      row.remove();
      updateButtons();
    }
  }

  tbody.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-add")) {
      addRow();
    }
    if (e.target.classList.contains("btn-remove")) {
      const row = e.target.closest("tr");
      removeRow(row);
    }
  });

  updateButtons();
}
// Fonction de formatage côté client : si la chaîne n'est pas déjà au format JJ/MM/AAAA, on la reformate.
function formatDateClient(dateStr) {
  // Si la chaîne contient "/" et fait exactement 10 caractères, on suppose qu'elle est déjà au bon format (ex: "31/12/2025")
  if (dateStr && dateStr.includes("/") && dateStr.length === 10) {
    return dateStr;
  }
  // Sinon, essayer de créer un objet Date
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    const day = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

/* =================== ARCHIVES =================== */

async function runArchiveProcess() {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=archive`);
    const result = await response.json();
    if (result.success) {
      console.log("Archiving completed successfully.");
    } else {
      console.error("Archiving error:", result.error);
    }
  } catch (error) {
    console.error("Error calling archive action:", error);
  }
}

// Fonction de filtrage combiné (barre de recherche + filtre par date)
function filterArchives() {
  const searchTerm = document
    .getElementById("archiveSearch")
    .value.trim()
    .toLowerCase();
  const selectedDate = document.getElementById("archiveDateFilter").value;
  const tbody = document.getElementById("archivesTable").querySelector("tbody");
  const rows = tbody.getElementsByTagName("tr");

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].getElementsByTagName("td");
    const formationText = cells[1].textContent.toLowerCase();
    const dateText = cells[2].textContent.trim();
    const participantsText = cells[3].textContent.toLowerCase();

    const matchesSearch =
      formationText.includes(searchTerm) ||
      participantsText.includes(searchTerm);
    const matchesDate = selectedDate === "" || dateText === selectedDate;

    rows[i].style.display = matchesSearch && matchesDate ? "" : "none";
  }
}

// Fonction pour peupler le filtre par date sans doublons
function populateArchiveDateFilter() {
  const tbody = document.getElementById("archivesTable").querySelector("tbody");
  const rows = tbody.getElementsByTagName("tr");
  const datesSet = new Set();

  for (let i = 0; i < rows.length; i++) {
    // On utilise le contenu de la 3ème cellule qui doit être au format JJ/MM/AAAA grâce à formatDateClient
    const date = rows[i].getElementsByTagName("td")[2].textContent.trim();
    if (date !== "") {
      datesSet.add(date);
    }
  }
  const dateFilter = document.getElementById("archiveDateFilter");
  dateFilter.innerHTML = `<option value="">Toutes les dates</option>`;
  Array.from(datesSet)
    .sort()
    .forEach((date) => {
      const option = document.createElement("option");
      option.value = date;
      option.textContent = date;
      dateFilter.appendChild(option);
    });
}

// Ajout d'écouteurs sur la barre de recherche et le select
document
  .getElementById("archiveSearch")
  .addEventListener("input", filterArchives);
document
  .getElementById("archiveDateFilter")
  .addEventListener("change", filterArchives);

// Fonction fetchArchives mise à jour pour formater la date côté client
async function fetchArchives() {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=readArchives`);
    const responseJson = await response.json();
    const tbody = document
      .getElementById("archivesTable")
      .querySelector("tbody");

    if (
      !responseJson ||
      !responseJson.values ||
      responseJson.values.length === 0
    ) {
      tbody.innerHTML =
        "<tr><td colspan='4'>Aucun historique disponible</td></tr>";
      return;
    }

    tbody.innerHTML = "";
    responseJson.values.forEach((entry) => {
      // Formatage explicite de la date côté client
      const formattedDate = formatDateClient(entry.date);

      // Pour les participants : découper la chaîne avec "|||"
      let participantsHTML = "";
      const blocks = entry.participants.split("|||");
      blocks.forEach((block) => {
        block = block.trim();
        if (block) {
          try {
            const arr = JSON.parse(block);
            if (Array.isArray(arr) && arr.length > 0) {
              const p = arr[0];
              participantsHTML += `<div>${p.matricule} - ${p.nameEmployee} - ${p.entity}</div>`;
            }
          } catch (e) {
            console.error("Erreur de parsing du participant:", e);
          }
        }
      });

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${entry.id}</td>
        <td>${entry.formation}</td>
        <td>${formattedDate}</td>
        <td>${participantsHTML}</td>
      `;
      tbody.appendChild(row);
    });

    // Peupler le menu déroulant des dates (sans doublons) en utilisant le format JJ/MM/AAAA
    populateArchiveDateFilter();
  } catch (error) {
    console.error("Erreur lors de la récupération de l'historique:", error);
  }
}
// Fonction pour convertir une date au format DD/MM/YYYY en format ISO (YYYY-MM-DD)
function convertDMYToISO(dateStr) {
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

// Fonction pour extraire les événements à partir du tableau des formations
function getEventsFromFormations() {
  // Sélectionne toutes les lignes du tableau de formations
  const formationRows = document.querySelectorAll("#formationsTable tbody tr");
  const eventsMap = new Map(); // Pour éviter les doublons

  formationRows.forEach((row) => {
    // Récupérer l'ID de la formation depuis la première cellule
    const idCell = row.querySelector("td");
    if (!idCell) return;
    const formationId = idCell.textContent.trim();

    // Récupérer le nom de la formation depuis la cellule avec la classe "data-formation"
    const formationNameCell = row.querySelector(".data-formation");
    if (!formationNameCell) return;
    const formationName = formationNameCell.textContent.trim();

    // Récupérer l'objet formation complet à partir de window.formationsData
    const formationObj = window.formationsData
      ? window.formationsData.find((f) => f.id.toString() === formationId)
      : null;

    // Récupérer toutes les dates cliquables dans cette ligne
    const clickableDates = row.querySelectorAll(".clickable-date");
    clickableDates.forEach((span) => {
      const dateStr = span.getAttribute("data-date");
      if (!dateStr) return;
      const isoDate = convertDMYToISO(dateStr);

      // Calculer le nombre de participants pour cette formation et cette date
      let count = 0;
      if (formationObj) {
        count = getParticipantsCount(formationObj, dateStr);
      } else {
        // Si formationObj n'est pas disponible, on tente d'extraire le compte depuis le texte du span (format "DD/MM/YYYY (X/12)")
        let countMatch = span.textContent.match(/\((\d+)\/12\)/);
        if (countMatch && countMatch[1]) {
          count = parseInt(countMatch[1], 10);
        }
      }

      // Déterminer la couleur de fond selon le nombre de participants
      let bgColor = "grey";
      if (count >= 1 && count <= 5) {
        bgColor = "#f49f42";
      } else if (count >= 6) {
        bgColor = "#37ec5f";
      }

      // Construire le titre de l'événement au format "Formation Name (X/12)"
      const eventTitle = `${formationName} (${count}/12)`;

      // Créer une clé unique pour éviter les doublons
      const key = isoDate + "|" + formationName;
      if (!eventsMap.has(key)) {
        eventsMap.set(key, {
          title: eventTitle,
          start: isoDate,
          backgroundColor: bgColor,
          borderColor: bgColor,
          extendedProps: { formationId: formationId, count: count },
        });
      }
    });
  });

  return Array.from(eventsMap.values());
}

function initCalendarFromFormations() {
  const events = getEventsFromFormations();
  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "fr",
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "",
    },
    events: events,
    eventClick: function (info) {
      // Convertir la date de l'événement en format DD/MM/YYYY
      const d = info.event.start;
      const day = ("0" + d.getDate()).slice(-2);
      const month = ("0" + (d.getMonth() + 1)).slice(-2);
      const year = d.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      // Récupérer formationId depuis extendedProps
      const formationId = info.event.extendedProps.formationId;

      // Chercher la formation dans la variable globale formationsData
      const formation = window.formationsData.find(
        (f) => f.id.toString() === formationId
      );
      if (formation) {
        showParticipantsModal(formation, formattedDate);
      } else {
        alert("Formation not found for ID: " + formationId);
      }
    },
  });
  calendar.render();
}

// Gestion du modal calendrier
const openCalendarBtn = document.getElementById("openCalendarBtn");
const calendarModal = document.getElementById("calendarModal");
const closeCalendar = document.getElementById("closeCalendar");

openCalendarBtn.addEventListener("click", () => {
  calendarModal.style.display = "block";
  initCalendarFromFormations();
});

closeCalendar.addEventListener("click", () => {
  calendarModal.style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target === calendarModal) {
    calendarModal.style.display = "none";
  }
});

/* =================== TÂCHES MODULE =================== */

// Task Form submission: l'état est forcé à "Due"
document.getElementById("taskForm").addEventListener("submit", async (e) => {
  showNotification("Veuillez patienter.. Ajout de tâche en cours.");
  e.preventDefault();
  const concerne = document.getElementById("taskConcerne").value.trim();
  const tache = document.getElementById("taskDescription").value.trim();
  const importance = document.getElementById("taskImportance").value;
  const etat = "Due"; // Forcé lors de la création

  const url = `${SCRIPT_URL}?action=addTask&concerne=${encodeURIComponent(
    concerne
  )}&tache=${encodeURIComponent(tache)}&importance=${encodeURIComponent(
    importance
  )}&etat=${encodeURIComponent(etat)}`;

  try {
    const response = await fetch(url);
    const result = await response.json();
    if (result.success) {
      await fetchTasks();
      await fetchTasksHistory();
      // Optionnel: réinitialiser le formulaire
      document.getElementById("taskForm").reset();

      showNotification("Tâche ajoutée avec succès !");
    } else {
      showNotification("Erreur lors de l'ajout de la tâche: " + result.error);
    }
  } catch (err) {
    console.error(err);
  }
});

// Function to fetch active tasks (state "Due")
async function fetchTasks() {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=readTasks`);
    const data = await response.json();
    const container = document.getElementById("activeTasksContainer");
    if (!data || !data.values || data.values.length === 0) {
      container.innerHTML = "<p>Aucune tâche active.</p>";
      return;
    }
    let html = `
      <table class="tasks-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Concerne</th>
            <th>Tâche</th>
            <th>Importance</th>
            <th>État</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    data.values.forEach((task) => {
      html += `<tr>
                <td>${task.id}</td>
                <td>${task.concerne}</td>
                <td>${task.tache}</td>
                <td>${task.importance}</td>
                <td>${task.etat}</td>
                <td>
                  <button class="btn-complete-task" data-id="${task.id}">Accompli</button>
                  <button class="btn-delete-task" data-id="${task.id}">Supprimer</button>
                </td>
              </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;

    // Attach event listeners for "Accompli" button
    document.querySelectorAll(".btn-complete-task").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        try {
          const response = await fetch(
            `${SCRIPT_URL}?action=updateTaskState&id=${id}&etat=Accomplie`
          );
          const result = await response.json();
          if (!result.success) {
            alert(
              "Erreur lors de la mise à jour de l'état de la tâche: " +
                result.error
            );
          }
          await fetchTasks();
          await fetchTasksHistory();
        } catch (error) {
          console.error("Erreur updateTaskState:", error);
        }
      });
    });

    // Attach event listeners for "Supprimer" button
    document.querySelectorAll(".btn-delete-task").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        showNotification("Veuillez patienter.. Suppression de tâche en cours.");
        const id = e.target.getAttribute("data-id");
        await deleteTask(id);
        await fetchTasks();
        setTimeout(() => {
          showNotification("Tâche supprimée avec succès !");
        }, 1000);
      });
    });
  } catch (error) {
    showNotification("Erreur lors de la récupération des tâches actives.");
  }
}
// Function to fetch tasks history (state "Accomplie")
async function fetchTasksHistory() {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=readTasksHistory`);
    const data = await response.json();
    const container = document.getElementById("tasksHistoryContainer");
    if (!data || !data.values || data.values.length === 0) {
      container.innerHTML = "<p>Aucune tâche accomplie.</p>";
      return;
    }
    let html = `
      <table class="tasks-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Concerne</th>
            <th>Tâche</th>
            <th class="colorTask">Importance</th>
            <th>État</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
    `;
    data.values.forEach((task) => {
      html += `<tr class="task-history-row">
                <td>${task.id}</td>
                <td>${task.concerne}</td>
                <td>${task.tache}</td>
                <td>${task.importance}</td>
                <td>${task.etat}</td>
                <td><button class="btn-delete-task" data-id="${task.id}">Supprimer</button></td>
              </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;

    // Attach event listeners for "Supprimer" button in history
    document
      .querySelectorAll("#tasksHistoryContainer .btn-delete-task")
      .forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const id = e.target.getAttribute("data-id");
          await deleteTask(id);
          await fetchTasksHistory();
        });
      });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération de l'historique des tâches :",
      error
    );
  }
}

// Function to delete a task by ID
async function deleteTask(id) {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=deleteTask&id=${id}`);
    const result = await response.json();
    if (!result.success) {
      console.log("Erreur lors de la suppression de la tâche: " + result.error);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la tâche:", error);
  }
}

// Listener for "Effacer l'historique" button
document
  .getElementById("clearHistoryBtn")
  .addEventListener("click", async () => {
    if (
      confirm(
        "Voulez-vous vraiment effacer l'historique des tâches accomplies ?"
      )
    ) {
      try {
        const response = await fetch(`${SCRIPT_URL}?action=clearTasksHistory`);
        const result = await response.json();
        if (result.success) {
          await fetchTasksHistory();
        } else {
          alert("Erreur lors de l'effacement de l'historique: " + result.error);
        }
      } catch (error) {
        console.error("Erreur lors de l'effacement de l'historique:", error);
      }
    }
  });
