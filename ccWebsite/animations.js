document.addEventListener("DOMContentLoaded", () => {
  const serviceItems = document.querySelectorAll(".service-item");
  const homePage = document.querySelector("#homePage");
  const formations = document.querySelectorAll(".formation-container");
  const appointmentsection = document.getElementById("appointment-section");
  const appointmentbutton = document.querySelectorAll(".goToForm");
  const adminLogin = document.getElementById("adminLogin");
  const menuAdmin = document.getElementById("menuAdmin");
  // Masquer toutes les div de formation
  const hideAllFormations = () => {
    formations.forEach((formation) => {
      formation.style.display = "none";
    });
  };

  // Ajouter un événement de clic à chaque service-item
  serviceItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetId = item.id.replace("item-", ""); // Obtenir l'ID de la div associée
      const targetFormation = document.querySelector(`#${targetId}`);

      if (targetFormation) {
        // Masquer la page d'accueil et toutes les autres formations
        adminLogin.style.display = "none";
        homePage.style.display = "none";
        appointmentsection.style.display = "none";
        hideAllFormations();

        // Afficher la div de formation associée
        targetFormation.style.display = "flex";
      }
    });
  });

  // Ajouter un événement de clic aux boutons "Retour"
  const backButtons = document.querySelectorAll(".back-button");
  backButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Afficher la page d'accueil et masquer toutes les formations
      homePage.style.display = "flex";
      adminLogin.style.display = "none";
      appointmentsection.style.display = "none";
      hideAllFormations();
    });
  });

  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      // Obtenir la cible de la section
      const targetId = item.getAttribute("data-target");
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        // Vérifier si la homePage est masquée
        if (homePage.style.display === "none") {
          homePage.style.display = "flex"; // Redisplay la page
          appointmentsection.style.display = "none";
          hideAllFormations(); // Masquer toutes les formations
          adminLogin.style.display = "none";
        }

        // Scroller vers la section cible
        setTimeout(() => {
          const sectionPosition =
            targetSection.getBoundingClientRect().top + window.scrollY;
          const offset = window.innerHeight / 10; // Adjust this value to control the centering offset
          window.scrollTo({
            top: sectionPosition - offset,
            behavior: "smooth",
          });
        }, 100); // Slight delay to ensure homePage is visible
      }
    });
  });

  appointmentbutton.forEach((button) => {
    button.addEventListener("click", () => {
      appointmentsection.style.display = "flex";
      hideAllFormations();
      homePage.style.display = "none";
      adminLogin.style.display = "none";
    });
  });

  menuAdmin.addEventListener("click", () => {
    adminLogin.style.display = "flex";
    hideAllFormations();
    homePage.style.display = "none";
    appointmentsection.style.display = "none";
  });

  const contactItems = document.querySelectorAll(".contact-item");
  const notificationPopup = document.getElementById("notificationPopup");

  // Function to show the popup
  const showNotification = (message) => {
    notificationPopup.querySelector("p").textContent = message;
    notificationPopup.classList.add("show");
    notificationPopup.classList.remove("hidden");

    // Hide the popup after 3 seconds
    setTimeout(() => {
      notificationPopup.classList.add("hidden");
      notificationPopup.classList.remove("show");
    }, 3000);
  };

  contactItems.forEach((item) => {
    item.addEventListener("click", () => {
      const email = item.getAttribute("data-email");
      if (email) {
        // Copy email to clipboard
        navigator.clipboard
          .writeText(email)
          .then(() => {
            // Show the custom notification
            showNotification(`Adresse mail copié (${email})`);
          })
          .catch((err) => {
            console.error("Failed to copy email: ", err);
          });
      }
    });
  });

  //API KEY : AIzaSyC8VEDR-r3ICcbLDSAgUj0BN6bNxrACF3s
  //SS KEY : 1J7s8dl-eEn_An1VY5K3cVKYdF3dOWZRSsYtRWbQ4Z_w

  const adminPanel = document.getElementById("adminPanel");
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
  const formationForm = document.getElementById("formationForm");
  const formationNameInput = document.getElementById("formationName");
  const formationDatesInput = document.getElementById("formationDates");
  const closeModalButton = document.getElementById("closeModal");

  const API_KEY = "AIzaSyC8VEDR-r3ICcbLDSAgUj0BN6bNxrACF3s";
  const SPREADSHEET_ID = "1J7s8dl-eEn_An1VY5K3cVKYdF3dOWZRSsYtRWbQ4Z_w";
  const SHEET_NAME = "Formations";
  const RANGE = `${SHEET_NAME}!A2:C`; // Adjusted range to include ID, Name, and AvailableDates

  let format = []; // Formation data will be fetched from Google Sheets

  // Valid admin credentials
  const validUsername = "CampusCandor";
  const validPassword = "CC1234!";

  // State variables for modal
  let isEditing = false;
  let editingFormationId = null;

  // Show error message
  const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.style.color = "red";
  };

  // Clear error message
  const clearError = () => {
    errorMessage.textContent = "";
  };

  // Fetch data from Google Sheets
  const fetchFormations = async () => {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`
      );
      const responseJson = await response.json();

      if (responseJson.error) {
        throw new Error(responseJson.error.message);
      }

      const rows = responseJson.values;
      if (!rows || rows.length === 0) {
        format = [];
        renderFormations();
        return;
      }

      format = rows.map((row) => ({
        id: parseInt(row[0]), // ID column
        name: row[1] || "Unnamed Formation", // Name column
        availableDates: row[2] ? row[2].split(",") : [], // AvailableDates column
      }));

      renderFormations();
    } catch (error) {
      console.error("Error fetching data from Google Sheets:", error.message);
    }
  };

  // Add data to Google Sheets
  const addFormationToSheet = async (name, dates) => {
    const newId =
      format.length > 0 ? Math.max(...format.map((f) => f.id)) + 1 : 1;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
    const body = {
      values: [[newId, name, dates.join(",")]],
    };

    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      await fetchFormations();
    } catch (error) {
      console.error("Error adding data to Google Sheets:", error.message);
    }
  };

  // Update data in Google Sheets
  const updateFormationInSheet = async (id, name, dates) => {
    const rowIndex = format.findIndex((f) => f.id === id) + 2; // Account for header row
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A${rowIndex}:C${rowIndex}?valueInputOption=USER_ENTERED&key=${API_KEY}`;
    const body = {
      values: [[id, name, dates.join(",")]],
    };

    try {
      await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      await fetchFormations();
    } catch (error) {
      console.error("Error updating data in Google Sheets:", error.message);
    }
  };

  // Delete data from Google Sheets
  const deleteFormationFromSheet = async (id) => {
    const rowIndex = format.findIndex((f) => f.id === id) + 2; // Account for header row
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A${rowIndex}:C${rowIndex}:clear?key=${API_KEY}`;

    try {
      await fetch(url, {
        method: "POST",
      });
      await fetchFormations();
    } catch (error) {
      console.error("Error deleting data from Google Sheets:", error.message);
    }
  };

  // Render formations table
  const renderFormations = () => {
    formationsTable.innerHTML = ""; // Clear existing rows
    format.forEach((formation) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${formation.id}</td>
        <td>${formation.name}</td>
        <td>${formation.availableDates.join(", ")}</td>
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
  };

  // Show modal
  const showModal = (title, formation = null) => {
    modalTitle.textContent = title;
    formationNameInput.value = formation ? formation.name : "";
    formationDatesInput.value = formation
      ? formation.availableDates.join(", ")
      : "";
    isEditing = !!formation;
    editingFormationId = formation ? formation.id : null;
    formationModal.style.display = "flex";
  };

  // Hide modal
  const hideModal = () => {
    formationModal.style.display = "none";
    formationForm.reset();
  };

  // Handle login
  submitLogin.addEventListener("click", () => {
    const username = usernameField.value.trim();
    const password = passwordField.value;

    if (username === validUsername && password === validPassword) {
      clearError();
      adminLogin.style.display = "none";
      adminPanel.style.display = "flex";
      fetchFormations();
    } else {
      showError("Identifiant ou mot de passe incorrect.");
    }
  });

  // Handle logout
  logoutButton.addEventListener("click", () => {
    adminPanel.style.display = "none";
    adminLogin.style.display = "flex";
    usernameField.value = "";
    passwordField.value = "";
    clearError();
  });

  // Add new formation
  addFormationButton.addEventListener("click", () => {
    showModal("Ajouter une Formation");
  });

  // Handle modal form submission
  formationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = formationNameInput.value.trim();
    const dates = formationDatesInput.value
      .split(",")
      .map((date) => date.trim());

    if (isEditing) {
      await updateFormationInSheet(editingFormationId, name, dates);
    } else {
      await addFormationToSheet(name, dates);
    }

    hideModal();
  });

  // Close the modal on cancel
  closeModalButton.addEventListener("click", hideModal);

  // Handle table actions
  formationsTable.addEventListener("click", async (e) => {
    const target = e.target;
    const id = parseInt(target.getAttribute("data-id"));

    if (target.classList.contains("edit-formation")) {
      const formation = format.find((f) => f.id === id);
      showModal("Modifier une Formation", formation);
    } else if (target.classList.contains("delete-formation")) {
      if (confirm("Êtes-vous sûr de vouloir supprimer cette formation?")) {
        await deleteFormationFromSheet(id);
      }
    }
  });

  emailjs.init("4sYz-WzrDCXInmUCl"); // Replace with your EmailJS Public Key

  const form = document.getElementById("appointmentForm");
  const submitButton = document.getElementById("submitForm");

  submitButton.addEventListener("click", (e) => {
    e.preventDefault();

    // Collect form data
    const formData = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      date: document.getElementById("date").value,
      message: document.getElementById("message").value,
    };

    // Send email using EmailJS
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
  });
});
