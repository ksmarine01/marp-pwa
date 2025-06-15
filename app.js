// Import Marp Core from ESM CDN
import { Marp } from 'https://esm.sh/@marp-team/marp-core?bundle';

// Application States
const APP_STATES = {
    FILE_SELECT: 'file-select',
    PROCESSING: 'processing',
    SLIDE_VIEW: 'slide-view',
    ERROR: 'error'
};

// Global variables
let currentSlideIndex = 0;
let totalSlides = 0;
let slides = [];
let marp = null;

// Initialize Marp instance with configuration
function initializeMarp() {
    marp = new Marp({
        html: true,
        markdown: {
            html: true,
            breaks: true,
            linkify: true
        },
        emoji: {
            shortcode: true,
            unicode: true
        }
    });
    
    // Enable custom themes and CSS
    marp.themeSet.default = marp.themeSet.default || {};
}

// State management
function showState(state) {
    // Hide all states
    Object.values(APP_STATES).forEach(s => {
        const element = document.getElementById(s);
        if (element) {
            element.classList.remove('active');
        }
    });
    
    // Show the specified state
    const targetElement = document.getElementById(state);
    if (targetElement) {
        targetElement.classList.add('active');
    }
}

// File handling
function setupFileHandling() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // File input change handler
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });
    
    // Drop zone click handler
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// Handle file processing
async function handleFile(file) {
    // Validate file type
    const validExtensions = ['.md', '.marp', '.markdown'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        showError('サポートされていないファイル形式です。.md, .marp, .markdown ファイルを選択してください。');
        return;
    }
    
    try {
        // Show processing state
        showState(APP_STATES.PROCESSING);
        
        // Read file content
        const content = await readFileAsText(file);
        
        // Process MARP content
        await processMarpContent(content);
        
        // Show slide view
        showState(APP_STATES.SLIDE_VIEW);
        updateSlideCounter();
        
    } catch (error) {
        console.error('File processing error:', error);
        showError(`ファイルの処理中にエラーが発生しました: ${error.message}`);
    }
}

// Read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('ファイルの読み込みに失敗しました'));
        reader.readAsText(file);
    });
}

// Process MARP content
async function processMarpContent(content) {
    try {
        // Extract and process custom CSS/themes from the content
        const processedContent = await processCustomStyles(content);
        
        // Render MARP content
        const { html, css } = marp.render(processedContent);
        
        // Apply custom styles
        applyCustomStyles(css);
        
        // Parse slides from HTML
        parseSlides(html);
        
        if (slides.length === 0) {
            throw new Error('スライドが見つかりませんでした');
        }
        
        // Display first slide
        currentSlideIndex = 0;
        displayCurrentSlide();
        
    } catch (error) {
        throw new Error(`MARP処理エラー: ${error.message}`);
    }
}

// Process custom styles and themes
async function processCustomStyles(content) {
    let processedContent = content;
    
    // Extract @theme directive
    const themeMatch = content.match(/<!--\s*theme:\s*(\S+)\s*-->/i) || 
                      content.match(/^<!--\s*@theme:\s*(\S+)\s*-->$/mi);
    
    if (themeMatch) {
        console.log(`Theme detected: ${themeMatch[1]}`);
        // MARP Core will handle built-in themes automatically
    }
    
    // Extract custom CSS from HTML comments or style blocks
    const cssBlocks = [];
    
    // Look for <!-- $theme: css --> blocks
    const themeRegex = /<!--\s*\$theme:\s*css\s*-->([\s\S]*?)<!--\s*\/\$theme\s*-->/gi;
    let themeMatch2;
    while ((themeMatch2 = themeRegex.exec(content)) !== null) {
        cssBlocks.push(themeMatch2[1].trim());
    }
    
    // Look for <style> blocks
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let styleMatch;
    while ((styleMatch = styleRegex.exec(content)) !== null) {
        cssBlocks.push(styleMatch[1].trim());
    }
    
    // If we found custom CSS, store it for later application
    if (cssBlocks.length > 0) {
        const customCSS = cssBlocks.join('\n');
        // Store for later application
        window.customMarpCSS = customCSS;
    }
    
    return processedContent;
}

