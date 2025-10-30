// Menu Item Expand Animation

import { CONFIG, getDataAttribute } from './config.js';

export class MenuItemAnimation {
    constructor(config = {}) {
        // ============ 缓存 DOM 引用（性能优化）============
        // 这些容器在整个生命周期不会变，缓存避免重复查询
        this.menuContainer = null;
        this.background = null;
        this.textContainer = null;
        this.animatedContainer = null;
        this.contentContainer = null;  // 直接缓存 content-container

        // 合并默认配置和用户配置
        this.config = {
            // 是否启用调试日志
            debug: false,

            // 是否启用动画（false 时直接跳转，不播放动画）
            enabled: true,

            // 是否阻止事件冒泡（可能影响其他模块）
            stopPropagation: true,

            // 是否全屏展开
            fullscreen: true,

            // 布局方向配置
            direction: {
                // 菜单滑动方向：'left' | 'right' | 'top' | 'bottom'
                containerSlide: 'left',
                // 背景移动方向
                backgroundMove: 'left',
                // 文本移动方向
                textMove: 'left'
            },

            // 回调函数：清晰的 API 接口
            callbacks: {
                // 动画展开完成时调用，传入 itemData
                onExpandComplete: null,
                // 动画收缩完成时调用
                onCollapseComplete: null,
                // 点击事件触发时调用（在动画开始前），返回 false 可阻止动画
                onItemClick: null
            },

            // 钩子函数：允许外部自定义容器行为
            hooks: {
                // 展开前触发
                onBeforeExpand: null,
                // 展开后触发
                onAfterExpand: null,
                // 收缩前触发
                onBeforeCollapse: null,
                // 收缩后触发
                onAfterCollapse: null,
                // 容器向左移动（可自定义实现）
                onContainersLeft: null,
                // 容器向右移动（可自定义实现）
                onContainersRight: null
            },

            // 允许用户覆盖契约中的配置
            ...config
        };

        this.activeItem = null;
        this.activeLabel = null;
        this.animatedElement = null;
        this.clickHandler = null;  // 保存事件处理器引用，用于清理
        this.currentItemData = null; // 保存当前 item 的数据

        // 保存原始 transform，用于恢复
        this.savedTransforms = {
            menu: '',
            background: '',
            text: ''
        };

        // 只有启用时才初始化
        if (this.config.enabled) {
            this.init();
        }
    }

    init() {
        // 初始化 DOM 缓存
        this.initDOMCache();

        // 创建动画容器
        const container = document.createElement('div');
        container.className = 'menu-item-animated-container';
        document.body.appendChild(container);
        this.animatedContainer = container; // 缓存引用
        this.log('✅ 动画容器已创建:', container);

        // ⭐ 缓存 content-container
        this.contentContainer = document.querySelector('.content-container');
        this.log('✅ content-container 已缓存');

        // 绑定点击事件
        this.bindEvents();
        this.log('✅ 事件监听器已绑定');
    }

    // 初始化 DOM 缓存（只执行一次）
    initDOMCache() {
        this.menuContainer = document.querySelector(CONFIG.selectors.menuContainer);
        this.background = document.querySelector(CONFIG.selectors.background);
        this.textContainer = document.querySelector(CONFIG.selectors.textContainer);

        this.log('DOM 缓存已初始化');
    }

