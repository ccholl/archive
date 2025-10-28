// Personal Archive - Dynamic Menu System

import { CONFIG } from './config.js';

export class ArchiveMenu {
    constructor(config = {}) {
        // 配置系统：控制功能模块开关
        this.config = {
            enableImageLightbox: true,
            ...config  // 允许外部覆盖默认配置
        };

        // 字体配置将从 JSON 文件加载
        this.fontConfig = null;

        this.menuData = null;

        // ============ 缓存 DOM 引用（性能优化）============
        // 避免重复查询 DOM，每次查询约 0.5ms
        this.menuContainer = document.getElementById('menu-grid');
        this.menuContainerParent = document.querySelector(CONFIG.selectors.menuContainer);
        this.contentContainer = document.querySelector(CONFIG.selectors.contentContainer);
        this.contentBody = document.querySelector(CONFIG.selectors.contentBody);
        this.secretInput = document.getElementById('secret-input');

        this.init();
    }

    async init() {
        try {
            await this.loadMenuData();
            await this.loadFontConfig(); // 加载字体配置
            this.applyFont(); // 应用字体
            this.renderMenu();
            this.bindEvents();
            this.initHashRouter();
            this.initPushBoxMode();
            this.loadNotes(); // 加载笔记

            // 可选模块：根据配置加载
            if (this.config.enableImageLightbox) {
                this.bindImageLightbox();
            }

            console.log('Personal Archive initialized');
        } catch (error) {
            console.error('Failed to initialize archive:', error);
            this.renderErrorMessage();
        }
    }

