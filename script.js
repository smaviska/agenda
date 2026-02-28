// ================= FIREBASE CONFIG =================
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

// ================= STATE =================
let isAdmin = false;
let editId = null;
let calendar;
let agendaCache = [];
let bidangAktif = ["Kurikulum", "Kesiswaan", "Sarpras", "Humas"];

// ================= INIT =================
document.addEventListener("DOMContentLoaded", function () {
  calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
    locale: "id",
    initialView: "dayGridMonth",
    height: "auto",

    headerToolbar:
      window.innerWidth < 600
        ? {
            left: "prev,next",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }
        : {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear",
          },

    buttonText: {
      today: "Hari Ini",
      month: "Bulan",
      week: "Minggu",
      day: "Hari",
      year: "Tahun",
    },

    selectable: true,

    dateClick: function (info) {
      if (!isAdmin) return;

      resetForm();
      document.getElementById("btnHapus").classList.add("hidden");

      document.getElementById("tanggal").value = info.dateStr;
      document.getElementById("modalOverlay").classList.remove("hidden");
    },

    eventClick: function (info) {
      const event = info.event;
      const extended = event.extendedProps;

      // ===== MODE ADMIN =====
      if (isAdmin) {
        document.getElementById("tanggal").value = event.startStr.split("T")[0];

        const time = event.startStr.split("T")[1]?.substring(0, 5) || "00:00";
        document.getElementById("jam").value = time.split(":")[0];
        document.getElementById("menit").value = time.split(":")[1];

        document.getElementById("bidang").value = extended.bidang;
        document.getElementById("kegiatan").value = event.title;
        document.getElementById("keterangan").value = extended.keterangan;

        editId = event.id;
        document.getElementById("btnHapus").classList.remove("hidden");
        document.getElementById("modalOverlay").classList.remove("hidden");
      } else {
        // ===== MODE USER (READ ONLY) =====
        showDetailModal(event, extended);
      }
    },
  });

  calendar.render();
  initWaktu();
  initFilter();
  listenAgendaRealtime();
});

document.getElementById("fabTambah").onclick = () => {
  if (!isAdmin) return;

  resetForm();
  document.getElementById("btnHapus").classList.add("hidden");
  document.getElementById("modalOverlay").classList.remove("hidden");
};

document.getElementById("toggleFilter").onclick = () => {
  document.querySelector(".filter-bar").classList.toggle("active");
};

function showDetailModal(event, extended) {
  const bidang = extended.bidang;

  document.getElementById("detailJudul").innerText = event.title;

  const dateISO = event.startStr.split("T")[0];
  const formattedDate = formatTanggalIndonesia(dateISO);
  const time = event.startStr.split("T")[1]?.substring(0, 5) || "-";

  document.getElementById("detailTanggal").innerText = formattedDate;

  document.getElementById("detailWaktu").innerText = time;
  document.getElementById("detailKeterangan").innerText =
    extended.keterangan || "-";

  const badge = document.getElementById("detailBadge");
  badge.innerText = bidang;

  badge.className = "detail-badge"; // reset

  switch (bidang) {
    case "Kurikulum":
      badge.classList.add("badge-kurikulum");
      break;
    case "Kesiswaan":
      badge.classList.add("badge-kesiswaan");
      break;
    case "Sarpras":
      badge.classList.add("badge-sarpras");
      break;
    case "Humas":
      badge.classList.add("badge-humas");
      break;
  }

  document.getElementById("detailModal").classList.remove("hidden");
}

document.getElementById("btnTutupDetail").onclick = () => {
  document.getElementById("detailModal").classList.add("hidden");
};

document.getElementById("detailModal").addEventListener("click", (e) => {
  if (e.target.id === "detailModal") {
    document.getElementById("detailModal").classList.add("hidden");
  }
});

function formatTanggalIndonesia(tanggalISO) {
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const bulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const date = new Date(tanggalISO);

  const namaHari = hari[date.getDay()];
  const tanggal = date.getDate();
  const namaBulan = bulan[date.getMonth()];
  const tahun = date.getFullYear();

  return `${namaHari}, ${tanggal} ${namaBulan} ${tahun}`;
}
// ================= INIT WAKTU =================
function initWaktu() {
  const jam = document.getElementById("jam");
  const menit = document.getElementById("menit");

  jam.innerHTML = "";
  menit.innerHTML = "";

  for (let j = 0; j <= 23; j++) {
    const val = String(j).padStart(2, "0");
    jam.innerHTML += `<option value="${val}">${val}</option>`;
  }

  ["00", "15", "30", "45"].forEach((m) => {
    menit.innerHTML += `<option value="${m}">${m}</option>`;
  });
}

