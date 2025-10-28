export const CONFIG = {
    /**
     * 调试模式
     */
    debug: true,

    /**
     * DOM 选择器（只保留跨模块共享的）
     */
    selectors: {
        // 主要容器
        menuContainer: '.menu-container',
        menuGrid: '#menu-grid',
        background: '.background',
        textContainer: '#textcontainer',
        contentContainer: '.content-container',
        contentBody: '.content-body',

        // 菜单项类型
        iconItem: '.menu-item-with-icon',
        thumbnailItem: '.menu-item-with-thumbnail',
        textItem: '.menu-item',

        // 菜单项子元素
        iconLabel: '.icon-label',
        thumbnailLabel: '.thumbnail-label',
        videoIcon: '.menu-icon.video',

        // 动画容器
        menuItemAnimatedContainer: '.menu-item-animated-container',
        menuItemAnimatedBack: '.menu-item-animated-back'
    },

    /**
     * Data 属性名
     */
    attributes: {
        category: 'category',
        categoryId: 'categoryId',
        item: 'item',
        type: 'type',
        src: 'src',
        thumbnail: 'thumbnail'
    },

    /**
     * Z-index 层级
     */
    zIndex: {
        background: 10,
        menu: 20,
        textContainer: 22,
        controls: 25,
        operation: 25,
        content: 30,
        menuAnimation: 40,    
        iconGameHud: 50
    },

    /**
     * CSS 动画类名
     */
    animationClasses: {
        // 容器动画状态
        menuAnimating: 'menu-animating',
        menuSlideLeft: 'menu-slide-left',
        backgroundAnimating: 'background-animating',
        backgroundMoveLeft: 'background-move-left',
        textAnimating: 'text-animating',
        textMoveLeft: 'text-move-left',

        // 动画元素状态
        animatedStart: 'menu-item-animated-start',
        animatedExpanding: 'menu-item-animated-expanding',
        animatedExpanded: 'menu-item-animated-expanded',
        animatedCollapsing: 'menu-item-animated-collapsing',
        animatedBack: 'menu-item-animated-back'
    },

    /**
     * 时间配置（毫秒）
     *
     * 重要：修改这些值后，需要同步修改对应的 CSS transition 时间
     */
    timing: {
        containerSlide: 1000,
        textExpand: 700,
        textExpandDelay: 300,
        textCollapse: 1000,
        containerReturnDelay: 300,
        cleanup: 1000,
        transitionDelay: 10
    }
};

/**
 * 工具函数：获取元素的 dataset 值
 */
export function getDataAttribute(element, attributeKey) {
    const attrName = CONFIG.attributes[attributeKey];
    return element.dataset[attrName] || null;
}

/**
 * 工具函数：设置元素的 dataset 值
 */
export function setDataAttribute(element, attributeKey, value) {
    const attrName = CONFIG.attributes[attributeKey];
    element.dataset[attrName] = value;
}
