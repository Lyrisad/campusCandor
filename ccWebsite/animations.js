// URL de votre Web App Google Apps Script
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyF0C68Cm-EHEajSaN8IlHcZyClzFCfzKrjmswptmxVj-bl1KsCsj2XKtficWs9uPJ6Eg/exec";

document.addEventListener("DOMContentLoaded", () => {
  // Module Notifications
  const notify = initNotifications();

  // Module Navigation
  initNavigation();

  // Module Panneau Admin
  initAdminPanel();

  // Module Formulaire de Rendez-vous
  initAppointmentForm(notify);

  // Initialisation du tableau dynamique pour les employés
  initEmployeeTable();
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
  // Le tableau des demandes sera généré dynamiquement dans la section "pendingRequests"
  const formationModal = document.getElementById("formationModal");
  const modalTitle = document.getElementById("modalTitle");
  const formationForm = document.getElementById("formationForm");
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
      renderFormations();
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des formations :",
        error.message
      );
    }
  };

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

  // Fonction de calcul du nombre de participants pour une formation à une date donnée
  function getParticipantsCount(formation, date) {
    let count = 0;
    if (formation.participants) {
      const regex = /(\[.*?\])\s*\((.*?)\)/g;
      let match;
      while ((match = regex.exec(formation.participants)) !== null) {
        try {
          let parsedDate = new Date(match[2]);
          let dd = parsedDate.getDate().toString().padStart(2, "0");
          let mm = (parsedDate.getMonth() + 1).toString().padStart(2, "0");
          let yyyy = parsedDate.getFullYear();
          let formattedParticipantDate = `${dd}/${mm}/${yyyy}`;
          if (formattedParticipantDate === date) {
            const empData = JSON.parse(match[1]);
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

  // --- Affichage des formations ---
  const renderFormations = () => {
    formationsTable.innerHTML = "";
    formationsData.forEach((formation) => {
      const row = document.createElement("tr");
      row.innerHTML = `
          <td>${formation.id}</td>
          <td>${formation.name}</td>
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

  // Pour le panel admin, les dates cliquables affichent également le nombre de participants sur 12
  function renderAvailableDates(datesStr, formation) {
    if (!datesStr) return "";
    let dates = datesStr.split(",");
    return dates
      .map((d) => {
        let trimmed = d.trim();
        let dateObj = new Date(trimmed);
        let formatted = isNaN(dateObj)
          ? trimmed
          : `${dateObj.getDate().toString().padStart(2, "0")}/${(
              dateObj.getMonth() + 1
            )
              .toString()
              .padStart(2, "0")}/${dateObj.getFullYear()}`;
        let count = getParticipantsCount(formation, formatted);
        // Définir la couleur selon le nombre de participants
        let color = "#3333"; // gris par défaut (0)
        if (count > 0 && count < 12) {
          color = "#FFA500"; // orange
        } else if (count === 12) {
          color = "#37ec5f"; // vert
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

  // --- Modal Formation ---
  let isEditing = false;
  let editingFormationId = null;
  const showModal = (title, formation = null) => {
    modalTitle.textContent = title;
    formationNameInput.value = formation ? formation.name : "";
    formationDatesInput.value = formation ? formation.availableDates : "";
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

  formationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = formationNameInput.value.trim();
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
        await deleteFormationFromSheet(id);
      }
    }
  });
}

/* =================== Modal de Confirmation Personnalisé =================== */
function customConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmModal2");
    const confirmMessage = document.getElementById("confirmMessage2");
    confirmMessage.textContent = message;
    modal.style.display = "block";

    function closeModal(answer) {
      modal.style.display = "none";
      document
        .getElementById("confirmYes2")
        .removeEventListener("click", onYes);
      document.getElementById("confirmNo2").removeEventListener("click", onNo);
      resolve(answer);
    }

    function onYes() {
      closeModal(true);
    }
    function onNo() {
      closeModal(false);
    }

    document.getElementById("confirmYes2").addEventListener("click", onYes);
    document.getElementById("confirmNo2").addEventListener("click", onNo);
  });
}

/* =================== Modal Participants =================== */
function showParticipantsModal(formation, date) {
  const modal = document.getElementById("participantsModal");
  const modalDate = document.getElementById("modalDate");
  const modalTitle = document.getElementById("formation-name-modal");
  const participantsList = document.getElementById("participantsList");
  modalDate.textContent = date;
  modalTitle.textContent = formation.name;

  let participants = [];
  if (formation.participants) {
    // Extraction de chaque bloc au format : [JSON] (date)
    const regex = /(\[.*?\])\s*\((.*?)\)/g;
    let match;
    while ((match = regex.exec(formation.participants)) !== null) {
      try {
        const empData = JSON.parse(match[1]);
        let parsedDate = new Date(match[2]);
        let dd = parsedDate.getDate().toString().padStart(2, "0");
        let mm = (parsedDate.getMonth() + 1).toString().padStart(2, "0");
        let yyyy = parsedDate.getFullYear();
        let formattedParticipantDate = `${dd}/${mm}/${yyyy}`;
        if (formattedParticipantDate === date) {
          let empArray = Array.isArray(empData) ? empData : [empData];
          participants = participants.concat(empArray);
        }
      } catch (e) {
        console.error("Erreur lors du parsing des participants:", e);
      }
    }
  }

  if (participants.length === 0) {
    participantsList.innerHTML = "<p>Aucun participant pour cette date.</p>";
  } else {
    let tableHTML = `
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background-color:#f9f9f9;">
            <th style="padding:8px; border:1px solid #ddd;">N°</th>
            <th style="padding:8px; border:1px solid #ddd;">Matricule</th>
            <th style="padding:8px; border:1px solid #ddd;">Nom/Prenom</th>
            <th style="padding:8px; border:1px solid #ddd;">Entité</th>
          </tr>
        </thead>
        <tbody>
    `;
    participants.forEach((emp, index) => {
      tableHTML += `
        <tr>
          <td style="padding:8px; border:1px solid #ddd;">${index + 1}</td>
          <td style="padding:8px; border:1px solid #ddd;">${emp.matricule}</td>
          <td style="padding:8px; border:1px solid #ddd;">${
            emp.nameEmployee
          }</td>
          <td style="padding:8px; border:1px solid #ddd;">${emp.entity}</td>
        </tr>
      `;
    });
    tableHTML += `
        </tbody>
      </table>
    `;
    participantsList.innerHTML = tableHTML;
  }

  modal.style.display = "block";
}
document
  .getElementById("closeParticipantsModal")
  .addEventListener("click", () => {
    document.getElementById("participantsModal").style.display = "none";
  });

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

    // Vérifier que le nombre d'employés ajoutés n'excède pas la limite (12)
    // Récupérer la formation sélectionnée (en utilisant le même JSONP) pour compter les participants actuels
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

    const formData = {
      name,
      email,
      phone,
      formation: formationName,
      date,
      message,
      employees: JSON.stringify(employees),
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
    // Sauvegarder dans une variable globale pour le formulaire
    window.currentFormationsData = formationsData;
    const formationSelect = document.getElementById("formationSelect");
    formationSelect.innerHTML = "";
    formationsData.forEach((formation) => {
      const option = document.createElement("option");
      option.value = formation.id;
      // Pour le select, si aucune date n'est trouvée, le nombre est 0
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
        let dateStr = d.trim();
        let dateObj = new Date(dateStr);
        if (!isNaN(dateObj)) {
          let dd = dateObj.getDate().toString().padStart(2, "0");
          let mm = (dateObj.getMonth() + 1).toString().padStart(2, "0");
          let yyyy = dateObj.getFullYear();
          dateStr = `${dd}/${mm}/${yyyy}`;
        }
        // Calcul du nombre de participants pour cette date
        let count = formation ? getParticipantsCount(formation, dateStr) : 0;
        const option = document.createElement("option");
        option.value = dateStr;
        option.text = `${dateStr} (${count}/12)`;
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

/* =================== Helper Functions =================== */
function getParticipantsCount(formation, date) {
  let count = 0;
  if (formation.participants) {
    const regex = /(\[.*?\])\s*\((.*?)\)/g;
    let match;
    while ((match = regex.exec(formation.participants)) !== null) {
      try {
        let parsedDate = new Date(match[2]);
        let dd = parsedDate.getDate().toString().padStart(2, "0");
        let mm = (parsedDate.getMonth() + 1).toString().padStart(2, "0");
        let yyyy = parsedDate.getFullYear();
        let formattedDate = `${dd}/${mm}/${yyyy}`;
        if (formattedDate === date) {
          const empData = JSON.parse(match[1]);
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

function formatDateFromString(dateStr) {
  if (!dateStr) return "";
  let dateObj = new Date(dateStr.trim());
  if (isNaN(dateObj)) return dateStr;
  let dd = dateObj.getDate().toString().padStart(2, "0");
  let mm = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  let yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
