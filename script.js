// ----------------- Global Variables -----------------
let currentlyActiveType = null;
let allValidTypes = null;

let correctTypes = [];
let submittedTypes = [];

let typeData = null;

let activeCategoryNum = 0;
let activeCategory = 'superEffectiveAgainst';
const typeProperties = {
    0: 'superEffectiveAgainst',
    1: 'notVeryEffectiveAgainst',
    2: 'noEffectAgainst',
    3: 'weakTo',
    4: 'resistantTo',
    5: 'immuneTo'
};

let score = 0;
let bestScore = 0;
let streak = 0;
let bestStreak = 0;

let isRandomMode = false;
let randomQueue = [];
let randomQueueIndex = 0;

let selectedCheckboxes = [];

// ----------------- Dark Mode ------------------
const darkModeToggle = document.getElementById("darkModeToggle");
const body = document.body;

darkModeToggle.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    if (body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
});

const currentTheme = localStorage.getItem("theme") ? localStorage.getItem("theme") : "dark";
if (currentTheme === "dark") {
    body.classList.add("dark-mode");
}

// ----------------- Type Loading and Display Logic -----------------
async function loadRandomType() {
    await checkForEmptyArrays();
    const randomIndex = Math.floor(Math.random() * allValidTypes.length);
    currentlyActiveType = allValidTypes[randomIndex];
    await loadType(currentlyActiveType);
}

const typeDescriptions = {
    'superEffectiveAgainst': 'super effective against',
    'notVeryEffectiveAgainst': 'not very effective against',
    'noEffectAgainst': 'no effect against',
    'weakTo': 'weak to',
    'resistantTo': 'resistant to',
    'immuneTo': 'immune to'
};

async function checkForEmptyArrays() {
    allValidTypes = allValidTypes.filter(type => type[activeCategory] && type[activeCategory].length > 0);
}

async function loadType(currentType) {
    // 1. build correctTypes & show the icon
    correctTypes = currentType[activeCategory].filter(t => t);
    document.getElementById('typeImage').src = `TypeIcons/${currentType.name}.png`;

    const count = correctTypes.length;
    const plural = count > 1;

    let question;
    const noun = plural ? 'types' : 'type';
    const countText = plural ? ` (${count})` : ' (1)';

    if (activeCategory === 'noEffectAgainst') {
        // “Which type(s) does/do X have no effect against?”
        const verb = plural ? 'do' : 'does';
        question = `Which ${noun}${countText} ${verb} ${currentType.name} have no effect against?`;
    } else {
        // “Which type(s) (n) is/are X super effective against?” etc.
        const verb = plural ? 'are' : 'is';
        question = `Which ${noun}${countText} ${verb} ${currentType.name} `
            + `${typeDescriptions[activeCategory]}?`;
    }

    document.getElementById('activeType').innerText = question;
}


// ----------------- Data Fetching -----------------
async function fetchAllTypes() {
    try {
        const response = await fetch('pokemon_data.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        allValidTypes = data.types.map(type => type);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

// ----------------- Checkbox Logic -----------------
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function initializeCheckboxLogic() {
    const typeCheckboxes = document.querySelectorAll('.type-btn input[type="checkbox"]');
    typeCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                if (selectedCheckboxes.length < correctTypes.length) {
                    selectedCheckboxes.push(this);
                } else {
                    this.checked = false;
                }
            } else {
                const idx = selectedCheckboxes.indexOf(this);
                if (idx > -1) selectedCheckboxes.splice(idx, 1);
            }
        });
    });
}

