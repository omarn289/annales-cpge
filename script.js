// ==========================================
// 1. CONFIGURATION ET CLÉS D'ACCÈS CLOUD
// ==========================================

// ID de ton Gist privé (peut rester public dans le code)
const GIST_ID = "eca402a7be9cf3bac3b4d154e7cd8a57"; 

// Récupération sécurisée du token (enregistré uniquement sur ton appareil)
let GITHUB_TOKEN = localStorage.getItem('gh_token');

if (!GITHUB_TOKEN) {
    GITHUB_TOKEN = prompt("Entre ton Personal Access Token GitHub (GHP) pour activer la synchro Cloud :");
    if (GITHUB_TOKEN) {
        localStorage.setItem('gh_token', GITHUB_TOKEN.trim());
    }
}

// Variables globales de l'application
let exams = [];

// ==========================================
// 2. FONCTIONS DE SYNCHRONISATION GITHUB GIST
// ==========================================

// Charger la liste des sujets depuis le Cloud
async function loadExamsFromGist() {
    if (!GITHUB_TOKEN || !GIST_ID || GIST_ID === "TON_GIST_ID_ICI") {
        console.warn("Configuration Gist incomplète. Chargement depuis le stockage local.");
        return JSON.parse(localStorage.getItem('exams')) || [];
    }

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP : ${response.status}`);
        }

        const data = await response.json();
        const content = data.files['annales.json'].content;
        
        // Mettre à jour la copie locale de secours
        localStorage.setItem('exams', content);
        return JSON.parse(content);
    } catch (error) {
        console.error("Erreur de synchronisation Cloud (Chargement) :", error);
        // Fallback local en cas d'erreur ou d'absence de réseau
        return JSON.parse(localStorage.getItem('exams')) || [];
    }
}

// Enregistrer la liste des sujets dans le Cloud
async function saveExamsToGist(examsData) {
    // 1. Sauvegarde locale immédiate
    localStorage.setItem('exams', JSON.stringify(examsData));

    if (!GITHUB_TOKEN || !GIST_ID || GIST_ID === "TON_GIST_ID_ICI") {
        return;
    }

    // 2. Envoi sur GitHub Gist en arrière-plan
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'annales.json': {
                        content: JSON.stringify(examsData, null, 2)
                    }
                }
            })
        });

        if (response.ok) {
            console.log("Synchronisé avec succès sur GitHub Gist !");
        } else {
            console.error("Échec de la sauvegarde Cloud. Code :", response.status);
        }
    } catch (error) {
        console.error("Erreur de synchronisation Cloud (Sauvegarde) :", error);
    }
}

// ==========================================
// 3. AFFICHAGE ET ÉVÉNEMENTS INTERFACE
// ==========================================

// Fonction d'affichage dynamique des sujets
function renderExams() {
    const listContainer = document.getElementById('exams-list');
    const counterElement = document.getElementById('stats-counter');
    
    if (!listContainer) return;

    listContainer.innerHTML = '';

    // Mettre à jour le compteur
    if (counterElement) {
        counterElement.textContent = `${exams.length} Sujet${exams.length > 1 ? 's' : ''}`;
    }

    if (exams.length === 0) {
        listContainer.innerHTML = '<p class="empty-msg">Aucun sujet enregistré pour le moment.</p>';
        return;
    }

    exams.forEach((exam, index) => {
        const card = document.createElement('div');
        card.className = 'exam-card';
        card.innerHTML = `
            <div class="exam-info">
                <h3>${exam.title}</h3>
                <p><strong>Matière :</strong> ${exam.subject || 'N/A'}</p>
                <p><strong>Année :</strong> ${exam.year || 'N/A'}</p>
                ${exam.link ? `<a href="${exam.link}" target="_blank" class="exam-link">🔗 Ouvrir le sujet</a>` : ''}
            </div>
            <button onclick="deleteExam(${index})" class="delete-btn">Supprimer</button>
        `;
        listContainer.appendChild(card);
    });
}

// Ajouter un sujet
function addExam(newExam) {
    exams.push(newExam);
    renderExams();
    saveExamsToGist(exams); // Sauvegarde automatique local + cloud
}

// Supprimer un sujet
function deleteExam(index) {
    if (confirm("Voulez-vous vraiment supprimer ce sujet ?")) {
        exams.splice(index, 1);
        renderExams();
        saveExamsToGist(exams); // Sauvegarde automatique local + cloud
    }
}

// ==========================================
// 4. INITIALISATION DE L'APPLICATION
// ==========================================

async function initApp() {
    // 1. Récupérer les annales depuis la base de données Cloud
    exams = await loadExamsFromGist();
    
    // 2. Afficher la liste à l'écran
    renderExams();

    // 3. Gestionnaire du formulaire d'ajout
    const form = document.getElementById('add-exam-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const titleInput = document.getElementById('exam-title');
            const subjectInput = document.getElementById('exam-subject');
            const yearInput = document.getElementById('exam-year');
            const linkInput = document.getElementById('exam-link');

            const newExam = {
                title: titleInput ? titleInput.value : '',
                subject: subjectInput ? subjectInput.value : '',
                year: yearInput ? yearInput.value : '',
                link: linkInput ? linkInput.value : ''
            };

            addExam(newExam);
            form.reset();

            // Fermer la modale si elle existe
            const modal = document.getElementById('modal');
            if (modal) modal.style.display = 'none';
        });
    }
}

// Démarrer l'application au chargement complet du DOM
document.addEventListener('DOMContentLoaded', initApp);
