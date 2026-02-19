document.addEventListener("DOMContentLoaded", () => {
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

  const listAgenda = document.getElementById("listAgenda");
  const form = document.getElementById("agendaForm");
  const modalOverlay = document.getElementById("modalOverlay");
  const btnTambah = document.getElementById("btnTambah");
  const btnBatal = document.getElementById("btnBatal");

  const filterBidang = document.getElementById("filterBidang");
  const filterStatus = document.getElementById("filterStatus");
  const searchInput = document.getElementById("searchKegiatan");

  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");
  const loginModal = document.getElementById("loginModal");
  const btnSubmitLogin = document.getElementById("btnSubmitLogin");
  const btnCancelLogin = document.getElementById("btnCancelLogin");

  let agendaData = [];
  let editId = null;
  let isLoggedIn = false;

  // ================= INIT JAM & MENIT =================
  function initWaktu() {
    const jamSelect = document.getElementById("jam");
    const menitSelect = document.getElementById("menit");

    jamSelect.innerHTML = "<option value=''>Jam</option>";
    menitSelect.innerHTML = "<option value=''>Menit</option>";

    for (let j = 6; j <= 17; j++) {
      const jam = String(j).padStart(2, "0");
      jamSelect.innerHTML += `<option value="${jam}">${jam}</option>`;
    }

    for (let m = 0; m < 60; m++) {
      const menit = String(m).padStart(2, "0");
      menitSelect.innerHTML += `<option value="${menit}">${menit}</option>`;
    }
  }
  initWaktu();

  // ================= LOGIN =================
  btnLogin.onclick = () => loginModal.classList.remove("hidden");
  btnCancelLogin.onclick = () => loginModal.classList.add("hidden");

  btnSubmitLogin.onclick = async () => {
    await auth.signInWithEmailAndPassword(
      document.getElementById("loginEmail").value,
      document.getElementById("loginPassword").value,
    );
    loginModal.classList.add("hidden");
  };

  btnLogout.onclick = () => auth.signOut();

  auth.onAuthStateChanged((user) => {
    isLoggedIn = !!user;
    btnLogin.classList.toggle("hidden", isLoggedIn);
    btnLogout.classList.toggle("hidden", !isLoggedIn);
    btnTambah.classList.toggle("hidden", !isLoggedIn);
    renderAgenda();
  });

  // ================= MODAL =================
  btnTambah.onclick = () => {
    form.reset();
    initWaktu();
    editId = null;
    modalOverlay.classList.remove("hidden");
  };

  btnBatal.onclick = () => modalOverlay.classList.add("hidden");

  // ================= SAVE =================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      tanggal: document.getElementById("tanggal").value,
      waktu:
        document.getElementById("jam").value +
        ":" +
        document.getElementById("menit").value,
      bidang: document.getElementById("bidang").value,
      status: document.getElementById("status").value,
      kegiatan: document.getElementById("kegiatan").value,
      keterangan: document.getElementById("keterangan").value || "",
    };

    if (editId) {
      await db.collection("agenda").doc(editId).update(data);
    } else {
      await db.collection("agenda").add(data);
    }

    modalOverlay.classList.add("hidden");
  });

  // ================= LOAD =================
  db.collection("agenda").onSnapshot((snapshot) => {
    agendaData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    renderAgenda();
  });

  // ================= RENDER =================
  function renderAgenda() {
    listAgenda.innerHTML = "";

    let filtered = [...agendaData];

    if (filterBidang.value !== "all") {
      filtered = filtered.filter((a) => a.bidang === filterBidang.value);
    }

    if (filterStatus.value !== "all") {
      filtered = filtered.filter((a) => a.status === filterStatus.value);
    }

    if (searchInput.value) {
      filtered = filtered.filter((a) =>
        a.kegiatan.toLowerCase().includes(searchInput.value.toLowerCase()),
      );
    }

    const today = new Date().toISOString().split("T")[0];

    let todayList = [];
    let otherList = [];

    filtered.forEach((a) => {
      if (a.tanggal === today) {
        todayList.push(a);
      } else {
        otherList.push(a);
      }
    });

    // Hari ini → jam terbaru dulu
    todayList.sort((a, b) => b.waktu.localeCompare(a.waktu));

    // Lainnya → tanggal terbaru dulu
    otherList.sort((a, b) => {
      if (a.tanggal === b.tanggal) {
        return b.waktu.localeCompare(a.waktu);
      }
      return b.tanggal.localeCompare(a.tanggal);
    });

    const finalList = [...todayList, ...otherList];

    finalList.forEach((d) => {
      const isToday = d.tanggal === today;
      const isDone = d.status === "Selesai";
      const isLate = d.tanggal < today && d.status === "Direncanakan";

      listAgenda.innerHTML += `
      <div class="agenda-card ${isToday ? "today-bg" : ""} ${isDone ? "done-card" : ""}">
        <small>${d.tanggal} • ${d.waktu}
          <span class="chip ${d.status}">${d.status}</span>
        </small><br>

        <span class="badge ${d.bidang}">${d.bidang}</span>

        <h4>
          ${d.kegiatan}
          ${isLate ? `<span class="warning-icon" title="Agenda lewat tanggal">⚠</span>` : ""}
        </h4>

        <p>${d.keterangan || "-"}</p>

        ${
          isLoggedIn
            ? `
        <div class="action-icons">
          <span onclick="editAgenda('${d.id}')" class="icon-btn edit">✏</span>
          <span onclick="hapusAgenda('${d.id}')" class="icon-btn delete">🗑</span>
        </div>
        `
            : ""
        }
      </div>
    `;
    });
  }

  // ================= EDIT =================
  window.editAgenda = (id) => {
    const d = agendaData.find((a) => a.id === id);
    if (!d) return;

    document.getElementById("tanggal").value = d.tanggal;
    const [jam, menit] = d.waktu.split(":");
    document.getElementById("jam").value = jam;
    document.getElementById("menit").value = menit;
    document.getElementById("bidang").value = d.bidang;
    document.getElementById("status").value = d.status;
    document.getElementById("kegiatan").value = d.kegiatan;
    document.getElementById("keterangan").value = d.keterangan;

    editId = id;
    modalOverlay.classList.remove("hidden");
  };

  // ================= HAPUS =================
  window.hapusAgenda = async (id) => {
    if (!confirm("Hapus agenda ini?")) return;
    await db.collection("agenda").doc(id).delete();
  };

  filterBidang.addEventListener("change", renderAgenda);
  filterStatus.addEventListener("change", renderAgenda);
  searchInput.addEventListener("input", renderAgenda);
});
