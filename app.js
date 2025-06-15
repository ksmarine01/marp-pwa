// MARP PWA JavaScript
import { Marp } from 'https://esm.sh/@marp-team/marp-core?bundle';
import browser from 'https://esm.sh/@marp-team/marp-core/browser?bundle';

class MarpViewer {
    constructor() {
        this.currentSlide = 0;
        this.totalSlides = 0;
        this.slides = [];
        this.marp = new Marp({ 
            script: false,
            html: true 
        });
        
        this.init();
        this.setupEventListeners();
        this.loadSamplePresentation();
    }

    init() {
        this.elements = {
            fileDropZone: document.getElementById('fileDropZone'),
            slideContainer: document.getElementById('slideContainer'),
            slideContent: document.getElementById('slideContent'),
            fileInput: document.getElementById('fileInput'),
            loadFileBtn: document.getElementById('loadFileBtn'),
            selectFileBtn: document.getElementById('selectFileBtn'),
            themeToggle: document.getElementById('themeToggle'),
            
            // Navigation elements
            firstSlideBtn: document.getElementById('firstSlideBtn'),
            prevSlideBtn: document.getElementById('prevSlideBtn'),
            nextSlideBtn: document.getElementById('nextSlideBtn'),
            lastSlideBtn: document.getElementById('lastSlideBtn'),
            currentSlide: document.getElementById('currentSlide'),
            totalSlidesEl: document.getElementById('totalSlides'),
            progressFill: document.getElementById('progressFill')
        };

        // Initialize theme
        this.initTheme();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('marp-theme') || 'light';
        document.documentElement.setAttribute('data-color-scheme', savedTheme);
        this.updateThemeToggle(savedTheme);
    }

    updateThemeToggle(theme) {
        const isDark = theme === 'dark';
        this.elements.themeToggle.textContent = isDark ? '☀️' : '🌙';
        this.elements.themeToggle.title = isDark ? 'ライトテーマに切り替え' : 'ダークテーマに切り替え';
    }

    setupEventListeners() {
        // File handling
        this.elements.loadFileBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.selectFileBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        this.setupDragAndDrop();

        // Navigation
        this.elements.firstSlideBtn.addEventListener('click', () => this.goToSlide(0));
        this.elements.prevSlideBtn.addEventListener('click', () => this.previousSlide());
        this.elements.nextSlideBtn.addEventListener('click', () => this.nextSlide());
        this.elements.lastSlideBtn.addEventListener('click', () => this.goToSlide(this.totalSlides - 1));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Touch gestures
        this.setupTouchGestures();

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Window resize
        window.addEventListener('resize', () => this.updateSlideDisplay());
    }