// ----------------- Category Buttons Logic -----------------
function initializeCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const cat = btn.dataset.category;
            if (cat === 'random') {
                isRandomMode = true;
                randomQueue = shuffle(Object.keys(typeProperties).map(k => parseInt(k)));
                randomQueueIndex = 0;
                activeCategoryNum = randomQueue[0];
                activeCategory = typeProperties[activeCategoryNum];
            } else {
                isRandomMode = false;
                activeCategory = cat;
                activeCategoryNum = parseInt(btn.dataset.index, 10);
            }
            //Hide result box
            document.getElementById('resultTypeImage').src = '';
            const resultBox = document.getElementById('resultBox');
            resultBox.style.display = 'none';

            selectedCheckboxes = [];
            submittedTypes = [];
            score = 0;
            streak = 0;
            await fetchAllTypes();
            updateScore();
            await loadRandomType();
        });
    });
}

// ----------------- Submitting Answers -----------------
document.getElementById('submitAnswer').addEventListener('click', async function () {
    if (selectedCheckboxes.length === 0 && currentlyActiveType[activeCategory].length > 0) {
        alert('Please select a type before submitting.');
        return;
    }
    await submitAnswers(selectedCheckboxes);
});

async function submitAnswers(checkboxes) {
    //Show result box
    const resultBox = document.getElementById('resultBox');
    resultBox.style.display = 'flex';

    let points = 0;
    submittedTypes = checkboxes.map(cb => cb.value).sort();
    correctTypes.sort();
    checkboxes.forEach(cb => {
        if (correctTypes.includes(cb.value)) points++;
        cb.checked = false;
    });

    console.log(points, submittedTypes.length);
    updateScore(points, points === submittedTypes.length);

    document.getElementById('resultTypeImage').src =
        `TypeIcons/${currentlyActiveType.name}.png`;
    const htmlList = correctTypes
        .map(name => {
            const cls = submittedTypes.includes(name) ? 'correct' : 'incorrect';
            return `<span class="${cls}">${name}</span>`;
        })
        .join(', ');
    document.getElementById('resultText').innerHTML = htmlList;
    document.getElementById('resultScore').innerText = `${points}/${correctTypes.length}`;

    await resetVariables();

    if (isRandomMode) {
        randomQueueIndex++;
        if (randomQueueIndex < randomQueue.length) {
            activeCategoryNum = randomQueue[randomQueueIndex];
            activeCategory = typeProperties[activeCategoryNum];
        } else {
            allValidTypes = [];
        }
    }

    if (allValidTypes.length > 0) {
        await loadRandomType();
    } else {
        document.getElementById('typeImage').src = `TypeIcons/Unknown.png`;
        document.getElementById('activeType').innerText = 'Quiz Complete!';
    }
}

async function resetVariables() {
    selectedCheckboxes = [];
    submittedTypes = [];
    const idx = allValidTypes.indexOf(currentlyActiveType);
    if (idx > -1) allValidTypes.splice(idx, 1);
    currentlyActiveType = null;
}

// ----------------- Score -----------------
function updateScore(roundScore = 0, continueStreak = false) {
    score += roundScore;
    if (score > bestScore) { bestScore = score; }


    streak = continueStreak ? ++streak : 0;
    if (streak > bestStreak) { bestStreak = streak; }

    localStorage.setItem('bestScore', bestScore);
    localStorage.setItem('bestStreak', bestStreak);

    document.getElementById('score').innerText = score;
    document.getElementById('bestScore').innerText = bestScore;
    document.getElementById('streak').innerText = streak;
    document.getElementById('bestStreak').innerText = bestStreak;
}

// ----------------- Initialization -----------------
window.addEventListener('DOMContentLoaded', async () => {
    //Hide result box
    document.getElementById('resultTypeImage').src = '';
    const resultBox = document.getElementById('resultBox');
    resultBox.style.display = 'none';

    // Set initial category
    activeCategory = typeProperties[activeCategoryNum];

    // Load stored scores
    bestScore = parseInt(localStorage.getItem('bestScore'), 10) || 0;
    bestStreak = parseInt(localStorage.getItem('bestStreak'), 10) || 0;

    updateScore();

    // Initialize logic
    initializeCheckboxLogic();
    initializeCategoryButtons();

    // Fetch types and start quiz
    await fetchAllTypes();
    await loadRandomType();
});
