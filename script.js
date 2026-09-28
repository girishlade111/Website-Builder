class WebsiteBuilder {
    constructor() {
        this.apiKey = 'AIzaSyDK68voN4wRnCh95nrlu0m9vHbtJKOECqM';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
        this.promptHistory = JSON.parse(localStorage.getItem('promptHistory') || '[]');
        this.codeHistory = JSON.parse(localStorage.getItem('codeHistory') || '[]');
        this.currentWebsiteCode = null; // Track current website for follow-ups
        this.originalPrompt = null; // Track original prompt for context
        this.monacoEditor = null; // Monaco Editor instance
        this.initializeElements();
        this.bindEvents();
        this.renderHistory();
    }

    initializeElements() {
        this.promptInput = document.getElementById('promptInput');
        this.generateBtn = document.getElementById('generateBtn');
        this.enhanceBtn = document.getElementById('enhanceBtn');
        this.monacoEditorContainer = document.getElementById('monacoEditorContainer');
        this.previewFrame = document.getElementById('previewFrame');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toastContainer = document.getElementById('toastContainer');
        this.copyCodeBtn2 = document.getElementById('copyCodeBtn2');
        this.clearBtn = document.getElementById('clearBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');

        // Tab elements
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.codeTab = document.getElementById('codeTab');
        this.previewTab = document.getElementById('previewTab');

        // History elements
        this.historyTabs = document.querySelectorAll('.history-tab');
        this.historyContents = document.querySelectorAll('.history-content');
        this.promptHistoryList = document.getElementById('promptHistoryList');
        this.codeHistoryList = document.getElementById('codeHistoryList');

        // Initialize Monaco Editor
        this.initializeMonacoEditor();
    }

    initializeMonacoEditor() {
        // Configure Monaco Editor loader
        require.config({ 
            paths: { 
                'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' 
            } 
        });

        require(['vs/editor/editor.main'], () => {
            // Create Monaco Editor instance
            this.monacoEditor = monaco.editor.create(this.monacoEditorContainer, {
                value: '// Your generated website code will appear here...',
                language: 'html',
                theme: 'vs-dark',
                automaticLayout: true,
                readOnly: false,
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                folding: true,
                renderLineHighlight: 'line',
                selectOnLineNumbers: true,
                roundedSelection: false,
                cursorStyle: 'line',
                contextmenu: true,
                mouseWheelZoom: true
            });

            // Handle editor resize
            window.addEventListener('resize', () => {
                if (this.monacoEditor) {
                    this.monacoEditor.layout();
                }
            });
        });
    }

    bindEvents() {
        this.generateBtn.addEventListener('click', () => this.generateWebsite());
        this.enhanceBtn.addEventListener('click', () => this.enhancePrompt());
        this.copyCodeBtn2.addEventListener('click', () => this.copyCode());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.exportBtn.addEventListener('click', () => this.exportCode());
        this.refreshBtn.addEventListener('click', () => this.refreshPreview());
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Tab switching
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // History tab switching
        this.historyTabs.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchHistoryTab(e.target.dataset.history));
        });

        // Allow Enter + Ctrl to generate
        this.promptInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.generateWebsite();
            }
        });
    }

    async generateWebsite() {
        const prompt = this.promptInput.value.trim();

        if (!prompt) {
            this.showToast('Please enter a description for your website', 'error');
            return;
        }

        this.showLoading(true);
        this.generateBtn.disabled = true;

        // Switch to code tab to show live generation
        this.switchTab('code');

        // Determine if this is a follow-up prompt or new website
        const isFollowUp = this.currentWebsiteCode && this.rawCode;

        // Show appropriate generation message
        if (isFollowUp) {
            if (this.monacoEditor) {
                this.monacoEditor.setValue('// Modifying your website based on your request...');
            }
            this.showToast('Processing follow-up request...', 'info');
        } else {
            if (this.monacoEditor) {
                this.monacoEditor.setValue('// Generating your website code...');
            }
        }

        try {
            let enhancedPrompt;

            if (isFollowUp) {
                // Create follow-up prompt with existing code context
                enhancedPrompt = this.createFollowUpPrompt(prompt, this.currentWebsiteCode, this.originalPrompt);
            } else {
                // Create new website prompt
                enhancedPrompt = this.createEnhancedPrompt(prompt);
                this.originalPrompt = prompt; // Store original prompt for future follow-ups
            }

            const response = await this.callGeminiAPI(enhancedPrompt);

            if (response && response.candidates && response.candidates[0]) {
                const generatedCode = this.extractCode(response.candidates[0].content.parts[0].text);

                // Store current website code for future follow-ups
                this.currentWebsiteCode = generatedCode;

                // Start live code writing animation
                await this.animateCodeWriting(generatedCode);

                // Update preview after animation completes
                this.updatePreview(generatedCode);

                // Add to history
                this.addToPromptHistory(prompt);
                this.addToCodeHistory(generatedCode, prompt);

                // Auto-switch to preview tab after generation
                setTimeout(() => this.switchTab('preview'), 1000);

                if (isFollowUp) {
                    this.showToast('Website updated successfully!', 'success');
                } else {
                    this.showToast('Website generated successfully!', 'success');
                }
            } else {
                throw new Error('No response from AI');
            }
        } catch (error) {
            console.error('Error generating website:', error);
            if (this.monacoEditor) {
                this.monacoEditor.setValue('// Error generating code. Please try again.');
            }
            this.showToast('Failed to generate website. Please try again.', 'error');
        } finally {
            this.showLoading(false);
            this.generateBtn.disabled = false;
        }
    }

    async enhancePrompt() {
        const prompt = this.promptInput.value.trim();

        if (!prompt) {
            this.showToast('Please enter a prompt to enhance', 'error');
            return;
        }

        this.showLoading(true);
        this.enhanceBtn.disabled = true;

        try {
            const enhancePromptText = this.createEnhancePrompt(prompt);
            const response = await this.callGeminiAPI(enhancePromptText);

            if (response && response.candidates && response.candidates[0]) {
                const enhancedPrompt = response.candidates[0].content.parts[0].text.trim();
                this.promptInput.value = enhancedPrompt;
                this.showToast('Prompt enhanced successfully!', 'success');
            } else {
                throw new Error('No response from AI');
            }
        } catch (error) {
            console.error('Error enhancing prompt:', error);
            this.showToast('Failed to enhance prompt. Please try again.', 'error');
        } finally {
            this.showLoading(false);
            this.enhanceBtn.disabled = false;
        }
    }

    createEnhancePrompt(userPrompt) {
        return `Enhance and optimize this website description prompt to create a better, more detailed prompt for generating a complete HTML website with embedded CSS and JavaScript:

Original prompt: "${userPrompt}"

Please enhance this prompt by:
1. Adding specific technical requirements for HTML structure
2. Suggesting modern CSS features and responsive design elements
3. Including interactive JavaScript functionality suggestions
4. Specifying color schemes, typography, and visual design elements
5. Adding accessibility and SEO considerations
6. Mentioning specific sections and components that would make the website complete
7. Ensuring the prompt will result in a single HTML file with embedded CSS and JavaScript

Return ONLY the enhanced prompt text, no explanations or additional formatting. The enhanced prompt should be clear, detailed, and optimized for generating a complete, modern, responsive website in a single HTML file.`;
    }

    createEnhancedPrompt(userPrompt) {
        return `Create a complete, modern, and responsive website based on this description: "${userPrompt}"

IMPORTANT REQUIREMENTS:
1. Generate ONLY the HTML code with embedded CSS and JavaScript
2. Use modern CSS with flexbox/grid for layouts
3. Make it fully responsive for mobile and desktop
4. Include smooth animations and transitions
5. Use modern color schemes and typography
6. Add interactive elements where appropriate
7. Ensure the code is clean, well-structured, and follows best practices
8. Include proper meta tags and semantic HTML
9. Make it visually appealing with good spacing and typography
10. Add hover effects and micro-interactions

The response should be a complete HTML document that can be directly rendered in a browser. Do not include any explanations or markdown formatting - just return the raw HTML code with embedded CSS and JavaScript.

Start with <!DOCTYPE html> and end with </html>. Make sure all styles are in a <style> tag in the head and all JavaScript is in a <script> tag before the closing body tag.`;
    }

    createFollowUpPrompt(followUpRequest, currentCode, originalPrompt) {
        return `You are modifying an existing website based on a follow-up request. Here's the context:

ORIGINAL PROMPT: "${originalPrompt}"

CURRENT WEBSITE CODE:
${currentCode}

FOLLOW-UP REQUEST: "${followUpRequest}"

Please modify the existing website code to implement the follow-up request. Make sure to:

1. Keep the existing structure and design intact where possible
2. Only modify what's necessary to fulfill the follow-up request
3. Maintain consistency with the existing design language
4. Ensure all existing functionality continues to work
5. Add the requested features/changes seamlessly
6. Keep the code clean and well-structured
7. Maintain responsive design principles
8. Preserve existing animations and interactions unless they conflict with new requirements

IMPORTANT: Return ONLY the complete modified HTML code with embedded CSS and JavaScript. Do not include explanations or markdown formatting - just return the raw HTML code that can be directly rendered in a browser.

The response should be a complete HTML document starting with <!DOCTYPE html> and ending with </html>.`;
    }

    async callGeminiAPI(prompt) {
        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 1000000,
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
    }

    extractCode(text) {
        // Remove markdown code blocks if present
        let code = text.replace(/```html\n?/g, '').replace(/```\n?/g, '');

        // Remove any leading/trailing whitespace and newlines
        code = code.trim();

        // If the response doesn't start with <!DOCTYPE, try to find HTML content
        if (!code.startsWith('<!DOCTYPE')) {
            const htmlMatch = code.match(/<!DOCTYPE[\s\S]*?<\/html>/i);
            if (htmlMatch) {
                code = htmlMatch[0];
            } else {
                // If no DOCTYPE found, look for html tag
                const htmlTagMatch = code.match(/<html[\s\S]*?<\/html>/i);
                if (htmlTagMatch) {
                    code = '<!DOCTYPE html>\n' + htmlTagMatch[0];
                }
            }
        }

        return code.trim();
    }

    displayCode(code) {
        // Update Monaco Editor with clean text
        if (this.monacoEditor) {
            this.monacoEditor.setValue(code);
        }

        // Store the raw code for copying and exporting
        this.rawCode = code;
    }

    async animateCodeWriting(code) {
        return new Promise((resolve) => {
            if (!this.monacoEditor) {
                resolve();
                return;
            }

            // Clear the editor and show starting message
            this.monacoEditor.setValue('');

            // Store the raw code for later use
            this.rawCode = code;

            let currentIndex = 0;
            const chunkSize = 50; // Characters to add at once for smoother animation
            const delay = 50; // Milliseconds between chunks

            const writeChunk = () => {
                if (currentIndex < code.length) {
                    // Add next chunk of characters
                    currentIndex += chunkSize;
                    const currentText = code.slice(0, currentIndex);
                    this.monacoEditor.setValue(currentText);

                    // Auto-scroll to bottom to follow the writing
                    const lineCount = this.monacoEditor.getModel().getLineCount();
                    this.monacoEditor.revealLine(lineCount);

                    // Continue writing
                    setTimeout(writeChunk, delay);
                } else {
                    // Animation complete - show final code
                    this.monacoEditor.setValue(code);
                    resolve();
                }
            };

            // Start the animation after a brief delay
            setTimeout(() => {
                writeChunk();
            }, 500);
        });
    }

    switchTab(tabName) {
        // Remove active class from all tabs and contents
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const selectedContent = document.getElementById(`${tabName}Tab`);

        if (selectedBtn && selectedContent) {
            selectedBtn.classList.add('active');
            selectedContent.classList.add('active');
        }

        // Layout Monaco Editor when switching to code tab
        if (tabName === 'code' && this.monacoEditor) {
            setTimeout(() => {
                this.monacoEditor.layout();
            }, 100);
        }

        // Auto-switch to preview tab after code generation
        if (tabName === 'preview') {
            this.refreshPreview();
        }
    }

    updatePreview(code) {
        try {
            // Method 1: Try using srcdoc first (more reliable)
            if (this.previewFrame.srcdoc !== undefined) {
                this.previewFrame.srcdoc = code;
            } else {
                // Method 2: Fallback to blob URL
                const blob = new Blob([code], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                this.previewFrame.src = url;

                // Clean up the previous URL after a delay
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 2000);
            }
        } catch (error) {
            console.error('Error updating preview:', error);
            // Method 3: Last resort - write directly to iframe document
            try {
                const doc = this.previewFrame.contentDocument || this.previewFrame.contentWindow.document;
                doc.open();
                doc.write(code);
                doc.close();
            } catch (docError) {
                console.error('Error writing to iframe document:', docError);
                this.showToast('Preview update failed', 'error');
            }
        }
    }

    copyCode() {
        let code = this.rawCode;
        
        // Fallback to Monaco Editor content if rawCode is not available
        if (!code && this.monacoEditor) {
            code = this.monacoEditor.getValue();
        }
        
        if (!code || code === '// Your generated website code will appear here...') {
            this.showToast('No code to copy', 'error');
            return;
        }

        navigator.clipboard.writeText(code).then(() => {
            this.showToast('Code copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy code', 'error');
        });
    }

    clearAll() {
        this.promptInput.value = '';
        if (this.monacoEditor) {
            this.monacoEditor.setValue('// Your generated website code will appear here...');
        }
        this.previewFrame.src = 'about:blank';
        this.rawCode = null; // Clear the stored raw code
        this.currentWebsiteCode = null; // Clear follow-up state
        this.originalPrompt = null; // Clear original prompt
        // Switch back to code tab
        this.switchTab('code');
        this.showToast('Cleared all content', 'success');
    }

    exportCode() {
        let code = this.rawCode;
        
        // Fallback to Monaco Editor content if rawCode is not available
        if (!code && this.monacoEditor) {
            code = this.monacoEditor.getValue();
        }
        
        if (!code || code === '// Your generated website code will appear here...') {
            this.showToast('No code to export', 'error');
            return;
        }

        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated-website.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Website exported successfully!', 'success');
    }

    refreshPreview() {
        let code = this.rawCode;
        
        // Fallback to Monaco Editor content if rawCode is not available
        if (!code && this.monacoEditor) {
            code = this.monacoEditor.getValue();
        }
        
        if (code && code !== '// Your generated website code will appear here...') {
            this.updatePreview(code);
            this.showToast('Preview refreshed', 'success');
        }
    }

    toggleFullscreen() {
        const previewContainer = document.querySelector('.preview-container');
        if (!document.fullscreenElement) {
            previewContainer.requestFullscreen().catch(() => {
                this.showToast('Fullscreen not supported', 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle('show', show);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'fa-check-circle' :
            type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle';

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        this.toastContainer.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // History Management Methods
    addToPromptHistory(prompt) {
        const historyItem = {
            id: Date.now(),
            prompt: prompt,
            timestamp: new Date().toISOString()
        };

        this.promptHistory.unshift(historyItem);

        // Keep only last 20 items
        if (this.promptHistory.length > 20) {
            this.promptHistory = this.promptHistory.slice(0, 20);
        }

        localStorage.setItem('promptHistory', JSON.stringify(this.promptHistory));
        this.renderPromptHistory();
    }

    addToCodeHistory(code, prompt) {
        const historyItem = {
            id: Date.now(),
            code: code,
            prompt: prompt,
            timestamp: new Date().toISOString()
        };

        this.codeHistory.unshift(historyItem);

        // Keep only last 10 items (code can be large)
        if (this.codeHistory.length > 10) {
            this.codeHistory = this.codeHistory.slice(0, 10);
        }

        localStorage.setItem('codeHistory', JSON.stringify(this.codeHistory));
        this.renderCodeHistory();
    }

    switchHistoryTab(tabName) {
        // Remove active class from all history tabs and contents
        this.historyTabs.forEach(btn => btn.classList.remove('active'));
        this.historyContents.forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        const selectedBtn = document.querySelector(`[data-history="${tabName}"]`);
        const selectedContent = document.getElementById(`${tabName}History`);

        if (selectedBtn && selectedContent) {
            selectedBtn.classList.add('active');
            selectedContent.classList.add('active');
        }
    }

    renderHistory() {
        this.renderPromptHistory();
        this.renderCodeHistory();
    }

    renderPromptHistory() {
        if (this.promptHistory.length === 0) {
            this.promptHistoryList.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-clock"></i>
                    <p>No prompts yet. Start by describing your website!</p>
                </div>
            `;
            return;
        }

        this.promptHistoryList.innerHTML = this.promptHistory.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-item-time">${this.formatTime(item.timestamp)}</span>
                    <div class="history-item-actions">
                        <button class="history-item-btn" onclick="websiteBuilder.usePrompt('${item.id}')" title="Use this prompt">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="history-item-btn" onclick="websiteBuilder.deletePromptHistory('${item.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="history-item-content">${this.escapeHtml(item.prompt)}</div>
            </div>
        `).join('');
    }

    renderCodeHistory() {
        if (this.codeHistory.length === 0) {
            this.codeHistoryList.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-code"></i>
                    <p>No generated code yet. Create your first website!</p>
                </div>
            `;
            return;
        }

        this.codeHistoryList.innerHTML = this.codeHistory.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-item-time">${this.formatTime(item.timestamp)}</span>
                    <div class="history-item-actions">
                        <button class="history-item-btn" onclick="websiteBuilder.useCode('${item.id}')" title="Load this code">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="history-item-btn" onclick="websiteBuilder.copyHistoryCode('${item.id}')" title="Copy code">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="history-item-btn" onclick="websiteBuilder.deleteCodeHistory('${item.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="history-item-content">${this.escapeHtml(item.prompt)}</div>
                <div class="history-item-preview">${this.escapeHtml(item.code.substring(0, 200))}${item.code.length > 200 ? '...' : ''}</div>
            </div>
        `).join('');
    }

    usePrompt(id) {
        const item = this.promptHistory.find(h => h.id == id);
        if (item) {
            this.promptInput.value = item.prompt;
            this.showToast('Prompt loaded from history', 'success');
        }
    }

    useCode(id) {
        const item = this.codeHistory.find(h => h.id == id);
        if (item) {
            this.displayCode(item.code);
            this.updatePreview(item.code);
            this.promptInput.value = ''; // Clear prompt input for follow-up

            // Set up follow-up context
            this.currentWebsiteCode = item.code;
            this.originalPrompt = item.prompt;

            this.switchTab('preview');
            this.showToast('Code loaded from history - ready for follow-up modifications!', 'success');
        }
    }

    copyHistoryCode(id) {
        const item = this.codeHistory.find(h => h.id == id);
        if (item) {
            navigator.clipboard.writeText(item.code).then(() => {
                this.showToast('Code copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Failed to copy code', 'error');
            });
        }
    }

    deletePromptHistory(id) {
        this.promptHistory = this.promptHistory.filter(h => h.id != id);
        localStorage.setItem('promptHistory', JSON.stringify(this.promptHistory));
        this.renderPromptHistory();
        this.showToast('Prompt deleted from history', 'success');
    }

    deleteCodeHistory(id) {
        this.codeHistory = this.codeHistory.filter(h => h.id != id);
        localStorage.setItem('codeHistory', JSON.stringify(this.codeHistory));
        this.renderCodeHistory();
        this.showToast('Code deleted from history', 'success');
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
let websiteBuilder;
document.addEventListener('DOMContentLoaded', () => {
    websiteBuilder = new WebsiteBuilder();
});

// Add some example prompts for better UX
const examplePrompts = [
    "Create a modern portfolio website for a web developer with a hero section, about section, projects gallery, and contact form. Use a dark theme with blue accents.",
    "Build a landing page for a SaaS product with pricing tables, feature highlights, testimonials, and a call-to-action. Use a clean, professional design.",
    "Design a restaurant website with a menu section, photo gallery, reservation form, and location map. Use warm colors and appetizing imagery.",
    "Create a blog website with article cards, sidebar, author bio, and newsletter signup. Use a minimalist design with good typography.",
    "Build an e-commerce product page with image gallery, product details, reviews section, and add to cart functionality. Use modern UI patterns."
];

// Add placeholder rotation
let currentPlaceholder = 0;
setInterval(() => {
    const promptInput = document.getElementById('promptInput');
    if (promptInput && !promptInput.value) {
        promptInput.placeholder = examplePrompts[currentPlaceholder];
        currentPlaceholder = (currentPlaceholder + 1) % examplePrompts.length;
    }
}, 5000);