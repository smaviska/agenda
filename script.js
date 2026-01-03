// =======================================
// FIREBASE CONFIG
// =======================================
const firebaseConfig = {
  apiKey: "AIzaSyA4DqrPMB5eaMIrU-AoMOp95a4-jXtJQqM",
  authDomain: "agenda-smaviska.firebaseapp.com",
  projectId: "agenda-smaviska",
  storageBucket: "agenda-smaviska.firebasestorage.app",
  messagingSenderId: "708784231034",
  appId: "1:708784231034:web:ac05c043d90d9d0981e1c3",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// =======================================
// ELEMENT
// =======================================
const listAgenda = document.getElementById("listAgenda");
const form = document.getElementById("agendaForm");
const modalOverlay = document.getElementById("modalOverlay");

const btnTambah = document.getElementById("btnTambah");
const btnBatal = document.getElementById("btnBatal");

const tanggal = document.getElementById("tanggal");
const bidang = document.getElementById("bidang");
const kegiatan = document.getElementById("kegiatan");
const keterangan = document.getElementById("keterangan");

const jamSelect = document.getElementById("jam");
const menitSelect = document.getElementById("menit");

const filterBidang = document.getElementById("filterBidang");
const searchInput = document.getElementById("searchKegiatan");

// LOGIN ELEMENT
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const loginModal = document.getElementById("loginModal");
const btnSubmitLogin = document.getElementById("btnSubmitLogin");
const btnCancelLogin = document.getElementById("btnCancelLogin");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

// =======================================
// STATE
// =======================================
let agendaData = [];
let editId = null;
let isAdmin = false;

// =======================================
// INIT JAM & MENIT (06–16, FORMAT 24 JAM)
// =======================================
function initWaktu() {
  jamSelect.innerHTML = `<option value="">Jam</option>`;
  menitSelect.innerHTML = `<option value="">Menit</option>`;

  for (let j = 6; j <= 16; j++) {
    const jam = String(j).padStart(2, "0");
    jamSelect.innerHTML += `<option value="${jam}">${jam}</option>`;
  }

  for (let m = 0; m < 60; m++) {
    const menit = String(m).padStart(2, "0");
    menitSelect.innerHTML += `<option value="${menit}">${menit}</option>`;
  }
}
initWaktu();

// =======================================
// FORMAT TANGGAL INDONESIA
// =======================================
function formatTanggalIndo(tgl) {
  return new Date(tgl).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// =======================================
// AUTH CONTROL
// =======================================
btnLogin.onclick = () => loginModal.classList.remove("hidden");
btnCancelLogin.onclick = () => loginModal.classList.add("hidden");

btnSubmitLogin.onclick = async () => {
  try {
    await auth.signInWithEmailAndPassword(
      loginEmail.value,
      loginPassword.value
    );
    loginModal.classList.add("hidden");
    loginEmail.value = "";
    loginPassword.value = "";
  } catch (e) {
    alert("Login gagal");
  }
};

btnLogout.onclick = () => auth.signOut();

auth.onAuthStateChanged((user) => {
  isAdmin = !!user;

  btnLogin.classList.toggle("hidden", isAdmin);
  btnLogout.classList.toggle("hidden", !isAdmin);

  // INI YANG PENTING
  btnTambah.classList.toggle("hidden", !isAdmin);
  btnTambah.disabled = !isAdmin;

  applyFilter();
});

// =======================================
// MODAL FORM CONTROL
// =======================================
btnTambah.onclick = () => {
  if (!isAdmin) return;
  form.reset();
  initWaktu();
  editId = null;
  modalOverlay.classList.remove("hidden");
};

btnBatal.onclick = () => {
  modalOverlay.classList.add("hidden");
  editId = null;
};

// =======================================
// SIMPAN / UPDATE AGENDA
// =======================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isAdmin) return;

  if (!jamSelect.value || !menitSelect.value) {
    alert("Jam dan menit wajib dipilih");
    return;
  }

  const data = {
    tanggal: tanggal.value,
    waktu: `${jamSelect.value}:${menitSelect.value}`,
    bidang: bidang.value,
    kegiatan: kegiatan.value,
    keterangan: keterangan.value || "",
  };

  if (editId) {
    await db.collection("agenda").doc(editId).update(data);
  } else {
    await db.collection("agenda").add(data);
  }

  modalOverlay.classList.add("hidden");
  editId = null;
});

// =======================================
// LOAD DATA REALTIME
// =======================================
db.collection("agenda").onSnapshot((snapshot) => {
  agendaData = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  applyFilter();
});

// =======================================
// FILTER & SEARCH
// =======================================
function applyFilter() {
  const bidangVal = filterBidang.value;
  const keyword = searchInput.value.toLowerCase();

  let filtered = [...agendaData];

  if (bidangVal !== "all") {
    filtered = filtered.filter((a) => a.bidang === bidangVal);
  }

  if (keyword) {
    filtered = filtered.filter((a) =>
      a.kegiatan.toLowerCase().includes(keyword)
    );
  }

  renderAgenda(filtered);
}

filterBidang.addEventListener("change", applyFilter);
searchInput.addEventListener("input", applyFilter);

// =======================================
// RENDER AGENDA (HARI INI PALING ATAS)
// =======================================
function renderAgenda(data) {
  listAgenda.innerHTML = "";

  const today = new Date().toISOString().split("T")[0];

  let todayList = [];
  let otherList = [];

  data.forEach((d) => {
    if (d.tanggal === today) {
      todayList.push(d);
    } else {
      otherList.push(d);
    }
  });

  // Hari ini → jam terbaru
  todayList.sort((a, b) => b.waktu.localeCompare(a.waktu));

  // Hari lain → tanggal terbaru
  otherList.sort((a, b) => {
    if (a.tanggal === b.tanggal) {
      return b.waktu.localeCompare(a.waktu);
    }
    return b.tanggal.localeCompare(a.tanggal);
  });

  [...todayList, ...otherList].forEach((d) => {
    listAgenda.innerHTML += `
      <div class="agenda-card ${d.tanggal === today ? "today" : ""}">
        <small>${formatTanggalIndo(d.tanggal)} • ${d.waktu}</small><br>

        <span class="badge ${d.bidang}">
          ${d.bidang}
        </span>

        <h4>${d.kegiatan}</h4>
        <p>${d.keterangan || "-"}</p>

        ${
          isAdmin
            ? `<div class="agenda-actions">
                 <button onclick="editAgenda('${d.id}')">Edit</button>
                 <button onclick="hapusAgenda('${d.id}')">Hapus</button>
               </div>`
            : ""
        }
      </div>
    `;
  });
}

// =======================================
// EDIT AGENDA
// =======================================
window.editAgenda = (id) => {
  if (!isAdmin) return;
  const d = agendaData.find((a) => a.id === id);
  if (!d) return;

  tanggal.value = d.tanggal;
  bidang.value = d.bidang;
  kegiatan.value = d.kegiatan;
  keterangan.value = d.keterangan;

  const [j, m] = d.waktu.split(":");
  jamSelect.value = j;
  menitSelect.value = m;

  editId = id;
  modalOverlay.classList.remove("hidden");
};

// =======================================
// HAPUS AGENDA
// =======================================
window.hapusAgenda = async (id) => {
  if (!isAdmin) return;
  if (confirm("Hapus agenda ini?")) {
    await db.collection("agenda").doc(id).delete();
  }
};
