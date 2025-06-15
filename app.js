import { Marp } from 'https://esm.sh/@marp-team/marp-core?bundle';

const APP_STATES = {
    FILE_SELECT: 'file-select',
    PROCESSING: 'processing',
    SLIDE_VIEW: 'slide-view',
    ERROR: 'error',
};

class MarpPWA {
    constructor() {
        this.currentSlideIndex = 0;
        this.totalSlides = 0;
        this.slides = [];
        this.marp = null;
    }

    initialize() {
        try {
            this.initializeMarp();
            this.setupFileHandling();
            this.setupNavigation();
            this.showState(APP_STATES.FILE_SELECT);
            console.log('MARP PWA initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(`アプリケーションの初期化中にエラーが発生しました: ${error.message}`);
        }
    }

    initializeMarp() {
        this.marp = new Marp({
            html: true,
            markdown: {
                html: true,
                breaks: true,
                linkify: true,
            },
            emoji: {
                shortcode: true,
                unicode: true,
            },
        });

        this.marp.themeSet.default = this.marp.themeSet.default || {};
    }

    showState(state) {
        Object.values(APP_STATES).forEach((s) => {
            const el = document.getElementById(s);
            if (el) el.classList.remove('active');
        });

        const target = document.getElementById(state);
        if (target) target.classList.add('active');
    }

    setupFileHandling() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFile(file);
        });

        dropZone.addEventListener('click', () => fileInput.click());

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
            if (files.length > 0) this.handleFile(files[0]);
        });
    }

    async handleFile(file) {
        const validExtensions = ['.md', '.marp', '.markdown'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(ext)) {
            this.showError('サポートされていないファイル形式です。.md, .marp, .markdown ファイルを選択してください。');
            return;
        }

        try {
            this.showState(APP_STATES.PROCESSING);
            const content = await this.readFileAsText(file);
            await this.processMarpContent(content);
            this.showState(APP_STATES.SLIDE_VIEW);
            this.updateSlideCounter();
        } catch (error) {
            console.error('File processing error:', error);
            this.showError(`ファイルの処理中にエラーが発生しました: ${error.message}`);
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsText(file);
        });
    }

    async processMarpContent(content) {
        try {
            const processedContent = await this.processCustomStyles(content);
            const { html, css } = this.marp.render(processedContent);
            this.applyCustomStyles(css);
            this.parseSlides(html);

            if (this.slides.length === 0) {
                throw new Error('スライドが見つかりませんでした');
            }

            this.currentSlideIndex = 0;
            this.displayCurrentSlide();
        } catch (error) {
            throw new Error(`MARP処理エラー: ${error.message}`);
        }
    }

    async processCustomStyles(content) {
        let processedContent = content;
        const themeMatch = content.match(/<!--\s*theme:\s*(\S+)\s*-->/i) ||
            content.match(/^<!--\s*@theme:\s*(\S+)\s*-->$/mi);

        if (themeMatch) {
            console.log(`Theme detected: ${themeMatch[1]}`);
        }

        const cssBlocks = [];
        const themeRegex = /<!--\s*\$theme:\s*css\s*-->([\s\S]*?)<!--\s*\/\$theme\s*-->/gi;
        let themeMatch2;
        while ((themeMatch2 = themeRegex.exec(content)) !== null) {
            cssBlocks.push(themeMatch2[1].trim());
        }

        const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        let styleMatch;
        while ((styleMatch = styleRegex.exec(content)) !== null) {
            cssBlocks.push(styleMatch[1].trim());
        }

        if (cssBlocks.length > 0) {
            const customCSS = cssBlocks.join('\n');
            window.customMarpCSS = customCSS;
        }

        return processedContent;
    }

    applyCustomStyles(marpCSS) {
        const existingStyle = document.getElementById('marp-custom-styles');
        if (existingStyle) existingStyle.remove();

        const styleElement = document.createElement('style');
        styleElement.id = 'marp-custom-styles';

        let combinedCSS = marpCSS || '';

        if (window.customMarpCSS) {
            combinedCSS += '\n' + window.customMarpCSS;
        }

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

    parseSlides(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const sections = tempDiv.querySelectorAll('section');

        this.slides = Array.from(sections).map((section) => section.outerHTML);
        this.totalSlides = this.slides.length;

        const totalSlidesElement = document.getElementById('totalSlides');
        if (totalSlidesElement) {
            totalSlidesElement.textContent = this.totalSlides;
        }
    }

    displayCurrentSlide() {
        const slideContent = document.getElementById('slideContent');
        if (slideContent && this.slides[this.currentSlideIndex]) {
            slideContent.innerHTML = this.slides[this.currentSlideIndex];

            const images = slideContent.querySelectorAll('img');
            images.forEach((img) => {
                if (img.alt && (img.alt.includes('emoji') || img.src.includes('emoji'))) {
                    img.classList.add('emoji');
                }
            });
        }

        this.updateSlideCounter();
    }

    updateSlideCounter() {
        const currentSlideElement = document.getElementById('currentSlide');
        if (currentSlideElement) {
            currentSlideElement.textContent = this.currentSlideIndex + 1;
        }
    }

    nextSlide() {
        if (this.currentSlideIndex < this.totalSlides - 1) {
            this.currentSlideIndex++;
            this.displayCurrentSlide();
        }
    }

    prevSlide() {
        if (this.currentSlideIndex > 0) {
            this.currentSlideIndex--;
            this.displayCurrentSlide();
        }
    }

    goToSlide(index) {
        if (index >= 0 && index < this.totalSlides) {
            this.currentSlideIndex = index;
            this.displayCurrentSlide();
        }
    }

    printSlides() {
        if (this.slides.length === 0) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const customStyle = document.getElementById('marp-custom-styles');
        const customCSS = customStyle ? customStyle.textContent : '';

        const html = `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <link rel="stylesheet" href="style.css">
                <style>
                ${customCSS}
                @media print { section { page-break-after: always; } }
                body { margin: 0; }
                </style>
            </head>
            <body>
                ${this.slides.join('')}
            </body>
            </html>`;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = () => {
            printWindow.print();
            printWindow.close();
        };
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        this.showState(APP_STATES.ERROR);
    }

    setupNavigation() {
        const prevButton = document.getElementById('prevSlide');
        const nextButton = document.getElementById('nextSlide');
        const backButton = document.getElementById('backToSelect');
        const retryButton = document.getElementById('retryButton');
        const printButton = document.getElementById('printSlides');

        if (prevButton) prevButton.addEventListener('click', () => this.prevSlide());
        if (nextButton) nextButton.addEventListener('click', () => this.nextSlide());
        if (printButton) printButton.addEventListener('click', () => this.printSlides());

        if (backButton) {
            backButton.addEventListener('click', () => {
                this.showState(APP_STATES.FILE_SELECT);
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.value = '';
            });
        }

        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.showState(APP_STATES.FILE_SELECT);
            });
        }

        document.addEventListener('keydown', (e) => {
            const slideView = document.getElementById('slide-view');
            if (!slideView || !slideView.classList.contains('active')) return;

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    this.prevSlide();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    this.nextSlide();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToSlide(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToSlide(this.totalSlides - 1);
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.showState(APP_STATES.FILE_SELECT);
                    break;
            }
        });
    }
}

const app = new MarpPWA();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

