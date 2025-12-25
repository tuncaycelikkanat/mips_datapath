/* =================================================================
   1. MIPS VERİTABANI
   ================================================================= */
const MIPS_LOGIC = {
    "ADD": {
        stages: {
            "IF": ["mux_PC", "wire_PC_Prime", "box_PC", "wire_PCF", "box_InstructionMemory", "box_AdderPC", "wire_AdderPC_Plus4", "wire_PCPlus4F"],
            "ID": ["wire_InstrF", "box_IF_ID_Register", "wire_InstrD", "Vector 2", "box_RegisterFile", "label_RF_A1", "label_RF_A2"],
            "EX": ["box_ID_EX_Register", "box_ALU", "wire_ALU_SrcA", "wire_ALU_SrcB", "wire_ALU_Result"],
            "MEM": ["box_EX_MEM_Register", "wire_MemResult_Pass"],
            "WB": ["box_MEM_WB_Register", "mux_WriteBack", "wire_Result_to_Reg", "box_RegisterFile"]
        },
        example: "ADD $t0, $t1, $t2"
    },
    "LW": {
        stages: {
            "IF": ["mux_PC", "box_PC", "wire_PCF", "box_InstructionMemory"],
            "ID": ["wire_InstrF", "box_IF_ID_Register", "box_RegisterFile"],
            "EX": [], "MEM": [], "WB": []
        },
        example: "LW $t0, 4($s0)"
    },
    "SW": { stages: { "IF": [], "ID": [], "EX": [], "MEM": [], "WB": [] }, example: "SW $t0, 8($s0)" },
    "BEQ": { stages: { "IF": [], "ID": [], "EX": [], "MEM": [], "WB": [] }, example: "BEQ $t0, $t1, label" }
};

const STAGES = ["IF", "ID", "EX", "MEM", "WB"];
const STAGE_NAMES = { "IF": "FETCH", "ID": "DECODE", "EX": "EXECUTE", "MEM": "MEMORY", "WB": "WRITE BACK" };

let currentStageIndex = -1;
let currentInstruction = "";
let svgDoc = null;

// =================================================================
// 2. PAN & ZOOM MEKANİĞİ (PINCH ZOOM DAHİL)
// =================================================================
const container = document.getElementById('pan-zoom-container');
const viewport = document.getElementById('viewport');

let scale = 0.5;
let pointX = 0;
let pointY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

// Pinch Zoom için Değişkenler
let initialPinchDistance = null;
let lastScale = 1;

function setTransform() {
    container.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

// Bariyer Fonksiyonu (Dışarı taşmayı engeller)
function clampPosition(newX, newY) {
    const imgWidth = 1920 * scale;
    const imgHeight = 1080 * scale;
    const viewWidth = viewport.offsetWidth;
    const viewHeight = viewport.offsetHeight;

    // Kenar payı
    const margin = 100;

    const minX = margin - imgWidth;
    const maxX = viewWidth - margin;
    const minY = margin - imgHeight;
    const maxY = viewHeight - margin;

    pointX = Math.min(Math.max(newX, minX), maxX);
    pointY = Math.min(Math.max(newY, minY), maxY);
}

// İki parmak arası mesafeyi hesapla
function getPinchDistance(touches) {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
}

// --- MOUSE OLAYLARI (PC) ---
viewport.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX - pointX;
    startY = e.clientY - pointY;
    isPanning = true;
    viewport.style.cursor = "grabbing";
});

window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    clampPosition(e.clientX - startX, e.clientY - startY);
    setTransform();
});

window.addEventListener('mouseup', () => { isPanning = false; viewport.style.cursor = "grab"; });


// --- TOUCH OLAYLARI (MOBİL - PAN & PINCH) ---

viewport.addEventListener('touchstart', (e) => {
    // 1. Tek parmak: Kaydırma (Pan) başlat
    if (e.touches.length === 1) {
        startX = e.touches[0].clientX - pointX;
        startY = e.touches[0].clientY - pointY;
        isPanning = true;
    }
    // 2. İki parmak: Pinch Zoom başlat
    else if (e.touches.length === 2) {
        isPanning = false; // Pinch yaparken pan yapmasın
        initialPinchDistance = getPinchDistance(e.touches);
        lastScale = scale; // O anki scale'i hatırla
    }
}, { passive: false });

viewport.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Sayfa kaymasını engelle

    // 1. Tek parmak: Kaydırma
    if (e.touches.length === 1 && isPanning) {
        clampPosition(e.touches[0].clientX - startX, e.touches[0].clientY - startY);
        setTransform();
    }
    // 2. İki parmak: Pinch Zoom
    else if (e.touches.length === 2 && initialPinchDistance) {
        const currentDistance = getPinchDistance(e.touches);

        // Yeni scale = (Şu anki Mesafe / Başlangıç Mesafesi) * Başlangıç Scale'i
        let newScale = (currentDistance / initialPinchDistance) * lastScale;

        // Sınırla (Min 0.2x, Max 5x)
        newScale = Math.max(0.2, Math.min(newScale, 5));

        scale = newScale;
        setTransform();
    }
}, { passive: false });