// Apply custom styles
function applyCustomStyles(marpCSS) {
    // Remove existing custom styles
    const existingStyle = document.getElementById('marp-custom-styles');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // Create new style element
    const styleElement = document.createElement('style');
    styleElement.id = 'marp-custom-styles';
    
    // Combine MARP generated CSS with custom CSS
    let combinedCSS = marpCSS || '';
    
    // Add stored custom CSS
    if (window.customMarpCSS) {
        combinedCSS += '\n' + window.customMarpCSS;
    }
    
    // Add emoji size fixes
    combinedCSS += `
        /* Emoji size fixes */
        .slide-content img[alt*="emoji"],
        .slide-content .emoji,
        .slide-content img[src*="emoji"] {
            height: 1.2em !important;
            width: 1.2em !important;
            max-height: 1.2em !important;
            max-width: 1.2em !important;
            display: inline-block !important;
            vertical-align: -0.2em !important;
            margin: 0 0.1em !important;
            object-fit: contain !important;
        }
        
        /* MARP section styling enhancements */
        .slide-content section {
            box-sizing: border-box;
        }
        
        .slide-content section[data-theme] {
            /* Allow theme-specific styling */
        }
    `;
    
    styleElement.textContent = combinedCSS;
    document.head.appendChild(styleElement);
}

// Parse slides from HTML
function parseSlides(html) {
    // Create a temporary container to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Find all section elements (MARP slides)
    const sections = tempDiv.querySelectorAll('section');
    
    slides = Array.from(sections).map(section => section.outerHTML);
    totalSlides = slides.length;
    
    // Update total slides counter
    const totalSlidesElement = document.getElementById('totalSlides');
    if (totalSlidesElement) {
        totalSlidesElement.textContent = totalSlides;
    }
}

// Display current slide
function displayCurrentSlide() {
    const slideContent = document.getElementById('slideContent');
    if (slideContent && slides[currentSlideIndex]) {
        slideContent.innerHTML = slides[currentSlideIndex];
        
        // Process any images for emoji handling
        const images = slideContent.querySelectorAll('img');
        images.forEach(img => {
            if (img.alt && (img.alt.includes('emoji') || img.src.includes('emoji'))) {
                img.classList.add('emoji');
            }
        });
    }
    
    updateSlideCounter();
}

// Update slide counter
function updateSlideCounter() {
    const currentSlideElement = document.getElementById('currentSlide');
    if (currentSlideElement) {
        currentSlideElement.textContent = currentSlideIndex + 1;
    }
}

// Navigation functions
function nextSlide() {
    if (currentSlideIndex < totalSlides - 1) {
        currentSlideIndex++;
        displayCurrentSlide();
    }
}

function prevSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        displayCurrentSlide();
    }
}

function goToSlide(index) {
    if (index >= 0 && index < totalSlides) {
        currentSlideIndex = index;
        displayCurrentSlide();
    }
}

// Error handling
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    showState(APP_STATES.ERROR);
}

// Setup navigation
function setupNavigation() {
    // Button event listeners
    const prevButton = document.getElementById('prevSlide');
    const nextButton = document.getElementById('nextSlide');
    const backButton = document.getElementById('backToSelect');
    const retryButton = document.getElementById('retryButton');
    
    if (prevButton) {
        prevButton.addEventListener('click', prevSlide);
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', nextSlide);
    }
    
    if (backButton) {
        backButton.addEventListener('click', () => {
            showState(APP_STATES.FILE_SELECT);
            // Reset file input
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.value = '';
            }
        });
    }
    
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            showState(APP_STATES.FILE_SELECT);
        });
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Only handle keyboard events when in slide view
        const slideView = document.getElementById('slide-view');
        if (!slideView || !slideView.classList.contains('active')) {
            return;
        }
        
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                prevSlide();
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                nextSlide();
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(totalSlides - 1);
                break;
            case 'Escape':
                e.preventDefault();
                showState(APP_STATES.FILE_SELECT);
                break;
        }
    });
}

// Initialize application
function initializeApp() {
    try {
        // Initialize MARP
        initializeMarp();
        
        // Setup file handling
        setupFileHandling();
        
        // Setup navigation
        setupNavigation();
        
        // Show initial state
        showState(APP_STATES.FILE_SELECT);
        
        console.log('MARP PWA initialized successfully');
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError(`アプリケーションの初期化中にエラーが発生しました: ${error.message}`);
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}