// ================= REALTIME LISTENER =================
function listenAgendaRealtime() {
  db.collection("agenda").onSnapshot((snapshot) => {
    agendaCache = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    renderAgenda();
  });
}
function updateStatistik() {
  const currentDate = calendar.getDate();
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  let total = 0;
  let kur = 0,
    kes = 0,
    sar = 0,
    hum = 0;

  agendaCache.forEach((data) => {
    const date = new Date(data.tanggal);
    if (date.getMonth() === month && date.getFullYear() === year) {
      total++;

      switch (data.bidang) {
        case "Kurikulum":
          kur++;
          break;
        case "Kesiswaan":
          kes++;
          break;
        case "Sarpras":
          sar++;
          break;
        case "Humas":
          hum++;
          break;
      }
    }
  });

  document.getElementById("statTotal").innerText = total;
  document.getElementById("statKurikulum").innerText = kur;
  document.getElementById("statKesiswaan").innerText = kes;
  document.getElementById("statSarpras").innerText = sar;
  document.getElementById("statHumas").innerText = hum;
}
// ================= RENDER =================
function renderAgenda() {
  calendar.removeAllEvents();

  agendaCache.forEach((data) => {
    if (!bidangAktif.includes(data.bidang)) return;

    const warna = getWarnaBidang(data.bidang);

    calendar.addEvent({
      id: data.id,
      title: data.kegiatan,
      start: data.tanggal + "T" + data.waktu,
      backgroundColor: warna.bg,
      borderColor: warna.bg,
      textColor: warna.text,
      extendedProps: {
        bidang: data.bidang,
        keterangan: data.keterangan,
      },
    });
  });
  updateStatistik();
}

// ================= FILTER =================
function initFilter() {
  document.querySelectorAll(".filter-bar input").forEach((cb) => {
    cb.addEventListener("change", () => {
      bidangAktif = Array.from(
        document.querySelectorAll(".filter-bar input:checked"),
      ).map((el) => el.value);

      renderAgenda();
    });
  });
}

// ================= WARNA =================
function getWarnaBidang(bidang) {
  switch (bidang) {
    case "Kurikulum":
      return { bg: "#2563eb", text: "#ffffff" };
    case "Kesiswaan":
      return { bg: "#16a34a", text: "#ffffff" };
    case "Sarpras":
      return { bg: "#ea580c", text: "#ffffff" };
    case "Humas":
      return { bg: "#7c3aed", text: "#ffffff" };
    default:
      return { bg: "#64748b", text: "#ffffff" };
  }
}

// ================= RESET FORM =================
function resetForm() {
  document.getElementById("agendaForm").reset();
  initWaktu();
  editId = null;
}

// ================= SIMPAN =================
document.getElementById("agendaForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!isAdmin) return;

  const data = {
    tanggal: tanggal.value,
    waktu: jam.value + ":" + menit.value,
    bidang: bidang.value,
    kegiatan: kegiatan.value,
    keterangan: keterangan.value,
  };

  if (editId) {
    await db.collection("agenda").doc(editId).update(data);
  } else {
    await db.collection("agenda").add(data);
  }

  resetForm();
  document.getElementById("modalOverlay").classList.add("hidden");
});

// ================= HAPUS =================
document.getElementById("btnHapus").onclick = async () => {
  if (!editId) return;

  const konfirmasi = confirm("Yakin ingin menghapus agenda ini?");
  if (!konfirmasi) return;

  await db.collection("agenda").doc(editId).delete();

  resetForm();
  document.getElementById("modalOverlay").classList.add("hidden");
};

// ================= AUTH =================
btnLogin.onclick = () =>
  document.getElementById("loginModal").classList.remove("hidden");

btnCancelLogin.onclick = () =>
  document.getElementById("loginModal").classList.add("hidden");

btnSubmitLogin.onclick = async () => {
  try {
    await auth.signInWithEmailAndPassword(
      loginEmail.value,
      loginPassword.value,
    );
    document.getElementById("loginModal").classList.add("hidden");
  } catch {
    alert("Login gagal");
  }
};

btnLogout.onclick = () => auth.signOut();

auth.onAuthStateChanged((user) => {
  isAdmin = !!user;
  btnLogin.classList.toggle("hidden", isAdmin);
  btnLogout.classList.toggle("hidden", !isAdmin);
});

// ================= MODAL CONTROL =================
btnBatal.onclick = () => {
  resetForm();
  document.getElementById("btnHapus").classList.add("hidden");
  document.getElementById("modalOverlay").classList.add("hidden");
};

modalOverlay.addEventListener("click", (e) => {
  if (e.target.id === "modalOverlay") {
    resetForm();
    document.getElementById("btnHapus").classList.add("hidden");
    modalOverlay.classList.add("hidden");
  }
});
document.getElementById("btnExportPDF").addEventListener("click", exportPDF);

function exportPDF() {

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const currentDate = calendar.getDate();
  const bulan = currentDate.getMonth();
  const tahun = currentDate.getFullYear();

  const namaBulan = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];

  const bulanText = namaBulan[bulan] + " " + tahun;

  // Filter agenda bulan aktif
  const dataBulan = agendaCache.filter(item => {
    const d = new Date(item.tanggal);
    return d.getMonth() === bulan && d.getFullYear() === tahun;
  });

  // Urutkan berdasarkan tanggal
  dataBulan.sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal));

  // Header
  doc.setFontSize(16);
  doc.text("Agenda Kegiatan", 14, 15);

  doc.setFontSize(12);
  doc.text("SMA Negeri 6 Surakarta", 14, 22);
  doc.text("Bulan: " + bulanText, 14, 29);

  // Table
  const rows = dataBulan.map(item => {

    const d = new Date(item.tanggal);
    const hari = d.toLocaleDateString("id-ID", { weekday: "long" });

    return [
      item.tanggal,
      hari,
      item.waktu,
      item.bidang,
      item.kegiatan,
      item.keterangan || "-"
    ];
  });

  doc.autoTable({
    startY: 35,
    head: [["Tanggal", "Hari", "Waktu", "Bidang", "Kegiatan", "Keterangan"]],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] }
  });

  doc.save("Agenda_" + bulanText + ".pdf");
}
