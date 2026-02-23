// Set your wedding date/time with timezone offset (example is Istanbul +03:00)
const WEDDING_AT = "2026-06-14T16:00:00+03:00";

const $ = (id) => document.getElementById(id);

const intro = $("intro");
const scenes = $("scenes");
const enterBtn = $("enterBtn");
const rsvpFab = $("rsvpFab");
const rsvpBtnIntro = $("rsvpBtnIntro");
const rsvpBtnScene = $("rsvpBtnScene");

const modal = $("modal");
const modalBackdrop = $("modalBackdrop");
const closeModal = $("closeModal");

const form = $("rsvpForm");
const submitBtn = $("submitBtn");
const formNote = $("formNote");

const elD = $("d"), elH = $("h"), elM = $("m"), elS = $("s");
const statsEl = $("stats");

function pad(n){ return String(n).padStart(2, "0"); }

function tickCountdown(){
  const now = new Date();
  const target = new Date(WEDDING_AT);
  const diff = target - now;

  if (diff <= 0){
    elD.textContent = "0";
    elH.textContent = "00";
    elM.textContent = "00";
    elS.textContent = "00";
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  elD.textContent = days;
  elH.textContent = pad(hours);
  elM.textContent = pad(mins);
  elS.textContent = pad(secs);
}

function openShow(){
  document.body.classList.add("open");
  intro.setAttribute("aria-hidden", "true");
  scenes.setAttribute("aria-hidden", "false");
}

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

enterBtn.addEventListener("click", openShow);

[rsvpFab, rsvpBtnIntro, rsvpBtnScene].forEach(btn => {
  btn.addEventListener("click", () => {
    if (!document.body.classList.contains("open")) openShow();
    openModal();
  });
});

modalBackdrop.addEventListener("click", closeModalFn);
closeModal.addEventListener("click", closeModalFn);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("show")) closeModalFn();
});

async function loadStats(){
  try{
    const r = await fetch("/api/stats", { cache: "no-store" });
    if (!r.ok) return;
    const data = await r.json();
    if (typeof data?.yes === "number" && typeof data?.total === "number") {
      statsEl.textContent = `${data.yes} attending • ${data.total} responses`;
    }
  }catch{}
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formNote.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  const fd = new FormData(form);
  const payload = {
    website: String(fd.get("website") || ""),
    name: String(fd.get("name") || ""),
    attending: String(fd.get("attending") || ""), // "yes" or "no"
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
    await loadStats();
    setTimeout(closeModalFn, 900);
  }catch{
    formNote.textContent = "❌ Something went wrong. Please try again.";
  }finally{
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit RSVP";
  }
});

tickCountdown();
setInterval(tickCountdown, 1000);
$("year").textContent = new Date().getFullYear();
loadStats();
