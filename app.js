import { Marp } from 'https://esm.sh/@marp-team/marp-core?bundle';

// Global state
let slides = [];
let currentSlideIndex = 0;
let marp = null;
let touchStartX = 0;
let touchStartY = 0;

// DOM elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const loading = document.getElementById('loading');
const errorDisplay = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const presentation = document.getElementById('presentation');
const slideContent = document.getElementById('slide-content');
const currentSlideSpan = document.getElementById('current-slide');
const totalSlidesSpan = document.getElementById('total-slides');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// Initialize MARP
function initializeMarp() {
    try {
        marp = new Marp({
            html: true,
            emoji: {
                shortcode: true,
                unicode: true,
                twemoji: {
                    base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
                }
            },
            math: {
                katex: {
                    output: 'html'
                }
            }
        });
        
        // Enable all themes
        marp.themeSet.default = marp.themeSet.get('default');
        
        console.log('MARP initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize MARP:', error);
        showError('MARPの初期化に失敗しました。');
    }
}

// Show different states
function showState(state) {
    const states = ['upload-area', 'loading', 'error', 'presentation'];
    states.forEach(s => {
        const element = document.getElementById(s);
        if (element) {
            element.classList.toggle('hidden', s !== state);
        }
    });
}

function showError(message) {
    errorMessage.textContent = message;
    showState('error');
}

function showLoading() {
    showState('loading');
}

function showPresentation() {
    showState('presentation');
}

function resetApp() {
    slides = [];
    currentSlideIndex = 0;
    slideContent.innerHTML = '';
    fileInput.value = '';
    showState('upload-area');
}

// File handling
function handleFile(file) {
    if (!file) {
        console.log('No file provided');
        return;
    }
    
    console.log('Processing file:', file.name, file.type);
    
    // Validate file type
    const validTypes = ['.md', '.marp', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidType = validTypes.some(type => fileName.endsWith(type)) || 
                       file.type === 'text/markdown' || 
                       file.type === 'text/plain' ||
                       file.type === '';
    
    if (!isValidType) {
        showError('サポートされていないファイル形式です。Markdownファイル(.md, .marp, .txt)を選択してください。');
        return;
    }
    
    showLoading();
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            console.log('File content loaded, length:', content.length);
            processMarkdown(content);
        } catch (error) {
            console.error('File processing error:', error);
            showError('ファイルの処理中にエラーが発生しました: ' + error.message);
        }
    };
    
    reader.onerror = (e) => {
        console.error('File read error:', e);
        showError('ファイルの読み込みに失敗しました。');
    };
    
    reader.readAsText(file);
}

// Process markdown with MARP
function processMarkdown(markdown) {
    try {
        if (!marp) {
            console.error('MARP not initialized');
            throw new Error('MARP not initialized');
        }
        
        console.log('Processing markdown with MARP...');
        
        // If no slide separators, create a simple slide
        if (!markdown.includes('---') && !markdown.includes('\n---\n')) {
            markdown = markdown.trim();
            if (!markdown.startsWith('#')) {
                markdown = '# スライド\n\n' + markdown;
            }
        }
        
        // Parse markdown with MARP
        const result = marp.render(markdown);
        console.log('MARP render result:', result);
        
        // Create slides from HTML
        createSlides(result.html, result.css);
        
        if (slides.length === 0) {
            throw new Error('マークダウンからスライドを作成できませんでした');
        }
        
        console.log('Created slides:', slides.length);
        
        // Initialize presentation
        currentSlideIndex = 0;
        updateSlideDisplay();
        showPresentation();
        
    } catch (error) {
        console.error('Markdown processing error:', error);
        showError('Markdownの処理中にエラーが発生しました: ' + error.message);
    }
}

// Create slides from MARP HTML output
function createSlides(html, css) {
    console.log('Creating slides from HTML...');
    
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Find all slide sections
    const sections = tempDiv.querySelectorAll('section');
    console.log('Found sections:', sections.length);
    
    if (sections.length === 0) {
        // If no sections found, create a single slide from the content
        const singleSlide = document.createElement('section');
        singleSlide.innerHTML = html;
        sections = [singleSlide];
    }
    
    slides = Array.from(sections).map((section, index) => {
        // Apply emoji fix to each slide
        applyEmojiFixToSlide(section);
        
        return {
            index: index,
            html: section.outerHTML,
            element: section.cloneNode(true)
        };
    });
    
    // Inject MARP CSS with emoji fixes
    injectMarpStyles(css);
    
    console.log(`Created ${slides.length} slides`);
}

