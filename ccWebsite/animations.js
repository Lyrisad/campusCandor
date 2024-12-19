document.addEventListener("DOMContentLoaded", () => {
  const serviceItems = document.querySelectorAll(".service-item");
  const homePage = document.querySelector("#homePage");
  const formations = document.querySelectorAll(".formation-container");
  const appointmentsection = document.getElementById("appointment-section");
  const appointmentbutton = document.querySelectorAll(".goToForm");

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
    });
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
        alert("Votre demande a été envoyée avec succès !");
        form.reset();
      })
      .catch((error) => {
        console.error("Erreur lors de l'envoi :", error);
        alert("Une erreur s'est produite, veuillez réessayer.");
      });
  });
});
