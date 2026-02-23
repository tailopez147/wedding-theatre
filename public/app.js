// Wedding date (Nairobi is UTC+03:00). If you later know the exact time, edit it here.
const WEDDING_AT = "2026-05-16T12:00:00+03:00";

const $ = (id) => document.getElementById(id);

const intro = $("intro");
const pin = $("pin");
const skipIntroBtn = $("skipIntro");

const flightPath = document.querySelector("#flightPath");
const flightShine = document.querySelector("#flightShine");
const plane = document.querySelector("#plane");

const envelopeWrap = $("envelopeWrap");

const page = $("page");
const topbar = $("topbar");

const modal = $("modal");
const modalBackdrop = $("modalBackdrop");
const closeModal = $("closeModal");

const rsvpOpenTop = $("rsvpOpenTop");
const rsvpOpenHero = $("rsvpOpenHero");
const rsvpOpenDetails = $("rsvpOpenDetails");

const form = $("rsvpForm");
const submitBtn = $("submitBtn");
const formNote = $("formNote");

const yearEl = $("year");

// Countdown elements
const cdD = $("cdD"), cdH = $("cdH"), cdM = $("cdM"), cdS = $("cdS");

// Helpers
function pad(n){ return String(n).padStart(2, "0"); }

function tickCountdown(){
  const now = new Date();
  const target = new Date(WEDDING_AT);
  const diff = target - now;

  if (diff <= 0){
    cdD.textContent = "0";
    cdH.textContent = "00";
    cdM.textContent = "00";
    cdS.textContent = "00";
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  cdD.textContent = days;
  cdH.textContent = pad(hours);
  cdM.textContent = pad(mins);
  cdS.textContent = pad(secs);
}

function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Intro sequence
async function runIntro(){
  // show envelope stage gently
  document.body.classList.add("intro-show");

  if (prefersReducedMotion()){
    // Skip all animations, go straight to main
    revealMain();
    return;
  }

  // Animate flight trail drawing + plane moving along path
  await animateFlight();

  // Land in Nairobi (pin pulse)
  document.body.classList.add("intro-landed");
  await sleep(650);

  // Envelope auto-open
  document.body.classList.add("env-open");
  await sleep(750);

  // Letter rises out
  document.body.classList.add("letter-out");
  await sleep(1200);

  revealMain();
}

function revealMain(){
  // allow main content
  document.body.classList.add("main-ready");
  page.setAttribute("aria-hidden", "false");
  topbar.setAttribute("aria-hidden", "false");

  // after fade, remove intro from flow
  setTimeout(() => {
    intro.style.display = "none";
  }, 900);
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function animateFlight(){
  return new Promise((resolve) => {
    const path = flightPath;
    const shine = flightShine;

    const total = path.getTotalLength();
    // trail draw using dash
    path.style.strokeDasharray = String(total);
    path.style.strokeDashoffset = String(total);

    shine.style.strokeDasharray = String(total);
    shine.style.strokeDashoffset = String(total);

    // fade in shine a bit late
    setTimeout(() => { shine.style.opacity = "0.55"; }, 1200);

    const duration = 4200; // ms
    const start = performance.now();

    function frame(t){
      const p = Math.min(1, (t - start) / duration);

      // easeInOutCubic
      const eased = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p + 2, 3)/2;

      const offset = total * (1 - eased);
      path.style.strokeDashoffset = String(offset);
      shine.style.strokeDashoffset = String(Math.max(0, offset - total*0.06));

      // move plane along path
      const point = path.getPointAtLength(total * eased);
      const ahead = path.getPointAtLength(Math.min(total, total * eased + 2));
      const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180/Math.PI);

      plane.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle}) translate(-11 -11)`);

      if (p < 1){
        requestAnimationFrame(frame);
      } else {
        // ensure final state
        document.body.classList.add("intro-landed");
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

// RSVP modal
function openModal(){
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeModalFn(){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Form submit to your Worker endpoint
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formNote.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  const fd = new FormData(form);
  const payload = {
    website: String(fd.get("website") || ""),
    name: String(fd.get("name") || ""),
    attending: String(fd.get("attending") || ""),
    dietary: String(fd.get("dietary") || ""),
    message: String(fd.get("message") || "")
  };

  try{
    const r = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data?.ok) throw new Error(data?.error || "Failed");

    form.reset();
    formNote.textContent = "✅ RSVP saved. Thank you!";
    setTimeout(closeModalFn, 900);
  }catch{
    formNote.textContent = "❌ Something went wrong. Please try again.";
  }finally{
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit RSVP";
  }
});

// Reveal animations on scroll
function setupReveals(){
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries){
      if (e.isIntersecting){
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12 });

  els.forEach(el => io.observe(el));
}

// Wire buttons
[rsvpOpenTop, rsvpOpenHero, rsvpOpenDetails].forEach(btn => {
  btn?.addEventListener("click", openModal);
});
modalBackdrop.addEventListener("click", closeModalFn);
closeModal.addEventListener("click", closeModalFn);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) closeModalFn();
});

skipIntroBtn.addEventListener("click", revealMain);

// Init
yearEl.textContent = String(new Date().getFullYear());
tickCountdown();
setInterval(tickCountdown, 1000);
setupReveals();
runIntro();
