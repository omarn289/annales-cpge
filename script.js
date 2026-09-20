const STORAGE_KEY = 'cpge_mock_exams';

let exams = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const examGrid = document.getElementById('exam-grid');
const statsCounter = document.getElementById('stats-counter');

// Modale Ajout
const addModal = document.getElementById('add-modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelBtn = document.getElementById('cancel-btn');
const examForm = document.getElementById('exam-form');
const matiereSelectModal = document.getElementById('matiere-select');
const existingTagsContainer = document.getElementById('existing-tags-container');

// Modale Édition
const editModal = document.getElementById('edit-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editExamForm = document.getElementById('edit-exam-form');
const editExistingTagsContainer = document.getElementById('edit-existing-tags-container');

// Filtres
const searchInput = document.getElementById('search-input');
const filterConcours = document.getElementById('filter-concours');
const filterMatiere = document.getElementById('filter-matiere');
const filterStatus = document.getElementById('filter-status');

document.addEventListener('DOMContentLoaded', () => {
    renderExams();
    setupEventListeners();
});

function setupEventListeners() {
    // Modal Ajout
    openModalBtn.addEventListener('click', () => {
        updateExistingTagsForMatiere();
        addModal.classList.remove('hidden');
    });
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    addModal.addEventListener('click', (e) => { if (e.target === addModal) closeModal(); });
    matiereSelectModal.addEventListener('change', updateExistingTagsForMatiere);
    examForm.addEventListener('submit', handleAddExam);

    // Modal Édition
    closeEditModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
    editExamForm.addEventListener('submit', handleSaveEdit);

    // Filtres
    searchInput.addEventListener('input', renderExams);
    filterConcours.addEventListener('change', renderExams);
    filterMatiere.addEventListener('change', renderExams);
    filterStatus.addEventListener('change', renderExams);
}

function closeModal() {
    addModal.classList.add('hidden');
    examForm.reset();
}

function closeEditModal() {
    editModal.classList.add('hidden');
    editExamForm.reset();
}

function updateExistingTagsForMatiere() {
    const selectedMatiere = matiereSelectModal.value;
    renderTagsCheckboxes(selectedMatiere, existingTagsContainer);
}

function renderTagsCheckboxes(matiere, container, activeTags = []) {
    const tagsSet = new Set();
    exams.forEach(exam => {
        if (exam.matiere === matiere && exam.tags) {
            exam.tags.forEach(tag => tagsSet.add(tag));
        }
    });

    if (tagsSet.size === 0) {
        container.innerHTML = `<span style="font-size:0.75rem; color: var(--text-muted, #888);">Aucun chapitre existant pour ${escapeHtml(matiere)}</span>`;
        return;
    }

    container.innerHTML = Array.from(tagsSet).map(tag => {
        const isChecked = activeTags.includes(tag) ? 'checked' : '';
        return `
            <label class="existing-tag-item">
                <input type="checkbox" value="${escapeHtml(tag)}" ${isChecked} class="existing-tag-checkbox">
                ${escapeHtml(tag)}
            </label>
        `;
    }).join('');
}

function handleAddExam(e) {
    e.preventDefault();

    const pdfFileInput = document.getElementById('pdf-file-input');
    const file = pdfFileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const pdfBase64 = event.target.result;

        const checkedBoxes = existingTagsContainer.querySelectorAll('.existing-tag-checkbox:checked');
        const selectedTags = Array.from(checkedBoxes).map(cb => cb.value);

        const rawNewTags = document.getElementById('tags-input').value;
        const newTagsArray = rawNewTags.split(',').map(t => t.trim()).filter(t => t.length > 0);

        const allTags = Array.from(new Set([...selectedTags, ...newTagsArray]));

        const newExam = {
            id: Date.now().toString(),
            fileName: file.name,
            pdfUrl: pdfBase64,
            title: document.getElementById('title-input').value,
            concours: document.getElementById('concours-select').value,
            matiere: document.getElementById('matiere-select').value,
            year: document.getElementById('year-input').value,
            tags: allTags,
            status: 'todo'
        };

        exams.unshift(newExam);
        saveAndRender();
        closeModal();
    };

    reader.readAsDataURL(file);
}

// Fonction pour convertir le Base64 en Blob URL au moment du clic
function openPdf(id, e) {
    e.stopPropagation();
    e.preventDefault();

    const exam = exams.find(item => item.id === id);
    if (!exam || !exam.pdfUrl) return;

    try {
        const parts = exam.pdfUrl.split(';base64,');
        const contentType = parts[0].split(':')[1] || 'application/pdf';
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);

        window.open(blobUrl, '_blank');
    } catch (err) {
        console.error("Erreur lors de l'ouverture du PDF:", err);
        alert("Impossible d'ouvrir ce fichier PDF.");
    }
}

