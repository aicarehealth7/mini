document.addEventListener("DOMContentLoaded", () => {
    const profileIcon = document.getElementById("profileIcon");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const logoutBtn = document.getElementById("logoutBtn");

    if (profileIcon) {
        profileIcon.addEventListener("click", () => {
            dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("userId");
            window.location.href = "dashboard.html";
        });
    }

    // Fetch user details
    const userId = localStorage.getItem("userId");
    if (userId && window.location.pathname.includes("profile.html")) {
        fetch(`http://localhost:5000/api/user/details/${userId}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById("username").value = data.username || "";
                document.getElementById("mobile").value = data.mobile || "";
            })
            .catch(error => console.error("Error fetching user:", error));
    }

    // Update user details
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
        profileForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const updatedData = {
                username: document.getElementById("username").value,
                mobile: document.getElementById("mobile").value,
            };

            fetch(`http://localhost:5000/api/user/update/${userId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData),
            })
            .then(response => response.json())
            .then(data => {
                alert("Profile updated successfully!");
                window.location.href = "dashboard.html";
            })
            .catch(error => console.error("Error updating user:", error));
        });
    }
});