viewport.addEventListener('touchend', (e) => {
    // Eğer parmaklardan biri kalkarsa işlemi bitir
    if (e.touches.length < 2) {
        initialPinchDistance = null;
    }
    if (e.touches.length === 0) {
        isPanning = false;
    }
});


// --- MOUSE WHEEL ZOOM (PC) ---
viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    const factor = 1 + (direction * zoomIntensity);

    const oldScale = scale;
    let newScale = scale * factor;
    newScale = Math.max(0.1, Math.min(newScale, 5));

    const mouseX = (e.clientX - pointX) / oldScale;
    const mouseY = (e.clientY - pointY) / oldScale;

    pointX = e.clientX - mouseX * newScale;
    pointY = e.clientY - mouseY * newScale;

    scale = newScale;
    setTransform();
}, { passive: false });

// --- ZOOM BUTONLARI ---
function zoomIn() { scale *= 1.2; setTransform(); }
function zoomOut() { scale /= 1.2; setTransform(); }
function fitView() {
    scale = Math.min(window.innerWidth / 2000, window.innerHeight / 1200);
    if (window.innerWidth < 768) scale = Math.max(scale, 0.4); // Mobilde çok küçülmesin

    const vw = viewport.offsetWidth;
    const vh = viewport.offsetHeight;
    pointX = (vw - 1920 * scale) / 2;
    pointY = (vh - 1080 * scale) / 2;
    setTransform();
}

document.getElementById('btnFit').onclick = fitView;
document.getElementById('btnZoomIn').onclick = zoomIn;
document.getElementById('btnZoomOut').onclick = zoomOut;

window.addEventListener('resize', fitView);
window.addEventListener('load', fitView);


// =================================================================
// 3. SİMÜLASYON YÖNETİMİ
// =================================================================
const svgObject = document.getElementById('svgObject');

svgObject.addEventListener('load', () => {
    svgDoc = svgObject.contentDocument;

    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
        .active-wire {
            stroke: #0ea5e9 !important; /* Sky Blue */
            stroke-width: 5px !important;
            stroke-dasharray: 15, 10;
            stroke-linecap: round;
            animation: flow 0.8s linear infinite;
            opacity: 1 !important;
        }
        @keyframes flow { to { stroke-dashoffset: -25; } }
    `;
    svgDoc.documentElement.appendChild(style);
    console.log("SVG Yüklendi ve Hazır.");
});

function updateSim() {
    if (!svgDoc) return;

    svgDoc.querySelectorAll('.active-wire').forEach(el => {
        el.classList.remove('active-wire');
    });

    if (currentStageIndex === -1) {
        document.getElementById('currentStageText').innerText = "HAZIR";
        return;
    }

    const stageKey = STAGES[currentStageIndex];
    document.getElementById('currentStageText').innerText = STAGE_NAMES[stageKey];

    const activeIDs = MIPS_LOGIC[currentInstruction].stages[stageKey];

    if (activeIDs) {
        activeIDs.forEach(id => {
            const el = svgDoc.getElementById(id);
            if (el) {
                const lowerId = id.toLowerCase();
                if (lowerId.startsWith('wire') || lowerId.startsWith('line') || lowerId.startsWith('vector')) {
                    el.classList.add('active-wire');
                }
            }
        });
    }
}

const btnNext = document.getElementById('btnNext');
const btnPrev = document.getElementById('btnPrev');
const selInst = document.getElementById('instructionSelect');
const codeExample = document.getElementById('codeExample');

selInst.addEventListener('change', (e) => {
    currentInstruction = e.target.value;
    currentStageIndex = -1;
    codeExample.innerText = MIPS_LOGIC[currentInstruction].example;
    btnNext.disabled = false;
    btnPrev.disabled = true;
    updateSim();
});

btnNext.addEventListener('click', () => {
    if (currentStageIndex < STAGES.length - 1) {
        currentStageIndex++;
        updateSim();
        btnPrev.disabled = false;
    }
    if (currentStageIndex === STAGES.length - 1) btnNext.disabled = true;
});

btnPrev.addEventListener('click', () => {
    if (currentStageIndex > -1) {
        currentStageIndex--;
        updateSim();
        btnNext.disabled = false;
    }
    if (currentStageIndex === -1) btnPrev.disabled = true;
});

document.getElementById('btnReset').addEventListener('click', () => {
    currentStageIndex = -1;
    selInst.value = "";
    codeExample.innerText = "Seçim Bekleniyor...";
    document.getElementById('currentStageText').innerText = "HAZIR";
    btnNext.disabled = true;
    btnPrev.disabled = true;
    updateSim();
    fitView();
});