    setupDragAndDrop() {
        const dropZone = this.elements.fileDropZone;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
        });

        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        try {
            // Validate file type
            const validExtensions = ['.md', '.marp', '.markdown'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!validExtensions.includes(fileExtension)) {
                this.showError('対応していないファイル形式です。.md, .marp, .markdown ファイルを選択してください。');
                return;
            }

            this.showLoading();
            
            const content = await this.readFile(file);
            await this.renderPresentation(content);
            
        } catch (error) {
            console.error('File processing error:', error);
            this.showError('ファイルの読み込みに失敗しました: ' + error.message);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    async renderPresentation(markdownContent) {
        try {
            // Render with MARP
            const { html, css } = this.marp.render(markdownContent);
            
            // Apply styles
            this.applyMarpStyles(css);
            
            // Parse slides
            this.parseSlides(html);
            
            // Initialize presentation
            this.currentSlide = 0;
            this.updateSlideDisplay();
            this.showSlideContainer();
            
            // Apply browser post-processing
            browser(this.elements.slideContent);
            
        } catch (error) {
            console.error('Rendering error:', error);
            this.showError('プレゼンテーションの表示に失敗しました: ' + error.message);
        }
    }

    applyMarpStyles(css) {
        // Remove existing MARP styles
        const existingStyle = document.getElementById('marp-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Add new styles
        const styleElement = document.createElement('style');
        styleElement.id = 'marp-styles';
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
    }

    parseSlides(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        this.slides = Array.from(tempDiv.querySelectorAll('section'));
        this.totalSlides = this.slides.length;
        
        if (this.totalSlides === 0) {
            throw new Error('スライドが見つかりませんでした');
        }
    }

    updateSlideDisplay() {
        if (this.slides.length === 0) return;

        // Clear current content
        this.elements.slideContent.innerHTML = '';
        
        // Add current slide
        const currentSlideElement = this.slides[this.currentSlide].cloneNode(true);
        this.elements.slideContent.appendChild(currentSlideElement);
        
        // Update navigation
        this.updateNavigation();
        
        // Update progress
        this.updateProgress();
    }

    updateNavigation() {
        // Update counter
        this.elements.currentSlide.textContent = this.currentSlide + 1;
        this.elements.totalSlidesEl.textContent = this.totalSlides;
        
        // Update button states
        this.elements.firstSlideBtn.disabled = this.currentSlide === 0;
        this.elements.prevSlideBtn.disabled = this.currentSlide === 0;
        this.elements.nextSlideBtn.disabled = this.currentSlide === this.totalSlides - 1;
        this.elements.lastSlideBtn.disabled = this.currentSlide === this.totalSlides - 1;
    }

    updateProgress() {
        const progress = this.totalSlides > 1 ? (this.currentSlide / (this.totalSlides - 1)) * 100 : 100;
        this.elements.progressFill.style.width = `${progress}%`;
    }

    // Navigation methods
    nextSlide() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.goToSlide(this.currentSlide + 1);
        }
    }

    previousSlide() {
        if (this.currentSlide > 0) {
            this.goToSlide(this.currentSlide - 1);
        }
    }

    goToSlide(slideIndex) {
        if (slideIndex >= 0 && slideIndex < this.totalSlides) {
            this.currentSlide = slideIndex;
            this.updateSlideDisplay();
        }
    }

    // Keyboard navigation
    handleKeydown(e) {
        if (this.elements.slideContainer.style.display === 'none') return;

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                this.previousSlide();
                break;
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
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
                this.showFileDropZone();
                break;
        }
    }

    // Touch gestures
    setupTouchGestures() {
        let startX = 0;
        let startY = 0;

        this.elements.slideContent.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        this.elements.slideContent.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;

            // Check if horizontal swipe is more significant than vertical
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    // Swipe left - next slide
                    this.nextSlide();
                } else {
                    // Swipe right - previous slide
                    this.previousSlide();
                }
            }

            startX = 0;
            startY = 0;
        }, { passive: true });
    }

    // Theme toggle
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        localStorage.setItem('marp-theme', newTheme);
        this.updateThemeToggle(newTheme);
    }

    // UI state management
    showLoading() {
        this.elements.slideContent.innerHTML = '<div class="loading">プレゼンテーションを読み込み中...</div>';
        this.showSlideContainer();
    }

    showError(message) {
        this.elements.slideContent.innerHTML = `
            <div class="error-state">
                <h3>❌ エラー</h3>
                <p>${message}</p>
                <button class="btn btn--primary" onclick="location.reload()">再読み込み</button>
            </div>
        `;
        this.showSlideContainer();
    }

    showSlideContainer() {
        this.elements.fileDropZone.style.display = 'none';
        this.elements.slideContainer.style.display = 'flex';
    }

    showFileDropZone() {
        this.elements.slideContainer.style.display = 'none';
        this.elements.fileDropZone.style.display = 'flex';
    }

    // Sample presentation
    async loadSamplePresentation() {
        const sampleMarkdown = `---
marp: true
theme: default
paginate: true
---

# MARP PWA ビューアへようこそ

マークダウンプレゼンテーション用プログレッシブWebアプリ

---

## 主な機能

- 📱 レスポンシブデザイン
- 📁 ローカルファイル対応
- 🚀 GitHub Pages対応
- 💾 オフライン機能
- 🎨 テーマ切り替え

---

## 使い方

1. 「ファイルを開く」ボタンをクリック
2. MARPマークダウンファイルを選択
3. 矢印キーまたはスワイプで移動
4. プレゼンテーションをお楽しみください！

---

## キーボード操作

- **← →** スライド移動
- **Space** 次のスライドへ
- **Home/End** 最初/最後のスライド
- **Escape** ファイル選択画面に戻る

---

<!-- theme: gaia -->

# ありがとうございました！

MARP Coreとモダンなウェブ技術で構築

---

## サンプルコード

\`\`\`javascript
// MARP PWAの例
const marp = new Marp();
const result = marp.render(markdown);
console.log('スライド準備完了！');
\`\`\`

---

## リスト例

### やりたいこと：
- [x] プレゼンテーション作成
- [x] レスポンシブ対応
- [x] PWA機能実装
- [ ] さらなる機能追加

### 対応ファイル：
1. **.md** - 標準Markdown
2. **.marp** - MARP専用
3. **.markdown** - Markdown拡張子`;

        try {
            await this.renderPresentation(sampleMarkdown);
        } catch (error) {
            console.error('Sample presentation load error:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MarpViewer();
});

// Export for global access if needed
window.MarpViewer = MarpViewer;