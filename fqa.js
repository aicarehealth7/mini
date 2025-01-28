document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("faq-search");
    const faqItems = document.querySelectorAll(".faq-item");
  
    // Expand/Collapse FAQ Answers
    faqItems.forEach(item => {
      const question = item.querySelector(".faq-question");
      question.addEventListener("click", () => {
        const answer = item.querySelector(".faq-answer");
        answer.style.display = answer.style.display === "block" ? "none" : "block";
      });
    });
  
    // Search Functionality
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      faqItems.forEach(item => {
        const question = item.querySelector(".faq-question").textContent.toLowerCase();
        const answer = item.querySelector(".faq-answer").textContent.toLowerCase();
        if (question.includes(query) || answer.includes(query)) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
    });
  });
  