// nav.js

// --- Menu Button Handlers ---
// NOTE: These IDs must match the buttons in index.html, owned.html, etc.

document.addEventListener('DOMContentLoaded', () => {
    // Helper function to navigate, checking if the button exists before attaching listener
    const setupNavButton = (id, url) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                window.location.href = url;
            });
        }
    };

    // --- Core Navigation Links ---
    setupNavButton('searchPageBtn', 'index.html'); // NEW SEARCH BUTTON
    setupNavButton('wantedPageBtn', 'wanted.html');
    setupNavButton('seriesPageBtn', 'series.html');
    setupNavButton('ownedPageBtn', 'owned.html');
    setupNavButton('duplicatesPageBtn', 'duplicates.html');

    // --- Utility Links (Export/Import) ---
    // NOTE: Export/Import logic is complex and must remain on the index page for now.
    // For simplicity, we redirect them back to the search page if they try to use it elsewhere.

    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    if (exportBtn && !window.location.href.includes('index.html')) {
        exportBtn.addEventListener('click', () => {
            alert("Please use the Export function on the main search page.");
        });
    }

    if (importBtn && !window.location.href.includes('index.html')) {
        importBtn.addEventListener('click', () => {
            alert("Please use the Import function on the main search page.");
        });
    }
});