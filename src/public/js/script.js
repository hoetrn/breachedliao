// Matrix-style falling code effect on canvas
document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.createElement("canvas");
  canvas.id = "matrix-bg";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.zIndex = "-1";
  canvas.style.pointerEvents = "none";
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const letters = "0101010101010101";
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = Array.from({ length: columns }).fill(1);

  function drawMatrix() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1e3c72";
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
      const text = letters[Math.floor(Math.random() * letters.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }

      drops[i]++;
    }
  }

  setInterval(drawMatrix, 35);

  // Checklist adjustment
  const checklist = document.querySelectorAll("#selfChecklist input[type='checkbox']");
  if (checklist.length > 0) {
    const emailEl = document.querySelector("h1.gradient-text");
    const emailMatch = emailEl ? emailEl.innerText.match(/for (.*)/) : null;
    const emailKey = emailMatch ? emailMatch[1].trim() + "_checklist" : "default_checklist";
    const stored = JSON.parse(localStorage.getItem(emailKey)) || [];

    checklist.forEach((box, idx) => {
      if (stored.includes(idx)) box.checked = true;
    });

    updateScore();

    checklist.forEach((box, idx) => {
      box.addEventListener("change", () => {
        const updated = [];
        checklist.forEach((b, i) => {
          if (b.checked) updated.push(i);
        });
        localStorage.setItem(emailKey, JSON.stringify(updated));
        updateScore();
      });
    });

    function updateScore() {
      const baseScore = parseInt(document.querySelector("h2 strong").innerText.match(/\d+/)[0]);
      let bonus = 0;

      checklist.forEach(box => {
        if (box.checked) {
          bonus += parseInt(box.dataset.points);
        }
      });

      const newScore = Math.max(0, baseScore - bonus);
      const label = newScore <= 33 ? "Low Risk" : newScore <= 66 ? "Moderate Risk" : "High Risk";

      document.querySelector("h2 strong").innerText = `Risk Score: ${newScore}/100`;
      document.querySelector("p").innerText = label;

      const dot = document.querySelector(".risk-dot");
      dot.classList.remove("low-risk", "moderate-risk", "high-risk");
      dot.classList.add(label.toLowerCase().replace(" ", "-"));
    }
  }
});