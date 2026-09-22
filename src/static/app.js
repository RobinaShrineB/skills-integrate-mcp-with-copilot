document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authControls = document.getElementById("auth-controls");
  const loginPrompt = document.getElementById("login-prompt");

  let isTeacher = false;

  function updateAuthControls(username) {
    isTeacher = Boolean(username);
    authControls.innerHTML = isTeacher
      ? `<span>Signed in as ${username}</span><button id="logout-button" type="button">Log out</button>`
      : '<button id="login-button" type="button">Teacher login</button>';
    signupForm.classList.toggle("hidden", !isTeacher);
    loginPrompt.classList.toggle("hidden", isTeacher);

    const loginButton = document.getElementById("login-button");
    if (loginButton) loginButton.addEventListener("click", showLoginDialog);
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) logoutButton.addEventListener("click", logout);
  }

  async function checkAuthentication() {
    const response = await fetch("/auth/me");
    const result = await response.json();
    updateAuthControls(result.username);
  }

  async function showLoginDialog() {
    const username = window.prompt("Teacher username:");
    if (username === null) return;
    const password = window.prompt("Teacher password:");
    if (password === null) return;

    const response = await fetch(
      `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      { method: "POST" }
    );
    const result = await response.json();
    if (!response.ok) {
      showMessage(result.detail || "Login failed", "error");
      return;
    }
    updateAuthControls(result.username);
    showMessage("Teacher login successful", "success");
  }

  async function logout() {
    await fetch("/auth/logout", { method: "POST" });
    updateAuthControls(null);
    showMessage("Logged out", "success");
  }

  function showMessage(text, className) {
    messageDiv.textContent = text;
    messageDiv.className = className;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isTeacher
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  document.getElementById("login-button").addEventListener("click", showLoginDialog);
  checkAuthentication().then(fetchActivities);
});