    bindEvents() {
        // 保存事件处理器引用，用于后续清理
        this.clickHandler = (e) => {
            // 尝试匹配不同类型的容器
            const iconContainer = e.target.closest(CONFIG.selectors.iconItem);
            const thumbnailContainer = e.target.closest(CONFIG.selectors.thumbnailItem);
            const textItem = e.target.closest(CONFIG.selectors.textItem);

            let targetContainer = null;
            let targetLabel = null;

            if (iconContainer) {
                // 点击了有图标的项（code, video, folder 等类型）
                targetContainer = iconContainer;
                targetLabel = iconContainer.querySelector(CONFIG.selectors.iconLabel);
                this.log('检测到图标项点击:', targetLabel?.textContent);
            } else if (thumbnailContainer) {
                // 点击了有缩略图的项（image 类型）
                targetContainer = thumbnailContainer;
                targetLabel = thumbnailContainer.querySelector(CONFIG.selectors.thumbnailLabel);
                this.log('检测到缩略图项点击:', targetLabel?.textContent);
            } else if (textItem &&
                       !textItem.classList.contains('menu-item-with-icon') &&
                       !textItem.classList.contains('menu-item-with-thumbnail')) {
                // 点击了纯文本项（text 类型）
                targetContainer = textItem;
                targetLabel = textItem;  // 自己就是文字
                this.log('检测到文本项点击:', targetLabel?.textContent);
            }

            // 如果找到了有效的目标
            if (targetContainer && targetLabel) {
                e.preventDefault();

                // 提取 item 数据
                const itemData = {
                    category: targetContainer.dataset.category,
                    categoryId: targetContainer.dataset.categoryId,
                    item: targetContainer.dataset.item,
                    type: targetContainer.dataset.type,
                    src: targetContainer.dataset.src || null,
                    thumbnail: targetContainer.dataset.thumbnail || null
                };

                // 调用 onItemClick 回调，允许外部决定是否继续
                let shouldContinue = true;
                if (this.config.callbacks.onItemClick) {
                    shouldContinue = this.config.callbacks.onItemClick(itemData, targetContainer, targetLabel);
                }

                // 如果回调返回 false，不执行动画
                if (shouldContinue === false) {
                    return;
                }

                // 根据配置决定是否阻止事件冒泡
                if (this.config.stopPropagation) {
                    e.stopPropagation();
                }

                this.expandItem(targetContainer, targetLabel, itemData);
            }

            // 点击返回按钮
            if (e.target.closest(CONFIG.selectors.menuItemAnimatedBack)) {
                e.preventDefault();
                if (this.config.stopPropagation) {
                    e.stopPropagation();
                }
                this.collapseItem();
            }
        };

        // 使用捕获阶段监听，在 ArchiveMenu 之前拦截事件
        document.addEventListener('click', this.clickHandler);

        // ESC 键退出
        this.keydownHandler = (e) => {
            if (e.key === 'Escape' && this.activeItem) {
                this.collapseItem();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
    }

    expandItem(container, labelElement, itemData) {
        this.log('展开动画开始', labelElement.textContent);

        // 触发展开前钩子
        if (this.config.hooks.onBeforeExpand) {
            this.config.hooks.onBeforeExpand(container, labelElement);
        }

        // 如果已有激活项，先清理
        if (this.activeItem) {
            this.cleanupImmediate();
        }

        this.activeItem = container;      // 记住容器
        this.activeLabel = labelElement;  // 记住文字元素
        this.currentItemData = itemData;  // 保存当前 item 数据

        // 更新 URL
        this.updateURL(itemData);

        // 获取文字的原始位置（在容器移动之前）
        const rect = labelElement.getBoundingClientRect();

        // 立即隐藏文字（不是整个容器）
        labelElement.style.visibility = 'hidden';

        // 创建动画元素
        this.animatedElement = document.createElement('div');
        this.animatedElement.className = 'menu-item-animated';

        // 内容结构：只包含 inner 容器（Back按钮独立处理）
        const innerContent = `
            <div class="menu-item-animated-inner">
                <div class="menu-item-animated-title">${labelElement.textContent}</div>
            </div>
        `;

        // 起始状态：只显示纯文字（模拟原始元素）
        this.animatedElement.textContent = labelElement.textContent;

        // 保存完整HTML结构，稍后展开时使用（不包含Back按钮）
        this.fullHTML = innerContent;

        // 初始位置（与原始元素重合）
        // 注意：position: fixed 相对于视口定位，直接使用 rect 的值
        this.animatedElement.style.position = 'fixed';
        this.animatedElement.style.left = rect.left + 'px';
        this.animatedElement.style.top = rect.top + 'px';  // 修复：不需要减 scrollTop
        this.animatedElement.style.width = rect.width + 'px';
        this.animatedElement.style.height = rect.height + 'px';
        this.animatedElement.style.zIndex = CONFIG.zIndex.menuAnimation;

        // 添加到页面
        const animContainer = this.animatedContainer; // 使用缓存
        this.log('动画容器:', animContainer);

        if (!animContainer) {
            console.error('❌ 找不到动画容器！');
            return;
        }

        animContainer.appendChild(this.animatedElement);
        this.log(' 动画元素已添加到容器');

        // 阶段 1: 起始状态（小）
        this.animatedElement.classList.add(CONFIG.animationClasses.animatedStart);
        this.log(' 已添加起始状态类');

        // 阶段 2: 触发菜单、背景、文本容器的动画
        // 如果提供了自定义钩子，使用钩子；否则使用默认行为
        if (this.config.hooks.onContainersLeft) {
            this.config.hooks.onContainersLeft();
        } else {
            this.moveContainersLeft();
        }

        // ========== 新动画流程 ==========

        // 阶段 2: 100ms 后，替换为完整 HTML 并移到右上角
        setTimeout(() => {
            this.log('阶段2: 移到右上角');

            // 替换为完整 HTML 结构
            this.animatedElement.innerHTML = this.fullHTML;

            // 移除起始类
            this.animatedElement.classList.remove(CONFIG.animationClasses.animatedStart);

            // 添加移动到右上角的类
            this.animatedElement.classList.add('menu-item-animated-moving-right');

            // 设置目标位置：右上角
            this.animatedElement.style.left = 'calc(100vw - 220px)';
            this.animatedElement.style.top = '0';
            this.animatedElement.style.width = '200px';
            this.animatedElement.style.height = 'auto';
        }, 100);

        // 阶段 3: 600ms 后，向下延伸填满右侧
        setTimeout(() => {
            this.log('阶段3: 向下延伸');

            this.animatedElement.classList.add('menu-item-animated-extending');

            // 延伸到全高
            this.animatedElement.style.height = '100vh';
            this.animatedElement.style.minHeight = '100vh';
        }, 600);

        // 阶段 4: 1100ms 后，文字旋转 + 背景变白 + 创建Back按钮
        setTimeout(() => {
            this.log('阶段4: 文字旋转 + 背景变白');

            this.animatedElement.classList.add('menu-item-animated-rotating');

            // 使用提取的方法创建 Back 按钮
            this.createBackButton();
        }, 1100);

        // 阶段 5: 1600ms 后，加载内容
        setTimeout(() => {
            this.log('阶段5: 加载内容');

            this.animatedElement.classList.add(CONFIG.animationClasses.animatedExpanded);
            this.showContent(itemData);

            // 触发展开后钩子
            if (this.config.hooks.onAfterExpand) {
                this.config.hooks.onAfterExpand(this.animatedElement);
            }
        }, 1600);
    }

    onExpandEnd() {
        this.log('展开动画结束');
        if (this.animatedElement) {
            this.animatedElement.classList.remove(CONFIG.animationClasses.animatedExpanding);
            this.animatedElement.classList.add(CONFIG.animationClasses.animatedExpanded);
        }

        // 调用展开完成回调，传递 itemData
        if (this.config.callbacks.onExpandComplete && this.currentItemData) {
            this.log('触发 onExpandComplete 回调');
            this.config.callbacks.onExpandComplete(this.currentItemData);
        }
    }

    collapseItem() {
        // 刷新后 activeLabel 可能为 null，只检查必需项
        if (!this.activeItem || !this.animatedElement) {
            this.log('⚠️ collapseItem: 缺少必需元素', {
                activeItem: !!this.activeItem,
                animatedElement: !!this.animatedElement,
                activeLabel: !!this.activeLabel
            });
            return;
        }

        this.log('返回动画开始 - deselectItemStart');

        // 触发收缩前钩子
        if (this.config.hooks.onBeforeCollapse) {
            this.config.hooks.onBeforeCollapse(this.animatedElement);
        }

        // 隐藏内容容器
        this.hideContent();

        // 阶段1：准备返回（对应源码 deselectItemStart）
        // 重置所有类（对应源码的 reset）
        this.animatedElement.className = 'menu-item-animated';

        // 添加 deselect-start 状态
        this.animatedElement.classList.add('item-animated-deselect-start', 'item-animated-active');

        // 立即触发容器准备（但还不移动）
        // 这里暂时不做任何操作，等待 deselectItemMiddle

        // 使用双重 requestAnimationFrame 确保状态更新（对应源码）
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                this.collapseItemMiddle();
            });
        });
    }

    collapseItemMiddle() {
        this.log('返回动画开始 - 简化版本：直接显示');

        // 移除 Back 按钮
        if (this.backButton) {
            this.backButton.remove();
            this.backButton = null;
        }

        // 移除动画元素
        if (this.animatedElement) {
            this.animatedElement.remove();
            this.animatedElement = null;
        }

        // 恢复原始文字可见性
        if (this.activeLabel) {
            this.activeLabel.style.visibility = '';
        }

        // 重置 URL 为首页（让 ArchiveMenu 处理菜单显示和容器动画）
        window.location.hash = '#/';
        console.log('[DEBUG] URL 已重置为: #/');

        // 清理状态
        this.activeItem = null;
        this.activeLabel = null;
        this.currentItemData = null;

        // 触发回调
        if (this.config.hooks.onAfterCollapse) {
            this.config.hooks.onAfterCollapse();
        }

        if (this.config.callbacks.onCollapseComplete) {
            this.log('触发 onCollapseComplete 回调');
            this.config.callbacks.onCollapseComplete();
        }
    }

    cleanup() {
        this.log('清理动画元素');

        // 恢复文字可见性（不是容器）
        if (this.activeLabel) {
            this.activeLabel.style.visibility = '';
        }

        // 移除动画元素
        if (this.animatedElement) {
            this.animatedElement.remove();
        }

        // 移除 Back 按钮
        if (this.backButton) {
            this.backButton.remove();
            this.backButton = null;
        }

        this.activeItem = null;
        this.activeLabel = null;
        this.animatedElement = null;
    }

    cleanupImmediate() {
        if (this.activeLabel) {
            this.activeLabel.style.visibility = '';
        }
        if (this.animatedElement) {
            this.animatedElement.remove();
        }
        if (this.backButton) {
            this.backButton.remove();
            this.backButton = null;
        }
        this.activeItem = null;
        this.activeLabel = null;
        this.animatedElement = null;
        this.currentItemData = null;
    }

    // 公共 API：获取当前动画的标题文本（用于内容层显示）
    getCurrentTitle() {
        return this.activeLabel ? this.activeLabel.textContent : null;
    }

    // 公共 API：获取当前 item 数据
    getCurrentItemData() {
        return this.currentItemData;
    }

    // 公共 API：检查是否有活动的动画
    isAnimating() {
        return this.activeItem !== null;
    }

    // 移动容器到左侧（展开时）- 使用 Transform 保护机制
    moveContainersLeft() {
        // 使用缓存的 DOM 引用
        const menuContainer = this.menuContainer;
        const background = this.background;
        const textContainer = this.textContainer;

        this.log('🔍 检查元素是否找到：');
        this.log('  - menuContainer:', menuContainer);
        this.log('  - background:', background);
        this.log('  - textContainer:', textContainer);

        // 菜单容器向左滑出
        if (menuContainer) {
            this.log('✅ 添加菜单动画类');

            // 保存原始 transform
            const originalTransform = getComputedStyle(menuContainer).transform;
            this.savedTransforms.menu = originalTransform !== 'none' ? originalTransform : '';

            menuContainer.classList.add(CONFIG.animationClasses.menuAnimating);

            // 延迟添加，确保 transition 生效
            setTimeout(() => {
                menuContainer.classList.add(CONFIG.animationClasses.menuSlideLeft);
                this.log('✅ 菜单应该开始滑动了');
                this.log('   当前 transform:', window.getComputedStyle(menuContainer).transform);
            }, CONFIG.timing.transitionDelay);
        } else {
            this.log('❌ 找不到菜单容器');
        }

        // 背景向左移动
        if (background) {
            // 保存原始 transform
            const originalTransform = getComputedStyle(background).transform;
            this.savedTransforms.background = originalTransform !== 'none' ? originalTransform : '';

            background.classList.add(CONFIG.animationClasses.backgroundAnimating);
            setTimeout(() => {
                background.classList.add(CONFIG.animationClasses.backgroundMoveLeft);
            }, CONFIG.timing.transitionDelay);
        }

        // 文本容器向左移动并淡化
        if (textContainer) {
            // 保存原始 transform
            const originalTransform = getComputedStyle(textContainer).transform;
            this.savedTransforms.text = originalTransform !== 'none' ? originalTransform : '';

            textContainer.classList.add(CONFIG.animationClasses.textAnimating);
            setTimeout(() => {
                textContainer.classList.add(CONFIG.animationClasses.textMoveLeft);
            }, CONFIG.timing.transitionDelay);
        }

        this.log('容器开始向左移动');
    }

    // 设置容器到左侧（无动画，用于刷新时）
    setContainersLeft() {
        const menuContainer = this.menuContainer;
        const background = this.background;
        const textContainer = this.textContainer;

        this.log('设置容器到左侧（无动画）');

        if (menuContainer) {
            menuContainer.style.transition = 'none';
            menuContainer.classList.add(CONFIG.animationClasses.menuAnimating);
            menuContainer.classList.add(CONFIG.animationClasses.menuSlideLeft);
            // 强制重绘后恢复 transition
            void menuContainer.offsetHeight;
            menuContainer.style.transition = '';
        }

        if (background) {
            background.style.transition = 'none';
            background.classList.add(CONFIG.animationClasses.backgroundAnimating);
            background.classList.add(CONFIG.animationClasses.backgroundMoveLeft);
            void background.offsetHeight;
            background.style.transition = '';
        }

        if (textContainer) {
            textContainer.style.transition = 'none';
            textContainer.classList.add(CONFIG.animationClasses.textAnimating);
            textContainer.classList.add(CONFIG.animationClasses.textMoveLeft);
            void textContainer.offsetHeight;
            textContainer.style.transition = '';
        }

        this.log('容器已设置到左侧位置');
    }

    // 移动容器回到右侧（返回时）
    moveContainersRight() {
        // 使用缓存的 DOM 引用
        const menuContainer = this.menuContainer;
        const background = this.background;
        const textContainer = this.textContainer;

        this.log('容器开始返回原位');

        // 移除左移类，触发返回动画
        if (menuContainer) {
            menuContainer.classList.remove(CONFIG.animationClasses.menuSlideLeft);
            // 动画结束后移除 transition 类
            setTimeout(() => {
                menuContainer.classList.remove(CONFIG.animationClasses.menuAnimating);
                // 恢复原始 transform
                if (this.savedTransforms.menu) {
                    menuContainer.style.transform = this.savedTransforms.menu;
                }
            }, CONFIG.timing.cleanup);
        }

        if (background) {
            background.classList.remove(CONFIG.animationClasses.backgroundMoveLeft);
            setTimeout(() => {
                background.classList.remove(CONFIG.animationClasses.backgroundAnimating);
                // 恢复原始 transform
                if (this.savedTransforms.background) {
                    background.style.transform = this.savedTransforms.background;
                }
            }, CONFIG.timing.cleanup);
        }

        if (textContainer) {
            textContainer.classList.remove(CONFIG.animationClasses.textMoveLeft);
            setTimeout(() => {
                textContainer.classList.remove(CONFIG.animationClasses.textAnimating);
                // 恢复原始 transform
                if (this.savedTransforms.text) {
                    textContainer.style.transform = this.savedTransforms.text;
                }
            }, CONFIG.timing.cleanup);
        }
    }

    /**
     * 销毁实例，清理所有资源
     * 用于动态启用/禁用动画或页面卸载时调用
     */
    destroy() {
        this.log('销毁 MenuItemAnimation 实例');

        // 清理事件监听器
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }

        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }

        // 清理当前动画
        if (this.activeItem) {
            this.cleanupImmediate();
        }

        // 移除动画容器
        const animContainer = this.animatedContainer; // 使用缓存
        if (animContainer) {
            animContainer.remove();
        }

        // 重置状态
        this.activeItem = null;
        this.activeLabel = null;
        this.animatedElement = null;
        this.savedTransforms = { menu: '', background: '', text: '' };

        this.log('✅ 实例已销毁');
    }

    /**
     * 启用动画
     * 如果实例已禁用，调用此方法重新启用
     */
    enable() {
        if (!this.config.enabled) {
            this.config.enabled = true;
            this.init();
            this.log('✅ 动画已启用');
        }
    }

    /**
     * 禁用动画
     * 保持实例存在，但停止响应事件
     */
    disable() {
        if (this.config.enabled) {
            this.config.enabled = false;

            // 清理事件监听器
            if (this.clickHandler) {
                document.removeEventListener('click', this.clickHandler);
            }
            if (this.keydownHandler) {
                document.removeEventListener('keydown', this.keydownHandler);
            }

            // 清理当前动画
            if (this.activeItem) {
                this.cleanupImmediate();
            }

            this.log('✅ 动画已禁用');
        }
    }

    /**
     * 显示内容
     * 对应原始代码 650ms 后调用 contentContainerView.showContentStart
     */
    async showContent(itemData) {
        this.log('showContent', itemData);

        // 获取 URL（从 itemData 或配置中）
        const url = await this.getContentUrl(itemData);

        this.log('生成的 URL:', url);

        if (!url) {
            console.warn('[MenuItemAnimation] 无内容 URL，跳过加载');
            return;
        }

        // 采用 text-container 的逻辑：直接加载 Markdown
        try {
            console.log('[DEBUG] 开始加载 Markdown:', url);
            console.log('[DEBUG] contentContainer:', this.contentContainer);

            // 1. Fetch Markdown 内容
            const response = await fetch(url);
            console.log('[DEBUG] fetch 响应:', response.status);
            if (!response.ok) {
                throw new Error(`Failed to load content: ${response.status}`);
            }
            const markdown = await response.text();
            console.log('[DEBUG] Markdown 内容长度:', markdown.length);

            // 2. 使用 marked.js 转换为 HTML（需要加载 marked 库）
            const html = await this.markdownToHTML(markdown);
            console.log('[DEBUG] HTML 内容长度:', html.length);

            // 3. 显示在 content-container 中
            const contentBody = this.contentContainer.querySelector('.content-body');
            console.log('[DEBUG] contentBody:', contentBody);
            if (contentBody) {
                contentBody.innerHTML = html;
                console.log('[DEBUG] innerHTML 已设置');
            }

            // 4. 显示容器
            this.contentContainer.style.display = 'block';  // 移除可能的 display: none
            this.contentContainer.classList.add('content-container-visible');
            console.log('[DEBUG] 容器已显示');
            this.log('内容加载完成');
        } catch (error) {
            console.error('[MenuItemAnimation] 内容加载失败:', error);
        }
    }

    /**
     * 隐藏内容容器
     */
    hideContent() {
        if (!this.contentContainer) return;

        this.contentContainer.style.display = 'none';
        this.contentContainer.classList.remove('content-container-visible');

        // 清空内容
        const contentBody = this.contentContainer.querySelector('.content-body');
        if (contentBody) {
            contentBody.innerHTML = '';
        }

        this.log('内容已隐藏');
    }

    /**
     * 将 Markdown 转换为 HTML（参考 ArchiveMenu.js 的实现）
     */
    async markdownToHTML(markdown) {
        // 如果 marked 库还未加载，动态加载
        if (typeof marked === 'undefined') {
            await this.loadMarkedLibrary();
        }

        // 使用 marked 转换
        return marked.parse(markdown);
    }

    /**
     * 动态加载 marked.js 库
     */
    loadMarkedLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof marked !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            script.onload = () => {
                this.log('marked.js 已加载');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load marked.js'));
            document.head.appendChild(script);
        });
    }

    /**
     * 获取内容 URL（根据 itemData 生成）
     * 策略：只检测 Markdown 文件，按以下顺序：
     * 1. content/{categoryId}/{encodedItem}/content.md
     * 2. content/{categoryId}/{encodedItem}.md
     */
    async getContentUrl(itemData) {
        // 方式1: 直接使用 data-src（如果指定了）
        if (itemData.src) {
            return itemData.src;
        }

        // 方式2: 根据类型生成路径并检测 Markdown 文件
        if (itemData.categoryId && itemData.item) {
            // 编码 item 名称（小写+空格转连字符+移除特殊字符）
            const encodedItem = this.encodeItemName(itemData.item);

            // 只检测 Markdown 文件
            const possibleFiles = [
                `content/${itemData.categoryId}/${encodedItem}/content.md`,
                `content/${itemData.categoryId}/${encodedItem}.md`
            ];

            for (const url of possibleFiles) {
                try {
                    console.log('[DEBUG] 检测 Markdown 文件:', url);
                    const response = await fetch(url, { method: 'HEAD' });
                    console.log(`[DEBUG] 响应状态: ${response.status}`);
                    if (response.ok) {
                        console.log('[DEBUG] ✅ 找到 Markdown 文件:', url);
                        return url;
                    }
                } catch (error) {
                    console.log(`[DEBUG] 请求失败:`, error.message);
                    // 继续检测下一个
                }
            }

            console.log('[DEBUG] ⚠️ 未找到任何 Markdown 文件');
        }

        // 无法生成 URL
        return null;
    }

    /**
     * 编码菜单项名称为 URL 安全格式
     */
    encodeItemName(name) {
        return name.toLowerCase()
                   .replace(/\s+/g, '-')           // 空格转连字符
                   .replace(/[^\w\-]/g, '');       // 移除特殊字符
    }

    /**
     * 构建 URL（格式：#/categoryId/item-name）
     */
    buildURL(categoryId, itemName) {
        const itemSlug = this.encodeItemName(itemName);
        return `#/${categoryId}/${itemSlug}`;
    }

    /**
     * 更新浏览器 URL
     */
    updateURL(itemData) {
        if (itemData.categoryId && itemData.item) {
            const url = this.buildURL(itemData.categoryId, itemData.item);

            // 设置全局标志，告诉 ArchiveMenu 跳过这次 hashchange
            window.__skipNextHashChange = true;

            window.location.hash = url;
            console.log('[DEBUG] URL 已更新:', url);
        }
    }

    /**
     * 统一的状态渲染函数（仅用于刷新时）
     * @param {Object} itemData - 项目数据
     * @param {Object} options - 选项 { animated: boolean }
     */
    renderContentState(itemData, options = { animated: false }) {
        this.log('renderContentState', itemData, options);

        if (options.animated) {
            // 点击模式：使用 expandItem 的完整动画逻辑
            this.log('❌ renderContentState 不应该在 animated: true 时调用');
            this.log('   请使用 expandItem() 处理点击事件');
            return;
        }

        // 刷新模式：直接显示最终状态

        // 如果已有激活项，先清理
        if (this.activeItem) {
            this.cleanupImmediate();
        }

        // 保存数据
        this.currentItemData = itemData;

        // === 1. 设置容器位置（无动画） ===
        this.setContainersLeft();

        // === 2. 创建右侧 Header（最终状态） ===
        this.createHeaderDirect(itemData);

        // === 3. 创建 Back 按钮 ===
        this.createBackButton();

        // === 4. 加载内容 ===
        this.showContent(itemData);
    }

    /**
     * 创建 Header（直接显示最终状态）
     */
    createHeaderDirect(itemData) {
        this.log('创建 Header（无动画）');

        const animatedElement = document.createElement('div');
        animatedElement.className = 'menu-item-animated menu-item-animated-expanded';
        animatedElement.innerHTML = `
            <div class="menu-item-animated-inner">
                <div class="menu-item-animated-title">${itemData.item}</div>
            </div>
        `;

        // 设置到最终位置（右上角，竖排）
        animatedElement.style.position = 'fixed';
        animatedElement.style.left = 'calc(100vw - 220px)';
        animatedElement.style.top = '0';
        animatedElement.style.width = '200px';
        animatedElement.style.height = '100vh';
        animatedElement.style.background = '#ffffff';
        animatedElement.style.zIndex = CONFIG.zIndex.menuAnimation;

        this.animatedContainer.appendChild(animatedElement);
        this.animatedElement = animatedElement;
        this.activeItem = { dataset: itemData }; // 模拟原始容器

        this.log('Header 已创建（最终状态）');
    }

    /**
     * 创建 Header（带动画展开）
     */
    createHeaderAnimated(itemData) {
        // 这是当前 expandItem 中的动画逻辑
        // 保持原样，不修改
        this.log('创建 Header（动画模式）');
        // 由 expandItem 处理
    }

    /**
     * 创建 Back 按钮
     */
    createBackButton() {
        if (this.backButton) {
            return; // 已存在，不重复创建
        }

        this.log('创建 Back 按钮');

        this.backButton = document.createElement('a');
        this.backButton.href = '#';
        this.backButton.className = CONFIG.animationClasses.animatedBack;
        this.backButton.innerHTML = '<span>←</span> Back';
        this.backButton.style.position = 'fixed';
        this.backButton.style.right = '40px';
        this.backButton.style.top = '40px';
        this.backButton.style.zIndex = CONFIG.zIndex.menuAnimation + 1;

        this.backButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.collapseItem();
        });

        this.animatedContainer.appendChild(this.backButton);

        this.log('Back 按钮已创建');
    }

    // 调试日志（可配置）
    log(...args) {
        if (this.config.debug) {
            console.log('[MenuItemAnimation]', ...args);
        }
    }
}