function openEditModal(id, e) {
    e.stopPropagation();
    const exam = exams.find(item => item.id === id);
    if (!exam) return;

    document.getElementById('edit-exam-id').value = exam.id;
    document.getElementById('edit-title-input').value = exam.title;

    renderTagsCheckboxes(exam.matiere, editExistingTagsContainer, exam.tags);

    editModal.classList.remove('hidden');
}

function handleSaveEdit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-exam-id').value;

    const checkedBoxes = editExistingTagsContainer.querySelectorAll('.existing-tag-checkbox:checked');
    const selectedTags = Array.from(checkedBoxes).map(cb => cb.value);

    const rawNewTags = document.getElementById('edit-tags-input').value;
    const newTagsArray = rawNewTags.split(',').map(t => t.trim()).filter(t => t.length > 0);

    const updatedTags = Array.from(new Set([...selectedTags, ...newTagsArray]));

    exams = exams.map(exam => {
        if (exam.id === id) {
            return {
                ...exam,
                title: document.getElementById('edit-title-input').value,
                tags: updatedTags
            };
        }
        return exam;
    });

    saveAndRender();
    closeEditModal();
}

function cycleStatus(id) {
    exams = exams.map(exam => {
        if (exam.id === id) {
            let nextStatus = 'in_progress';
            if (exam.status === 'in_progress') nextStatus = 'completed';
            else if (exam.status === 'completed' || exam.completed) nextStatus = 'todo';
            return { ...exam, status: nextStatus, completed: nextStatus === 'completed' };
        }
        return exam;
    });
    saveAndRender();
}

function deleteExam(id, e) {
    e.stopPropagation();
    if (confirm('Veux-tu vraiment supprimer ce sujet ?')) {
        exams = exams.filter(exam => exam.id !== id);
        saveAndRender();
    }
}

function saveAndRender() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
    } catch (e) {
        alert("Attention : Le stockage local est plein. Vous devriez supprimer quelques sujets avec de gros fichiers PDF.");
    }
    renderExams();
}

function renderExams() {
    const query = searchInput.value.toLowerCase();
    const selectedConcours = filterConcours.value;
    const selectedMatiere = filterMatiere.value;
    const selectedStatus = filterStatus.value;

    const filtered = exams.filter(exam => {
        const matchesQuery = exam.title.toLowerCase().includes(query) ||
            exam.tags.some(tag => tag.toLowerCase().includes(query)) ||
            exam.year.includes(query);

        const matchesConcours = !selectedConcours || exam.concours === selectedConcours;
        const matchesMatiere = !selectedMatiere || exam.matiere === selectedMatiere;
        
        const currentStatus = exam.status || (exam.completed ? 'completed' : 'todo');

        let matchesStatus = true;
        if (selectedStatus === 'todo') matchesStatus = currentStatus === 'todo';
        if (selectedStatus === 'in_progress') matchesStatus = currentStatus === 'in_progress';
        if (selectedStatus === 'done') matchesStatus = currentStatus === 'completed';

        return matchesQuery && matchesConcours && matchesMatiere && matchesStatus;
    });

    statsCounter.textContent = `${filtered.length} / ${exams.length} Sujets`;

    if (filtered.length === 0) {
        examGrid.innerHTML = `
            <div class="empty-state">
                <p>Aucun sujet ne correspond à vos critères.</p>
            </div>
        `;
        return;
    }

    examGrid.innerHTML = filtered.map(exam => {
        const currentStatus = exam.status || (exam.completed ? 'completed' : 'todo');
        return `
            <div class="exam-card ${currentStatus}" onclick="cycleStatus('${exam.id}')">
                <div>
                    <div class="card-header-meta">
                        <span class="meta-tag concours">${escapeHtml(exam.concours)}</span>
                        <span class="meta-tag">${escapeHtml(exam.matiere)}</span>
                        <span class="meta-tag">${escapeHtml(exam.year)}</span>
                    </div>
                    <h3 class="card-title">${escapeHtml(exam.title)}</h3>
                </div>

                <div>
                    <div class="card-tags">
                        ${exam.tags.map(tag => `<span class="chapter-tag">#${escapeHtml(tag)}</span>`).join('')}
                    </div>

                    <div class="card-actions">
                        <a href="#" class="btn-open-pdf" onclick="openPdf('${exam.id}', event)">
                            📄 Ouvrir PDF
                        </a>
                        <div class="card-actions-right">
                            <button class="btn-edit" onclick="openEditModal('${exam.id}', event)">
                                Modifier
                            </button>
                            <button class="btn-delete" onclick="deleteExam('${exam.id}', event)">
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, match => {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escapeMap[match];
    });
}