    async loadMenuData() {
        const response = await fetch('data/menu-data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.menuData = await response.json();
    }

    renderMenu() {
        this.menuContainer.innerHTML = '';

        this.menuData.columns.forEach(column => {
            const columnDiv = document.createElement('div');
            columnDiv.className = 'menu-column';

            // Add title
            const title = document.createElement('span');
            title.textContent = column.title;
            title.className = 'menu-title';
            columnDiv.appendChild(title);
            columnDiv.appendChild(document.createElement('br'));

            // Add items
            column.items.forEach(item => {
                // Define which types should have icons
                const iconTypes = ['audio', 'video', 'folder', 'done', 'code', 'math', 'book', 'doc'];

                if (item.type === 'image') {
                    // Create thumbnail container for images
                    const thumbnailContainer = document.createElement('div');
                    thumbnailContainer.className = 'menu-item-with-thumbnail';
                    thumbnailContainer.dataset.category = column.title;
                    thumbnailContainer.dataset.categoryId = column.id;
                    thumbnailContainer.dataset.item = item.name;
                    thumbnailContainer.dataset.type = item.type;
                    thumbnailContainer.dataset.src = item.src;
                    if (item.thumbnail) thumbnailContainer.dataset.thumbnail = item.thumbnail;

                    // Create thumbnail image
                    const thumbnailImg = document.createElement('img');
                    thumbnailImg.className = 'menu-thumbnail';
                    thumbnailImg.src = item.thumbnail || item.src;
                    thumbnailImg.alt = item.name;
                    thumbnailImg.title = item.name;

                    // Create label
                    const label = document.createElement('span');
                    label.className = 'thumbnail-label';
                    label.textContent = item.name;

                    thumbnailContainer.appendChild(thumbnailImg);
                    thumbnailContainer.appendChild(label);
                    columnDiv.appendChild(thumbnailContainer);
                } else if (iconTypes.includes(item.type)) {
                    // Create icon container for all icon types
                    const iconContainer = document.createElement('div');
                    iconContainer.className = 'menu-item-with-icon';
                    iconContainer.dataset.category = column.title;
                    iconContainer.dataset.categoryId = column.id;
                    iconContainer.dataset.item = item.name;
                    iconContainer.dataset.type = item.type;
                    if (item.src) iconContainer.dataset.src = item.src;

                    // Create SVG icon element
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('class', `menu-icon ${item.type}`);
                    svg.setAttribute('width', '24');
                    svg.setAttribute('height', '24');
                    svg.setAttribute('title', item.name);

                    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#icon-menu-${item.type}`);

                    svg.appendChild(use);

                    // Create label
                    const label = document.createElement('span');
                    label.className = 'icon-label';
                    label.textContent = item.name;

                    iconContainer.appendChild(svg);
                    iconContainer.appendChild(label);
                    columnDiv.appendChild(iconContainer);
                } else {
                    // Create text item for other types (text, etc.)
                    const itemSpan = document.createElement('span');
                    itemSpan.textContent = item.name;
                    itemSpan.className = 'menu-item';
                    itemSpan.dataset.category = column.title;
                    itemSpan.dataset.categoryId = column.id;
                    itemSpan.dataset.item = item.name;
                    itemSpan.dataset.type = item.type;

                    // Store additional data for media items
                    if (item.src) itemSpan.dataset.src = item.src;
                    if (item.thumbnail) itemSpan.dataset.thumbnail = item.thumbnail;

                    columnDiv.appendChild(itemSpan);
                    columnDiv.appendChild(document.createElement('br'));
                }
            });

            this.menuContainer.appendChild(columnDiv);
        });
    }

    renderErrorMessage() {
        this.menuContainer.innerHTML = '<div class="error">Failed to load menu data</div>';
    }

    // Method to add new items programmatically
    addMenuItem(category, newItem) {
        const column = this.menuData.columns.find(col => col.title === category);
        if (column) {
            // Support both string and object format
            const item = typeof newItem === 'string'
                ? { name: newItem, type: 'text' }
                : newItem;
            column.items.push(item);
            this.renderMenu();
        }
    }

    // Method to add media items
    addMediaItem(category, name, type, src, thumbnail = null) {
        const item = { name, type, src };
        if (thumbnail) item.thumbnail = thumbnail;
        this.addMenuItem(category, item);
    }

    // Bind click events using event delegation
    // 只处理文本项点击，媒体项由独立模块处理
    bindEvents() {
        this.menuContainer.addEventListener('click', (event) => {
            // 只捕获纯文本项 (.menu-item)，排除媒体项
            const menuItem = event.target.closest(CONFIG.selectors.textItem);

            // 确保不是图标或缩略图容器
            if (menuItem &&
                !menuItem.classList.contains('menu-item-with-icon') &&
                !menuItem.classList.contains('menu-item-with-thumbnail')) {

                // Extract item data
                const itemData = {
                    category: menuItem.dataset.category,
                    categoryId: menuItem.dataset.categoryId,
                    item: menuItem.dataset.item,
                    type: menuItem.dataset.type,
                    src: menuItem.dataset.src || null,
                    thumbnail: menuItem.dataset.thumbnail || null
                };

                // Handle the click
                this.handleItemClick(itemData);
            }
        });
    }

    // === 图片模块 ===
    bindImageLightbox() {
        this.menuContainer.addEventListener('click', (event) => {
            const thumbnailImg = event.target;
            if (thumbnailImg.classList && thumbnailImg.classList.contains('menu-thumbnail')) {
                event.preventDefault();
                event.stopPropagation();

                const container = thumbnailImg.closest(CONFIG.selectors.thumbnailItem);
                const originalSrc = container.dataset.src;

                this.showImageLightbox(originalSrc);
            }
        });
    }

    showImageLightbox(imageSrc) {
        // 创建原图
        const fullImage = document.createElement('img');
        fullImage.src = imageSrc;
        fullImage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 90vw;
            max-height: 90vh;
            object-fit: contain;
            z-index: 10000;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.2s ease;
        `;

        document.body.appendChild(fullImage);

        // 点击关闭
        fullImage.addEventListener('click', () => {
            fullImage.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => fullImage.remove(), 200);
        });

        // ESC键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                fullImage.click();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // Handle individual item clicks
    async handleItemClick(itemData) {
        console.log('Clicked item:', itemData);
        // MenuItemAnimation 会自动处理 Markdown 内容加载
        // 不需要额外逻辑，动画系统会检测并加载 .md 文件
    }

    // Show content layer - 刷新页面时恢复状态（无动画）
    showContent(itemData) {
        console.log('[ArchiveMenu] 刷新页面，恢复状态（无动画）', itemData);

        if (!window.menuItemAnimation) {
            console.error('[ArchiveMenu] MenuItemAnimation not initialized');
            return;
        }

        // 调用统一状态渲染方法（刷新模式，无动画）
        window.menuItemAnimation.renderContentState(itemData, { animated: false });
    }

    // Show menu layer
    showMenu() {
        this.menuContainerParent.style.display = 'block';
        this.contentContainer.style.display = 'none';

        // 恢复动画：menu 向右移动回原位（带动画效果）
        if (window.menuItemAnimation) {
            const menuContainer = document.querySelector(CONFIG.selectors.menuContainer);
            const background = document.querySelector(CONFIG.selectors.background);
            const textContainer = document.querySelector(CONFIG.selectors.textContainer);

            // 使用 requestAnimationFrame 确保浏览器已经渲染了当前状态
            // 然后再移除类触发动画
            requestAnimationFrame(() => {
                // 移除 slide-left 类，触发 CSS transition 返回动画
                if (menuContainer) {
                    menuContainer.classList.remove(CONFIG.animationClasses.menuSlideLeft);

                    // 动画结束后清理
                    setTimeout(() => {
                        menuContainer.classList.remove(CONFIG.animationClasses.menuAnimating);
                        menuContainer.style.transform = '';
                    }, CONFIG.timing.cleanup || 800);
                }

                if (background) {
                    background.classList.remove(CONFIG.animationClasses.backgroundMoveLeft);

                    setTimeout(() => {
                        background.classList.remove(CONFIG.animationClasses.backgroundAnimating);
                        background.style.transform = '';
                    }, CONFIG.timing.cleanup || 800);
                }

                if (textContainer) {
                    textContainer.classList.remove(CONFIG.animationClasses.textMoveLeft);

                    setTimeout(() => {
                        textContainer.classList.remove(CONFIG.animationClasses.textAnimating);
                        textContainer.style.transform = '';
                    }, CONFIG.timing.cleanup || 800);
                }

                // 恢复所有隐藏的 label
                const allLabels = document.querySelectorAll('.menu-item-label');
                allLabels.forEach(label => {
                    label.style.visibility = '';
                });
            });
        }
    }

    // === HASH ROUTER METHODS ===

    // Initialize hash router
    initHashRouter() {
        // Listen for hash changes (browser back/forward)
        window.addEventListener('hashchange', () => {
            this.restoreStateFromURL();
        });

        // Handle initial page load
        window.addEventListener('load', () => {
            this.restoreStateFromURL();
        });

        // Handle current state on initialization
        this.restoreStateFromURL();
    }

    // Convert item name to URL-safe format
    encodeItemName(name) {
        return name.toLowerCase()
                   .replace(/\s+/g, '-')           // spaces to hyphens
                   .replace(/[^\w\-]/g, '');       // remove special chars
    }

    // Convert URL format back to item name
    decodeItemName(slug) {
        return slug.replace(/-/g, ' ');
    }

    // Build URL from item data
    buildURL(categoryId, itemName) {
        const itemSlug = this.encodeItemName(itemName);
        return `#/${categoryId}/${itemSlug}`;
    }

    // Parse URL to find item data
    parseURLToItemData(hash) {
        try {
            // Remove # and split path: "#/media/image111" → ["", "media", "image111"]
            const path = hash.slice(1);
            const segments = path.split('/');

            if (segments.length !== 3) return null;

            const categoryId = segments[1];
            const itemSlug = segments[2];
            const itemName = this.decodeItemName(itemSlug);

            // Find the item in loaded data
            for (const column of this.menuData.columns) {
                if (column.id === categoryId) {
                    for (const item of column.items) {
                        // 比较编码后的名字，因为 encodeItemName 是有损的（会移除特殊字符）
                        if (this.encodeItemName(item.name) === itemSlug) {
                            return {
                                category: column.title,
                                categoryId: column.id,
                                item: item.name,
                                type: item.type,
                                src: item.src || null,
                                thumbnail: item.thumbnail || null
                            };
                        }
                    }
                }
            }

            return null; // Item not found
        } catch (error) {
            console.error('Error parsing URL:', error);
            return null;
        }
    }

    // Restore application state from current URL
    restoreStateFromURL() {
        // 检查是否应该跳过这次 hash 变化（由 MenuItemAnimation 触发）
        if (window.__skipNextHashChange) {
            window.__skipNextHashChange = false;
            console.log('[ArchiveMenu] 跳过 hashchange 处理（由 MenuItemAnimation 控制）');
            return;
        }

        const hash = window.location.hash;

        // Empty hash means show menu
        if (!hash || hash === '#' || hash === '#/') {
            this.showMenu();
            return;
        }

        // Try to parse and show content
        const itemData = this.parseURLToItemData(hash);
        if (itemData) {
            // Use existing show content logic
            this.menuContainerParent.style.display = 'none';
            this.showContent(itemData);
        } else {
            // Invalid URL, redirect to menu
            console.warn('Invalid URL, redirecting to menu:', hash);
            window.location.hash = '#/';
            this.showMenu();
        }
    }

    // Update URL when item is clicked (replaces direct showContent call)
    navigateToItem(itemData) {
        const url = this.buildURL(itemData.categoryId, itemData.item);
        window.location.hash = url;
        // hashchange event will trigger restoreStateFromURL()
    }

    // === CONTENT LOADING SYSTEM ===
    // (已移除 iframe 相关方法，内容加载现由 MenuItemAnimation 负责)

    // === SECRET INPUT INTEGRATION ===
    initPushBoxMode() {
        // 初始化秘密输入框监听（使用缓存的引用）
        if (this.secretInput) {
            this.secretInput.addEventListener('input', (e) => {
                const value = e.target.value.toLowerCase().trim();

                // 触发探索模式
                if (value === 'who are you?' || value === 'who are you') {
                    if (window.SimplePushBox) {
                        window.SimplePushBox.toggle();
                        e.target.value = '';
                        e.target.blur();
                    }
                }

                // 触发图标游戏模式
                if (value === 'game') {
                    if (window.IconGame) {
                        window.IconGame.toggle();
                        e.target.value = '';
                        e.target.blur();
                    }
                }
            });

            // 回车键也可以触发
            this.secretInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const value = e.target.value.toLowerCase().trim();

                    // 触发探索模式
                    if (value === 'who are you?' || value === 'who are you') {
                        if (window.SimplePushBox) {
                            window.SimplePushBox.toggle();
                            e.target.value = '';
                            e.target.blur();
                        }
                    }

                    // 触发图标游戏模式
                    if (value === 'game') {
                        if (window.IconGame) {
                            window.IconGame.toggle();
                            e.target.value = '';
                            e.target.blur();
                        }
                    }
                }
            });
        }
    }

    // === 字体配置功能（从 JSON 加载）===
    async loadFontConfig() {
        try {
            const response = await fetch('data/font-config.json');
            if (!response.ok) {
                throw new Error('Failed to load font config');
            }
            this.fontConfig = await response.json();
        } catch (error) {
            console.error('Error loading font config:', error);
            // 默认配置
            this.fontConfig = {
                selectedFont: 'courier',
                availableFonts: [
                    { id: 'courier', label: 'Courier', cssValue: "'Courier New', monospace" }
                ]
            };
        }
    }

    applyFont() {
        if (!this.fontConfig) return;

        const selectedFont = this.fontConfig.availableFonts.find(
            f => f.id === this.fontConfig.selectedFont
        );

        if (!selectedFont) {
            console.warn(`Font not found: ${this.fontConfig.selectedFont}`);
            return;
        }

        // 设置 CSS 变量
        document.documentElement.style.setProperty('--font-primary', selectedFont.cssValue);

        console.log(`Applied font: ${selectedFont.label}`);
    }

    // === NOTES LOADING FUNCTIONALITY ===

    // 加载并显示笔记
    async loadNotes() {
        try {
            // 加载配置文件
            const configResponse = await fetch('data/notes-config.json');
            if (!configResponse.ok) {
                throw new Error('Failed to load notes config');
            }
            const config = await configResponse.json();
            const displayDates = config.displayDates || [];

            // 加载 notes.md
            const notesResponse = await fetch('data/notes.md');
            if (!notesResponse.ok) {
                throw new Error('Failed to load notes');
            }
            const markdown = await notesResponse.text();

            // 根据配置提取指定日期的内容
            const entries = this.parseEntriesByDates(markdown, displayDates);

            // 显示在 textcontainer 中
            const notesContent = document.getElementById('notes-content');
            if (notesContent && entries) {
                notesContent.innerHTML = this.markdownToHTML(entries);
            }
        } catch (error) {
            console.error('Failed to load notes:', error);
        }
    }

    // 根据配置的日期提取条目
    parseEntriesByDates(markdown, dates) {
        const lines = markdown.split('\n');
        let result = [];
        let currentEntry = [];
        let currentDate = null;
        let isCollecting = false;

        for (let line of lines) {
            if (line.startsWith('## ')) {
                // 如果之前在收集，保存当前条目
                if (isCollecting && currentEntry.length > 0) {
                    result.push(...currentEntry);
                }

                // 提取新的日期
                currentDate = line.substring(3).trim();
                isCollecting = dates.includes(currentDate);
                currentEntry = isCollecting ? [line] : [];
            } else if (isCollecting) {
                currentEntry.push(line);
            }
        }

        // 保存最后一个条目
        if (isCollecting && currentEntry.length > 0) {
            result.push(...currentEntry);
        }

        return result.join('\n');
    }

    // 简单的markdown转HTML
    markdownToHTML(markdown) {
        let html = '';
        const lines = markdown.split('\n');
        let inParagraph = false;

        for (let line of lines) {
            line = line.trim();

            if (line.startsWith('## ')) {
                if (inParagraph) {
                    html += '</p>';
                    inParagraph = false;
                }
                html += `<h2>${line.substring(3)}</h2>`;
            } else if (line === '') {
                if (inParagraph) {
                    html += '</p>';
                    inParagraph = false;
                }
            } else {
                if (!inParagraph) {
                    html += '<p>';
                    inParagraph = true;
                } else {
                    html += '<br>';
                }
                html += line;
            }
        }

        if (inParagraph) {
            html += '</p>';
        }

        return html;
    }
}
