
// Matrix-style falling code effect on canvas + accordion & scroll logic

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

  // Accordion logic for toggling breach details
  const accordionToggles = document.querySelectorAll(".accordion-toggle");

  accordionToggles.forEach(button => {
    button.addEventListener("click", () => {
      const content = button.nextElementSibling;
      const isOpen = content.style.maxHeight;

      if (isOpen) {
        content.style.maxHeight = null;
        button.textContent = "Show Details ▼";
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
        button.textContent = "Hide Details ▲";
      }
    });
  });
});