// Apply emoji fix specifically to a slide element
function applyEmojiFixToSlide(slideElement) {
    // Find all potential emoji elements
    const emojiSelectors = [
        'img.emoji',
        '.emoji',
        'img[src*="twemoji"]',
        'img[alt*="emoji"]',
        'img[src*="emoji"]',
        'svg.emoji',
        'img[src*=".svg"][alt]',
        'img[src*="unicode"]'
    ];
    
    emojiSelectors.forEach(selector => {
        const elements = slideElement.querySelectorAll(selector);
        elements.forEach(el => {
            // Apply critical emoji styles
            el.style.setProperty('height', '1.2em', 'important');
            el.style.setProperty('width', '1.2em', 'important');
            el.style.setProperty('max-height', '1.2em', 'important');
            el.style.setProperty('max-width', '1.2em', 'important');
            el.style.setProperty('min-height', '1.2em', 'important');
            el.style.setProperty('min-width', '1.2em', 'important');
            el.style.setProperty('display', 'inline-block', 'important');
            el.style.setProperty('vertical-align', '-0.2em', 'important');
            el.style.setProperty('margin', '0 0.1em', 'important');
            el.style.setProperty('object-fit', 'contain', 'important');
            el.style.setProperty('object-position', 'center', 'important');
            el.style.setProperty('flex-shrink', '0', 'important');
            el.style.setProperty('box-sizing', 'border-box', 'important');
        });
    });
    
    // Also apply to any img elements that might be emojis
    const allImages = slideElement.querySelectorAll('img');
    allImages.forEach(img => {
        const src = img.src || img.getAttribute('src') || '';
        const alt = img.alt || '';
        const className = img.className || '';
        
        if (src.includes('emoji') || src.includes('twemoji') || 
            alt.includes('emoji') || className.includes('emoji') ||
            src.includes('unicode') || (src.includes('.svg') && alt)) {
            
            // Apply emoji fix with important declarations
            img.style.setProperty('height', '1.2em', 'important');
            img.style.setProperty('width', '1.2em', 'important');
            img.style.setProperty('max-height', '1.2em', 'important');
            img.style.setProperty('max-width', '1.2em', 'important');
            img.style.setProperty('display', 'inline-block', 'important');
            img.style.setProperty('vertical-align', '-0.2em', 'important');
            img.style.setProperty('margin', '0 0.1em', 'important');
            img.style.setProperty('object-fit', 'contain', 'important');
        }
    });
}

// Inject MARP styles with additional emoji fixes
function injectMarpStyles(css) {
    // Remove existing MARP styles
    const existingStyle = document.getElementById('marp-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // Create new style element
    const styleElement = document.createElement('style');
    styleElement.id = 'marp-styles';
    
    // Add original MARP CSS with emoji fixes
    const enhancedCSS = css + `
        
        /* Critical Emoji Fix - Additional Rules */
        section img.emoji,
        section .emoji,
        section img[src*="twemoji"],
        section img[alt*="emoji"],
        section img[src*="emoji"],
        section svg.emoji,
        section img[src*=".svg"][alt],
        section img[src*="unicode"] {
            height: 1.2em !important;
            width: 1.2em !important;
            max-height: 1.2em !important;
            max-width: 1.2em !important;
            min-height: 1.2em !important;
            min-width: 1.2em !important;
            display: inline-block !important;
            vertical-align: -0.2em !important;
            margin: 0 0.1em !important;
            object-fit: contain !important;
            object-position: center !important;
            flex-shrink: 0 !important;
            box-sizing: border-box !important;
        }
        
        /* Ensure slide dimensions */
        section {
            box-sizing: border-box !important;
            contain: layout style !important;
            overflow: hidden !important;
        }
    `;
    
    styleElement.textContent = enhancedCSS;
    document.head.appendChild(styleElement);
}

// Update slide display
function updateSlideDisplay() {
    if (slides.length === 0) {
        console.log('No slides to display');
        return;
    }
    
    const slide = slides[currentSlideIndex];
    slideContent.innerHTML = slide.html;
    
    // Re-apply emoji fix to ensure it's effective
    const section = slideContent.querySelector('section');
    if (section) {
        applyEmojiFixToSlide(section);
    }
    
    // Update counter
    currentSlideSpan.textContent = currentSlideIndex + 1;
    totalSlidesSpan.textContent = slides.length;
    
    // Update navigation buttons
    prevBtn.disabled = currentSlideIndex === 0;
    nextBtn.disabled = currentSlideIndex === slides.length - 1;
    
    console.log('Updated slide display:', currentSlideIndex + 1, '/', slides.length);
}

// Navigation functions
function nextSlide() {
    if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        updateSlideDisplay();
    }
}

function previousSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        updateSlideDisplay();
    }
}

function goToSlide(index) {
    if (index >= 0 && index < slides.length) {
        currentSlideIndex = index;
        updateSlideDisplay();
    }
}

// Fullscreen functionality
function toggleFullscreen() {
    const presentationEl = document.getElementById('presentation');
    
    if (!document.fullscreenElement) {
        presentationEl.requestFullscreen().then(() => {
            presentationEl.classList.add('fullscreen');
        }).catch(err => {
            console.error('Fullscreen failed:', err);
        });
    } else {
        document.exitFullscreen().then(() => {
            presentationEl.classList.remove('fullscreen');
        });
    }
}

// File input trigger function
function triggerFileInput() {
    console.log('Triggering file input');
    fileInput.click();
}

// Event listeners setup
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // File input change event
    fileInput.addEventListener('change', (e) => {
        console.log('File input changed:', e.target.files.length);
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only remove drag-over if we're leaving the upload area itself
        if (!uploadArea.contains(e.relatedTarget)) {
            uploadArea.classList.remove('drag-over');
        }
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        console.log('Files dropped:', files.length);
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // Upload area click handler
    uploadArea.addEventListener('click', (e) => {
        // Only trigger file input if clicking on the upload area itself or its content
        if (e.target === uploadArea || e.target.closest('.upload-content')) {
            console.log('Upload area clicked');
            triggerFileInput();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (presentation.classList.contains('hidden')) return;
        
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
            case 'PageDown':
                e.preventDefault();
                nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                previousSlide();
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(slides.length - 1);
                break;
            case 'Escape':
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                break;
            case 'f':
            case 'F':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    toggleFullscreen();
                }
                break;
        }
    });
    
    // Touch/swipe navigation
    const slideContainer = document.getElementById('slide-container');
    
    slideContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    slideContainer.addEventListener('touchend', (e) => {
        if (!touchStartX || !touchStartY) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchStartX - touchEndX;
        const deltaY = touchStartY - touchEndY;
        
        // Require minimum distance and horizontal movement
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                nextSlide();
            } else {
                previousSlide();
            }
        }
        
        touchStartX = 0;
        touchStartY = 0;
    }, { passive: true });
    
    // Fullscreen change events
    document.addEventListener('fullscreenchange', () => {
        const presentationEl = document.getElementById('presentation');
        if (!document.fullscreenElement) {
            presentationEl.classList.remove('fullscreen');
        }
    });
    
    // Window resize handling
    window.addEventListener('resize', () => {
        // Re-render current slide to handle size changes
        if (slides.length > 0) {
            updateSlideDisplay();
        }
    });
    
    console.log('Event listeners setup complete');
}

// PWA functionality
function createServiceWorker() {
    const swContent = `
const CACHE_NAME = 'marp-viewer-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    'https://esm.sh/@marp-team/marp-core?bundle'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
`;
    
    // Create service worker file dynamically
    const blob = new Blob([swContent], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    }
}

// Create web app manifest
function createManifest() {
    const manifest = {
        name: 'MARPスライドビューア',
        short_name: 'MARP Viewer',
        description: 'MARPスライドプレゼンテーション用PWA',
        start_url: '/',
        display: 'standalone',
        background_color: '#FCFCF9',
        theme_color: '#21808D',
        icons: [
            {
                src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiMyMTgwOEQiLz4KPHN2ZyB4PSI0OCIgeT0iNDgiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiLz4KPHA+PHRleHQgeD0iMTIiIHk9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjgiIGZpbGw9IndoaXRlIj5NQVJQPC90ZXh0PjwvcD4KPC9zdmc+Cjwvc3ZnPgo=',
                sizes: '192x192',
                type: 'image/svg+xml'
            }
        ]
    };
    
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);
}

// Global functions for HTML onclick events
window.resetApp = resetApp;
window.nextSlide = nextSlide;
window.previousSlide = previousSlide;
window.toggleFullscreen = toggleFullscreen;
window.triggerFileInput = triggerFileInput;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing app');
    initializeMarp();
    setupEventListeners();
    createServiceWorker();
    createManifest();
    
    console.log('MARPスライドビューア initialized');
});